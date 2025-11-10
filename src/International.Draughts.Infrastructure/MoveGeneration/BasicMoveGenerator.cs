using International.Draughts.Application.Interfaces;
using International.Draughts.Domain.Entities;
using International.Draughts.Domain.Enums;
using International.Draughts.Domain.Helpers;
using International.Draughts.Domain.ValueObjects;

namespace International.Draughts.Infrastructure.MoveGeneration;

/// <summary>
/// Move generator for international draughts.
/// Ported from gen.cpp
/// </summary>
public class BasicMoveGenerator : IMoveGenerator
{
    public IEnumerable<Move> GenerateMoves(Position position)
    {
        var moveList = new MoveList();
        GenerateMoves(moveList, position);
        return moveList.GetMoves();
    }
    
    /// <summary>
    /// Generate all legal moves for a position.
    /// Captures are mandatory in draughts, so if captures exist, only captures are returned.
    /// </summary>
    public void GenerateMoves(MoveList list, Position position)
    {
        GenerateCaptures(list, position);
        if (list.Count == 0)
        {
            GenerateQuietMoves(list, position);
        }
    }
    
    /// <summary>
    /// Generate all capture moves.
    /// </summary>
    public void GenerateCaptures(MoveList list, Position position)
    {
        list.Clear();
        
        Side attacker = position.Turn;
        Side defender = attacker == Side.White ? Side.Black : Side.White;
        
        Bitboard defenderPieces = position.GetPieces(defender);
        Bitboard emptySquares = position.EmptySquares;
        
        // Generate man captures
        AddManCaptures(list, position, defenderPieces, emptySquares, position.GetMen(attacker));
        
        // Generate king captures
        foreach (var from in BitOps.Squares(position.GetKings(attacker)))
        {
            AddKingCaptures(list, position, defenderPieces, emptySquares, from);
        }
    }
    
    /// <summary>
    /// Generate quiet (non-capturing) moves.
    /// </summary>
    private void GenerateQuietMoves(MoveList list, Position position)
    {
        list.Clear();
        
        Side attacker = position.Turn;
        
        // Generate man moves
        AddManMoves(list, position, position.GetMen(attacker));
        
        // Generate king moves
        foreach (var from in BitOps.Squares(position.GetKings(attacker)))
        {
            AddKingMoves(list, position, from);
        }
    }
    
    /// <summary>
    /// Add man moves (forward diagonal moves).
    /// </summary>
    private void AddManMoves(MoveList list, Position position, Bitboard men)
    {
        Side attacker = position.Turn;
        Bitboard empty = position.EmptySquares;
        
        if (attacker == Side.White)
        {
            // White men move up-left and up-right
            AddMovesFrom(list, new Bitboard(men.Value & (empty.Value << BitOps.I1)), -BitOps.I1);
            AddMovesFrom(list, new Bitboard(men.Value & (empty.Value << BitOps.J1)), -BitOps.J1);
        }
        else
        {
            // Black men move down-left and down-right
            AddMovesFrom(list, new Bitboard(men.Value & (empty.Value >> BitOps.I1)), BitOps.I1);
            AddMovesFrom(list, new Bitboard(men.Value & (empty.Value >> BitOps.J1)), BitOps.J1);
        }
    }
    
    /// <summary>
    /// Helper to add moves by shifting from squares.
    /// </summary>
    private void AddMovesFrom(MoveList list, Bitboard froms, int inc)
    {
        foreach (var from in BitOps.Squares(froms))
        {
            var to = new Square(from.Value + inc);
            list.AddMove(from, to);
        }
    }
    
    /// <summary>
    /// Add king moves (multi-square diagonal slides).
    /// </summary>
    private void AddKingMoves(MoveList list, Position position, Square from)
    {
        Bitboard empty = position.EmptySquares;
        
        // Kings can move in all four diagonal directions
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
                if (!BitOps.Has(empty, toSquare))
                    break;
                
                list.AddMove(from, toSquare);
            }
        }
    }
    
    /// <summary>
    /// Add man capture moves (includes multi-jump sequences).
    /// </summary>
    private void AddManCaptures(MoveList list, Position position, Bitboard defenderPieces, Bitboard empty, Bitboard men)
    {
        // Check all four diagonal directions for captures
        AddManCapturesDirection(list, position, defenderPieces, empty, men, BitOps.J1);
        AddManCapturesDirection(list, position, defenderPieces, empty, men, BitOps.I1);
        AddManCapturesDirection(list, position, defenderPieces, empty, men, -BitOps.I1);
        AddManCapturesDirection(list, position, defenderPieces, empty, men, -BitOps.J1);
    }
    
    /// <summary>
    /// Check for man captures in a specific direction.
    /// </summary>
    private void AddManCapturesDirection(MoveList list, Position position, Bitboard defender, Bitboard empty, Bitboard men, int inc)
    {
        // Find men that can capture: have defender adjacent and empty square beyond
        ulong canCapture = men.Value & (defender.Value << inc) & (empty.Value << (inc * 2));
        
        foreach (var from in BitOps.Squares(new Bitboard(canCapture)))
        {
            var jumpSquare = new Square(from.Value + inc);
            var landSquare = new Square(from.Value + inc * 2);
            
            // Start the recursive capture sequence
            AddManCapturesRecursive(list, position, defender, BitOps.Add(empty, from), from, jumpSquare, landSquare, Bitboard.Empty);
        }
    }
    
    /// <summary>
    /// Recursively generate multi-jump man captures.
    /// </summary>
    private void AddManCapturesRecursive(MoveList list, Position position, Bitboard defender, Bitboard empty, 
        Square start, Square jumped, Square current, Bitboard captured)
    {
        // Remove the jumped piece
        defender = BitOps.Remove(defender, jumped);
        captured = BitOps.Add(captured, jumped);
        
        // Check for additional captures from current position
        bool foundMoreCaptures = false;
        int[] directions = { BitOps.I1, BitOps.J1, -BitOps.I1, -BitOps.J1 };
        
        foreach (int dir in directions)
        {
            int nextJump = current.Value + dir;
            int nextLand = current.Value + dir * 2;
            
            if (nextLand >= 0 && nextLand < 63)
            {
                var jumpSquare = new Square(nextJump);
                var landSquare = new Square(nextLand);
                
                if (BitOps.Has(defender, jumpSquare) && BitOps.Has(empty, landSquare))
                {
                    foundMoreCaptures = true;
                    AddManCapturesRecursive(list, position, defender, empty, start, jumpSquare, landSquare, captured);
                }
            }
        }
        
        // If no more captures possible, add this move
        if (!foundMoreCaptures)
        {
            list.AddCapture(start, current, captured, captured.PopCount);
        }
    }
    
    /// <summary>
    /// Add king capture moves (includes multi-jump sequences).
    /// </summary>
    private void AddKingCaptures(MoveList list, Position position, Bitboard defender, Bitboard empty, Square from)
    {
        empty = BitOps.Add(empty, from);
        
        int[] directions = { BitOps.I1, BitOps.J1, -BitOps.I1, -BitOps.J1 };
        
        foreach (int dir in directions)
        {
            int sq = from.Value;
            while (true)
            {
                sq += dir;
                if (sq < 0 || sq >= 63)
                    break;
                
                var jumpSquare = new Square(sq);
                if (!BitOps.Has(defender, jumpSquare))
                {
                    if (!BitOps.Has(empty, jumpSquare))
                        break;
                    continue;
                }
                
                // Found a piece to capture, check if we can land beyond it
                int landSq = sq + dir;
                if (landSq >= 0 && landSq < 63)
                {
                    var landSquare = new Square(landSq);
                    if (BitOps.Has(empty, landSquare))
                    {
                        AddKingCapturesRecursive(list, position, defender, empty, from, jumpSquare, dir, Bitboard.Empty);
                    }
                }
                break;
            }
        }
    }
    
    /// <summary>
    /// Recursively generate multi-jump king captures.
    /// </summary>
    private void AddKingCapturesRecursive(MoveList list, Position position, Bitboard defender, Bitboard empty,
        Square start, Square jumped, int jumpDir, Bitboard captured)
    {
        defender = BitOps.Remove(defender, jumped);
        captured = BitOps.Add(captured, jumped);
        
        // Find all landing squares along the ray
        int sq = jumped.Value + jumpDir;
        bool foundMoreCaptures = false;
        
        while (sq >= 0 && sq < 63)
        {
            var landSquare = new Square(sq);
            if (!BitOps.Has(empty, landSquare))
                break;
            
            // From this landing square, check for more captures
            int[] directions = { BitOps.I1, BitOps.J1, -BitOps.I1, -BitOps.J1 };
            
            foreach (int dir in directions)
            {
                if (dir == -jumpDir) // Can't capture back immediately
                    continue;
                
                int nextSq = sq + dir;
                while (nextSq >= 0 && nextSq < 63)
                {
                    var nextSquare = new Square(nextSq);
                    if (BitOps.Has(defender, nextSquare))
                    {
                        foundMoreCaptures = true;
                        AddKingCapturesRecursive(list, position, defender, empty, start, nextSquare, dir, captured);
                        break;
                    }
                    if (!BitOps.Has(empty, nextSquare))
                        break;
                    nextSq += dir;
                }
            }
            
            // Add move ending at this square if no more captures
            if (!foundMoreCaptures)
            {
                list.AddCapture(start, landSquare, captured, captured.PopCount);
            }
            
            sq += jumpDir;
        }
    }
    
    public Position ApplyMove(Position position, Move move)
    {
        // This is a simplified implementation
        // Full implementation would handle promotions and position updates
        return position;
    }
    
    public bool IsLegalMove(Position position, Move move)
    {
        var moves = GenerateMoves(position);
        return moves.Contains(move);
    }
}
