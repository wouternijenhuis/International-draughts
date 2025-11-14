using International.Draughts.Domain.Enums;
using International.Draughts.Domain.Helpers;

namespace International.Draughts.Domain.ValueObjects;

/// <summary>
/// Represents a move in the game.
/// A move is encoded as a bitboard containing the from square, to square, and captured pieces.
/// </summary>
public readonly struct Move : IEquatable<Move>
{
    public ulong Value { get; }
    
    public Move(ulong value)
    {
        Value = value;
    }
    
    public static Move None => new(0);
    
    public bool IsNone => Value == 0;
    
    /// <summary>
    /// Create a move from source square to destination square with captured pieces.
    /// </summary>
    public static Move Make(Square from, Square to, Bitboard captured = default)
    {
        ulong fromBit = 1UL << from.Value;
        ulong toBit = 1UL << to.Value;
        return new Move(fromBit | toBit | captured.Value);
    }
    
    /// <summary>
    /// Extract the from square from a move given the position.
    /// </summary>
    public Square GetFrom(Bitboard friendlyPieces)
    {
        Bitboard froms = new(friendlyPieces.Value & Value);
        return BitOps.First(froms);
    }
    
    /// <summary>
    /// Extract the to square from a move given the position.
    /// </summary>
    public Square GetTo(Bitboard emptySquares, Bitboard friendlyPieces)
    {
        Bitboard tos = new(emptySquares.Value & Value);
        if (tos.Value == 0) // to = from (pass move or special case)
        {
            tos = new(friendlyPieces.Value & Value);
        }
        return BitOps.First(tos);
    }
    
    /// <summary>
    /// Extract captured pieces from a move.
    /// </summary>
    public Bitboard GetCaptured(Bitboard opponentPieces)
    {
        return new Bitboard(opponentPieces.Value & Value);
    }
    
    /// <summary>
    /// Check if this move captures any pieces.
    /// </summary>
    public bool IsCapture(Bitboard opponentPieces)
    {
        return (opponentPieces.Value & Value) != 0;
    }
    
    public bool Equals(Move other) => Value == other.Value;
    public override bool Equals(object? obj) => obj is Move move && Equals(move);
    public override int GetHashCode() => Value.GetHashCode();
    
    public static bool operator ==(Move left, Move right) => left.Equals(right);
    public static bool operator !=(Move left, Move right) => !left.Equals(right);
    
    public override string ToString() => $"Move({Value:X})";
}
