import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InstallPrompt } from '../InstallPrompt';

describe('InstallPrompt', () => {
  let matchMediaMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    matchMediaMock = vi.fn().mockReturnValue({ matches: false });
    Object.defineProperty(window, 'matchMedia', {
      value: matchMediaMock,
      writable: true,
    });
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not render when no beforeinstallprompt event', () => {
    render(<InstallPrompt />);
    expect(screen.queryByText('Install Draughts')).not.toBeInTheDocument();
  });

  it('does not render when app is already installed (standalone mode)', () => {
    matchMediaMock.mockReturnValue({ matches: true });
    render(<InstallPrompt />);
    expect(screen.queryByText('Install Draughts')).not.toBeInTheDocument();
  });

  it('renders banner when beforeinstallprompt fires', async () => {
    render(<InstallPrompt />);
    
    const event = new Event('beforeinstallprompt') as Event & { 
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: string; platform: string }>;
    };
    Object.assign(event, {
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'dismissed', platform: 'web' }),
    });

    window.dispatchEvent(event);

    await waitFor(() => {
      expect(screen.getByText('Install Draughts')).toBeInTheDocument();
    });
  });

  it('dismisses and stores timestamp when Not now clicked', async () => {
    render(<InstallPrompt />);

    const event = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: string; platform: string }>;
    };
    Object.assign(event, {
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'dismissed', platform: 'web' }),
    });

    window.dispatchEvent(event);

    await waitFor(() => {
      expect(screen.getByText('Install Draughts')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Not now'));
    expect(screen.queryByText('Install Draughts')).not.toBeInTheDocument();
    expect(localStorage.getItem('pwa-install-dismissed')).toBeTruthy();
  });

  it('does not show if dismissed less than 7 days ago', () => {
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
    render(<InstallPrompt />);
    expect(screen.queryByText('Install Draughts')).not.toBeInTheDocument();
  });
});
