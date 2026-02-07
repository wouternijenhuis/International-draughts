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

  it('changes AI difficulty', () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByText('Hard'));
    expect(useGameStore.getState().config.aiDifficulty).toBe('hard');
  });

  it('disables difficulty change during active game', () => {
    useGameStore.getState().startGame();
    render(<SettingsPanel />);
    expect(screen.getByText(/Cannot change during active game/)).toBeDefined();
  });
});
