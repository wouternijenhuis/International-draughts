using InternationalDraughts.Domain.Entities;
using InternationalDraughts.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace InternationalDraughts.Infrastructure.Persistence.Repositories;

public class UserSettingsRepository : IUserSettingsRepository
{
    private readonly DraughtsDbContext _context;

    public UserSettingsRepository(DraughtsDbContext context)
    {
        _context = context;
    }

    public async Task<UserSettings?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _context.UserSettings
            .FirstOrDefaultAsync(s => s.UserId == userId, cancellationToken);
    }

    public async Task<UserSettings> CreateOrUpdateAsync(UserSettings userSettings, CancellationToken cancellationToken = default)
    {
        var existing = await _context.UserSettings
            .FirstOrDefaultAsync(s => s.UserId == userSettings.UserId, cancellationToken);

        if (existing is null)
        {
            await _context.UserSettings.AddAsync(userSettings, cancellationToken);
        }
        else
        {
            _context.Entry(existing).CurrentValues.SetValues(userSettings);
        }

        await _context.SaveChangesAsync(cancellationToken);
        return existing ?? userSettings;
    }
}
