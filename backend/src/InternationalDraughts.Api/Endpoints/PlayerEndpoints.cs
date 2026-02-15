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

        group.MapPatch("/{userId:guid}/display-name", async (Guid userId, UpdateDisplayNameRequest request, IPlayerService playerService) =>
        {
            try
            {
                var profile = await playerService.UpdateDisplayNameAsync(userId, request.DisplayName);
                return Results.Ok(profile);
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound();
            }
        })
        .WithName("UpdateDisplayName")
        .Produces<PlayerProfileDto>()
        .Produces(StatusCodes.Status404NotFound);

        group.MapPatch("/{userId:guid}/avatar", async (Guid userId, UpdateAvatarRequest request, IPlayerService playerService) =>
        {
            try
            {
                var profile = await playerService.UpdateAvatarAsync(userId, request.AvatarId);
                return Results.Ok(profile);
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound();
            }
        })
        .WithName("UpdateAvatar")
        .Produces<PlayerProfileDto>()
        .Produces(StatusCodes.Status404NotFound);

        group.MapGet("/{userId:guid}/rating-history", async (Guid userId, IPlayerService playerService) =>
        {
            try
            {
                var history = await playerService.GetRatingHistoryAsync(userId);
                return Results.Ok(history);
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound();
            }
        })
        .WithName("GetRatingHistory")
        .Produces<List<RatingHistoryDto>>()
        .Produces(StatusCodes.Status404NotFound);

        group.MapGet("/{userId:guid}/games", async (Guid userId, int? page, int? pageSize, string? difficulty, string? result, string? mode, IPlayerService playerService) =>
        {
            try
            {
                var games = await playerService.GetGameHistoryAsync(userId, page ?? 1, pageSize ?? 20, difficulty, result, mode);
                return Results.Ok(games);
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound();
            }
        })
        .WithName("GetGameHistory")
        .Produces<GameHistoryResponse>()
        .Produces(StatusCodes.Status404NotFound);

        return app;
    }
}
