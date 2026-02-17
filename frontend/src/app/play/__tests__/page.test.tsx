import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PlayPage from '../page';
import { useGameStore } from '@/stores/game-store';

// Mock next/navigation hooks used by PlayPage
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn() }),
}));

// Polyfill HTMLDialogElement methods for jsdom
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  });
});

describe('PlayPage', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('renders the page title', () => {
    render(<PlayPage />);
    expect(screen.getByText('International Draughts')).toBeDefined();
  });

  it('has a skip navigation link', () => {
    render(<PlayPage />);
    expect(screen.getByText('Skip to game board')).toBeDefined();
  });

  it('toggles settings visibility', () => {
    render(<PlayPage />);
    // Settings hidden initially
    expect(screen.queryByText('Board Theme')).toBeNull();
    // Click settings button
    fireEvent.click(screen.getByLabelText('Show settings'));
    // Settings now visible
    expect(screen.getByText('Board Theme')).toBeDefined();
  });

  it('shows game status', () => {
    render(<PlayPage />);
    expect(screen.getByText('Press "New Game" to start')).toBeDefined();
  });

  it('renders board and controls', () => {
    render(<PlayPage />);
    // Board grid
    expect(screen.getByRole('grid')).toBeDefined();
    // New Game button
    expect(screen.getByLabelText('Start new game')).toBeDefined();
  });
});
