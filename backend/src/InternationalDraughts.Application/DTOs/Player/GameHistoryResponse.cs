namespace InternationalDraughts.Application.DTOs.Player;

public record GameHistoryResponse(
    IReadOnlyList<GameHistoryItemDto> Items,
    int TotalCount,
    int Page,
    int PageSize
);

public record GameHistoryItemDto(
    Guid Id,
    DateTime Date,
    string Opponent,
    string Result,
    int MoveCount,
    string? TimeControl,
    string GameMode,
    string? Difficulty
);
