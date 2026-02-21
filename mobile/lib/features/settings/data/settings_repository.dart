import 'package:international_draughts/core/constants/api_endpoints.dart';
import 'package:international_draughts/core/errors/error_handler.dart';
import 'package:international_draughts/core/errors/result.dart';
import 'package:international_draughts/core/network/api_client.dart';

/// Repository for syncing settings with the backend API.
///
/// Settings are always persisted locally via SharedPreferences first,
/// then optionally synced with the server for authenticated users.
class SettingsRepository {
  /// Creates a [SettingsRepository].
  const SettingsRepository({required ApiClient apiClient})
      : _apiClient = apiClient;

  final ApiClient _apiClient;

  /// Fetches settings from the server.
  Future<Result<Map<String, dynamic>>> fetchSettings() async {
    try {
      final response = await _apiClient.get<Map<String, dynamic>>(
        ApiEndpoints.settings,
      );
      return Result.success(response.data ?? {});
    } catch (e, st) {
      return Result.failure(ErrorHandler.handle(e, st));
    }
  }

  /// Saves settings to the server.
  Future<Result<void>> saveSettings(Map<String, dynamic> settings) async {
    try {
      await _apiClient.put(
        ApiEndpoints.settings,
        data: settings,
      );
      return const Result.success(null);
    } catch (e, st) {
      return Result.failure(ErrorHandler.handle(e, st));
    }
  }
}
