using InternationalDraughts.Domain.Entities;
using InternationalDraughts.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace InternationalDraughts.Infrastructure.Persistence.Repositories;

public class PlayerStatsRepository : IPlayerStatsRepository
{
    private readonly DraughtsDbContext _context;

    public PlayerStatsRepository(DraughtsDbContext context)
    {
        _context = context;
    }

    public async Task<PlayerStats?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _context.PlayerStats
            .FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken);
    }

    public async Task<PlayerStats> CreateAsync(PlayerStats playerStats, CancellationToken cancellationToken = default)
    {
        await _context.PlayerStats.AddAsync(playerStats, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
        return playerStats;
    }

    public async Task UpdateAsync(PlayerStats playerStats, CancellationToken cancellationToken = default)
    {
        _context.PlayerStats.Update(playerStats);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
