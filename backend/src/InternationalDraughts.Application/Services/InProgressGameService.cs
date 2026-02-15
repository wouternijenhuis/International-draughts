using InternationalDraughts.Application.Interfaces;
using InternationalDraughts.Domain.Entities;
using InternationalDraughts.Domain.Interfaces;

namespace InternationalDraughts.Application.Services;

public class InProgressGameService : IInProgressGameService
{
    private readonly IInProgressGameRepository _repository;

    public InProgressGameService(IInProgressGameRepository repository)
    {
        _repository = repository;
    }

    public async Task<InProgressGameDto?> GetAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var game = await _repository.GetByUserIdAsync(userId, cancellationToken);
        if (game is null) return null;

        return new InProgressGameDto(game.UserId, game.GameState, game.SavedAt);
    }

    public async Task<InProgressGameDto> SaveAsync(Guid userId, SaveInProgressGameRequest request, CancellationToken cancellationToken = default)
    {
        var game = InProgressGame.Create(userId, request.GameState);
        var saved = await _repository.SaveAsync(game, cancellationToken);

        return new InProgressGameDto(saved.UserId, saved.GameState, saved.SavedAt);
    }

    public async Task DeleteAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        await _repository.DeleteByUserIdAsync(userId, cancellationToken);
    }
}
