/**
 * GameConfigSummary — Compact display of the current game configuration.
 *
 * Shows opponent type, difficulty (if AI), player color, and time control
 * in a single muted line. Purely informational and non-interactive.
 *
 * @module GameConfigSummary
 */

'use client';

import React from 'react';
import { useGameStore } from '@/stores/game-store';
import { PlayerColor } from '@/lib/draughts-types';

/** Human-readable labels for clock preset identifiers. */
const CLOCK_PRESET_LABELS: Record<string, string> = {
  'blitz-3+2': 'Blitz 3+2',
  'blitz-5+5': 'Blitz 5+5',
  'rapid-10+0': 'Rapid 10+0',
  'rapid-15+10': 'Rapid 15+10',
  'classical-30+0': 'Classical 30+0',
  'classical-60+30': 'Classical 60+30',
};

/**
 * Renders a compact one-line summary of the active game's configuration.
 *
 * Only renders content when the game phase is 'in-progress'.
 */
export const GameConfigSummary: React.FC = () => {
  const { config, phase } = useGameStore();

  if (phase !== 'in-progress') return null;

  const parts: string[] = [];

  // Opponent
  if (config.opponent === 'ai') {
    const difficulty = config.aiDifficulty.charAt(0).toUpperCase() + config.aiDifficulty.slice(1);
    parts.push(`🤖 ${difficulty} AI`);
  } else {
    parts.push('👥 vs Human');
  }

  // Player color
  const colorLabel = config.playerColor === PlayerColor.White ? '⚪ White' : '⚫ Black';
  parts.push(colorLabel);

  // Time control
  if (config.timedMode) {
    const presetLabel = CLOCK_PRESET_LABELS[config.clockPreset] ?? config.clockPreset;
    parts.push(`⏱ ${presetLabel}`);
  } else {
    parts.push('Untimed');
  }

  return (
    <div
      className="text-xs text-gray-500 dark:text-gray-400 text-center py-1"
      aria-label={`Game configuration: ${parts.join(', ')}`}
    >
      {parts.join(' · ')}
    </div>
  );
};
