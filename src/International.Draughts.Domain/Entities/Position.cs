using International.Draughts.Domain.Enums;
using International.Draughts.Domain.ValueObjects;

namespace International.Draughts.Domain.Entities;

/// <summary>
/// Represents a position on the draughts board.
/// Immutable class that represents a snapshot of the game state.
/// </summary>
public class Position
{
    public Side Turn { get; }
    public Bitboard WhiteMen { get; }
    public Bitboard BlackMen { get; }
    public Bitboard WhiteKings { get; }
    public Bitboard BlackKings { get; }
    
    public Bitboard AllPieces { get; }
    public Bitboard WhitePieces { get; }
    public Bitboard BlackPieces { get; }
    public Bitboard EmptySquares { get; }
    
    public Position(Side turn, Bitboard whiteMen, Bitboard blackMen, Bitboard whiteKings, Bitboard blackKings)
    {
        Turn = turn;
        WhiteMen = whiteMen;
        BlackMen = blackMen;
        WhiteKings = whiteKings;
        BlackKings = blackKings;
        
        WhitePieces = whiteMen | whiteKings;
        BlackPieces = blackMen | blackKings;
        AllPieces = WhitePieces | BlackPieces;
        EmptySquares = ~AllPieces;
    }
    
    /// <summary>
    /// Creates the starting position for international draughts.
    /// </summary>
    public static Position StartingPosition()
    {
        // Standard international draughts starting position
        // In sparse 13x10 representation:
        // White starts on top (higher bit positions)
        // Black starts on bottom (lower bit positions)
        var whiteMen = new Bitboard(0x7DF3EF8000000000);
        var blackMen = new Bitboard(0x0000000000FBE7DF);
        var whiteKings = Bitboard.Empty;
        var blackKings = Bitboard.Empty;
        
        return new Position(Side.White, whiteMen, blackMen, whiteKings, blackKings);
    }
    
    public Bitboard GetPieces(Side side)
    {
        return side == Side.White ? WhitePieces : BlackPieces;
    }
    
    public Bitboard GetMen(Side side)
    {
        return side == Side.White ? WhiteMen : BlackMen;
    }
    
    public Bitboard GetKings(Side side)
    {
        return side == Side.White ? WhiteKings : BlackKings;
    }
    
    public int GetPieceCount(Side side)
    {
        return GetPieces(side).PopCount;
    }
    
    public Side OpponentSide => Turn == Side.White ? Side.Black : Side.White;
}
