using InternationalDraughts.Domain.Entities;

namespace InternationalDraughts.Domain.Interfaces;

public interface IPlayerStatsRepository
{
    Task<PlayerStats?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<PlayerStats> CreateAsync(PlayerStats playerStats, CancellationToken cancellationToken = default);
    Task UpdateAsync(PlayerStats playerStats, CancellationToken cancellationToken = default);
}
