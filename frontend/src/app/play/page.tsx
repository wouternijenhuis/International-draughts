'use client';

import { useState } from 'react';
import { GameBoard } from '@/components/game/GameBoard';
import { GameControls } from '@/components/game/GameControls';
import { GameStatus } from '@/components/game/GameStatus';
import { MoveHistory } from '@/components/game/MoveHistory';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { ChessClock } from '@/components/clock/ChessClock';
import { useGameStore } from '@/stores/game-store';

export default function PlayPage() {
  const { config, currentTurn, isPaused } = useGameStore();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Skip navigation link for accessibility */}
      <a
        href="#game-board"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg"
      >
        Skip to game board
      </a>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            International Draughts
          </h1>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label={showSettings ? 'Hide settings' : 'Show settings'}
            aria-expanded={showSettings}
          >
            <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </header>

        {/* Main content area — responsive grid */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left column: Board and controls */}
          <div className="flex-1 flex flex-col items-center" id="game-board">
            {/* Clock (above board on mobile) */}
            {config.timedMode && (
              <div className="w-full max-w-[600px] mb-4">
                <ChessClock
                  whiteTime={300000}
                  blackTime={300000}
                  activePlayer={currentTurn}
                  isPaused={isPaused}
                />
              </div>
            )}

            {/* Game Status */}
            <div className="w-full max-w-[600px] mb-4">
              <GameStatus />
            </div>

            {/* Board */}
            <GameBoard />

            {/* Controls */}
            <div className="w-full max-w-[600px]">
              <GameControls />
            </div>
          </div>

          {/* Right column: Move history and settings */}
          <aside className="w-full lg:w-80 space-y-4" aria-label="Game information">
            {/* Move History */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Moves</h2>
              <MoveHistory />
            </div>

            {/* Settings (collapsible on mobile) */}
            {showSettings && <SettingsPanel />}
          </aside>
        </div>
      </div>
    </main>
  );
}
