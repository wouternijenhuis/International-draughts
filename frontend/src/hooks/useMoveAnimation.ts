'use client';

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { BoardPosition, Piece } from '@/lib/draughts-types';
import { PlayerColor, squareToCoordinate } from '@/lib/draughts-types';
import type { MoveRecord } from '@/stores/game-store';

/** Animation speed options */
export type AnimationSpeed = 'instant' | 'fast' | 'normal' | 'slow';

/** Duration in milliseconds per diagonal square traversed */
const SPEED_MS: Record<AnimationSpeed, number> = {
  instant: 0,
  fast: 100,
  normal: 250,
  slow: 500,
};

/** Info about a captured piece to render as a fading overlay */
export interface CapturedPieceGhost {
  /** FMJD square number of the captured piece */
  readonly square: number;
  /** The captured piece data */
  readonly piece: Piece;
}

/** Current animation overlay state */
export interface AnimationOverlay {
  /** The piece being animated */
  readonly piece: Piece;
  /** CSS left position (percentage) of the animation start */
  readonly baseLeft: string;
  /** CSS top position (percentage) of the animation start */
  readonly baseTop: string;
  /** Current CSS transform value (translate) */
  readonly transform: string;
  /** Current CSS transition value */
  readonly transition: string;
  /** FMJD square number to hide in the static board (destination) */
  readonly hideSquare: number;
  /** Captured pieces to show as fading ghost overlays */
  readonly capturedGhosts: readonly CapturedPieceGhost[];
  /** Total animation duration in ms (used for captured piece fade timing) */
  readonly totalDurationMs: number;
}

/** Result returned by the useMoveAnimation hook */
export interface UseMoveAnimationResult {
  /** Modified board position with animated piece's destination hidden during animation */
  readonly displayPosition: BoardPosition;
  /** Animation overlay data, or null when not animating */
  readonly overlay: AnimationOverlay | null;
  /** Callback to invoke on CSS transitionend for the animated piece */
  readonly onTransitionEnd: () => void;
  /** Whether an animation is currently in progress */
  readonly isAnimating: boolean;
}

/** Detected move from comparing two board positions */
interface DetectedMove {
  readonly from: number;
  readonly to: number;
  readonly piece: Piece;
  readonly capturedPieces: readonly CapturedPieceGhost[];
}

/**
 * Converts an FMJD square number to visual grid coordinates,
 * accounting for board orientation.
 */
function toVisualCoord(square: number, orientation: PlayerColor): { row: number; col: number } {
  const coord = squareToCoordinate(square);
  if (orientation === PlayerColor.White) {
    return { row: 9 - coord.row, col: 9 - coord.col };
  }
  return coord;
}

/**
 * Calculates the diagonal distance (in squares) between two FMJD square numbers.
 * Since pieces move diagonally, this equals the absolute row difference.
 */
function diagDist(from: number, to: number): number {
  const a = squareToCoordinate(from);
  const b = squareToCoordinate(to);
  return Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col));
}

/**
 * Parses a move notation string into the path of squares visited.
 * Quiet move: "28-33" → [28, 33]
 * Capture: "28x37x46" → [28, 37, 46]
 */
function parsePath(notation: string): number[] {
  const sep = notation.includes('x') ? 'x' : '-';
  return notation.split(sep).map(Number).filter(n => !isNaN(n) && n >= 1 && n <= 50);
}

/**
 * Detects a single-piece move by comparing two board positions.
 * Returns null if the change is ambiguous (e.g., multi-move undo in AI games)
 * or if no clear single-piece movement is found.
 */
function detectMove(oldPos: BoardPosition, newPos: BoardPosition): DetectedMove | null {
  const disappeared: { sq: number; piece: Piece }[] = [];
  const appeared: { sq: number; piece: Piece }[] = [];

  for (let sq = 1; sq <= 50; sq++) {
    const old = oldPos[sq] as Piece | null;
    const cur = newPos[sq] as Piece | null;
    if (old && !cur) {
      disappeared.push({ sq, piece: old });
    } else if (!old && cur) {
      appeared.push({ sq, piece: cur });
    } else if (old && cur && (old.color !== cur.color || old.type !== cur.type)) {
      disappeared.push({ sq, piece: old });
      appeared.push({ sq, piece: cur });
    }
  }

  // Count same-color moved pairs — only animate if exactly 1
  let pairs = 0;
  let mainFrom: { sq: number; piece: Piece } | null = null;
  let mainTo: { sq: number; piece: Piece } | null = null;

  for (const d of disappeared) {
    for (const a of appeared) {
      if (d.piece.color === a.piece.color) {
        pairs++;
        mainFrom = d;
        mainTo = a;
      }
    }
  }

  if (pairs !== 1 || !mainFrom || !mainTo) return null;

  const capturedPieces = disappeared
    .filter(d => d !== mainFrom)
    .map(d => ({ square: d.sq, piece: d.piece }));

  return { from: mainFrom.sq, to: mainTo.sq, piece: mainTo.piece, capturedPieces };
}

/**
 * Hook that manages piece movement animation on the draughts board.
 *
 * Detects position changes (from any source: click-to-move, AI, undo, redo)
 * and provides overlay data for rendering a smoothly sliding animated piece.
 * Uses `useLayoutEffect` to set up animation state before the browser paints,
 * avoiding visual flicker.
 *
 * @param position - Current board position from the store
 * @param moveHistory - Full move history from the store
 * @param moveIndex - Current move index in history
 * @param animationSpeed - Selected animation speed
 * @param orientation - Board orientation (which color is at the bottom)
 * @returns Animation state including display position and overlay data
 */
export function useMoveAnimation(
  position: BoardPosition,
  moveHistory: readonly MoveRecord[],
  moveIndex: number,
  animationSpeed: AnimationSpeed,
  orientation: PlayerColor,
): UseMoveAnimationResult {
  const prevPositionRef = useRef<BoardPosition>(position);
  const prevMoveIndexRef = useRef<number>(moveIndex);
  const legsRef = useRef<{ transform: string; durationMs: number }[]>([]);
  const orientationRef = useRef(orientation);
  orientationRef.current = orientation;
  const speedRef = useRef(animationSpeed);
  speedRef.current = animationSpeed;

  const [overlay, setOverlay] = useState<AnimationOverlay | null>(null);
  const overlayRef = useRef<AnimationOverlay | null>(null);

  // Keep overlayRef in sync for use in callbacks
  overlayRef.current = overlay;

  // Detect position changes and start animation (runs before browser paint)
  useLayoutEffect(() => {
    const prev = prevPositionRef.current;
    const prevIdx = prevMoveIndexRef.current;
    prevPositionRef.current = position;
    prevMoveIndexRef.current = moveIndex;

    // No animation for instant speed
    if (animationSpeed === 'instant') {
      if (overlayRef.current) setOverlay(null);
      return;
    }

    // No change in position reference
    if (prev === position) return;

    // Detect the move from before/after positions
    const move = detectMove(prev, position);
    if (!move) {
      // Can't determine move (ambiguous or reset) — skip animation
      if (overlayRef.current) setOverlay(null);
      return;
    }

    // Determine the full path from notation
    let path = [move.from, move.to];
    const isUndo = moveIndex < prevIdx;
    const diffCount = Math.abs(moveIndex - prevIdx);

    if (diffCount === 1) {
      const notationIdx = isUndo ? prevIdx : moveIndex;
      const record = moveHistory[notationIdx];
      if (record) {
        const parsed = parsePath(record.notation);
        if (parsed.length >= 2) {
          path = isUndo ? [...parsed].reverse() : parsed;
        }
      }
    }

    // Ensure path endpoints match detected move
    if (path[0] !== move.from || path[path.length - 1] !== move.to) {
      path = [move.from, move.to];
    }

    // Build animation legs from the path
    const ori = orientationRef.current;
    const speed = speedRef.current;
    const startCoord = toVisualCoord(path[0]!, ori);
    const legs: { transform: string; durationMs: number }[] = [];

    for (let i = 0; i < path.length - 1; i++) {
      const legEndCoord = toVisualCoord(path[i + 1]!, ori);
      const dx = (legEndCoord.col - startCoord.col) * 100;
      const dy = (legEndCoord.row - startCoord.row) * 100;
      const dist = diagDist(path[i]!, path[i + 1]!);
      legs.push({
        transform: `translate(${dx}%, ${dy}%)`,
        durationMs: Math.max(dist * SPEED_MS[speed], 50),
      });
    }

    // Store remaining legs (after the first) for sequential playback
    legsRef.current = legs.slice(1);

    const totalDuration = legs.reduce((sum, l) => sum + l.durationMs, 0);

    setOverlay({
      piece: move.piece,
      baseLeft: `${startCoord.col * 10}%`,
      baseTop: `${startCoord.row * 10}%`,
      transform: 'translate(0%, 0%)',
      transition: 'none',
      hideSquare: move.to,
      capturedGhosts: move.capturedPieces,
      totalDurationMs: totalDuration,
    });

    // Trigger the first leg's transition on the next animation frame
    // (CSS transition requires the initial value to be painted first)
    requestAnimationFrame(() => {
      if (legs.length > 0) {
        setOverlay(prev => prev ? {
          ...prev,
          transform: legs[0]!.transform,
          transition: `transform ${legs[0]!.durationMs}ms ease-in-out`,
        } : null);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, moveIndex]);

  /**
   * Handles the end of a CSS transition leg.
   * Advances to the next leg or completes the animation.
   */
  const onTransitionEnd = useCallback(() => {
    const remaining = legsRef.current;
    if (remaining.length > 0) {
      const nextLeg = remaining[0]!;
      legsRef.current = remaining.slice(1);
      setOverlay(prev => prev ? {
        ...prev,
        transform: nextLeg.transform,
        transition: `transform ${nextLeg.durationMs}ms ease-in-out`,
      } : null);
    } else {
      setOverlay(null);
    }
  }, []);

  // Build the display position: hide the destination piece during animation
  const displayPosition = useMemo(() => {
    if (!overlay) return position;
    const pos = [...position] as (Piece | null)[];
    pos[overlay.hideSquare] = null;
    return pos as BoardPosition;
  }, [position, overlay]);

  return {
    displayPosition,
    overlay,
    onTransitionEnd,
    isAnimating: overlay !== null,
  };
}
