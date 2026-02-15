import { describe, it, expect } from 'vitest';
import {
  applyMove,
  applyMoveToBoard,
  startGame,
  getLegalMoves,
  computePositionHash,
  checkDrawCondition,
  oppositeColor,
} from '../src/engine/game-engine';
import {
  createInitialGameState,
  createInitialBoard,
  GamePhase,
  DrawReason,
  DrawRuleState,
  GameState,
} from '../src/types/game-state';
import { createEmptyBoard, Square } from '../src/types/board';
import { PieceType, PlayerColor, createPiece } from '../src/types/piece';
import { createQuietMove, createCaptureMove, CaptureStep } from '../src/types/move';

// Helper: set up a board with specific pieces
function setupBoard(
  pieces: { square: number; type: PieceType; color: PlayerColor }[],
): Square[] {
  const board = createEmptyBoard();
  for (const p of pieces) {
    board[p.square] = createPiece(p.type, p.color);
  }
  return board;
}

// Helper: create an in-progress game state from a board
function createGameState(
  board: Square[],
  currentPlayer: PlayerColor,
  drawRuleState?: Partial<DrawRuleState>,
): GameState {
  const white = board.filter(
    (s, i) => i >= 1 && s !== null && s.color === PlayerColor.White,
  ).length;
  const black = board.filter(
    (s, i) => i >= 1 && s !== null && s.color === PlayerColor.Black,
  ).length;

  return {
    board,
    currentPlayer,
    phase: GamePhase.InProgress,
    moveHistory: [],
    drawReason: null,
    whitePieceCount: white,
    blackPieceCount: black,
    drawRuleState: {
      positionHistory: [],
      kingOnlyMoveCount: 0,
      endgameMoveCount: 0,
      isEndgameRuleActive: false,
      ...drawRuleState,
    },
  };
}

describe('startGame', () => {
  it('transitions state to InProgress', () => {
    const state = createInitialGameState();
    expect(state.phase).toBe(GamePhase.InProgress);

    const started = startGame(state);
    expect(started.phase).toBe(GamePhase.InProgress);
    expect(started.currentPlayer).toBe(PlayerColor.White);
  });

  it('creates new game if no state provided', () => {
    const started = startGame();
    expect(started.phase).toBe(GamePhase.InProgress);
  });
});

describe('applyMoveToBoard', () => {
  it('applies quiet move correctly', () => {
    const board = setupBoard([
      { square: 28, type: PieceType.Man, color: PlayerColor.White },
    ]);
    const move = createQuietMove(28, 33);
    const newBoard = applyMoveToBoard(board, move);

    expect(newBoard[28]).toBeNull();
    expect(newBoard[33]).toEqual({
      type: PieceType.Man,
      color: PlayerColor.White,
    });
  });

  it('promotes regular piece on quiet move to promotion row', () => {
    // White promotes on row 9 (squares 46-50)
    const board = setupBoard([
      { square: 41, type: PieceType.Man, color: PlayerColor.White },
    ]);
    const move = createQuietMove(41, 46);
    const newBoard = applyMoveToBoard(board, move);

    expect(newBoard[46]).toEqual({
      type: PieceType.King,
      color: PlayerColor.White,
    });
  });

  it('applies capture move correctly', () => {
    const board = setupBoard([
      { square: 28, type: PieceType.Man, color: PlayerColor.White },
      { square: 33, type: PieceType.Man, color: PlayerColor.Black },
    ]);
    const steps: CaptureStep[] = [{ from: 28, to: 39, captured: 33 }];
    const move = createCaptureMove(steps);
    const newBoard = applyMoveToBoard(board, move);

    expect(newBoard[28]).toBeNull(); // Origin cleared
    expect(newBoard[33]).toBeNull(); // Captured piece removed
    expect(newBoard[39]).toEqual({
      type: PieceType.Man,
      color: PlayerColor.White,
    }); // Piece at destination
  });

  it('promotes regular piece on capture ending on promotion row', () => {
    const board = setupBoard([
      { square: 39, type: PieceType.Man, color: PlayerColor.White },
      { square: 44, type: PieceType.Man, color: PlayerColor.Black },
    ]);
    const steps: CaptureStep[] = [{ from: 39, to: 50, captured: 44 }];
    const move = createCaptureMove(steps);
    const newBoard = applyMoveToBoard(board, move);

    expect(newBoard[50]).toEqual({
      type: PieceType.King,
      color: PlayerColor.White,
    });
  });
});

describe('applyMove', () => {
  it('applies a legal quiet move', () => {
    const board = setupBoard([
      { square: 28, type: PieceType.Man, color: PlayerColor.White },
      { square: 40, type: PieceType.Man, color: PlayerColor.Black },
    ]);
    const state = createGameState(board, PlayerColor.White);
    const move = createQuietMove(28, 33);
    const result = applyMove(state, move);

    expect(result.isValid).toBe(true);
    expect(result.newState.currentPlayer).toBe(PlayerColor.Black);
    expect(result.newState.moveHistory).toHaveLength(1);
  });

  it('rejects move on completed game', () => {
    const state: GameState = {
      ...createGameState(createEmptyBoard(), PlayerColor.White),
      phase: GamePhase.WhiteWins,
    };
    const move = createQuietMove(28, 33);
    const result = applyMove(state, move);

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('not in progress');
  });

  it('rejects illegal move', () => {
    const board = setupBoard([
      { square: 28, type: PieceType.Man, color: PlayerColor.White },
      { square: 40, type: PieceType.Man, color: PlayerColor.Black },
    ]);
    const state = createGameState(board, PlayerColor.White);
    const move = createQuietMove(28, 22); // Backward — illegal for regular piece quiet move

    const result = applyMove(state, move);
    expect(result.isValid).toBe(false);
  });

  it('detects win when opponent has no legal moves', () => {
    // Set up position where black has one piece that will be captured
    const board = setupBoard([
      { square: 28, type: PieceType.Man, color: PlayerColor.White },
      { square: 33, type: PieceType.Man, color: PlayerColor.Black },
    ]);
    const state = createGameState(board, PlayerColor.White);

    // Generate legal moves — should be a capture
    const moves = getLegalMoves(state);
    expect(moves.length).toBeGreaterThan(0);

    const result = applyMove(state, moves[0]!);
    expect(result.isValid).toBe(true);
    // After capture, black has no pieces -> no legal moves -> white wins
    expect(result.newState.phase).toBe(GamePhase.WhiteWins);
  });
});

describe('computePositionHash', () => {
  it('produces same hash for identical positions', () => {
    const board1 = setupBoard([
      { square: 28, type: PieceType.Man, color: PlayerColor.White },
    ]);
    const board2 = setupBoard([
      { square: 28, type: PieceType.Man, color: PlayerColor.White },
    ]);
    expect(computePositionHash(board1, PlayerColor.White)).toBe(
      computePositionHash(board2, PlayerColor.White),
    );
  });

  it('produces different hash for different turn', () => {
    const board = setupBoard([
      { square: 28, type: PieceType.Man, color: PlayerColor.White },
    ]);
    expect(computePositionHash(board, PlayerColor.White)).not.toBe(
      computePositionHash(board, PlayerColor.Black),
    );
  });

  it('produces different hash for different piece positions', () => {
    const board1 = setupBoard([
      { square: 28, type: PieceType.Man, color: PlayerColor.White },
    ]);
    const board2 = setupBoard([
      { square: 29, type: PieceType.Man, color: PlayerColor.White },
    ]);
    expect(computePositionHash(board1, PlayerColor.White)).not.toBe(
      computePositionHash(board2, PlayerColor.White),
    );
  });
});

describe('checkDrawCondition', () => {
  it('detects threefold repetition', () => {
    const board = setupBoard([
      { square: 28, type: PieceType.King, color: PlayerColor.White },
      { square: 50, type: PieceType.King, color: PlayerColor.Black },
    ]);
    const hash = computePositionHash(board, PlayerColor.White);
    const drawState: DrawRuleState = {
      positionHistory: [hash, hash, hash], // 3 occurrences
      kingOnlyMoveCount: 0,
      endgameMoveCount: 0,
      isEndgameRuleActive: false,
    };

    const result = checkDrawCondition(board, drawState, PlayerColor.White);
    expect(result).toBe(DrawReason.ThreefoldRepetition);
  });

  it('detects 25-move king-only rule', () => {
    const board = setupBoard([
      { square: 28, type: PieceType.King, color: PlayerColor.White },
      { square: 50, type: PieceType.King, color: PlayerColor.Black },
    ]);
    const drawState: DrawRuleState = {
      positionHistory: [],
      kingOnlyMoveCount: 25,
      endgameMoveCount: 0,
      isEndgameRuleActive: false,
    };

    const result = checkDrawCondition(board, drawState, PlayerColor.White);
    expect(result).toBe(DrawReason.TwentyFiveMoveRule);
  });

  it('does not trigger 25-move rule if regular pieces remain', () => {
    const board = setupBoard([
      { square: 28, type: PieceType.Man, color: PlayerColor.White },
      { square: 50, type: PieceType.King, color: PlayerColor.Black },
    ]);
    const drawState: DrawRuleState = {
      positionHistory: [],
      kingOnlyMoveCount: 25,
      endgameMoveCount: 0,
      isEndgameRuleActive: false,
    };

    const result = checkDrawCondition(board, drawState, PlayerColor.White);
    expect(result).toBeNull();
  });

  it('detects 16-move endgame rule for small king-only positions', () => {
    const board = setupBoard([
      { square: 28, type: PieceType.King, color: PlayerColor.White },
      { square: 33, type: PieceType.King, color: PlayerColor.White },
      { square: 50, type: PieceType.King, color: PlayerColor.Black },
    ]);
    const drawState: DrawRuleState = {
      positionHistory: [],
      kingOnlyMoveCount: 16,
      endgameMoveCount: 16,
      isEndgameRuleActive: true,
    };

    const result = checkDrawCondition(board, drawState, PlayerColor.White);
    expect(result).toBe(DrawReason.SixteenMoveRule);
  });

  it('returns null when no draw condition met', () => {
    const board = setupBoard([
      { square: 28, type: PieceType.Man, color: PlayerColor.White },
      { square: 50, type: PieceType.Man, color: PlayerColor.Black },
    ]);
    const drawState: DrawRuleState = {
      positionHistory: [],
      kingOnlyMoveCount: 5,
      endgameMoveCount: 0,
      isEndgameRuleActive: false,
    };

    const result = checkDrawCondition(board, drawState, PlayerColor.White);
    expect(result).toBeNull();
  });
});

describe('oppositeColor', () => {
  it('returns Black for White', () => {
    expect(oppositeColor(PlayerColor.White)).toBe(PlayerColor.Black);
  });

  it('returns White for Black', () => {
    expect(oppositeColor(PlayerColor.Black)).toBe(PlayerColor.White);
  });
});

describe('getLegalMoves', () => {
  it('returns empty for completed game', () => {
    const state: GameState = {
      ...createGameState(createInitialBoard(), PlayerColor.White),
      phase: GamePhase.WhiteWins,
    };
    expect(getLegalMoves(state)).toHaveLength(0);
  });

  it('returns empty for draw game', () => {
    const state: GameState = {
      ...createGameState(createInitialBoard(), PlayerColor.White),
      phase: GamePhase.Draw,
    };
    expect(getLegalMoves(state)).toHaveLength(0);
  });

  it('returns moves for in-progress game', () => {
    const state = startGame();
    const moves = getLegalMoves(state);
    expect(moves.length).toBeGreaterThan(0);
  });
});
