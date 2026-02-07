'use client';

import React from 'react';
import { useGameStore } from '@/stores/game-store';
import { PlayerColor } from '@/lib/draughts-types';

/**
 * Displays current game status: turn indicator, game result, move count.
 */
export const GameStatus: React.FC = () => {
  const { phase, currentTurn, moveHistory, isPaused } = useGameStore();

  const getStatusText = (): string => {
    switch (phase) {
      case 'not-started':
        return 'Ready to start';
      case 'in-progress':
        if (isPaused) return 'Game paused';
        return `${currentTurn === PlayerColor.White ? 'White' : 'Black'}'s turn`;
      case 'white-wins':
        return 'White wins!';
      case 'black-wins':
        return 'Black wins!';
      case 'draw':
        return 'Game drawn';
      default:
        return '';
    }
  };

  const getTurnIndicatorColor = (): string => {
    if (phase !== 'in-progress') return 'bg-gray-400';
    return currentTurn === PlayerColor.White ? 'bg-amber-100 border-amber-300' : 'bg-gray-800 border-gray-600';
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-lg" role="status" aria-live="polite">
      <div className="flex items-center gap-2">
        {phase === 'in-progress' && (
          <div className={`w-4 h-4 rounded-full border-2 ${getTurnIndicatorColor()}`} aria-hidden="true" />
        )}
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {getStatusText()}
        </span>
      </div>
      
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {moveHistory.length > 0 && (
          <span>Move {Math.ceil(moveHistory.length / 2)}</span>
        )}
      </div>
    </div>
  );
};
