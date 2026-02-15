import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RatingChart } from '../RatingChart';

describe('RatingChart', () => {
  it('shows empty state when no data', () => {
    render(<RatingChart data={[]} />);
    expect(screen.getByText(/No rating data yet/i)).toBeInTheDocument();
  });

  it('shows "play more" message with fewer than 2 points', () => {
    const singleEntry = [{
      date: '2026-02-01T00:00:00',
      rating: 1500,
      ratingDeviation: 350,
      gameResult: 'WhiteWin',
      opponent: 'AI Medium',
    }];
    render(<RatingChart data={singleEntry} />);
    expect(screen.getByText(/Play more games/i)).toBeInTheDocument();
  });

  it('renders SVG chart with sufficient data', () => {
    const data = Array.from({ length: 5 }, (_, i) => ({
      date: new Date(2026, 0, i + 1).toISOString(),
      rating: 1500 + i * 20,
      ratingDeviation: 350 - i * 50,
      gameResult: 'WhiteWin',
      opponent: 'AI Medium',
    }));
    render(<RatingChart data={data} />);
    const svg = screen.getByRole('img');
    expect(svg).toBeInTheDocument();
  });

  it('renders accessible data table', () => {
    const data = Array.from({ length: 3 }, (_, i) => ({
      date: new Date(2026, 0, i + 1).toISOString(),
      rating: 1500 + i * 20,
      ratingDeviation: 300,
      gameResult: 'WhiteWin',
      opponent: 'AI Medium',
    }));
    render(<RatingChart data={data} />);
    expect(screen.getByText('View data table')).toBeInTheDocument();
  });
});
