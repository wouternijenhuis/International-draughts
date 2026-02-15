import { BoardPosition, coordinateToSquare } from '../types/board';
import { PieceType, PlayerColor } from '../types/piece';
import { squareToCoordinate } from '../types/board';
import { countPieces } from '../engine/board-utils';
import { getSquareTopology, ALL_DIRECTIONS, FORWARD_DIRECTIONS } from '../board/topology';

/**
 * Evaluation weights (evaluation units).
 * Material weights are always applied; positional weights are scaled by `featureScale`.
 */
const WEIGHTS = {
  // Material (always applied)
  man: 100,
  king: 300,
  firstKingBonus: 50,
  // Positional (scaled by featureScale)
  centerControl: 5,
  innerCenterBonus: 5,
  advancement: 3,
  backRow: 8,
  kingCentralization: 4,
  manMobility: 1,
  kingMobility: 2,
  leftRightBalance: 3,
  lockedPositionPenalty: 10,
  runawayManBonus: 30,
  tempoDiagonal: 2,
  endgameKingAdvantage: 20,
  pieceStructure: 4,
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
 * Counts available quiet moves for a king from a given square.
 * Walks each diagonal ray until a piece is encountered.
 */
const countKingMoves = (board: BoardPosition, square: number): number => {
  let count = 0;
  const topo = getSquareTopology(square);
  for (const dir of ALL_DIRECTIONS) {
    for (const target of topo.rays[dir]) {
      if (board[target] === null) count++;
      else break;
    }
  }
  return count;
};

/**
 * Counts available forward quiet moves for a man from a given square.
 */
const countManMoves = (board: BoardPosition, square: number, color: PlayerColor): number => {
  let count = 0;
  const topo = getSquareTopology(square);
  const dirs = color === PlayerColor.White ? FORWARD_DIRECTIONS.white : FORWARD_DIRECTIONS.black;
  for (const dir of dirs) {
    const adj = topo.adjacent[dir];
    if (adj !== null && board[adj] === null) count++;
  }
  return count;
};

/**
 * Checks if a piece has an adjacent friendly piece (piece structure).
 */
const hasAdjacentFriendly = (board: BoardPosition, square: number, color: PlayerColor): boolean => {
  const topo = getSquareTopology(square);
  for (const dir of ALL_DIRECTIONS) {
    const adj = topo.adjacent[dir];
    if (adj !== null) {
      const p = board[adj];
      if (p && p.color === color) return true;
    }
  }
  return false;
};

/**
 * Checks if a man has a clear path to promotion and is likely unstoppable.
 * Simplified runaway detection: checks that diagonal squares ahead are free of enemies.
 */
const isRunawayMan = (board: BoardPosition, square: number, color: PlayerColor): boolean => {
  const coord = squareToCoordinate(square);
  const promotionRow = color === PlayerColor.White ? 9 : 0;
  const distance = Math.abs(promotionRow - coord.row);

  if (distance === 0) return false; // Already on promotion row
  if (distance > 4) return false; // Too far to be considered runaway

  const dRow = color === PlayerColor.White ? 1 : -1;
  let checkRow = coord.row;

  for (let d = 0; d < distance; d++) {
    checkRow += dRow;
    if (checkRow < 0 || checkRow > 9) return false;

    const leftCol = coord.col - (d + 1);
    const rightCol = coord.col + (d + 1);

    let leftClear = true;
    let rightClear = true;

    if (leftCol >= 0 && leftCol <= 9) {
      const sq = coordinateToSquare({ row: checkRow, col: leftCol });
      if (sq !== null) {
        const p = board[sq];
        if (p && p.color !== color) leftClear = false;
      }
    } else {
      leftClear = false;
    }

    if (rightCol >= 0 && rightCol <= 9) {
      const sq = coordinateToSquare({ row: checkRow, col: rightCol });
      if (sq !== null) {
        const p = board[sq];
        if (p && p.color !== color) rightClear = false;
      }
    } else {
      rightClear = false;
    }

    if (!leftClear && !rightClear) return false;
  }

  return true;
};

/**
 * Evaluate a board position from the perspective of the given player.
 * Positive = good for player, negative = bad.
 * Returns a score in evaluation units.
 *
 * @param board - The current board state
 * @param player - The player to evaluate for
 * @param featureScale - Scale for positional features (0.0 = material only, 1.0 = full). Default 1.0.
 */
export const evaluate = (board: BoardPosition, player: PlayerColor, featureScale: number = 1.0): number => {
  const opponent = player === PlayerColor.White ? PlayerColor.Black : PlayerColor.White;

  const playerPieces = countPieces(board, player);
  const opponentPieces = countPieces(board, opponent);

  // Terminal conditions
  if (opponentPieces.total === 0) return 10000; // Win
  if (playerPieces.total === 0) return -10000; // Loss

  let score = 0;

  // --- Material (always applied, not scaled) ---
  score += (playerPieces.men - opponentPieces.men) * WEIGHTS.man;
  score += (playerPieces.kings - opponentPieces.kings) * WEIGHTS.king;

  // First king bonus
  if (playerPieces.kings > 0 && opponentPieces.kings === 0) score += WEIGHTS.firstKingBonus;
  if (opponentPieces.kings > 0 && playerPieces.kings === 0) score -= WEIGHTS.firstKingBonus;

  // Skip positional features if featureScale is 0
  if (featureScale <= 0) return score;

  // --- Positional evaluation (scaled by featureScale) ---
  let playerLeftPieces = 0;
  let playerRightPieces = 0;
  let opponentLeftPieces = 0;
  let opponentRightPieces = 0;
  let playerMobility = 0;
  let opponentMobility = 0;
  let playerKingMobility = 0;
  let opponentKingMobility = 0;
  let playerConnected = 0;
  let opponentConnected = 0;

  for (let sq = 1; sq <= 50; sq++) {
    const piece = board[sq];
    if (!piece) continue;

    const isPlayer = piece.color === player;
    const multiplier = isPlayer ? 1 : -1;
    const coord = squareToCoordinate(sq);

    // Center control
    if (CENTER_SQUARES.has(sq)) {
      score += multiplier * WEIGHTS.centerControl * featureScale;
      if (INNER_CENTER.has(sq)) {
        score += multiplier * WEIGHTS.innerCenterBonus * featureScale;
      }
    }

    // Advancement (men only — closer to promotion is better)
    if (piece.type === PieceType.Man) {
      const advancement = piece.color === PlayerColor.White
        ? coord.row // White advances by increasing row
        : (9 - coord.row); // Black advances by decreasing row
      score += multiplier * advancement * WEIGHTS.advancement * featureScale;

      // Back row bonus for men (defensive)
      const colorKey = piece.color === PlayerColor.White ? 'white' : 'black';
      if (BACK_ROW[colorKey]!.has(sq)) {
        score += multiplier * WEIGHTS.backRow * featureScale;
      }

      // Runaway man detection
      if (isRunawayMan(board, sq, piece.color)) {
        score += multiplier * WEIGHTS.runawayManBonus * featureScale;
      }

      // Man mobility
      const manMoves = countManMoves(board, sq, piece.color);
      if (isPlayer) playerMobility += manMoves;
      else opponentMobility += manMoves;
    }

    // King centralization & mobility
    if (piece.type === PieceType.King) {
      const distFromCenter = Math.abs(coord.row - 4.5) + Math.abs(coord.col - 4.5);
      score += multiplier * Math.round((7 - distFromCenter) * WEIGHTS.kingCentralization) * featureScale;

      const kingMoves = countKingMoves(board, sq);
      if (isPlayer) {
        playerMobility += kingMoves;
        playerKingMobility += kingMoves;
      } else {
        opponentMobility += kingMoves;
        opponentKingMobility += kingMoves;
      }
    }

    // Tempo diagonal bonus (main diagonals)
    if (coord.row === coord.col || coord.row + coord.col === 9) {
      score += multiplier * WEIGHTS.tempoDiagonal * featureScale;
    }

    // Left/right balance tracking
    if (isPlayer) {
      if (coord.col < 5) playerLeftPieces++;
      else playerRightPieces++;
    } else {
      if (coord.col < 5) opponentLeftPieces++;
      else opponentRightPieces++;
    }

    // Piece structure: connected pieces
    if (hasAdjacentFriendly(board, sq, piece.color)) {
      if (isPlayer) playerConnected++;
      else opponentConnected++;
    }
  }

  // --- Mobility (man mobility at lower weight, king mobility at higher weight) ---
  const manMobilityDiff = (playerMobility - playerKingMobility) - (opponentMobility - opponentKingMobility);
  score += manMobilityDiff * WEIGHTS.manMobility * featureScale;
  score += (playerKingMobility - opponentKingMobility) * WEIGHTS.kingMobility * featureScale;

  // --- Left/right balance penalty ---
  const playerImbalance = Math.abs(playerLeftPieces - playerRightPieces);
  const opponentImbalance = Math.abs(opponentLeftPieces - opponentRightPieces);
  score -= playerImbalance * WEIGHTS.leftRightBalance * featureScale;
  score += opponentImbalance * WEIGHTS.leftRightBalance * featureScale;

  // --- Piece structure ---
  score += (playerConnected - opponentConnected) * WEIGHTS.pieceStructure * featureScale;

  // --- Locked position penalty ---
  if (playerMobility <= 2 && playerPieces.total > 2) {
    score -= WEIGHTS.lockedPositionPenalty * featureScale;
  }
  if (opponentMobility <= 2 && opponentPieces.total > 2) {
    score += WEIGHTS.lockedPositionPenalty * featureScale;
  }

  // --- Endgame king advantage ---
  const totalPieces = playerPieces.total + opponentPieces.total;
  if (totalPieces <= 10) {
    const kingDiff = playerPieces.kings - opponentPieces.kings;
    if (kingDiff !== 0) {
      score += kingDiff * WEIGHTS.endgameKingAdvantage * featureScale;
    }
  }

  return Math.round(score);
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
