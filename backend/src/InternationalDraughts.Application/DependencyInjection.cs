using InternationalDraughts.Application.ExpertAi;
using InternationalDraughts.Application.Interfaces;
using InternationalDraughts.Application.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace InternationalDraughts.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services, IConfiguration? configuration = null)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ISettingsService, SettingsService>();
        services.AddScoped<IPlayerService, PlayerService>();
        services.AddScoped<IInProgressGameService, InProgressGameService>();

        // Expert AI configuration
        var expertAiOptions = new ExpertAiOptions();
        configuration?.GetSection(ExpertAiOptions.SectionName).Bind(expertAiOptions);
        services.AddSingleton(expertAiOptions);

        var evaluationWeights = new EvaluationWeights();
        configuration?.GetSection(EvaluationWeights.SectionName).Bind(evaluationWeights);
        services.AddSingleton(evaluationWeights);

        // Expert AI services — Evaluator is singleton (stateless, thread-safe)
        services.AddSingleton<Evaluator>();
        services.AddScoped<IAiService, AiService>();

        return services;
    }
}
