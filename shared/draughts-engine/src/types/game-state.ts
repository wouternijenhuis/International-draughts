import { BoardPosition, Square, createEmptyBoard } from './board';
import { PlayerColor, PieceType, createPiece } from './piece';

/** The possible phases of a game */
export enum GamePhase {
  InProgress = 'in-progress',
  WhiteWins = 'white-wins',
  BlackWins = 'black-wins',
  Draw = 'draw',
}

/** Reason for a draw */
export enum DrawReason {
  ThreefoldRepetition = 'threefold-repetition',
  TwentyFiveMoveRule = '25-move-rule',
  SixteenMoveRule = '16-move-rule',
  Agreement = 'agreement',
}

/** Draw-rule tracking state */
export interface DrawRuleState {
  /** Position hashes for threefold repetition detection */
  readonly positionHistory: readonly bigint[];
  /** Consecutive half-moves where both sides have only kings and no captures */
  readonly kingOnlyMoveCount: number;
  /** Half-moves in the current 16-move endgame scenario */
  readonly endgameMoveCount: number;
  /** Whether the 16-move endgame rule is active */
  readonly isEndgameRuleActive: boolean;
}

/** Complete game state */
export interface GameState {
  readonly board: BoardPosition;
  readonly currentPlayer: PlayerColor;
  readonly moveHistory: readonly string[];
  readonly phase: GamePhase;
  readonly drawReason: DrawReason | null;
  readonly whitePieceCount: number;
  readonly blackPieceCount: number;
  readonly drawRuleState: DrawRuleState;
}

/** Creates the initial position for a new game */
export const createInitialBoard = (): Square[] => {
  const board = createEmptyBoard();

  // White pieces on squares 1-20
  for (let i = 1; i <= 20; i++) {
    board[i] = createPiece(PieceType.Man, PlayerColor.White);
  }

  // Black pieces on squares 31-50
  for (let i = 31; i <= 50; i++) {
    board[i] = createPiece(PieceType.Man, PlayerColor.Black);
  }

  return board;
};

/** Creates a new game state in the initial position */
export const createInitialGameState = (): GameState => {
  const board = createInitialBoard();
  const initialHash = computeInitialPositionHash(board, PlayerColor.White);
  return {
    board,
    currentPlayer: PlayerColor.White,
    moveHistory: [],
    phase: GamePhase.InProgress,
    drawReason: null,
    whitePieceCount: 20,
    blackPieceCount: 20,
    drawRuleState: {
      positionHistory: [initialHash],
      kingOnlyMoveCount: 0,
      endgameMoveCount: 0,
      isEndgameRuleActive: false,
    },
  };
};

/**
 * Computes a position hash for the initial position.
 * Uses the same algorithm as computePositionHash in game-engine
 * but is self-contained to avoid circular dependencies.
 */
const computeInitialPositionHash = (
  board: BoardPosition,
  currentPlayer: PlayerColor,
): bigint => {
  // Base must be > max per-square coefficient (50*5 + 4 = 254), so we use 257 (prime).
  const BASE = 257n;
  let hash = BigInt(currentPlayer === PlayerColor.White ? 1 : 2);
  for (let sq = 1; sq <= 50; sq++) {
    const piece = board[sq];
    if (piece) {
      const pieceValue =
        piece.color === PlayerColor.White
          ? piece.type === PieceType.Man
            ? 1n
            : 2n
          : piece.type === PieceType.Man
            ? 3n
            : 4n;
      hash = hash * BASE + BigInt(sq) * 5n + pieceValue;
    } else {
      hash = hash * BASE;
    }
  }
  return hash;
};

/** Checks if two board positions are equal */
export const positionsEqual = (a: BoardPosition, b: BoardPosition): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 1; i <= 50; i++) {
    const squareA = a[i];
    const squareB = b[i];
    if (!squareA && !squareB) continue;
    if (!squareA || !squareB) return false;
    if (squareA.type !== squareB.type || squareA.color !== squareB.color) return false;
  }
  return true;
};
