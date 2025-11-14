using International.Draughts.Domain.Entities;
using International.Draughts.Domain.ValueObjects;

namespace International.Draughts.Application.Interfaces;

/// <summary>
/// Interface for the search engine that finds the best move.
/// </summary>
public interface ISearchEngine
{
    /// <summary>
    /// Searches for the best move from the given position.
    /// </summary>
    Move SearchBestMove(Position position, double timeLimit, int depthLimit = 0);
    
    /// <summary>
    /// Stops the current search.
    /// </summary>
    void Stop();
}
