import { Piece } from './piece';

/** Valid FMJD square numbers (1-50) */
export type SquareNumber = number; // Validated at runtime to be 1-50

/** A square on the board: either empty or occupied by a piece */
export type Square = Piece | null;

/**
 * Board position using a flat array indexed by FMJD square number.
 * Index 0 is unused; indices 1-50 map to FMJD squares.
 */
export type BoardPosition = readonly Square[];

/** Row and column coordinates (0-based) on the 10x10 grid */
export interface BoardCoordinate {
  readonly row: number; // 0-9, top to bottom
  readonly col: number; // 0-9, left to right
}

/**
 * Validates that a number is a valid FMJD square number (1-50).
 */
export const isValidSquareNumber = (n: number): boolean =>
  Number.isInteger(n) && n >= 1 && n <= 50;

/**
 * Converts an FMJD square number (1-50) to board coordinates (row, col).
 *
 * FMJD numbering: Square 1 is at the top-right of the board from White's perspective.
 * Squares are numbered left to right, top to bottom, only on dark squares.
 *
 * Row 0 (top): squares 1-5    → cols 1,3,5,7,9
 * Row 1:       squares 6-10   → cols 0,2,4,6,8
 * Row 2:       squares 11-15  → cols 1,3,5,7,9
 * ...
 */
export const squareToCoordinate = (square: SquareNumber): BoardCoordinate => {
  if (!isValidSquareNumber(square)) {
    throw new Error(`Invalid square number: ${square}. Must be between 1 and 50.`);
  }
  const index = square - 1;
  const row = Math.floor(index / 5);
  const posInRow = index % 5;

  // Even rows (0,2,4,6,8): dark squares at odd columns (1,3,5,7,9)
  // Odd rows (1,3,5,7,9): dark squares at even columns (0,2,4,6,8)
  const col = row % 2 === 0 ? posInRow * 2 + 1 : posInRow * 2;

  return { row, col };
};

/**
 * Converts board coordinates (row, col) to an FMJD square number (1-50).
 * Returns null if the coordinate is not a playable dark square.
 */
export const coordinateToSquare = (coord: BoardCoordinate): SquareNumber | null => {
  const { row, col } = coord;
  if (row < 0 || row > 9 || col < 0 || col > 9) return null;

  // Check if it's a dark square
  const isEvenRow = row % 2 === 0;
  const isDarkSquare = isEvenRow ? col % 2 === 1 : col % 2 === 0;
  if (!isDarkSquare) return null;

  const posInRow = isEvenRow ? (col - 1) / 2 : col / 2;
  return row * 5 + posInRow + 1;
};

/**
 * Creates an empty board with 51 positions (index 0 unused).
 */
export const createEmptyBoard = (): Square[] => {
  return new Array(51).fill(null);
};
