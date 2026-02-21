import 'package:international_draughts/core/constants/api_endpoints.dart';
import 'package:international_draughts/core/errors/error_handler.dart';
import 'package:international_draughts/core/errors/result.dart';
import 'package:international_draughts/core/network/api_client.dart';

/// Repository for game state persistence.
///
/// Handles saving and loading game state to/from the backend API.
class GamePersistenceRepository {
  /// Creates a [GamePersistenceRepository].
  const GamePersistenceRepository({required ApiClient apiClient})
      : _apiClient = apiClient;

  final ApiClient _apiClient;

  /// Saves the current game state for the given [userId].
  Future<Result<void>> saveGame({
    required String userId,
    required Map<String, dynamic> gameData,
  }) async {
    try {
      await _apiClient.put(
        '${ApiEndpoints.savedGame}/$userId',
        data: gameData,
      );
      return const Result.success(null);
    } catch (e, st) {
      return Result.failure(ErrorHandler.handle(e, st));
    }
  }

  /// Loads the saved game state for the given [userId].
  Future<Result<Map<String, dynamic>?>> loadGame({
    required String userId,
  }) async {
    try {
      final response = await _apiClient.get<Map<String, dynamic>>(
        '${ApiEndpoints.savedGame}/$userId',
      );
      return Result.success(response.data);
    } catch (e, st) {
      return Result.failure(ErrorHandler.handle(e, st));
    }
  }

  /// Deletes the saved game for the given [userId].
  Future<Result<void>> deleteGame({required String userId}) async {
    try {
      await _apiClient.delete('${ApiEndpoints.savedGame}/$userId');
      return const Result.success(null);
    } catch (e, st) {
      return Result.failure(ErrorHandler.handle(e, st));
    }
  }
}
