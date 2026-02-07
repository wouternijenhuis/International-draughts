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

    public User WhitePlayer { get; private set; } = null!;

    public User BlackPlayer { get; private set; } = null!;

    private GameRecord() { }

    public static GameRecord Create(Guid whitePlayerId, Guid blackPlayerId, GameMode gameMode)
    {
        return new GameRecord
        {
            WhitePlayerId = whitePlayerId,
            BlackPlayerId = blackPlayerId,
            GameMode = gameMode,
        };
    }

    public void Complete(GameResult result, string moveHistory)
    {
        Result = result;
        MoveHistory = moveHistory;
        CompletedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }
}
