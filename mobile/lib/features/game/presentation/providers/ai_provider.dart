import 'dart:developer' as developer;

import 'package:draughts_engine/draughts_engine.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:international_draughts/core/di/providers.dart';
import '../../data/ai_service.dart';
import '../../domain/game_phase.dart';
import 'game_provider.dart';

/// State for AI computation.
class AiState {
  /// Creates an [AiState].
  const AiState({
    required this.isThinking,
    required this.currentGeneration,
    this.usedFallback = false,
  });

  /// Whether the AI is currently computing a move.
  final bool isThinking;

  /// Generation counter for stale-result cancellation.
  final int currentGeneration;

  /// Whether the last Expert AI call fell back to local Hard AI.
  final bool usedFallback;

  /// Creates a copy with the given fields replaced.
  AiState copyWith({
    bool? isThinking,
    int? currentGeneration,
    bool? usedFallback,
  }) {
    return AiState(
      isThinking: isThinking ?? this.isThinking,
      currentGeneration: currentGeneration ?? this.currentGeneration,
      usedFallback: usedFallback ?? this.usedFallback,
    );
  }
}

/// Manages AI move computation.
///
/// Uses a generation counter for stale result cancellation and
/// [AiService] to run the engine search in a background isolate.
/// For Expert difficulty, calls the backend API with fallback to Hard.
///
/// Dependencies: gameProvider (triggers AI after human move).
class AiNotifier extends StateNotifier<AiState> {
  /// Creates an [AiNotifier].
  AiNotifier(this._ref)
      : _aiService = AiService(),
        super(const AiState(isThinking: false, currentGeneration: 0)) {
    // Inject API client for Expert AI.
    try {
      _aiService.apiClient = _ref.read(apiClientProvider);
    } catch (_) {
      // API client may not be available in tests.
    }
  }

  final Ref _ref;
  final AiService _aiService;
  int _aiGeneration = 0;

  /// Minimum visual delay (ms) so the AI move doesn't feel instant.
  static const int _minDelayMs = 150;

  /// Triggers AI move computation for the current board position.
  ///
  /// Stale results are discarded via the generation counter.
  /// For Expert difficulty, attempts the backend API with fallback.
  Future<void> triggerAiMove() async {
    final gen = ++_aiGeneration;
    state = AiState(
      isThinking: true,
      currentGeneration: gen,
    );

    try {
      final phase = _ref.read(gameProvider);
      if (phase is! InProgress) return;

      final gs = phase.gameState;
      final config = phase.config;
      final timer = Stopwatch()..start();

      Move? move;
      var usedFallback = false;

      if (config.difficulty == 'expert') {
        // Expert AI via backend API.
        final result = await _aiService.findExpertMove(
          board: gs.board,
          player: gs.currentPlayer,
        );
        move = result.move;
        usedFallback = result.usedFallback;
      } else {
        // Local AI.
        final difficultyConfig = getDifficultyConfig(config.difficulty) ??
            difficultyConfigs['medium']!;
        move = await _aiService.findBestMoveForPosition(
          board: gs.board,
          player: gs.currentPlayer,
          config: difficultyConfig,
        );
      }

      // Discard stale results.
      if (gen != _aiGeneration || !mounted) return;

      if (move == null) {
        // No legal moves — game should already be over.
        return;
      }

      // Enforce minimum visual delay for smooth UX.
      final elapsed = timer.elapsedMilliseconds;
      if (elapsed < _minDelayMs) {
        await Future<void>.delayed(
          Duration(milliseconds: _minDelayMs - elapsed),
        );
      }

      if (gen != _aiGeneration || !mounted) return;

      // Update state to reflect fallback usage (for SnackBar notification).
      if (usedFallback) {
        state = state.copyWith(usedFallback: true);
      }

      // Execute the AI's move.
      _ref.read(gameProvider.notifier).makeMove(move);
    } catch (e, st) {
      developer.log(
        'AI move error',
        error: e,
        stackTrace: st,
        name: 'AiNotifier',
      );

      if (gen != _aiGeneration || !mounted) return;

      // Retry once with a fresh state snapshot.
      await _retryOnce(gen);
    } finally {
      if (gen == _aiGeneration && mounted) {
        state = state.copyWith(isThinking: false);
      }
    }
  }

  /// Retries AI calculation once after an error.
  Future<void> _retryOnce(int originalGen) async {
    try {
      final phase = _ref.read(gameProvider);
      if (phase is! InProgress) return;

      final gs = phase.gameState;
      final config = phase.config;

      Move? move;

      if (config.difficulty == 'expert') {
        final result = await _aiService.findExpertMove(
          board: gs.board,
          player: gs.currentPlayer,
        );
        move = result.move;
      } else {
        final difficultyConfig = getDifficultyConfig(config.difficulty) ??
            difficultyConfigs['medium']!;
        move = await _aiService.findBestMoveForPosition(
          board: gs.board,
          player: gs.currentPlayer,
          config: difficultyConfig,
        );
      }

      if (originalGen != _aiGeneration || !mounted) return;
      if (move == null) return;

      _ref.read(gameProvider.notifier).makeMove(move);
    } catch (e, st) {
      developer.log(
        'AI retry also failed',
        error: e,
        stackTrace: st,
        name: 'AiNotifier',
      );
    }
  }

  /// Cancels any pending AI computation.
  void cancel() {
    _aiGeneration++;
    if (mounted) {
      state = state.copyWith(isThinking: false);
    }
  }
}

/// Provider for the AI computation state.
///
/// Dependency graph:
/// - aiProvider (this) <- gameOrchestrationProvider
/// - Depends on: gameProvider (to execute computed moves).
final aiProvider = StateNotifierProvider<AiNotifier, AiState>((ref) {
  return AiNotifier(ref);
});
