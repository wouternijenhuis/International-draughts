import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameHistory } from '../GameHistory';

// Mock api-client  
vi.mock('@/lib/api-client', () => ({
  apiGet: vi.fn().mockResolvedValue({
    items: [
      {
        id: '1',
        date: '2026-02-01T00:00:00',
        opponent: 'AI Medium',
        result: 'WhiteWin',
        moveCount: 42,
        timeControl: null,
        gameMode: 'HumanVsAI',
        difficulty: 'medium',
      },
      {
        id: '2',
        date: '2026-01-28T00:00:00',
        opponent: 'AI Easy',
        result: 'Draw',
        moveCount: 30,
        timeControl: null,
        gameMode: 'HumanVsAI',
        difficulty: 'easy',
      },
    ],
    totalCount: 2,
    page: 1,
    pageSize: 20,
  }),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, ...props }: { children: React.ReactNode; href: string }) => (
    <a {...props}>{children}</a>
  ),
}));

describe('GameHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders game list items', async () => {
    render(<GameHistory userId="user-123" />);
    expect(await screen.findByText('AI Medium')).toBeInTheDocument();
    expect(await screen.findByText('AI Easy')).toBeInTheDocument();
  });

  it('renders difficulty badges', async () => {
    render(<GameHistory userId="user-123" />);
    expect(await screen.findByText('medium')).toBeInTheDocument();
    expect(await screen.findByText('easy')).toBeInTheDocument();
  });

  it('renders filter controls', async () => {
    render(<GameHistory userId="user-123" />);
    expect(screen.getByLabelText('Result')).toBeInTheDocument();
    expect(screen.getByLabelText('Difficulty')).toBeInTheDocument();
    expect(screen.getByLabelText('Mode')).toBeInTheDocument();
  });

  it('shows game count', async () => {
    render(<GameHistory userId="user-123" />);
    expect(await screen.findByText(/2 games found/i)).toBeInTheDocument();
  });
});
