using InternationalDraughts.Domain.Common;

namespace InternationalDraughts.Domain.Entities;

public class User : BaseEntity
{
    public string Username { get; private set; } = string.Empty;

    public string Email { get; private set; } = string.Empty;

    public string PasswordHash { get; private set; } = string.Empty;

    public string? OAuthProvider { get; private set; }

    public string? OAuthId { get; private set; }

    public bool IsDeleted { get; private set; }

    private User() { }

    public static User Create(string username, string email, string passwordHash)
    {
        return new User
        {
            Username = username,
            Email = email,
            PasswordHash = passwordHash,
        };
    }

    public static User CreateOAuth(string username, string email, string oAuthProvider, string oAuthId)
    {
        return new User
        {
            Username = username,
            Email = email,
            PasswordHash = string.Empty,
            OAuthProvider = oAuthProvider,
            OAuthId = oAuthId,
        };
    }

    public void Update(string username, string email)
    {
        Username = username;
        Email = email;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SoftDelete()
    {
        IsDeleted = true;
        UpdatedAt = DateTime.UtcNow;
    }
}
