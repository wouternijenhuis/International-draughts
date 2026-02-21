import 'package:draughts_engine/draughts_engine.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/game_phase.dart';
import '../../domain/move_record.dart';

/// Manages the game lifecycle state machine.
///
/// Controls transitions between [NotStarted], [InProgress], and
/// game-over states ([WhiteWins], [BlackWins], [DrawResult]).
///
/// All game rules are delegated to the draughts engine — this provider
/// never implements manual rule logic.
///
/// Dependencies: none (leaf provider).
/// Dependants: aiProvider, clockProvider, gamePersistenceProvider.
class GameNotifier extends StateNotifier<AppGamePhase> {
  /// Creates a [GameNotifier].
  GameNotifier(this._ref) : super(const NotStarted());

  // ignore: unused_field
  final Ref _ref;

  /// Preserved game config — set once per game, survives game-over
  /// transitions so undo/redo can restore the correct config.
  GameConfig? _preservedConfig;

  /// Stack of [GameState] snapshots for undo/redo support.
  final List<GameState> _stateHistory = [];

  /// Current index into [_stateHistory] (for undo/redo).
  int _moveIndex = -1;

  /// Move records for display (paired with stateHistory, offset by 1).
  final List<MoveRecord> _moveRecords = [];

  /// Returns the current move index (for orchestration diffing).
  int get moveIndex => _moveIndex;

  /// Returns an unmodifiable copy of the move records.
  List<MoveRecord> get moveRecords => List.unmodifiable(
        _moveRecords.take(_moveIndex >= 0 ? _moveIndex : 0),
      );

  /// Human-readable move number (1-based, each number = White+Black pair).
  int get displayMoveNumber => (_moveIndex + 2) ~/ 2;

  // ── Lifecycle ──────────────────────────────────────────────────────

  /// Starts a new game with the given [config].
  void startGame(GameConfig config) {
    final initialState = createInitialGameState();

    _preservedConfig = config;

    _stateHistory
      ..clear()
      ..add(initialState);
    _moveRecords.clear();
    _moveIndex = 0;

    state = InProgress(
      gameState: initialState,
      config: config,
    );
  }

  /// Resets the game to [NotStarted].
  void reset() {
    _preservedConfig = null;
    _stateHistory.clear();
    _moveRecords.clear();
    _moveIndex = -1;
    state = const NotStarted();
  }

  // ── Move Input ─────────────────────────────────────────────────────

  /// Handles a square tap for piece selection and move execution.
  ///
  /// - If disambiguation is active and the tap is outside the
  ///   disambiguation squares, cancel disambiguation.
  /// - If no piece is selected and the tapped square has a friendly piece
  ///   with legal moves, select it.
  /// - If a piece is already selected and the tap is on a legal target,
  ///   execute the move (or enter disambiguation if ambiguous).
  /// - Otherwise deselect.
  void onSquareTap(int square) {
    final current = state;
    if (current is! InProgress) return;

    // If we are disambiguating, tapping elsewhere cancels it.
    if (current.isDisambiguating) {
      cancelDisambiguation();
      return;
    }

    final gs = current.gameState;
    if (gs.phase != GamePhase.inProgress) return;

    final legalMoves = generateLegalMoves(gs.board, gs.currentPlayer);
    if (legalMoves.isEmpty) return;

    // If a piece is selected, check if the tap is a legal destination.
    if (current.selectedSquare != null) {
      final allMatches = _findAllMovesForTarget(
        legalMoves,
        current.selectedSquare!,
        square,
      );

      if (allMatches.length == 1) {
        // Unique move — execute immediately.
        makeMove(allMatches.first);
        return;
      }

      if (allMatches.length > 1) {
        // Multiple capture paths share the same origin/destination.
        // Enter disambiguation mode so the player can choose.
        final captures = allMatches.whereType<CaptureMove>().toList();
        if (captures.length > 1) {
          state = InProgress(
            gameState: gs,
            config: current.config,
            selectedSquare: current.selectedSquare,
            legalMoveTargets: current.legalMoveTargets,
            ambiguousMoves: captures,
          );
          return;
        }
        // Fallback: just play the first match.
        makeMove(allMatches.first);
        return;
      }
    }

    // Select a new piece if the tapped square has a friendly piece.
    final piece = gs.board[square];
    if (piece != null && piece.color == gs.currentPlayer) {
      final movesFromSquare = legalMoves
          .where((m) => getMoveOrigin(m) == square)
          .toList();
      if (movesFromSquare.isNotEmpty) {
        final targets =
            movesFromSquare.map(getMoveDestination).toList();
        state = InProgress(
          gameState: gs,
          config: current.config,
          selectedSquare: square,
          legalMoveTargets: targets,
        );
        return;
      }
    }

    // Deselect.
    state = InProgress(
      gameState: gs,
      config: current.config,
    );
  }

  /// Returns **all** legal moves from [origin] to [target].
  ///
  /// When a king can reach the same destination by capturing different pieces
  /// along different zigzag paths, the engine reports them as distinct
  /// [CaptureMove]s. This helper collects every match so the caller can
  /// detect ambiguity and let the player choose (FMJD rule).
  List<Move> _findAllMovesForTarget(
    List<Move> legalMoves,
    int origin,
    int target,
  ) {
    return legalMoves
        .where(
          (m) =>
              getMoveOrigin(m) == origin && getMoveDestination(m) == target,
        )
        .toList();
  }

  // ── Disambiguation ────────────────────────────────────────────────

  /// Whether the player must choose between ambiguous capture paths.
  bool get isDisambiguating {
    final current = state;
    return current is InProgress && current.isDisambiguating;
  }

  /// Selects one of the ambiguous capture paths by [index] and executes it.
  ///
  /// The [index] corresponds to the position in
  /// [InProgress.ambiguousMoves].
  void selectCapturePathByIndex(int index) {
    final current = state;
    if (current is! InProgress) return;
    if (!current.isDisambiguating) return;
    if (index < 0 || index >= current.ambiguousMoves.length) return;

    makeMove(current.ambiguousMoves[index]);
  }

  /// Cancels disambiguation mode without executing a move.
  void cancelDisambiguation() {
    final current = state;
    if (current is! InProgress) return;

    state = InProgress(
      gameState: current.gameState,
      config: current.config,
    );
  }

  // ── Move Execution ────────────────────────────────────────────────

  /// Applies a [move] via the engine, updates history, checks game outcome.
  void makeMove(Move move) {
    final current = state;
    if (current is! InProgress) return;

    final gs = current.gameState;
    final result = applyMove(gs, move);
    if (!result.isValid) return;

    final newState = result.newState;

    // Haptic feedback based on move type.
    switch (move) {
      case CaptureMove():
        HapticFeedback.heavyImpact();
      case QuietMove():
        HapticFeedback.mediumImpact();
    }

    // Truncate future history on new move (discard redo branch).
    if (_moveIndex < _stateHistory.length - 1) {
      _stateHistory.removeRange(_moveIndex + 1, _stateHistory.length);
      _moveRecords.removeRange(_moveIndex, _moveRecords.length);
    }

    // Record the move.
    _stateHistory.add(newState);
    _moveIndex++;
    _moveRecords.add(MoveRecord(
      move: move,
      notation: formatMoveNotation(move),
      player: gs.currentPlayer,
      moveNumber: displayMoveNumber,
      timestamp: DateTime.now(),
    ),);

    // Transition state based on game outcome.
    _emitStateForGameState(newState, current.config);
  }

  /// Emits the appropriate [AppGamePhase] for the given engine [GameState].
  void _emitStateForGameState(GameState gs, GameConfig config) {
    // Haptic feedback on game end.
    if (gs.phase != GamePhase.inProgress) {
      HapticFeedback.vibrate();
    }

    switch (gs.phase) {
      case GamePhase.whiteWins:
        state = const WhiteWins(reason: 'Black has no legal moves');
      case GamePhase.blackWins:
        state = const BlackWins(reason: 'White has no legal moves');
      case GamePhase.draw:
        final reason = switch (gs.drawReason) {
          DrawReason.threefoldRepetition => 'Threefold repetition',
          DrawReason.twentyFiveMoveRule => '25-move rule',
          DrawReason.sixteenMoveRule => '16-move endgame rule',
          DrawReason.agreement => 'Draw by agreement',
          null => 'Draw',
        };
        state = DrawResult(reason: reason);
      case GamePhase.inProgress:
        state = InProgress(
          gameState: gs,
          config: config,
        );
    }
  }

  // ── Undo / Redo ───────────────────────────────────────────────────

  /// Whether undo is available.
  bool get canUndo => _moveIndex > 0;

  /// Whether redo is available.
  bool get canRedo => _moveIndex < _stateHistory.length - 1;

  /// Goes back one move (PvP) or two moves (vs AI, so it's the human's turn
  /// again). Cancels AI computation if running.
  void undoMove() {
    if (!canUndo) return;

    final config = _preservedConfig ?? const GameConfig(
      mode: 'vsAi',
      difficulty: 'medium',
      playerColor: PlayerColor.white,
    );

    final isVsAi = config.mode == 'vsAi';
    final steps = isVsAi && _moveIndex >= 2 ? 2 : 1;
    _moveIndex = (_moveIndex - steps).clamp(0, _stateHistory.length - 1);

    final gs = _stateHistory[_moveIndex];
    state = InProgress(
      gameState: gs,
      config: config,
    );
  }

  /// Goes forward one move. Re-checks game outcome.
  void redoMove() {
    if (!canRedo) return;

    final config = _preservedConfig ?? const GameConfig(
      mode: 'vsAi',
      difficulty: 'medium',
      playerColor: PlayerColor.white,
    );

    _moveIndex++;
    final gs = _stateHistory[_moveIndex];
    _emitStateForGameState(gs, config);
  }

  // ── Resign / Draw ────────────────────────────────────────────────

  /// Resigns the current game. The current player loses.
  void resign() {
    final current = state;
    if (current is! InProgress) return;

    final loser = current.gameState.currentPlayer;
    if (loser == PlayerColor.white) {
      state = const BlackWins(reason: 'White resigned');
    } else {
      state = const WhiteWins(reason: 'Black resigned');
    }
  }

  /// Offers a draw. In AI mode the draw is auto-accepted.
  void offerDraw() {
    final current = state;
    if (current is! InProgress) return;
    state = const DrawResult(reason: 'Draw by agreement');
  }

  /// Toggles the pause state. Pausing clears selection.
  void togglePause() {
    final current = state;
    if (current is! InProgress) return;
    // Pause is handled via clock provider / orchestration — here we
    // simply clear selection to prevent interaction while paused.
    state = InProgress(
      gameState: current.gameState,
      config: current.config,
    );
  }
}

/// Provider for the game phase state.
///
/// Dependency graph:
/// - gameProvider (this) <- aiProvider, clockProvider, gamePersistenceProvider
final gameProvider =
    StateNotifierProvider<GameNotifier, AppGamePhase>((ref) {
  return GameNotifier(ref);
});
