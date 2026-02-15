'use client';

import React from 'react';

export interface ResumePromptProps {
  /** When the saved game was last active */
  savedAt: Date;
  /** Game mode description (e.g., "vs AI (Medium)") */
  gameDescription: string;
  /** Number of moves played */
  moveCount: number;
  /** Called when user chooses to resume */
  onResume: () => void;
  /** Called when user declines to resume */
  onDiscard: () => void;
}

export const ResumePrompt: React.FC<ResumePromptProps> = ({
  savedAt,
  gameDescription,
  moveCount,
  onResume,
  onDiscard,
}) => {
  const timeAgo = getTimeAgo(savedAt);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-label="Resume saved game"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🔄</div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
            Resume Game?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            You have an unfinished game from {timeAgo}.
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Mode</span>
            <span className="text-gray-900 dark:text-gray-100 font-medium">{gameDescription}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Moves played</span>
            <span className="text-gray-900 dark:text-gray-100 font-medium">{moveCount}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onResume}
            className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-lg transition-colors focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
            autoFocus
          >
            ▶ Resume
          </button>
          <button
            onClick={onDiscard}
            className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
};

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
