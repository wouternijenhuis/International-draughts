'use client';

import React from 'react';
import { PlayerColor } from '@/lib/draughts-types';

export interface ClockDisplayProps {
  /** Time remaining in milliseconds */
  whiteTime: number;
  /** Time remaining in milliseconds */
  blackTime: number;
  /** Which player's clock is running */
  activePlayer: PlayerColor | null;
  /** Whether the clock is paused */
  isPaused: boolean;
  /** Low time threshold in ms (shows warning below this) */
  lowTimeThreshold?: number;
}

const formatTime = (ms: number): string => {
  if (ms <= 0) return '0:00';
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (ms < 10000) {
    // Show tenths for last 10 seconds
    const tenths = Math.floor((ms % 1000) / 100);
    return `${seconds}.${tenths}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const ChessClock: React.FC<ClockDisplayProps> = ({
  whiteTime,
  blackTime,
  activePlayer,
  isPaused,
  lowTimeThreshold = 30000,
}) => {
  const isWhiteLow = whiteTime <= lowTimeThreshold && whiteTime > 0;
  const isBlackLow = blackTime <= lowTimeThreshold && blackTime > 0;

  return (
    <div className="flex justify-between items-center gap-4 w-full" role="timer" aria-label="Game clock">
      <ClockFace
        label="White"
        timeMs={whiteTime}
        isActive={activePlayer === PlayerColor.White && !isPaused}
        isLow={isWhiteLow}
        colorClass="bg-amber-50 text-gray-900 border-amber-200"
      />
      <ClockFace
        label="Black"
        timeMs={blackTime}
        isActive={activePlayer === PlayerColor.Black && !isPaused}
        isLow={isBlackLow}
        colorClass="bg-gray-800 text-gray-100 border-gray-600"
      />
    </div>
  );
};

interface ClockFaceProps {
  label: string;
  timeMs: number;
  isActive: boolean;
  isLow: boolean;
  colorClass: string;
}

const ClockFace: React.FC<ClockFaceProps> = ({ label, timeMs, isActive, isLow, colorClass }) => {
  return (
    <div
      className={`
        flex-1 rounded-lg border-2 p-3 text-center transition-all duration-200
        ${colorClass}
        ${isActive ? 'ring-2 ring-green-500 shadow-lg scale-105' : 'opacity-80'}
        ${isLow ? 'animate-pulse' : ''}
      `}
      aria-label={`${label} clock: ${formatTime(timeMs)}`}
    >
      <div className="text-xs font-medium uppercase tracking-wider mb-1 opacity-70">
        {label}
      </div>
      <div className={`text-2xl font-mono font-bold tabular-nums ${isLow ? 'text-red-500' : ''}`}>
        {formatTime(timeMs)}
      </div>
    </div>
  );
};
