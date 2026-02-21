import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Board theme options */
export type BoardTheme = 'classic-wood' | 'dark' | 'ocean' | 'tournament-green';

/** Animation speed options */
export type AnimationSpeed = 'instant' | 'fast' | 'normal' | 'slow';

/** Display settings state */
interface SettingsState {
  /** Current board color theme */
  readonly boardTheme: BoardTheme;
  /** Whether to show FMJD square notation on the board */
  readonly showNotation: boolean;
  /** Whether to highlight legal move destinations */
  readonly showLegalMoves: boolean;
  /** Piece movement animation speed */
  readonly animationSpeed: AnimationSpeed;
  /** Whether the settings drawer is currently open */
  readonly isSettingsOpen: boolean;

  /** Set the board color theme */
  setBoardTheme: (theme: BoardTheme) => void;
  /** Toggle notation visibility */
  toggleNotation: () => void;
  /** Set legal move highlighting */
  setShowLegalMoves: (show: boolean) => void;
  /** Set animation speed */
  setAnimationSpeed: (speed: AnimationSpeed) => void;
  /** Open the settings drawer */
  openSettings: () => void;
  /** Close the settings drawer */
  closeSettings: () => void;
  /** Toggle the settings drawer open/closed */
  toggleSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      boardTheme: 'classic-wood',
      showNotation: false,
      showLegalMoves: true,
      animationSpeed: 'normal',
      isSettingsOpen: false,

      setBoardTheme: (theme) => set({ boardTheme: theme }),
      toggleNotation: () => set((state) => ({ showNotation: !state.showNotation })),
      setShowLegalMoves: (show) => set({ showLegalMoves: show }),
      setAnimationSpeed: (speed) => set({ animationSpeed: speed }),
      openSettings: () => set({ isSettingsOpen: true }),
      closeSettings: () => set({ isSettingsOpen: false }),
      toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
    }),
    {
      name: 'draughts-display-settings',
      partialize: (state) => ({
        boardTheme: state.boardTheme,
        showNotation: state.showNotation,
        showLegalMoves: state.showLegalMoves,
        animationSpeed: state.animationSpeed,
      }),
    }
  )
);
