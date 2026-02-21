import 'dart:developer' as developer;
import 'dart:isolate';

import 'package:dio/dio.dart';
import 'package:draughts_engine/draughts_engine.dart';

import 'package:international_draughts/core/constants/api_endpoints.dart';
import 'package:international_draughts/core/network/api_client.dart';
import 'board_rotation.dart';

/// Parameters passed to the AI isolate.
class _AiParams {
  const _AiParams({
    required this.board,
    required this.player,
    required this.config,
  });

  final List<Piece?> board;
  final PlayerColor player;
  final DifficultyConfig config;
}

/// Service for running AI move computation in a background isolate.
///
/// Supports both local AI (Easy/Medium/Hard via isolate) and Expert AI
/// via the backend API endpoint.
class AiService {
  /// Optional API client for Expert AI calls.
  ApiClient? apiClient;

  /// Finds the best move for the given [player] on [board].
  ///
  /// Runs the engine's alpha-beta search inside an isolate.
  /// Returns the best [Move], or `null` if no legal moves are available.
  Future<Move?> findBestMoveForPosition({
    required BoardPosition board,
    required PlayerColor player,
    required DifficultyConfig config,
  }) async {
    // Copy the board into a plain list so it can be sent to the isolate.
    final boardCopy = List<Piece?>.of(board);

    final result = await Isolate.run(() {
      final params = _AiParams(
        board: boardCopy,
        player: player,
        config: config,
      );
      final searchResult = findBestMove(
        params.board,
        params.player,
        params.config,
      );
      return searchResult?.move;
    });

    return result;
  }

  /// Finds the best move via the Expert AI backend API.
  ///
  /// Rotates the board position to FMJD standard orientation for the
  /// backend, then rotates the returned move back. Falls back to
  /// local Hard AI if the API call fails.
  ///
  /// Returns a record of (move, usedFallback) to indicate if fallback
  /// was used.
  Future<({Move? move, bool usedFallback})> findExpertMove({
    required BoardPosition board,
    required PlayerColor player,
  }) async {
    if (apiClient == null) {
      developer.log(
        'No API client configured, falling back to Hard AI',
        name: 'AiService',
      );
      return _fallbackToHard(board, player);
    }

    try {
      // Build position array for the API.
      // The backend expects FMJD standard orientation.
      // Our internal representation may be mirrored, so rotate at boundary.
      final apiPosition = <Map<String, dynamic>>[];
      for (var sq = 1; sq <= 50; sq++) {
        final piece = board[sq];
        if (piece != null) {
          final rotatedSq = rotateSquare(sq);
          apiPosition.add({
            'square': rotatedSq,
            'type': piece.type == PieceType.king ? 'king' : 'man',
            'color': piece.color == PlayerColor.white ? 'white' : 'black',
          });
        }
      }

      final response = await apiClient!.post<Map<String, dynamic>>(
        ApiEndpoints.aiMove,
        data: {
          'position': apiPosition,
          'currentPlayer': player == PlayerColor.white ? 'white' : 'black',
        },
        options: Options(
          sendTimeout: const Duration(seconds: 15),
          receiveTimeout: const Duration(seconds: 15),
        ),
      );

      final data = response.data;
      if (data == null) {
        return _fallbackToHard(board, player);
      }

      final move = _parseApiMove(data);
      if (move == null) {
        return _fallbackToHard(board, player);
      }

      // Rotate the move back from FMJD standard to our internal coords.
      final rotatedMove = rotateMove(move);
      return (move: rotatedMove, usedFallback: false);
    } on DioException catch (e) {
      developer.log(
        'Expert AI API call failed: ${e.message}',
        error: e,
        name: 'AiService',
      );
      return _fallbackToHard(board, player);
    } catch (e, st) {
      developer.log(
        'Expert AI unexpected error',
        error: e,
        stackTrace: st,
        name: 'AiService',
      );
      return _fallbackToHard(board, player);
    }
  }

  /// Falls back to local Hard AI for this move.
  Future<({Move? move, bool usedFallback})> _fallbackToHard(
    BoardPosition board,
    PlayerColor player,
  ) async {
    final hardConfig = getDifficultyConfig('hard') ?? difficultyConfigs['hard']!;
    final move = await findBestMoveForPosition(
      board: board,
      player: player,
      config: hardConfig,
    );
    return (move: move, usedFallback: true);
  }

  /// Parses the API response move into a [Move].
  Move? _parseApiMove(Map<String, dynamic> data) {
    try {
      final moveData = data['move'] as Map<String, dynamic>?;
      if (moveData == null) return null;

      final from = moveData['from'] as int?;
      final to = moveData['to'] as int?;
      final captured = moveData['captured'] as List<dynamic>?;

      if (from == null || to == null) return null;

      if (captured != null && captured.isNotEmpty) {
        // Parse as capture move.
        final steps = <CaptureStep>[];
        final path = moveData['path'] as List<dynamic>?;

        if (path != null && path.length >= 2) {
          // Multi-step capture with intermediate squares.
          for (var i = 0; i < path.length - 1; i++) {
            final stepFrom = path[i] as int;
            final stepTo = path[i + 1] as int;
            final capturedSq =
                i < captured.length ? captured[i] as int : captured.last as int;
            steps.add(CaptureStep(
              from: stepFrom,
              to: stepTo,
              captured: capturedSq,
            ),);
          }
        } else {
          // Single capture.
          steps.add(CaptureStep(
            from: from,
            to: to,
            captured: captured.first as int,
          ),);
        }
        return CaptureMove(steps: steps);
      }

      return QuietMove(from: from, to: to);
    } catch (e) {
      developer.log(
        'Failed to parse API move: $e',
        name: 'AiService',
      );
      return null;
    }
  }
}
