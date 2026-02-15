using InternationalDraughts.Domain.Entities;

namespace InternationalDraughts.Domain.Interfaces;

public interface IInProgressGameRepository
{
    Task<InProgressGame?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<InProgressGame> SaveAsync(InProgressGame game, CancellationToken cancellationToken = default);
    Task DeleteByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
}
