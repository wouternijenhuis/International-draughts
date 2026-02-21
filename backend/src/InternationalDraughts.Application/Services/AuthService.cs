using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using InternationalDraughts.Application.DTOs.Auth;
using InternationalDraughts.Application.Interfaces;
using InternationalDraughts.Domain.Entities;
using InternationalDraughts.Domain.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace InternationalDraughts.Application.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IPlayerStatsRepository _statsRepository;
    private readonly IUserSettingsRepository _settingsRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly IConfiguration _configuration;

    /// <summary>
    /// Grace period for recently-rotated refresh tokens to handle concurrent requests.
    /// </summary>
    private static readonly TimeSpan RefreshGracePeriod = TimeSpan.FromSeconds(10);

    public AuthService(
        IUserRepository userRepository,
        IPlayerStatsRepository statsRepository,
        IUserSettingsRepository settingsRepository,
        IRefreshTokenRepository refreshTokenRepository,
        IConfiguration configuration)
    {
        _userRepository = userRepository;
        _statsRepository = statsRepository;
        _settingsRepository = settingsRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _configuration = configuration;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        var existingByEmail = await _userRepository.GetByEmailAsync(request.Email);
        if (existingByEmail is not null)
            throw new InvalidOperationException("Email already registered");

        var existingByUsername = await _userRepository.GetByUsernameAsync(request.Username);
        if (existingByUsername is not null)
            throw new InvalidOperationException("Username already taken");

        var user = User.Create(request.Username, request.Email, HashPassword(request.Password));
        await _userRepository.CreateAsync(user);

        // Create default stats
        var stats = PlayerStats.Create(user.Id);
        await _statsRepository.CreateAsync(stats);

        // Create default settings
        var settings = UserSettings.CreateDefault(user.Id);
        await _settingsRepository.CreateOrUpdateAsync(settings);

        var accessToken = GenerateJwtToken(user);
        var refreshToken = GenerateRefreshToken();
        var expiryMinutes = int.Parse(_configuration["Jwt:AccessTokenExpiryMinutes"] ?? "15");

        // Persist refresh token with a new token family
        var tokenFamily = Guid.NewGuid().ToString();
        await PersistRefreshTokenAsync(user.Id, refreshToken, tokenFamily);

        return new AuthResponse(user.Id, user.Username, accessToken, DateTime.UtcNow.AddMinutes(expiryMinutes), refreshToken);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var user = await _userRepository.GetByEmailAsync(request.Email)
            ?? throw new UnauthorizedAccessException("Invalid credentials");

        if (!VerifyPassword(request.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Invalid credentials");

        var accessToken = GenerateJwtToken(user);
        var refreshToken = GenerateRefreshToken();
        var expiryMinutes = int.Parse(_configuration["Jwt:AccessTokenExpiryMinutes"] ?? "15");

        // Persist refresh token with a new token family
        var tokenFamily = Guid.NewGuid().ToString();
        await PersistRefreshTokenAsync(user.Id, refreshToken, tokenFamily);

        return new AuthResponse(user.Id, user.Username, accessToken, DateTime.UtcNow.AddMinutes(expiryMinutes), refreshToken);
    }

    public async Task<AuthResponse> RefreshAsync(RefreshRequest request)
    {
        var tokenHash = HashToken(request.RefreshToken);
        var storedToken = await _refreshTokenRepository.GetByTokenHashAsync(tokenHash);

        if (storedToken is null)
            throw new UnauthorizedAccessException("Invalid refresh token.");

        // Check if the token was recently revoked (grace period for concurrent requests)
        if (storedToken.IsRevoked && storedToken.WasRecentlyRevoked(RefreshGracePeriod))
        {
            // Return the latest token in the family instead
            var latestToken = await _refreshTokenRepository.GetLatestByFamilyAsync(storedToken.TokenFamily);
            if (latestToken is not null && latestToken.IsValid())
            {
                var user = storedToken.User;
                var gracePeriodAccessToken = GenerateJwtToken(user);
                var gracePeriodExpiryMinutes = int.Parse(_configuration["Jwt:AccessTokenExpiryMinutes"] ?? "15");
                // Don't rotate again — return the existing latest token's raw value is not available,
                // so generate a new pair for the same family
                var newRefreshToken = GenerateRefreshToken();
                await PersistRefreshTokenAsync(user.Id, newRefreshToken, storedToken.TokenFamily);
                return new AuthResponse(user.Id, user.Username, gracePeriodAccessToken, DateTime.UtcNow.AddMinutes(gracePeriodExpiryMinutes), newRefreshToken);
            }
        }

        // If a revoked token is reused (outside grace period), this is a compromise — revoke entire family
        if (storedToken.IsRevoked)
        {
            await _refreshTokenRepository.RevokeAllByFamilyAsync(storedToken.TokenFamily);
            throw new UnauthorizedAccessException("Refresh token has been revoked. All tokens in this family have been invalidated.");
        }

        // Check expiry
        if (storedToken.ExpiresAt <= DateTime.UtcNow)
            throw new UnauthorizedAccessException("Refresh token has expired.");

        // Rotate: revoke old token, issue new one in same family
        storedToken.Revoke();
        // The entity is tracked by EF Core from the GetByTokenHashAsync call,
        // so creating the new token will also save the revocation in the same context.

        var rotatedUser = storedToken.User;
        var newAccessToken = GenerateJwtToken(rotatedUser);
        var rotatedRefreshToken = GenerateRefreshToken();
        var rotatedExpiryMinutes = int.Parse(_configuration["Jwt:AccessTokenExpiryMinutes"] ?? "15");
        await PersistRefreshTokenAsync(rotatedUser.Id, rotatedRefreshToken, storedToken.TokenFamily);

        return new AuthResponse(rotatedUser.Id, rotatedUser.Username, newAccessToken, DateTime.UtcNow.AddMinutes(rotatedExpiryMinutes), rotatedRefreshToken);
    }

    public async Task DeleteAccountAsync(Guid userId)
    {
        var user = await _userRepository.GetByIdAsync(userId)
            ?? throw new KeyNotFoundException($"User {userId} not found");

        await _userRepository.DeleteAsync(user);
    }

    private string GenerateJwtToken(User user)
    {
        var signingKey = _configuration["Jwt:SigningKey"]
            ?? throw new InvalidOperationException("JWT signing key is not configured.");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("username", user.Username),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var expiryMinutes = int.Parse(_configuration["Jwt:AccessTokenExpiryMinutes"] ?? "15");

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string GenerateRefreshToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes);
    }

    private async Task PersistRefreshTokenAsync(Guid userId, string rawRefreshToken, string tokenFamily)
    {
        var refreshTokenExpiryDays = int.Parse(_configuration["Jwt:RefreshTokenExpiryDays"] ?? "30");
        var tokenHash = HashToken(rawRefreshToken);
        var refreshTokenEntity = RefreshToken.Create(
            userId,
            tokenHash,
            DateTime.UtcNow.AddDays(refreshTokenExpiryDays),
            tokenFamily);
        await _refreshTokenRepository.CreateAsync(refreshTokenEntity);
    }

    private static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(bytes);
    }

    private static string HashPassword(string password)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(password));
        return Convert.ToBase64String(bytes);
    }

    private static bool VerifyPassword(string password, string hash)
    {
        return HashPassword(password) == hash;
    }
}
