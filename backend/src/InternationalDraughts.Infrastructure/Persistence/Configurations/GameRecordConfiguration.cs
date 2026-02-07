using InternationalDraughts.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InternationalDraughts.Infrastructure.Persistence.Configurations;

public class GameRecordConfiguration : IEntityTypeConfiguration<GameRecord>
{
    public void Configure(EntityTypeBuilder<GameRecord> builder)
    {
        builder.ToTable("game_records");

        builder.HasKey(g => g.Id);

        builder.Property(g => g.Id)
            .HasColumnName("id")
            .ValueGeneratedNever();

        builder.Property(g => g.WhitePlayerId)
            .HasColumnName("white_player_id")
            .IsRequired();

        builder.Property(g => g.BlackPlayerId)
            .HasColumnName("black_player_id")
            .IsRequired();

        builder.Property(g => g.Result)
            .HasColumnName("result")
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(g => g.MoveHistory)
            .HasColumnName("move_history")
            .HasColumnType("jsonb")
            .HasDefaultValue("[]")
            .IsRequired();

        builder.Property(g => g.StartedAt)
            .HasColumnName("started_at")
            .IsRequired();

        builder.Property(g => g.CompletedAt)
            .HasColumnName("completed_at");

        builder.Property(g => g.GameMode)
            .HasColumnName("game_mode")
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(g => g.CreatedAt)
            .HasColumnName("created_at")
            .IsRequired();

        builder.Property(g => g.UpdatedAt)
            .HasColumnName("updated_at");

        builder.HasOne(g => g.WhitePlayer)
            .WithMany()
            .HasForeignKey(g => g.WhitePlayerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(g => g.BlackPlayer)
            .WithMany()
            .HasForeignKey(g => g.BlackPlayerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(g => g.WhitePlayerId);
        builder.HasIndex(g => g.BlackPlayerId);
        builder.HasIndex(g => g.StartedAt);
    }
}
