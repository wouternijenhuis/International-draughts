namespace InternationalDraughts.Application.DTOs.Player;

public record PlayerStatsDto(
    Guid UserId,
    string Username,
    double Rating,
    double RatingDeviation,
    int GamesPlayed,
    int Wins,
    int Losses,
    int Draws,
    double WinRate
);
