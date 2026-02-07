import { describe, it, expect } from 'vitest';
import { createEmptyBoard } from '../src/types/board';
import { PieceType, PlayerColor, createPiece } from '../src/types/piece';
import {
  getPiece,
  isEmpty,
  isEnemy,
  isFriendly,
  movePiece,
  removePiece,
  promotePiece,
  findPieces,
  countPieces,
} from '../src/engine/board-utils';

describe('Board utilities', () => {
  describe('getPiece', () => {
    it('returns piece on occupied square', () => {
      const board = createEmptyBoard();
      board[1] = createPiece(PieceType.Man, PlayerColor.White);
      expect(getPiece(board, 1)).toEqual({ type: PieceType.Man, color: PlayerColor.White });
    });

    it('returns null for empty square', () => {
      const board = createEmptyBoard();
      expect(getPiece(board, 1)).toBeNull();
    });
  });

  describe('isEmpty', () => {
    it('returns true for empty square', () => {
      const board = createEmptyBoard();
      expect(isEmpty(board, 25)).toBe(true);
    });

    it('returns false for occupied square', () => {
      const board = createEmptyBoard();
      board[25] = createPiece(PieceType.Man, PlayerColor.Black);
      expect(isEmpty(board, 25)).toBe(false);
    });
  });

  describe('isEnemy / isFriendly', () => {
    it('identifies enemy correctly', () => {
      const board = createEmptyBoard();
      board[10] = createPiece(PieceType.Man, PlayerColor.Black);
      expect(isEnemy(board, 10, PlayerColor.White)).toBe(true);
      expect(isEnemy(board, 10, PlayerColor.Black)).toBe(false);
    });

    it('identifies friendly correctly', () => {
      const board = createEmptyBoard();
      board[10] = createPiece(PieceType.Man, PlayerColor.White);
      expect(isFriendly(board, 10, PlayerColor.White)).toBe(true);
      expect(isFriendly(board, 10, PlayerColor.Black)).toBe(false);
    });

    it('empty square is neither enemy nor friendly', () => {
      const board = createEmptyBoard();
      expect(isEnemy(board, 10, PlayerColor.White)).toBe(false);
      expect(isFriendly(board, 10, PlayerColor.White)).toBe(false);
    });
  });

  describe('movePiece', () => {
    it('moves piece from origin to destination', () => {
      const board = createEmptyBoard();
      board[28] = createPiece(PieceType.Man, PlayerColor.White);
      const newBoard = movePiece(board, 28, 33);
      expect(newBoard[28]).toBeNull();
      expect(newBoard[33]).toEqual({ type: PieceType.Man, color: PlayerColor.White });
    });

    it('does not modify original board', () => {
      const board = createEmptyBoard();
      board[28] = createPiece(PieceType.Man, PlayerColor.White);
      movePiece(board, 28, 33);
      expect(board[28]).not.toBeNull();
    });
  });

  describe('removePiece', () => {
    it('removes piece from board', () => {
      const board = createEmptyBoard();
      board[28] = createPiece(PieceType.Man, PlayerColor.White);
      const newBoard = removePiece(board, 28);
      expect(newBoard[28]).toBeNull();
    });
  });

  describe('promotePiece', () => {
    it('promotes man to king', () => {
      const board = createEmptyBoard();
      board[46] = createPiece(PieceType.Man, PlayerColor.White);
      const newBoard = promotePiece(board, 46);
      expect(newBoard[46]).toEqual({ type: PieceType.King, color: PlayerColor.White });
    });

    it('does nothing if already king', () => {
      const board = createEmptyBoard();
      board[46] = createPiece(PieceType.King, PlayerColor.White);
      const newBoard = promotePiece(board, 46);
      expect(newBoard[46]).toEqual({ type: PieceType.King, color: PlayerColor.White });
    });
  });

  describe('findPieces', () => {
    it('finds all pieces of a color', () => {
      const board = createEmptyBoard();
      board[1] = createPiece(PieceType.Man, PlayerColor.White);
      board[5] = createPiece(PieceType.King, PlayerColor.White);
      board[50] = createPiece(PieceType.Man, PlayerColor.Black);
      const whites = findPieces(board, PlayerColor.White);
      expect(whites).toEqual([1, 5]);
    });
  });

  describe('countPieces', () => {
    it('counts men and kings separately', () => {
      const board = createEmptyBoard();
      board[1] = createPiece(PieceType.Man, PlayerColor.White);
      board[5] = createPiece(PieceType.King, PlayerColor.White);
      board[10] = createPiece(PieceType.Man, PlayerColor.White);
      const count = countPieces(board, PlayerColor.White);
      expect(count).toEqual({ men: 2, kings: 1, total: 3 });
    });
  });
});
