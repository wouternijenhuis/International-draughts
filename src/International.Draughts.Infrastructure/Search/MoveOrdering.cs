using International.Draughts.Domain.ValueObjects;

namespace International.Draughts.Infrastructure.Search;

/// <summary>
/// Move ordering heuristics to improve alpha-beta search efficiency.
/// Based on killer moves and history heuristic from search.cpp
/// </summary>
public class MoveOrdering
{
    private readonly Move[][] _killerMoves;
    private readonly int[,] _historyScores;
    private const int MaxDepth = 64;
    private const int MaxSquares = 63;
    
    public MoveOrdering()
    {
        _killerMoves = new Move[MaxDepth][];
        for (int i = 0; i < MaxDepth; i++)
        {
            _killerMoves[i] = new Move[2]; // Store top 2 killer moves per depth
        }
        
        _historyScores = new int[MaxSquares, MaxSquares];
    }
    
    /// <summary>
    /// Clear all move ordering data for a new search.
    /// </summary>
    public void Clear()
    {
        for (int i = 0; i < MaxDepth; i++)
        {
            _killerMoves[i][0] = Move.None;
            _killerMoves[i][1] = Move.None;
        }
        
        Array.Clear(_historyScores, 0, _historyScores.Length);
    }
    
    /// <summary>
    /// Store a killer move at a specific depth.
    /// Killer moves are non-capture moves that caused beta cutoffs.
    /// </summary>
    public void StoreKillerMove(Move move, int depth)
    {
        if (depth < 0 || depth >= MaxDepth || move.IsNone)
            return;
        
        // Don't store if it's already the first killer
        if (_killerMoves[depth][0].Equals(move))
            return;
        
        // Shift moves down
        _killerMoves[depth][1] = _killerMoves[depth][0];
        _killerMoves[depth][0] = move;
    }
    
    /// <summary>
    /// Update history score for a move that caused a cutoff.
    /// </summary>
    public void UpdateHistory(Move move, int depth, int fromSquare, int toSquare)
    {
        if (fromSquare < 0 || fromSquare >= MaxSquares || 
            toSquare < 0 || toSquare >= MaxSquares)
            return;
        
        // Bonus increases with depth (deeper searches are more reliable)
        int bonus = depth * depth;
        _historyScores[fromSquare, toSquare] += bonus;
        
        // Prevent overflow
        if (_historyScores[fromSquare, toSquare] > 10000)
        {
            _historyScores[fromSquare, toSquare] = 10000;
        }
    }
    
    /// <summary>
    /// Get the history score for a move.
    /// </summary>
    public int GetHistoryScore(int fromSquare, int toSquare)
    {
        if (fromSquare < 0 || fromSquare >= MaxSquares || 
            toSquare < 0 || toSquare >= MaxSquares)
            return 0;
        
        return _historyScores[fromSquare, toSquare];
    }
    
    /// <summary>
    /// Check if a move is a killer move at a specific depth.
    /// </summary>
    public bool IsKillerMove(Move move, int depth)
    {
        if (depth < 0 || depth >= MaxDepth)
            return false;
        
        return _killerMoves[depth][0].Equals(move) || 
               _killerMoves[depth][1].Equals(move);
    }
    
    /// <summary>
    /// Get killer moves for a specific depth.
    /// </summary>
    public Move[] GetKillerMoves(int depth)
    {
        if (depth < 0 || depth >= MaxDepth)
            return new Move[] { Move.None, Move.None };
        
        return new Move[] { _killerMoves[depth][0], _killerMoves[depth][1] };
    }
    
    /// <summary>
    /// Score a move for ordering purposes.
    /// Higher scores = better moves (searched first).
    /// </summary>
    public int ScoreMove(Move move, Move ttMove, int depth, int fromSquare, int toSquare, bool isCapture)
    {
        // TT move has highest priority
        if (!ttMove.IsNone && move.Equals(ttMove))
        {
            return 1000000;
        }
        
        // Captures are generally good
        if (isCapture)
        {
            return 100000; // High priority for captures
        }
        
        // Killer moves (non-captures that caused cutoffs)
        if (IsKillerMove(move, depth))
        {
            return 10000;
        }
        
        // History heuristic
        return GetHistoryScore(fromSquare, toSquare);
    }
}
