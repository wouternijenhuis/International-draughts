using InternationalDraughts.Domain.Common;
using InternationalDraughts.Domain.Enums;

namespace InternationalDraughts.Domain.Entities;

public class RatingHistory : BaseEntity
{
    public Guid UserId { get; private set; }
    public double Rating { get; private set; }
    public double RatingDeviation { get; private set; }
    public GameResult GameResult { get; private set; }
    public string Opponent { get; private set; } = string.Empty;
    public DateTime RecordedAt { get; private set; } = DateTime.UtcNow;
    public User User { get; private set; } = null!;

    private RatingHistory() { }

    public static RatingHistory Create(Guid userId, double rating, double ratingDeviation, GameResult gameResult, string opponent)
    {
        return new RatingHistory
        {
            UserId = userId,
            Rating = rating,
            RatingDeviation = ratingDeviation,
            GameResult = gameResult,
            Opponent = opponent,
        };
    }
}
