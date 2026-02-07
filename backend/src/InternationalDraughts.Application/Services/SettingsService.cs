using InternationalDraughts.Application.DTOs.Settings;
using InternationalDraughts.Application.Interfaces;
using InternationalDraughts.Domain.Entities;
using InternationalDraughts.Domain.Enums;
using InternationalDraughts.Domain.Interfaces;

namespace InternationalDraughts.Application.Services;

public class SettingsService : ISettingsService
{
    private readonly IUserSettingsRepository _repository;

    public SettingsService(IUserSettingsRepository repository)
    {
        _repository = repository;
    }

    public async Task<UserSettingsDto> GetSettingsAsync(Guid userId)
    {
        var settings = await _repository.GetByUserIdAsync(userId);
        if (settings is null)
        {
            // Return defaults
            return new UserSettingsDto("ClassicWood", true, "3", "white", false, null);
        }

        return MapToDto(settings);
    }

    public async Task<UserSettingsDto> UpdateSettingsAsync(Guid userId, UpdateSettingsRequest request)
    {
        var settings = await _repository.GetByUserIdAsync(userId);

        if (settings is null)
        {
            settings = UserSettings.CreateDefault(userId);
        }

        var boardTheme = settings.BoardTheme;
        if (request.BoardTheme is not null && Enum.TryParse<BoardTheme>(request.BoardTheme, true, out var theme))
            boardTheme = theme;

        var showNotation = request.ShowNotation ?? settings.ShowNotation;
        var aiDifficulty = request.AIDifficulty is not null && int.TryParse(request.AIDifficulty, out var ai)
            ? ai
            : settings.AIDifficulty;
        var preferredColor = request.PreferredColor ?? settings.PreferredColor;
        var timedMode = request.TimedMode ?? settings.TimedMode;
        var clockPreset = request.ClockPreset ?? settings.ClockPreset;

        settings.Update(boardTheme, showNotation, aiDifficulty, preferredColor, timedMode, clockPreset);
        await _repository.CreateOrUpdateAsync(settings);

        return MapToDto(settings);
    }

    private static UserSettingsDto MapToDto(UserSettings s) =>
        new(s.BoardTheme.ToString(), s.ShowNotation, s.AIDifficulty.ToString(), s.PreferredColor ?? "white", s.TimedMode, s.ClockPreset);
}
