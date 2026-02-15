using InternationalDraughts.Domain.Entities;
using InternationalDraughts.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace InternationalDraughts.Infrastructure.Persistence;

public static class SeedData
{
    /// <summary>
    /// Seeds development data if the database is empty. Only runs in Development environment.
    /// </summary>
    public static async Task SeedDevelopmentDataAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<DraughtsDbContext>();
        var environment = scope.ServiceProvider.GetRequiredService<IHostEnvironment>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<DraughtsDbContext>>();

        if (!environment.IsDevelopment())
        {
            logger.LogInformation("Skipping seed data — not in Development environment");
            return;
        }

        // Only seed if no users exist
        if (await context.Users.AnyAsync())
        {
            logger.LogInformation("Seed data already exists — skipping");
            return;
        }

        logger.LogInformation("Seeding development data...");

        var testUserId = Guid.Parse("00000000-0000-0000-0000-000000000001");
        var aiPlayerId = Guid.Parse("00000000-0000-0000-0000-000000000099");

        // Create test user
        var testUser = User.Create("TestPlayer", "test@example.com", "AQAAAAIAAYagAAAAEH5g6Wdm8JhfX5nOxz6z+HashedPassword==");
        SetEntityId(testUser, testUserId);

        // Create AI placeholder user  
        var aiUser = User.Create("AI", "ai@system.local", string.Empty);
        SetEntityId(aiUser, aiPlayerId);

        context.Users.AddRange(testUser, aiUser);
        await context.SaveChangesAsync();

        // Create player stats
        var stats = PlayerStats.Create(testUserId);
        for (var i = 0; i < 15; i++) stats.RecordWin();
        for (var i = 0; i < 8; i++) stats.RecordLoss();
        for (var i = 0; i < 3; i++) stats.RecordDraw();
        stats.UpdateRating(1620, 85, 0.058);
        context.PlayerStats.Add(stats);

        // Create sample game records
        var difficulties = new[] { "easy", "medium", "hard", "expert" };
        var results = new[] { GameResult.WhiteWin, GameResult.BlackWin, GameResult.Draw };
        var random = new Random(42); // Deterministic seed

        for (var i = 0; i < 26; i++)
        {
            var difficulty = difficulties[random.Next(difficulties.Length)];
            var result = results[random.Next(results.Length)];
            var daysAgo = random.Next(1, 90);
            var game = GameRecord.Create(testUserId, aiPlayerId, GameMode.HumanVsAI, difficulty);
            game.Complete(result, "[]");
            SetEntityCreatedAt(game, DateTime.UtcNow.AddDays(-daysAgo));
            context.GameRecords.Add(game);
        }

        // Create rating history entries
        var baseRating = 1500.0;
        for (var i = 0; i < 20; i++)
        {
            var delta = random.Next(-30, 40);
            baseRating += delta;
            var rd = 350.0 - i * 12;
            var result = delta > 0 ? GameResult.WhiteWin : (delta < -10 ? GameResult.BlackWin : GameResult.Draw);
            var entry = RatingHistory.Create(testUserId, baseRating, Math.Max(rd, 50), result, "AI Medium");
            SetEntityCreatedAt(entry, DateTime.UtcNow.AddDays(-90 + i * 4));
            context.RatingHistory.Add(entry);
        }

        // Create default settings
        var settings = UserSettings.CreateDefault(testUserId);
        context.UserSettings.Add(settings);

        await context.SaveChangesAsync();
        logger.LogInformation("Development seed data created successfully");
    }

    /// <summary>
    /// Helper to set the Id on a BaseEntity (for seeding deterministic IDs).
    /// Uses reflection since Id setter is protected.
    /// </summary>
    private static void SetEntityId<T>(T entity, Guid id) where T : class
    {
        var prop = typeof(T).BaseType?.GetProperty("Id") ?? typeof(T).GetProperty("Id");
        prop?.SetValue(entity, id);
    }

    /// <summary>
    /// Helper to set CreatedAt for backdating seed records.
    /// </summary>
    private static void SetEntityCreatedAt<T>(T entity, DateTime createdAt) where T : class
    {
        var prop = typeof(T).BaseType?.GetProperty("CreatedAt") ?? typeof(T).GetProperty("CreatedAt");
        prop?.SetValue(entity, createdAt);
    }
}
