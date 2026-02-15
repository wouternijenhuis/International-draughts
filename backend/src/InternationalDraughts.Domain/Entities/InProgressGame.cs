using InternationalDraughts.Domain.Common;

namespace InternationalDraughts.Domain.Entities;

public class InProgressGame : BaseEntity
{
    public Guid UserId { get; private set; }
    public string GameState { get; private set; } = "{}";
    public DateTime SavedAt { get; private set; } = DateTime.UtcNow;
    public User User { get; private set; } = null!;

    private InProgressGame() { }

    public static InProgressGame Create(Guid userId, string gameState)
    {
        return new InProgressGame
        {
            UserId = userId,
            GameState = gameState,
            SavedAt = DateTime.UtcNow,
        };
    }

    public void UpdateState(string gameState)
    {
        GameState = gameState;
        SavedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }
}
