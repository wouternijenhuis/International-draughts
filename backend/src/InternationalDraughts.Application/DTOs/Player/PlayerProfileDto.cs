namespace InternationalDraughts.Application.DTOs.Player;

public record PlayerProfileDto(
    Guid UserId,
    string Username,
    string AvatarId,
    PlayerStatsDto Stats,
    DateTime JoinedAt
);
