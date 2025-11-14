using International.Draughts.Application.Interfaces;
using International.Draughts.Domain.Entities;
using International.Draughts.Domain.Enums;
using International.Draughts.Domain.ValueObjects;
using International.Draughts.Infrastructure.Evaluation;

namespace International.Draughts.Infrastructure.Search;

/// <summary>
/// Search engine using minimax with alpha-beta pruning.
/// Simplified version of search.cpp
/// </summary>
public class BasicSearchEngine : ISearchEngine
{
    private readonly IMoveGenerator _moveGenerator;
    private readonly ImprovedEvaluator _evaluator;
    private readonly TranspositionTable _transpositionTable;
    private readonly MoveOrdering _moveOrdering;
    private readonly IBitbase? _bitbase;
    private volatile bool _stopSearch;
    private DateTime _searchStartTime;
    private double _timeLimit;
    
    private const int MaxDepth = 10;
    private const int InfiniteScore = 30000;
    private const int WinScore = 20000;
    
    public BasicSearchEngine(IMoveGenerator moveGenerator, IBitbase? bitbase = null)
    {
        _moveGenerator = moveGenerator ?? throw new ArgumentNullException(nameof(moveGenerator));
        _evaluator = new ImprovedEvaluator();
        _transpositionTable = new TranspositionTable(20); // 2^20 entries
        _moveOrdering = new MoveOrdering();
        _bitbase = bitbase;
    }
    
    public Move SearchBestMove(Position position, double timeLimit, int depthLimit = 0)
    {
        _stopSearch = false;
        _searchStartTime = DateTime.UtcNow;
        _timeLimit = timeLimit;
        _moveOrdering.Clear(); // Clear move ordering data for new search
        
        var moves = _moveGenerator.GenerateMoves(position).ToList();
        
        if (moves.Count == 0)
            return Move.None;
        
        if (moves.Count == 1)
            return moves[0];
        
        // Iterative deepening
        Move bestMove = moves[0];
        int maxSearchDepth = depthLimit > 0 ? Math.Min(depthLimit, MaxDepth) : MaxDepth;
        
        for (int depth = 1; depth <= maxSearchDepth; depth++)
        {
            if (ShouldStop())
                break;
            
            int bestScore = -InfiniteScore;
            Move currentBest = Move.None;
            
            foreach (var move in moves)
            {
                if (ShouldStop())
                    break;
                
                var newPosition = _moveGenerator.ApplyMove(position, move);
                int score = -AlphaBeta(newPosition, depth - 1, -InfiniteScore, InfiniteScore);
                
                if (score > bestScore)
                {
                    bestScore = score;
                    currentBest = move;
                }
            }
            
            if (!ShouldStop() && !currentBest.IsNone)
            {
                bestMove = currentBest;
            }
        }
        
        return bestMove;
    }
    
    /// <summary>
    /// Alpha-beta pruning search with transposition table and move ordering.
    /// </summary>
    private int AlphaBeta(Position position, int depth, int alpha, int beta)
    {
        // Check bitbase first for perfect endgame play
        if (_bitbase != null && _bitbase.IsLoaded)
        {
            var bitbaseResult = _bitbase.Probe(position);
            if (bitbaseResult != null)
            {
                return bitbaseResult.ToScore();
            }
        }
        
        if (ShouldStop() || depth <= 0)
        {
            return Evaluate(position);
        }
        
        ulong posHash = position.GetHash();
        int alphaOrig = alpha;
        
        // Probe transposition table
        if (_transpositionTable.Probe(posHash, out Move ttMove, out int ttScore, out int ttDepth, out EntryType ttType))
        {
            if (ttDepth >= depth)
            {
                if (ttType == EntryType.Exact)
                {
                    return ttScore;
                }
                else if (ttType == EntryType.Lower)
                {
                    alpha = Math.Max(alpha, ttScore);
                }
                else if (ttType == EntryType.Upper)
                {
                    beta = Math.Min(beta, ttScore);
                }
                
                if (alpha >= beta)
                {
                    return ttScore;
                }
            }
        }
        
        var moves = _moveGenerator.GenerateMoves(position).ToList();
        
        // No moves = loss
        if (moves.Count == 0)
        {
            return -WinScore;
        }
        
        // Order moves for better alpha-beta pruning
        OrderMoves(moves, position, ttMove, depth);
        
        Move bestMove = Move.None;
        bool isCapture = false;
        
        foreach (var move in moves)
        {
            var newPosition = _moveGenerator.ApplyMove(position, move);
            int score = -AlphaBeta(newPosition, depth - 1, -beta, -alpha);
            
            if (score >= beta)
            {
                // Beta cutoff - update move ordering heuristics
                var from = move.GetFrom(position.GetPieces(position.Turn));
                var to = move.GetTo(position.EmptySquares, position.GetPieces(position.Turn));
                isCapture = move.IsCapture(position.GetPieces(position.OpponentSide));
                
                if (!isCapture)
                {
                    // Store killer move and update history
                    _moveOrdering.StoreKillerMove(move, depth);
                    _moveOrdering.UpdateHistory(move, depth, from.Value, to.Value);
                }
                
                // Store lower bound
                _transpositionTable.Store(posHash, move, beta, depth, EntryType.Lower);
                return beta; // Beta cutoff
            }
            
            if (score > alpha)
            {
                alpha = score;
                bestMove = move;
            }
        }
        
        // Store in transposition table
        EntryType entryType = alpha <= alphaOrig ? EntryType.Upper : 
                             alpha >= beta ? EntryType.Lower : EntryType.Exact;
        _transpositionTable.Store(posHash, bestMove, alpha, depth, entryType);
        
        return alpha;
    }
    
    /// <summary>
    /// Order moves for better alpha-beta pruning efficiency.
    /// </summary>
    private void OrderMoves(List<Move> moves, Position position, Move ttMove, int depth)
    {
        var moveScores = new List<(Move move, int score)>();
        
        foreach (var move in moves)
        {
            var from = move.GetFrom(position.GetPieces(position.Turn));
            var to = move.GetTo(position.EmptySquares, position.GetPieces(position.Turn));
            bool isCapture = move.IsCapture(position.GetPieces(position.OpponentSide));
            
            int score = _moveOrdering.ScoreMove(move, ttMove, depth, from.Value, to.Value, isCapture);
            moveScores.Add((move, score));
        }
        
        // Sort by score descending
        moveScores.Sort((a, b) => b.score.CompareTo(a.score));
        
        // Update the original list
        moves.Clear();
        foreach (var (move, _) in moveScores)
        {
            moves.Add(move);
        }
    }
    
    /// <summary>
    /// Position evaluation using the improved evaluator.
    /// Positive scores favor the side to move.
    /// </summary>
    private int Evaluate(Position position)
    {
        return _evaluator.Evaluate(position);
    }
    
    /// <summary>
    /// Check if search should stop.
    /// </summary>
    private bool ShouldStop()
    {
        if (_stopSearch)
            return true;
        
        var elapsed = (DateTime.UtcNow - _searchStartTime).TotalSeconds;
        return elapsed >= _timeLimit;
    }
    
    public void Stop()
    {
        _stopSearch = true;
    }
}
