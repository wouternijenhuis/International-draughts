'use client';

import React, { useMemo } from 'react';
import { BoardPosition, PlayerColor } from '@/lib/draughts-types';
import { BoardSquare } from './BoardSquare';

export interface BoardProps {
  /** The current board position */
  position: BoardPosition;
  /** Whether to show FMJD notation numbers */
  showNotation?: boolean;
  /** Board theme */
  theme?: 'classic-wood' | 'dark' | 'ocean' | 'tournament-green';
  /** Currently selected square (highlighted) */
  selectedSquare?: number | null;
  /** Squares that are legal move destinations */
  legalMoveSquares?: number[];
  /** Squares to highlight as last move */
  lastMoveSquares?: number[];
  /** Called when a dark square is clicked */
  onSquareClick?: (square: number) => void;
  /** Called when a drag starts on a dark square */
  onSquareDragStart?: (square: number, e: React.MouseEvent | React.TouchEvent) => void;
  /** Board orientation — which color is at the bottom */
  orientation?: PlayerColor;
}

/** CSS variable mappings for board themes */
const THEME_VARS: Record<string, { light: string; dark: string }> = {
  'classic-wood': { light: '#f0d9b5', dark: '#b58863' },
  dark: { light: '#6b7280', dark: '#374151' },
  ocean: { light: '#93c5fd', dark: '#1d4ed8' },
  'tournament-green': { light: '#d4edda', dark: '#2d6a4f' },
};

/** Build the 10x10 grid with square numbers */
const buildGrid = (): { row: number; col: number; squareNumber: number | null; isDark: boolean }[] => {
  const cells: { row: number; col: number; squareNumber: number | null; isDark: boolean }[] = [];
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      const isEvenRow = row % 2 === 0;
      const isDark = isEvenRow ? col % 2 === 1 : col % 2 === 0;
      let squareNumber: number | null = null;
      if (isDark) {
        const posInRow = isEvenRow ? (col - 1) / 2 : col / 2;
        squareNumber = row * 5 + posInRow + 1;
      }
      cells.push({ row, col, squareNumber, isDark });
    }
  }
  return cells;
};

const GRID = buildGrid();

export const Board: React.FC<BoardProps> = ({
  position,
  showNotation = false,
  theme = 'classic-wood',
  selectedSquare = null,
  legalMoveSquares = [],
  lastMoveSquares = [],
  onSquareClick,
  onSquareDragStart,
  orientation = PlayerColor.White,
}) => {
  const themeColors = THEME_VARS[theme] ?? THEME_VARS['classic-wood'];
  const legalSet = useMemo(() => new Set(legalMoveSquares), [legalMoveSquares]);
  const lastMoveSet = useMemo(() => new Set(lastMoveSquares), [lastMoveSquares]);

  // Flip the grid for white orientation (FMJD: white at bottom)
  const orientedGrid = useMemo(() => {
    if (orientation === PlayerColor.White) {
      return [...GRID].reverse();
    }
    return GRID;
  }, [orientation]);

  return (
    <div
      className="board-container relative aspect-square w-full max-w-[600px] mx-auto"
      style={{
        '--board-light': themeColors.light,
        '--board-dark': themeColors.dark,
      } as React.CSSProperties}
      role="grid"
      aria-label="Draughts board"
    >
      <div className="grid grid-cols-10 w-full h-full rounded-lg overflow-hidden shadow-lg">
        {orientedGrid.map((cell) => (
          <BoardSquare
            key={`${cell.row}-${cell.col}`}
            isDark={cell.isDark}
            squareNumber={cell.squareNumber}
            showNotation={showNotation && cell.isDark}
            isSelected={cell.squareNumber === selectedSquare}
            isLegalMove={cell.squareNumber !== null && legalSet.has(cell.squareNumber)}
            isLastMove={cell.squareNumber !== null && lastMoveSet.has(cell.squareNumber)}
            onClick={cell.isDark && cell.squareNumber !== null && onSquareClick
              ? () => onSquareClick(cell.squareNumber!)
              : undefined}
            onDragStart={cell.isDark && cell.squareNumber !== null && onSquareDragStart
              ? (e: React.MouseEvent | React.TouchEvent) => onSquareDragStart(cell.squareNumber!, e)
              : undefined}
            piece={cell.squareNumber !== null ? position[cell.squareNumber] ?? null : null}
          />
        ))}
      </div>
    </div>
  );
};
