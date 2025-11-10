using International.Draughts.Domain.ValueObjects;

namespace International.Draughts.Domain.Entities;

/// <summary>
/// A list of moves for a position.
/// Ported from list.hpp/cpp
/// </summary>
public class MoveList
{
    private const int MaxMoves = 128;
    
    private readonly List<Move> _moves = new();
    private readonly List<int> _scores = new();
    private int _captureScore;
    
    public int Count => _moves.Count;
    
    public Move this[int index] => _moves[index];
    
    public void Clear()
    {
        _moves.Clear();
        _scores.Clear();
        _captureScore = 0;
    }
    
    public void Add(Move move)
    {
        if (_moves.Count >= MaxMoves)
            throw new InvalidOperationException("Move list is full");
        
        _moves.Add(move);
        _scores.Add(0);
    }
    
    public void AddMove(Square from, Square to)
    {
        Add(Move.Make(from, to));
    }
    
    public void AddCapture(Square from, Square to, Bitboard captured, int captureScore)
    {
        Add(Move.Make(from, to, captured));
        _captureScore = Math.Max(_captureScore, captureScore);
    }
    
    public void SetScore(int index, int score)
    {
        if (index >= 0 && index < _scores.Count)
        {
            _scores[index] = score;
        }
    }
    
    public int GetScore(int index)
    {
        return index >= 0 && index < _scores.Count ? _scores[index] : 0;
    }
    
    public bool Contains(Move move)
    {
        return _moves.Contains(move);
    }
    
    public IEnumerator<Move> GetEnumerator()
    {
        return _moves.GetEnumerator();
    }
    
    public IReadOnlyList<Move> GetMoves() => _moves.AsReadOnly();
}
