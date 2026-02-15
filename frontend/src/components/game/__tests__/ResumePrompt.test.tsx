import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResumePrompt } from '../ResumePrompt';

describe('ResumePrompt', () => {
  const defaultProps = {
    savedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    gameDescription: 'vs AI (Medium)',
    moveCount: 12,
    onResume: vi.fn(),
    onDiscard: vi.fn(),
  };

  it('renders the dialog', () => {
    render(<ResumePrompt {...defaultProps} />);
    expect(screen.getByRole('dialog', { name: 'Resume saved game' })).toBeInTheDocument();
  });

  it('shows the game description', () => {
    render(<ResumePrompt {...defaultProps} />);
    expect(screen.getByText('vs AI (Medium)')).toBeInTheDocument();
  });

  it('shows the move count', () => {
    render(<ResumePrompt {...defaultProps} />);
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('shows time ago text', () => {
    render(<ResumePrompt {...defaultProps} />);
    expect(screen.getByText(/5 minutes ago/)).toBeInTheDocument();
  });

  it('calls onResume when Resume button is clicked', () => {
    const onResume = vi.fn();
    render(<ResumePrompt {...defaultProps} onResume={onResume} />);
    fireEvent.click(screen.getByText('▶ Resume'));
    expect(onResume).toHaveBeenCalledOnce();
  });

  it('calls onDiscard when Discard button is clicked', () => {
    const onDiscard = vi.fn();
    render(<ResumePrompt {...defaultProps} onDiscard={onDiscard} />);
    fireEvent.click(screen.getByText('Discard'));
    expect(onDiscard).toHaveBeenCalledOnce();
  });

  it('displays "just now" for recent saves', () => {
    render(<ResumePrompt {...defaultProps} savedAt={new Date()} />);
    expect(screen.getByText(/just now/)).toBeInTheDocument();
  });

  it('displays hours for older saves', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    render(<ResumePrompt {...defaultProps} savedAt={twoHoursAgo} />);
    expect(screen.getByText(/2 hours ago/)).toBeInTheDocument();
  });

  it('displays days for very old saves', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    render(<ResumePrompt {...defaultProps} savedAt={threeDaysAgo} />);
    expect(screen.getByText(/3 days ago/)).toBeInTheDocument();
  });

  it('displays Local PvP for human opponents', () => {
    render(<ResumePrompt {...defaultProps} gameDescription="Local PvP" />);
    expect(screen.getByText('Local PvP')).toBeInTheDocument();
  });
});
