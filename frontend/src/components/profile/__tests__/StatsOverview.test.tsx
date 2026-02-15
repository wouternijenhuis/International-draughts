import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatsOverview } from '../StatsOverview';

const mockStats = {
  rating: 1620,
  ratingDeviation: 85,
  gamesPlayed: 26,
  wins: 15,
  losses: 8,
  draws: 3,
  winRate: 57.7,
  currentStreak: 3,
  currentStreakType: 'win',
  bestWinStreak: 5,
};

describe('StatsOverview', () => {
  it('renders overall statistics', () => {
    render(<StatsOverview stats={mockStats} />);
    expect(screen.getByText('26')).toBeInTheDocument(); // games
    expect(screen.getByText('15')).toBeInTheDocument(); // wins
    expect(screen.getByText('8')).toBeInTheDocument();  // losses
    expect(screen.getByText('3', { exact: true })).toBeInTheDocument();  // draws
  });

  it('renders win rate', () => {
    render(<StatsOverview stats={mockStats} />);
    expect(screen.getByText('57.7%')).toBeInTheDocument();
  });

  it('renders current streak info', () => {
    render(<StatsOverview stats={mockStats} />);
    expect(screen.getByText('win streak')).toBeInTheDocument();
  });

  it('renders best win streak', () => {
    render(<StatsOverview stats={mockStats} />);
    expect(screen.getByText('Best Win Streak')).toBeInTheDocument();
    // The best win streak value is rendered as text content "5 🔥"
    const bestStreakSection = screen.getByText('Best Win Streak').closest('div')!;
    expect(bestStreakSection.parentElement!.textContent).toContain('5');
  });

  it('renders empty streak state', () => {
    const noStreakStats = { ...mockStats, currentStreak: 0, currentStreakType: 'none' };
    render(<StatsOverview stats={noStreakStats} />);
    expect(screen.getAllByText('—')).toHaveLength(1);
  });

  it('renders PvC note', () => {
    render(<StatsOverview stats={mockStats} />);
    expect(screen.getByText(/Player vs Computer/i)).toBeInTheDocument();
  });
});
