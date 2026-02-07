'use client';

import React, { useState } from 'react';
import { Board } from '@/components/board/Board';
import { createInitialBoard, createEmptyBoard, PieceType, PlayerColor, Square } from '@/lib/draughts-types';
import Link from 'next/link';

interface TutorialStep {
  title: string;
  description: string;
  board: Square[];
  highlights?: number[];
}

const createTutorialBoard = (pieces: { sq: number; type: PieceType; color: PlayerColor }[]): Square[] => {
  const board = createEmptyBoard();
  for (const p of pieces) {
    board[p.sq] = { type: p.type, color: p.color };
  }
  return board;
};

const STEPS: TutorialStep[] = [
  {
    title: 'Welcome to International Draughts!',
    description: 'International Draughts (also called 10×10 Draughts) is played on a 10×10 board. Each player starts with 20 pieces. White plays on the dark squares and moves first.',
    board: createInitialBoard(),
  },
  {
    title: 'How Men Move',
    description: 'Men (regular pieces) move diagonally forward one square. White moves towards the black side (down the board), and black moves towards the white side.',
    board: createTutorialBoard([
      { sq: 28, type: PieceType.Man, color: PlayerColor.White },
    ]),
    highlights: [33, 32],
  },
  {
    title: 'Capturing',
    description: 'Men can capture enemy pieces by jumping over them diagonally (both forward and backward). Captures are mandatory — you must capture if you can!',
    board: createTutorialBoard([
      { sq: 28, type: PieceType.Man, color: PlayerColor.White },
      { sq: 33, type: PieceType.Man, color: PlayerColor.Black },
    ]),
    highlights: [39],
  },
  {
    title: 'Multiple Captures',
    description: 'If after a capture you can capture again, you must continue capturing. The maximum capture rule applies: you must choose the sequence that captures the most pieces.',
    board: createTutorialBoard([
      { sq: 28, type: PieceType.Man, color: PlayerColor.White },
      { sq: 33, type: PieceType.Man, color: PlayerColor.Black },
      { sq: 43, type: PieceType.Man, color: PlayerColor.Black },
    ]),
    highlights: [39, 48],
  },
  {
    title: 'Promotion to King',
    description: 'When a man reaches the opposite back row, it becomes a King (crowned piece). Kings can move and capture diagonally in any direction and along the entire diagonal.',
    board: createTutorialBoard([
      { sq: 25, type: PieceType.King, color: PlayerColor.White },
    ]),
    highlights: [20, 30, 34, 39, 44, 48, 3, 14],
  },
  {
    title: 'Winning the Game',
    description: 'You win by capturing all opponent\'s pieces or blocking them so they cannot move. A draw can occur by agreement, or when the position repeats three times, or after 25 moves without a capture or man move.',
    board: createTutorialBoard([
      { sq: 28, type: PieceType.King, color: PlayerColor.White },
      { sq: 22, type: PieceType.Man, color: PlayerColor.White },
      { sq: 47, type: PieceType.Man, color: PlayerColor.Black },
    ]),
  },
];

export default function TutorialPage() {
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Learn to Play</h1>
          <Link href="/play" className="text-blue-600 hover:underline text-sm">
            Skip to game →
          </Link>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full transition-colors ${i <= stepIndex ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'}`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {step.title}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            {step.description}
          </p>

          {/* Board visualization */}
          <div className="max-w-sm mx-auto">
            <Board
              position={step.board}
              showNotation={true}
              legalMoveSquares={step.highlights}
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            disabled={stepIndex === 0}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            ← Previous
          </button>
          
          {stepIndex < STEPS.length - 1 ? (
            <button
              onClick={() => setStepIndex((i) => i + 1)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Next →
            </button>
          ) : (
            <Link
              href="/play"
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors inline-flex items-center"
            >
              Start Playing! 🎮
            </Link>
          )}
        </div>

        <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
          Step {stepIndex + 1} of {STEPS.length}
        </div>
      </div>
    </main>
  );
}
