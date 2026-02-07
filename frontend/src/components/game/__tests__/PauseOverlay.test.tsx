import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PauseOverlay } from '../PauseOverlay';
import { useGameStore } from '@/stores/game-store';

describe('PauseOverlay', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('does not render when not paused', () => {
    useGameStore.getState().startGame();
    const { container } = render(<PauseOverlay />);
    expect(container.innerHTML).toBe('');
  });

  it('renders when paused', () => {
    useGameStore.getState().startGame();
    useGameStore.getState().togglePause();
    render(<PauseOverlay />);
    expect(screen.getByText('Game Paused')).toBeDefined();
  });

  it('resumes game on button click', () => {
    useGameStore.getState().startGame();
    useGameStore.getState().togglePause();
    render(<PauseOverlay />);
    fireEvent.click(screen.getByText('▶ Resume Game'));
    expect(useGameStore.getState().isPaused).toBe(false);
  });

  it('does not render when game is not in progress', () => {
    const { container } = render(<PauseOverlay />);
    expect(container.innerHTML).toBe('');
  });
});
