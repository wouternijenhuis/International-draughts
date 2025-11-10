using International.Draughts.Domain.Enums;
using International.Draughts.Domain.ValueObjects;

namespace International.Draughts.Domain.Entities;

/// <summary>
/// Represents a game of international draughts.
/// Maintains the game history and current position.
/// </summary>
public class Game
{
    private readonly List<Position> _positions = new();
    private readonly List<Move> _moves = new();
    private readonly List<double> _moveTimes = new();
    
    public Variant Variant { get; }
    public Position StartPosition { get; }
    public Position CurrentPosition => _positions[_positions.Count - 1];
    public int MoveCount => _moves.Count;
    public int CurrentPly => _positions.Count - 1;
    
    public Game(Variant variant = Variant.Normal)
        : this(variant, Position.StartingPosition())
    {
    }
    
    public Game(Variant variant, Position startPosition)
    {
        Variant = variant;
        StartPosition = startPosition;
        _positions.Add(startPosition);
    }
    
    public void AddMove(Move move, double timeSpent = 0.0)
    {
        // This is a placeholder - actual move execution would need the move generation logic
        _moves.Add(move);
        _moveTimes.Add(timeSpent);
        // For now, we keep the same position - proper implementation would apply the move
        _positions.Add(CurrentPosition);
    }
    
    public void Clear()
    {
        _positions.Clear();
        _moves.Clear();
        _moveTimes.Clear();
        _positions.Add(StartPosition);
    }
    
    public void GoToPly(int ply)
    {
        if (ply < 0 || ply >= _positions.Count)
            throw new ArgumentOutOfRangeException(nameof(ply), "Invalid ply");
        
        // Remove positions and moves after the target ply
        while (_positions.Count > ply + 1)
        {
            _positions.RemoveAt(_positions.Count - 1);
            if (_moves.Count > ply)
            {
                _moves.RemoveAt(_moves.Count - 1);
                _moveTimes.RemoveAt(_moveTimes.Count - 1);
            }
        }
    }
    
    public bool IsEnd()
    {
        // Simplified end detection - proper implementation would check for legal moves
        return CurrentPosition.GetPieceCount(Side.White) == 0 
            || CurrentPosition.GetPieceCount(Side.Black) == 0;
    }
    
    public IReadOnlyList<Move> GetMoves() => _moves.AsReadOnly();
    public IReadOnlyList<Position> GetPositions() => _positions.AsReadOnly();
}
