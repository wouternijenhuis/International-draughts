namespace InternationalDraughts.Application.DTOs.AppConfig;

public record AppConfigResponse(
    string MinimumVersion,
    string LatestVersion,
    string UpdateUrl,
    bool MaintenanceMode,
    string? MaintenanceMessage);
