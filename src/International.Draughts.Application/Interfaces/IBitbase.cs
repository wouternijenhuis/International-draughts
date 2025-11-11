using International.Draughts.Domain.Entities;
using International.Draughts.Domain.ValueObjects;

namespace International.Draughts.Application.Interfaces;

/// <summary>
/// Interface for endgame bitbase (tablebase) that provides perfect play in endgame positions.
/// </summary>
public interface IBitbase
{
    /// <summary>
    /// Probe the bitbase for the result and best move for the given position.
    /// </summary>
    /// <param name="position">The position to probe</param>
    /// <returns>Bitbase result if position is in bitbase, null otherwise</returns>
    BitbaseResult? Probe(Position position);
    
    /// <summary>
    /// Check if a position is in the bitbase.
    /// </summary>
    bool Contains(Position position);
    
    /// <summary>
    /// Get the maximum number of pieces supported by loaded bitbases.
    /// </summary>
    int MaxPieces { get; }
    
    /// <summary>
    /// Check if bitbase is loaded and available.
    /// </summary>
    bool IsLoaded { get; }
}

/// <summary>
/// Result from probing an endgame bitbase.
/// </summary>
public class BitbaseResult
{
    /// <summary>
    /// The game-theoretic result of the position.
    /// </summary>
    public BitbaseValue Value { get; }
    
    /// <summary>
    /// Distance to mate (plies), if winning. 0 if draw or loss.
    /// </summary>
    public int DistanceToMate { get; }
    
    /// <summary>
    /// Best move to achieve the result, if available.
    /// </summary>
    public Move? BestMove { get; }
    
    public BitbaseResult(BitbaseValue value, int distanceToMate, Move? bestMove = null)
    {
        Value = value;
        DistanceToMate = distanceToMate;
        BestMove = bestMove;
    }
    
    /// <summary>
    /// Convert to a score for use in search.
    /// Uses values slightly below InfiniteScore to maintain proper score ordering.
    /// </summary>
    public int ToScore()
    {
        return Value switch
        {
            BitbaseValue.Win => 29000 - DistanceToMate,  // Prefer shorter mates
            BitbaseValue.Loss => -29000 + DistanceToMate, // Prefer longer defenses
            BitbaseValue.Draw => 0,
            _ => 0
        };
    }
}

/// <summary>
/// Game-theoretic value of a position from the bitbase.
/// </summary>
public enum BitbaseValue
{
    Win,   // Position is winning for side to move
    Draw,  // Position is drawn with best play
    Loss   // Position is losing for side to move
}
