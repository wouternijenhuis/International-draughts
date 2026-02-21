import 'package:flutter/material.dart';

import 'package:international_draughts/core/theme/design_tokens.dart';

/// Low-time warning threshold in milliseconds.
const int _lowTimeThresholdMs = 30 * 1000;

/// Threshold below which tenths of seconds are displayed.
const int _showTenthsThresholdMs = 10 * 1000;

/// Chess-style clock widget for timed games.
///
/// Displays remaining time for both players with the active player
/// highlighted. Features active clock scaling, low-time red warning,
/// and sub-10s tenths display. Wrapped in [RepaintBoundary] to isolate
/// repaints from the board.
class ChessClock extends StatelessWidget {
  /// Creates a [ChessClock] widget.
  const ChessClock({
    required this.whiteTimeMs, required this.blackTimeMs, required this.activeColor, required this.isRunning, super.key,
    this.flipped = false,
  });

  /// White's remaining time in milliseconds.
  final int whiteTimeMs;

  /// Black's remaining time in milliseconds.
  final int blackTimeMs;

  /// Which player's clock is active ('white' or 'black').
  final String activeColor;

  /// Whether the clock is currently running.
  final bool isRunning;

  /// Whether the board is flipped (black at bottom).
  final bool flipped;

  @override
  Widget build(BuildContext context) {
    // Top clock = opponent, bottom clock = player (based on orientation).
    final topLabel = flipped ? 'White' : 'Black';
    final topTimeMs = flipped ? whiteTimeMs : blackTimeMs;
    final topActive =
        (flipped ? 'white' : 'black') == activeColor && isRunning;

    final bottomLabel = flipped ? 'Black' : 'White';
    final bottomTimeMs = flipped ? blackTimeMs : whiteTimeMs;
    final bottomActive =
        (flipped ? 'black' : 'white') == activeColor && isRunning;

    return RepaintBoundary(
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: DesignTokens.spacingMd,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _ClockFace(
              label: topLabel,
              timeMs: topTimeMs,
              isActive: topActive,
            ),
            _ClockFace(
              label: bottomLabel,
              timeMs: bottomTimeMs,
              isActive: bottomActive,
            ),
          ],
        ),
      ),
    );
  }
}

/// Individual clock face with scale animation and low-time warning.
class _ClockFace extends StatelessWidget {
  const _ClockFace({
    required this.label,
    required this.timeMs,
    required this.isActive,
  });

  final String label;
  final int timeMs;
  final bool isActive;

  @override
  Widget build(BuildContext context) {
    final isLowTime = timeMs > 0 && timeMs <= _lowTimeThresholdMs;
    final showTenths = timeMs < _showTenthsThresholdMs;
    final timeString = _formatClockTime(timeMs, showTenths);

    final textColor = timeMs <= 0
        ? Colors.red.shade900
        : isLowTime
            ? Colors.red
            : null;

    return Semantics(
      label: '$label clock: $timeString remaining',
      child: AnimatedScale(
        scale: isActive ? 1.05 : 1.0,
        duration: const Duration(milliseconds: 200),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(
            horizontal: DesignTokens.spacingMd,
            vertical: DesignTokens.spacingSm,
          ),
          decoration: BoxDecoration(
            color: isActive
                ? Theme.of(context).colorScheme.primaryContainer
                : Theme.of(context).colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(DesignTokens.radiusMd),
            border: isActive
                ? Border.all(
                    color: Colors.green,
                    width: 2,
                  )
                : null,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: Theme.of(context).textTheme.labelSmall,
              ),
              _AnimatedTimeText(
                timeString: timeString,
                textColor: textColor,
                isLowTime: isLowTime && isActive,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Animated time text that pulses when in low-time warning.
class _AnimatedTimeText extends StatefulWidget {
  const _AnimatedTimeText({
    required this.timeString,
    required this.isLowTime, this.textColor,
  });

  final String timeString;
  final Color? textColor;
  final bool isLowTime;

  @override
  State<_AnimatedTimeText> createState() => _AnimatedTimeTextState();
}

class _AnimatedTimeTextState extends State<_AnimatedTimeText>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _pulseAnimation = Tween<double>(begin: 1.0, end: 0.5).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    if (widget.isLowTime) {
      _pulseController.repeat(reverse: true);
    }
  }

  @override
  void didUpdateWidget(_AnimatedTimeText oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isLowTime && !_pulseController.isAnimating) {
      _pulseController.repeat(reverse: true);
    } else if (!widget.isLowTime && _pulseController.isAnimating) {
      _pulseController.stop();
      _pulseController.value = 0.0;
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.isLowTime) {
      return Text(
        widget.timeString,
        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontFeatures: const [FontFeature.tabularFigures()],
              color: widget.textColor,
            ),
      );
    }

    return AnimatedBuilder(
      animation: _pulseAnimation,
      builder: (context, child) {
        return Opacity(
          opacity: _pulseAnimation.value,
          child: child,
        );
      },
      child: Text(
        widget.timeString,
        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontFeatures: const [FontFeature.tabularFigures()],
              color: widget.textColor,
              fontWeight: FontWeight.bold,
            ),
      ),
    );
  }
}

/// Formats time in milliseconds for clock display.
///
/// MM:SS when >= 10s, SS.t (with tenths) when < 10s.
String _formatClockTime(int timeMs, bool showTenths) {
  if (timeMs <= 0) return '0:00';

  final totalSeconds = timeMs ~/ 1000;

  if (!showTenths || totalSeconds >= 10) {
    final minutes = totalSeconds ~/ 60;
    final seconds = totalSeconds % 60;
    return '$minutes:${seconds.toString().padLeft(2, '0')}';
  }

  // Less than 10 seconds: show tenths.
  final seconds = timeMs ~/ 1000;
  final tenths = (timeMs % 1000) ~/ 100;
  return '$seconds.$tenths';
}
