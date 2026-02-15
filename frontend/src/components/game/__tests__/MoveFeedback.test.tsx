import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MoveFeedback } from '../MoveFeedback';
import { useGameStore } from '@/stores/game-store';

describe('MoveFeedback', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('renders nothing when no feedback', () => {
    useGameStore.getState().startGame({ gameMode: 'learning' });
    const { container } = render(<MoveFeedback />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing in standard mode even with feedback', () => {
    useGameStore.getState().startGame({ gameMode: 'standard' });
    useGameStore.setState({
      moveFeedback: 'good',
      moveFeedbackMessage: 'Great move!',
    });
    const { container } = render(<MoveFeedback />);
    expect(container.innerHTML).toBe('');
  });

  it('renders feedback toast in learning mode', () => {
    useGameStore.getState().startGame({ gameMode: 'learning' });
    useGameStore.setState({
      moveFeedback: 'good',
      moveFeedbackMessage: 'Great move!',
    });
    render(<MoveFeedback />);
    expect(screen.getByText('Great move!')).toBeDefined();
  });

  it('shows correct icon for good feedback', () => {
    useGameStore.getState().startGame({ gameMode: 'learning' });
    useGameStore.setState({
      moveFeedback: 'good',
      moveFeedbackMessage: 'Nice one!',
    });
    render(<MoveFeedback />);
    const toast = screen.getByRole('status');
    expect(toast.className).toContain('green');
  });

  it('shows correct icon for bad feedback', () => {
    useGameStore.getState().startGame({ gameMode: 'learning' });
    useGameStore.setState({
      moveFeedback: 'bad',
      moveFeedbackMessage: 'Bad move!',
    });
    render(<MoveFeedback />);
    const toast = screen.getByRole('status');
    expect(toast.className).toContain('red');
  });
});
