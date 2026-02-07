'use client';

import React from 'react';
import { useGameStore } from '@/stores/game-store';

/**
 * Game control buttons: New Game, Resign, Undo, Redo, Draw, Pause.
 */
export const GameControls: React.FC = () => {
  const {
    phase,
    isPaused,
    moveIndex,
    moveHistory,
    startGame,
    resign,
    offerDraw,
    undoMove,
    redoMove,
    togglePause,
    resetGame,
  } = useGameStore();

  const isInProgress = phase === 'in-progress';
  const canUndo = isInProgress && moveIndex >= 0;
  const canRedo = isInProgress && moveIndex < moveHistory.length - 1;

  return (
    <div className="flex flex-wrap gap-2 justify-center mt-4" role="toolbar" aria-label="Game controls">
      {phase === 'not-started' && (
        <button
          onClick={() => startGame()}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          aria-label="Start new game"
        >
          New Game
        </button>
      )}
      
      {isInProgress && (
        <>
          <button
            onClick={togglePause}
            className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm transition-colors"
            aria-label={isPaused ? 'Resume game' : 'Pause game'}
          >
            {isPaused ? '▶ Resume' : '⏸ Pause'}
          </button>
          
          <button
            onClick={undoMove}
            disabled={!canUndo}
            className="px-3 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
            aria-label="Undo last move"
          >
            ↩ Undo
          </button>
          
          <button
            onClick={redoMove}
            disabled={!canRedo}
            className="px-3 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
            aria-label="Redo move"
          >
            ↪ Redo
          </button>
          
          <button
            onClick={offerDraw}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            aria-label="Offer draw"
          >
            ½ Draw
          </button>
          
          <button
            onClick={resign}
            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
            aria-label="Resign game"
          >
            🏳 Resign
          </button>
        </>
      )}
      
      {(phase === 'white-wins' || phase === 'black-wins' || phase === 'draw') && (
        <button
          onClick={resetGame}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          aria-label="Start new game"
        >
          New Game
        </button>
      )}
    </div>
  );
};
