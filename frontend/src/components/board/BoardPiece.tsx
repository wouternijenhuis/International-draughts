import React from 'react';
import { Piece, PieceType, PlayerColor } from '@/lib/draughts-types';

export interface BoardPieceProps {
  piece: Piece;
  isDragging?: boolean;
}

export const BoardPiece: React.FC<BoardPieceProps> = ({ piece, isDragging = false }) => {
  const isWhite = piece.color === PlayerColor.White;
  const isKing = piece.type === PieceType.King;

  return (
    <div
      className={`
        w-[75%] h-[75%] rounded-full relative z-10
        transition-transform duration-150
        ${isDragging ? 'scale-110 shadow-2xl' : 'shadow-md'}
      `}
      aria-hidden="true"
    >
      {/* Piece body */}
      <div
        className={`
          w-full h-full rounded-full border-2
          ${isWhite
            ? 'bg-gradient-to-b from-amber-50 to-amber-200 border-amber-300'
            : 'bg-gradient-to-b from-gray-700 to-gray-900 border-gray-600'}
        `}
      >
        {/* 3D effect: inner ring */}
        <div
          className={`
            absolute inset-[12%] rounded-full
            ${isWhite
              ? 'bg-gradient-to-b from-amber-100/80 to-amber-200/40'
              : 'bg-gradient-to-b from-gray-500/40 to-gray-800/40'}
          `}
        />

        {/* King crown indicator */}
        {isKing && (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              className={`w-[50%] h-[50%] ${isWhite ? 'text-amber-600' : 'text-yellow-400'}`}
              fill="currentColor"
            >
              <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
              <path d="M5 19h14v2H5z" opacity="0.6" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};
