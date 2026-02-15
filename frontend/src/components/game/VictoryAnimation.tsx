'use client';

import React, { useEffect, useRef, useCallback, useReducer } from 'react';
import { useGameStore } from '@/stores/game-store';
import { PlayerColor } from '@/lib/draughts-types';

/** Diameter of each animated piece in pixels. */
const PIECE_DIAMETER = 40;
/** Radius of each animated piece in pixels. */
const PIECE_RADIUS = PIECE_DIAMETER / 2;
/** Gravitational acceleration applied each frame. */
const GRAVITY = 0.3;
/** Energy retained after a bounce (0–1). */
const BOUNCE_DAMPING = 0.7;
/** Interval (ms) between spawning new pieces. */
const SPAWN_INTERVAL_MS = 200;
/** Maximum number of simultaneous animated pieces. */
const MAX_PIECES = 50;
/** Total duration (ms) of the animation before fade-out begins. */
const TOTAL_DURATION_MS = 8000;
/** Duration (ms) of the final fade-out. */
const FADE_DURATION_MS = 1000;
/** Alpha used per frame to create the ghost trail effect. */
const TRAIL_ALPHA = 0.03;

/** Reducer action type for the animation state. */
type AnimationAction = { type: 'dismiss' } | { type: 'show'; phase: string };

/** Reducer state for tracking dismissal across game phases. */
interface AnimationState {
  /** Whether the animation has been dismissed by the user or auto-completion. */
  dismissed: boolean;
  /** The game phase when the animation was last shown, used to detect phase changes. */
  trackedPhase: string | null;
}

/**
 * Reducer for animation visibility state.
 * Handles dismiss and show actions. Reset happens automatically when
 * a new winning phase is detected (different from the previously tracked phase).
 */
function animationReducer(state: AnimationState, action: AnimationAction): AnimationState {
  switch (action.type) {
    case 'dismiss':
      return { ...state, dismissed: true };
    case 'show':
      // If the phase changed, reset dismissed so the animation plays again
      if (state.trackedPhase !== action.phase) {
        return { dismissed: false, trackedPhase: action.phase };
      }
      return state;
    default:
      return state;
  }
}

/**
 * Represents a single animated draught piece cascading across the screen.
 */
interface AnimatedPiece {
  /** Current horizontal position. */
  x: number;
  /** Current vertical position. */
  y: number;
  /** Horizontal velocity (pixels per frame). */
  vx: number;
  /** Vertical velocity (pixels per frame). */
  vy: number;
  /** Whether this piece is a "white" piece (amber) or "black" piece (gray). */
  isWhite: boolean;
  /** Whether this piece displays a king crown. */
  isKing: boolean;
}

/**
 * Draws a single draught piece on the canvas context.
 * @param ctx - The 2D canvas rendering context.
 * @param piece - The animated piece to draw.
 */
function drawPiece(ctx: CanvasRenderingContext2D, piece: AnimatedPiece): void {
  const { x, y, isWhite, isKing } = piece;

  ctx.save();

  // Outer border circle
  ctx.beginPath();
  ctx.arc(x, y, PIECE_RADIUS, 0, Math.PI * 2);
  if (isWhite) {
    ctx.fillStyle = '#fcd34d'; // amber-300 border
  } else {
    ctx.fillStyle = '#4b5563'; // gray-600 border
  }
  ctx.fill();

  // Inner gradient circle
  const gradient = ctx.createRadialGradient(
    x - PIECE_RADIUS * 0.3,
    y - PIECE_RADIUS * 0.3,
    PIECE_RADIUS * 0.1,
    x,
    y,
    PIECE_RADIUS * 0.85,
  );

  if (isWhite) {
    gradient.addColorStop(0, '#fffbeb'); // amber-50
    gradient.addColorStop(1, '#fde68a'); // amber-200
  } else {
    gradient.addColorStop(0, '#374151'); // gray-700
    gradient.addColorStop(1, '#111827'); // gray-900
  }

  ctx.beginPath();
  ctx.arc(x, y, PIECE_RADIUS * 0.85, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  // King crown
  if (isKing) {
    drawCrown(ctx, x, y, isWhite);
  }

  ctx.restore();
}

/**
 * Draws a small crown icon on a king piece.
 * @param ctx - The 2D canvas rendering context.
 * @param cx - Center X of the piece.
 * @param cy - Center Y of the piece.
 * @param isWhite - Whether the piece is white (affects crown color).
 */
function drawCrown(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  isWhite: boolean,
): void {
  const scale = PIECE_DIAMETER / 48; // Crown designed for 24-unit viewbox, scaled
  ctx.save();
  ctx.translate(cx - 12 * scale, cy - 12 * scale);
  ctx.scale(scale, scale);

  ctx.beginPath();
  // Crown path: M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z
  ctx.moveTo(5, 16);
  ctx.lineTo(3, 5);
  ctx.lineTo(8.5, 10);
  ctx.lineTo(12, 4);
  ctx.lineTo(15.5, 10);
  ctx.lineTo(21, 5);
  ctx.lineTo(19, 16);
  ctx.closePath();

  ctx.fillStyle = isWhite ? '#b45309' : '#fbbf24'; // amber-700 on white, amber-400 on black
  ctx.fill();
  ctx.strokeStyle = isWhite ? '#92400e' : '#f59e0b';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  ctx.restore();
}

/**
 * Creates a new animated piece at a random position along the top of the canvas.
 * @param canvasWidth - Width of the canvas.
 * @param index - Sequential index of the piece (used for alternating colors).
 * @returns A new AnimatedPiece.
 */
function spawnPiece(canvasWidth: number, index: number): AnimatedPiece {
  return {
    x: Math.random() * (canvasWidth - PIECE_DIAMETER) + PIECE_RADIUS,
    y: -PIECE_RADIUS,
    vx: (Math.random() - 0.5) * 8, // random(-4, 4)
    vy: 0,
    isWhite: index % 2 === 0,
    isKing: index % 5 === 0, // every fifth piece is a king
  };
}

/**
 * Solitaire-style victory animation component.
 *
 * Renders a full-screen canvas overlay with draught pieces that cascade
 * and bounce across the screen, leaving ghost trails — inspired by the
 * classic Windows Solitaire winning animation.
 *
 * Only renders when the human player has won the game.
 * Auto-fades after ~8 seconds. Click/tap to dismiss early.
 */
export function VictoryAnimation(): React.ReactElement | null {
  const { phase, config } = useGameStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const spawnTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const piecesRef = useRef<AnimatedPiece[]>([]);
  const pieceIndexRef = useRef(0);
  const startTimeRef = useRef(0);
  const [state, dispatch] = useReducer(animationReducer, { dismissed: false, trackedPhase: null });

  const playerWon =
    (phase === 'white-wins' && config.playerColor === PlayerColor.White) ||
    (phase === 'black-wins' && config.playerColor === PlayerColor.Black);

  // Track phase changes: when player wins with a new phase value, reset dismissed
  useEffect(() => {
    if (playerWon) {
      dispatch({ type: 'show', phase });
    }
  }, [playerWon, phase]);

  const showAnimation = playerWon && !state.dismissed;

  /** Dismiss handler — allows the user to click/tap to close the animation early. */
  const handleDismiss = useCallback(() => {
    dispatch({ type: 'dismiss' });
  }, []);

  useEffect(() => {
    if (!showAnimation) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Size canvas to viewport
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Reset state
    piecesRef.current = [];
    pieceIndexRef.current = 0;
    startTimeRef.current = performance.now();

    // Clear canvas to fully transparent at start
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Spawn pieces on an interval
    spawnTimerRef.current = setInterval(() => {
      if (piecesRef.current.length < MAX_PIECES) {
        piecesRef.current.push(spawnPiece(canvas.width, pieceIndexRef.current));
        pieceIndexRef.current++;
      }
    }, SPAWN_INTERVAL_MS);

    /** Main animation loop. */
    const animate = (timestamp: number) => {
      const elapsed = timestamp - startTimeRef.current;

      // Stop after total duration + fade
      if (elapsed > TOTAL_DURATION_MS + FADE_DURATION_MS) {
        dispatch({ type: 'dismiss' });
        return;
      }

      // Trail effect: overlay a semi-transparent rectangle to fade previous frames
      ctx.fillStyle = `rgba(0, 0, 0, ${TRAIL_ALPHA})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw each piece
      for (const piece of piecesRef.current) {
        // Apply gravity
        piece.vy += GRAVITY;

        // Update position
        piece.x += piece.vx;
        piece.y += piece.vy;

        // Bounce off bottom
        if (piece.y + PIECE_RADIUS >= canvas.height) {
          piece.y = canvas.height - PIECE_RADIUS;
          piece.vy = -Math.abs(piece.vy) * BOUNCE_DAMPING;
        }

        // Bounce off sides (keep pieces on screen)
        if (piece.x - PIECE_RADIUS < 0) {
          piece.x = PIECE_RADIUS;
          piece.vx = Math.abs(piece.vx);
        } else if (piece.x + PIECE_RADIUS > canvas.width) {
          piece.x = canvas.width - PIECE_RADIUS;
          piece.vx = -Math.abs(piece.vx);
        }

        drawPiece(ctx, piece);
      }

      // Compute canvas opacity for fade-out
      if (elapsed > TOTAL_DURATION_MS) {
        const fadeProgress = (elapsed - TOTAL_DURATION_MS) / FADE_DURATION_MS;
        canvas.style.opacity = String(Math.max(0, 1 - fadeProgress));
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      if (spawnTimerRef.current) {
        clearInterval(spawnTimerRef.current);
        spawnTimerRef.current = null;
      }
      window.removeEventListener('resize', resize);
      canvas.style.opacity = '1';
    };
  }, [showAnimation]);

  if (!showAnimation) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      role="presentation"
      onClick={handleDismiss}
      onKeyDown={(e) => {
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
          handleDismiss();
        }
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 50,
        cursor: 'pointer',
        pointerEvents: 'auto',
      }}
    />
  );
}
