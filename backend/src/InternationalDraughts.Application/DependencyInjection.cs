using InternationalDraughts.Application.Interfaces;
using InternationalDraughts.Application.Services;
using Microsoft.Extensions.DependencyInjection;

namespace InternationalDraughts.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ISettingsService, SettingsService>();
        services.AddScoped<IPlayerService, PlayerService>();
        services.AddScoped<IAiService, AiService>();

        return services;
    }
}
