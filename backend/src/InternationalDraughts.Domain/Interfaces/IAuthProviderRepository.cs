using InternationalDraughts.Domain.Entities;

namespace InternationalDraughts.Domain.Interfaces;

public interface IAuthProviderRepository
{
    Task<AuthProvider?> GetByProviderAsync(string providerName, string providerUserId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AuthProvider>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<AuthProvider> CreateAsync(AuthProvider authProvider, CancellationToken cancellationToken = default);
    Task DeleteAsync(AuthProvider authProvider, CancellationToken cancellationToken = default);
}
