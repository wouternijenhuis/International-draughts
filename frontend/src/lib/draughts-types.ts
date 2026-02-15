/**
 * Re-exports all draughts types and utilities from the shared engine library.
 * This ensures type compatibility between the frontend and the shared engine.
 */
export {
  PieceType,
  PlayerColor,
  createInitialBoard,
  createEmptyBoard,
  squareToCoordinate,
  coordinateToSquare,
} from '@/lib/engine';

export type {
  Piece,
  Square,
  BoardPosition,
  BoardCoordinate,
} from '@/lib/engine';
