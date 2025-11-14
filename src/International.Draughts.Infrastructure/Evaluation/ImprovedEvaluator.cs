using International.Draughts.Application.Interfaces;
using International.Draughts.Domain.Entities;
using International.Draughts.Domain.Enums;
using International.Draughts.Domain.Helpers;
using International.Draughts.Domain.ValueObjects;

namespace International.Draughts.Infrastructure.Evaluation;

/// <summary>
/// Improved position evaluator with sophisticated heuristics.
/// Supports both default hand-tuned weights and machine-learned weights from external files.
/// </summary>
public class ImprovedEvaluator
{
    private readonly IEvaluationWeights _weights;
    
    /// <summary>
    /// Create evaluator with specified weights.
    /// </summary>
    public ImprovedEvaluator(IEvaluationWeights weights)
    {
        _weights = weights;
    }
    
    /// <summary>
    /// Create evaluator with default weights.
    /// </summary>
    public ImprovedEvaluator() : this(new DefaultEvaluationWeights())
    {
    }
    
    /// <summary>
    /// Evaluate a position from the perspective of the side to move.
    /// Positive scores favor the side to move.
    /// </summary>
    public int Evaluate(Position position)
    {
        Side us = position.Turn;
        Side them = us == Side.White ? Side.Black : Side.White;
        
        int score = 0;
        
        // Material evaluation
        score += EvaluateMaterial(position, us, them);
        
        // Positional evaluation
        score += EvaluatePositional(position, us, them);
        
        // King mobility
        score += EvaluateKingMobility(position, us, them);
        
        // Strategic factors
        score += EvaluateStrategic(position, us, them);
        
        return score;
    }
    
    /// <summary>
    /// Evaluate material balance.
    /// </summary>
    private int EvaluateMaterial(Position position, Side us, Side them)
    {
        int ourMen = position.GetMen(us).PopCount;
        int ourKings = position.GetKings(us).PopCount;
        int theirMen = position.GetMen(them).PopCount;
        int theirKings = position.GetKings(them).PopCount;
        
        int score = 0;
        
        // Basic material
        score += (ourMen - theirMen) * _weights.ManValue;
        score += (ourKings - theirKings) * _weights.KingValue;
        
        // First king advantage
        if (ourKings > 0 && theirKings == 0)
        {
            score += _weights.FirstKingBonus;
        }
        else if (theirKings > 0 && ourKings == 0)
        {
            score -= _weights.FirstKingBonus;
        }
        
        return score;
    }
    
    /// <summary>
    /// Evaluate piece positioning.
    /// </summary>
    private int EvaluatePositional(Position position, Side us, Side them)
    {
        int score = 0;
        
        // Evaluate our pieces
        score += EvaluatePiecePositions(position.GetMen(us), us, false);
        score += EvaluatePiecePositions(position.GetKings(us), us, true);
        
        // Evaluate opponent pieces
        score -= EvaluatePiecePositions(position.GetMen(them), them, false);
        score -= EvaluatePiecePositions(position.GetKings(them), them, true);
        
        return score;
    }
    
    /// <summary>
    /// Evaluate positions of pieces.
    /// </summary>
    private int EvaluatePiecePositions(Bitboard pieces, Side side, bool isKing)
    {
        int score = 0;
        
        foreach (var sq in BitOps.Squares(pieces))
        {
            int file = sq.Value % 13;
            int rank = sq.Value / 13;
            
            // Center control (files 4-8 are more central)
            if (file >= 4 && file <= 8)
            {
                score += _weights.CenterControlBonus;
            }
            
            // Advancement bonus for men
            if (!isKing)
            {
                int advancementRank = side == Side.White ? rank : (9 - rank);
                score += advancementRank * _weights.AdvancedPieceBonus;
                
                // Penalty for pieces stuck on back rank
                if (advancementRank == 0)
                {
                    score -= _weights.BackRankPenalty;
                }
            }
        }
        
        return score;
    }
    
    /// <summary>
    /// Evaluate king mobility.
    /// </summary>
    private int EvaluateKingMobility(Position position, Side us, Side them)
    {
        int score = 0;
        
        // Our king mobility
        foreach (var kingSquare in BitOps.Squares(position.GetKings(us)))
        {
            int moves = CountKingMoves(kingSquare, position.EmptySquares);
            score += moves * _weights.KingMobilityValue;
        }
        
        // Opponent king mobility
        foreach (var kingSquare in BitOps.Squares(position.GetKings(them)))
        {
            int moves = CountKingMoves(kingSquare, position.EmptySquares);
            score -= moves * _weights.KingMobilityValue;
        }
        
        return score;
    }
    
    /// <summary>
    /// Count available moves for a king.
    /// </summary>
    private int CountKingMoves(Square from, Bitboard empty)
    {
        int count = 0;
        int[] directions = { BitOps.I1, BitOps.J1, -BitOps.I1, -BitOps.J1 };
        
        foreach (int dir in directions)
        {
            int sq = from.Value;
            while (true)
            {
                sq += dir;
                if (sq < 0 || sq >= 63)
                    break;
                
                var toSquare = new Square(sq);
                if (!BitOps.Has(BitOps.SquaresMask, toSquare))
                    break;
                    
                if (!BitOps.Has(empty, toSquare))
                    break;
                
                count++;
            }
        }
        
        return count;
    }
    
    /// <summary>
    /// Evaluate strategic factors.
    /// </summary>
    private int EvaluateStrategic(Position position, Side us, Side them)
    {
        int score = 0;
        
        int ourTotal = position.GetPieceCount(us);
        int theirTotal = position.GetPieceCount(them);
        
        // In endgames with few pieces, having more mobility is crucial
        if (ourTotal + theirTotal <= 10)
        {
            // Double the weight of king mobility in endgames
            int ourKings = position.GetKings(us).PopCount;
            int theirKings = position.GetKings(them).PopCount;
            
            if (ourKings > theirKings)
            {
                score += _weights.EndgameKingAdvantage;
            }
            else if (theirKings > ourKings)
            {
                score -= _weights.EndgameKingAdvantage;
            }
        }
        
        // Tempo evaluation - prefer to have pieces on key diagonals
        score += EvaluateTempo(position, us);
        score -= EvaluateTempo(position, them);
        
        return score;
    }
    
    /// <summary>
    /// Evaluate tempo and diagonal control.
    /// </summary>
    private int EvaluateTempo(Position position, Side side)
    {
        int score = 0;
        var pieces = position.GetPieces(side);
        
        // Count pieces on the two main diagonals
        foreach (var sq in BitOps.Squares(pieces))
        {
            int file = sq.Value % 13;
            int rank = sq.Value / 13;
            
            // Main diagonal patterns
            if (Math.Abs(file - rank) <= 2)
            {
                score += _weights.TempoDiagonal;
            }
        }
        
        return score;
    }
}
