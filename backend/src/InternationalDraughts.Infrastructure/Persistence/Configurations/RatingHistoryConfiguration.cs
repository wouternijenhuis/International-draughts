using InternationalDraughts.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InternationalDraughts.Infrastructure.Persistence.Configurations;

public class RatingHistoryConfiguration : IEntityTypeConfiguration<RatingHistory>
{
    public void Configure(EntityTypeBuilder<RatingHistory> builder)
    {
        builder.ToTable("rating_history");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(r => r.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(r => r.Rating).HasColumnName("rating").IsRequired();
        builder.Property(r => r.RatingDeviation).HasColumnName("rating_deviation").IsRequired();
        builder.Property(r => r.GameResult).HasColumnName("game_result").HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(r => r.Opponent).HasColumnName("opponent").HasMaxLength(100).IsRequired();
        builder.Property(r => r.RecordedAt).HasColumnName("recorded_at").IsRequired();
        builder.Property(r => r.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(r => r.UpdatedAt).HasColumnName("updated_at");

        builder.HasOne(r => r.User).WithMany().HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(r => new { r.UserId, r.RecordedAt });
    }
}
