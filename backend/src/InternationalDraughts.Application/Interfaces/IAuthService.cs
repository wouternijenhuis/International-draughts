using InternationalDraughts.Application.DTOs.Auth;

namespace InternationalDraughts.Application.Interfaces;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<AuthResponse> LoginAsync(LoginRequest request);
    Task DeleteAccountAsync(Guid userId);
}
