namespace InternationalDraughts.Application.Interfaces;

public interface IInProgressGameService
{
    Task<InProgressGameDto?> GetAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<InProgressGameDto> SaveAsync(Guid userId, SaveInProgressGameRequest request, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid userId, CancellationToken cancellationToken = default);
}

public record InProgressGameDto(
    Guid UserId,
    string GameState,
    DateTime SavedAt
);

public record SaveInProgressGameRequest(
    string GameState
);
