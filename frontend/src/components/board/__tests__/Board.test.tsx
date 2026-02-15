import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Board } from '../Board';
import { createInitialBoard, createEmptyBoard, PieceType, PlayerColor, Square } from '@/lib/draughts-types';

function setupBoard(pieces: { square: number; type: PieceType; color: PlayerColor }[]): Square[] {
  const board = createEmptyBoard();
  for (const p of pieces) {
    board[p.square] = { type: p.type, color: p.color };
  }
  return board;
}

describe('Board Component', () => {
  it('renders 100 squares (10x10 grid)', () => {
    const board = createInitialBoard();
    const { container } = render(<Board position={board} />);
    // The grid should have 100 cells total
    const gridContainer = container.querySelector('.grid-cols-10');
    expect(gridContainer).not.toBeNull();
    expect(gridContainer!.children.length).toBe(100);
  });

  it('renders pieces in initial position', () => {
    const board = createInitialBoard();
    render(<Board position={board} />);
    // Check that white and black pieces are rendered
    const squares = screen.getAllByRole('gridcell');
    // We should have 50 dark squares as gridcells
    expect(squares.length).toBe(50);
  });

  it('shows notation when enabled', () => {
    const board = createInitialBoard();
    const { container } = render(<Board position={board} showNotation={true} />);
    // Should find notation text "1" on the board
    expect(container.textContent).toContain('1');
    expect(container.textContent).toContain('50');
  });

  it('hides notation when disabled', () => {
    const board = createEmptyBoard();
    const { container } = render(<Board position={board} showNotation={false} />);
    // Should not find any square numbers
    const notations = container.querySelectorAll('.font-mono');
    expect(notations.length).toBe(0);
  });

  it('calls onSquareClick when dark square is clicked', () => {
    const board = createEmptyBoard();
    const handleClick = vi.fn();
    render(<Board position={board} onSquareClick={handleClick} />);
    
    // Find a dark square and click it
    const square = screen.getAllByRole('gridcell')[0];
    fireEvent.click(square);
    expect(handleClick).toHaveBeenCalled();
  });

  it('highlights selected square', () => {
    const board = createInitialBoard();
    const { container } = render(<Board position={board} selectedSquare={28} />);
    const selectedSquare = container.querySelector('[data-square="28"]');
    expect(selectedSquare?.className).toContain('ring-yellow');
  });

  it('shows legal move indicators', () => {
    const board = createEmptyBoard();
    const { container } = render(
      <Board position={board} legalMoveSquares={[28, 33]} />
    );
    // Legal move dots should appear on empty squares 28 and 33
    const square28 = container.querySelector('[data-square="28"]');
    const dots = square28?.querySelectorAll('.rounded-full.bg-green-500\\/40');
    expect(dots?.length).toBeGreaterThan(0);
  });

  it('renders different themes', () => {
    const board = createEmptyBoard();
    const { container: classic } = render(<Board position={board} theme="classic-wood" />);
    const { container: dark } = render(<Board position={board} theme="dark" />);
    
    const classicStyle = classic.querySelector('.board-container')?.getAttribute('style');
    const darkStyle = dark.querySelector('.board-container')?.getAttribute('style');
    
    expect(classicStyle).not.toBe(darkStyle);
  });

  it('king is visually distinct from regular piece', () => {
    const board = setupBoard([
      { square: 28, type: PieceType.King, color: PlayerColor.White },
      { square: 33, type: PieceType.Man, color: PlayerColor.White },
    ]);
    const { container } = render(<Board position={board} />);
    // King should have an SVG crown
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(1); // Only the king has a crown SVG
  });

  it('has accessible grid role', () => {
    const board = createInitialBoard();
    render(<Board position={board} />);
    const grid = screen.getByRole('grid');
    expect(grid).toBeDefined();
  });

  it('dark squares have aria-labels', () => {
    const board = setupBoard([
      { square: 28, type: PieceType.Man, color: PlayerColor.White },
    ]);
    render(<Board position={board} />);
    const square = screen.getByLabelText('Square 23, white piece');
    expect(square).toBeDefined();
  });
});
