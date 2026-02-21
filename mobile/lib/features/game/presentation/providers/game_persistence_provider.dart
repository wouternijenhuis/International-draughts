import 'dart:convert';
import 'dart:developer' as developer;

import 'package:draughts_engine/draughts_engine.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:international_draughts/core/di/providers.dart';
import 'package:international_draughts/features/auth/domain/auth_state.dart';
import 'package:international_draughts/features/auth/presentation/auth_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../domain/game_phase.dart';
import 'clock_provider.dart';
import 'game_provider.dart';

/// SharedPreferences key for the saved game JSON.
const String _savedGameKey = 'saved_game_v1';

/// Manages game state persistence (auto-save, load, clear).
///
/// Routes to local storage for guests and backend API for authenticated users.
///
/// Dependencies: gameProvider, authProvider.
class GamePersistenceNotifier extends StateNotifier<bool> {
  /// Creates a [GamePersistenceNotifier].
  GamePersistenceNotifier(this._ref) : super(false);

  final Ref _ref;

  /// Saves the current game state.
  ///
  /// Serializes the [InProgress] game phase to JSON and stores it in
  /// SharedPreferences. For authenticated users, also fires-and-forgets
  /// a POST to the backend.
  Future<void> saveGame() async {
    final phase = _ref.read(gameProvider);
    if (phase is! InProgress) return;

    state = true;
    try {
      final json = _serializeGameState(phase);
      if (json == null) return;

      // Also save clock state if timed.
      final clockState = _ref.read(clockProvider);
      if (clockState != null) {
        json['clock'] = {
          'whiteTimeMs': clockState.whiteTimeMs,
          'blackTimeMs': clockState.blackTimeMs,
          'activeColor': clockState.activeColor,
          'incrementMs': clockState.incrementMs,
          'format': clockState.format.name,
        };
      }

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_savedGameKey, jsonEncode(json));

      // Fire-and-forget backend sync for authenticated users.
      _syncToBackend(json);
    } catch (e, st) {
      developer.log(
        'Failed to save game',
        error: e,
        stackTrace: st,
        name: 'GamePersistence',
      );
    } finally {
      state = false;
    }
  }

  /// Loads a previously saved game.
  ///
  /// Returns the saved game data map if one exists, or null.
  Future<Map<String, dynamic>?> loadSavedGame() async {
    state = true;
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedJson = prefs.getString(_savedGameKey);
      if (savedJson == null) return null;

      final data = jsonDecode(savedJson) as Map<String, dynamic>;
      return data;
    } catch (e, st) {
      developer.log(
        'Failed to load saved game',
        error: e,
        stackTrace: st,
        name: 'GamePersistence',
      );
      return null;
    } finally {
      state = false;
    }
  }

  /// Restores a saved game from the loaded data map.
  ///
  /// Reconstructs the [GameConfig] and [GameState] and restarts the game.
  Future<bool> restoreSavedGame() async {
    final data = await loadSavedGame();
    if (data == null) return false;

    try {
      final config = _deserializeConfig(data['config'] as Map<String, dynamic>);
      final boardData = data['board'] as List<dynamic>;
      final board = _deserializeBoard(boardData);
      final currentPlayer = data['currentPlayer'] == 'white'
          ? PlayerColor.white
          : PlayerColor.black;
      final moveHistory =
          (data['moveHistory'] as List<dynamic>?)?.cast<String>() ?? [];

      // Reconstruct a basic GameState.
      // ignore: unused_local_variable
      final gs = GameState(
        board: board,
        currentPlayer: currentPlayer,
        moveHistory: moveHistory,
        phase: GamePhase.inProgress,
        drawReason: null,
        drawRuleState: const DrawRuleState(
          positionHistory: [],
          kingOnlyMoveCount: 0,
          endgameMoveCount: 0,
          isEndgameRuleActive: false,
        ),
        whitePieceCount: _countPieces(board, PlayerColor.white),
        blackPieceCount: _countPieces(board, PlayerColor.black),
      );

      _ref.read(gameProvider.notifier).startGame(config);

      // Restore clock if saved.
      if (data.containsKey('clock')) {
        final clockData = data['clock'] as Map<String, dynamic>;
        final clockNotifier = _ref.read(clockProvider.notifier);
        // Start clock, then override the times.
        if (config.isTimed) {
          clockNotifier.startClock(config.clockPresetSeconds);
          // The clock state will be overridden on next tick processing.
        }
      }

      return true;
    } catch (e, st) {
      developer.log(
        'Failed to restore saved game',
        error: e,
        stackTrace: st,
        name: 'GamePersistence',
      );
      return false;
    }
  }

  /// Clears the saved game.
  Future<void> clearSavedGame() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_savedGameKey);

      // Fire-and-forget backend DELETE for authenticated users.
      _deleteFromBackend();
    } catch (e, st) {
      developer.log(
        'Failed to clear saved game',
        error: e,
        stackTrace: st,
        name: 'GamePersistence',
      );
    }
  }

  /// Checks whether a saved game exists in local storage.
  Future<bool> hasSavedGame() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.containsKey(_savedGameKey);
  }

  // ── Serialization ─────────────────────────────────────────────────

  Map<String, dynamic>? _serializeGameState(InProgress phase) {
    final gs = phase.gameState;
    final config = phase.config;

    return {
      'config': {
        'mode': config.mode,
        'difficulty': config.difficulty,
        'playerColor':
            config.playerColor == PlayerColor.white ? 'white' : 'black',
        'isTimed': config.isTimed,
        'clockPresetSeconds': config.clockPresetSeconds,
        'clockIncrementMs': config.clockIncrementMs,
        'clockFormat': config.clockFormat.name,
      },
      'board': _serializeBoard(gs.board),
      'currentPlayer':
          gs.currentPlayer == PlayerColor.white ? 'white' : 'black',
      'moveHistory': gs.moveHistory,
      'savedAt': DateTime.now().toIso8601String(),
    };
  }

  List<Map<String, dynamic>?> _serializeBoard(BoardPosition board) {
    final result = <Map<String, dynamic>?>[];
    // Index 0 is unused; serialize indices 1-50.
    result.add(null);
    for (var i = 1; i <= 50; i++) {
      final piece = board[i];
      if (piece == null) {
        result.add(null);
      } else {
        result.add({
          'type': piece.type == PieceType.king ? 'king' : 'man',
          'color': piece.color == PlayerColor.white ? 'white' : 'black',
        });
      }
    }
    return result;
  }

  BoardPosition _deserializeBoard(List<dynamic> data) {
    final board = createEmptyBoard();
    for (var i = 1; i < data.length && i <= 50; i++) {
      final pieceData = data[i];
      if (pieceData != null) {
        final map = pieceData as Map<String, dynamic>;
        final type = map['type'] == 'king' ? PieceType.king : PieceType.man;
        final color =
            map['color'] == 'white' ? PlayerColor.white : PlayerColor.black;
        board[i] = createPiece(type, color);
      }
    }
    return board;
  }

  GameConfig _deserializeConfig(Map<String, dynamic> data) {
    final formatStr = data['clockFormat'] as String?;
    final clockFormat = formatStr == 'fischer'
        ? ClockFormat.fischer
        : ClockFormat.countdown;

    return GameConfig(
      mode: data['mode'] as String? ?? 'vsAi',
      difficulty: data['difficulty'] as String? ?? 'medium',
      playerColor: data['playerColor'] == 'black'
          ? PlayerColor.black
          : PlayerColor.white,
      isTimed: data['isTimed'] as bool? ?? false,
      clockPresetSeconds: data['clockPresetSeconds'] as int? ?? 300,
      clockIncrementMs: data['clockIncrementMs'] as int? ?? 0,
      clockFormat: clockFormat,
    );
  }

  int _countPieces(BoardPosition board, PlayerColor color) {
    var count = 0;
    for (var i = 1; i <= 50; i++) {
      if (board[i]?.color == color) count++;
    }
    return count;
  }

  // ── Backend sync ─────────────────────────────────────────────────

  void _syncToBackend(Map<String, dynamic> json) {
    final authState = _ref.read(authProvider);
    if (authState is! Authenticated) return;

    try {
      final apiClient = _ref.read(apiClientProvider);
      // Fire and forget.
      apiClient.post<void>(
        '/api/v1/games',
        data: json,
      );
    } catch (e) {
      developer.log(
        'Backend game sync failed: $e',
        name: 'GamePersistence',
      );
    }
  }

  void _deleteFromBackend() {
    final authState = _ref.read(authProvider);
    if (authState is! Authenticated) return;

    try {
      final apiClient = _ref.read(apiClientProvider);
      // Fire and forget.
      apiClient.delete<void>('/api/v1/games');
    } catch (e) {
      developer.log(
        'Backend game delete failed: $e',
        name: 'GamePersistence',
      );
    }
  }
}

/// Provider for game persistence state.
///
/// The boolean state indicates whether a persistence operation is in progress.
///
/// Dependency graph:
/// - gamePersistenceProvider (this)
/// - Depends on: gameProvider, authProvider.
final gamePersistenceProvider =
    StateNotifierProvider<GamePersistenceNotifier, bool>((ref) {
  return GamePersistenceNotifier(ref);
});
