using InternationalDraughts.Domain.Entities;

namespace InternationalDraughts.Domain.Interfaces;

public interface IRefreshTokenRepository
{
    Task<RefreshToken?> GetByTokenHashAsync(string tokenHash, CancellationToken cancellationToken = default);
    Task<RefreshToken> CreateAsync(RefreshToken refreshToken, CancellationToken cancellationToken = default);
    Task RevokeAllForUserAsync(Guid userId, CancellationToken cancellationToken = default);
    Task RevokeAllByFamilyAsync(string tokenFamily, CancellationToken cancellationToken = default);
    Task<RefreshToken?> GetLatestByFamilyAsync(string tokenFamily, CancellationToken cancellationToken = default);
    Task DeleteExpiredAsync(CancellationToken cancellationToken = default);
}
