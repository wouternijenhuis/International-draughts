using InternationalDraughts.Application.ExpertAi;
using InternationalDraughts.Application.Interfaces;
using InternationalDraughts.Domain.Draughts;
using Microsoft.Extensions.Logging;

namespace InternationalDraughts.Application.Services;

/// <summary>
/// Expert AI service that computes the best move for a given board position.
/// Uses a deep alpha-beta search engine with iterative deepening, PVS, LMR,
/// transposition table, killer moves, and history heuristic.
/// Stateless: each request gets its own search instance (REQ-70).
/// </summary>
public class AiService : IAiService
{
    private readonly Evaluator _evaluator;
    private readonly ExpertAiOptions _options;
    private readonly ILogger<AiService> _logger;
    private readonly ILogger<SearchEngine> _searchLogger;

    public AiService(
        Evaluator evaluator,
        ExpertAiOptions options,
        ILogger<AiService> logger,
        ILogger<SearchEngine> searchLogger)
    {
        _evaluator = evaluator;
        _options = options;
        _logger = logger;
        _searchLogger = searchLogger;
    }

    public Task<AiMoveResponse> GetBestMoveAsync(AiMoveRequest request, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Computing Expert AI move for {Player} (difficulty={Difficulty}, timeLimit={TimeLimit}ms)",
            request.CurrentPlayer, request.Difficulty, request.TimeLimitMs ?? _options.TimeLimitMs);

        // Parse the board from the integer array
        var board = BoardPosition.FromIntArray(request.Board);
        var player = ParseColor(request.CurrentPlayer);

        // Validate that the player has pieces on the board
        var (_, _, total) = board.CountPieces(player);
        if (total == 0)
            throw new InvalidOperationException("No pieces available for the current player");

        // Create a fresh search instance per request (stateless, concurrent-safe)
        var tt = new TranspositionTable(_options.TranspositionTableSizeMb);
        var engine = new SearchEngine(_evaluator, tt, _options, _searchLogger);

        // Compute the best move
        var result = engine.FindBestMove(board, player, request.TimeLimitMs);

        if (result == null)
            throw new InvalidOperationException("No legal moves available for the current player");

        _logger.LogInformation(
            "Expert AI computed move {Move}: score={Score}, depth={Depth}, nodes={Nodes}, time={Time}ms",
            result.Move.ToNotation(), result.Score, result.DepthReached,
            result.NodesEvaluated, result.TimeElapsedMs);

        var response = new AiMoveResponse(
            Notation: result.Move.ToNotation(),
            From: result.Move.Origin,
            To: result.Move.Destination,
            CapturedSquares: result.Move.CapturedSquares,
            Score: result.Score,
            DepthReached: result.DepthReached,
            TimeConsumedMs: result.TimeElapsedMs
        );

        return Task.FromResult(response);
    }

    private static PieceColor ParseColor(string color) =>
        color.ToLowerInvariant() switch
        {
            "white" => PieceColor.White,
            "black" => PieceColor.Black,
            _ => throw new InvalidOperationException($"Invalid player color: '{color}'. Must be 'white' or 'black'.")
        };
}
