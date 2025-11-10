using International.Draughts.Application.Interfaces;
using International.Draughts.Domain.Entities;
using International.Draughts.Domain.Enums;
using International.Draughts.Domain.ValueObjects;

namespace International.Draughts.Infrastructure.Search;

/// <summary>
/// Search engine using minimax with alpha-beta pruning.
/// Simplified version of search.cpp
/// </summary>
public class BasicSearchEngine : ISearchEngine
{
    private readonly IMoveGenerator _moveGenerator;
    private volatile bool _stopSearch;
    private DateTime _searchStartTime;
    private double _timeLimit;
    
    private const int MaxDepth = 10;
    private const int InfiniteScore = 30000;
    private const int WinScore = 20000;
    
    public BasicSearchEngine(IMoveGenerator moveGenerator)
    {
        _moveGenerator = moveGenerator ?? throw new ArgumentNullException(nameof(moveGenerator));
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
    /// Simple position evaluation.
    /// Positive scores favor the side to move.
    /// </summary>
    private int Evaluate(Position position)
    {
        Side us = position.Turn;
        Side them = us == Side.White ? Side.Black : Side.White;
        
        // Material count
        int ourMen = position.GetMen(us).PopCount;
        int ourKings = position.GetKings(us).PopCount;
        int theirMen = position.GetMen(them).PopCount;
        int theirKings = position.GetKings(them).PopCount;
        
        // Basic material evaluation
        const int ManValue = 100;
        const int KingValue = 300;
        
        int score = (ourMen * ManValue + ourKings * KingValue) - 
                   (theirMen * ManValue + theirKings * KingValue);
        
        // Bonus for piece advancement (men closer to promotion)
        score += EvaluateAdvancement(position, us);
        score -= EvaluateAdvancement(position, them);
        
        return score;
    }
    
    /// <summary>
    /// Evaluate piece advancement toward promotion.
    /// </summary>
    private int EvaluateAdvancement(Position position, Side side)
    {
        int score = 0;
        var men = position.GetMen(side);
        
        foreach (var sq in Domain.Helpers.BitOps.Squares(men))
        {
            int rank = sq.Value / 13;
            if (side == Side.White)
            {
                // White advances up (higher ranks)
                score += rank * 2;
            }
            else
            {
                // Black advances down (lower ranks)
                score += (9 - rank) * 2;
            }
        }
        
        return score;
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
