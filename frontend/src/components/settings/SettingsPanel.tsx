'use client';

import React from 'react';
import { useGameStore } from '@/stores/game-store';
import type { GameConfig } from '@/stores/game-store';
import { PlayerColor } from '@/lib/draughts-types';

const THEMES: { value: GameConfig['boardTheme']; label: string }[] = [
  { value: 'classic-wood', label: 'Classic Wood' },
  { value: 'dark', label: 'Dark' },
  { value: 'ocean', label: 'Ocean' },
  { value: 'tournament-green', label: 'Tournament Green' },
];

const DIFFICULTIES = [
  { value: 'easy', label: 'Easy', description: 'Great for beginners' },
  { value: 'medium', label: 'Medium', description: 'A fair challenge' },
  { value: 'hard', label: 'Hard', description: 'Strong local engine' },
  { value: 'expert', label: 'Expert', description: 'Server-side AI — strongest' },
] as const;

const CLOCK_PRESETS = [
  { value: 'blitz-3+2', label: 'Blitz 3+2' },
  { value: 'blitz-5+5', label: 'Blitz 5+5' },
  { value: 'rapid-10+0', label: 'Rapid 10+0' },
  { value: 'rapid-15+10', label: 'Rapid 15+10' },
  { value: 'classical-30+0', label: 'Classical 30+0' },
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

      {/* AI Difficulty */}
      {config.opponent === 'ai' && (
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
                title={diff.description}
              >
                {diff.label}
              </button>
            ))}
          </div>
          {isGameActive && (
            <p className="text-xs text-gray-500 mt-1">Cannot change during active game</p>
          )}
        </fieldset>
      )}

      {/* Player Color */}
      <fieldset disabled={isGameActive}>
        <legend className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Play As</legend>
        <div className="flex gap-2">
          <button
            onClick={() => setConfig({ playerColor: PlayerColor.White })}
            className={`
              flex-1 px-3 py-2 rounded-lg text-sm border transition-colors
              ${config.playerColor === PlayerColor.White
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}
              ${isGameActive ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            aria-pressed={config.playerColor === PlayerColor.White}
          >
            ⚪ White
          </button>
          <button
            onClick={() => setConfig({ playerColor: PlayerColor.Black })}
            className={`
              flex-1 px-3 py-2 rounded-lg text-sm border transition-colors
              ${config.playerColor === PlayerColor.Black
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}
              ${isGameActive ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            aria-pressed={config.playerColor === PlayerColor.Black}
          >
            ⚫ Black
          </button>
        </div>
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
            🤖 vs AI
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
            👥 vs Human
          </button>
        </div>
      </fieldset>

      {/* Timed Mode */}
      <div className="space-y-2">
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

        {/* Clock Preset (only when timed mode is on) */}
        {config.timedMode && (
          <fieldset disabled={isGameActive}>
            <legend className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Time Control</legend>
            <div className="grid grid-cols-2 gap-1.5">
              {CLOCK_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setConfig({ clockPreset: preset.value })}
                  className={`
                    px-2 py-1.5 rounded text-xs border transition-colors
                    ${config.clockPreset === preset.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}
                    ${isGameActive ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  aria-pressed={config.clockPreset === preset.value}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </fieldset>
        )}
      </div>

      {/* Animation Speed */}
      <fieldset>
        <legend className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Animation Speed</legend>
        <div className="flex gap-2">
          {(['fast', 'normal', 'slow'] as const).map((speed) => (
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
