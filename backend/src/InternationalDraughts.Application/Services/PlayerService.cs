using InternationalDraughts.Application.DTOs.Player;
using InternationalDraughts.Application.Interfaces;
using InternationalDraughts.Domain.Interfaces;

namespace InternationalDraughts.Application.Services;

public class PlayerService : IPlayerService
{
    private readonly IUserRepository _userRepository;
    private readonly IPlayerStatsRepository _statsRepository;

    public PlayerService(IUserRepository userRepository, IPlayerStatsRepository statsRepository)
    {
        _userRepository = userRepository;
        _statsRepository = statsRepository;
    }

    public async Task<PlayerProfileDto> GetProfileAsync(Guid userId)
    {
        var user = await _userRepository.GetByIdAsync(userId)
            ?? throw new KeyNotFoundException($"User {userId} not found");
        var stats = await GetStatsAsync(userId);

        return new PlayerProfileDto(user.Id, user.Username, stats, user.CreatedAt);
    }

    public async Task<PlayerStatsDto> GetStatsAsync(Guid userId)
    {
        var user = await _userRepository.GetByIdAsync(userId)
            ?? throw new KeyNotFoundException($"User {userId} not found");
        var stats = await _statsRepository.GetByUserIdAsync(userId);

        if (stats is null)
        {
            return new PlayerStatsDto(userId, user.Username, 1500, 350, 0, 0, 0, 0, 0);
        }

        var winRate = stats.GamesPlayed > 0 ? (double)stats.Wins / stats.GamesPlayed * 100 : 0;
        return new PlayerStatsDto(
            userId, user.Username, stats.Rating, stats.RatingDeviation,
            stats.GamesPlayed, stats.Wins, stats.Losses, stats.Draws,
            Math.Round(winRate, 1)
        );
    }
}
