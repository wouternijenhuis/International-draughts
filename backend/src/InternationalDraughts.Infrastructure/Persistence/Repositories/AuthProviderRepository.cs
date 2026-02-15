using InternationalDraughts.Domain.Entities;
using InternationalDraughts.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace InternationalDraughts.Infrastructure.Persistence.Repositories;

public class AuthProviderRepository : IAuthProviderRepository
{
    private readonly DraughtsDbContext _context;

    public AuthProviderRepository(DraughtsDbContext context)
    {
        _context = context;
    }

    public async Task<AuthProvider?> GetByProviderAsync(string providerName, string providerUserId, CancellationToken cancellationToken = default)
    {
        return await _context.AuthProviders
            .Include(a => a.User)
            .FirstOrDefaultAsync(a => a.ProviderName == providerName && a.ProviderUserId == providerUserId, cancellationToken);
    }

    public async Task<IReadOnlyList<AuthProvider>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _context.AuthProviders
            .Where(a => a.UserId == userId)
            .ToListAsync(cancellationToken);
    }

    public async Task<AuthProvider> CreateAsync(AuthProvider authProvider, CancellationToken cancellationToken = default)
    {
        await _context.AuthProviders.AddAsync(authProvider, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
        return authProvider;
    }

    public async Task DeleteAsync(AuthProvider authProvider, CancellationToken cancellationToken = default)
    {
        _context.AuthProviders.Remove(authProvider);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
