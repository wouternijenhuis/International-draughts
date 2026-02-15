import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from './page';

describe('HomePage', () => {
  it('should render the title', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('International Draughts');
  });

  it('should render Play Now button', () => {
    render(<HomePage />);
    const playNowLink = screen.getByRole('link', { name: /start a new game/i });
    expect(playNowLink).toBeInTheDocument();
    expect(playNowLink).toHaveAttribute('href', '/play');
  });

  it('should render How to Play button', () => {
    render(<HomePage />);
    const tutorialLink = screen.getByRole('link', { name: /learn how to play/i });
    expect(tutorialLink).toBeInTheDocument();
    expect(tutorialLink).toHaveAttribute('href', '/learn');
  });
});
