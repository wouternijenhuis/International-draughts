using InternationalDraughts.Application.Interfaces;

namespace InternationalDraughts.Api.Endpoints;

public static class AiEndpoints
{
    public static IEndpointRouteBuilder MapAiEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/ai").WithTags("AI").RequireAuthorization().RequireRateLimiting("ai");

        group.MapPost("/move", async (AiMoveRequest request, IAiService aiService, CancellationToken cancellationToken) =>
        {
            // Validate request
            if (request.Board is null || request.Board.Length < 51)
            {
                return Results.BadRequest(new { error = "Board must be an integer array with at least 51 elements (index 0 unused, 1-50 for squares)." });
            }

            if (string.IsNullOrWhiteSpace(request.CurrentPlayer))
            {
                return Results.BadRequest(new { error = "CurrentPlayer is required and must be 'white' or 'black'." });
            }

            try
            {
                var response = await aiService.GetBestMoveAsync(request, cancellationToken);
                return Results.Ok(response);
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
            catch (OperationCanceledException)
            {
                return Results.StatusCode(StatusCodes.Status408RequestTimeout);
            }
        })
        .WithName("GetAiMove")
        .WithDescription("Compute the best move for a given board position using the Expert AI engine. " +
                          "The endpoint is stateless — each request contains the full board position.")
        .Produces<AiMoveResponse>()
        .Produces(StatusCodes.Status400BadRequest)
        .Produces(StatusCodes.Status408RequestTimeout)
        .Produces(StatusCodes.Status500InternalServerError);

        return app;
    }
}
