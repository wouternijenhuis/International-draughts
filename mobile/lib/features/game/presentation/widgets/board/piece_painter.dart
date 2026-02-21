import 'package:flutter/material.dart';

/// Custom painter for rendering a draughts piece.
///
/// Paints a circular piece with radial gradient, border ring,
/// and optional king crown indicator.
class PiecePainter extends CustomPainter {
  /// Creates a [PiecePainter].
  const PiecePainter({
    required this.isWhite,
    required this.isKing,
    this.isSelected = false,
  });

  /// Whether this is a white piece.
  final bool isWhite;

  /// Whether this piece is a king.
  final bool isKing;

  /// Whether the piece is currently selected.
  final bool isSelected;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width * 0.4;

    // Shadow.
    final shadowPaint = Paint()
      ..color = Colors.black.withValues(alpha: 0.3)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 3);
    canvas.drawCircle(center + const Offset(1, 2), radius, shadowPaint);

    // Piece body with radial gradient.
    final gradientColors = isWhite
        ? [const Color(0xFFFFFFF0), const Color(0xFFD4D4D4)]
        : [const Color(0xFF4A4A4A), const Color(0xFF1A1A1A)];
    final bodyPaint = Paint()
      ..shader = RadialGradient(
        center: const Alignment(-0.3, -0.3),
        radius: 1.0,
        colors: gradientColors,
      ).createShader(Rect.fromCircle(center: center, radius: radius));
    canvas.drawCircle(center, radius, bodyPaint);

    // Border ring.
    final borderPaint = Paint()
      ..color = isWhite ? const Color(0xFFBBBBBB) : const Color(0xFF555555)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;
    canvas.drawCircle(center, radius, borderPaint);

    // Inner ring (decorative).
    final innerRingPaint = Paint()
      ..color = (isWhite ? const Color(0xFFCCCCCC) : const Color(0xFF444444))
          .withValues(alpha: 0.5)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    canvas.drawCircle(center, radius * 0.75, innerRingPaint);

    // King crown.
    if (isKing) {
      final crownPaint = Paint()
        ..color = isWhite ? const Color(0xFFDAA520) : const Color(0xFFFFD700);
      canvas.drawCircle(center, radius * 0.3, crownPaint);

      // Crown border.
      final crownBorderPaint = Paint()
        ..color = const Color(0xFFB8860B)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1;
      canvas.drawCircle(center, radius * 0.3, crownBorderPaint);
    }

    // Selection glow.
    if (isSelected) {
      final glowPaint = Paint()
        ..color = Colors.yellow.withValues(alpha: 0.4)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6);
      canvas.drawCircle(center, radius + 3, glowPaint);
    }
  }

  @override
  bool shouldRepaint(covariant PiecePainter oldDelegate) {
    return oldDelegate.isWhite != isWhite ||
        oldDelegate.isKing != isKing ||
        oldDelegate.isSelected != isSelected;
  }
}
