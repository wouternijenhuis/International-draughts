namespace InternationalDraughts.Application.Interfaces;

public interface IAiService
{
    Task<AiMoveResponse> GetBestMoveAsync(AiMoveRequest request, CancellationToken cancellationToken = default);
}

/// <summary>
/// Request for the Expert AI move endpoint.
/// Board is encoded as int[]: index 0 unused, indices 1-50 for FMJD squares.
/// Piece encoding: 0=empty, 1=white man, 2=black man, 3=white king, 4=black king.
/// </summary>
public record AiMoveRequest(
    int[] Board,
    string CurrentPlayer,
    string Difficulty,
    int? TimeLimitMs = null
);

/// <summary>
/// Response from the Expert AI move endpoint.
/// </summary>
public record AiMoveResponse(
    string Notation,
    int From,
    int To,
    int[] CapturedSquares,
    double Score,
    int DepthReached,
    long TimeConsumedMs
);
