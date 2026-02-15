import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LearnPage from '../page';
import { useGameStore } from '@/stores/game-store';

// Mock next/link to render a plain anchor
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock heavy board/game components to keep tests fast and focused
vi.mock('@/components/board/Board', () => ({
  Board: () => <div data-testid="board-mock" />,
}));

vi.mock('@/components/game/GameBoard', () => ({
  GameBoard: () => <div data-testid="game-board-mock" />,
}));

vi.mock('@/components/game/GameControls', () => ({
  GameControls: () => <div data-testid="game-controls-mock" />,
}));

vi.mock('@/components/game/GameStatus', () => ({
  GameStatus: () => <div data-testid="game-status-mock" />,
}));

vi.mock('@/components/game/MoveHistory', () => ({
  MoveHistory: () => <div data-testid="move-history-mock" />,
}));

vi.mock('@/components/game/MoveFeedback', () => ({
  MoveFeedback: () => <div data-testid="move-feedback-mock" />,
}));

vi.mock('@/components/game/PauseOverlay', () => ({
  PauseOverlay: () => <div data-testid="pause-overlay-mock" />,
}));

describe('LearnPage', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('renders the Learn Draughts heading', () => {
    render(<LearnPage />);
    expect(screen.getByText('Learn Draughts')).toBeDefined();
  });

  it('renders tutorial tab by default', () => {
    render(<LearnPage />);
    const tutorialTab = screen.getByRole('tab', { name: /Tutorial/ });
    expect(tutorialTab.getAttribute('aria-selected')).toBe('true');
  });

  it('shows tutorial step 1 initially', () => {
    render(<LearnPage />);
    expect(screen.getByRole('heading', { name: '1. The Board & Setup', level: 2 })).toBeDefined();
  });

  it('shows Next button on info steps', () => {
    render(<LearnPage />);
    expect(screen.getByText('Next →')).toBeDefined();
  });

  it('shows Previous button (disabled on step 1)', () => {
    render(<LearnPage />);
    const prev = screen.getByText('← Previous');
    expect(prev).toBeDefined();
    expect(prev.hasAttribute('disabled')).toBe(true);
  });

  it('advances to next step when Next is clicked', () => {
    render(<LearnPage />);
    fireEvent.click(screen.getByText('Next →'));
    expect(screen.getByRole('heading', { name: '2. How Regular Pieces Move', level: 2 })).toBeDefined();
  });

  it('shows practice tab when clicked', () => {
    render(<LearnPage />);
    const practiceTab = screen.getByRole('tab', { name: /Practice/ });
    fireEvent.click(practiceTab);
    expect(practiceTab.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('Learning Mode')).toBeDefined();
  });

  it('shows step progress bar', () => {
    render(<LearnPage />);
    // Progress bar has one button per step (12 total)
    const stepButtons = screen.getAllByLabelText(/Go to step/);
    expect(stepButtons.length).toBe(12);
  });

  it('shows step count text', () => {
    render(<LearnPage />);
    expect(screen.getByText('Step 1 of 12')).toBeDefined();
  });
});
