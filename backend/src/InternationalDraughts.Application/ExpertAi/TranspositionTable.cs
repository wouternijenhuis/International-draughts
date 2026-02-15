using System.Runtime.CompilerServices;

namespace InternationalDraughts.Application.ExpertAi;

/// <summary>
/// Type of transposition table entry.
/// </summary>
public enum TtEntryType : byte
{
    /// <summary>Exact score (PV node).</summary>
    Exact,
    /// <summary>Lower bound (fail-high / beta cutoff).</summary>
    LowerBound,
    /// <summary>Upper bound (fail-low / alpha not improved).</summary>
    UpperBound
}

/// <summary>
/// A single entry in the transposition table.
/// </summary>
public struct TtEntry
{
    public ulong Hash;
    public int Score;
    public int Depth;
    public TtEntryType Type;
    public int BestMoveIndex; // Index of the best move in the move list (-1 = none)
}

/// <summary>
/// Lock-free transposition table using Zobrist hashing.
/// Sized by the configured memory budget, with replacement by depth-preferred scheme.
/// </summary>
public sealed class TranspositionTable
{
    private readonly TtEntry[] _entries;
    private readonly int _mask;

    /// <summary>Number of entries in the table.</summary>
    public int Size => _entries.Length;

    /// <summary>
    /// Creates a transposition table with the specified size in megabytes.
    /// The actual number of entries is rounded down to a power of 2.
    /// </summary>
    public TranspositionTable(int sizeMb)
    {
        long bytes = (long)sizeMb * 1024 * 1024;
        long entrySize = Unsafe.SizeOf<TtEntry>();
        long count = bytes / entrySize;

        // Round down to power of 2
        int powerOf2 = 1;
        while ((long)powerOf2 * 2 <= count)
            powerOf2 *= 2;

        _entries = new TtEntry[powerOf2];
        _mask = powerOf2 - 1;
    }

    /// <summary>Index into the table from a hash.</summary>
    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    private int Index(ulong hash) => (int)(hash & (uint)_mask);

    /// <summary>
    /// Probes the table for an entry matching the given hash.
    /// Returns true if a matching entry was found.
    /// </summary>
    public bool TryProbe(ulong hash, out TtEntry entry)
    {
        entry = _entries[Index(hash)];
        return entry.Hash == hash;
    }

    /// <summary>
    /// Stores an entry in the table. Uses depth-preferred replacement:
    /// only replaces an existing entry if the new entry has equal or greater depth.
    /// </summary>
    public void Store(ulong hash, int score, int depth, TtEntryType type, int bestMoveIndex)
    {
        int idx = Index(hash);
        ref var existing = ref _entries[idx];

        // Replace if: empty slot, same position, or new search is deeper
        if (existing.Hash == 0 || existing.Hash == hash || depth >= existing.Depth)
        {
            existing = new TtEntry
            {
                Hash = hash,
                Score = score,
                Depth = depth,
                Type = type,
                BestMoveIndex = bestMoveIndex
            };
        }
    }

    /// <summary>
    /// Clears all entries in the table.
    /// </summary>
    public void Clear()
    {
        Array.Clear(_entries);
    }
}
