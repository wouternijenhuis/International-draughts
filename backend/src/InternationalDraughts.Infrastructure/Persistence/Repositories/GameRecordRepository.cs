using InternationalDraughts.Domain.Entities;
using InternationalDraughts.Domain.Enums;
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

    public async Task<(IReadOnlyList<GameRecord> Items, int TotalCount)> GetByPlayerIdPagedAsync(
        Guid playerId,
        int page,
        int pageSize,
        string? difficulty = null,
        GameResult? result = null,
        GameMode? mode = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.GameRecords
            .Include(g => g.WhitePlayer)
            .Include(g => g.BlackPlayer)
            .Where(g => g.WhitePlayerId == playerId || g.BlackPlayerId == playerId);

        if (difficulty is not null)
        {
            query = query.Where(g => g.Difficulty == difficulty);
        }

        if (result is not null)
        {
            query = query.Where(g => g.Result == result);
        }

        if (mode is not null)
        {
            query = query.Where(g => g.GameMode == mode);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(g => g.StartedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
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
