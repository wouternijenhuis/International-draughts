namespace InternationalDraughts.Application.DTOs.Settings;

public record UpdateSettingsRequest(
    string? BoardTheme,
    bool? ShowNotation,
    string? AIDifficulty,
    string? PreferredColor,
    bool? TimedMode,
    string? ClockPreset
);
