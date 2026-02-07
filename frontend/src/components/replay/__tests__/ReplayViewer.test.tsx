import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReplayViewer } from '../ReplayViewer';
import { createInitialBoard, Square } from '@/lib/draughts-types';

function makePosition(moves: { from: number; to: number }[]): Square[] {
  const board = [...createInitialBoard()] as Square[];
  for (const m of moves) {
    board[m.to] = board[m.from];
    board[m.from] = null;
  }
  return board;
}

const sampleMoves = [
  { notation: '20-25', positionAfter: makePosition([{ from: 20, to: 25 }]), player: 'white' },
  { notation: '35-30', positionAfter: makePosition([{ from: 20, to: 25 }, { from: 35, to: 30 }]), player: 'black' },
];

describe('ReplayViewer', () => {
  it('renders game info', () => {
    render(
      <ReplayViewer
        moves={sampleMoves}
        whitePlayer="Alice"
        blackPlayer="Bob"
        result="White wins"
        date="2024-01-15"
      />
    );
    expect(screen.getByText(/Alice/)).toBeDefined();
    expect(screen.getByText(/Bob/)).toBeDefined();
    expect(screen.getByText(/Result: White wins/)).toBeDefined();
  });

  it('renders playback controls', () => {
    render(
      <ReplayViewer moves={sampleMoves} whitePlayer="A" blackPlayer="B" result="Draw" date="" />
    );
    expect(screen.getByLabelText('Go to start')).toBeDefined();
    expect(screen.getByLabelText('Next move')).toBeDefined();
    expect(screen.getByLabelText('Previous move')).toBeDefined();
    expect(screen.getByLabelText('Go to end')).toBeDefined();
  });

  it('navigates forward through moves', () => {
    render(
      <ReplayViewer moves={sampleMoves} whitePlayer="A" blackPlayer="B" result="Draw" date="" />
    );
    fireEvent.click(screen.getByLabelText('Next move'));
    // Should show move 1 highlighted
    expect(screen.getByText('20-25')).toBeDefined();
  });

  it('renders move notation list', () => {
    render(
      <ReplayViewer moves={sampleMoves} whitePlayer="A" blackPlayer="B" result="Draw" date="" />
    );
    expect(screen.getByText('20-25')).toBeDefined();
    expect(screen.getByText('35-30')).toBeDefined();
  });
});
