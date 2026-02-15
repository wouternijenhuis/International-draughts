using InternationalDraughts.Domain.Entities;

namespace InternationalDraughts.Domain.Interfaces;

public interface IRatingHistoryRepository
{
    Task<IReadOnlyList<RatingHistory>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<RatingHistory> CreateAsync(RatingHistory ratingHistory, CancellationToken cancellationToken = default);
}
