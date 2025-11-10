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
    
    public GameService(IMoveGenerator moveGenerator, ISearchEngine searchEngine)
    {
        _moveGenerator = moveGenerator ?? throw new ArgumentNullException(nameof(moveGenerator));
        _searchEngine = searchEngine ?? throw new ArgumentNullException(nameof(searchEngine));
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
        
        return _searchEngine.SearchBestMove(game.CurrentPosition, timeLimit);
    }
    
    public bool IsGameOver(Game game)
    {
        if (game == null)
            throw new ArgumentNullException(nameof(game));
        
        return game.IsEnd();
    }
}
