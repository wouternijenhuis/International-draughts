import 'board.dart';

/// Base class for all legal moves.
sealed class Move {
  const Move();
}

/// A simple non-capture move from one square to another.
class QuietMove extends Move {
  /// Creates a quiet move from [from] to [to].
  const QuietMove({required this.from, required this.to});

  /// The starting square.
  final SquareNumber from;

  /// The destination square.
  final SquareNumber to;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is QuietMove && from == other.from && to == other.to;

  @override
  int get hashCode => Object.hash(from, to);

  @override
  String toString() => 'QuietMove($from-$to)';
}

/// A single capture step within a capture sequence.
class CaptureStep {
  /// Creates a capture step.
  const CaptureStep({
    required this.from,
    required this.to,
    required this.captured,
  });

  /// The starting square of this step.
  final SquareNumber from;

  /// The landing square of this step.
  final SquareNumber to;

  /// The square of the captured piece.
  final SquareNumber captured;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CaptureStep &&
          from == other.from &&
          to == other.to &&
          captured == other.captured;

  @override
  int get hashCode => Object.hash(from, to, captured);

  @override
  String toString() => 'CaptureStep($from→$to, captured: $captured)';
}

/// A capture sequence (may be a single capture or multi-jump).
class CaptureMove extends Move {
  /// Creates a capture move from the given [steps].
  const CaptureMove({required this.steps});

  /// The ordered list of capture steps.
  final List<CaptureStep> steps;

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    if (other is! CaptureMove) return false;
    if (steps.length != other.steps.length) return false;
    for (var i = 0; i < steps.length; i++) {
      if (steps[i] != other.steps[i]) return false;
    }
    return true;
  }

  @override
  int get hashCode => Object.hashAll(steps);

  @override
  String toString() => 'CaptureMove(${steps.length} steps)';
}

/// Create a quiet move.
QuietMove createQuietMove(SquareNumber from, SquareNumber to) =>
    QuietMove(from: from, to: to);

/// Create a capture move from steps.
CaptureMove createCaptureMove(List<CaptureStep> steps) =>
    CaptureMove(steps: List<CaptureStep>.unmodifiable(steps));

/// Get the starting square of a move.
SquareNumber getMoveOrigin(Move move) => switch (move) {
  QuietMove(:final from) => from,
  CaptureMove(:final steps) => steps[0].from,
};

/// Get the ending square of a move.
SquareNumber getMoveDestination(Move move) => switch (move) {
  QuietMove(:final to) => to,
  CaptureMove(:final steps) => steps[steps.length - 1].to,
};

/// Get all captured squares in a capture move.
List<SquareNumber> getCapturedSquares(CaptureMove move) =>
    move.steps.map((step) => step.captured).toList();
