using InternationalDraughts.Application.Interfaces;

namespace InternationalDraughts.Api.Endpoints;

public static class AiEndpoints
{
    public static IEndpointRouteBuilder MapAiEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/ai").WithTags("AI");

        group.MapPost("/move", async (AiMoveRequest request, IAiService aiService) =>
        {
            try
            {
                var response = await aiService.GetBestMoveAsync(request);
                return Results.Ok(response);
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        })
        .WithName("GetAiMove")
        .Produces<AiMoveResponse>()
        .Produces(StatusCodes.Status400BadRequest);

        return app;
    }
}
