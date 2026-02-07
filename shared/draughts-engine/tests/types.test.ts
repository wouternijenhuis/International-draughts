import { describe, it, expect } from 'vitest';
import {
  PieceType,
  PlayerColor,
  createPiece,
  createWhiteMan,
  createBlackMan,
  createWhiteKing,
  createBlackKing,
  isValidSquareNumber,
  squareToCoordinate,
  coordinateToSquare,
  createEmptyBoard,
  createInitialBoard,
  createInitialGameState,
  positionsEqual,
  GamePhase,
  createQuietMove,
  createCaptureMove,
  getMoveOrigin,
  getMoveDestination,
  getCapturedSquares,
  formatMoveNotation,
  parseMoveNotation,
} from '../src';

describe('Piece', () => {
  it('should create a white man', () => {
    const piece = createWhiteMan();
    expect(piece.type).toBe(PieceType.Man);
    expect(piece.color).toBe(PlayerColor.White);
  });

  it('should create a black man', () => {
    const piece = createBlackMan();
    expect(piece.type).toBe(PieceType.Man);
    expect(piece.color).toBe(PlayerColor.Black);
  });

  it('should create a white king', () => {
    const piece = createWhiteKing();
    expect(piece.type).toBe(PieceType.King);
    expect(piece.color).toBe(PlayerColor.White);
  });

  it('should create a black king', () => {
    const piece = createBlackKing();
    expect(piece.type).toBe(PieceType.King);
    expect(piece.color).toBe(PlayerColor.Black);
  });

  it('should create a piece with specific type and color', () => {
    const piece = createPiece(PieceType.King, PlayerColor.Black);
    expect(piece.type).toBe(PieceType.King);
    expect(piece.color).toBe(PlayerColor.Black);
  });
});

describe('Board - Square validation', () => {
  it('should accept valid square numbers 1-50', () => {
    for (let i = 1; i <= 50; i++) {
      expect(isValidSquareNumber(i)).toBe(true);
    }
  });

  it('should reject invalid square numbers', () => {
    expect(isValidSquareNumber(0)).toBe(false);
    expect(isValidSquareNumber(51)).toBe(false);
    expect(isValidSquareNumber(-1)).toBe(false);
    expect(isValidSquareNumber(1.5)).toBe(false);
  });
});

describe('Board - Coordinate conversion', () => {
  it('should convert square 1 to row 0, col 1', () => {
    const coord = squareToCoordinate(1);
    expect(coord.row).toBe(0);
    expect(coord.col).toBe(1);
  });

  it('should convert square 5 to row 0, col 9', () => {
    const coord = squareToCoordinate(5);
    expect(coord.row).toBe(0);
    expect(coord.col).toBe(9);
  });

  it('should convert square 6 to row 1, col 0', () => {
    const coord = squareToCoordinate(6);
    expect(coord.row).toBe(1);
    expect(coord.col).toBe(0);
  });

  it('should convert square 46 to row 9, col 0', () => {
    const coord = squareToCoordinate(46);
    expect(coord.row).toBe(9);
    expect(coord.col).toBe(0);
  });

  it('should convert square 50 to row 9, col 8', () => {
    const coord = squareToCoordinate(50);
    expect(coord.row).toBe(9);
    expect(coord.col).toBe(8);
  });

  it('should throw for invalid square number', () => {
    expect(() => squareToCoordinate(0)).toThrow();
    expect(() => squareToCoordinate(51)).toThrow();
  });

  it('should round-trip all 50 squares', () => {
    for (let sq = 1; sq <= 50; sq++) {
      const coord = squareToCoordinate(sq);
      const result = coordinateToSquare(coord);
      expect(result).toBe(sq);
    }
  });

  it('should return null for light squares', () => {
    // Row 0 (even), col 0 is a light square
    expect(coordinateToSquare({ row: 0, col: 0 })).toBeNull();
    // Row 1 (odd), col 1 is a light square
    expect(coordinateToSquare({ row: 1, col: 1 })).toBeNull();
  });

  it('should return null for out-of-bounds coordinates', () => {
    expect(coordinateToSquare({ row: -1, col: 0 })).toBeNull();
    expect(coordinateToSquare({ row: 10, col: 0 })).toBeNull();
    expect(coordinateToSquare({ row: 0, col: 10 })).toBeNull();
  });
});

describe('Board - Empty board', () => {
  it('should create a board with 51 positions', () => {
    const board = createEmptyBoard();
    expect(board.length).toBe(51);
  });

  it('should have all squares empty', () => {
    const board = createEmptyBoard();
    for (let i = 1; i <= 50; i++) {
      expect(board[i]).toBeNull();
    }
  });
});

describe('Initial position', () => {
  it('should place 20 white men on squares 1-20', () => {
    const board = createInitialBoard();
    for (let i = 1; i <= 20; i++) {
      expect(board[i]).not.toBeNull();
      expect(board[i]!.type).toBe(PieceType.Man);
      expect(board[i]!.color).toBe(PlayerColor.White);
    }
  });

  it('should leave squares 21-30 empty', () => {
    const board = createInitialBoard();
    for (let i = 21; i <= 30; i++) {
      expect(board[i]).toBeNull();
    }
  });

  it('should place 20 black men on squares 31-50', () => {
    const board = createInitialBoard();
    for (let i = 31; i <= 50; i++) {
      expect(board[i]).not.toBeNull();
      expect(board[i]!.type).toBe(PieceType.Man);
      expect(board[i]!.color).toBe(PlayerColor.Black);
    }
  });
});

describe('Game state', () => {
  it('should create initial game state with correct defaults', () => {
    const state = createInitialGameState();
    expect(state.currentPlayer).toBe(PlayerColor.White);
    expect(state.moveHistory).toEqual([]);
    expect(state.phase).toBe(GamePhase.InProgress);
    expect(state.drawReason).toBeNull();
    expect(state.whitePieceCount).toBe(20);
    expect(state.blackPieceCount).toBe(20);
  });

  it('should have correct draw rule state', () => {
    const state = createInitialGameState();
    expect(state.drawRuleState.positionHistory).toEqual([]);
    expect(state.drawRuleState.kingOnlyMoveCount).toBe(0);
    expect(state.drawRuleState.endgameMoveCount).toBe(0);
    expect(state.drawRuleState.isEndgameRuleActive).toBe(false);
  });
});

describe('Position equality', () => {
  it('should consider identical positions equal', () => {
    const a = createInitialBoard();
    const b = createInitialBoard();
    expect(positionsEqual(a, b)).toBe(true);
  });

  it('should consider different positions not equal', () => {
    const a = createInitialBoard();
    const b = createInitialBoard();
    b[1] = null; // Remove a piece
    expect(positionsEqual(a, b)).toBe(false);
  });

  it('should consider empty boards equal', () => {
    const a = createEmptyBoard();
    const b = createEmptyBoard();
    expect(positionsEqual(a, b)).toBe(true);
  });
});

describe('Move types', () => {
  it('should create a quiet move', () => {
    const move = createQuietMove(32, 28);
    expect(move.type).toBe('quiet');
    expect(move.from).toBe(32);
    expect(move.to).toBe(28);
  });

  it('should create a capture move', () => {
    const move = createCaptureMove([
      { from: 19, to: 30, captured: 24 },
    ]);
    expect(move.type).toBe('capture');
    expect(move.steps).toHaveLength(1);
    expect(move.steps[0]!.captured).toBe(24);
  });

  it('should get move origin and destination', () => {
    const quiet = createQuietMove(32, 28);
    expect(getMoveOrigin(quiet)).toBe(32);
    expect(getMoveDestination(quiet)).toBe(28);

    const capture = createCaptureMove([
      { from: 19, to: 30, captured: 24 },
      { from: 30, to: 41, captured: 36 },
    ]);
    expect(getMoveOrigin(capture)).toBe(19);
    expect(getMoveDestination(capture)).toBe(41);
  });

  it('should get all captured squares', () => {
    const capture = createCaptureMove([
      { from: 19, to: 30, captured: 24 },
      { from: 30, to: 41, captured: 36 },
    ]);
    expect(getCapturedSquares(capture)).toEqual([24, 36]);
  });
});

describe('FMJD Notation', () => {
  it('should format a quiet move', () => {
    const move = createQuietMove(32, 28);
    expect(formatMoveNotation(move)).toBe('32-28');
  });

  it('should format a single capture', () => {
    const move = createCaptureMove([
      { from: 19, to: 30, captured: 24 },
    ]);
    expect(formatMoveNotation(move)).toBe('19x30');
  });

  it('should format a multi-jump capture', () => {
    const move = createCaptureMove([
      { from: 19, to: 10, captured: 14 },
      { from: 10, to: 3, captured: 7 },
    ]);
    expect(formatMoveNotation(move)).toBe('19x10x3');
  });

  it('should parse quiet move notation', () => {
    const result = parseMoveNotation('32-28');
    expect(result.type).toBe('quiet');
    expect(result.squares).toEqual([32, 28]);
  });

  it('should parse capture notation', () => {
    const result = parseMoveNotation('19x30');
    expect(result.type).toBe('capture');
    expect(result.squares).toEqual([19, 30]);
  });

  it('should parse multi-jump notation', () => {
    const result = parseMoveNotation('19x10x3');
    expect(result.type).toBe('capture');
    expect(result.squares).toEqual([19, 10, 3]);
  });

  it('should throw for invalid notation', () => {
    expect(() => parseMoveNotation('abc')).toThrow();
    expect(() => parseMoveNotation('32-abc')).toThrow();
    expect(() => parseMoveNotation('ax3')).toThrow();
  });
});
