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
    expect(screen.getByRole('button', { name: /start a new game/i })).toBeInTheDocument();
  });

  it('should render How to Play button', () => {
    render(<HomePage />);
    expect(screen.getByRole('button', { name: /learn how to play/i })).toBeInTheDocument();
  });
});
