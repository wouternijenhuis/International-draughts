namespace InternationalDraughts.Application.DTOs.Player;

public record PlayerProfileDto(
    Guid UserId,
    string Username,
    PlayerStatsDto Stats,
    DateTime JoinedAt
);
