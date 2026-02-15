/**
 * Zobrist hashing for board positions.
 * Uses 32-bit hashes for browser performance (avoids BigInt overhead).
 * Collision rate at 131K TT entries is ~1.5%, which is standard for game TTs.
 */

/** Number of piece types */
const NUM_PIECE_TYPES = 4;

/** Number of squares on the board */
const NUM_SQUARES = 50;

/**
 * Seeded pseudo-random number generator (xorshift32) for deterministic Zobrist keys.
 * This ensures reproducible hashes across runs.
 */
const xorshift32 = (seed: number): (() => number) => {
  let state = seed | 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return state >>> 0; // Unsigned 32-bit
  };
};

/** Precomputed Zobrist table: [square 0-49][pieceType 0-3] → 32-bit random value */
const ZOBRIST_TABLE: Uint32Array = new Uint32Array(NUM_SQUARES * NUM_PIECE_TYPES);

/** Zobrist key for side-to-move (XOR'd when it's black's turn) */
const ZOBRIST_SIDE: number = (() => {
  // Initialize Zobrist keys with deterministic seed
  const rng = xorshift32(0x12345678);
  for (let i = 0; i < NUM_SQUARES * NUM_PIECE_TYPES; i++) {
    ZOBRIST_TABLE[i] = rng();
  }
  return rng();
})();

/**
 * Gets the Zobrist key component for a piece on a square.
 * @param square - FMJD square number (1-50)
 * @param pieceTypeIndex - 0=WhiteMan, 1=WhiteKing, 2=BlackMan, 3=BlackKing
 */
export const getZobristPiece = (square: number, pieceTypeIndex: number): number => {
  return ZOBRIST_TABLE[(square - 1) * NUM_PIECE_TYPES + pieceTypeIndex]!;
};

/** Gets the Zobrist key for side-to-move toggling. */
export const getZobristSide = (): number => ZOBRIST_SIDE;

/**
 * Converts piece color + type to a Zobrist piece index.
 * @returns 0=WhiteMan, 1=WhiteKing, 2=BlackMan, 3=BlackKing
 */
export const pieceToZobristIndex = (isWhite: boolean, isKing: boolean): number => {
  return (isWhite ? 0 : 2) + (isKing ? 1 : 0);
};

import { BoardPosition } from '../types/board';
import { PieceType, PlayerColor } from '../types/piece';

/**
 * Computes the full Zobrist hash for a board position.
 * Used for initial hash computation; incremental updates use XOR.
 */
export const computeZobristHash = (board: BoardPosition, currentPlayer: PlayerColor): number => {
  let hash = 0;

  for (let sq = 1; sq <= 50; sq++) {
    const piece = board[sq];
    if (piece) {
      const isWhite = piece.color === PlayerColor.White;
      const isKing = piece.type === PieceType.King;
      hash ^= getZobristPiece(sq, pieceToZobristIndex(isWhite, isKing));
    }
  }

  if (currentPlayer === PlayerColor.Black) {
    hash ^= ZOBRIST_SIDE;
  }

  return hash >>> 0; // Ensure unsigned 32-bit
};
