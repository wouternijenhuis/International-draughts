import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaQuery } from './use-media-query';

describe('useMediaQuery', () => {
  let listeners: Map<string, (e: MediaQueryListEvent) => void>;

  beforeEach(() => {
    listeners = new Map();
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(min-width: 1024px)',
      media: query,
      addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
        listeners.set(query, cb);
      },
      removeEventListener: vi.fn(),
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it('should return initial match state', () => {
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(result.current).toBe(true);
  });

  it('should return false for non-matching query', () => {
    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));
    expect(result.current).toBe(false);
  });

  it('should update when media query changes', () => {
    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));
    expect(result.current).toBe(false);

    act(() => {
      const listener = listeners.get('(max-width: 767px)');
      if (listener) {
        listener({ matches: true } as MediaQueryListEvent);
      }
    });

    expect(result.current).toBe(true);
  });
});
