using InternationalDraughts.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InternationalDraughts.Infrastructure.Persistence.Configurations;

public class InProgressGameConfiguration : IEntityTypeConfiguration<InProgressGame>
{
    public void Configure(EntityTypeBuilder<InProgressGame> builder)
    {
        builder.ToTable("in_progress_games");
        builder.HasKey(g => g.Id);
        builder.Property(g => g.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(g => g.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(g => g.GameState).HasColumnName("game_state").HasColumnType("jsonb").IsRequired();
        builder.Property(g => g.SavedAt).HasColumnName("saved_at").IsRequired();
        builder.Property(g => g.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(g => g.UpdatedAt).HasColumnName("updated_at");

        builder.HasOne(g => g.User).WithOne().HasForeignKey<InProgressGame>(g => g.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(g => g.UserId).IsUnique();
    }
}
