using InternationalDraughts.Domain.Common;

namespace InternationalDraughts.Domain.Entities;

public class RefreshToken : BaseEntity
{
    public string TokenHash { get; private set; } = string.Empty;
    public Guid UserId { get; private set; }
    public DateTime ExpiresAt { get; private set; }
    public bool IsRevoked { get; private set; }
    public DateTime? RevokedAt { get; private set; }
    public string TokenFamily { get; private set; } = string.Empty;
    public User User { get; private set; } = null!;

    private RefreshToken() { }

    public static RefreshToken Create(Guid userId, string tokenHash, DateTime expiresAt, string tokenFamily)
    {
        return new RefreshToken
        {
            UserId = userId,
            TokenHash = tokenHash,
            ExpiresAt = expiresAt,
            TokenFamily = tokenFamily,
        };
    }

    public void Revoke()
    {
        IsRevoked = true;
        RevokedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Checks if this token was revoked within the given grace period (for concurrent request handling).
    /// </summary>
    public bool WasRecentlyRevoked(TimeSpan gracePeriod)
    {
        return IsRevoked && RevokedAt.HasValue && DateTime.UtcNow - RevokedAt.Value < gracePeriod;
    }

    public bool IsValid() => !IsRevoked && ExpiresAt > DateTime.UtcNow;
}
