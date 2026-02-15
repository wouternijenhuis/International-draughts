import { describe, it, expect } from 'vitest';
import { createEmptyBoard, createInitialBoard, PieceType, PlayerColor } from '@/lib/draughts-types';
import { generateLegalMoves } from '@/lib/move-generation';

describe('generateLegalMoves', () => {
  it('includes quiet opening moves for white from initial position', () => {
    const board = createInitialBoard();
    const moves = generateLegalMoves(board, PlayerColor.White);

    const from17Moves = moves.filter((move) => move.from === 17).map((move) => move.to).sort((a, b) => a - b);
    expect(from17Moves).toEqual([21, 22]);
  });

  it('enforces capture availability over quiet moves', () => {
    const board = createEmptyBoard();
    board[22] = { type: PieceType.Man, color: PlayerColor.White };
    board[27] = { type: PieceType.Man, color: PlayerColor.Black };

    const moves = generateLegalMoves(board, PlayerColor.White);
    expect(moves).toHaveLength(1);
    expect(moves[0]).toMatchObject({
      from: 22,
      to: 31,
      capturedSquares: [27],
      notation: '22x31',
    });
  });
});
