import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateSerializedState,
  saveGuestGame,
  loadGuestGame,
  clearGuestGame,
  saveUserGameLocal,
  loadUserGameLocal,
  clearUserGameLocal,
  type SerializedGameState,
} from '../game-persistence';

// Mock api-client
vi.mock('@/lib/api-client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
}));

// Mock dev-logger
vi.mock('@/lib/dev-logger', () => ({
  devLog: vi.fn(),
  devWarn: vi.fn(),
}));

function createValidState(overrides: Partial<SerializedGameState> = {}): SerializedGameState {
  return {
    version: 1,
    position: Array(51).fill(null),
    currentTurn: 'white',
    moveHistory: [],
    moveIndex: -1,
    config: {
      gameMode: 'standard',
      opponent: 'ai',
      aiDifficulty: 'medium',
      playerColor: 'white',
      timedMode: false,
      clockPreset: 'rapid-10+0',
      showNotation: false,
      boardTheme: 'classic-wood',
      confirmMoves: false,
      showLegalMoves: true,
      animationSpeed: 'normal',
    },
    clockState: null,
    savedAt: Date.now(),
    ...overrides,
  };
}

describe('game-persistence', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  describe('validateSerializedState', () => {
    it('returns valid state when all fields are present', () => {
      const state = createValidState();
      expect(validateSerializedState(state)).toEqual(state);
    });

    it('returns null for null input', () => {
      expect(validateSerializedState(null)).toBeNull();
    });

    it('returns null for non-object input', () => {
      expect(validateSerializedState('string')).toBeNull();
    });

    it('returns null for wrong version', () => {
      const state = createValidState();
      (state as unknown as Record<string, unknown>).version = 2;
      expect(validateSerializedState(state)).toBeNull();
    });

    it('returns null for short position array', () => {
      const state = createValidState({ position: Array(10).fill(null) });
      expect(validateSerializedState(state)).toBeNull();
    });

    it('returns null for missing currentTurn', () => {
      const state = createValidState();
      (state as unknown as Record<string, unknown>).currentTurn = 123;
      expect(validateSerializedState(state)).toBeNull();
    });

    it('returns null for non-array moveHistory', () => {
      const state = createValidState();
      (state as unknown as Record<string, unknown>).moveHistory = 'not-an-array';
      expect(validateSerializedState(state)).toBeNull();
    });

    it('returns null for non-number moveIndex', () => {
      const state = createValidState();
      (state as unknown as Record<string, unknown>).moveIndex = 'abc';
      expect(validateSerializedState(state)).toBeNull();
    });

    it('returns null when config is missing', () => {
      const state = createValidState();
      (state as unknown as Record<string, unknown>).config = null;
      expect(validateSerializedState(state)).toBeNull();
    });

    it('returns null for missing savedAt', () => {
      const state = createValidState();
      (state as unknown as Record<string, unknown>).savedAt = 'not-a-number';
      expect(validateSerializedState(state)).toBeNull();
    });

    it('returns null for missing config.opponent', () => {
      const state = createValidState();
      (state.config as unknown as Record<string, unknown>).opponent = 123;
      expect(validateSerializedState(state)).toBeNull();
    });

    it('returns null for missing config.aiDifficulty', () => {
      const state = createValidState();
      (state.config as unknown as Record<string, unknown>).aiDifficulty = 123;
      expect(validateSerializedState(state)).toBeNull();
    });

    it('returns null for missing config.playerColor', () => {
      const state = createValidState();
      (state.config as unknown as Record<string, unknown>).playerColor = 123;
      expect(validateSerializedState(state)).toBeNull();
    });
  });

  describe('guest persistence (sessionStorage)', () => {
    it('saves and loads a guest game', () => {
      const state = createValidState();
      saveGuestGame(state);
      const loaded = loadGuestGame();
      expect(loaded).toEqual(state);
    });

    it('returns null when no guest game is saved', () => {
      expect(loadGuestGame()).toBeNull();
    });

    it('clears guest game', () => {
      saveGuestGame(createValidState());
      clearGuestGame();
      expect(loadGuestGame()).toBeNull();
    });

    it('returns null for corrupted data', () => {
      sessionStorage.setItem('draughts-in-progress-game', 'not-json');
      expect(loadGuestGame()).toBeNull();
    });

    it('returns null for invalid structure', () => {
      sessionStorage.setItem('draughts-in-progress-game', JSON.stringify({ version: 99 }));
      expect(loadGuestGame()).toBeNull();
    });
  });

  describe('user local persistence (localStorage)', () => {
    it('saves and loads a user game', () => {
      const state = createValidState();
      saveUserGameLocal(state);
      const loaded = loadUserGameLocal();
      expect(loaded).toEqual(state);
    });

    it('returns null when no user game is saved', () => {
      expect(loadUserGameLocal()).toBeNull();
    });

    it('clears user game', () => {
      saveUserGameLocal(createValidState());
      clearUserGameLocal();
      expect(loadUserGameLocal()).toBeNull();
    });

    it('returns null for corrupted data', () => {
      localStorage.setItem('draughts-user-in-progress', 'not-json');
      expect(loadUserGameLocal()).toBeNull();
    });
  });
});
