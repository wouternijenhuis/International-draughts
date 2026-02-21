import { BoardPosition, Square } from '../types/board';
import { Piece, PieceType, PlayerColor } from '../types/piece';
import {
  Move,
  CaptureMove,
  getMoveOrigin,
  getMoveDestination,
  getCapturedSquares,
} from '../types/move';
import {
  GameState,
  GamePhase,
  DrawReason,
  DrawRuleState,
  createInitialGameState,
} from '../types/game-state';
import { generateLegalMoves } from './move-generator';
import { countPieces, getPiece } from './board-utils';
import { isPromotionSquare } from '../board/topology';

/** Result of applying a move */
export interface MoveResult {
  readonly newState: GameState;
  readonly isValid: boolean;
  readonly error?: string;
}

/** Game outcome types */
export enum GameOutcome {
  Win = 'win',
  Draw = 'draw',
  InProgress = 'in-progress',
}

/**
 * Computes a position hash for repetition detection.
 * Returns a BigInt hash based on piece positions and current player.
 */
export const computePositionHash = (
  board: BoardPosition,
  currentPlayer: PlayerColor,
): bigint => {
  // Polynomial hash using BigInt.
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

/**
 * Applies a move to the board and returns the new board state.
 * Handles piece movement, captures (removing jumped pieces), and promotion.
 */
export const applyMoveToBoard = (board: BoardPosition, move: Move): Square[] => {
  const newBoard = [...board] as Square[];

  if (move.type === 'quiet') {
    const piece = newBoard[move.from] ?? null;
    newBoard[move.from] = null;
    newBoard[move.to] = piece;

    // Check for promotion
    if (piece && piece.type === PieceType.Man) {
      const color = piece.color === PlayerColor.White ? 'white' : 'black';
      if (isPromotionSquare(move.to, color)) {
        newBoard[move.to] = { type: PieceType.King, color: piece.color };
      }
    }
  } else {
    // Capture move: apply each step
    const origin = getMoveOrigin(move);
    const piece = newBoard[origin]!;

    // Clear origin
    newBoard[origin] = null;

    // Remove all captured pieces
    const capturedSquares = getCapturedSquares(move);
    for (const sq of capturedSquares) {
      newBoard[sq] = null;
    }

    // Place piece at final destination
    const destination = getMoveDestination(move);
    newBoard[destination] = piece;

    // Check for promotion (only at the end of the capture sequence)
    if (piece.type === PieceType.Man) {
      const color = piece.color === PlayerColor.White ? 'white' : 'black';
      if (isPromotionSquare(destination, color)) {
        newBoard[destination] = { type: PieceType.King, color: piece.color };
      }
    }
  }

  return newBoard;
};

/**
 * Determines the opponent color.
 */
export const oppositeColor = (color: PlayerColor): PlayerColor => {
  return color === PlayerColor.White ? PlayerColor.Black : PlayerColor.White;
};

/**
 * Checks if a draw condition is met.
 * Returns the DrawReason if a draw is detected, or null otherwise.
 */
export const checkDrawCondition = (
  board: BoardPosition,
  drawRuleState: DrawRuleState,
  currentPlayer: PlayerColor,
): DrawReason | null => {
  // 1. Threefold repetition
  const currentHash = computePositionHash(board, currentPlayer);
  const occurrences = drawRuleState.positionHistory.filter(
    (h) => h === currentHash,
  ).length;
  if (occurrences >= 3) {
    return DrawReason.ThreefoldRepetition;
  }

  // 2. 25-move rule: if only kings remain on both sides
  //    and 25 consecutive king-only moves without a capture
  const whitePieces = countPieces(board, PlayerColor.White);
  const blackPieces = countPieces(board, PlayerColor.Black);
  const onlyKings = whitePieces.men === 0 && blackPieces.men === 0;

  if (onlyKings && drawRuleState.kingOnlyMoveCount >= 25) {
    return DrawReason.TwentyFiveMoveRule;
  }

  // 3. 16-move endgame rule: special endgame positions
  //    (e.g., 3 kings vs 1 king, or similar small king-only positions)
  if (
    drawRuleState.isEndgameRuleActive &&
    drawRuleState.endgameMoveCount >= 16
  ) {
    return DrawReason.SixteenMoveRule;
  }

  return null;
};

/**
 * Determines whether the 16-move endgame rule should be active.
 * Active when total pieces <= 4 and all are kings.
 */
const shouldActivateEndgameRule = (board: BoardPosition): boolean => {
  const white = countPieces(board, PlayerColor.White);
  const black = countPieces(board, PlayerColor.Black);
  return (
    white.men === 0 &&
    black.men === 0 &&
    white.total + black.total <= 4
  );
};

/**
 * Updates the draw rule state after a move.
 */
export const updateDrawRuleState = (
  prevState: DrawRuleState,
  move: Move,
  board: BoardPosition,
  movingPiece: Piece,
  nextPlayer: PlayerColor,
): DrawRuleState => {
  const isCapture = move.type === 'capture';
  const isManMove = movingPiece.type === PieceType.Man;

  // King-only move count: reset on capture or regular piece move, else increment
  const kingOnlyMoveCount =
    isCapture || isManMove ? 0 : prevState.kingOnlyMoveCount + 1;

  // Endgame rule tracking
  const endgameActive = shouldActivateEndgameRule(board);
  const endgameMoveCount =
    endgameActive && !isCapture
      ? (prevState.isEndgameRuleActive
          ? prevState.endgameMoveCount + 1
          : 1)
      : 0;

  // Add current position hash to history
  const positionHash = computePositionHash(board, nextPlayer);
  const positionHistory = [...prevState.positionHistory, positionHash];

  return {
    positionHistory,
    kingOnlyMoveCount,
    endgameMoveCount,
    isEndgameRuleActive: endgameActive,
  };
};

/**
 * Serializes a move to a string for move history storage.
 */
const serializeMove = (move: Move): string => {
  if (move.type === 'quiet') {
    return `${move.from}-${move.to}`;
  }
  const parts = move.steps.map(
    (s) => `${s.from}x${s.captured}x${s.to}`,
  );
  return parts.join(',');
};

/**
 * Validates that a move is legal in the current game state.
 */
export const validateMove = (state: GameState, move: Move): string | null => {
  if (state.phase !== GamePhase.InProgress) {
    return 'Game is not in progress';
  }

  const legalMoves = generateLegalMoves(state.board, state.currentPlayer);
  const moveOrigin = getMoveOrigin(move);
  const moveDestination = getMoveDestination(move);

  const isLegal = legalMoves.some(
    (m) =>
      getMoveOrigin(m) === moveOrigin &&
      getMoveDestination(m) === moveDestination &&
      m.type === move.type &&
      (m.type !== 'capture' ||
        move.type !== 'capture' ||
        JSON.stringify(getCapturedSquares(m)) ===
          JSON.stringify(getCapturedSquares(move as CaptureMove))),
  );

  if (!isLegal) {
    return 'Illegal move';
  }

  return null;
};

/**
 * Applies a move to the game state and returns the new state.
 * This is the main entry point for game progression.
 */
export const applyMove = (state: GameState, move: Move): MoveResult => {
  // Validate the move
  const error = validateMove(state, move);
  if (error) {
    return { newState: state, isValid: false, error };
  }

  // Get the moving piece before applying
  const movingPiece = getPiece(state.board, getMoveOrigin(move));
  if (!movingPiece) {
    return { newState: state, isValid: false, error: 'No piece at origin' };
  }

  // Apply the move to the board
  const newBoard = applyMoveToBoard(state.board, move);

  // Switch player
  const nextPlayer = oppositeColor(state.currentPlayer);

  // Update draw rule state
  const newDrawRuleState = updateDrawRuleState(
    state.drawRuleState,
    move,
    newBoard,
    movingPiece,
    nextPlayer,
  );

  // Count pieces on new board
  const whitePieces = countPieces(newBoard, PlayerColor.White);
  const blackPieces = countPieces(newBoard, PlayerColor.Black);

  // Check for game outcome
  const legalMovesForNext = generateLegalMoves(newBoard, nextPlayer);
  const drawReason = checkDrawCondition(newBoard, newDrawRuleState, nextPlayer);

  let phase: GamePhase = GamePhase.InProgress;
  let drawReasonResult: DrawReason | null = null;

  if (legalMovesForNext.length === 0) {
    // Opponent has no legal moves — current player wins
    phase =
      state.currentPlayer === PlayerColor.White
        ? GamePhase.WhiteWins
        : GamePhase.BlackWins;
  } else if (drawReason !== null) {
    // Draw condition met
    phase = GamePhase.Draw;
    drawReasonResult = drawReason;
  }

  const newState: GameState = {
    board: newBoard,
    currentPlayer: nextPlayer,
    phase,
    moveHistory: [...state.moveHistory, serializeMove(move)],
    drawReason: drawReasonResult,
    whitePieceCount: whitePieces.total,
    blackPieceCount: blackPieces.total,
    drawRuleState: newDrawRuleState,
  };

  return { newState, isValid: true };
};

/**
 * Starts a new game, returning a game state in InProgress phase.
 */
export const startGame = (state?: GameState): GameState => {
  const initial = state ?? createInitialGameState();
  return {
    ...initial,
    phase: GamePhase.InProgress,
  };
};

/**
 * Gets all legal moves for the current position.
 * Returns empty array if the game is not in progress.
 */
export const getLegalMoves = (state: GameState): Move[] => {
  if (state.phase !== GamePhase.InProgress) {
    return [];
  }
  return generateLegalMoves(state.board, state.currentPlayer);
};
