using InternationalDraughts.Application.DTOs.Player;
using InternationalDraughts.Application.Interfaces;

namespace InternationalDraughts.Api.Endpoints;

public static class PlayerEndpoints
{
    public static IEndpointRouteBuilder MapPlayerEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/player").WithTags("Player");

        group.MapGet("/{userId:guid}/profile", async (Guid userId, IPlayerService playerService) =>
        {
            try
            {
                var profile = await playerService.GetProfileAsync(userId);
                return Results.Ok(profile);
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound();
            }
        })
        .WithName("GetPlayerProfile")
        .Produces<PlayerProfileDto>()
        .Produces(StatusCodes.Status404NotFound);

        group.MapGet("/{userId:guid}/stats", async (Guid userId, IPlayerService playerService) =>
        {
            try
            {
                var stats = await playerService.GetStatsAsync(userId);
                return Results.Ok(stats);
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound();
            }
        })
        .WithName("GetPlayerStats")
        .Produces<PlayerStatsDto>()
        .Produces(StatusCodes.Status404NotFound);

        return app;
    }
}
