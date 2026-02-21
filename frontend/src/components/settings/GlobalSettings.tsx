'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { useSettingsStore } from '@/stores/settings-store';
import { SettingsPanel } from './SettingsPanel';

/** Global floating settings button and slide-over drawer. Rendered in root layout. */
export const GlobalSettings: React.FC = () => {
  const { isSettingsOpen, toggleSettings, closeSettings } = useSettingsStore();
  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isSettingsOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeSettings();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen, closeSettings]);

  // Focus trap
  useEffect(() => {
    if (!isSettingsOpen || !drawerRef.current) return;
    const drawer = drawerRef.current;
    const focusableEls = drawer.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableEls.length > 0) {
      focusableEls[0].focus();
    }

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const first = focusableEls[0];
      const last = focusableEls[focusableEls.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [isSettingsOpen]);

  const handleBackdropClick = useCallback(() => {
    closeSettings();
    triggerRef.current?.focus();
  }, [closeSettings]);

  return (
    <>
      {/* Floating gear button */}
      <button
        ref={triggerRef}
        onClick={toggleSettings}
        className="fixed top-4 right-4 z-40 w-11 h-11 flex items-center justify-center rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg hover:bg-white dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600"
        aria-label={isSettingsOpen ? 'Close display settings' : 'Open display settings'}
        aria-expanded={isSettingsOpen}
        aria-controls="settings-drawer"
      >
        <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {/* Backdrop + Drawer */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Display settings" id="settings-drawer">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={handleBackdropClick}
            aria-hidden="true"
          />
          {/* Drawer */}
          <div
            ref={drawerRef}
            className="absolute top-0 right-0 h-full w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-900 shadow-2xl transform transition-transform duration-200 ease-out overflow-y-auto"
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Display Settings</h2>
              <button
                onClick={() => { closeSettings(); triggerRef.current?.focus(); }}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Close settings"
              >
                <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Settings content */}
            <div className="p-4">
              <SettingsPanel />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
