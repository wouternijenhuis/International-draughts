import { Move } from './move';

/**
 * Formats a move in FMJD notation.
 * Quiet moves: "32-28"
 * Captures: "19x30" (single) or "19x10x3" (multi-jump)
 */
export const formatMoveNotation = (move: Move): string => {
  if (move.type === 'quiet') {
    return `${move.from}-${move.to}`;
  }

  const squares = [move.steps[0]!.from, ...move.steps.map(s => s.to)];
  return squares.join('x');
};

/**
 * Parses a move notation string.
 * Returns the type ('quiet' or 'capture') and the square numbers involved.
 */
export const parseMoveNotation = (notation: string): { type: 'quiet' | 'capture'; squares: number[] } => {
  if (notation.includes('x')) {
    const squares = notation.split('x').map(Number);
    if (squares.some(isNaN)) {
      throw new Error(`Invalid capture notation: ${notation}`);
    }
    return { type: 'capture', squares };
  }

  if (notation.includes('-')) {
    const squares = notation.split('-').map(Number);
    if (squares.length !== 2 || squares.some(isNaN)) {
      throw new Error(`Invalid quiet move notation: ${notation}`);
    }
    return { type: 'quiet', squares };
  }

  throw new Error(`Invalid notation format: ${notation}`);
};
