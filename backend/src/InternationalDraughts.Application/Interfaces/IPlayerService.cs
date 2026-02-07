using InternationalDraughts.Application.DTOs.Player;

namespace InternationalDraughts.Application.Interfaces;

public interface IPlayerService
{
    Task<PlayerProfileDto> GetProfileAsync(Guid userId);
    Task<PlayerStatsDto> GetStatsAsync(Guid userId);
}
