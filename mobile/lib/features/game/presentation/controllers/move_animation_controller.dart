import 'package:draughts_engine/draughts_engine.dart';
import 'package:flutter/material.dart';

/// Speed settings for move animations.
enum AnimationSpeed {
  /// No animation (instant).
  instant(Duration.zero),

  /// Fast animation (100ms).
  fast(Duration(milliseconds: 100)),

  /// Normal animation (200ms).
  normal(Duration(milliseconds: 200)),

  /// Slow animation (400ms).
  slow(Duration(milliseconds: 400));

  const AnimationSpeed(this.duration);

  /// Duration of a single slide step.
  final Duration duration;
}

/// Describes a single piece slide from one square to another.
class SlideAnimation {
  /// Creates a [SlideAnimation].
  const SlideAnimation({
    required this.fromSquare,
    required this.toSquare,
    required this.piece,
  });

  /// Origin square (FMJD 1-50).
  final int fromSquare;

  /// Destination square (FMJD 1-50).
  final int toSquare;

  /// The piece being moved.
  final Piece piece;
}

/// Describes a captured piece that should fade out.
class CapturedPieceFade {
  /// Creates a [CapturedPieceFade].
  const CapturedPieceFade({
    required this.square,
    required this.piece,
  });

  /// The square of the captured piece.
  final int square;

  /// The captured piece (for rendering).
  final Piece piece;
}

/// Current animation state snapshot for the board widget to consume.
class MoveAnimationState {
  /// Creates a [MoveAnimationState].
  const MoveAnimationState({
    this.slidingPiece,
    this.slideProgress = 0.0,
    this.fadingCaptures = const [],
    this.fadeProgress = 1.0,
    this.hiddenSquares = const {},
    this.isAnimating = false,
  });

  /// The piece currently sliding, if any.
  final SlideAnimation? slidingPiece;

  /// Progress of the slide animation (0.0 to 1.0).
  final double slideProgress;

  /// Pieces currently fading out after capture.
  final List<CapturedPieceFade> fadingCaptures;

  /// Opacity of fading captures (1.0 to 0.0).
  final double fadeProgress;

  /// Squares whose pieces should be hidden (being animated elsewhere).
  final Set<int> hiddenSquares;

  /// Whether any animation is in progress.
  final bool isAnimating;

  /// No animation state.
  static const none = MoveAnimationState();
}

/// Controls piece movement animations on the board.
///
/// Compares old and new [BoardPosition] to detect which pieces moved
/// and which were captured, then orchestrates slide and fade animations.
/// For multi-capture moves, animations are chained sequentially.
class MoveAnimationController {
  /// Creates a [MoveAnimationController].
  ///
  /// Requires a [TickerProvider] (typically from a [StatefulWidget] with
  /// [TickerProviderStateMixin]).
  MoveAnimationController({
    required TickerProvider vsync,
    required this.onUpdate, this.speed = AnimationSpeed.normal,
  }) : _vsync = vsync;

  final TickerProvider _vsync;

  /// Current animation speed setting.
  AnimationSpeed speed;

  /// Callback fired on each animation frame with the current state.
  final ValueChanged<MoveAnimationState> onUpdate;

  AnimationController? _slideController;
  AnimationController? _fadeController;

  bool _disposed = false;

  /// Whether an animation is currently running.
  bool get isAnimating => _slideController?.isAnimating == true ||
      _fadeController?.isAnimating == true;

  /// Animates a move given old and new board positions plus the move.
  ///
  /// For instant speed, completes immediately.
  Future<void> animateMove({
    required BoardPosition oldBoard,
    required BoardPosition newBoard,
    required Move move,
  }) async {
    if (_disposed) return;
    if (speed == AnimationSpeed.instant) {
      return;
    }

    switch (move) {
      case QuietMove(:final from, :final to):
        final piece = oldBoard[from];
        if (piece == null) return;
        await _animateSlide(
          SlideAnimation(fromSquare: from, toSquare: to, piece: piece),
          const [],
        );

      case CaptureMove(:final steps):
        await _animateCaptureSequence(oldBoard, steps);
    }
  }

  /// Animates a single slide with optional capture fades.
  Future<void> _animateSlide(
    SlideAnimation slide,
    List<CapturedPieceFade> captures,
  ) async {
    if (_disposed) return;

    _slideController?.dispose();
    _slideController = AnimationController(
      vsync: _vsync,
      duration: speed.duration,
    );

    final hiddenSquares = <int>{slide.fromSquare};
    for (final cap in captures) {
      hiddenSquares.add(cap.square);
    }

    _slideController!.addListener(() {
      if (_disposed) return;
      onUpdate(MoveAnimationState(
        slidingPiece: slide,
        slideProgress: _slideController!.value,
        fadingCaptures: captures,
        fadeProgress: 1.0 - _slideController!.value,
        hiddenSquares: hiddenSquares,
        isAnimating: true,
      ),);
    });

    await _slideController!.forward();

    if (!_disposed) {
      onUpdate(MoveAnimationState.none);
    }
  }

  /// Animates a multi-capture sequence step by step.
  Future<void> _animateCaptureSequence(
    BoardPosition board,
    List<CaptureStep> steps,
  ) async {
    // Build a working copy of the board to track state during animation.
    final workingBoard = List<Piece?>.of(board);

    for (final step in steps) {
      if (_disposed) return;

      final piece = workingBoard[step.from];
      if (piece == null) continue;

      final capture = workingBoard[step.captured] != null
          ? CapturedPieceFade(
              square: step.captured,
              piece: workingBoard[step.captured]!,
            )
          : null;

      await _animateSlide(
        SlideAnimation(
          fromSquare: step.from,
          toSquare: step.to,
          piece: piece,
        ),
        capture != null ? [capture] : [],
      );

      // Update working board for next step.
      workingBoard[step.to] = workingBoard[step.from];
      workingBoard[step.from] = null;
      workingBoard[step.captured] = null;
    }
  }

  /// Cancels any in-progress animation.
  void cancel() {
    _slideController?.stop();
    _fadeController?.stop();
    onUpdate(MoveAnimationState.none);
  }

  /// Disposes animation controllers.
  void dispose() {
    _disposed = true;
    _slideController?.dispose();
    _fadeController?.dispose();
    _slideController = null;
    _fadeController = null;
  }
}
