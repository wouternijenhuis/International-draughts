'use client';

import React from 'react';
import { PlayerColor } from '@/lib/draughts-types';
import { squareToCoordinate } from '@/lib/draughts-types';
import { BoardPiece } from './BoardPiece';
import type { AnimationOverlay } from '@/hooks/useMoveAnimation';

/** Props for the AnimatedPieceOverlay component */
export interface AnimatedPieceOverlayProps {
  /** Animation overlay data from useMoveAnimation */
  readonly overlay: AnimationOverlay;
  /** Board orientation for positioning captured piece ghosts */
  readonly orientation: PlayerColor;
  /** Callback when the sliding transition completes a leg */
  readonly onTransitionEnd: () => void;
}

/**
 * Converts a square number to visual grid coordinates, accounting for orientation.
 */
function toVisualCoord(square: number, orientation: PlayerColor): { row: number; col: number } {
  const coord = squareToCoordinate(square);
  if (orientation === PlayerColor.White) {
    return { row: 9 - coord.row, col: 9 - coord.col };
  }
  return coord;
}

/**
 * Renders the animation overlay for a moving piece and captured piece ghosts.
 *
 * The overlay is absolutely positioned over the board container and contains:
 * 1. A sliding piece that moves from source to destination via CSS transitions
 * 2. Captured piece ghosts that fade out during the animation
 *
 * Must be rendered as a child of the board container div (position: relative).
 */
export const AnimatedPieceOverlay: React.FC<AnimatedPieceOverlayProps> = ({
  overlay,
  orientation,
  onTransitionEnd,
}) => {
  return (
    <>
      {/* Sliding animated piece */}
      <div
        className="absolute pointer-events-none z-30 flex items-center justify-center"
        style={{
          width: '10%',
          height: '10%',
          left: overlay.baseLeft,
          top: overlay.baseTop,
          transform: overlay.transform,
          transition: overlay.transition,
          willChange: 'transform',
        }}
        onTransitionEnd={(e) => {
          // Only respond to our own transform transition, not child transitions
          if (e.propertyName === 'transform' && e.currentTarget === e.target) {
            onTransitionEnd();
          }
        }}
      >
        <BoardPiece piece={overlay.piece} />
      </div>

      {/* Captured piece ghosts (fade out) */}
      {overlay.capturedGhosts.map((ghost) => {
        const coord = toVisualCoord(ghost.square, orientation);
        return (
          <div
            key={ghost.square}
            className="absolute pointer-events-none z-20 flex items-center justify-center"
            style={{
              width: '10%',
              height: '10%',
              left: `${coord.col * 10}%`,
              top: `${coord.row * 10}%`,
              animation: `capturedFade ${overlay.totalDurationMs}ms ease-out forwards`,
            }}
          >
            <BoardPiece piece={ghost.piece} />
          </div>
        );
      })}
    </>
  );
};
