import 'package:draughts_engine/draughts_engine.dart';

/// Utilities for rotating the board perspective.
///
/// When the human player plays as black, the board is rotated 180°
/// so their pieces appear at the bottom of the screen.

/// Rotates a square number to the opposite perspective.
///
/// FMJD squares are numbered 1-50. Rotation maps square `s` to `51 - s`.
int rotateSquare(int s) => 51 - s;

/// Rotates an entire board position to the opposite perspective.
///
/// Creates a new [BoardPosition] with all pieces mirrored.
BoardPosition rotatePosition(BoardPosition position) {
  final List<Piece?> rotated = List<Piece?>.filled(51, null);
  for (var i = 1; i <= 50; i++) {
    rotated[rotateSquare(i)] = position[i];
  }
  return rotated;
}

/// Rotates a [Move] to the opposite perspective.
///
/// Transforms all square references within the move.
Move rotateMove(Move move) {
  return switch (move) {
    QuietMove(:final from, :final to) => QuietMove(
        from: rotateSquare(from),
        to: rotateSquare(to),
      ),
    CaptureMove(:final steps) => CaptureMove(
        steps: steps
            .map(
              (step) => CaptureStep(
                from: rotateSquare(step.from),
                to: rotateSquare(step.to),
                captured: rotateSquare(step.captured),
              ),
            )
            .toList(),
      ),
  };
}
