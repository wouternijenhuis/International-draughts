'use client';

import React, { useCallback } from 'react';
import { Board } from '@/components/board';
import { useGameStore } from '@/stores/game-store';
import { PlayerColor } from '@/lib/draughts-types';

/**
 * Interactive game board wrapper that handles piece selection and move execution.
 * Connects the Board visual component to the game store.
 */
export const GameBoard: React.FC = () => {
  const {
    position,
    selectedSquare,
    legalMoveSquares,
    lastMoveSquares,
    config,
    phase,
    currentTurn,
    isPaused,
    selectSquare,
    makeMove,
  } = useGameStore();

  const handleSquareClick = useCallback((square: number) => {
    if (phase !== 'in-progress' || isPaused) return;
    
    const piece = position[square];
    
    // If clicking own piece, select it
    if (piece && piece.color === currentTurn) {
      selectSquare(square);
      return;
    }
    
    // If we have a selected square and clicking elsewhere, try to move
    if (selectedSquare !== null) {
      const isLegalDestination = legalMoveSquares.includes(square);
      
      if (isLegalDestination) {
        // Determine if this is a capture or quiet move
        const isCapture = position[square] !== null || Math.abs(square - selectedSquare) > 6;
        const notation = isCapture 
          ? `${selectedSquare}x${square}` 
          : `${selectedSquare}-${square}`;
        
        // For simplicity, captured squares are computed externally
        // This is a placeholder — real capture logic would come from the engine
        makeMove(selectedSquare, square, notation);
      } else {
        // Clicking non-legal square deselects
        selectSquare(square);
      }
    }
  }, [phase, isPaused, position, currentTurn, selectedSquare, legalMoveSquares, selectSquare, makeMove]);

  const orientation = config.playerColor === PlayerColor.Black 
    ? PlayerColor.Black 
    : PlayerColor.White;

  return (
    <Board
      position={position}
      showNotation={config.showNotation}
      theme={config.boardTheme}
      selectedSquare={selectedSquare}
      legalMoveSquares={legalMoveSquares}
      lastMoveSquares={lastMoveSquares}
      onSquareClick={handleSquareClick}
      orientation={orientation}
    />
  );
};
