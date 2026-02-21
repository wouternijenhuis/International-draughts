/// State for the learning mode tutorial.
class LearningState {
  /// Creates a [LearningState].
  const LearningState({
    required this.currentStep,
    required this.totalSteps,
    this.stepCompleted = false,
    this.showHint = false,
    this.completedSteps = const {},
    this.selectedSquare,
    this.legalMoveTargets = const [],
    this.feedbackMessage,
    this.feedbackType,
  });

  /// Current step index (0-based).
  final int currentStep;

  /// Total number of tutorial steps.
  final int totalSteps;

  /// Whether the current step has been completed.
  final bool stepCompleted;

  /// Whether a hint is currently shown.
  final bool showHint;

  /// Set of completed step indices.
  final Set<int> completedSteps;

  /// Currently selected square on the learning board, if any.
  final int? selectedSquare;

  /// Legal move target squares for the selected piece.
  final List<int> legalMoveTargets;

  /// Feedback message to display, if any.
  final String? feedbackMessage;

  /// Feedback type: 'success', 'error', or 'neutral'.
  final String? feedbackType;

  /// Progress as a value from 0.0 to 1.0.
  double get progress =>
      totalSteps > 0 ? completedSteps.length / totalSteps : 0.0;

  /// Creates a copy with the given fields replaced.
  LearningState copyWith({
    int? currentStep,
    int? totalSteps,
    bool? stepCompleted,
    bool? showHint,
    Set<int>? completedSteps,
    int? Function()? selectedSquare,
    List<int>? legalMoveTargets,
    String? Function()? feedbackMessage,
    String? Function()? feedbackType,
  }) {
    return LearningState(
      currentStep: currentStep ?? this.currentStep,
      totalSteps: totalSteps ?? this.totalSteps,
      stepCompleted: stepCompleted ?? this.stepCompleted,
      showHint: showHint ?? this.showHint,
      completedSteps: completedSteps ?? this.completedSteps,
      selectedSquare:
          selectedSquare != null ? selectedSquare() : this.selectedSquare,
      legalMoveTargets: legalMoveTargets ?? this.legalMoveTargets,
      feedbackMessage:
          feedbackMessage != null ? feedbackMessage() : this.feedbackMessage,
      feedbackType:
          feedbackType != null ? feedbackType() : this.feedbackType,
    );
  }
}
