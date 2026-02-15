import { BoardPosition, PieceType, PlayerColor, coordinateToSquare, squareToCoordinate } from '@/lib/draughts-types';

export interface GeneratedMove {
  readonly from: number;
  readonly to: number;
  readonly capturedSquares: readonly number[];
  readonly notation: string;
}

type Direction = 'NE' | 'NW' | 'SE' | 'SW';

const ALL_DIRECTIONS: readonly Direction[] = ['NE', 'NW', 'SE', 'SW'];
const FORWARD_DIRECTIONS: Record<PlayerColor, readonly Direction[]> = {
  [PlayerColor.White]: ['SE', 'SW'],
  [PlayerColor.Black]: ['NE', 'NW'],
};

const DIRECTION_DELTAS: Record<Direction, { dRow: number; dCol: number }> = {
  NE: { dRow: -1, dCol: 1 },
  NW: { dRow: -1, dCol: -1 },
  SE: { dRow: 1, dCol: 1 },
  SW: { dRow: 1, dCol: -1 },
};

interface CaptureStep {
  readonly from: number;
  readonly to: number;
  readonly captured: number;
}

interface CaptureSequence {
  readonly steps: readonly CaptureStep[];
}

const getAdjacentSquare = (square: number, direction: Direction): number | null => {
  const { row, col } = squareToCoordinate(square);
  const delta = DIRECTION_DELTAS[direction];
  return coordinateToSquare({ row: row + delta.dRow, col: col + delta.dCol });
};

const getDiagonalRay = (square: number, direction: Direction): number[] => {
  const { row, col } = squareToCoordinate(square);
  const delta = DIRECTION_DELTAS[direction];
  const ray: number[] = [];

  let nextRow = row + delta.dRow;
  let nextCol = col + delta.dCol;

  while (nextRow >= 0 && nextRow <= 9 && nextCol >= 0 && nextCol <= 9) {
    const nextSquare = coordinateToSquare({ row: nextRow, col: nextCol });
    if (nextSquare !== null) {
      ray.push(nextSquare);
    }
    nextRow += delta.dRow;
    nextCol += delta.dCol;
  }

  return ray;
};

const isEmpty = (board: BoardPosition, square: number): boolean => {
  return board[square] === null || board[square] === undefined;
};

const isEnemy = (board: BoardPosition, square: number, color: PlayerColor): boolean => {
  const piece = board[square];
  return piece !== null && piece !== undefined && piece.color !== color;
};

const createQuietNotation = (from: number, to: number): string => `${from}-${to}`;

const createCaptureNotation = (steps: readonly CaptureStep[]): string => {
  if (steps.length === 0) {
    return '';
  }

  const squares: number[] = [steps[0].from];
  for (const step of steps) {
    squares.push(step.to);
  }
  return squares.join('x');
};

const generateQuietMoves = (board: BoardPosition, currentPlayer: PlayerColor): GeneratedMove[] => {
  const moves: GeneratedMove[] = [];

  for (let from = 1; from <= 50; from++) {
    const piece = board[from];
    if (!piece || piece.color !== currentPlayer) {
      continue;
    }

    if (piece.type === PieceType.Man) {
      for (const direction of FORWARD_DIRECTIONS[currentPlayer]) {
        const to = getAdjacentSquare(from, direction);
        if (to !== null && isEmpty(board, to)) {
          moves.push({
            from,
            to,
            capturedSquares: [],
            notation: createQuietNotation(from, to),
          });
        }
      }
      continue;
    }

    for (const direction of ALL_DIRECTIONS) {
      const ray = getDiagonalRay(from, direction);
      for (const to of ray) {
        if (isEmpty(board, to)) {
          moves.push({
            from,
            to,
            capturedSquares: [],
            notation: createQuietNotation(from, to),
          });
          continue;
        }
        break;
      }
    }
  }

  return moves;
};

const generateManCaptureSequences = (
  board: BoardPosition,
  square: number,
  color: PlayerColor,
  currentSteps: readonly CaptureStep[],
  jumpedSquares: ReadonlySet<number>,
  result: CaptureSequence[],
): void => {
  let foundContinuation = false;

  for (const direction of ALL_DIRECTIONS) {
    const enemySquare = getAdjacentSquare(square, direction);
    if (enemySquare === null) {
      continue;
    }

    if (!isEnemy(board, enemySquare, color) || jumpedSquares.has(enemySquare)) {
      continue;
    }

    const landingSquare = getAdjacentSquare(enemySquare, direction);
    if (landingSquare === null || !isEmpty(board, landingSquare)) {
      continue;
    }

    foundContinuation = true;
    const step: CaptureStep = { from: square, to: landingSquare, captured: enemySquare };
    const nextSteps = [...currentSteps, step];
    const nextJumpedSquares = new Set(jumpedSquares);
    nextJumpedSquares.add(enemySquare);

    generateManCaptureSequences(board, landingSquare, color, nextSteps, nextJumpedSquares, result);
  }

  if (!foundContinuation && currentSteps.length > 0) {
    result.push({ steps: currentSteps });
  }
};

const generateKingCaptureSequences = (
  board: BoardPosition,
  square: number,
  color: PlayerColor,
  currentSteps: readonly CaptureStep[],
  jumpedSquares: ReadonlySet<number>,
  result: CaptureSequence[],
): void => {
  let foundContinuation = false;

  for (const direction of ALL_DIRECTIONS) {
    const ray = getDiagonalRay(square, direction);
    let enemySquare: number | null = null;

    for (const target of ray) {
      const piece = board[target];

      if (!piece) {
        if (enemySquare !== null) {
          foundContinuation = true;
          const step: CaptureStep = { from: square, to: target, captured: enemySquare };
          const nextSteps = [...currentSteps, step];
          const nextJumpedSquares = new Set(jumpedSquares);
          nextJumpedSquares.add(enemySquare);

          generateKingCaptureSequences(board, target, color, nextSteps, nextJumpedSquares, result);
        }
        continue;
      }

      if (piece.color !== color && !jumpedSquares.has(target)) {
        if (enemySquare !== null) {
          break;
        }
        enemySquare = target;
        continue;
      }

      break;
    }
  }

  if (!foundContinuation && currentSteps.length > 0) {
    result.push({ steps: currentSteps });
  }
};

const generateAllCaptureSequences = (board: BoardPosition, currentPlayer: PlayerColor): CaptureSequence[] => {
  const captures: CaptureSequence[] = [];

  for (let from = 1; from <= 50; from++) {
    const piece = board[from];
    if (!piece || piece.color !== currentPlayer) {
      continue;
    }

    if (piece.type === PieceType.Man) {
      generateManCaptureSequences(board, from, currentPlayer, [], new Set<number>(), captures);
    } else {
      generateKingCaptureSequences(board, from, currentPlayer, [], new Set<number>(), captures);
    }
  }

  return captures;
};

const convertCaptureSequenceToMove = (sequence: CaptureSequence): GeneratedMove => {
  const from = sequence.steps[0].from;
  const to = sequence.steps[sequence.steps.length - 1].to;
  return {
    from,
    to,
    capturedSquares: sequence.steps.map((step) => step.captured),
    notation: createCaptureNotation(sequence.steps),
  };
};

export const generateLegalMoves = (board: BoardPosition, currentPlayer: PlayerColor): GeneratedMove[] => {
  const captureSequences = generateAllCaptureSequences(board, currentPlayer);

  if (captureSequences.length > 0) {
    const maxCaptures = Math.max(...captureSequences.map((capture) => capture.steps.length));
    return captureSequences
      .filter((capture) => capture.steps.length === maxCaptures)
      .map(convertCaptureSequenceToMove);
  }

  return generateQuietMoves(board, currentPlayer);
};
