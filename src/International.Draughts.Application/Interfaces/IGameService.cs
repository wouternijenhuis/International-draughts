using International.Draughts.Domain.Entities;
using International.Draughts.Domain.Enums;
using International.Draughts.Domain.ValueObjects;

namespace International.Draughts.Application.Interfaces;

/// <summary>
/// Service for managing games.
/// </summary>
public interface IGameService
{
    /// <summary>
    /// Creates a new game with the specified variant.
    /// </summary>
    Game CreateGame(Variant variant = Variant.Normal);
    
    /// <summary>
    /// Makes a move in the game.
    /// </summary>
    bool MakeMove(Game game, Move move);
    
    /// <summary>
    /// Gets the best move for the current position using the search engine.
    /// </summary>
    Move GetBestMove(Game game, double timeLimit);
    
    /// <summary>
    /// Checks if the game has ended.
    /// </summary>
    bool IsGameOver(Game game);
}
