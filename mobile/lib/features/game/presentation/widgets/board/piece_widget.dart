import 'package:flutter/material.dart';

import 'piece_painter.dart';

/// Widget that renders a single draughts piece using [PiecePainter].
///
/// Supports optional selection highlight and implicit size animation.
class PieceWidget extends StatelessWidget {
  /// Creates a [PieceWidget].
  const PieceWidget({
    required this.isWhite, required this.isKing, required this.size, super.key,
    this.isSelected = false,
  });

  /// Whether this is a white piece.
  final bool isWhite;

  /// Whether this piece is a king.
  final bool isKing;

  /// The diameter of the piece.
  final double size;

  /// Whether this piece is currently selected.
  final bool isSelected;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: PiecePainter(
          isWhite: isWhite,
          isKing: isKing,
          isSelected: isSelected,
        ),
      ),
    );
  }
}
