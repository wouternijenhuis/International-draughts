using InternationalDraughts.Application.DTOs.Player;
using InternationalDraughts.Application.Interfaces;
using InternationalDraughts.Domain.Enums;
using InternationalDraughts.Domain.Interfaces;

namespace InternationalDraughts.Application.Services;

public class PlayerService : IPlayerService
{
    private readonly IUserRepository _userRepository;
    private readonly IPlayerStatsRepository _statsRepository;
    private readonly IRatingHistoryRepository _ratingHistoryRepository;
    private readonly IGameRecordRepository _gameRecordRepository;

    public PlayerService(
        IUserRepository userRepository,
        IPlayerStatsRepository statsRepository,
        IRatingHistoryRepository ratingHistoryRepository,
        IGameRecordRepository gameRecordRepository)
    {
        _userRepository = userRepository;
        _statsRepository = statsRepository;
        _ratingHistoryRepository = ratingHistoryRepository;
        _gameRecordRepository = gameRecordRepository;
    }

    public async Task<PlayerProfileDto> GetProfileAsync(Guid userId)
    {
        var user = await _userRepository.GetByIdAsync(userId)
            ?? throw new KeyNotFoundException($"User {userId} not found");
        var stats = await GetStatsAsync(userId);

        return new PlayerProfileDto(user.Id, user.Username, user.AvatarId, stats, user.CreatedAt);
    }

    public async Task<PlayerStatsDto> GetStatsAsync(Guid userId)
    {
        var user = await _userRepository.GetByIdAsync(userId)
            ?? throw new KeyNotFoundException($"User {userId} not found");
        var stats = await _statsRepository.GetByUserIdAsync(userId);

        if (stats is null)
        {
            return new PlayerStatsDto(userId, user.Username, 1500, 350, 0, 0, 0, 0, 0, 0, "none", 0);
        }

        var winRate = stats.GamesPlayed > 0 ? (double)stats.Wins / stats.GamesPlayed * 100 : 0;
        return new PlayerStatsDto(
            userId, user.Username, stats.Rating, stats.RatingDeviation,
            stats.GamesPlayed, stats.Wins, stats.Losses, stats.Draws,
            Math.Round(winRate, 1),
            stats.CurrentStreak, stats.CurrentStreakType, stats.BestWinStreak
        );
    }

    public async Task<PlayerProfileDto> UpdateDisplayNameAsync(Guid userId, string displayName)
    {
        var user = await _userRepository.GetByIdAsync(userId)
            ?? throw new KeyNotFoundException($"User {userId} not found");

        user.UpdateDisplayName(displayName);
        await _userRepository.UpdateAsync(user);

        return await GetProfileAsync(userId);
    }

    public async Task<PlayerProfileDto> UpdateAvatarAsync(Guid userId, string avatarId)
    {
        var user = await _userRepository.GetByIdAsync(userId)
            ?? throw new KeyNotFoundException($"User {userId} not found");

        user.UpdateAvatar(avatarId);
        await _userRepository.UpdateAsync(user);

        return await GetProfileAsync(userId);
    }

    public async Task<IReadOnlyList<RatingHistoryDto>> GetRatingHistoryAsync(Guid userId)
    {
        _ = await _userRepository.GetByIdAsync(userId)
            ?? throw new KeyNotFoundException($"User {userId} not found");

        var history = await _ratingHistoryRepository.GetByUserIdAsync(userId);
        return history.Select(h => new RatingHistoryDto(
            h.RecordedAt,
            h.Rating,
            h.RatingDeviation,
            h.GameResult.ToString(),
            h.Opponent
        )).ToList();
    }

    public async Task<GameHistoryResponse> GetGameHistoryAsync(
        Guid userId, int page, int pageSize,
        string? difficulty = null, string? result = null, string? mode = null)
    {
        _ = await _userRepository.GetByIdAsync(userId)
            ?? throw new KeyNotFoundException($"User {userId} not found");

        GameResult? gameResult = result is not null && Enum.TryParse<GameResult>(result, true, out var parsed) ? parsed : null;
        GameMode? gameMode = mode is not null && Enum.TryParse<GameMode>(mode, true, out var parsedMode) ? parsedMode : null;

        var (items, totalCount) = await _gameRecordRepository.GetByPlayerIdPagedAsync(
            userId, page, pageSize, difficulty, gameResult, gameMode);

        var dtos = items.Select(g =>
        {
            var isWhite = g.WhitePlayerId == userId;
            var opponentName = isWhite ? g.BlackPlayer?.Username ?? "Unknown" : g.WhitePlayer?.Username ?? "Unknown";
            var playerResult = g.Result switch
            {
                GameResult.WhiteWin => isWhite ? "Win" : "Loss",
                GameResult.BlackWin => isWhite ? "Loss" : "Win",
                GameResult.Draw => "Draw",
                GameResult.Abandoned => "Abandoned",
                _ => "Unknown"
            };

            return new GameHistoryItemDto(
                g.Id,
                g.CompletedAt ?? g.StartedAt,
                opponentName,
                playerResult,
                g.MoveCount,
                g.TimeControl,
                g.GameMode.ToString(),
                g.Difficulty
            );
        }).ToList();

        return new GameHistoryResponse(dtos, totalCount, page, pageSize);
    }
}
