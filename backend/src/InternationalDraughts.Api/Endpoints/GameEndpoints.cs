using InternationalDraughts.Application.Interfaces;

namespace InternationalDraughts.Api.Endpoints;

public static class GameEndpoints
{
    public static IEndpointRouteBuilder MapGameEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/games").WithTags("Games");

        group.MapGet("/in-progress/{userId:guid}", async (Guid userId, IInProgressGameService service, CancellationToken cancellationToken) =>
        {
            var game = await service.GetAsync(userId, cancellationToken);
            return game is null ? Results.NoContent() : Results.Ok(game);
        })
        .WithName("GetInProgressGame")
        .Produces<InProgressGameDto>()
        .Produces(StatusCodes.Status204NoContent);

        group.MapPost("/in-progress/{userId:guid}", async (Guid userId, SaveInProgressGameRequest request, IInProgressGameService service, CancellationToken cancellationToken) =>
        {
            if (string.IsNullOrWhiteSpace(request.GameState))
            {
                return Results.BadRequest(new { error = "GameState is required." });
            }

            var saved = await service.SaveAsync(userId, request, cancellationToken);
            return Results.Ok(saved);
        })
        .WithName("SaveInProgressGame")
        .Produces<InProgressGameDto>()
        .Produces(StatusCodes.Status400BadRequest);

        group.MapDelete("/in-progress/{userId:guid}", async (Guid userId, IInProgressGameService service, CancellationToken cancellationToken) =>
        {
            await service.DeleteAsync(userId, cancellationToken);
            return Results.NoContent();
        })
        .WithName("DeleteInProgressGame")
        .Produces(StatusCodes.Status204NoContent);

        return app;
    }
}
