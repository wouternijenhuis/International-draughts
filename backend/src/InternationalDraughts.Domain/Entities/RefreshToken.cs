using InternationalDraughts.Domain.Common;

namespace InternationalDraughts.Domain.Entities;

public class RefreshToken : BaseEntity
{
    public string TokenHash { get; private set; } = string.Empty;
    public Guid UserId { get; private set; }
    public DateTime ExpiresAt { get; private set; }
    public bool IsRevoked { get; private set; }
    public User User { get; private set; } = null!;

    private RefreshToken() { }

    public static RefreshToken Create(Guid userId, string tokenHash, DateTime expiresAt)
    {
        return new RefreshToken
        {
            UserId = userId,
            TokenHash = tokenHash,
            ExpiresAt = expiresAt,
        };
    }

    public void Revoke()
    {
        IsRevoked = true;
        UpdatedAt = DateTime.UtcNow;
    }

    public bool IsValid() => !IsRevoked && ExpiresAt > DateTime.UtcNow;
}
