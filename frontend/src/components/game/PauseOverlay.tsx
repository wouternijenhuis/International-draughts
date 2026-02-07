'use client';

import React from 'react';
import { useGameStore } from '@/stores/game-store';

/**
 * Full-screen overlay when game is paused.
 * Covers the board to prevent cheating during pause.
 */
export const PauseOverlay: React.FC = () => {
  const { isPaused, phase, togglePause } = useGameStore();

  if (!isPaused || phase !== 'in-progress') return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center"
      role="dialog"
      aria-label="Game paused"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-center max-w-sm mx-4">
        <div className="text-4xl mb-4">⏸️</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Game Paused</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          The board is hidden to prevent unfair analysis.
        </p>
        <button
          onClick={togglePause}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-lg transition-colors"
          autoFocus
        >
          ▶ Resume Game
        </button>
      </div>
    </div>
  );
};
