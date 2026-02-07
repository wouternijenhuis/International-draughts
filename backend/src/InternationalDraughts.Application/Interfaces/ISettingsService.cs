using InternationalDraughts.Application.DTOs.Settings;

namespace InternationalDraughts.Application.Interfaces;

public interface ISettingsService
{
    Task<UserSettingsDto> GetSettingsAsync(Guid userId);
    Task<UserSettingsDto> UpdateSettingsAsync(Guid userId, UpdateSettingsRequest request);
}
