using International.Draughts.Application.Interfaces;
using International.Draughts.Domain.Entities;
using International.Draughts.Domain.ValueObjects;

namespace International.Draughts.Infrastructure.Search;

/// <summary>
/// Basic implementation of search engine.
/// This is a simplified placeholder - full implementation would require
/// the complete search algorithm from the C++ codebase.
/// </summary>
public class BasicSearchEngine : ISearchEngine
{
    private readonly IMoveGenerator _moveGenerator;
    
    public BasicSearchEngine(IMoveGenerator moveGenerator)
    {
        _moveGenerator = moveGenerator ?? throw new ArgumentNullException(nameof(moveGenerator));
    }
    
    public Move SearchBestMove(Position position, double timeLimit, int depthLimit = 0)
    {
        // Placeholder implementation
        // Full implementation would perform minimax/alpha-beta search
        var moves = _moveGenerator.GenerateMoves(position).ToList();
        
        if (moves.Count == 0)
            return Move.None;
        
        // For now, just return the first move
        return moves[0];
    }
    
    public void Stop()
    {
        // Placeholder - would stop the search in full implementation
    }
}
