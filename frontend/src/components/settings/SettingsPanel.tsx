'use client';

import React from 'react';
import { useGameStore } from '@/stores/game-store';
import type { GameConfig } from '@/stores/game-store';

const THEMES: { value: GameConfig['boardTheme']; label: string }[] = [
  { value: 'classic-wood', label: 'Classic Wood' },
  { value: 'dark', label: 'Dark' },
  { value: 'ocean', label: 'Ocean' },
  { value: 'tournament-green', label: 'Tournament Green' },
];

export const SettingsPanel: React.FC = () => {
  const { config, setConfig, setBoardTheme, toggleNotation } = useGameStore();

  return (
    <div className="space-y-6 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-md" role="form" aria-label="Display preferences">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Display &amp; Preferences</h2>

      {/* Board Theme */}
      <fieldset>
        <legend className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Board Theme</legend>
        <div className="grid grid-cols-2 gap-2">
          {THEMES.map((theme) => (
            <button
              key={theme.value}
              onClick={() => setBoardTheme(theme.value)}
              className={`
                px-3 py-2 rounded-lg text-sm border transition-colors
                ${config.boardTheme === theme.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}
              `}
              aria-pressed={config.boardTheme === theme.value}
            >
              {theme.label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Show Notation */}
      <div className="flex items-center justify-between">
        <label htmlFor="notation-toggle" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Show Notation
        </label>
        <button
          id="notation-toggle"
          onClick={toggleNotation}
          role="switch"
          aria-checked={config.showNotation}
          className={`
            relative w-11 h-6 rounded-full transition-colors
            ${config.showNotation ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}
          `}
        >
          <span
            className={`
              absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
              ${config.showNotation ? 'translate-x-5' : ''}
            `}
          />
        </button>
      </div>

      {/* Show Legal Moves */}
      <div className="flex items-center justify-between">
        <label htmlFor="legal-moves-toggle" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Show Legal Moves
        </label>
        <button
          id="legal-moves-toggle"
          onClick={() => setConfig({ showLegalMoves: !config.showLegalMoves })}
          role="switch"
          aria-checked={config.showLegalMoves}
          className={`
            relative w-11 h-6 rounded-full transition-colors
            ${config.showLegalMoves ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}
          `}
        >
          <span
            className={`
              absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
              ${config.showLegalMoves ? 'translate-x-5' : ''}
            `}
          />
        </button>
      </div>

      {/* Animation Speed */}
      <fieldset>
        <legend className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Animation Speed</legend>
        <div className="flex gap-2">
          {(['instant', 'fast', 'normal', 'slow'] as const).map((speed) => (
            <button
              key={speed}
              onClick={() => setConfig({ animationSpeed: speed })}
              className={`
                flex-1 px-3 py-1.5 rounded-lg text-xs border transition-colors capitalize
                ${config.animationSpeed === speed
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}
              `}
              aria-pressed={config.animationSpeed === speed}
            >
              {speed}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
};
