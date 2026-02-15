import { BoardPosition, Square } from '../types/board';
import { PieceType, PlayerColor } from '../types/piece';

/**
 * Gets the piece on a given square.
 */
export const getPiece = (board: BoardPosition, square: number): Square => {
  return board[square] ?? null;
};

/**
 * Checks if a square is empty.
 */
export const isEmpty = (board: BoardPosition, square: number): boolean => {
  return board[square] === null || board[square] === undefined;
};

/**
 * Checks if a square contains an enemy piece.
 */
export const isEnemy = (board: BoardPosition, square: number, color: PlayerColor): boolean => {
  const piece = board[square];
  return piece !== null && piece !== undefined && piece.color !== color;
};

/**
 * Checks if a square contains a friendly piece.
 */
export const isFriendly = (board: BoardPosition, square: number, color: PlayerColor): boolean => {
  const piece = board[square];
  return piece !== null && piece !== undefined && piece.color === color;
};

/**
 * Creates a new board with a piece moved from one square to another.
 * Does NOT handle captures — just moves the piece.
 */
export const movePiece = (board: BoardPosition, from: number, to: number): Square[] => {
  const newBoard = [...board];
  newBoard[to] = newBoard[from]!;
  newBoard[from] = null;
  return newBoard;
};

/**
 * Creates a new board with a piece removed from a square.
 */
export const removePiece = (board: BoardPosition, square: number): Square[] => {
  const newBoard = [...board];
  newBoard[square] = null;
  return newBoard;
};

/**
 * Creates a new board with a piece promoted to king.
 */
export const promotePiece = (board: BoardPosition, square: number): Square[] => {
  const piece = board[square];
  if (!piece || piece.type === PieceType.King) return [...board];
  const newBoard = [...board];
  newBoard[square] = { type: PieceType.King, color: piece.color };
  return newBoard;
};

/**
 * Finds all squares occupied by pieces of a given color.
 */
export const findPieces = (board: BoardPosition, color: PlayerColor): number[] => {
  const squares: number[] = [];
  for (let sq = 1; sq <= 50; sq++) {
    const piece = board[sq];
    if (piece && piece.color === color) {
      squares.push(sq);
    }
  }
  return squares;
};

/**
 * Counts pieces of each type for a given color.
 */
export const countPieces = (board: BoardPosition, color: PlayerColor): { men: number; kings: number; total: number } => {
  let men = 0;
  let kings = 0;
  for (let sq = 1; sq <= 50; sq++) {
    const piece = board[sq];
    if (piece && piece.color === color) {
      if (piece.type === PieceType.Man) men++;
      else kings++;
    }
  }
  return { men, kings, total: men + kings };
};
