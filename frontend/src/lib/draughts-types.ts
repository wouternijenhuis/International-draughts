/** Piece types */
export enum PieceType {
  Man = 'man',
  King = 'king',
}

/** Player colors */
export enum PlayerColor {
  White = 'white',
  Black = 'black',
}

/** A piece on the board */
export interface Piece {
  readonly type: PieceType;
  readonly color: PlayerColor;
}

/** A square can have a piece or be empty */
export type Square = Piece | null;

/** Board is an array of 51 squares (index 0 unused, 1-50 are playable) */
export type BoardPosition = readonly Square[];

/** Create an empty board */
export const createEmptyBoard = (): (Square)[] => {
  return new Array(51).fill(null);
};

/** Create the initial board position */
export const createInitialBoard = (): Square[] => {
  const board = createEmptyBoard();
  for (let i = 1; i <= 20; i++) {
    board[i] = { type: PieceType.Man, color: PlayerColor.White };
  }
  for (let i = 31; i <= 50; i++) {
    board[i] = { type: PieceType.Man, color: PlayerColor.Black };
  }
  return board;
};

/** Convert square number (1-50) to row/col */
export const squareToCoordinate = (square: number): { row: number; col: number } => {
  const idx = square - 1;
  const row = Math.floor(idx / 5);
  const isEvenRow = row % 2 === 0;
  const posInRow = idx % 5;
  const col = isEvenRow ? posInRow * 2 + 1 : posInRow * 2;
  return { row, col };
};
