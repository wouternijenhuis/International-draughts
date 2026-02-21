namespace InternationalDraughts.Application.DTOs.Auth;

public record AuthResponse(Guid UserId, string Username, string Token, DateTime ExpiresAt, string? RefreshToken = null);
