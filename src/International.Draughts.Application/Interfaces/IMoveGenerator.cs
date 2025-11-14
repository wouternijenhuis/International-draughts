using International.Draughts.Domain.Entities;
using International.Draughts.Domain.ValueObjects;

namespace International.Draughts.Application.Interfaces;

/// <summary>
/// Interface for generating legal moves from a position.
/// </summary>
public interface IMoveGenerator
{
    /// <summary>
    /// Generates all legal moves from the given position.
    /// </summary>
    IEnumerable<Move> GenerateMoves(Position position);
    
    /// <summary>
    /// Applies a move to a position and returns the resulting position.
    /// </summary>
    Position ApplyMove(Position position, Move move);
    
    /// <summary>
    /// Checks if a move is legal in the given position.
    /// </summary>
    bool IsLegalMove(Position position, Move move);
}
