using InternationalDraughts.Domain.Entities;
using InternationalDraughts.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace InternationalDraughts.Infrastructure.Persistence.Repositories;

public class RefreshTokenRepository : IRefreshTokenRepository
{
    private readonly DraughtsDbContext _context;

    public RefreshTokenRepository(DraughtsDbContext context)
    {
        _context = context;
    }

    public async Task<RefreshToken?> GetByTokenHashAsync(string tokenHash, CancellationToken cancellationToken = default)
    {
        return await _context.RefreshTokens
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.TokenHash == tokenHash, cancellationToken);
    }

    public async Task<RefreshToken> CreateAsync(RefreshToken refreshToken, CancellationToken cancellationToken = default)
    {
        await _context.RefreshTokens.AddAsync(refreshToken, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
        return refreshToken;
    }

    public async Task RevokeAllForUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var tokens = await _context.RefreshTokens
            .Where(r => r.UserId == userId && !r.IsRevoked)
            .ToListAsync(cancellationToken);

        foreach (var token in tokens)
        {
            token.Revoke();
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task RevokeAllByFamilyAsync(string tokenFamily, CancellationToken cancellationToken = default)
    {
        var tokens = await _context.RefreshTokens
            .Where(r => r.TokenFamily == tokenFamily && !r.IsRevoked)
            .ToListAsync(cancellationToken);

        foreach (var token in tokens)
        {
            token.Revoke();
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<RefreshToken?> GetLatestByFamilyAsync(string tokenFamily, CancellationToken cancellationToken = default)
    {
        return await _context.RefreshTokens
            .Where(r => r.TokenFamily == tokenFamily)
            .OrderByDescending(r => r.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task DeleteExpiredAsync(CancellationToken cancellationToken = default)
    {
        var expired = await _context.RefreshTokens
            .Where(r => r.ExpiresAt < DateTime.UtcNow)
            .ToListAsync(cancellationToken);

        _context.RefreshTokens.RemoveRange(expired);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
