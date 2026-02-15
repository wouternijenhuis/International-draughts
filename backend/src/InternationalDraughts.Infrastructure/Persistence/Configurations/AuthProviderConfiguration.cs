using InternationalDraughts.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InternationalDraughts.Infrastructure.Persistence.Configurations;

public class AuthProviderConfiguration : IEntityTypeConfiguration<AuthProvider>
{
    public void Configure(EntityTypeBuilder<AuthProvider> builder)
    {
        builder.ToTable("auth_providers");
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(a => a.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(a => a.ProviderName).HasColumnName("provider_name").HasMaxLength(50).IsRequired();
        builder.Property(a => a.ProviderUserId).HasColumnName("provider_user_id").HasMaxLength(255).IsRequired();
        builder.Property(a => a.LinkedAt).HasColumnName("linked_at").IsRequired();
        builder.Property(a => a.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(a => a.UpdatedAt).HasColumnName("updated_at");

        builder.HasOne(a => a.User).WithMany().HasForeignKey(a => a.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(a => new { a.UserId, a.ProviderName }).IsUnique();
        builder.HasIndex(a => new { a.ProviderName, a.ProviderUserId }).IsUnique();
    }
}
