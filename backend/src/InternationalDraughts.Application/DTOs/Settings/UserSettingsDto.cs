namespace InternationalDraughts.Application.DTOs.Settings;

public record UserSettingsDto(
    string BoardTheme,
    bool ShowNotation,
    string AIDifficulty,
    string PreferredColor,
    bool TimedMode,
    string? ClockPreset
);
