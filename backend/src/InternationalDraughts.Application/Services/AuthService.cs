using System.Security.Cryptography;
using System.Text;
using InternationalDraughts.Application.DTOs.Auth;
using InternationalDraughts.Application.Interfaces;
using InternationalDraughts.Domain.Entities;
using InternationalDraughts.Domain.Interfaces;

namespace InternationalDraughts.Application.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IPlayerStatsRepository _statsRepository;
    private readonly IUserSettingsRepository _settingsRepository;

    public AuthService(
        IUserRepository userRepository,
        IPlayerStatsRepository statsRepository,
        IUserSettingsRepository settingsRepository)
    {
        _userRepository = userRepository;
        _statsRepository = statsRepository;
        _settingsRepository = settingsRepository;
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

        // Generate a simple token (in production, use JWT)
        var token = GenerateToken();
        return new AuthResponse(user.Id, user.Username, token, DateTime.UtcNow.AddHours(24));
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var user = await _userRepository.GetByEmailAsync(request.Email)
            ?? throw new UnauthorizedAccessException("Invalid credentials");

        if (!VerifyPassword(request.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Invalid credentials");

        var token = GenerateToken();
        return new AuthResponse(user.Id, user.Username, token, DateTime.UtcNow.AddHours(24));
    }

    public async Task DeleteAccountAsync(Guid userId)
    {
        var user = await _userRepository.GetByIdAsync(userId)
            ?? throw new KeyNotFoundException($"User {userId} not found");

        await _userRepository.DeleteAsync(user);
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

    private static string GenerateToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes);
    }
}
