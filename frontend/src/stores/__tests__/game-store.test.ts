import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../game-store';
import { PlayerColor, PieceType, Square } from '@/lib/draughts-types';

describe('Game Store', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  describe('initial state', () => {
    it('starts in not-started phase', () => {
      expect(useGameStore.getState().phase).toBe('not-started');
    });

    it('has initial board position', () => {
      const { position } = useGameStore.getState();
      expect(position[1]).toEqual({ type: PieceType.Man, color: PlayerColor.White });
      expect(position[50]).toEqual({ type: PieceType.Man, color: PlayerColor.Black });
      expect(position[25]).toBeNull();
    });

    it('white starts first', () => {
      expect(useGameStore.getState().currentTurn).toBe(PlayerColor.White);
    });
  });

  describe('startGame', () => {
    it('transitions to in-progress', () => {
      useGameStore.getState().startGame();
      expect(useGameStore.getState().phase).toBe('in-progress');
    });

    it('accepts config overrides', () => {
      useGameStore.getState().startGame({ aiDifficulty: 'hard', boardTheme: 'dark' });
      const { config } = useGameStore.getState();
      expect(config.aiDifficulty).toBe('hard');
      expect(config.boardTheme).toBe('dark');
    });

    it('resets board to initial position', () => {
      // Make a change first
      useGameStore.getState().startGame();
      useGameStore.getState().makeMove(31, 26, '31-26');
      // Start new game
      useGameStore.getState().startGame();
      expect(useGameStore.getState().moveHistory).toHaveLength(0);
      expect(useGameStore.getState().position[31]).not.toBeNull();
    });
  });

  describe('selectSquare', () => {
    it('selects own piece', () => {
      useGameStore.getState().startGame();
      useGameStore.getState().selectSquare(20); // White man
      expect(useGameStore.getState().selectedSquare).toBe(20);
    });

    it('does not select opponent piece', () => {
      useGameStore.getState().startGame();
      useGameStore.getState().selectSquare(31); // Black man
      expect(useGameStore.getState().selectedSquare).toBeNull();
    });

    it('does not select when game not in progress', () => {
      useGameStore.getState().selectSquare(20);
      expect(useGameStore.getState().selectedSquare).toBeNull();
    });

    it('deselects when clicking empty square with selection', () => {
      useGameStore.getState().startGame();
      useGameStore.getState().selectSquare(20);
      useGameStore.getState().selectSquare(25); // Empty square
      expect(useGameStore.getState().selectedSquare).toBeNull();
    });
  });

  describe('makeMove', () => {
    beforeEach(() => {
      useGameStore.getState().startGame();
    });

    it('moves piece to new square', () => {
      useGameStore.getState().makeMove(20, 25, '20-25');
      const { position } = useGameStore.getState();
      expect(position[20]).toBeNull();
      expect(position[25]).toEqual({ type: PieceType.Man, color: PlayerColor.White });
    });

    it('switches turn after move', () => {
      useGameStore.getState().makeMove(20, 25, '20-25');
      expect(useGameStore.getState().currentTurn).toBe(PlayerColor.Black);
    });

    it('adds to move history', () => {
      useGameStore.getState().makeMove(20, 25, '20-25');
      expect(useGameStore.getState().moveHistory).toHaveLength(1);
      expect(useGameStore.getState().moveHistory[0].notation).toBe('20-25');
    });

    it('tracks last move squares', () => {
      useGameStore.getState().makeMove(20, 25, '20-25');
      expect(useGameStore.getState().lastMoveSquares).toEqual([20, 25]);
    });

    it('handles captures (removes captured pieces)', () => {
      // Simulate a capture
      useGameStore.getState().makeMove(20, 29, '20x29', [25]);
      const { position } = useGameStore.getState();
      expect(position[25]).toBeNull(); // Captured piece removed
      expect(position[29]).not.toBeNull(); // Piece arrived
    });

    it('promotes man to king on back rank', () => {
      // Set up a near-promotion position manually
      const state = useGameStore.getState();
      const pos = [...state.position] as Square[];
      pos[41] = { type: PieceType.Man, color: PlayerColor.White };
      pos[20] = null; // Remove original
      useGameStore.setState({ position: pos });
      
      useGameStore.getState().makeMove(41, 47, '41-47');
      const piece = useGameStore.getState().position[47];
      expect(piece).not.toBeNull();
      expect(piece!.type).toBe(PieceType.King);
    });
  });

  describe('undoMove', () => {
    it('restores previous position', () => {
      useGameStore.getState().startGame();
      useGameStore.getState().makeMove(20, 25, '20-25');
      useGameStore.getState().undoMove();
      expect(useGameStore.getState().position[20]).not.toBeNull();
      expect(useGameStore.getState().position[25]).toBeNull();
    });

    it('does nothing if no moves to undo', () => {
      useGameStore.getState().startGame();
      useGameStore.getState().undoMove();
      expect(useGameStore.getState().moveIndex).toBe(-1);
    });
  });

  describe('redoMove', () => {
    it('replays undone move', () => {
      useGameStore.getState().startGame();
      useGameStore.getState().makeMove(20, 25, '20-25');
      useGameStore.getState().undoMove();
      useGameStore.getState().redoMove();
      expect(useGameStore.getState().position[25]).not.toBeNull();
    });

    it('does nothing if no moves to redo', () => {
      useGameStore.getState().startGame();
      useGameStore.getState().redoMove();
      expect(useGameStore.getState().moveIndex).toBe(-1);
    });
  });

  describe('resign', () => {
    it('current player loses', () => {
      useGameStore.getState().startGame();
      // White's turn, resigning means black wins
      useGameStore.getState().resign();
      expect(useGameStore.getState().phase).toBe('black-wins');
    });

    it('does nothing if not in progress', () => {
      useGameStore.getState().resign();
      expect(useGameStore.getState().phase).toBe('not-started');
    });
  });

  describe('offerDraw', () => {
    it('accepts draw against AI', () => {
      useGameStore.getState().startGame({ opponent: 'ai' });
      useGameStore.getState().offerDraw();
      expect(useGameStore.getState().phase).toBe('draw');
    });
  });

  describe('togglePause', () => {
    it('toggles pause state', () => {
      useGameStore.getState().startGame();
      expect(useGameStore.getState().isPaused).toBe(false);
      useGameStore.getState().togglePause();
      expect(useGameStore.getState().isPaused).toBe(true);
      useGameStore.getState().togglePause();
      expect(useGameStore.getState().isPaused).toBe(false);
    });
  });

  describe('config', () => {
    it('sets board theme', () => {
      useGameStore.getState().setBoardTheme('ocean');
      expect(useGameStore.getState().config.boardTheme).toBe('ocean');
    });

    it('toggles notation', () => {
      const initial = useGameStore.getState().config.showNotation;
      useGameStore.getState().toggleNotation();
      expect(useGameStore.getState().config.showNotation).toBe(!initial);
    });

    it('merges config partially', () => {
      useGameStore.getState().setConfig({ aiDifficulty: 'hard' });
      expect(useGameStore.getState().config.aiDifficulty).toBe('hard');
      expect(useGameStore.getState().config.opponent).toBe('ai'); // unchanged
    });
  });
});
