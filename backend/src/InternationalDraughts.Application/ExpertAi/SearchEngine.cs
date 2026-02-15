using System.Diagnostics;
using InternationalDraughts.Domain.Draughts;
using Microsoft.Extensions.Logging;

namespace InternationalDraughts.Application.ExpertAi;

/// <summary>
/// Result returned by the search engine.
/// </summary>
public sealed record SearchResult(
    DraughtsMove Move,
    int Score,
    int DepthReached,
    long NodesEvaluated,
    long TimeElapsedMs);

/// <summary>
/// Expert-level search engine using alpha-beta with iterative deepening,
/// Principal Variation Search (PVS), Late Move Reductions (LMR),
/// aspiration windows, transposition table, killer moves, and history heuristic.
/// No artificial weakening — plays at maximum strength.
/// </summary>
public sealed class SearchEngine
{
    private readonly Evaluator _evaluator;
    private readonly TranspositionTable _tt;
    private readonly ExpertAiOptions _options;
    private readonly ILogger<SearchEngine> _logger;

    // Killer moves: indexed by [depth, slot] — store move indices
    private const int MaxKillerSlots = 2;
    private readonly int[,] _killerMoves = new int[64, MaxKillerSlots];

    // History heuristic: indexed by [fromSquare, toSquare]
    private readonly int[,] _historyTable = new int[51, 51];

    // Search state
    private long _nodesEvaluated;
    private bool _searchCancelled;
    private Stopwatch _stopwatch = null!;
    private int _timeLimitMs;

    public SearchEngine(
        Evaluator evaluator,
        TranspositionTable tt,
        ExpertAiOptions options,
        ILogger<SearchEngine> logger)
    {
        _evaluator = evaluator;
        _tt = tt;
        _options = options;
        _logger = logger;
    }

    /// <summary>
    /// Finds the best move for the given position using iterative deepening.
    /// Returns the best move found within the time limit.
    /// If timeout is reached, returns the best move from the deepest completed iteration.
    /// </summary>
    public SearchResult? FindBestMove(
        BoardPosition board,
        PieceColor player,
        int? timeLimitOverrideMs = null)
    {
        var legalMoves = MoveGenerator.GenerateLegalMoves(board, player);
        if (legalMoves.Count == 0) return null;

        // Single legal move — return immediately with evaluated score
        if (legalMoves.Count == 1)
        {
            var score = _evaluator.Evaluate(board, player);
            return new SearchResult(legalMoves[0], score, 0, 1, 0);
        }

        // Initialize search state
        _nodesEvaluated = 0;
        _searchCancelled = false;
        _timeLimitMs = timeLimitOverrideMs ?? _options.TimeLimitMs;
        _stopwatch = Stopwatch.StartNew();
        ClearKillers();
        ClearHistory();
        _tt.Clear();

        SearchResult? bestResult = null;
        int previousScore = 0;

        // Iterative deepening
        for (int depth = 1; depth <= _options.MaxDepth; depth++)
        {
            if (_searchCancelled) break;

            int alpha, beta;

            if (_options.EnableAspirationWindows && depth > 1)
            {
                // Aspiration windows: search with a narrow window around previous score
                int window = _options.AspirationWindowSize;
                alpha = previousScore - window;
                beta = previousScore + window;

                var result = SearchRoot(board, player, depth, legalMoves, alpha, beta);
                if (result == null) break; // Time's up

                // If the result fell outside the window, re-search with full window
                if (result.Score <= alpha || result.Score >= beta)
                {
                    if (_searchCancelled) break;
                    result = SearchRoot(board, player, depth, legalMoves, -100_000, 100_000);
                    if (result == null) break;
                }

                bestResult = result;
                previousScore = result.Score;
            }
            else
            {
                var result = SearchRoot(board, player, depth, legalMoves, -100_000, 100_000);
                if (result == null) break;

                bestResult = result;
                previousScore = result.Score;
            }

            _logger.LogDebug(
                "Depth {Depth}: best={Move} score={Score} nodes={Nodes} time={Time}ms",
                depth, bestResult.Move.ToNotation(), bestResult.Score,
                _nodesEvaluated, _stopwatch.ElapsedMilliseconds);

            // If we found a forced win, no need to search deeper
            if (Math.Abs(bestResult.Score) >= 9000) break;
        }

        _stopwatch.Stop();

        if (bestResult != null)
        {
            return bestResult with
            {
                NodesEvaluated = _nodesEvaluated,
                TimeElapsedMs = _stopwatch.ElapsedMilliseconds
            };
        }

        // Fallback: return first legal move (should be extremely rare)
        return new SearchResult(legalMoves[0], 0, 0, _nodesEvaluated, _stopwatch.ElapsedMilliseconds);
    }

    /// <summary>
    /// Root-level search: evaluates all legal moves and returns the best.
    /// </summary>
    private SearchResult? SearchRoot(
        BoardPosition board,
        PieceColor player,
        int depth,
        List<DraughtsMove> legalMoves,
        int alpha,
        int beta)
    {
        DraughtsMove? bestMove = null;
        int bestScore = -100_000;
        ulong hash = board.ComputeHash(player);

        // Order moves at root level
        var orderedMoves = OrderMoves(board, legalMoves, player, depth, hash);

        for (int i = 0; i < orderedMoves.Count; i++)
        {
            if (CheckTimeout()) return bestMove != null
                ? new SearchResult(bestMove, bestScore, depth, _nodesEvaluated, _stopwatch.ElapsedMilliseconds)
                : null;

            var move = orderedMoves[i];
            var newBoard = board.ApplyMove(move);
            int score;

            if (_options.EnablePvs && i > 0)
            {
                // PVS: search with null window first
                score = -AlphaBeta(newBoard, player.Opposite(), depth - 1, -alpha - 1, -alpha, player);
                if (score > alpha && score < beta && !_searchCancelled)
                {
                    // Re-search with full window
                    score = -AlphaBeta(newBoard, player.Opposite(), depth - 1, -beta, -alpha, player);
                }
            }
            else
            {
                score = -AlphaBeta(newBoard, player.Opposite(), depth - 1, -beta, -alpha, player);
            }

            if (_searchCancelled && bestMove == null) return null;

            if (score > bestScore)
            {
                bestScore = score;
                bestMove = move;
            }
            if (score > alpha) alpha = score;
            if (alpha >= beta) break;
        }

        if (bestMove == null) return null;

        // Store in TT
        var ttType = bestScore >= beta ? TtEntryType.LowerBound
            : bestScore > alpha - 1 ? TtEntryType.Exact
            : TtEntryType.UpperBound;
        _tt.Store(hash, bestScore, depth, ttType, 0);

        return new SearchResult(bestMove, bestScore, depth, _nodesEvaluated, _stopwatch.ElapsedMilliseconds);
    }

    /// <summary>
    /// Alpha-beta search with PVS, LMR, transposition table, and move ordering.
    /// Uses NegaMax framework: score is always from the perspective of currentPlayer.
    /// </summary>
    private int AlphaBeta(
        BoardPosition board,
        PieceColor currentPlayer,
        int depth,
        int alpha,
        int beta,
        PieceColor rootPlayer)
    {
        _nodesEvaluated++;

        // Check time periodically (every 4096 nodes)
        if ((_nodesEvaluated & 4095) == 0 && CheckTimeout())
            return 0;

        ulong hash = board.ComputeHash(currentPlayer);

        // Transposition table lookup
        if (_tt.TryProbe(hash, out var ttEntry) && ttEntry.Depth >= depth)
        {
            switch (ttEntry.Type)
            {
                case TtEntryType.Exact:
                    return ttEntry.Score;
                case TtEntryType.LowerBound:
                    alpha = Math.Max(alpha, ttEntry.Score);
                    break;
                case TtEntryType.UpperBound:
                    beta = Math.Min(beta, ttEntry.Score);
                    break;
            }
            if (alpha >= beta) return ttEntry.Score;
        }

        // Leaf node — evaluate
        if (depth <= 0)
        {
            int eval = _evaluator.Evaluate(board, currentPlayer);
            return eval;
        }

        var legalMoves = MoveGenerator.GenerateLegalMoves(board, currentPlayer);

        // No legal moves — loss for current player
        if (legalMoves.Count == 0)
            return -10_000 + (20 - depth); // Prefer faster wins

        // Order moves
        var orderedMoves = OrderMoves(board, legalMoves, currentPlayer, depth, hash);

        int bestScore = -100_000;
        int bestMoveIndex = -1;
        bool isPvNode = beta - alpha > 1;

        for (int i = 0; i < orderedMoves.Count; i++)
        {
            if (_searchCancelled) return 0;

            var move = orderedMoves[i];
            var newBoard = board.ApplyMove(move);
            int score;
            int reduction = 0;

            // Late Move Reductions
            if (_options.EnableLmr
                && depth >= _options.LmrMinDepth
                && i >= _options.LmrMinMoveIndex
                && !move.IsCapture
                && !isPvNode)
            {
                reduction = 1;
                if (i >= 6) reduction = 2; // More aggressive reduction for late moves
            }

            if (_options.EnablePvs && i > 0)
            {
                // PVS with possible LMR
                score = -AlphaBeta(newBoard, currentPlayer.Opposite(),
                    depth - 1 - reduction, -alpha - 1, -alpha, rootPlayer);

                // If reduced search indicates improvement, re-search at full depth
                if (reduction > 0 && score > alpha && !_searchCancelled)
                {
                    score = -AlphaBeta(newBoard, currentPlayer.Opposite(),
                        depth - 1, -alpha - 1, -alpha, rootPlayer);
                }

                // If null-window search improved alpha, re-search with full window
                if (score > alpha && score < beta && !_searchCancelled)
                {
                    score = -AlphaBeta(newBoard, currentPlayer.Opposite(),
                        depth - 1, -beta, -alpha, rootPlayer);
                }
            }
            else
            {
                score = -AlphaBeta(newBoard, currentPlayer.Opposite(),
                    depth - 1 - reduction, -beta, -alpha, rootPlayer);

                if (reduction > 0 && score > alpha && !_searchCancelled)
                {
                    score = -AlphaBeta(newBoard, currentPlayer.Opposite(),
                        depth - 1, -beta, -alpha, rootPlayer);
                }
            }

            if (score > bestScore)
            {
                bestScore = score;
                bestMoveIndex = i;
            }

            if (score > alpha)
            {
                alpha = score;

                // Update history heuristic for quiet moves that improve alpha
                if (!move.IsCapture)
                    _historyTable[move.Origin, move.Destination] += depth * depth;
            }

            if (alpha >= beta)
            {
                // Beta cutoff — update killer moves for quiet moves
                if (!move.IsCapture)
                    StoreKiller(depth, i);
                break;
            }
        }

        // Store in transposition table
        var entryType = bestScore >= beta ? TtEntryType.LowerBound
            : bestScore > alpha - (beta - alpha > 1 ? 1 : 0) ? TtEntryType.Exact
            : TtEntryType.UpperBound;
        _tt.Store(hash, bestScore, depth, entryType, bestMoveIndex);

        return bestScore;
    }

    /// <summary>
    /// Orders moves for better alpha-beta pruning efficiency.
    /// Priority: TT best move → captures → killer moves → history heuristic → others.
    /// </summary>
    private List<DraughtsMove> OrderMoves(
        BoardPosition board,
        List<DraughtsMove> moves,
        PieceColor player,
        int depth,
        ulong hash)
    {
        // Get TT best move index (if available)
        int ttBestIndex = -1;
        if (_tt.TryProbe(hash, out var ttEntry))
            ttBestIndex = ttEntry.BestMoveIndex;

        // Score each move for ordering
        var scored = new (DraughtsMove Move, int Score)[moves.Count];
        for (int i = 0; i < moves.Count; i++)
        {
            int score = 0;

            // TT best move gets highest priority
            if (i == ttBestIndex) score += 1_000_000;

            // Captures scored by number of pieces captured
            if (moves[i].IsCapture)
                score += 500_000 + moves[i].CaptureCount * 1000;

            // Killer moves
            if (depth < 64)
            {
                for (int k = 0; k < MaxKillerSlots; k++)
                {
                    if (_killerMoves[depth, k] == i)
                    {
                        score += 400_000 - k * 1000;
                        break;
                    }
                }
            }

            // History heuristic
            score += _historyTable[moves[i].Origin, moves[i].Destination];

            // Quick positional score for non-captures
            if (!moves[i].IsCapture)
            {
                var newBoard = board.ApplyMove(moves[i]);
                score += _evaluator.QuickEvaluate(newBoard, player) / 10;
            }

            scored[i] = (moves[i], score);
        }

        // Sort descending by score
        Array.Sort(scored, (a, b) => b.Score.CompareTo(a.Score));

        return scored.Select(s => s.Move).ToList();
    }

    /// <summary>Checks if the time limit has been reached.</summary>
    private bool CheckTimeout()
    {
        if (_stopwatch.ElapsedMilliseconds >= _timeLimitMs)
        {
            _searchCancelled = true;
            return true;
        }
        return false;
    }

    /// <summary>Stores a killer move at the given depth.</summary>
    private void StoreKiller(int depth, int moveIndex)
    {
        if (depth >= 64) return;
        // Shift existing killers down
        _killerMoves[depth, 1] = _killerMoves[depth, 0];
        _killerMoves[depth, 0] = moveIndex;
    }

    /// <summary>Clears killer move tables.</summary>
    private void ClearKillers()
    {
        Array.Clear(_killerMoves);
    }

    /// <summary>Clears history heuristic table.</summary>
    private void ClearHistory()
    {
        Array.Clear(_historyTable);
    }
}
