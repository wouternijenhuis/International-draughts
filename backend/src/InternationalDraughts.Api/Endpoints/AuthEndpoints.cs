using InternationalDraughts.Application.DTOs.Auth;
using InternationalDraughts.Application.Interfaces;

namespace InternationalDraughts.Api.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Authentication");

        group.MapPost("/register", async (RegisterRequest request, IAuthService authService) =>
        {
            try
            {
                var response = await authService.RegisterAsync(request);
                return Results.Created($"/api/player/{response.UserId}", response);
            }
            catch (InvalidOperationException ex)
            {
                return Results.Conflict(new { error = ex.Message });
            }
        })
        .WithName("Register")
        .Produces<AuthResponse>(StatusCodes.Status201Created)
        .Produces(StatusCodes.Status409Conflict);

        group.MapPost("/login", async (LoginRequest request, IAuthService authService) =>
        {
            try
            {
                var response = await authService.LoginAsync(request);
                return Results.Ok(response);
            }
            catch (UnauthorizedAccessException)
            {
                return Results.Unauthorized();
            }
        })
        .WithName("Login")
        .Produces<AuthResponse>()
        .Produces(StatusCodes.Status401Unauthorized);

        group.MapDelete("/account/{userId:guid}", async (Guid userId, IAuthService authService) =>
        {
            await authService.DeleteAccountAsync(userId);
            return Results.NoContent();
        })
        .WithName("DeleteAccount")
        .Produces(StatusCodes.Status204NoContent);

        return app;
    }
}
