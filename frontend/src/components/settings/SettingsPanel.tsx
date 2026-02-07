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

const DIFFICULTIES = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
] as const;

export const SettingsPanel: React.FC = () => {
  const { config, setConfig, setBoardTheme, toggleNotation, phase } = useGameStore();

  const isGameActive = phase === 'in-progress';

  return (
    <div className="space-y-6 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-md" role="form" aria-label="Game settings">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Settings</h2>

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

      {/* AI Difficulty */}
      <fieldset disabled={isGameActive}>
        <legend className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">AI Difficulty</legend>
        <div className="flex gap-2">
          {DIFFICULTIES.map((diff) => (
            <button
              key={diff.value}
              onClick={() => setConfig({ aiDifficulty: diff.value })}
              className={`
                flex-1 px-3 py-2 rounded-lg text-sm border transition-colors
                ${config.aiDifficulty === diff.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}
                ${isGameActive ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              aria-pressed={config.aiDifficulty === diff.value}
            >
              {diff.label}
            </button>
          ))}
        </div>
        {isGameActive && (
          <p className="text-xs text-gray-500 mt-1">Cannot change during active game</p>
        )}
      </fieldset>

      {/* Opponent Type */}
      <fieldset disabled={isGameActive}>
        <legend className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Opponent</legend>
        <div className="flex gap-2">
          <button
            onClick={() => setConfig({ opponent: 'ai' })}
            className={`
              flex-1 px-3 py-2 rounded-lg text-sm border transition-colors
              ${config.opponent === 'ai'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}
              ${isGameActive ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            aria-pressed={config.opponent === 'ai'}
          >
            vs AI
          </button>
          <button
            onClick={() => setConfig({ opponent: 'human' })}
            className={`
              flex-1 px-3 py-2 rounded-lg text-sm border transition-colors
              ${config.opponent === 'human'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}
              ${isGameActive ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            aria-pressed={config.opponent === 'human'}
          >
            vs Human
          </button>
        </div>
      </fieldset>

      {/* Timed Mode */}
      <div className="flex items-center justify-between">
        <label htmlFor="timed-toggle" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Timed Mode
        </label>
        <button
          id="timed-toggle"
          onClick={() => setConfig({ timedMode: !config.timedMode })}
          role="switch"
          aria-checked={config.timedMode}
          disabled={isGameActive}
          className={`
            relative w-11 h-6 rounded-full transition-colors
            ${config.timedMode ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}
            ${isGameActive ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <span
            className={`
              absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
              ${config.timedMode ? 'translate-x-5' : ''}
            `}
          />
        </button>
      </div>
    </div>
  );
};
