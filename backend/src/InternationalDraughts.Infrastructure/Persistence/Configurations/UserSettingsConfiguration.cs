using InternationalDraughts.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InternationalDraughts.Infrastructure.Persistence.Configurations;

public class UserSettingsConfiguration : IEntityTypeConfiguration<UserSettings>
{
    public void Configure(EntityTypeBuilder<UserSettings> builder)
    {
        builder.ToTable("user_settings");

        builder.HasKey(s => s.Id);

        builder.Property(s => s.Id)
            .HasColumnName("id")
            .ValueGeneratedNever();

        builder.Property(s => s.UserId)
            .HasColumnName("user_id")
            .IsRequired();

        builder.Property(s => s.BoardTheme)
            .HasColumnName("board_theme")
            .HasConversion<string>()
            .HasMaxLength(30)
            .HasDefaultValue(Domain.Enums.BoardTheme.ClassicWood)
            .IsRequired();

        builder.Property(s => s.ShowNotation)
            .HasColumnName("show_notation")
            .HasDefaultValue(true)
            .IsRequired();

        builder.Property(s => s.AIDifficulty)
            .HasColumnName("ai_difficulty")
            .HasDefaultValue(3)
            .IsRequired();

        builder.Property(s => s.PreferredColor)
            .HasColumnName("preferred_color")
            .HasMaxLength(10);

        builder.Property(s => s.TimedMode)
            .HasColumnName("timed_mode")
            .HasDefaultValue(false)
            .IsRequired();

        builder.Property(s => s.ClockPreset)
            .HasColumnName("clock_preset")
            .HasMaxLength(30);

        builder.Property(s => s.CreatedAt)
            .HasColumnName("created_at")
            .IsRequired();

        builder.Property(s => s.UpdatedAt)
            .HasColumnName("updated_at");

        builder.HasOne(s => s.User)
            .WithOne()
            .HasForeignKey<UserSettings>(s => s.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(s => s.UserId)
            .IsUnique();
    }
}
