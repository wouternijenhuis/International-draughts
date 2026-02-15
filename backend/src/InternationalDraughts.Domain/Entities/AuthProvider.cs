using InternationalDraughts.Domain.Common;

namespace InternationalDraughts.Domain.Entities;

public class AuthProvider : BaseEntity
{
    public Guid UserId { get; private set; }
    public string ProviderName { get; private set; } = string.Empty;
    public string ProviderUserId { get; private set; } = string.Empty;
    public DateTime LinkedAt { get; private set; } = DateTime.UtcNow;
    public User User { get; private set; } = null!;

    private AuthProvider() { }

    public static AuthProvider Create(Guid userId, string providerName, string providerUserId)
    {
        return new AuthProvider
        {
            UserId = userId,
            ProviderName = providerName,
            ProviderUserId = providerUserId,
        };
    }
}
