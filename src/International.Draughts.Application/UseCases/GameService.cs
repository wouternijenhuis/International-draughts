using International.Draughts.Application.Interfaces;
using International.Draughts.Domain.Entities;
using International.Draughts.Domain.Enums;
using International.Draughts.Domain.ValueObjects;

namespace International.Draughts.Application.UseCases;

/// <summary>
/// Implementation of game service.
/// </summary>
public class GameService : IGameService
{
    private readonly IMoveGenerator _moveGenerator;
    private readonly ISearchEngine _searchEngine;
    private readonly IOpeningBook? _openingBook;
    
    public GameService(IMoveGenerator moveGenerator, ISearchEngine searchEngine, IOpeningBook? openingBook = null)
    {
        _moveGenerator = moveGenerator ?? throw new ArgumentNullException(nameof(moveGenerator));
        _searchEngine = searchEngine ?? throw new ArgumentNullException(nameof(searchEngine));
        _openingBook = openingBook;
    }
    
    public Game CreateGame(Variant variant = Variant.Normal)
    {
        return new Game(variant);
    }
    
    public bool MakeMove(Game game, Move move)
    {
        if (game == null)
            throw new ArgumentNullException(nameof(game));
        
        if (!_moveGenerator.IsLegalMove(game.CurrentPosition, move))
            return false;
        
        var newPosition = _moveGenerator.ApplyMove(game.CurrentPosition, move);
        game.AddMove(move, newPosition);
        return true;
    }
    
    public Move GetBestMove(Game game, double timeLimit)
    {
        if (game == null)
            throw new ArgumentNullException(nameof(game));
        
        // Try opening book first if available
        if (_openingBook != null && _openingBook.IsLoaded)
        {
            if (_openingBook.Probe(game.CurrentPosition, margin: 50, out Move bookMove, out int bookScore))
            {
                Console.WriteLine($"Using opening book move (score: {bookScore})");
                return bookMove;
            }
        }
        
        return _searchEngine.SearchBestMove(game.CurrentPosition, timeLimit);
    }
    
    public bool IsGameOver(Game game)
    {
        if (game == null)
            throw new ArgumentNullException(nameof(game));
        
        return game.IsEnd();
    }
}
