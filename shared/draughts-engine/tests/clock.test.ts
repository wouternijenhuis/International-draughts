import { describe, it, expect } from 'vitest';
import {
  ClockFormat,
  ClockState,
  CLOCK_PRESETS,
  createClockState,
  createClockFromPreset,
  startClock,
  tickClock,
  switchClock,
  pauseClock,
  resumeClock,
  isTimeExpired,
  isLowTime,
  formatTime,
  serializeClockState,
  deserializeClockState,
} from '../src/clock/clock';

const fischerConfig = { format: ClockFormat.Fischer, baseTimeMs: 5 * 60 * 1000, incrementMs: 5000 };
const countdownConfig = { format: ClockFormat.Countdown, baseTimeMs: 10 * 60 * 1000, incrementMs: 0 };

describe('Clock - createClockState', () => {
  it('creates correct initial state for Fischer', () => {
    const state = createClockState(fischerConfig);
    expect(state.white.remainingMs).toBe(300000);
    expect(state.black.remainingMs).toBe(300000);
    expect(state.activePlayer).toBeNull();
    expect(state.isStarted).toBe(false);
  });

  it('creates correct initial state for Countdown', () => {
    const state = createClockState(countdownConfig);
    expect(state.white.remainingMs).toBe(600000);
    expect(state.black.remainingMs).toBe(600000);
  });
});

describe('Clock - Presets', () => {
  it('creates from valid preset name', () => {
    const state = createClockFromPreset('blitz-3+2');
    expect(state).not.toBeNull();
    expect(state!.config.baseTimeMs).toBe(3 * 60 * 1000);
    expect(state!.config.incrementMs).toBe(2000);
  });

  it('returns null for invalid preset', () => {
    expect(createClockFromPreset('nonexistent')).toBeNull();
  });

  it('has all expected presets', () => {
    expect(Object.keys(CLOCK_PRESETS)).toContain('blitz-3+2');
    expect(Object.keys(CLOCK_PRESETS)).toContain('blitz-5+5');
    expect(Object.keys(CLOCK_PRESETS)).toContain('rapid-10+0');
    expect(Object.keys(CLOCK_PRESETS)).toContain('rapid-15+10');
    expect(Object.keys(CLOCK_PRESETS)).toContain('classical-30+0');
    expect(Object.keys(CLOCK_PRESETS)).toContain('classical-60+30');
  });
});

describe('Clock - startClock', () => {
  it('starts white clock', () => {
    const state = createClockState(fischerConfig);
    const started = startClock(state, 'white', 1000);
    expect(started.white.isRunning).toBe(true);
    expect(started.white.lastStartedAt).toBe(1000);
    expect(started.activePlayer).toBe('white');
    expect(started.isStarted).toBe(true);
  });
});

describe('Clock - tickClock', () => {
  it('decreases remaining time based on elapsed', () => {
    let state = createClockState(fischerConfig);
    state = startClock(state, 'white', 1000);
    const ticked = tickClock(state, 6000); // 5 seconds elapsed
    expect(ticked.white.remainingMs).toBe(300000 - 5000);
  });

  it('remaining time never goes below 0', () => {
    let state = createClockState(fischerConfig);
    state = startClock(state, 'white', 0);
    const ticked = tickClock(state, 999999999); // way past
    expect(ticked.white.remainingMs).toBe(0);
  });

  it('does nothing when no active player', () => {
    const state = createClockState(fischerConfig);
    const ticked = tickClock(state, 5000);
    expect(ticked).toEqual(state);
  });
});

describe('Clock - switchClock', () => {
  it('Fischer: stops current, adds increment, starts opponent', () => {
    let state = createClockState(fischerConfig);
    state = startClock(state, 'white', 0);
    const switched = switchClock(state, 3000); // 3 seconds elapsed
    
    // White: 300000 - 3000 + 5000 (increment) = 302000
    expect(switched.white.remainingMs).toBe(302000);
    expect(switched.white.isRunning).toBe(false);
    
    // Black starts
    expect(switched.black.isRunning).toBe(true);
    expect(switched.activePlayer).toBe('black');
  });

  it('Countdown: no increment added', () => {
    let state = createClockState(countdownConfig);
    state = startClock(state, 'white', 0);
    const switched = switchClock(state, 3000);
    
    // White: 600000 - 3000 = 597000 (no increment)
    expect(switched.white.remainingMs).toBe(597000);
  });

  it('correctly alternates between players', () => {
    let state = createClockState(fischerConfig);
    state = startClock(state, 'white', 0);
    state = switchClock(state, 2000); // white → black
    expect(state.activePlayer).toBe('black');
    state = switchClock(state, 4000); // black → white
    expect(state.activePlayer).toBe('white');
  });
});

describe('Clock - pauseClock', () => {
  it('stops both clocks', () => {
    let state = createClockState(fischerConfig);
    state = startClock(state, 'white', 0);
    const paused = pauseClock(state, 5000);
    
    expect(paused.white.isRunning).toBe(false);
    expect(paused.black.isRunning).toBe(false);
    expect(paused.activePlayer).toBeNull();
    // White should have lost 5 seconds
    expect(paused.white.remainingMs).toBe(295000);
  });
});

describe('Clock - resumeClock', () => {
  it('resumes the correct player', () => {
    let state = createClockState(fischerConfig);
    state = startClock(state, 'white', 0);
    state = pauseClock(state, 5000);
    const resumed = resumeClock(state, 'white', 10000);
    
    expect(resumed.white.isRunning).toBe(true);
    expect(resumed.activePlayer).toBe('white');
  });
});

describe('Clock - isTimeExpired', () => {
  it('returns false when time remains', () => {
    const state = createClockState(fischerConfig);
    expect(isTimeExpired(state, 'white')).toBe(false);
  });

  it('returns true when time is 0', () => {
    let state = createClockState(fischerConfig);
    state = startClock(state, 'white', 0);
    state = tickClock(state, 999999999);
    expect(isTimeExpired(state, 'white')).toBe(true);
  });
});

describe('Clock - isLowTime', () => {
  it('returns false when time is sufficient', () => {
    const state = createClockState(fischerConfig);
    expect(isLowTime(state, 'white')).toBe(false);
  });

  it('returns true below threshold', () => {
    const state = createClockState({ format: ClockFormat.Countdown, baseTimeMs: 25000, incrementMs: 0 });
    expect(isLowTime(state, 'white')).toBe(true);
  });

  it('returns false when time is 0 (expired, not low)', () => {
    let state = createClockState(fischerConfig);
    state = startClock(state, 'white', 0);
    state = tickClock(state, 999999999);
    expect(isLowTime(state, 'white')).toBe(false);
  });
});

describe('Clock - formatTime', () => {
  it('formats 5 minutes as "5:00"', () => {
    expect(formatTime(5 * 60 * 1000)).toBe('5:00');
  });

  it('formats 1:05 as "1:05"', () => {
    expect(formatTime(65 * 1000)).toBe('1:05');
  });

  it('formats 59.3 seconds as "59.3"', () => {
    expect(formatTime(59300)).toBe('59.3');
  });

  it('formats 0 as "0:00"', () => {
    expect(formatTime(0)).toBe('0:00');
  });

  it('formats negative as "0:00"', () => {
    expect(formatTime(-1000)).toBe('0:00');
  });

  it('formats 10.0 seconds as "10.0"', () => {
    expect(formatTime(10000)).toBe('10.0');
  });
});

describe('Clock - serialization', () => {
  it('serialization preserves remaining times', () => {
    let state = createClockState(fischerConfig);
    state = startClock(state, 'white', 0);
    const serialized = serializeClockState(state, 5000);
    
    expect(serialized.white.remainingMs).toBe(295000);
    expect(serialized.white.isRunning).toBe(false);
    expect(serialized.activePlayer).toBeNull();
  });

  it('deserialization returns paused state', () => {
    const data: ClockState = {
      config: fischerConfig,
      white: { remainingMs: 250000, isRunning: true, lastStartedAt: 12345 },
      black: { remainingMs: 300000, isRunning: false, lastStartedAt: null },
      activePlayer: 'white',
      isStarted: true,
    };
    const restored = deserializeClockState(data);
    expect(restored.white.isRunning).toBe(false);
    expect(restored.black.isRunning).toBe(false);
    expect(restored.activePlayer).toBeNull();
    expect(restored.white.remainingMs).toBe(250000);
  });
});
