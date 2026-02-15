using InternationalDraughts.Domain.Entities;
using InternationalDraughts.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace InternationalDraughts.Infrastructure.Persistence.Repositories;

public class InProgressGameRepository : IInProgressGameRepository
{
    private readonly DraughtsDbContext _context;

    public InProgressGameRepository(DraughtsDbContext context)
    {
        _context = context;
    }

    public async Task<InProgressGame?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _context.InProgressGames
            .FirstOrDefaultAsync(g => g.UserId == userId, cancellationToken);
    }

    public async Task<InProgressGame> SaveAsync(InProgressGame game, CancellationToken cancellationToken = default)
    {
        var existing = await _context.InProgressGames
            .FirstOrDefaultAsync(g => g.UserId == game.UserId, cancellationToken);

        if (existing is null)
        {
            await _context.InProgressGames.AddAsync(game, cancellationToken);
        }
        else
        {
            existing.UpdateState(game.GameState);
        }

        await _context.SaveChangesAsync(cancellationToken);
        return existing ?? game;
    }

    public async Task DeleteByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var existing = await _context.InProgressGames
            .FirstOrDefaultAsync(g => g.UserId == userId, cancellationToken);

        if (existing is not null)
        {
            _context.InProgressGames.Remove(existing);
            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
