import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsPanel } from '../SettingsPanel';
import { useGameStore } from '@/stores/game-store';

describe('SettingsPanel', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('renders all theme options', () => {
    render(<SettingsPanel />);
    expect(screen.getByText('Classic Wood')).toBeDefined();
    expect(screen.getByText('Dark')).toBeDefined();
    expect(screen.getByText('Ocean')).toBeDefined();
    expect(screen.getByText('Tournament Green')).toBeDefined();
  });

  it('changes board theme when clicked', () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByText('Ocean'));
    expect(useGameStore.getState().config.boardTheme).toBe('ocean');
  });

  it('toggles notation', () => {
    render(<SettingsPanel />);
    const toggle = screen.getByRole('switch', { name: /show notation/i });
    const initial = useGameStore.getState().config.showNotation;
    fireEvent.click(toggle);
    expect(useGameStore.getState().config.showNotation).toBe(!initial);
  });

  it('renders heading as Display & Preferences', () => {
    render(<SettingsPanel />);
    expect(screen.getByText('Display & Preferences')).toBeDefined();
  });

  it('does not render game-critical options', () => {
    render(<SettingsPanel />);
    expect(screen.queryByText('AI Difficulty')).toBeNull();
    expect(screen.queryByText('Play As')).toBeNull();
    expect(screen.queryByText('Opponent')).toBeNull();
    expect(screen.queryByText('Timed Mode')).toBeNull();
  });

  it('renders animation speed options', () => {
    render(<SettingsPanel />);
    expect(screen.getByText('instant')).toBeDefined();
    expect(screen.getByText('fast')).toBeDefined();
    expect(screen.getByText('normal')).toBeDefined();
    expect(screen.getByText('slow')).toBeDefined();
  });
});
