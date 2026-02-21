using InternationalDraughts.Application.DTOs.AppConfig;

namespace InternationalDraughts.Api.Endpoints;

public static class AppConfigEndpoints
{
    public static IEndpointRouteBuilder MapAppConfigEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/app-config").WithTags("AppConfig");

        group.MapGet("/", (IConfiguration configuration) =>
        {
            var section = configuration.GetSection("AppConfig");

            var response = new AppConfigResponse(
                MinimumVersion: section["MinimumVersion"] ?? "1.0.0",
                LatestVersion: section["LatestVersion"] ?? "1.0.0",
                UpdateUrl: section["UpdateUrl"] ?? "",
                MaintenanceMode: bool.TryParse(section["MaintenanceMode"], out var mm) && mm,
                MaintenanceMessage: section["MaintenanceMessage"]);

            return Results.Ok(response);
        })
        .WithName("GetAppConfig")
        .AllowAnonymous()
        .Produces<AppConfigResponse>();

        return app;
    }
}
