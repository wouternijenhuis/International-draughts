import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { OfflineBanner } from '../OfflineBanner';

describe('OfflineBanner', () => {
  let onLineSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    onLineSpy = vi.spyOn(navigator, 'onLine', 'get');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not render when online', () => {
    onLineSpy.mockReturnValue(true);
    render(<OfflineBanner />);
    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();
  });

  it('renders when offline', () => {
    onLineSpy.mockReturnValue(false);
    render(<OfflineBanner />);
    expect(screen.getByText(/You are offline/i)).toBeInTheDocument();
  });

  it('shows banner when going offline', () => {
    onLineSpy.mockReturnValue(true);
    render(<OfflineBanner />);
    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();

    act(() => {
      onLineSpy.mockReturnValue(false);
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByText(/You are offline/i)).toBeInTheDocument();
  });

  it('hides banner when coming back online', () => {
    onLineSpy.mockReturnValue(false);
    render(<OfflineBanner />);
    expect(screen.getByText(/You are offline/i)).toBeInTheDocument();

    act(() => {
      onLineSpy.mockReturnValue(true);
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();
  });
});
