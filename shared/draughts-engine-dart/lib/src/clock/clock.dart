/// Clock format types.
enum ClockFormat {
  /// Fischer time control (base time + increment per move).
  fischer,

  /// Simple countdown (no increment).
  countdown,
}

/// Clock configuration.
class ClockConfig {
  /// Creates a clock configuration.
  const ClockConfig({
    required this.format,
    required this.baseTimeMs,
    required this.incrementMs,
  });

  /// The clock format.
  final ClockFormat format;

  /// Base time in milliseconds.
  final int baseTimeMs;

  /// Increment in milliseconds (Fischer only, 0 for countdown).
  final int incrementMs;
}

/// Pre-configured time controls.
const Map<String, ClockConfig> clockPresets = {
  'blitz-3+2': ClockConfig(
    format: ClockFormat.fischer,
    baseTimeMs: 3 * 60 * 1000,
    incrementMs: 2 * 1000,
  ),
  'blitz-5+5': ClockConfig(
    format: ClockFormat.fischer,
    baseTimeMs: 5 * 60 * 1000,
    incrementMs: 5 * 1000,
  ),
  'rapid-10+0': ClockConfig(
    format: ClockFormat.countdown,
    baseTimeMs: 10 * 60 * 1000,
    incrementMs: 0,
  ),
  'rapid-15+10': ClockConfig(
    format: ClockFormat.fischer,
    baseTimeMs: 15 * 60 * 1000,
    incrementMs: 10 * 1000,
  ),
  'classical-30+0': ClockConfig(
    format: ClockFormat.countdown,
    baseTimeMs: 30 * 60 * 1000,
    incrementMs: 0,
  ),
  'classical-60+30': ClockConfig(
    format: ClockFormat.fischer,
    baseTimeMs: 60 * 60 * 1000,
    incrementMs: 30 * 1000,
  ),
};

/// Per-player clock state.
class PlayerClockState {
  /// Creates a player clock state.
  const PlayerClockState({
    required this.remainingMs,
    required this.isRunning,
    required this.lastStartedAt,
  });

  /// Remaining time in milliseconds.
  final int remainingMs;

  /// Whether this clock is currently running.
  final bool isRunning;

  /// Timestamp when the clock last started running (for drift calc).
  final int? lastStartedAt;

  /// Creates a copy with the given fields replaced.
  PlayerClockState copyWith({
    int? remainingMs,
    bool? isRunning,
    int? Function()? lastStartedAt,
  }) {
    return PlayerClockState(
      remainingMs: remainingMs ?? this.remainingMs,
      isRunning: isRunning ?? this.isRunning,
      lastStartedAt:
          lastStartedAt != null ? lastStartedAt() : this.lastStartedAt,
    );
  }
}

/// Complete clock state for the game.
class ClockState {
  /// Creates a clock state.
  const ClockState({
    required this.config,
    required this.white,
    required this.black,
    required this.activePlayer,
    required this.isStarted,
  });

  /// The clock configuration.
  final ClockConfig config;

  /// White player's clock state.
  final PlayerClockState white;

  /// Black player's clock state.
  final PlayerClockState black;

  /// Which player's clock is active ('white', 'black', or null if paused).
  final String? activePlayer;

  /// Whether the clock has been started at all.
  final bool isStarted;

  /// Gets the clock state for the given player.
  PlayerClockState playerClock(String player) =>
      player == 'white' ? white : black;

  /// Creates a copy with the given fields replaced.
  ClockState copyWith({
    ClockConfig? config,
    PlayerClockState? white,
    PlayerClockState? black,
    String? Function()? activePlayer,
    bool? isStarted,
  }) {
    return ClockState(
      config: config ?? this.config,
      white: white ?? this.white,
      black: black ?? this.black,
      activePlayer:
          activePlayer != null ? activePlayer() : this.activePlayer,
      isStarted: isStarted ?? this.isStarted,
    );
  }
}

/// Low-time threshold in milliseconds.
const int lowTimeThresholdMs = 30 * 1000;

/// Create initial clock state from config.
ClockState createClockState(ClockConfig config) => ClockState(
      config: config,
      white: PlayerClockState(
        remainingMs: config.baseTimeMs,
        isRunning: false,
        lastStartedAt: null,
      ),
      black: PlayerClockState(
        remainingMs: config.baseTimeMs,
        isRunning: false,
        lastStartedAt: null,
      ),
      activePlayer: null,
      isStarted: false,
    );

/// Create clock state from a preset name.
ClockState? createClockFromPreset(String presetName) {
  final config = clockPresets[presetName];
  if (config == null) return null;
  return createClockState(config);
}

/// Start the clock for a specific player (usually white starts first).
ClockState startClock(ClockState state, String player, int timestamp) {
  final playerState = state.playerClock(player);
  final updatedPlayer = playerState.copyWith(
    isRunning: true,
    lastStartedAt: () => timestamp,
  );
  return state.copyWith(
    white: player == 'white' ? updatedPlayer : null,
    black: player == 'black' ? updatedPlayer : null,
    activePlayer: () => player,
    isStarted: true,
  );
}

/// Tick the clock — update remaining time based on elapsed time.
///
/// Call this on each UI frame or at regular intervals.
ClockState tickClock(ClockState state, int timestamp) {
  if (state.activePlayer == null) return state;

  final active = state.playerClock(state.activePlayer!);
  if (!active.isRunning || active.lastStartedAt == null) return state;

  final elapsed = timestamp - active.lastStartedAt!;
  final newRemaining = (active.remainingMs - elapsed).clamp(0, active.remainingMs);

  final updatedPlayer = active.copyWith(
    remainingMs: newRemaining,
    lastStartedAt: () => timestamp,
  );

  return state.copyWith(
    white: state.activePlayer == 'white' ? updatedPlayer : null,
    black: state.activePlayer == 'black' ? updatedPlayer : null,
  );
}

/// Switch clocks on move completion.
///
/// Stops the current player's clock, adds increment (if Fischer), starts the other player's clock.
ClockState switchClock(ClockState state, int timestamp) {
  if (state.activePlayer == null) return state;

  final currentPlayer = state.activePlayer!;
  final otherPlayer = currentPlayer == 'white' ? 'black' : 'white';

  // First, tick to update remaining time
  final ticked = tickClock(state, timestamp);
  final currentClock = ticked.playerClock(currentPlayer);

  // Add increment for Fischer
  final increment =
      state.config.format == ClockFormat.fischer ? state.config.incrementMs : 0;

  final updatedCurrent = currentClock.copyWith(
    remainingMs: currentClock.remainingMs + increment,
    isRunning: false,
    lastStartedAt: () => null,
  );

  final otherClock = ticked.playerClock(otherPlayer);
  final updatedOther = otherClock.copyWith(
    isRunning: true,
    lastStartedAt: () => timestamp,
  );

  return ticked.copyWith(
    white: currentPlayer == 'white' ? updatedCurrent : updatedOther,
    black: currentPlayer == 'black' ? updatedCurrent : updatedOther,
    activePlayer: () => otherPlayer,
  );
}

/// Pause both clocks.
ClockState pauseClock(ClockState state, int timestamp) {
  // Tick first to record elapsed time
  final ticked = tickClock(state, timestamp);

  return ticked.copyWith(
    white: ticked.white.copyWith(
      isRunning: false,
      lastStartedAt: () => null,
    ),
    black: ticked.black.copyWith(
      isRunning: false,
      lastStartedAt: () => null,
    ),
    activePlayer: () => null,
  );
}

/// Resume the clock for the previously active player.
ClockState resumeClock(ClockState state, String player, int timestamp) =>
    startClock(state, player, timestamp);

/// Check if a player's time has expired.
bool isTimeExpired(ClockState state, String player) =>
    state.playerClock(player).remainingMs <= 0;

/// Check if a player is in low-time warning territory.
bool isLowTime(ClockState state, String player) {
  final clock = state.playerClock(player);
  return clock.remainingMs > 0 && clock.remainingMs <= lowTimeThresholdMs;
}

/// Format remaining time for display.
///
/// MM:SS when ≥ 1 minute, SS.s (with tenths) when < 1 minute.
String formatTime(int remainingMs) {
  if (remainingMs <= 0) return '0:00';

  final totalSeconds = remainingMs ~/ 1000;

  if (totalSeconds >= 60) {
    final minutes = totalSeconds ~/ 60;
    final seconds = totalSeconds % 60;
    return '$minutes:${seconds.toString().padLeft(2, '0')}';
  }

  // Less than 1 minute: show tenths
  final seconds = remainingMs ~/ 1000;
  final tenths = (remainingMs % 1000) ~/ 100;
  return '$seconds.$tenths';
}

/// Serialize clock state for persistence (pause/resume/crash recovery).
///
/// Converts to a paused clock state with no running timers.
ClockState serializeClockState(ClockState state, int timestamp) {
  return pauseClock(state, timestamp);
}

/// Deserialize clock state from persistence.
///
/// Returns a paused clock state that can be resumed.
ClockState deserializeClockState(ClockState data) => data.copyWith(
      white: data.white.copyWith(
        isRunning: false,
        lastStartedAt: () => null,
      ),
      black: data.black.copyWith(
        isRunning: false,
        lastStartedAt: () => null,
      ),
      activePlayer: () => null,
    );
