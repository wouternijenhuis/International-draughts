using InternationalDraughts.Domain.Entities;
using InternationalDraughts.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace InternationalDraughts.Infrastructure.Persistence.Repositories;

public class GameRecordRepository : IGameRecordRepository
{
    private readonly DraughtsDbContext _context;

    public GameRecordRepository(DraughtsDbContext context)
    {
        _context = context;
    }

    public async Task<GameRecord?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.GameRecords
            .Include(g => g.WhitePlayer)
            .Include(g => g.BlackPlayer)
            .FirstOrDefaultAsync(g => g.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyList<GameRecord>> GetByPlayerIdAsync(Guid playerId, CancellationToken cancellationToken = default)
    {
        return await _context.GameRecords
            .Include(g => g.WhitePlayer)
            .Include(g => g.BlackPlayer)
            .Where(g => g.WhitePlayerId == playerId || g.BlackPlayerId == playerId)
            .OrderByDescending(g => g.StartedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<GameRecord> CreateAsync(GameRecord gameRecord, CancellationToken cancellationToken = default)
    {
        await _context.GameRecords.AddAsync(gameRecord, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
        return gameRecord;
    }

    public async Task UpdateAsync(GameRecord gameRecord, CancellationToken cancellationToken = default)
    {
        _context.GameRecords.Update(gameRecord);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
