import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameControls } from '../GameControls';
import { useGameStore } from '@/stores/game-store';

describe('GameControls', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('shows New Game button when not started', () => {
    render(<GameControls />);
    expect(screen.getByLabelText('Start new game')).toBeDefined();
  });

  it('starts a game when New Game is clicked', () => {
    render(<GameControls />);
    fireEvent.click(screen.getByLabelText('Start new game'));
    expect(useGameStore.getState().phase).toBe('in-progress');
  });

  it('shows game controls when in progress', () => {
    useGameStore.getState().startGame();
    render(<GameControls />);
    expect(screen.getByLabelText('Pause game')).toBeDefined();
    expect(screen.getByLabelText(/Undo/)).toBeDefined();
    expect(screen.getByLabelText('Resign game')).toBeDefined();
  });

  it('disables undo when no moves made', () => {
    useGameStore.getState().startGame();
    render(<GameControls />);
    const undo = screen.getByLabelText(/Undo/);
    expect(undo).toHaveProperty('disabled', true);
  });

  it('resign ends the game', () => {
    useGameStore.getState().startGame();
    render(<GameControls />);
    fireEvent.click(screen.getByLabelText('Resign game'));
    expect(useGameStore.getState().phase).toBe('black-wins');
  });

  it('shows Rematch and New Game after game ends', () => {
    useGameStore.getState().startGame();
    useGameStore.getState().resign();
    render(<GameControls />);
    expect(screen.getByLabelText('Rematch with same settings')).toBeDefined();
    expect(screen.getByLabelText('Start new game with different settings')).toBeDefined();
  });

  /* ─── Learning mode tests ─── */

  it('does not show Redo button in standard mode', () => {
    useGameStore.getState().startGame({ gameMode: 'standard' });
    render(<GameControls />);
    expect(screen.queryByLabelText('Redo move')).toBeNull();
  });

  it('shows Redo button in learning mode', () => {
    useGameStore.getState().startGame({ gameMode: 'learning' });
    render(<GameControls />);
    expect(screen.getByLabelText('Redo move')).toBeDefined();
  });

  it('does not show Hint button in standard mode', () => {
    useGameStore.getState().startGame({ gameMode: 'standard' });
    render(<GameControls />);
    expect(screen.queryByLabelText('Show hint')).toBeNull();
  });

  it('shows Hint button in learning mode', () => {
    useGameStore.getState().startGame({ gameMode: 'learning' });
    render(<GameControls />);
    expect(screen.getByLabelText('Show hint')).toBeDefined();
  });

  it('Redo button is disabled when redo stack is empty', () => {
    useGameStore.getState().startGame({ gameMode: 'learning' });
    render(<GameControls />);
    const redo = screen.getByLabelText('Redo move');
    expect(redo).toHaveProperty('disabled', true);
  });
});
