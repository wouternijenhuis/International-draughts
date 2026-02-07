namespace InternationalDraughts.Application.Interfaces;

public interface IAiService
{
    Task<AiMoveResponse> GetBestMoveAsync(AiMoveRequest request);
}

public record AiMoveRequest(
    int[] Board,
    string CurrentPlayer,
    string Difficulty
);

public record AiMoveResponse(
    string Notation,
    int From,
    int To,
    int[] CapturedSquares,
    double Score,
    int DepthReached
);
