'use client';

import React, { useState, useCallback } from 'react';
import { Board } from '@/components/board';
import { BoardPosition, createInitialBoard } from '@/lib/draughts-types';

interface ReplayMove {
  notation: string;
  positionAfter: BoardPosition;
  player: string;
}

export interface ReplayViewerProps {
  moves: ReplayMove[];
  whitePlayer: string;
  blackPlayer: string;
  result: string;
  date: string;
}

export const ReplayViewer: React.FC<ReplayViewerProps> = ({
  moves,
  whitePlayer,
  blackPlayer,
  result,
  date,
}) => {
  const [currentIndex, setCurrentIndex] = useState(-1);

  const currentPosition = currentIndex >= 0 && currentIndex < moves.length
    ? moves[currentIndex].positionAfter
    : createInitialBoard();

  const goToStart = useCallback(() => setCurrentIndex(-1), []);
  const goToEnd = useCallback(() => setCurrentIndex(moves.length - 1), [moves.length]);
  const goForward = useCallback(() => setCurrentIndex((i) => Math.min(i + 1, moves.length - 1)), [moves.length]);
  const goBack = useCallback(() => setCurrentIndex((i) => Math.max(i - 1, -1)), []);

  // Group moves into pairs
  const movePairs: { number: number; white: string; black?: string }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      number: Math.floor(i / 2) + 1,
      white: moves[i].notation,
      black: moves[i + 1]?.notation,
    });
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-5xl mx-auto">
      {/* Board */}
      <div className="flex-1">
        <Board position={currentPosition} showNotation={true} />
        
        {/* Playback controls */}
        <div className="flex justify-center gap-2 mt-4" role="toolbar" aria-label="Replay controls">
          <button
            onClick={goToStart}
            disabled={currentIndex === -1}
            className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            aria-label="Go to start"
          >
            ⏮
          </button>
          <button
            onClick={goBack}
            disabled={currentIndex === -1}
            className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            aria-label="Previous move"
          >
            ◀
          </button>
          <button
            onClick={goForward}
            disabled={currentIndex === moves.length - 1}
            className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            aria-label="Next move"
          >
            ▶
          </button>
          <button
            onClick={goToEnd}
            disabled={currentIndex === moves.length - 1}
            className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            aria-label="Go to end"
          >
            ⏭
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="w-full lg:w-72 space-y-4">
        {/* Game info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Game Info</h3>
          <div className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
            <div>⚪ {whitePlayer}</div>
            <div>⚫ {blackPlayer}</div>
            <div className="font-medium text-gray-900 dark:text-gray-100">Result: {result}</div>
            <div>{date}</div>
          </div>
        </div>

        {/* Move list */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 max-h-64 overflow-y-auto">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Moves</h3>
          <table className="w-full text-sm font-mono">
            <tbody>
              {movePairs.map((pair) => (
                <tr key={pair.number} className="hover:bg-gray-100 dark:hover:bg-gray-700">
                  <td className="text-gray-400 pr-2 w-8">{pair.number}.</td>
                  <td
                    className={`px-1 cursor-pointer ${currentIndex === (pair.number - 1) * 2 ? 'bg-blue-100 dark:bg-blue-900 rounded' : ''}`}
                    onClick={() => setCurrentIndex((pair.number - 1) * 2)}
                  >
                    {pair.white}
                  </td>
                  <td
                    className={`px-1 cursor-pointer ${pair.black && currentIndex === (pair.number - 1) * 2 + 1 ? 'bg-blue-100 dark:bg-blue-900 rounded' : ''}`}
                    onClick={() => pair.black && setCurrentIndex((pair.number - 1) * 2 + 1)}
                  >
                    {pair.black ?? ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </aside>
    </div>
  );
};
