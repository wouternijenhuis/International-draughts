import { apiGet, apiPost, apiDelete } from '@/lib/api-client';
import { devLog, devWarn } from '@/lib/dev-logger';

/**
 * Serializable game state for persistence.
 * Contains everything needed to restore a game session.
 */
export interface SerializedGameState {
  /** Schema version for forward compatibility */
  version: 1;
  /** Board position as array of square data */
  position: Array<{ type: string; color: string } | null>;
  /** Current player turn */
  currentTurn: string;
  /** Move history with notations and positions */
  moveHistory: Array<{
    notation: string;
    player: string;
    positionAfter: Array<{ type: string; color: string } | null>;
    timestamp: number;
  }>;
  /** Current move index */
  moveIndex: number;
  /** Game configuration */
  config: {
    gameMode: string;
    opponent: string;
    aiDifficulty: string;
    playerColor: string;
    timedMode: boolean;
    clockPreset: string;
    showNotation: boolean;
    boardTheme: string;
    confirmMoves: boolean;
    showLegalMoves: boolean;
    animationSpeed: string;
  };
  /** Clock state if timed mode */
  clockState: {
    white: { remainingMs: number };
    black: { remainingMs: number };
    activePlayer: string;
    isRunning: boolean;
  } | null;
  /** Timestamp when saved */
  savedAt: number;
}

const GUEST_STORAGE_KEY = 'draughts-in-progress-game';

/**
 * Validates a serialized game state for structural integrity.
 * Returns null if invalid, the parsed state if valid.
 */
export function validateSerializedState(data: unknown): SerializedGameState | null {
  if (!data || typeof data !== 'object') return null;

  const state = data as Record<string, unknown>;

  // Check required fields
  if (state.version !== 1) return null;
  if (!Array.isArray(state.position) || state.position.length < 51) return null;
  if (typeof state.currentTurn !== 'string') return null;
  if (!Array.isArray(state.moveHistory)) return null;
  if (typeof state.moveIndex !== 'number') return null;
  if (!state.config || typeof state.config !== 'object') return null;
  if (typeof state.savedAt !== 'number') return null;

  const config = state.config as Record<string, unknown>;
  if (typeof config.opponent !== 'string') return null;
  if (typeof config.aiDifficulty !== 'string') return null;
  if (typeof config.playerColor !== 'string') return null;

  return data as SerializedGameState;
}

// --- Guest persistence (sessionStorage) ---

export function saveGuestGame(state: SerializedGameState): void {
  try {
    sessionStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(state));
    devLog('persistence', 'Guest game saved to sessionStorage');
  } catch (error) {
    devWarn('persistence', 'Failed to save guest game', { error });
  }
}

export function loadGuestGame(): SerializedGameState | null {
  try {
    const raw = sessionStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return validateSerializedState(parsed);
  } catch (error) {
    devWarn('persistence', 'Failed to load guest game', { error });
    return null;
  }
}

export function clearGuestGame(): void {
  try {
    sessionStorage.removeItem(GUEST_STORAGE_KEY);
    devLog('persistence', 'Guest game cleared from sessionStorage');
  } catch {
    // Silently ignore
  }
}

// --- Registered user persistence (localStorage + backend sync) ---

const USER_STORAGE_KEY = 'draughts-user-in-progress';

export function saveUserGameLocal(state: SerializedGameState): void {
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(state));
    devLog('persistence', 'User game saved to localStorage');
  } catch (error) {
    devWarn('persistence', 'Failed to save user game locally', { error });
  }
}

export function loadUserGameLocal(): SerializedGameState | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return validateSerializedState(parsed);
  } catch (error) {
    devWarn('persistence', 'Failed to load user game from localStorage', { error });
    return null;
  }
}

export function clearUserGameLocal(): void {
  try {
    localStorage.removeItem(USER_STORAGE_KEY);
    devLog('persistence', 'User game cleared from localStorage');
  } catch {
    // Silently ignore
  }
}

// --- Backend sync for registered users ---

interface BackendGameResponse {
  userId: string;
  gameState: string;
  savedAt: string;
}

export async function saveUserGameBackend(userId: string, state: SerializedGameState): Promise<void> {
  try {
    await apiPost(`/games/in-progress/${userId}`, {
      gameState: JSON.stringify(state),
    });
    devLog('persistence', 'User game synced to backend');
  } catch (error) {
    devWarn('persistence', 'Failed to sync game to backend', { error });
  }
}

export async function loadUserGameBackend(userId: string): Promise<SerializedGameState | null> {
  try {
    const response = await apiGet<BackendGameResponse>(`/games/in-progress/${userId}`);
    if (!response?.gameState) return null;
    const parsed = JSON.parse(response.gameState);
    return validateSerializedState(parsed);
  } catch {
    return null;
  }
}

export async function clearUserGameBackend(userId: string): Promise<void> {
  try {
    await apiDelete(`/games/in-progress/${userId}`);
    devLog('persistence', 'User game cleared from backend');
  } catch (error) {
    devWarn('persistence', 'Failed to clear game from backend', { error });
  }
}

/**
 * Load the best available saved game for a user.
 * Prefers backend (more recent) over local storage.
 */
export async function loadUserGame(userId: string): Promise<SerializedGameState | null> {
  const [backendGame, localGame] = await Promise.all([
    loadUserGameBackend(userId),
    Promise.resolve(loadUserGameLocal()),
  ]);

  if (backendGame && localGame) {
    // Return whichever is more recent
    return backendGame.savedAt > localGame.savedAt ? backendGame : localGame;
  }

  return backendGame ?? localGame;
}
