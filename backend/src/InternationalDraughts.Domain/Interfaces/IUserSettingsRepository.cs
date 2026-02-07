using InternationalDraughts.Domain.Entities;

namespace InternationalDraughts.Domain.Interfaces;

public interface IUserSettingsRepository
{
    Task<UserSettings?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<UserSettings> CreateOrUpdateAsync(UserSettings userSettings, CancellationToken cancellationToken = default);
}
