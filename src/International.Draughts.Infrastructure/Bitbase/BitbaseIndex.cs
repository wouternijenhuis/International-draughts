using System.Numerics;
using International.Draughts.Domain.Entities;
using International.Draughts.Domain.ValueObjects;
using International.Draughts.Domain.Enums;

namespace International.Draughts.Infrastructure.Bitbase;

/// <summary>
/// Indexes draughts positions for bitbase storage and lookup.
/// Maps positions to unique indices for compact storage.
/// </summary>
public static class BitbaseIndex
{
    // Precomputed binomial coefficients for position indexing
    private static readonly long[,] BinomialCoefficients = InitializeBinomials();
    
    private const int MaxSquares = 50; // International draughts board
    private const int MaxPieces = 10;  // Maximum pieces for precomputation
    
    /// <summary>
    /// Compute unique index for a position with specific piece configuration.
    /// Uses combinatorial numbering to map piece placements to indices.
    /// </summary>
    public static ulong IndexPosition(Position position)
    {
        // Extract piece positions
        var whiteMen = GetSquareList(position.WhiteMen);
        var blackMen = GetSquareList(position.BlackMen);
        var whiteKings = GetSquareList(position.WhiteKings);
        var blackKings = GetSquareList(position.BlackKings);
        
        // Compute sub-indices for each piece type
        ulong index = 0;
        ulong multiplier = 1;
        
        // Index white men
        if (whiteMen.Count > 0)
        {
            index += IndexSquareList(whiteMen) * multiplier;
            multiplier *= Choose(MaxSquares, whiteMen.Count);
        }
        
        // Index black men
        if (blackMen.Count > 0)
        {
            index += IndexSquareList(blackMen) * multiplier;
            multiplier *= Choose(MaxSquares, blackMen.Count);
        }
        
        // Index white kings
        if (whiteKings.Count > 0)
        {
            index += IndexSquareList(whiteKings) * multiplier;
            multiplier *= Choose(MaxSquares, whiteKings.Count);
        }
        
        // Index black kings
        if (blackKings.Count > 0)
        {
            index += IndexSquareList(blackKings) * multiplier;
            multiplier *= Choose(MaxSquares, blackKings.Count);
        }
        
        // Add turn bit
        if (position.Turn == Side.Black)
        {
            index += multiplier;
        }
        
        return index;
    }
    
    /// <summary>
    /// Calculate the size of the index space for a given piece configuration.
    /// </summary>
    public static ulong IndexSpaceSize(int whiteMen, int blackMen, int whiteKings, int blackKings)
    {
        ulong size = 1;
        
        if (whiteMen > 0)
            size *= Choose(MaxSquares, whiteMen);
        if (blackMen > 0)
            size *= Choose(MaxSquares, blackMen);
        if (whiteKings > 0)
            size *= Choose(MaxSquares, whiteKings);
        if (blackKings > 0)
            size *= Choose(MaxSquares, blackKings);
        
        size *= 2; // Two sides to move
        
        return size;
    }
    
    /// <summary>
    /// Extract list of square indices from a bitboard.
    /// </summary>
    private static List<int> GetSquareList(Bitboard bb)
    {
        var squares = new List<int>();
        ulong value = bb.Value;
        
        while (value != 0)
        {
            int square = BitOperations.TrailingZeroCount(value);
            squares.Add(square);
            value &= value - 1; // Clear lowest bit
        }
        
        return squares;
    }
    
    /// <summary>
    /// Compute combinatorial index for a list of squares.
    /// Maps a specific subset of squares to a unique number.
    /// </summary>
    private static ulong IndexSquareList(List<int> squares)
    {
        if (squares.Count == 0)
            return 0;
        
        squares.Sort(); // Ensure canonical ordering
        ulong index = 0;
        
        for (int i = 0; i < squares.Count; i++)
        {
            // In combinatorial numbering, square[i] must be >= i
            if (squares[i] >= i)
            {
                index += Choose(squares[i], i + 1);
            }
        }
        
        return index;
    }
    
    /// <summary>
    /// Binomial coefficient: n choose k
    /// </summary>
    private static ulong Choose(int n, int k)
    {
        if (k > n || k < 0 || n < 0)
            return 0;
        if (k == 0 || k == n)
            return 1;
        if (k > n - k)
            k = n - k; // Optimization: C(n,k) = C(n,n-k)
        
        if (n < MaxSquares && k < MaxPieces)
            return (ulong)BinomialCoefficients[n, k];
        
        // Compute on-the-fly for larger values
        ulong result = 1;
        for (int i = 0; i < k; i++)
        {
            result = result * (ulong)(n - i) / (ulong)(i + 1);
        }
        return result;
    }
    
    /// <summary>
    /// Precompute binomial coefficients for fast lookup.
    /// </summary>
    private static long[,] InitializeBinomials()
    {
        var table = new long[MaxSquares + 1, MaxPieces + 1];
        
        for (int n = 0; n <= MaxSquares; n++)
        {
            table[n, 0] = 1;
            for (int k = 1; k <= Math.Min(n, MaxPieces); k++)
            {
                table[n, k] = table[n - 1, k - 1] + table[n - 1, k];
            }
        }
        
        return table;
    }
    
    /// <summary>
    /// Get piece counts from a position for classification.
    /// </summary>
    public static (int whiteMen, int blackMen, int whiteKings, int blackKings) GetPieceCounts(Position position)
    {
        return (
            position.WhiteMen.PopCount,
            position.BlackMen.PopCount,
            position.WhiteKings.PopCount,
            position.BlackKings.PopCount
        );
    }
    
    /// <summary>
    /// Check if a position qualifies for bitbase lookup based on piece count.
    /// </summary>
    public static bool IsEndgamePosition(Position position, int maxPieces)
    {
        int totalPieces = position.AllPieces.PopCount;
        return totalPieces <= maxPieces && totalPieces >= 2; // At least 2 pieces
    }
}
