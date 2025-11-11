using International.Draughts.Domain.ValueObjects;

namespace International.Draughts.Infrastructure.Search;

/// <summary>
/// Transposition table for storing search results.
/// Helps avoid re-searching the same positions.
/// </summary>
public class TranspositionTable
{
    private readonly Entry[] _table;
    private readonly int _sizeMask;
    
    public TranspositionTable(int sizeBits = 20) // 2^20 entries = ~16MB
    {
        int size = 1 << sizeBits;
        _table = new Entry[size];
        _sizeMask = size - 1;
        
        for (int i = 0; i < size; i++)
        {
            _table[i] = new Entry();
        }
    }
    
    /// <summary>
    /// Store a position evaluation in the table.
    /// </summary>
    public void Store(ulong positionHash, Move bestMove, int score, int depth, EntryType type)
    {
        int index = (int)(positionHash & (ulong)_sizeMask);
        ref Entry entry = ref _table[index];
        
        // Replace if this is a deeper search or same position
        if (entry.Depth <= depth || entry.Hash == positionHash)
        {
            entry.Hash = positionHash;
            entry.BestMove = bestMove;
            entry.Score = score;
            entry.Depth = depth;
            entry.Type = type;
        }
    }
    
    /// <summary>
    /// Probe the table for a stored position.
    /// </summary>
    public bool Probe(ulong positionHash, out Move bestMove, out int score, out int depth, out EntryType type)
    {
        int index = (int)(positionHash & (ulong)_sizeMask);
        Entry entry = _table[index];
        
        if (entry.Hash == positionHash)
        {
            bestMove = entry.BestMove;
            score = entry.Score;
            depth = entry.Depth;
            type = entry.Type;
            return true;
        }
        
        bestMove = Move.None;
        score = 0;
        depth = 0;
        type = EntryType.Exact;
        return false;
    }
    
    /// <summary>
    /// Clear the transposition table.
    /// </summary>
    public void Clear()
    {
        for (int i = 0; i < _table.Length; i++)
        {
            _table[i] = new Entry();
        }
    }
    
    private struct Entry
    {
        public ulong Hash;
        public Move BestMove;
        public int Score;
        public int Depth;
        public EntryType Type;
    }
}

/// <summary>
/// Type of transposition table entry.
/// </summary>
public enum EntryType
{
    Exact,  // Exact score
    Lower,  // Lower bound (beta cutoff)
    Upper   // Upper bound (alpha cutoff)
}
