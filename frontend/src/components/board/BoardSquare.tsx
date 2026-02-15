import React from 'react';
import { Piece } from '@/lib/draughts-types';
import { BoardPiece } from './BoardPiece';
import { toFmjdSquare } from '@/lib/notation-display';

export interface BoardSquareProps {
  isDark: boolean;
  squareNumber: number | null;
  showNotation: boolean;
  isSelected: boolean;
  isLegalMove: boolean;
  isLastMove: boolean;
  onClick?: () => void;
  onDragStart?: (e: React.MouseEvent | React.TouchEvent) => void;
  piece: Piece | null;
}

export const BoardSquare: React.FC<BoardSquareProps> = ({
  isDark,
  squareNumber,
  showNotation,
  isSelected,
  isLegalMove,
  isLastMove,
  onClick,
  onDragStart,
  piece,
}) => {
  const bgColor = isDark ? 'var(--board-dark)' : 'var(--board-light)';

  const displaySquare = squareNumber ? toFmjdSquare(squareNumber) : null;
  const ariaLabel = displaySquare
    ? piece
      ? `Square ${displaySquare}, ${piece.color} ${piece.type}`
      : `Square ${displaySquare}, empty`
    : undefined;

  return (
    <div
      className={`
        relative aspect-square flex items-center justify-center
        ${isDark ? 'cursor-pointer' : 'cursor-default'}
        ${isSelected ? 'ring-2 ring-yellow-400 ring-inset z-10' : ''}
        ${isLastMove ? 'ring-2 ring-blue-400 ring-inset' : ''}
      `}
      style={{ backgroundColor: bgColor }}
      onClick={onClick}
      onMouseDown={onDragStart}
      onTouchStart={onDragStart}
      role={isDark ? 'gridcell' : undefined}
      aria-label={ariaLabel}
      tabIndex={isDark ? 0 : undefined}
      data-square={squareNumber}
    >
      {/* Legal move indicator */}
      {isLegalMove && !piece && (
        <div className="absolute w-1/3 h-1/3 rounded-full bg-green-500/40" />
      )}
      {isLegalMove && piece && (
        <div className="absolute inset-0 ring-2 ring-green-500/60 ring-inset rounded-sm" />
      )}

      {/* Notation number */}
      {showNotation && squareNumber && (
        <span className="absolute top-0.5 left-1 text-[0.5rem] text-white/60 font-mono select-none z-20">
          {toFmjdSquare(squareNumber)}
        </span>
      )}

      {/* Piece */}
      {piece && <BoardPiece piece={piece} />}
    </div>
  );
};
