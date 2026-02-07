using InternationalDraughts.Domain.Common;
using InternationalDraughts.Domain.Enums;

namespace InternationalDraughts.Domain.Entities;

public class UserSettings : BaseEntity
{
    public Guid UserId { get; private set; }

    public BoardTheme BoardTheme { get; private set; } = BoardTheme.ClassicWood;

    public bool ShowNotation { get; private set; } = true;

    public int AIDifficulty { get; private set; } = 3;

    public string? PreferredColor { get; private set; }

    public bool TimedMode { get; private set; }

    public string? ClockPreset { get; private set; }

    public User User { get; private set; } = null!;

    private UserSettings() { }

    public static UserSettings CreateDefault(Guid userId)
    {
        return new UserSettings
        {
            UserId = userId,
        };
    }

    public void Update(
        BoardTheme boardTheme,
        bool showNotation,
        int aiDifficulty,
        string? preferredColor,
        bool timedMode,
        string? clockPreset)
    {
        BoardTheme = boardTheme;
        ShowNotation = showNotation;
        AIDifficulty = aiDifficulty;
        PreferredColor = preferredColor;
        TimedMode = timedMode;
        ClockPreset = clockPreset;
        UpdatedAt = DateTime.UtcNow;
    }
}
