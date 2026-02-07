/** Clock format types */
export enum ClockFormat {
  Fischer = 'fischer',
  Countdown = 'countdown',
}

/** Clock configuration */
export interface ClockConfig {
  readonly format: ClockFormat;
  /** Base time in milliseconds */
  readonly baseTimeMs: number;
  /** Increment in milliseconds (Fischer only, 0 for countdown) */
  readonly incrementMs: number;
}

/** Pre-configured time controls */
export const CLOCK_PRESETS: Record<string, ClockConfig> = {
  'blitz-3+2': { format: ClockFormat.Fischer, baseTimeMs: 3 * 60 * 1000, incrementMs: 2 * 1000 },
  'blitz-5+5': { format: ClockFormat.Fischer, baseTimeMs: 5 * 60 * 1000, incrementMs: 5 * 1000 },
  'rapid-10+0': { format: ClockFormat.Countdown, baseTimeMs: 10 * 60 * 1000, incrementMs: 0 },
  'rapid-15+10': { format: ClockFormat.Fischer, baseTimeMs: 15 * 60 * 1000, incrementMs: 10 * 1000 },
  'classical-30+0': { format: ClockFormat.Countdown, baseTimeMs: 30 * 60 * 1000, incrementMs: 0 },
  'classical-60+30': { format: ClockFormat.Fischer, baseTimeMs: 60 * 60 * 1000, incrementMs: 30 * 1000 },
};

/** Per-player clock state */
export interface PlayerClockState {
  /** Remaining time in milliseconds */
  readonly remainingMs: number;
  /** Whether this clock is currently running */
  readonly isRunning: boolean;
  /** Timestamp when the clock last started running (for drift calc) */
  readonly lastStartedAt: number | null;
}

/** Complete clock state for the game */
export interface ClockState {
  readonly config: ClockConfig;
  readonly white: PlayerClockState;
  readonly black: PlayerClockState;
  /** Which player's clock is active ('white' | 'black' | null if paused) */
  readonly activePlayer: 'white' | 'black' | null;
  /** Whether the clock has been started at all */
  readonly isStarted: boolean;
}

/** Low-time threshold in milliseconds */
export const LOW_TIME_THRESHOLD_MS = 30 * 1000;

/** Create initial clock state from config */
export const createClockState = (config: ClockConfig): ClockState => ({
  config,
  white: {
    remainingMs: config.baseTimeMs,
    isRunning: false,
    lastStartedAt: null,
  },
  black: {
    remainingMs: config.baseTimeMs,
    isRunning: false,
    lastStartedAt: null,
  },
  activePlayer: null,
  isStarted: false,
});

/** Create clock state from a preset name */
export const createClockFromPreset = (presetName: string): ClockState | null => {
  const config = CLOCK_PRESETS[presetName];
  if (!config) return null;
  return createClockState(config);
};

/**
 * Start the clock for a specific player (usually white starts first).
 * @param state Current clock state
 * @param player Which player's clock to start
 * @param timestamp Current timestamp in ms
 */
export const startClock = (
  state: ClockState,
  player: 'white' | 'black',
  timestamp: number,
): ClockState => ({
  ...state,
  [player]: {
    ...state[player],
    isRunning: true,
    lastStartedAt: timestamp,
  },
  activePlayer: player,
  isStarted: true,
});

/**
 * Tick the clock — update remaining time based on elapsed time.
 * Call this on each UI frame or at regular intervals.
 * @param state Current clock state
 * @param timestamp Current timestamp in ms
 */
export const tickClock = (
  state: ClockState,
  timestamp: number,
): ClockState => {
  if (!state.activePlayer) return state;

  const active = state[state.activePlayer];
  if (!active.isRunning || active.lastStartedAt === null) return state;

  const elapsed = timestamp - active.lastStartedAt;
  const newRemaining = Math.max(0, active.remainingMs - elapsed);

  return {
    ...state,
    [state.activePlayer]: {
      ...active,
      remainingMs: newRemaining,
      lastStartedAt: timestamp,
    },
  };
};

/**
 * Switch clocks on move completion.
 * Stops the current player's clock, adds increment (if Fischer), starts the other player's clock.
 * @param state Current clock state
 * @param timestamp Current timestamp in ms
 */
export const switchClock = (
  state: ClockState,
  timestamp: number,
): ClockState => {
  if (!state.activePlayer) return state;

  const currentPlayer = state.activePlayer;
  const otherPlayer: 'white' | 'black' = currentPlayer === 'white' ? 'black' : 'white';

  // First, tick to update remaining time
  const ticked = tickClock(state, timestamp);
  const currentClock = ticked[currentPlayer];

  // Add increment for Fischer
  const increment = state.config.format === ClockFormat.Fischer ? state.config.incrementMs : 0;

  return {
    ...ticked,
    [currentPlayer]: {
      ...currentClock,
      remainingMs: currentClock.remainingMs + increment,
      isRunning: false,
      lastStartedAt: null,
    },
    [otherPlayer]: {
      ...ticked[otherPlayer],
      isRunning: true,
      lastStartedAt: timestamp,
    },
    activePlayer: otherPlayer,
  };
};

/**
 * Pause both clocks.
 * @param state Current clock state
 * @param timestamp Current timestamp in ms
 */
export const pauseClock = (
  state: ClockState,
  timestamp: number,
): ClockState => {
  // Tick first to record elapsed time
  const ticked = tickClock(state, timestamp);

  return {
    ...ticked,
    white: { ...ticked.white, isRunning: false, lastStartedAt: null },
    black: { ...ticked.black, isRunning: false, lastStartedAt: null },
    activePlayer: null,
  };
};

/**
 * Resume the clock for the previously active player.
 * @param state Current clock state (should have been paused)
 * @param player Which player's clock to resume
 * @param timestamp Current timestamp in ms
 */
export const resumeClock = (
  state: ClockState,
  player: 'white' | 'black',
  timestamp: number,
): ClockState => startClock(state, player, timestamp);

/**
 * Check if a player's time has expired.
 */
export const isTimeExpired = (state: ClockState, player: 'white' | 'black'): boolean =>
  state[player].remainingMs <= 0;

/**
 * Check if a player is in low-time warning territory.
 */
export const isLowTime = (state: ClockState, player: 'white' | 'black'): boolean =>
  state[player].remainingMs > 0 && state[player].remainingMs <= LOW_TIME_THRESHOLD_MS;

/**
 * Format remaining time for display.
 * MM:SS when ≥ 1 minute, SS.s (with tenths) when < 1 minute.
 */
export const formatTime = (remainingMs: number): string => {
  if (remainingMs <= 0) return '0:00';

  const totalSeconds = Math.floor(remainingMs / 1000);

  if (totalSeconds >= 60) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // Less than 1 minute: show tenths
  const seconds = Math.floor(remainingMs / 1000);
  const tenths = Math.floor((remainingMs % 1000) / 100);
  return `${seconds}.${tenths}`;
};

/**
 * Serialize clock state for persistence (pause/resume/crash recovery).
 * Converts to a plain object with no running timers.
 */
export const serializeClockState = (state: ClockState, timestamp: number): ClockState => {
  // Tick first to get accurate remaining times, then pause
  return pauseClock(state, timestamp);
};

/**
 * Deserialize clock state from persistence.
 * Returns a paused clock state that can be resumed.
 */
export const deserializeClockState = (data: ClockState): ClockState => ({
  ...data,
  white: { ...data.white, isRunning: false, lastStartedAt: null },
  black: { ...data.black, isRunning: false, lastStartedAt: null },
  activePlayer: null,
});
