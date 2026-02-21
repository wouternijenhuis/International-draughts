import 'package:draughts_engine/draughts_engine.dart' hide ClockState;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/game_phase.dart';
import 'ai_provider.dart';
import 'clock_provider.dart';
import 'game_persistence_provider.dart';
import 'game_provider.dart';

/// Orchestrates cross-provider side effects.
///
/// Uses `ref.listen` to coordinate between game, AI, clock, and
/// persistence providers without creating circular dependencies.
///
/// Side effects managed:
/// - AI move trigger after human move
/// - Clock switch on turn change
/// - Auto-save after each move
/// - Clock stop on game over
class GameOrchestrationNotifier extends StateNotifier<bool> {
  /// Creates a [GameOrchestrationNotifier].
  GameOrchestrationNotifier(this._ref) : super(true) {
    _setupListeners();
  }

  final Ref _ref;

  /// The previous move index — used to detect new moves.
  int _prevMoveIndex = -1;

  /// The previous game phase type — used to detect game-over transitions.
  Type? _prevPhaseType;

  void _setupListeners() {
    // Listen to gameProvider for move and phase changes.
    _ref.listen<AppGamePhase>(gameProvider, _onGamePhaseChanged);

    // Listen to clockProvider for time expiry.
    _ref.listen<ClockState?>(clockProvider, (previous, next) {
      if (next != null) {
        _onClockTick(next);
      }
    });
  }

  /// Handles changes in the game phase.
  void _onGamePhaseChanged(AppGamePhase? previous, AppGamePhase next) {
    switch (next) {
      case InProgress(:final gameState, :final config):
        final gameNotifier = _ref.read(gameProvider.notifier);
        final currentMoveIndex = gameNotifier.moveIndex;

        // Detect new move (moveIndex changed).
        if (currentMoveIndex != _prevMoveIndex && currentMoveIndex > 0) {
          _prevMoveIndex = currentMoveIndex;

          // Switch clock if timed.
          if (config.isTimed) {
            _ref.read(clockProvider.notifier).switchTurn();
          }

          // Auto-save.
          _ref.read(gamePersistenceProvider.notifier).saveGame();

          // If vs AI and it's now the AI's turn, trigger AI.
          if (config.mode == 'vsAi') {
            final aiColor = config.playerColor == PlayerColor.white
                ? PlayerColor.black
                : PlayerColor.white;
            if (gameState.currentPlayer == aiColor) {
              _ref.read(aiProvider.notifier).triggerAiMove();
            }
          }
        } else if (_prevMoveIndex == -1) {
          // Game just started.
          _prevMoveIndex = currentMoveIndex;

          // Start clock if timed.
          if (config.isTimed) {
            final clockConfig = ClockConfig(
              baseTimeMs: config.clockPresetSeconds * 1000,
              incrementMs: config.clockIncrementMs,
              format: config.clockFormat,
            );
            _ref.read(clockProvider.notifier).startFromConfig(
                  clockConfig,
                  'white',
                );
          }

          // If the human chose black, AI moves first.
          if (config.mode == 'vsAi' &&
              config.playerColor == PlayerColor.black) {
            _ref.read(aiProvider.notifier).triggerAiMove();
          }
        }

        _prevPhaseType = InProgress;

      case WhiteWins() || BlackWins() || DrawResult():
        if (_prevPhaseType == InProgress) {
          // Game just ended.
          _ref.read(clockProvider.notifier).stopClock();
          _ref.read(aiProvider.notifier).cancel();
          _ref.read(gamePersistenceProvider.notifier).clearSavedGame();
        }
        _prevPhaseType = next.runtimeType;

      case NotStarted():
        _prevMoveIndex = -1;
        _prevPhaseType = NotStarted;
    }
  }

  /// Handles clock tick — checks for time expiry.
  void _onClockTick(ClockState clock) {
    if (!clock.isRunning) return;

    if (clock.whiteTimeMs <= 0) {
      _ref.read(clockProvider.notifier).stopClock();
      // White ran out of time — Black wins.
      final current = _ref.read(gameProvider);
      if (current is InProgress) {
        // Directly transition to game over via resign-like mechanism.
        _ref.read(gameProvider.notifier).resign();
      }
    } else if (clock.blackTimeMs <= 0) {
      _ref.read(clockProvider.notifier).stopClock();
      final current = _ref.read(gameProvider);
      if (current is InProgress) {
        _ref.read(gameProvider.notifier).resign();
      }
    }
  }
}

/// Provider for game orchestration.
///
/// This is a coordinator provider — it manages side effects between
/// other providers via `ref.listen`. The boolean state indicates
/// whether orchestration is active.
///
/// Dependency graph:
/// - gameOrchestrationProvider (this)
/// - Listens to: gameProvider, clockProvider
/// - Triggers: aiProvider, clockProvider, gamePersistenceProvider
final gameOrchestrationProvider =
    StateNotifierProvider<GameOrchestrationNotifier, bool>((ref) {
  return GameOrchestrationNotifier(ref);
});
