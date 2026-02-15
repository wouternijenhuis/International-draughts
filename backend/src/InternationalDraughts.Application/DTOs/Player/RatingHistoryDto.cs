namespace InternationalDraughts.Application.DTOs.Player;

public record RatingHistoryDto(
    DateTime Date,
    double Rating,
    double RatingDeviation,
    string GameResult,
    string Opponent
);
