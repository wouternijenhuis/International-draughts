import 'package:flutter/material.dart';

import 'package:international_draughts/core/theme/board_theme.dart';

/// Custom painter for the draughts board grid.
///
/// Renders the 10x10 board with alternating light and dark squares,
/// plus overlays for selected square, legal move highlights, and
/// last-move highlighting.
class BoardPainter extends CustomPainter {
  /// Creates a [BoardPainter].
  const BoardPainter({
    required this.boardTheme,
    this.selectedSquare,
    this.legalMoveTargets = const [],
    this.lastMoveFrom,
    this.lastMoveTo,
    this.flipped = false,
  });

  /// The board theme to use for square colors.
  final BoardTheme boardTheme;

  /// Currently selected square (FMJD 1-50), if any.
  final int? selectedSquare;

  /// Squares that are valid move targets.
  final List<int> legalMoveTargets;

  /// Origin square of the last move, for highlighting.
  final int? lastMoveFrom;

  /// Destination square of the last move, for highlighting.
  final int? lastMoveTo;

  /// Whether the board is flipped (black at bottom).
  final bool flipped;

  @override
  void paint(Canvas canvas, Size size) {
    final squareSize = size.width / 10;
    final lightPaint = Paint()..color = boardTheme.lightSquare;
    final darkPaint = Paint()..color = boardTheme.darkSquare;
    final selectedPaint = Paint()..color = boardTheme.selectedColor;
    final highlightPaint = Paint()..color = boardTheme.highlightColor;
    final lastMovePaint = Paint()
      ..color = boardTheme.highlightColor.withValues(alpha: 0.35);

    // Pre-compute target set for O(1) lookup.
    final targetSet = <int>{...legalMoveTargets};

    for (var row = 0; row < 10; row++) {
      for (var col = 0; col < 10; col++) {
        final displayRow = flipped ? 9 - row : row;
        final displayCol = flipped ? 9 - col : col;
        final isDark = (displayRow + displayCol) % 2 == 1;
        final rect = Rect.fromLTWH(
          col * squareSize,
          row * squareSize,
          squareSize,
          squareSize,
        );
        canvas.drawRect(rect, isDark ? darkPaint : lightPaint);

        if (!isDark) continue;

        // Compute FMJD square number for this cell.
        final posInRow =
            displayRow % 2 == 0 ? (displayCol - 1) ~/ 2 : displayCol ~/ 2;
        final sq = displayRow * 5 + posInRow + 1;

        // Last move highlight.
        if (sq == lastMoveFrom || sq == lastMoveTo) {
          canvas.drawRect(rect, lastMovePaint);
        }

        // Selected square overlay.
        if (sq == selectedSquare) {
          canvas.drawRect(rect, selectedPaint);
        }

        // Legal move indicator (small circle).
        if (targetSet.contains(sq)) {
          canvas.drawCircle(
            rect.center,
            squareSize * 0.15,
            highlightPaint,
          );
        }
      }
    }
  }

  @override
  bool shouldRepaint(covariant BoardPainter oldDelegate) {
    return oldDelegate.boardTheme != boardTheme ||
        oldDelegate.selectedSquare != selectedSquare ||
        oldDelegate.legalMoveTargets != legalMoveTargets ||
        oldDelegate.lastMoveFrom != lastMoveFrom ||
        oldDelegate.lastMoveTo != lastMoveTo ||
        oldDelegate.flipped != flipped;
  }
}
