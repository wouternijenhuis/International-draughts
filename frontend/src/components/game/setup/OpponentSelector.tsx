/**
 * OpponentSelector — Toggle between "vs AI" and "vs Human (Local)".
 *
 * Renders two clickable cards with icons. Used inside GameSetupDialog.
 *
 * @module OpponentSelector
 */

'use client';

import React from 'react';
import type { OpponentType } from '@/stores/game-store';

/** Props for the OpponentSelector component. */
export interface OpponentSelectorProps {
  /** Currently selected opponent type */
  readonly value: OpponentType;
  /** Callback when the user selects a different opponent */
  readonly onChange: (value: OpponentType) => void;
}

/** Two-card selector for choosing between AI and local human opponents. */
export const OpponentSelector: React.FC<OpponentSelectorProps> = ({ value, onChange }) => {
  const options: { key: OpponentType; label: string; icon: string; description: string }[] = [
    { key: 'ai', label: 'vs AI', icon: '🤖', description: 'Play against the computer' },
    { key: 'human', label: 'vs Human', icon: '👥', description: 'Local pass-and-play' },
  ];

  return (
    <fieldset>
      <legend className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Opponent</legend>
      <div className="grid grid-cols-2 gap-3">
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={`
              flex flex-col items-center gap-1 p-4 rounded-xl border-2 transition-all
              ${value === option.key
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-sm'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'}
            `}
            aria-pressed={value === option.key}
            aria-label={option.label}
          >
            <span className="text-2xl" aria-hidden="true">{option.icon}</span>
            <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{option.label}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{option.description}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
};
