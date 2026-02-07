import { BoardPosition } from '../types/board';
import { PieceType, PlayerColor } from '../types/piece';
import { squareToCoordinate } from '../types/board';
import { countPieces } from '../engine/board-utils';

/** Evaluation weights (centipawn-like units) */
const WEIGHTS = {
  man: 100,
  king: 300,
  centerControl: 5,
  advancement: 3,
  backRow: 8,
  kingCentralization: 4,
};

/** Central squares bonus — squares in the center of the board get extra value */
const CENTER_SQUARES = new Set([17, 18, 19, 22, 23, 24, 27, 28, 29, 32, 33, 34]);
const INNER_CENTER = new Set([22, 23, 24, 28, 29]);

/** Back row squares for each color (defensive value) */
const BACK_ROW: Record<string, Set<number>> = {
  white: new Set([1, 2, 3, 4, 5]),
  black: new Set([46, 47, 48, 49, 50]),
};

/**
 * Evaluate a board position from the perspective of the given player.
 * Positive = good for player, negative = bad.
 * Returns a score in centipawn-like units.
 */
export const evaluate = (board: BoardPosition, player: PlayerColor): number => {
  const opponent = player === PlayerColor.White ? PlayerColor.Black : PlayerColor.White;

  const playerPieces = countPieces(board, player);
  const opponentPieces = countPieces(board, opponent);

  // Terminal conditions
  if (opponentPieces.total === 0) return 10000; // Win
  if (playerPieces.total === 0) return -10000; // Loss

  let score = 0;

  // Material
  score += (playerPieces.men - opponentPieces.men) * WEIGHTS.man;
  score += (playerPieces.kings - opponentPieces.kings) * WEIGHTS.king;

  // Positional evaluation per square
  for (let sq = 1; sq <= 50; sq++) {
    const piece = board[sq];
    if (!piece) continue;

    const isPlayer = piece.color === player;
    const multiplier = isPlayer ? 1 : -1;
    const coord = squareToCoordinate(sq);

    // Center control
    if (CENTER_SQUARES.has(sq)) {
      score += multiplier * WEIGHTS.centerControl;
      if (INNER_CENTER.has(sq)) {
        score += multiplier * WEIGHTS.centerControl;
      }
    }

    // Advancement (men only — closer to promotion is better)
    if (piece.type === PieceType.Man) {
      const advancement = piece.color === PlayerColor.White
        ? coord.row // White advances by increasing row
        : (9 - coord.row); // Black advances by decreasing row
      score += multiplier * advancement * WEIGHTS.advancement;
    }

    // Back row bonus for men (defensive)
    if (piece.type === PieceType.Man) {
      const colorKey = piece.color === PlayerColor.White ? 'white' : 'black';
      if (BACK_ROW[colorKey]!.has(sq)) {
        score += multiplier * WEIGHTS.backRow;
      }
    }

    // King centralization
    if (piece.type === PieceType.King) {
      const distFromCenter = Math.abs(coord.row - 4.5) + Math.abs(coord.col - 4.5);
      score += multiplier * Math.round((7 - distFromCenter) * WEIGHTS.kingCentralization);
    }
  }

  return score;
};

/**
 * Quick evaluation for move ordering (material only).
 * Much faster than full evaluation.
 */
export const quickEvaluate = (board: BoardPosition, player: PlayerColor): number => {
  const opponent = player === PlayerColor.White ? PlayerColor.Black : PlayerColor.White;
  const p = countPieces(board, player);
  const o = countPieces(board, opponent);
  return (p.men - o.men) * WEIGHTS.man + (p.kings - o.kings) * WEIGHTS.king;
};
