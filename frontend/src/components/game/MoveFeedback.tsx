'use client';

import React, { useEffect, useState } from 'react';
import { useGameStore } from '@/stores/game-store';

/**
 * Inner component that auto-dismisses after 3 seconds.
 * Remounted via key when message changes, resetting the timer.
 */
const FeedbackToast = ({ feedback, message }: { feedback: 'good' | 'neutral' | 'bad'; message: string }) => {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDismissed(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (dismissed) return null;

  const feedbackStyles = {
    good: 'bg-green-100 dark:bg-green-900 border-green-500 text-green-800 dark:text-green-200',
    neutral: 'bg-yellow-100 dark:bg-yellow-900 border-yellow-500 text-yellow-800 dark:text-yellow-200',
    bad: 'bg-red-100 dark:bg-red-900 border-red-500 text-red-800 dark:text-red-200',
  };

  const feedbackIcons = {
    good: '\u2705',
    neutral: '\uD83E\uDD14',
    bad: '\u274C',
  };

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-l-4 text-sm font-medium transition-all duration-300 ${feedbackStyles[feedback]}`}
      role="status"
      aria-live="polite"
    >
      <span className="text-lg" aria-hidden="true">{feedbackIcons[feedback]}</span>
      <span>{message}</span>
    </div>
  );
};

/**
 * Displays move quality feedback in learning mode.
 * Shows a brief toast-like indicator after each player move.
 */
export const MoveFeedback = (): React.ReactElement | null => {
  const { moveFeedback, moveFeedbackMessage, config } = useGameStore();

  if (!moveFeedback || config.gameMode !== 'learning') return null;

  return (
    <FeedbackToast
      key={moveFeedbackMessage}
      feedback={moveFeedback}
      message={moveFeedbackMessage ?? ''}
    />
  );
};
