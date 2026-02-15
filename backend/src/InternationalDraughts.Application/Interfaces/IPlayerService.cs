using InternationalDraughts.Application.DTOs.Player;

namespace InternationalDraughts.Application.Interfaces;

public interface IPlayerService
{
    Task<PlayerProfileDto> GetProfileAsync(Guid userId);
    Task<PlayerStatsDto> GetStatsAsync(Guid userId);
    Task<PlayerProfileDto> UpdateDisplayNameAsync(Guid userId, string displayName);
    Task<PlayerProfileDto> UpdateAvatarAsync(Guid userId, string avatarId);
    Task<IReadOnlyList<RatingHistoryDto>> GetRatingHistoryAsync(Guid userId);
    Task<GameHistoryResponse> GetGameHistoryAsync(Guid userId, int page, int pageSize, string? difficulty = null, string? result = null, string? mode = null);
}
