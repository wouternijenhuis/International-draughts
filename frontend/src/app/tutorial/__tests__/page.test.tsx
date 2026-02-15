import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TutorialPage from '../page';

// Mock next/link and next/navigation
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}));

describe('TutorialPage', () => {
  it('renders first step', () => {
    render(<TutorialPage />);
    expect(screen.getByText('Welcome to International Draughts!')).toBeDefined();
  });

  it('navigates to next step', () => {
    render(<TutorialPage />);
    fireEvent.click(screen.getByText('Next →'));
    expect(screen.getByText('How Regular Pieces Move')).toBeDefined();
  });

  it('navigates back to previous step', () => {
    render(<TutorialPage />);
    fireEvent.click(screen.getByText('Next →'));
    fireEvent.click(screen.getByText('← Previous'));
    expect(screen.getByText('Welcome to International Draughts!')).toBeDefined();
  });

  it('disables previous on first step', () => {
    render(<TutorialPage />);
    const prev = screen.getByText('← Previous');
    expect(prev.hasAttribute('disabled')).toBe(true);
  });

  it('shows Start Playing on last step', () => {
    render(<TutorialPage />);
    // Navigate to last step
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByText('Next →'));
    }
    expect(screen.getByText('Start Playing! 🎮')).toBeDefined();
  });

  it('shows progress indicator', () => {
    render(<TutorialPage />);
    expect(screen.getByText(/Step 1 of/)).toBeDefined();
  });

  it('has skip link', () => {
    render(<TutorialPage />);
    expect(screen.getByText('Skip to game →')).toBeDefined();
  });
});
