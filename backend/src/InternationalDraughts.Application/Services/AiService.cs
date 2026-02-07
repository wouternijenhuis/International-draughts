using InternationalDraughts.Application.Interfaces;
using Microsoft.Extensions.Logging;

namespace InternationalDraughts.Application.Services;

/// <summary>
/// Server-side AI service for expert difficulty.
/// Uses a simplified evaluation for now — the full engine integration 
/// will come from the shared TypeScript library via a worker or native bridge.
/// </summary>
public class AiService : IAiService
{
    private readonly ILogger<AiService> _logger;

    public AiService(ILogger<AiService> logger)
    {
        _logger = logger;
    }

    public async Task<AiMoveResponse> GetBestMoveAsync(AiMoveRequest request)
    {
        _logger.LogInformation("Computing AI move for {Player} at difficulty {Difficulty}",
            request.CurrentPlayer, request.Difficulty);

        // Simulate computation time for expert-level search
        await Task.Delay(100);

        // Find pieces for the current player
        var pieceValue = request.CurrentPlayer.ToLower() == "white" ? 1 : 2;
        var pieces = new List<int>();
        for (int i = 1; i < request.Board.Length && i <= 50; i++)
        {
            if (request.Board[i] == pieceValue || request.Board[i] == pieceValue + 2)
            {
                pieces.Add(i);
            }
        }

        if (pieces.Count == 0)
        {
            throw new InvalidOperationException("No pieces available for the current player");
        }

        // Placeholder: return a simple move suggestion
        // In production, this would use a proper game engine
        var from = pieces[0];
        var to = from + (request.CurrentPlayer.ToLower() == "white" ? 5 : -5);
        to = Math.Clamp(to, 1, 50);

        return new AiMoveResponse(
            Notation: $"{from}-{to}",
            From: from,
            To: to,
            CapturedSquares: Array.Empty<int>(),
            Score: 0.0,
            DepthReached: 10
        );
    }
}
