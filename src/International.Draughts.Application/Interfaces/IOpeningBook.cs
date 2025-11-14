using International.Draughts.Domain.Entities;
using International.Draughts.Domain.ValueObjects;

namespace International.Draughts.Application.Interfaces;

/// <summary>
/// Interface for opening book functionality.
/// </summary>
public interface IOpeningBook
{
    /// <summary>
    /// Load opening book from a file.
    /// </summary>
    bool LoadFromFile(string filePath);

    /// <summary>
    /// Probe the opening book for a move in the current position.
    /// </summary>
    bool Probe(Position position, int margin, out Move move, out int score);

    /// <summary>
    /// Check if the opening book is loaded.
    /// </summary>
    bool IsLoaded { get; }

    /// <summary>
    /// Get the number of positions in the book.
    /// </summary>
    int Count { get; }

    /// <summary>
    /// Clear the opening book.
    /// </summary>
    void Clear();
}
