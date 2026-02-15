using InternationalDraughts.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace InternationalDraughts.Infrastructure.Persistence;

public class DraughtsDbContext : DbContext
{
    public DraughtsDbContext(DbContextOptions<DraughtsDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<GameRecord> GameRecords => Set<GameRecord>();
    public DbSet<PlayerStats> PlayerStats => Set<PlayerStats>();
    public DbSet<UserSettings> UserSettings => Set<UserSettings>();
    public DbSet<AuthProvider> AuthProviders => Set<AuthProvider>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<RatingHistory> RatingHistory => Set<RatingHistory>();
    public DbSet<InProgressGame> InProgressGames => Set<InProgressGame>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(DraughtsDbContext).Assembly);
    }
}
