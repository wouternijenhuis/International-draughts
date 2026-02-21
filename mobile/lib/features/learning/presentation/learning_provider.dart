import 'dart:async';

import 'package:draughts_engine/draughts_engine.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../data/tutorial_steps.dart';
import '../domain/learning_state.dart';

/// SharedPreferences key for learning progress.
const String _learningProgressKey = 'learning_progress_v1';

/// Manages the learning mode tutorial state.
///
/// Actions: loadStep, onSquareTap, showHint, nextStep, prevStep, restart.
/// Move validation checks if the user's move matches the step's expected move(s).
class LearningNotifier extends StateNotifier<LearningState> {
  /// Creates a [LearningNotifier].
  LearningNotifier()
      : super(LearningState(
          currentStep: 0,
          totalSteps: tutorialSteps.length,
        ),) {
    _loadProgress();
    _loadStep(0);
  }

  /// The current working board (mutable copy of the step's board).
  late BoardPosition _currentBoard;

  /// Timer for auto-dismissing feedback messages.
  Timer? _feedbackTimer;

  /// Loads a tutorial step by index.
  void loadStep(int index) {
    if (index < 0 || index >= tutorialSteps.length) return;
    _loadStep(index);
  }

  void _loadStep(int index) {
    _feedbackTimer?.cancel();
    final step = tutorialSteps[index];
    _currentBoard = List<Piece?>.of(step.board);

    final isInfo = step.goalAction.type == TutorialGoalType.info;
    final completedSteps = Set<int>.of(state.completedSteps);

    // Auto-complete info steps.
    if (isInfo) {
      completedSteps.add(index);
    }

    state = state.copyWith(
      currentStep: index,
      stepCompleted: isInfo || completedSteps.contains(index),
      showHint: false,
      completedSteps: completedSteps,
      selectedSquare: () => null,
      legalMoveTargets: [],
      feedbackMessage: () => null,
      feedbackType: () => null,
    );
  }

  /// Returns the current working board position.
  BoardPosition get currentBoard => _currentBoard;

  /// Handles a square tap for piece selection and move execution.
  void onSquareTap(int square) {
    if (state.stepCompleted) return;

    final step = tutorialSteps[state.currentStep];
    if (step.goalAction.type == TutorialGoalType.info) return;

    final legalMoves = generateLegalMoves(_currentBoard, PlayerColor.white);
    if (legalMoves.isEmpty) return;

    // If a piece is selected, check if the tap is a legal destination.
    if (state.selectedSquare != null) {
      final move = _findMoveForTarget(
        legalMoves,
        state.selectedSquare!,
        square,
      );
      if (move != null) {
        _handleMove(move, step);
        return;
      }
    }

    // Select a piece if it has legal moves.
    final piece = _currentBoard[square];
    if (piece != null && piece.color == PlayerColor.white) {
      final movesFromSquare = legalMoves
          .where((m) => getMoveOrigin(m) == square)
          .toList();
      if (movesFromSquare.isNotEmpty) {
        final targets =
            movesFromSquare.map(getMoveDestination).toList();
        state = state.copyWith(
          selectedSquare: () => square,
          legalMoveTargets: targets,
          feedbackMessage: () => null,
          feedbackType: () => null,
        );
        return;
      }
    }

    // Deselect.
    state = state.copyWith(
      selectedSquare: () => null,
      legalMoveTargets: [],
    );
  }

  Move? _findMoveForTarget(List<Move> moves, int from, int to) {
    for (final m in moves) {
      if (getMoveOrigin(m) == from && getMoveDestination(m) == to) {
        return m;
      }
    }
    return null;
  }

  void _handleMove(Move move, TutorialStep step) {
    final goalMet = _checkGoalMet(move, step.goalAction);

    if (goalMet) {
      // Apply the move to the working board.
      final result = applyMoveToBoard(_currentBoard, move);
      _currentBoard = result;

      final completedSteps = Set<int>.of(state.completedSteps)
        ..add(state.currentStep);

      state = state.copyWith(
        stepCompleted: true,
        completedSteps: completedSteps,
        selectedSquare: () => null,
        legalMoveTargets: [],
        feedbackMessage: () => 'Correct! Well done!',
        feedbackType: () => 'success',
      );

      _saveProgress();
      _autoHideFeedback();
    } else {
      state = state.copyWith(
        selectedSquare: () => null,
        legalMoveTargets: [],
        feedbackMessage: () => 'Not quite — try again!',
        feedbackType: () => 'error',
      );

      _autoHideFeedback();
    }
  }

  bool _checkGoalMet(Move move, TutorialGoalAction goal) {
    switch (goal.type) {
      case TutorialGoalType.info:
        return true;
      case TutorialGoalType.anyMove:
        return true;
      case TutorialGoalType.move:
        if (goal.goalFrom != null && getMoveOrigin(move) != goal.goalFrom) {
          return false;
        }
        if (goal.goalTo != null && goal.goalTo!.isNotEmpty) {
          if (!goal.goalTo!.contains(getMoveDestination(move))) {
            return false;
          }
        }
        return true;
    }
  }

  /// Shows hints for the current step.
  void showHint() {
    state = state.copyWith(showHint: true);
  }

  /// Advances to the next step.
  void nextStep() {
    if (state.currentStep < tutorialSteps.length - 1) {
      _loadStep(state.currentStep + 1);
    }
  }

  /// Goes back to the previous step.
  void prevStep() {
    if (state.currentStep > 0) {
      _loadStep(state.currentStep - 1);
    }
  }

  /// Restarts the tutorial from the beginning.
  void restart() {
    state = LearningState(
      currentStep: 0,
      totalSteps: tutorialSteps.length,
    );
    _loadStep(0);
  }

  void _autoHideFeedback() {
    _feedbackTimer?.cancel();
    _feedbackTimer = Timer(const Duration(seconds: 3), () {
      if (mounted) {
        state = state.copyWith(
          feedbackMessage: () => null,
          feedbackType: () => null,
        );
      }
    });
  }

  // ── Persistence ────────────────────────────────────────────────────

  Future<void> _loadProgress() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final data = prefs.getStringList(_learningProgressKey);
      if (data != null && mounted) {
        final completed = data.map(int.tryParse).whereType<int>().toSet();
        state = state.copyWith(completedSteps: completed);
      }
    } catch (_) {
      // Ignore errors loading progress.
    }
  }

  Future<void> _saveProgress() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setStringList(
        _learningProgressKey,
        state.completedSteps.map((e) => e.toString()).toList(),
      );
    } catch (_) {
      // Ignore errors saving progress.
    }
  }

  @override
  void dispose() {
    _feedbackTimer?.cancel();
    super.dispose();
  }
}

/// Provider for the learning mode state.
final learningProvider =
    StateNotifierProvider<LearningNotifier, LearningState>((ref) {
  return LearningNotifier();
});
