using International.Draughts.Application.Interfaces;
using International.Draughts.Domain.Entities;
using International.Draughts.Domain.ValueObjects;

namespace International.Draughts.Infrastructure.Bitbase;

/// <summary>
/// Endgame bitbase (tablebase) that provides perfect play in endgame positions.
/// Loads pre-computed bitbases from files and probes them during search.
/// </summary>
public class Bitbase : IBitbase
{
    private readonly Dictionary<string, BitbaseStorage> _bitbases;
    private readonly string _basePath;
    private int _maxPieces;
    
    public Bitbase(string? basePath = null)
    {
        _basePath = basePath ?? Path.Combine("data", "bitbases");
        _bitbases = new Dictionary<string, BitbaseStorage>();
        _maxPieces = 0;
    }
    
    /// <summary>
    /// Load bitbases from the specified directory.
    /// Bitbase files should be named like "bb_2v1.gz" (2 white vs 1 black).
    /// </summary>
    public void LoadBitbases()
    {
        if (!Directory.Exists(_basePath))
        {
            Console.WriteLine($"Bitbase directory not found: {_basePath}");
            return;
        }
        
        var files = Directory.GetFiles(_basePath, "bb_*.gz");
        Console.WriteLine($"Loading bitbases from {_basePath}...");
        
        foreach (var file in files)
        {
            var fileName = Path.GetFileNameWithoutExtension(file); // Remove .gz
            if (!TryParseBitbaseName(fileName, out var config))
                continue;
            
            var (wm, bm, wk, bk) = config;
            var key = MakeKey(wm, bm, wk, bk);
            
            var storage = BitbaseStorage.LoadFromFile(file, wm, bm, wk, bk);
            if (storage != null)
            {
                _bitbases[key] = storage;
                int totalPieces = wm + bm + wk + bk;
                if (totalPieces > _maxPieces)
                    _maxPieces = totalPieces;
                
                Console.WriteLine($"  Loaded {fileName}: {storage.Size:N0} positions");
            }
        }
        
        Console.WriteLine($"Loaded {_bitbases.Count} bitbases (max {_maxPieces} pieces)");
    }
    
    /// <summary>
    /// Probe the bitbase for the result of the given position.
    /// </summary>
    public BitbaseResult? Probe(Position position)
    {
        if (!IsLoaded)
            return null;
        
        // Check if position qualifies for bitbase lookup
        if (!BitbaseIndex.IsEndgamePosition(position, _maxPieces))
            return null;
        
        var (wm, bm, wk, bk) = BitbaseIndex.GetPieceCounts(position);
        var key = MakeKey(wm, bm, wk, bk);
        
        if (!_bitbases.TryGetValue(key, out var storage))
            return null;
        
        // Index the position and retrieve result
        ulong index = BitbaseIndex.IndexPosition(position);
        return storage.Retrieve(index);
    }
    
    /// <summary>
    /// Check if the position is in a loaded bitbase.
    /// </summary>
    public bool Contains(Position position)
    {
        if (!IsLoaded)
            return false;
        
        if (!BitbaseIndex.IsEndgamePosition(position, _maxPieces))
            return false;
        
        var (wm, bm, wk, bk) = BitbaseIndex.GetPieceCounts(position);
        var key = MakeKey(wm, bm, wk, bk);
        
        return _bitbases.ContainsKey(key);
    }
    
    public int MaxPieces => _maxPieces;
    public bool IsLoaded => _bitbases.Count > 0;
    
    /// <summary>
    /// Create a unique key for a piece configuration.
    /// </summary>
    private static string MakeKey(int whiteMen, int blackMen, int whiteKings, int blackKings)
    {
        return $"{whiteMen}m{blackMen}m{whiteKings}k{blackKings}k";
    }
    
    /// <summary>
    /// Parse bitbase filename to extract piece configuration.
    /// Expected format: bb_WmMwWkKbBkK or bb_WvB (simplified)
    /// Examples: bb_2v1.gz, bb_1m0m1k0k.gz
    /// </summary>
    private static bool TryParseBitbaseName(string name, out (int wm, int bm, int wk, int bk) config)
    {
        config = (0, 0, 0, 0);
        
        if (!name.StartsWith("bb_"))
            return false;
        
        var parts = name.Substring(3); // Remove "bb_"
        
        // Try simple format: "WvB" (W white pieces vs B black pieces, all men)
        if (parts.Contains('v'))
        {
            var split = parts.Split('v');
            if (split.Length == 2 && int.TryParse(split[0], out int white) && int.TryParse(split[1], out int black))
            {
                config = (white, black, 0, 0);
                return true;
            }
        }
        
        // Try detailed format: "WmMmWkKk" where W white men, M black men, W white kings, K black kings
        // Example: "1m0m1k0k" means 1 white man, 0 black men, 1 white king, 0 black kings
        int wm = 0, bm = 0, wk = 0, bk = 0;
        
        // Split by 'm' and 'k' and parse alternately
        var mSplit = parts.Split('m');
        if (mSplit.Length >= 2)
        {
            int.TryParse(mSplit[0], out wm);
            if (mSplit.Length >= 2 && mSplit[1].Contains('k'))
            {
                var kSplit = mSplit[1].Split('k');
                if (kSplit.Length >= 2)
                {
                    int.TryParse(kSplit[0], out bm);
                    int.TryParse(kSplit[1], out wk);
                    
                    // Parse last segment if it exists
                    if (kSplit.Length >= 3)
                    {
                        int.TryParse(kSplit[2], out bk);
                    }
                    
                    config = (wm, bm, wk, bk);
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /// <summary>
    /// Generate a simple bitbase for testing (2 vs 1 endgame).
    /// This creates a minimal bitbase where 2 pieces should win against 1.
    /// </summary>
    public static void GenerateTestBitbase(string path)
    {
        Console.WriteLine("Generating test bitbase (2v1)...");
        
        var storage = new BitbaseStorage(2, 1, 0, 0);
        
        // Mark all positions as wins for the side with 2 pieces (simplified)
        // In reality, this would require retrograde analysis
        for (ulong i = 0; i < Math.Min(storage.Size, 100000); i++)
        {
            // Simplified: assume 2v1 is always winning in ~20 moves
            storage.Store(i, BitbaseValue.Win, 20);
        }
        
        storage.SaveToFile(path);
        Console.WriteLine($"Test bitbase saved to {path}");
    }
}
