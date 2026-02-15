using InternationalDraughts.Domain.Common;

namespace InternationalDraughts.Domain.Entities;

public class PlayerStats : BaseEntity
{
    public Guid UserId { get; private set; }

    public double Rating { get; private set; } = 1500.0;

    public double RatingDeviation { get; private set; } = 350.0;

    public double Volatility { get; private set; } = 0.06;

    public int GamesPlayed { get; private set; }

    public int Wins { get; private set; }

    public int Losses { get; private set; }

    public int Draws { get; private set; }

    public int CurrentStreak { get; private set; }

    public string CurrentStreakType { get; private set; } = "none";

    public int BestWinStreak { get; private set; }

    public User User { get; private set; } = null!;

    private PlayerStats() { }

    public static PlayerStats Create(Guid userId)
    {
        return new PlayerStats
        {
            UserId = userId,
        };
    }

    public void UpdateRating(double rating, double ratingDeviation, double volatility)
    {
        Rating = rating;
        RatingDeviation = ratingDeviation;
        Volatility = volatility;
        UpdatedAt = DateTime.UtcNow;
    }

    public void RecordWin()
    {
        GamesPlayed++;
        Wins++;
        if (CurrentStreakType == "win")
        {
            CurrentStreak++;
        }
        else
        {
            CurrentStreakType = "win";
            CurrentStreak = 1;
        }
        if (CurrentStreak > BestWinStreak)
        {
            BestWinStreak = CurrentStreak;
        }
        UpdatedAt = DateTime.UtcNow;
    }

    public void RecordLoss()
    {
        GamesPlayed++;
        Losses++;
        if (CurrentStreakType == "loss")
        {
            CurrentStreak++;
        }
        else
        {
            CurrentStreakType = "loss";
            CurrentStreak = 1;
        }
        UpdatedAt = DateTime.UtcNow;
    }

    public void RecordDraw()
    {
        GamesPlayed++;
        Draws++;
        if (CurrentStreakType == "draw")
        {
            CurrentStreak++;
        }
        else
        {
            CurrentStreakType = "draw";
            CurrentStreak = 1;
        }
        UpdatedAt = DateTime.UtcNow;
    }
}
