using International.Draughts.Application.Interfaces;
using International.Draughts.Domain.Entities;
using International.Draughts.Domain.ValueObjects;

namespace International.Draughts.Infrastructure.OpeningBook;

/// <summary>
/// Opening book for International Draughts.
/// Stores and retrieves pre-analyzed opening positions and moves.
/// Based on book.cpp from the original C++ implementation.
/// </summary>
public class OpeningBook : IOpeningBook
{
    private readonly Dictionary<ulong, OpeningBookEntry> _bookTable;
    private readonly IMoveGenerator _moveGenerator;
    private const int DefaultHashSize = 1 << 21; // 2^21 entries
    private bool _isLoaded;

    public OpeningBook(IMoveGenerator moveGenerator)
    {
        _moveGenerator = moveGenerator ?? throw new ArgumentNullException(nameof(moveGenerator));
        _bookTable = new Dictionary<ulong, OpeningBookEntry>();
        _isLoaded = false;
    }

    /// <summary>
    /// Load opening book from a file.
    /// </summary>
    public bool LoadFromFile(string filePath)
    {
        if (!File.Exists(filePath))
        {
            Console.WriteLine($"Opening book file not found: {filePath}");
            return false;
        }

        try
        {
            _bookTable.Clear();
            using var reader = new StreamReader(filePath);
            
            // Get starting position
            var startPosition = Position.StartingPosition();
            
            // Load the book tree recursively
            LoadPosition(reader, startPosition);
            
            _isLoaded = true;
            Console.WriteLine($"Opening book loaded: {_bookTable.Count} positions");
            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error loading opening book: {ex.Message}");
            _isLoaded = false;
            return false;
        }
    }

    /// <summary>
    /// Probe the opening book for a move in the current position.
    /// </summary>
    public bool Probe(Position position, int margin, out Move move, out int score)
    {
        move = Move.None;
        score = 0;

        if (!_isLoaded)
        {
            return false;
        }

        ulong posHash = position.GetHash();
        
        if (!_bookTable.TryGetValue(posHash, out var entry) || !entry.IsNode)
        {
            return false;
        }

        // Generate all legal moves
        var moves = _moveGenerator.GenerateMoves(position).ToList();
        if (moves.Count == 0)
        {
            return false;
        }

        // Score each move based on resulting position in book
        var moveScores = new List<(Move move, int score)>();
        
        foreach (var mv in moves)
        {
            var newPosition = _moveGenerator.ApplyMove(position, mv);
            ulong newHash = newPosition.GetHash();
            
            if (_bookTable.TryGetValue(newHash, out var childEntry))
            {
                // Negate score because it's from opponent's perspective
                moveScores.Add((mv, -childEntry.Score));
            }
        }

        if (moveScores.Count == 0)
        {
            return false;
        }

        // Sort moves by score (best first)
        moveScores.Sort((a, b) => b.score.CompareTo(a.score));

        // Select among top moves if within margin
        var bestScore = moveScores[0].score;
        var candidateMoves = moveScores.Where(ms => ms.score >= bestScore - margin).ToList();

        if (candidateMoves.Count == 0)
        {
            return false;
        }

        // Randomly select from candidate moves
        var random = new Random();
        int index = random.Next(candidateMoves.Count);
        move = candidateMoves[index].move;
        score = candidateMoves[index].score;

        return true;
    }

    /// <summary>
    /// Check if the opening book is loaded.
    /// </summary>
    public bool IsLoaded => _isLoaded;

    /// <summary>
    /// Get the number of positions in the book.
    /// </summary>
    public int Count => _bookTable.Count;

    /// <summary>
    /// Clear the opening book.
    /// </summary>
    public void Clear()
    {
        _bookTable.Clear();
        _isLoaded = false;
    }

    /// <summary>
    /// Recursively load a position from the book file.
    /// </summary>
    private void LoadPosition(StreamReader reader, Position position)
    {
        ulong posHash = position.GetHash();
        
        // Check if already processed
        if (_bookTable.TryGetValue(posHash, out var existingEntry) && existingEntry.IsProcessed)
        {
            return;
        }

        // Create or get entry
        if (!_bookTable.ContainsKey(posHash))
        {
            _bookTable[posHash] = new OpeningBookEntry { PositionHash = posHash };
        }
        
        var entry = _bookTable[posHash];
        if (entry.IsProcessed)
        {
            return;
        }

        // Read node flag
        string? line = reader.ReadLine();
        if (line == null || string.IsNullOrWhiteSpace(line))
        {
            return;
        }

        bool isNode = line.Trim() == "1" || line.Trim().ToLower() == "true";
        entry.IsNode = isNode;

        if (!isNode)
        {
            // Leaf node - read score
            line = reader.ReadLine();
            if (line != null && int.TryParse(line.Trim(), out int leafScore))
            {
                entry.Score = leafScore;
            }
        }
        else
        {
            // Internal node - recursively load children
            var moves = _moveGenerator.GenerateMoves(position).ToList();
            
            // Sort moves for consistent ordering
            // (In the original C++, moves were sorted statically)
            foreach (var move in moves)
            {
                var newPosition = _moveGenerator.ApplyMove(position, move);
                LoadPosition(reader, newPosition);
            }
        }

        entry.IsProcessed = true;
    }

    /// <summary>
    /// Find or create an entry for a position.
    /// </summary>
    private OpeningBookEntry? FindEntry(Position position, bool create = false)
    {
        ulong posHash = position.GetHash();
        
        if (_bookTable.TryGetValue(posHash, out var entry))
        {
            return entry;
        }

        if (create)
        {
            entry = new OpeningBookEntry { PositionHash = posHash };
            _bookTable[posHash] = entry;
            return entry;
        }

        return null;
    }
}
