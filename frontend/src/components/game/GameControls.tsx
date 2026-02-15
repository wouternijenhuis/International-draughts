'use client';

import React from 'react';
import { useGameStore } from '@/stores/game-store';

/**
 * Game control buttons: New Game, Resign, Undo, Redo (learning only), Hint (learning only), Draw, Pause.
 */
export const GameControls: React.FC = () => {
  const {
    phase,
    isPaused,
    moveIndex,
    moveHistory,
    isAiThinking,
    config,
    startGame,
    resign,
    offerDraw,
    undoMove,
    redoMove,
    togglePause,
    resetGame,
    showHint,
    hintSquares,
    clearHint,
  } = useGameStore();

  const isInProgress = phase === 'in-progress';
  const canUndo = isInProgress && moveIndex >= 0 && !isAiThinking;
  const canRedo = isInProgress && moveIndex < moveHistory.length - 1 && !isAiThinking;
  const canInteract = isInProgress && !isAiThinking;
  const isLearning = config.gameMode === 'learning';

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
            disabled={isAiThinking}
            className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
            aria-label={isPaused ? 'Resume game' : 'Pause game'}
          >
            {isPaused ? '▶ Resume' : '⏸ Pause'}
          </button>
          
          <button
            onClick={undoMove}
            disabled={!canUndo}
            className="px-3 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
            aria-label={config.opponent === 'ai' ? 'Undo your last move' : 'Undo last move'}
          >
            ↩ Undo
          </button>
          
          {/* Redo only available in Learning mode */}
          {isLearning && (
            <button
              onClick={redoMove}
              disabled={!canRedo}
              className="px-3 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
              aria-label="Redo move"
            >
              ↪ Redo
            </button>
          )}

          {/* Hint only available in Learning mode */}
          {isLearning && (
            <button
              onClick={hintSquares.length > 0 ? clearHint : showHint}
              disabled={!canInteract}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                hintSquares.length > 0
                  ? 'bg-purple-700 hover:bg-purple-800 text-white'
                  : 'bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed text-white'
              }`}
              aria-label={hintSquares.length > 0 ? 'Clear hint' : 'Show hint'}
            >
              {hintSquares.length > 0 ? '💡 Hide Hint' : '💡 Hint'}
            </button>
          )}
          
          <button
            onClick={offerDraw}
            disabled={!canInteract}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
            aria-label="Offer draw"
          >
            ½ Draw
          </button>
          
          <button
            onClick={resign}
            disabled={isAiThinking}
            className="px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
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
