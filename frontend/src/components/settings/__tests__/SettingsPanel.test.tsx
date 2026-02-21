import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsPanel } from '../SettingsPanel';
import { useSettingsStore } from '@/stores/settings-store';

describe('SettingsPanel', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      boardTheme: 'classic-wood',
      showNotation: false,
      showLegalMoves: true,
      animationSpeed: 'normal',
      isSettingsOpen: false,
    });
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
    expect(useSettingsStore.getState().boardTheme).toBe('ocean');
  });

  it('toggles notation', () => {
    render(<SettingsPanel />);
    const toggle = screen.getByRole('switch', { name: /show notation/i });
    const initial = useSettingsStore.getState().showNotation;
    fireEvent.click(toggle);
    expect(useSettingsStore.getState().showNotation).toBe(!initial);
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
