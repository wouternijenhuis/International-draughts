using InternationalDraughts.Application.DTOs.Settings;
using InternationalDraughts.Application.Interfaces;

namespace InternationalDraughts.Api.Endpoints;

public static class SettingsEndpoints
{
    public static IEndpointRouteBuilder MapSettingsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/settings").WithTags("Settings").RequireAuthorization().RequireRateLimiting("authenticated");

        group.MapGet("/{userId:guid}", async (Guid userId, ISettingsService settingsService) =>
        {
            var settings = await settingsService.GetSettingsAsync(userId);
            return Results.Ok(settings);
        })
        .WithName("GetSettings")
        .Produces<UserSettingsDto>();

        group.MapPut("/{userId:guid}", async (Guid userId, UpdateSettingsRequest request, ISettingsService settingsService) =>
        {
            var settings = await settingsService.UpdateSettingsAsync(userId, request);
            return Results.Ok(settings);
        })
        .WithName("UpdateSettings")
        .Produces<UserSettingsDto>();

        return app;
    }
}
