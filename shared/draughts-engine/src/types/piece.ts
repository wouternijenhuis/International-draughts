/** The two piece types in international draughts */
export enum PieceType {
  Man = 'man',
  King = 'king',
}

/** The two player colors */
export enum PlayerColor {
  White = 'white',
  Black = 'black',
}

/** A piece on the board */
export interface Piece {
  readonly type: PieceType;
  readonly color: PlayerColor;
}

/** Factory functions for creating pieces */
export const createPiece = (type: PieceType, color: PlayerColor): Piece => ({
  type,
  color,
});

export const createWhiteMan = (): Piece => createPiece(PieceType.Man, PlayerColor.White);
export const createBlackMan = (): Piece => createPiece(PieceType.Man, PlayerColor.Black);
export const createWhiteKing = (): Piece => createPiece(PieceType.King, PlayerColor.White);
export const createBlackKing = (): Piece => createPiece(PieceType.King, PlayerColor.Black);
