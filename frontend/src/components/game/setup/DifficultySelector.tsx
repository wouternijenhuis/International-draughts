/**
 * DifficultySelector — Segmented control for AI difficulty levels.
 *
 * Renders four buttons for Easy, Medium, Hard, and Expert.
 * Expert shows a subtle badge indicating server dependency.
 *
 * @module DifficultySelector
 */

'use client';

import React from 'react';
import type { AIDifficulty } from '@/stores/game-store';

/** Props for the DifficultySelector component. */
export interface DifficultySelectorProps {
  /** Currently selected difficulty */
  readonly value: AIDifficulty;
  /** Callback when the user selects a different difficulty */
  readonly onChange: (value: AIDifficulty) => void;
  /** Whether the selector is disabled (e.g., when opponent is human) */
  readonly disabled?: boolean;
}

/** Difficulty option metadata. */
const DIFFICULTIES: { value: AIDifficulty; label: string; description: string }[] = [
  { value: 'easy', label: 'Easy', description: 'Perfect for learning' },
  { value: 'medium', label: 'Medium', description: 'A fair challenge' },
  { value: 'hard', label: 'Hard', description: 'Strong local engine' },
  { value: 'expert', label: 'Expert', description: 'Server-side AI' },
];

/** Segmented control for selecting AI difficulty. */
export const DifficultySelector: React.FC<DifficultySelectorProps> = ({ value, onChange, disabled = false }) => {
  return (
    <fieldset disabled={disabled}>
      <legend className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">AI Difficulty</legend>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {DIFFICULTIES.map((diff) => (
          <button
            key={diff.value}
            type="button"
            onClick={() => onChange(diff.value)}
            className={`
              relative flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-lg border transition-all text-center
              ${value === diff.value
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            aria-pressed={value === diff.value}
            aria-label={`${diff.label} difficulty — ${diff.description}`}
          >
            <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{diff.label}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{diff.description}</span>
            {diff.value === 'expert' && (
              <span
                className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded-full leading-none"
                aria-label="Requires server connection"
              >
                Server
              </span>
            )}
          </button>
        ))}
      </div>
    </fieldset>
  );
};
