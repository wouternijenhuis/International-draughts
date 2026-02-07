using InternationalDraughts.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InternationalDraughts.Infrastructure.Persistence.Configurations;

public class PlayerStatsConfiguration : IEntityTypeConfiguration<PlayerStats>
{
    public void Configure(EntityTypeBuilder<PlayerStats> builder)
    {
        builder.ToTable("player_stats");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.Id)
            .HasColumnName("id")
            .ValueGeneratedNever();

        builder.Property(p => p.UserId)
            .HasColumnName("user_id")
            .IsRequired();

        builder.Property(p => p.Rating)
            .HasColumnName("rating")
            .HasDefaultValue(1500.0)
            .IsRequired();

        builder.Property(p => p.RatingDeviation)
            .HasColumnName("rating_deviation")
            .HasDefaultValue(350.0)
            .IsRequired();

        builder.Property(p => p.Volatility)
            .HasColumnName("volatility")
            .HasDefaultValue(0.06)
            .IsRequired();

        builder.Property(p => p.GamesPlayed)
            .HasColumnName("games_played")
            .HasDefaultValue(0)
            .IsRequired();

        builder.Property(p => p.Wins)
            .HasColumnName("wins")
            .HasDefaultValue(0)
            .IsRequired();

        builder.Property(p => p.Losses)
            .HasColumnName("losses")
            .HasDefaultValue(0)
            .IsRequired();

        builder.Property(p => p.Draws)
            .HasColumnName("draws")
            .HasDefaultValue(0)
            .IsRequired();

        builder.Property(p => p.CreatedAt)
            .HasColumnName("created_at")
            .IsRequired();

        builder.Property(p => p.UpdatedAt)
            .HasColumnName("updated_at");

        builder.HasOne(p => p.User)
            .WithOne()
            .HasForeignKey<PlayerStats>(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(p => p.UserId)
            .IsUnique();

        builder.HasIndex(p => p.Rating);
    }
}
