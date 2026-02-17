/**
 * GameSetupDialog — Modal dialog for configuring a new game.
 *
 * Uses the native `<dialog>` element with `showModal()` for built-in
 * focus trapping, backdrop rendering, and Escape-to-close behaviour.
 * Manages interim form state locally; only commits to the store on
 * "Start Game".
 *
 * @module GameSetupDialog
 */

'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  loadLastGameConfig,
  saveLastGameConfig,
  DEFAULT_SETUP_CONFIG,
  type LastGameConfig,
} from '@/lib/game-config-persistence';
import { OpponentSelector } from './OpponentSelector';
import { DifficultySelector } from './DifficultySelector';
import { ColorPicker } from './ColorPicker';
import type { PlayAsColor } from './ColorPicker';
import { TimedModeToggle } from './TimedModeToggle';

/** Props for the GameSetupDialog component. */
export interface GameSetupDialogProps {
  /** Whether the dialog should be visible */
  readonly open: boolean;
  /** Called when the dialog should close (cancel or after start) */
  readonly onClose: () => void;
  /** Called when the user confirms and starts a game */
  readonly onStartGame: (config: LastGameConfig) => void;
}

/**
 * Modal game setup dialog.
 *
 * Presents opponent, difficulty, color, and timed-mode options.
 * Pre-fills from the last-used configuration (localStorage).
 * Commits configuration on "Start Game" and persists it.
 */
export const GameSetupDialog: React.FC<GameSetupDialogProps> = ({ open, onClose, onStartGame }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Local form state — initialized from persisted config on open
  const [formState, setFormState] = useState<LastGameConfig>(DEFAULT_SETUP_CONFIG);

  // Adjusting state during rendering: re-initialize formState when dialog opens
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      const saved = loadLastGameConfig();
      setFormState(saved ?? DEFAULT_SETUP_CONFIG);
    }
  }

  // Sync open/close with the native <dialog>
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [open]);

  // Handle native cancel event (Escape key or backdrop click)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };

    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [onClose]);

  // Handle backdrop click (click outside the dialog content)
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === dialogRef.current) {
        onClose();
      }
    },
    [onClose],
  );

  /** Commit the form state, persist, and start the game. */
  const handleStartGame = useCallback(() => {
    saveLastGameConfig(formState);
    onStartGame(formState);
    onClose();
  }, [formState, onStartGame, onClose]);

  /** Quick start: use saved/default config immediately. */
  const handleQuickStart = useCallback(() => {
    const config = loadLastGameConfig() ?? DEFAULT_SETUP_CONFIG;
    saveLastGameConfig(config);
    onStartGame(config);
    onClose();
  }, [onStartGame, onClose]);

  /** Update a single field in the local form state. */
  const updateField = useCallback(<K extends keyof LastGameConfig>(key: K, value: LastGameConfig[K]) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="
        backdrop:bg-black/60 backdrop:backdrop-blur-sm
        bg-white dark:bg-gray-800
        rounded-2xl shadow-2xl
        w-full max-w-md mx-auto
        p-0 border-0
        open:animate-in open:fade-in open:zoom-in-95
        max-h-[90vh] overflow-y-auto
      "
      aria-label="Game setup"
      onClick={handleBackdropClick}
    >
      <div className="p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">New Game</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
            aria-label="Close dialog"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form sections */}
        <div className="space-y-5">
          {/* Opponent */}
          <OpponentSelector
            value={formState.opponent}
            onChange={(v: LastGameConfig['opponent']) => updateField('opponent', v)}
          />

          {/* AI Difficulty — only when opponent is AI */}
          <div
            className={`
              overflow-hidden transition-all duration-200 ease-in-out
              ${formState.opponent === 'ai' ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}
            `}
          >
            <DifficultySelector
              value={formState.difficulty}
              onChange={(v: LastGameConfig['difficulty']) => updateField('difficulty', v)}
              disabled={formState.opponent !== 'ai'}
            />
          </div>

          {/* Play As */}
          <ColorPicker
            value={formState.playAs as PlayAsColor}
            onChange={(v: PlayAsColor) => updateField('playAs', v)}
          />

          {/* Timed Mode + Clock Presets */}
          <TimedModeToggle
            enabled={formState.timedMode}
            onToggle={(v: boolean) => updateField('timedMode', v)}
            preset={formState.clockPreset}
            onPresetChange={(v: string) => updateField('clockPreset', v)}
          />
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleStartGame}
            className="
              flex-1 px-6 py-3 bg-green-600 hover:bg-green-700
              text-white rounded-lg font-medium text-lg
              transition-colors
              focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2
            "
            autoFocus
          >
            Start Game
          </button>
          <button
            type="button"
            onClick={handleQuickStart}
            className="
              flex-1 px-6 py-3
              bg-gray-100 dark:bg-gray-700
              hover:bg-gray-200 dark:hover:bg-gray-600
              text-gray-700 dark:text-gray-200
              rounded-lg font-medium
              transition-colors
              focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2
            "
          >
            ⚡ Quick Start
          </button>
        </div>
      </div>
    </dialog>
  );
};
