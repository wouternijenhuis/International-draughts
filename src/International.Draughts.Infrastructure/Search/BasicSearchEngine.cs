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
    private volatile bool _stopSearch;
    private DateTime _searchStartTime;
    private double _timeLimit;
    
    private const int MaxDepth = 10;
    private const int InfiniteScore = 30000;
    private const int WinScore = 20000;
    
    public BasicSearchEngine(IMoveGenerator moveGenerator)
    {
        _moveGenerator = moveGenerator ?? throw new ArgumentNullException(nameof(moveGenerator));
        _evaluator = new ImprovedEvaluator();
    }
    
    public Move SearchBestMove(Position position, double timeLimit, int depthLimit = 0)
    {
        _stopSearch = false;
        _searchStartTime = DateTime.UtcNow;
        _timeLimit = timeLimit;
        
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
    /// Alpha-beta pruning search.
    /// </summary>
    private int AlphaBeta(Position position, int depth, int alpha, int beta)
    {
        if (ShouldStop() || depth <= 0)
        {
            return Evaluate(position);
        }
        
        var moves = _moveGenerator.GenerateMoves(position).ToList();
        
        // No moves = loss
        if (moves.Count == 0)
        {
            return -WinScore;
        }
        
        foreach (var move in moves)
        {
            var newPosition = _moveGenerator.ApplyMove(position, move);
            int score = -AlphaBeta(newPosition, depth - 1, -beta, -alpha);
            
            if (score >= beta)
            {
                return beta; // Beta cutoff
            }
            
            if (score > alpha)
            {
                alpha = score;
            }
        }
        
        return alpha;
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
