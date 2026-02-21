import 'dart:async';

import 'package:draughts_engine/draughts_engine.dart' as engine;
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// State for the game clock.
class ClockState {
  /// Creates a [ClockState].
  const ClockState({
    required this.whiteTimeMs,
    required this.blackTimeMs,
    required this.isRunning,
    required this.activeColor,
    this.incrementMs = 0,
    this.format = engine.ClockFormat.countdown,
  });

  /// White's remaining time in milliseconds.
  final int whiteTimeMs;

  /// Black's remaining time in milliseconds.
  final int blackTimeMs;

  /// Whether the clock is currently ticking.
  final bool isRunning;

  /// Which player's clock is active ('white' or 'black').
  final String activeColor;

  /// Increment per move in milliseconds (Fischer).
  final int incrementMs;

  /// Clock format (fischer or countdown).
  final engine.ClockFormat format;

  /// Creates a copy with the given fields replaced.
  ClockState copyWith({
    int? whiteTimeMs,
    int? blackTimeMs,
    bool? isRunning,
    String? activeColor,
    int? incrementMs,
    engine.ClockFormat? format,
  }) {
    return ClockState(
      whiteTimeMs: whiteTimeMs ?? this.whiteTimeMs,
      blackTimeMs: blackTimeMs ?? this.blackTimeMs,
      isRunning: isRunning ?? this.isRunning,
      activeColor: activeColor ?? this.activeColor,
      incrementMs: incrementMs ?? this.incrementMs,
      format: format ?? this.format,
    );
  }
}

/// Manages the game clock.
///
/// Uses [Timer.periodic] at 100ms intervals for ticking and [Stopwatch]
/// for monotonic elapsed time measurement. Implements [WidgetsBindingObserver]
/// to handle app lifecycle (pause/resume).
///
/// Dependencies: gameProvider (listens for turn changes).
class ClockNotifier extends StateNotifier<ClockState?>
    with WidgetsBindingObserver {
  /// Creates a [ClockNotifier].
  ClockNotifier(this._ref) : super(null) {
    WidgetsBinding.instance.addObserver(this);
  }

  final Ref _ref;

  Timer? _timer;
  final Stopwatch _stopwatch = Stopwatch();

  /// The player whose clock was active before the app was paused.
  String? _pausedActiveColor;

  /// Starts the clock with the given time per player in seconds.
  void startClock(int timePerPlayerSeconds) {
    final timeMs = timePerPlayerSeconds * 1000;
    state = ClockState(
      whiteTimeMs: timeMs,
      blackTimeMs: timeMs,
      isRunning: true,
      activeColor: 'white',
    );
    _startTimer();
  }

  /// Starts the clock from an engine [engine.ClockConfig].
  void startFromConfig(engine.ClockConfig config, String firstPlayer) {
    state = ClockState(
      whiteTimeMs: config.baseTimeMs,
      blackTimeMs: config.baseTimeMs,
      isRunning: true,
      activeColor: firstPlayer,
      incrementMs: config.incrementMs,
      format: config.format,
    );
    _startTimer();
  }

  /// Switches the active clock to the other player.
  ///
  /// Adds increment for Fischer time control.
  void switchTurn() {
    final current = state;
    if (current == null) return;

    final elapsed = _stopwatch.elapsedMilliseconds;
    _stopwatch.reset();
    _stopwatch.start();

    // Deduct elapsed from active player.
    final newActiveTime = current.activeColor == 'white'
        ? (current.whiteTimeMs - elapsed).clamp(0, current.whiteTimeMs)
        : (current.blackTimeMs - elapsed).clamp(0, current.blackTimeMs);

    // Add Fischer increment to the player who just moved.
    final increment =
        current.format == engine.ClockFormat.fischer ? current.incrementMs : 0;
    final timeWithIncrement = newActiveTime + increment;

    final nextColor =
        current.activeColor == 'white' ? 'black' : 'white';

    state = current.copyWith(
      whiteTimeMs: current.activeColor == 'white'
          ? timeWithIncrement
          : current.whiteTimeMs,
      blackTimeMs: current.activeColor == 'black'
          ? timeWithIncrement
          : current.blackTimeMs,
      activeColor: nextColor,
    );
  }

  /// Pauses the clock.
  void pause() {
    final current = state;
    if (current == null || !current.isRunning) return;

    _pauseInternal();
    state = state?.copyWith(isRunning: false);
  }

  /// Resumes the clock.
  void resume() {
    final current = state;
    if (current == null || current.isRunning) return;

    state = current.copyWith(isRunning: true);
    _startTimer();
  }

  /// Stops and clears the clock.
  void stopClock() {
    _cancelTimer();
    state = null;
    _pausedActiveColor = null;
  }

  /// Ticks the clock — called by [Timer.periodic].
  void _tick() {
    final current = state;
    if (current == null || !current.isRunning) return;

    final elapsed = _stopwatch.elapsedMilliseconds;
    _stopwatch.reset();
    _stopwatch.start();

    if (current.activeColor == 'white') {
      final newTime = (current.whiteTimeMs - elapsed).clamp(0, 999999999);
      state = current.copyWith(whiteTimeMs: newTime);
      if (newTime <= 0) {
        _cancelTimer();
        state = state!.copyWith(isRunning: false);
      }
    } else {
      final newTime = (current.blackTimeMs - elapsed).clamp(0, 999999999);
      state = current.copyWith(blackTimeMs: newTime);
      if (newTime <= 0) {
        _cancelTimer();
        state = state!.copyWith(isRunning: false);
      }
    }
  }

  void _startTimer() {
    _cancelTimer();
    _stopwatch.reset();
    _stopwatch.start();
    _timer = Timer.periodic(
      const Duration(milliseconds: 100),
      (_) => _tick(),
    );
  }

  void _cancelTimer() {
    _timer?.cancel();
    _timer = null;
    _stopwatch.stop();
    _stopwatch.reset();
  }

  void _pauseInternal() {
    // Record elapsed before cancelling.
    final current = state;
    if (current != null && current.isRunning) {
      final elapsed = _stopwatch.elapsedMilliseconds;
      if (current.activeColor == 'white') {
        state = current.copyWith(
          whiteTimeMs:
              (current.whiteTimeMs - elapsed).clamp(0, current.whiteTimeMs),
        );
      } else {
        state = current.copyWith(
          blackTimeMs:
              (current.blackTimeMs - elapsed).clamp(0, current.blackTimeMs),
        );
      }
    }
    _cancelTimer();
  }

  // ── WidgetsBindingObserver ─────────────────────────────────────────

  @override
  void didChangeAppLifecycleState(AppLifecycleState lifecycleState) {
    final current = state;

    switch (lifecycleState) {
      case AppLifecycleState.paused:
      case AppLifecycleState.inactive:
        if (current != null && current.isRunning) {
          _pausedActiveColor = current.activeColor;
          _pauseInternal();
          state = state?.copyWith(isRunning: false);
        }

      case AppLifecycleState.resumed:
        if (_pausedActiveColor != null && current != null) {
          state = current.copyWith(
            isRunning: true,
            activeColor: _pausedActiveColor,
          );
          _startTimer();
          _pausedActiveColor = null;
        }

      case AppLifecycleState.detached:
      case AppLifecycleState.hidden:
        break;
    }
  }

  @override
  void dispose() {
    _cancelTimer();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }
}

/// Provider for the clock state.
///
/// Dependency graph:
/// - clockProvider (this) ← gameOrchestrationProvider
/// - Depends on: gameProvider (via ref.listen in orchestration).
final clockProvider =
    StateNotifierProvider<ClockNotifier, ClockState?>((ref) {
  final notifier = ClockNotifier(ref);
  ref.onDispose(notifier.dispose);
  return notifier;
});
