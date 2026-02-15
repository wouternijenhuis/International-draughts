using InternationalDraughts.Domain.Common;
using InternationalDraughts.Domain.Enums;

namespace InternationalDraughts.Domain.Entities;

public class GameRecord : BaseEntity
{
    public Guid WhitePlayerId { get; private set; }

    public Guid BlackPlayerId { get; private set; }

    public GameResult? Result { get; private set; }

    public string MoveHistory { get; private set; } = "[]";

    public DateTime StartedAt { get; private set; } = DateTime.UtcNow;

    public DateTime? CompletedAt { get; private set; }

    public GameMode GameMode { get; private set; }

    public string? Difficulty { get; private set; }

    public int MoveCount { get; private set; }

    public string? TimeControl { get; private set; }

    public User WhitePlayer { get; private set; } = null!;

    public User BlackPlayer { get; private set; } = null!;

    private GameRecord() { }

    public static GameRecord Create(Guid whitePlayerId, Guid blackPlayerId, GameMode gameMode, string? difficulty = null, string? timeControl = null)
    {
        return new GameRecord
        {
            WhitePlayerId = whitePlayerId,
            BlackPlayerId = blackPlayerId,
            GameMode = gameMode,
            Difficulty = difficulty,
            TimeControl = timeControl,
        };
    }

    public void Complete(GameResult result, string moveHistory, int? moveCount = null)
    {
        Result = result;
        MoveHistory = moveHistory;
        MoveCount = moveCount ?? 0;
        CompletedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }
}
