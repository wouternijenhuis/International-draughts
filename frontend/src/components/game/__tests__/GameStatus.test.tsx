import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameStatus } from '../GameStatus';
import { useGameStore } from '@/stores/game-store';

describe('GameStatus', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('shows ready to start initially', () => {
    render(<GameStatus />);
    expect(screen.getByText('Ready to start')).toBeDefined();
  });

  it('shows current turn when in progress', () => {
    useGameStore.getState().startGame();
    render(<GameStatus />);
    expect(screen.getByText("White's turn")).toBeDefined();
  });

  it('shows winner when game is over', () => {
    useGameStore.getState().startGame();
    useGameStore.getState().resign(); // White resigns
    render(<GameStatus />);
    expect(screen.getByText('Black wins!')).toBeDefined();
  });

  it('shows paused status', () => {
    useGameStore.getState().startGame();
    useGameStore.getState().togglePause();
    render(<GameStatus />);
    expect(screen.getByText('Game paused')).toBeDefined();
  });
});
