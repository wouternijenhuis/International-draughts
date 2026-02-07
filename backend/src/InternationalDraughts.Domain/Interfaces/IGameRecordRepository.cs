using InternationalDraughts.Domain.Entities;

namespace InternationalDraughts.Domain.Interfaces;

public interface IGameRecordRepository
{
    Task<GameRecord?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<GameRecord>> GetByPlayerIdAsync(Guid playerId, CancellationToken cancellationToken = default);
    Task<GameRecord> CreateAsync(GameRecord gameRecord, CancellationToken cancellationToken = default);
    Task UpdateAsync(GameRecord gameRecord, CancellationToken cancellationToken = default);
}
