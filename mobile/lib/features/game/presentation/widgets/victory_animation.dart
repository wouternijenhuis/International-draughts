import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

/// Victory animation showing bouncing pieces falling from the top.
///
/// Uses a [CustomPainter] with a [Ticker]-based physics simulation for
/// gravity, bounce, and fade effects. Pieces match the winner's color.
///
/// Duration: 8 seconds total, fade-out starts at 6s. Dismissible on tap.
/// Target: 60fps via [Ticker].
class VictoryAnimation extends StatefulWidget {
  /// Creates a [VictoryAnimation].
  const VictoryAnimation({
    required this.isWhiteWinner, super.key,
    this.onDismiss,
  });

  /// Whether white won (true = amber pieces, false = gray pieces).
  final bool isWhiteWinner;

  /// Called when the animation is dismissed (tap or completion).
  final VoidCallback? onDismiss;

  @override
  State<VictoryAnimation> createState() => _VictoryAnimationState();
}

class _VictoryAnimationState extends State<VictoryAnimation>
    with SingleTickerProviderStateMixin {
  late Ticker _ticker;
  final List<_FallingPiece> _pieces = [];
  final Random _random = Random();
  double _elapsed = 0;
  double _opacity = 1.0;

  static const double _totalDuration = 8.0;
  static const double _fadeStart = 6.0;
  static const double _gravity = 600.0;
  static const double _bounceDecay = 0.6;
  static const int _pieceCount = 18;

  @override
  void initState() {
    super.initState();
    _ticker = createTicker(_onTick);
    _ticker.start();
  }

  void _onTick(Duration elapsed) {
    final dt = elapsed.inMicroseconds / 1e6;
    final prevElapsed = _elapsed;
    _elapsed = dt;

    if (_elapsed >= _totalDuration) {
      _ticker.stop();
      widget.onDismiss?.call();
      return;
    }

    // Fade out after _fadeStart seconds.
    if (_elapsed >= _fadeStart) {
      _opacity = 1.0 - ((_elapsed - _fadeStart) / (_totalDuration - _fadeStart));
      _opacity = _opacity.clamp(0.0, 1.0);
    }

    // Spawn pieces progressively.
    if (_pieces.length < _pieceCount && prevElapsed < _elapsed) {
      const spawnInterval = 2.0 / _pieceCount;
      final nextSpawnTime = _pieces.length * spawnInterval;
      if (_elapsed >= nextSpawnTime) {
        _spawnPiece();
      }
    }

    setState(() {});
  }

  void _spawnPiece() {
    _pieces.add(_FallingPiece(
      x: _random.nextDouble(),
      y: -0.05 - _random.nextDouble() * 0.1,
      velocityY: 50.0 + _random.nextDouble() * 100.0,
      velocityX: (_random.nextDouble() - 0.5) * 80.0,
      size: 20.0 + _random.nextDouble() * 16.0,
      spawnTime: _elapsed,
      trailAlpha: 0.3 + _random.nextDouble() * 0.3,
    ),);
  }

  @override
  void dispose() {
    _ticker.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        _ticker.stop();
        widget.onDismiss?.call();
      },
      behavior: HitTestBehavior.opaque,
      child: Opacity(
        opacity: _opacity,
        child: CustomPaint(
          size: Size.infinite,
          painter: _VictoryPainter(
            pieces: _pieces,
            elapsed: _elapsed,
            gravity: _gravity,
            bounceDecay: _bounceDecay,
            isWhiteWinner: widget.isWhiteWinner,
          ),
        ),
      ),
    );
  }
}

class _FallingPiece {
  _FallingPiece({
    required this.x,
    required this.y,
    required this.velocityY,
    required this.velocityX,
    required this.size,
    required this.spawnTime,
    required this.trailAlpha,
  });

  /// Horizontal position (0.0 to 1.0 fraction of width).
  double x;

  /// Vertical position (fraction of height, 0 = top).
  double y;

  /// Vertical velocity (pixels/sec).
  double velocityY;

  /// Horizontal velocity (pixels/sec).
  double velocityX;

  /// Piece diameter.
  double size;

  /// Time this piece was spawned.
  double spawnTime;

  /// Trail fade alpha.
  double trailAlpha;
}

class _VictoryPainter extends CustomPainter {
  _VictoryPainter({
    required this.pieces,
    required this.elapsed,
    required this.gravity,
    required this.bounceDecay,
    required this.isWhiteWinner,
  });

  final List<_FallingPiece> pieces;
  final double elapsed;
  final double gravity;
  final double bounceDecay;
  final bool isWhiteWinner;

  @override
  void paint(Canvas canvas, Size size) {
    for (final piece in pieces) {
      final dt = elapsed - piece.spawnTime;
      if (dt < 0) continue;

      // Physics simulation.
      var posY = piece.y * size.height + piece.velocityY * dt + 0.5 * gravity * dt * dt;
      var velY = piece.velocityY + gravity * dt;

      // Bounce off bottom.
      final bottomLimit = size.height - piece.size;
      var bounces = 0;
      while (posY > bottomLimit && bounces < 5) {
        posY = bottomLimit - (posY - bottomLimit) * bounceDecay;
        velY = -velY * bounceDecay;
        bounces++;
      }
      posY = posY.clamp(0.0, bottomLimit);

      final posX = (piece.x * size.width + piece.velocityX * dt)
          .clamp(0.0, size.width - piece.size);

      // Draw trail.
      final trailPaint = Paint()
        ..color = (isWhiteWinner ? Colors.amber : Colors.blueGrey)
            .withValues(alpha: piece.trailAlpha * 0.3)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4);
      canvas.drawCircle(
        Offset(posX + piece.size / 2, posY + piece.size / 2 - 6),
        piece.size / 2,
        trailPaint,
      );

      // Draw piece.
      final piecePaint = Paint()
        ..color = isWhiteWinner
            ? const Color(0xFFFFB300)
            : const Color(0xFF607D8B);

      final centerX = posX + piece.size / 2;
      final centerY = posY + piece.size / 2;
      final radius = piece.size / 2;

      // Outer circle.
      canvas.drawCircle(Offset(centerX, centerY), radius, piecePaint);

      // Inner highlight.
      final highlightPaint = Paint()
        ..color = (isWhiteWinner
                ? const Color(0xFFFFE082)
                : const Color(0xFF90A4AE))
            .withValues(alpha: 0.6);
      canvas.drawCircle(Offset(centerX, centerY), radius * 0.65, highlightPaint);

      // Rim.
      final rimPaint = Paint()
        ..color = (isWhiteWinner
                ? const Color(0xFFFF8F00)
                : const Color(0xFF455A64))
            .withValues(alpha: 0.4)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5;
      canvas.drawCircle(Offset(centerX, centerY), radius, rimPaint);
    }
  }

  @override
  bool shouldRepaint(_VictoryPainter oldDelegate) => true;
}
