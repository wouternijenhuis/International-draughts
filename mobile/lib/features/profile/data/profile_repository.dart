import 'package:international_draughts/core/constants/api_endpoints.dart';
import 'package:international_draughts/core/errors/error_handler.dart';
import 'package:international_draughts/core/errors/result.dart';
import 'package:international_draughts/core/network/api_client.dart';

import '../domain/player_profile.dart';
import '../domain/player_stats.dart';

/// Repository for player profile and statistics operations.
///
/// Handles profile retrieval, stats, rating history, game history,
/// and profile update operations via the backend API.
class ProfileRepository {
  /// Creates a [ProfileRepository].
  const ProfileRepository({required ApiClient apiClient})
      : _apiClient = apiClient;

  final ApiClient _apiClient;

  /// Fetches the player profile for the given [userId].
  Future<Result<PlayerProfile>> getProfile(String userId) async {
    try {
      final response = await _apiClient.get<Map<String, dynamic>>(
        '${ApiEndpoints.playerProfile}/$userId',
      );
      return Result.success(
        PlayerProfile.fromJson(response.data!),
      );
    } catch (e, st) {
      return Result.failure(ErrorHandler.handle(e, st));
    }
  }

  /// Fetches the player stats for the given [userId].
  Future<Result<PlayerStats>> getStats(String userId) async {
    try {
      final response = await _apiClient.get<Map<String, dynamic>>(
        '${ApiEndpoints.playerStats}/$userId',
      );
      return Result.success(
        PlayerStats.fromJson(response.data!),
      );
    } catch (e, st) {
      return Result.failure(ErrorHandler.handle(e, st));
    }
  }

  /// Fetches the rating history for the given [userId].
  Future<Result<List<RatingHistoryEntry>>> getRatingHistory(
    String userId,
  ) async {
    try {
      final response = await _apiClient.get<List<dynamic>>(
        '${ApiEndpoints.ratingHistory}/$userId',
      );
      final entries = (response.data ?? [])
          .map((e) =>
              RatingHistoryEntry.fromJson(e as Map<String, dynamic>),)
          .toList();
      return Result.success(entries);
    } catch (e, st) {
      return Result.failure(ErrorHandler.handle(e, st));
    }
  }

  /// Fetches paginated game history for the given [userId].
  Future<Result<GameHistoryPage>> getGameHistory(
    String userId, {
    int page = 1,
    int pageSize = 20,
    String? result,
    String? difficulty,
    String? mode,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'page': page,
        'pageSize': pageSize,
      };
      if (result != null && result.isNotEmpty) {
        queryParams['result'] = result;
      }
      if (difficulty != null && difficulty.isNotEmpty) {
        queryParams['difficulty'] = difficulty;
      }
      if (mode != null && mode.isNotEmpty) {
        queryParams['mode'] = mode;
      }

      final response = await _apiClient.get<Map<String, dynamic>>(
        '${ApiEndpoints.gameHistory}/$userId',
        queryParameters: queryParams,
      );
      return Result.success(
        GameHistoryPage.fromJson(response.data!),
      );
    } catch (e, st) {
      return Result.failure(ErrorHandler.handle(e, st));
    }
  }

  /// Updates the player's display name.
  Future<Result<void>> updateDisplayName(
    String userId,
    String displayName,
  ) async {
    try {
      await _apiClient.patch<void>(
        '${ApiEndpoints.playerProfile}/$userId/display-name',
        data: {'displayName': displayName},
      );
      return const Result.success(null);
    } catch (e, st) {
      return Result.failure(ErrorHandler.handle(e, st));
    }
  }

  /// Updates the player's avatar emoji.
  Future<Result<void>> updateAvatar(String userId, String avatar) async {
    try {
      await _apiClient.patch<void>(
        '${ApiEndpoints.playerProfile}/$userId/avatar',
        data: {'avatar': avatar},
      );
      return const Result.success(null);
    } catch (e, st) {
      return Result.failure(ErrorHandler.handle(e, st));
    }
  }
}
