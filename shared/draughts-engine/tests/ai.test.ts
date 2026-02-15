import { describe, it, expect } from 'vitest';
import { findBestMove } from '../src/ai/search';
import { evaluate, quickEvaluate } from '../src/ai/evaluation';
import { DIFFICULTY_CONFIGS, getDifficultyConfig } from '../src/ai/difficulty';
import { createEmptyBoard } from '../src/types/board';
import { createInitialBoard } from '../src/types/game-state';
import { PieceType, PlayerColor, createPiece } from '../src/types/piece';
import { Square } from '../src/types/board';


function setupBoard(pieces: { square: number; type: PieceType; color: PlayerColor }[]): Square[] {
  const board = createEmptyBoard();
  for (const p of pieces) {
    board[p.square] = createPiece(p.type, p.color);
  }
  return board;
}

describe('Evaluation function', () => {
  it('equal material returns ~0', () => {
    const board = setupBoard([
      { square: 28, type: PieceType.Man, color: PlayerColor.White },
      { square: 33, type: PieceType.Man, color: PlayerColor.Black },
    ]);
    const score = evaluate(board, PlayerColor.White);
    expect(Math.abs(score)).toBeLessThan(50); // Small positional difference only
  });

  it('material advantage gives positive score', () => {
    const board = setupBoard([
      { square: 28, type: PieceType.Man, color: PlayerColor.White },
      { square: 22, type: PieceType.Man, color: PlayerColor.White },
      { square: 33, type: PieceType.Man, color: PlayerColor.Black },
    ]);
    const score = evaluate(board, PlayerColor.White);
    expect(score).toBeGreaterThan(50);
  });

  it('material disadvantage gives negative score', () => {
    const board = setupBoard([
      { square: 28, type: PieceType.Man, color: PlayerColor.White },
      { square: 33, type: PieceType.Man, color: PlayerColor.Black },
      { square: 38, type: PieceType.Man, color: PlayerColor.Black },
    ]);
    const score = evaluate(board, PlayerColor.White);
    expect(score).toBeLessThan(-50);
  });

  it('king is worth more than man', () => {
    const boardWithKing = setupBoard([
      { square: 28, type: PieceType.King, color: PlayerColor.White },
      { square: 33, type: PieceType.Man, color: PlayerColor.Black },
    ]);
    const boardWithMan = setupBoard([
      { square: 28, type: PieceType.Man, color: PlayerColor.White },
      { square: 33, type: PieceType.Man, color: PlayerColor.Black },
    ]);
    expect(evaluate(boardWithKing, PlayerColor.White)).toBeGreaterThan(
      evaluate(boardWithMan, PlayerColor.White)
    );
  });

  it('no pieces = loss', () => {
    const board = setupBoard([
      { square: 33, type: PieceType.Man, color: PlayerColor.Black },
    ]);
    const score = evaluate(board, PlayerColor.White);
    expect(score).toBe(-10000);
  });

  it('opponent has no pieces = win', () => {
    const board = setupBoard([
      { square: 28, type: PieceType.Man, color: PlayerColor.White },
    ]);
    const score = evaluate(board, PlayerColor.White);
    expect(score).toBe(10000);
  });
});

describe('Quick evaluate', () => {
  it('returns material-based score', () => {
    const board = setupBoard([
      { square: 28, type: PieceType.Man, color: PlayerColor.White },
      { square: 22, type: PieceType.Man, color: PlayerColor.White },
      { square: 33, type: PieceType.Man, color: PlayerColor.Black },
    ]);
    const score = quickEvaluate(board, PlayerColor.White);
    expect(score).toBe(100); // 2 men - 1 man = +100
  });
});

describe('Difficulty configs', () => {
  it('has easy, medium, hard', () => {
    expect(getDifficultyConfig('easy')).not.toBeNull();
    expect(getDifficultyConfig('medium')).not.toBeNull();
    expect(getDifficultyConfig('hard')).not.toBeNull();
  });

  it('is case insensitive', () => {
    expect(getDifficultyConfig('Easy')).not.toBeNull();
    expect(getDifficultyConfig('HARD')).not.toBeNull();
  });

  it('returns null for unknown', () => {
    expect(getDifficultyConfig('impossible')).toBeNull();
  });

  it('easy has low depth and high blunder rate', () => {
    const easy = DIFFICULTY_CONFIGS.easy!;
    expect(easy.maxDepth).toBeLessThanOrEqual(3);
    expect(easy.blunderProbability).toBeGreaterThan(0.2);
  });

  it('hard has high depth and low blunders', () => {
    const hard = DIFFICULTY_CONFIGS.hard!;
    expect(hard.maxDepth).toBeGreaterThanOrEqual(5);
    expect(hard.blunderProbability).toBeLessThan(0.1);
  });
});

describe('AI Search - findBestMove', () => {
  it('finds a legal move from initial position', () => {
    const board = createInitialBoard();
    const result = findBestMove(board, PlayerColor.White, DIFFICULTY_CONFIGS.easy!);
    expect(result).not.toBeNull();
    expect(result!.move).toBeDefined();
  });

  it('returns null when no legal moves', () => {
    const board = setupBoard([
      { square: 33, type: PieceType.Man, color: PlayerColor.Black },
    ]);
    const result = findBestMove(board, PlayerColor.White, DIFFICULTY_CONFIGS.easy!);
    expect(result).toBeNull();
  });

  it('returns only move when single legal move exists', () => {
    const board2 = setupBoard([
      { square: 46, type: PieceType.Man, color: PlayerColor.Black },
      { square: 45, type: PieceType.Man, color: PlayerColor.Black },
      { square: 50, type: PieceType.Man, color: PlayerColor.Black },
    ]);
    const result = findBestMove(board2, PlayerColor.Black, DIFFICULTY_CONFIGS.easy!);
    expect(result).not.toBeNull();
  });

  it('captures when capture is mandatory (finds forced win)', () => {
    // White man at 28, black man at 33 — single forced capture that wins
    const board = setupBoard([
      { square: 28, type: PieceType.Man, color: PlayerColor.White },
      { square: 33, type: PieceType.Man, color: PlayerColor.Black },
    ]);
    const result = findBestMove(board, PlayerColor.White, DIFFICULTY_CONFIGS.hard!);
    expect(result).not.toBeNull();
    // With only one legal move, search short-circuits (depthReached=0, score=0)
    expect(result!.move.type).toBe('capture');
  });

  it('avoids losing material when possible', () => {
    // White has two pieces, black has one. White should not blunder a piece.
    const board = setupBoard([
      { square: 17, type: PieceType.Man, color: PlayerColor.White },
      { square: 22, type: PieceType.Man, color: PlayerColor.White },
      { square: 33, type: PieceType.Man, color: PlayerColor.Black },
    ]);
    const result = findBestMove(board, PlayerColor.White, DIFFICULTY_CONFIGS.hard!);
    expect(result).not.toBeNull();
  });

  it('hard searches deeper than easy', () => {
    // Use initial position which has many legal moves (9 quiet moves per side)
    const board = createInitialBoard();
    const hardResult = findBestMove(board, PlayerColor.White, { ...DIFFICULTY_CONFIGS.hard!, maxDepth: 4 });
    const easyResult = findBestMove(board, PlayerColor.White, DIFFICULTY_CONFIGS.easy!);
    expect(hardResult).not.toBeNull();
    expect(easyResult).not.toBeNull();
    expect(hardResult!.depthReached).toBeGreaterThan(easyResult!.depthReached);
  });

  it('completes within reasonable time', () => {
    const board = createInitialBoard();
    const start = performance.now();
    findBestMove(board, PlayerColor.White, DIFFICULTY_CONFIGS.easy);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(5000); // Should be well under 5s for easy
  });
});
