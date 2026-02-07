namespace InternationalDraughts.Application.Common.Interfaces;

/// <summary>
/// Placeholder interface for date/time abstraction.
/// Implement in Infrastructure layer.
/// </summary>
public interface IDateTimeProvider
{
    DateTime UtcNow { get; }
}
