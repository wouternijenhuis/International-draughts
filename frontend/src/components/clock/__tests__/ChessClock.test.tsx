import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChessClock } from '../ChessClock';
import { PlayerColor } from '@/lib/draughts-types';

describe('ChessClock', () => {
  it('displays formatted time for both players', () => {
    render(
      <ChessClock whiteTime={300000} blackTime={300000} activePlayer={null} isPaused={false} />
    );
    expect(screen.getAllByText('5:00')).toHaveLength(2);
  });

  it('shows active player indicator', () => {
    render(
      <ChessClock whiteTime={300000} blackTime={300000} activePlayer={PlayerColor.White} isPaused={false} />
    );
    const whiteClock = screen.getByLabelText(/White clock/);
    expect(whiteClock.className).toContain('ring-green');
  });

  it('shows low time warning', () => {
    render(
      <ChessClock whiteTime={15000} blackTime={300000} activePlayer={PlayerColor.White} isPaused={false} />
    );
    // Low time should show red text
    const whiteClock = screen.getByLabelText(/White clock/);
    expect(whiteClock.className).toContain('animate-pulse');
  });

  it('formats time with tenths under 10 seconds', () => {
    render(
      <ChessClock whiteTime={5500} blackTime={300000} activePlayer={null} isPaused={false} />
    );
    expect(screen.getByText('6.5')).toBeDefined();
  });

  it('shows 0:00 for expired time', () => {
    render(
      <ChessClock whiteTime={0} blackTime={300000} activePlayer={null} isPaused={false} />
    );
    expect(screen.getByText('0:00')).toBeDefined();
  });
});
