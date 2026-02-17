/**
 * ColorPicker — Three-option selector for player color preference.
 *
 * Allows the user to choose White, Black, or Random.
 * "Random" is stored as-is; resolution happens at game start.
 *
 * @module ColorPicker
 */

'use client';

import React from 'react';

/** The user's color preference (not yet resolved). */
export type PlayAsColor = 'white' | 'black' | 'random';

/** Props for the ColorPicker component. */
export interface ColorPickerProps {
  /** Currently selected color preference */
  readonly value: PlayAsColor;
  /** Callback when the user selects a different color */
  readonly onChange: (value: PlayAsColor) => void;
}

/** Color option metadata. */
const COLOR_OPTIONS: { value: PlayAsColor; label: string; icon: string }[] = [
  { value: 'white', label: 'White', icon: '⚪' },
  { value: 'black', label: 'Black', icon: '⚫' },
  { value: 'random', label: 'Random', icon: '🎲' },
];

/** Three-option selector for choosing which color to play as. */
export const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange }) => {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Play As</legend>
      <div className="grid grid-cols-3 gap-2">
        {COLOR_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`
              flex flex-col items-center gap-1 px-3 py-3 rounded-lg border-2 transition-all
              ${value === option.value
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-sm'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'}
            `}
            aria-pressed={value === option.value}
            aria-label={`Play as ${option.label}`}
          >
            <span className="text-xl" aria-hidden="true">{option.icon}</span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{option.label}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
};
