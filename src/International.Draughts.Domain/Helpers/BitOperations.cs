using International.Draughts.Domain.Enums;
using International.Draughts.Domain.ValueObjects;

namespace International.Draughts.Domain.Helpers;

/// <summary>
/// Bit manipulation operations for draughts board.
/// Ported from bit.hpp/cpp
/// </summary>
public static class BitOps
{
    // Board constants
    public static readonly Bitboard SquaresMask = new(0x7DF3EF9F7CFBE7DF);
    public static readonly Bitboard WhiteManSquares = new(0x7DF3EF9F7CFBE7C0);
    public static readonly Bitboard BlackManSquares = new(0x01F3EF9F7CFBE7DF);
    
    // Direction increments for the 13x10 sparse board representation
    public const int I1 = 6;
    public const int J1 = 7;
    public const int I2 = I1 * 2;
    public const int J2 = J1 * 2;
    public const int K1 = 1;
    public const int L1 = I1 + J1;
    public const int K2 = K1 * 2;
    public const int L2 = L1 * 2;
    
    /// <summary>
    /// Get bitboard for a single square.
    /// </summary>
    public static Bitboard Bit(Square sq)
    {
        return new Bitboard(1UL << sq.Value);
    }
    
    /// <summary>
    /// Check if a square is set in the bitboard.
    /// </summary>
    public static bool Has(Bitboard b, Square sq)
    {
        return (b.Value & (1UL << sq.Value)) != 0;
    }
    
    /// <summary>
    /// Check if first bitboard is completely included in second.
    /// </summary>
    public static bool IsIncluded(Bitboard b0, Bitboard b1)
    {
        return (b0.Value & ~b1.Value) == 0;
    }
    
    /// <summary>
    /// Add a square to a bitboard (square must not already be set).
    /// </summary>
    public static Bitboard Add(Bitboard b, Square sq)
    {
        return new Bitboard(b.Value | (1UL << sq.Value));
    }
    
    /// <summary>
    /// Remove a square from a bitboard (square must be set).
    /// </summary>
    public static Bitboard Remove(Bitboard b, Square sq)
    {
        return new Bitboard(b.Value & ~(1UL << sq.Value));
    }
    
    /// <summary>
    /// Get the first (least significant) square from a bitboard.
    /// </summary>
    public static Square First(Bitboard b)
    {
        return new Square(System.Numerics.BitOperations.TrailingZeroCount(b.Value));
    }
    
    /// <summary>
    /// Remove the first square from a bitboard.
    /// </summary>
    public static Bitboard Rest(Bitboard b)
    {
        return new Bitboard(b.Value & (b.Value - 1));
    }
    
    /// <summary>
    /// Get bitboard for a file.
    /// </summary>
    public static Bitboard File(int file)
    {
        ulong result = 0;
        for (int rank = 0; rank < 10; rank++)
        {
            int sq = rank * 13 + file;
            if (sq < 63 && ((SquaresMask.Value >> sq) & 1) != 0)
            {
                result |= 1UL << sq;
            }
        }
        return new Bitboard(result);
    }
    
    /// <summary>
    /// Get bitboard for a rank.
    /// </summary>
    public static Bitboard Rank(int rank)
    {
        ulong result = 0;
        for (int file = 0; file < 13; file++)
        {
            int sq = rank * 13 + file;
            if (sq < 63 && ((SquaresMask.Value >> sq) & 1) != 0)
            {
                result |= 1UL << sq;
            }
        }
        return new Bitboard(result);
    }
    
    /// <summary>
    /// Get bitboard for a rank from a player's perspective.
    /// </summary>
    public static Bitboard Rank(int rank, Side side)
    {
        return side == Side.White ? Rank(rank) : Rank(9 - rank);
    }
    
    /// <summary>
    /// Shift bitboard by an increment.
    /// </summary>
    public static Bitboard Shift(Bitboard b, int inc)
    {
        if (inc > 0)
        {
            return new Bitboard((b.Value << inc) & SquaresMask.Value);
        }
        else
        {
            return new Bitboard((b.Value >> -inc) & SquaresMask.Value);
        }
    }
    
    /// <summary>
    /// Iterate over all set squares in a bitboard.
    /// </summary>
    public static IEnumerable<Square> Squares(Bitboard b)
    {
        ulong bits = b.Value;
        while (bits != 0)
        {
            int sq = System.Numerics.BitOperations.TrailingZeroCount(bits);
            yield return new Square(sq);
            bits &= bits - 1; // Clear least significant bit
        }
    }
}
