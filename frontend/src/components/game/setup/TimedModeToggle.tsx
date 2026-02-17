/**
 * TimedModeToggle — Toggle switch for timed mode with clock preset grid.
 *
 * When timed mode is enabled, expands to show a grid of clock preset options.
 * Animates open/close of the preset section.
 *
 * @module TimedModeToggle
 */

'use client';

import React from 'react';

/** Available clock presets. */
const CLOCK_PRESETS = [
  { value: 'blitz-3+2', label: 'Blitz 3+2' },
  { value: 'blitz-5+5', label: 'Blitz 5+5' },
  { value: 'rapid-10+0', label: 'Rapid 10+0' },
  { value: 'rapid-15+10', label: 'Rapid 15+10' },
  { value: 'classical-30+0', label: 'Classical 30+0' },
] as const;

/** Props for the TimedModeToggle component. */
export interface TimedModeToggleProps {
  /** Whether timed mode is currently on */
  readonly enabled: boolean;
  /** Callback when timed mode is toggled */
  readonly onToggle: (value: boolean) => void;
  /** Currently selected clock preset identifier */
  readonly preset: string;
  /** Callback when a different clock preset is selected */
  readonly onPresetChange: (value: string) => void;
}

/** Toggle switch for timed mode with expandable clock preset grid. */
export const TimedModeToggle: React.FC<TimedModeToggleProps> = ({
  enabled,
  onToggle,
  preset,
  onPresetChange,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label htmlFor="timed-mode-toggle" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          ⏱ Timed Mode
        </label>
        <button
          id="timed-mode-toggle"
          type="button"
          onClick={() => onToggle(!enabled)}
          role="switch"
          aria-checked={enabled}
          className={`
            relative w-11 h-6 rounded-full transition-colors
            ${enabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}
          `}
        >
          <span
            className={`
              absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
              ${enabled ? 'translate-x-5' : ''}
            `}
          />
        </button>
      </div>

      {/* Clock presets — animated expand/collapse */}
      <div
        className={`
          overflow-hidden transition-all duration-200 ease-in-out
          ${enabled ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <fieldset>
          <legend className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Time Control</legend>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CLOCK_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => onPresetChange(p.value)}
                className={`
                  px-2.5 py-2 rounded-lg text-xs font-medium border transition-all
                  ${preset === p.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'}
                `}
                aria-pressed={preset === p.value}
              >
                {p.label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
    </div>
  );
};
