using InternationalDraughts.Domain.Entities;
using InternationalDraughts.Domain.Enums;

namespace InternationalDraughts.Domain.Interfaces;

public interface IGameRecordRepository
{
    Task<GameRecord?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<GameRecord>> GetByPlayerIdAsync(Guid playerId, CancellationToken cancellationToken = default);
    Task<(IReadOnlyList<GameRecord> Items, int TotalCount)> GetByPlayerIdPagedAsync(
        Guid playerId,
        int page,
        int pageSize,
        string? difficulty = null,
        GameResult? result = null,
        GameMode? mode = null,
        CancellationToken cancellationToken = default);
    Task<GameRecord> CreateAsync(GameRecord gameRecord, CancellationToken cancellationToken = default);
    Task UpdateAsync(GameRecord gameRecord, CancellationToken cancellationToken = default);
}
