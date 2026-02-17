/**
 * Game configuration persistence utility.
 *
 * Provides `saveLastGameConfig` and `loadLastGameConfig` for persisting
 * the user's last-used game setup options to localStorage. This is
 * separate from in-progress game state persistence (game-persistence.ts).
 *
 * @module game-config-persistence
 */

import type { OpponentType, AIDifficulty } from '@/stores/game-store';

/** The user's preferred game setup options (not the full GameConfig). */
export interface LastGameConfig {
  /** Opponent type: AI or local human */
  readonly opponent: OpponentType;
  /** AI difficulty level */
  readonly difficulty: AIDifficulty;
  /** Color preference — 'random' is stored as-is, not resolved */
  readonly playAs: 'white' | 'black' | 'random';
  /** Whether timed mode is enabled */
  readonly timedMode: boolean;
  /** Clock preset identifier (e.g., 'rapid-10+0') */
  readonly clockPreset: string;
}

/** localStorage key for the last-used game configuration. */
const STORAGE_KEY = 'draughts-last-game-config';

/** Default setup configuration for first-time users. */
export const DEFAULT_SETUP_CONFIG: LastGameConfig = {
  opponent: 'ai',
  difficulty: 'medium',
  playAs: 'white',
  timedMode: false,
  clockPreset: 'rapid-10+0',
};

/**
 * Saves the given game configuration to localStorage.
 *
 * @param config - The game configuration to persist.
 */
export function saveLastGameConfig(config: LastGameConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Silently fail — localStorage may be full or unavailable
  }
}

/**
 * Loads the last-used game configuration from localStorage.
 *
 * @returns The saved configuration, or `null` if none exists or the data is corrupt.
 */
export function loadLastGameConfig(): LastGameConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isValidLastGameConfig(parsed)) return null;

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Validates that a parsed JSON value conforms to the LastGameConfig shape.
 *
 * @param value - The value to validate.
 * @returns True if the value is a valid LastGameConfig.
 */
function isValidLastGameConfig(value: unknown): value is LastGameConfig {
  if (typeof value !== 'object' || value === null) return false;

  const obj = value as Record<string, unknown>;

  if (obj.opponent !== 'ai' && obj.opponent !== 'human') return false;
  if (!['easy', 'medium', 'hard', 'expert'].includes(obj.difficulty as string)) return false;
  if (!['white', 'black', 'random'].includes(obj.playAs as string)) return false;
  if (typeof obj.timedMode !== 'boolean') return false;
  if (typeof obj.clockPreset !== 'string') return false;

  return true;
}
