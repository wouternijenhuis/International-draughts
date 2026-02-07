import { BoardPosition } from '../types/board';
import { PieceType, PlayerColor } from '../types/piece';
import {
  Move,
  QuietMove,
  CaptureMove,
  CaptureStep,
  createQuietMove,
  createCaptureMove,
} from '../types/move';
import {
  getAdjacentSquare,
  getDiagonalRay,
  FORWARD_DIRECTIONS,
  ALL_DIRECTIONS,
} from '../board/topology';
import { getPiece, isEmpty, isEnemy } from './board-utils';

/**
 * Generates all legal moves for the current player.
 * Enforces mandatory capture: if any captures exist, only capture moves are returned.
 * Enforces maximum capture: only capture sequences with the maximum number of captures are returned.
 */
export const generateLegalMoves = (board: BoardPosition, currentPlayer: PlayerColor): Move[] => {
  const captures = generateAllCaptures(board, currentPlayer);

  if (captures.length > 0) {
    // Maximum capture rule: only keep sequences with the most captures
    const maxCaptures = Math.max(...captures.map((m) => m.steps.length));
    return captures.filter((m) => m.steps.length === maxCaptures);
  }

  // No captures available — return quiet moves
  return generateAllQuietMoves(board, currentPlayer);
};

/**
 * Generates all quiet (non-capture) moves for a player.
 */
export const generateAllQuietMoves = (board: BoardPosition, player: PlayerColor): QuietMove[] => {
  const moves: QuietMove[] = [];

  for (let sq = 1; sq <= 50; sq++) {
    const piece = getPiece(board, sq);
    if (!piece || piece.color !== player) continue;

    if (piece.type === PieceType.Man) {
      generateManQuietMoves(board, sq, player, moves);
    } else {
      generateKingQuietMoves(board, sq, moves);
    }
  }

  return moves;
};

/**
 * Man quiet moves: one square diagonally forward.
 */
const generateManQuietMoves = (
  board: BoardPosition,
  square: number,
  color: PlayerColor,
  moves: QuietMove[],
): void => {
  const forwardDirs = FORWARD_DIRECTIONS[color];
  for (const dir of forwardDirs) {
    const target = getAdjacentSquare(square, dir);
    if (target !== null && isEmpty(board, target)) {
      moves.push(createQuietMove(square, target));
    }
  }
};

/**
 * King quiet moves: any number of squares along any diagonal (flying king).
 */
const generateKingQuietMoves = (
  board: BoardPosition,
  square: number,
  moves: QuietMove[],
): void => {
  for (const dir of ALL_DIRECTIONS) {
    const ray = getDiagonalRay(square, dir);
    for (const target of ray) {
      if (isEmpty(board, target)) {
        moves.push(createQuietMove(square, target));
      } else {
        break; // Blocked by a piece
      }
    }
  }
};

/**
 * Generates all capture sequences for a player.
 * Finds the complete multi-jump sequences by exploring the capture tree.
 */
export const generateAllCaptures = (board: BoardPosition, player: PlayerColor): CaptureMove[] => {
  const allCaptures: CaptureMove[] = [];

  for (let sq = 1; sq <= 50; sq++) {
    const piece = getPiece(board, sq);
    if (!piece || piece.color !== player) continue;

    if (piece.type === PieceType.Man) {
      generateManCaptures(board, sq, player, [], new Set<number>(), allCaptures);
    } else {
      generateKingCaptures(board, sq, player, [], new Set<number>(), allCaptures);
    }
  }

  return allCaptures;
};

/**
 * Recursively finds all capture sequences for a man.
 * Men can capture forward AND backward (diagonally, one square jump).
 * Jumped pieces remain on the board during the sequence but cannot be jumped twice.
 * A man passing through the promotion row mid-capture is NOT promoted (FMJD rule).
 */
const generateManCaptures = (
  board: BoardPosition,
  square: number,
  color: PlayerColor,
  currentSteps: CaptureStep[],
  jumpedSquares: Set<number>,
  result: CaptureMove[],
): void => {
  let foundContinuation = false;

  // Men capture in ALL four directions (forward and backward)
  for (const dir of ALL_DIRECTIONS) {
    const enemySquare = getAdjacentSquare(square, dir);
    if (enemySquare === null) continue;

    // Must be an enemy piece that hasn't been jumped already
    if (!isEnemy(board, enemySquare, color) || jumpedSquares.has(enemySquare)) continue;

    // Landing square must be empty (the square beyond the enemy)
    const landingSquare = getAdjacentSquare(enemySquare, dir);
    if (landingSquare === null || !isEmpty(board, landingSquare)) continue;

    // Valid capture found
    foundContinuation = true;
    const step: CaptureStep = { from: square, to: landingSquare, captured: enemySquare };
    const newSteps = [...currentSteps, step];
    const newJumped = new Set(jumpedSquares);
    newJumped.add(enemySquare);

    // Recurse to find continuations from the landing square
    // Note: Man does NOT promote mid-capture, so it stays a man for further jumps
    generateManCaptures(board, landingSquare, color, newSteps, newJumped, result);
  }

  // If no further captures, record the completed sequence
  if (!foundContinuation && currentSteps.length > 0) {
    result.push(createCaptureMove(currentSteps));
  }
};

/**
 * Recursively finds all capture sequences for a king (flying king).
 * A king can capture at any distance along a diagonal.
 * The king must jump over exactly one enemy piece and can land on any empty square beyond it.
 * After capturing, the king can change direction for the next capture.
 */
const generateKingCaptures = (
  board: BoardPosition,
  square: number,
  color: PlayerColor,
  currentSteps: CaptureStep[],
  jumpedSquares: Set<number>,
  result: CaptureMove[],
): void => {
  let foundContinuation = false;

  for (const dir of ALL_DIRECTIONS) {
    const ray = getDiagonalRay(square, dir);
    let enemySquare: number | null = null;

    for (const target of ray) {
      const piece = getPiece(board, target);

      if (piece === null || piece === undefined) {
        // Empty square
        if (enemySquare !== null) {
          // We've passed over an enemy — this is a valid landing square
          foundContinuation = true;
          const step: CaptureStep = { from: square, to: target, captured: enemySquare };
          const newSteps = [...currentSteps, step];
          const newJumped = new Set(jumpedSquares);
          newJumped.add(enemySquare);

          // Recurse from this landing square
          generateKingCaptures(board, target, color, newSteps, newJumped, result);
        }
        // If no enemy yet, this is just an empty square — continue scanning
      } else if (isEnemy(board, target, color) && !jumpedSquares.has(target)) {
        // Found an enemy piece we haven't jumped yet
        if (enemySquare !== null) {
          // Two enemies in a row — can't jump
          break;
        }
        enemySquare = target;
      } else {
        // Friendly piece, or already-jumped enemy — blocked
        break;
      }
    }
  }

  // If no further captures, record the completed sequence
  if (!foundContinuation && currentSteps.length > 0) {
    result.push(createCaptureMove(currentSteps));
  }
};
