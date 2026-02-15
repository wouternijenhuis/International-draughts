'use client';

import React, { useCallback, useRef, useState } from 'react';
import { Board, AnimatedPieceOverlay } from '@/components/board';
import { useGameStore } from '@/stores/game-store';
import { PlayerColor } from '@/lib/draughts-types';
import { useMoveAnimation } from '@/hooks/useMoveAnimation';
import type { AnimationSpeed } from '@/hooks/useMoveAnimation';

/**
 * Interactive game board wrapper that handles piece selection, move execution,
 * drag-and-drop, and move animations. Connects the Board visual component
 * to the game store and the animation system.
 */
export const GameBoard: React.FC = () => {
  const {
    position,
    selectedSquare,
    legalMoveSquares,
    lastMoveSquares,
    hintSquares,
    config,
    phase,
    isPaused,
    isAiThinking,
    currentTurn,
    selectSquare,
    moveHistory,
    moveIndex,
  } = useGameStore();

  // Drag state
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const isInteractive = phase === 'in-progress' && !isPaused && !isAiThinking &&
    (config.opponent !== 'ai' || currentTurn === config.playerColor);

  const handleSquareClick = useCallback((square: number) => {
    if (!isInteractive) return;
    selectSquare(square);
  }, [isInteractive, selectSquare]);

  const handleDragStart = useCallback((square: number, e: React.MouseEvent | React.TouchEvent) => {
    if (!isInteractive) return;
    const piece = position[square];
    if (!piece || piece.color !== currentTurn) return;

    // Select the piece first
    selectSquare(square);
    setDragFrom(square);

    const clientX = 'touches' in e ? e.touches[0]!.clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]!.clientY : e.clientY;
    setDragPosition({ x: clientX, y: clientY });
  }, [isInteractive, position, currentTurn, selectSquare]);

  const handleDragMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (dragFrom === null) return;
    const clientX = 'touches' in e ? e.touches[0]!.clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]!.clientY : e.clientY;
    setDragPosition({ x: clientX, y: clientY });
  }, [dragFrom]);

  const handleDragEnd = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (dragFrom === null || !boardRef.current) {
      setDragFrom(null);
      setDragPosition(null);
      return;
    }

    const clientX = 'changedTouches' in e ? e.changedTouches[0]!.clientX : e.clientX;
    const clientY = 'changedTouches' in e ? e.changedTouches[0]!.clientY : e.clientY;

    // Find which square was dropped on
    const boardRect = boardRef.current.getBoundingClientRect();
    const squareSize = boardRect.width / 10;
    let col = Math.floor((clientX - boardRect.left) / squareSize);
    let row = Math.floor((clientY - boardRect.top) / squareSize);

    // Adjust for board orientation (grid is reversed for White)
    if (config.playerColor !== PlayerColor.Black) {
      col = 9 - col;
      row = 9 - row;
    }

    // Convert to square number
    if (row >= 0 && row <= 9 && col >= 0 && col <= 9) {
      const isEvenRow = row % 2 === 0;
      const isDark = isEvenRow ? col % 2 === 1 : col % 2 === 0;
      if (isDark) {
        const posInRow = isEvenRow ? (col - 1) / 2 : col / 2;
        const targetSquare = row * 5 + posInRow + 1;
        if (legalMoveSquares.includes(targetSquare)) {
          selectSquare(targetSquare);
        }
      }
    }

    setDragFrom(null);
    setDragPosition(null);
  }, [dragFrom, legalMoveSquares, config.playerColor, selectSquare]);

  const orientation = config.playerColor === PlayerColor.Black 
    ? PlayerColor.Black 
    : PlayerColor.White;

  // Animation system
  const { displayPosition, overlay, onTransitionEnd } = useMoveAnimation(
    position,
    moveHistory,
    moveIndex,
    config.animationSpeed as AnimationSpeed,
    orientation,
  );

  // Combine last move and hint squares for display
  const displayLastMoveSquares = hintSquares.length > 0 ? hintSquares : lastMoveSquares;

  return (
    <div
      ref={boardRef}
      className="relative w-full max-w-[600px]"
      onMouseMove={handleDragMove}
      onMouseUp={handleDragEnd}
      onTouchMove={handleDragMove}
      onTouchEnd={handleDragEnd}
    >
      <Board
        position={displayPosition}
        showNotation={config.showNotation}
        theme={config.boardTheme}
        selectedSquare={selectedSquare}
        legalMoveSquares={config.showLegalMoves ? legalMoveSquares : []}
        lastMoveSquares={displayLastMoveSquares}
        onSquareClick={handleSquareClick}
        onSquareDragStart={handleDragStart}
        orientation={orientation}
      />
      {/* Move animation overlay */}
      {overlay && (
        <AnimatedPieceOverlay
          overlay={overlay}
          orientation={orientation}
          onTransitionEnd={onTransitionEnd}
        />
      )}
      {/* AI thinking overlay */}
      {isAiThinking && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-lg pointer-events-none z-20">
          <div className="bg-white dark:bg-gray-800 rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Thinking...</span>
          </div>
        </div>
      )}
      {/* Drag ghost */}
      {dragFrom !== null && dragPosition && (
        <div
          className="fixed pointer-events-none z-50"
          style={{
            left: dragPosition.x - 25,
            top: dragPosition.y - 25,
            width: 50,
            height: 50,
          }}
        >
          {/* The drag ghost is handled via CSS opacity on the original piece */}
        </div>
      )}
    </div>
  );
};
