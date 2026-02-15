using InternationalDraughts.Domain.Entities;
using InternationalDraughts.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace InternationalDraughts.Infrastructure.Persistence.Repositories;

public class RatingHistoryRepository : IRatingHistoryRepository
{
    private readonly DraughtsDbContext _context;

    public RatingHistoryRepository(DraughtsDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<RatingHistory>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _context.RatingHistory
            .Where(r => r.UserId == userId)
            .OrderBy(r => r.RecordedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<RatingHistory> CreateAsync(RatingHistory ratingHistory, CancellationToken cancellationToken = default)
    {
        await _context.RatingHistory.AddAsync(ratingHistory, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
        return ratingHistory;
    }
}
