'use client';

import React, { useRef, useEffect } from 'react';
import { useGameStore } from '@/stores/game-store';

/**
 * Displays the move history in notation format.
 */
export const MoveHistory: React.FC = () => {
  const { moveHistory, moveIndex } = useGameStore();
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest move
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [moveHistory.length]);

  if (moveHistory.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
        No moves yet
      </div>
    );
  }

  // Group moves into pairs (white + black)
  const movePairs: { number: number; white: string; black?: string }[] = [];
  for (let i = 0; i < moveHistory.length; i += 2) {
    movePairs.push({
      number: Math.floor(i / 2) + 1,
      white: moveHistory[i].notation,
      black: moveHistory[i + 1]?.notation,
    });
  }

  return (
    <div 
      ref={listRef}
      className="max-h-48 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm font-mono"
      role="log"
      aria-label="Move history"
    >
      <table className="w-full">
        <thead>
          <tr className="text-gray-500 dark:text-gray-400 text-xs">
            <th className="w-8 text-left">#</th>
            <th className="text-left">White</th>
            <th className="text-left">Black</th>
          </tr>
        </thead>
        <tbody>
          {movePairs.map((pair) => (
            <tr key={pair.number} className="hover:bg-gray-100 dark:hover:bg-gray-800">
              <td className="text-gray-400 pr-2">{pair.number}.</td>
              <td className={`px-1 ${moveIndex === (pair.number - 1) * 2 ? 'bg-blue-100 dark:bg-blue-900 rounded' : ''}`}>
                {pair.white}
              </td>
              <td className={`px-1 ${pair.black && moveIndex === (pair.number - 1) * 2 + 1 ? 'bg-blue-100 dark:bg-blue-900 rounded' : ''}`}>
                {pair.black ?? ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
