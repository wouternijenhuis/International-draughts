import { useCallback, useRef, useEffect } from 'react';

/**
 * ARIA live region announcer for screen readers.
 * Creates a visually hidden element that announces messages to assistive technology.
 */
export function useAnnouncer() {
  const announcerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = document.createElement('div');
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-atomic', 'true');
    el.className = 'sr-only';
    el.style.position = 'absolute';
    el.style.width = '1px';
    el.style.height = '1px';
    el.style.overflow = 'hidden';
    el.style.clip = 'rect(0, 0, 0, 0)';
    el.style.whiteSpace = 'nowrap';
    el.style.border = '0';
    document.body.appendChild(el);
    announcerRef.current = el;

    return () => {
      document.body.removeChild(el);
    };
  }, []);

  const announce = useCallback((message: string) => {
    if (announcerRef.current) {
      announcerRef.current.textContent = '';
      // Force a DOM reflow so the screen reader picks up the new content
      void announcerRef.current.offsetHeight;
      announcerRef.current.textContent = message;
    }
  }, []);

  return { announce };
}
