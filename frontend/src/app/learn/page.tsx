'use client';

import { useState, useCallback } from 'react';
import { Board } from '@/components/board/Board';
import { GameBoard } from '@/components/game/GameBoard';
import { GameControls } from '@/components/game/GameControls';
import { GameStatus } from '@/components/game/GameStatus';
import { MoveHistory } from '@/components/game/MoveHistory';
import { MoveFeedback } from '@/components/game/MoveFeedback';
import { PauseOverlay } from '@/components/game/PauseOverlay';
import { useGameStore } from '@/stores/game-store';
import { createInitialBoard, createEmptyBoard, PieceType, PlayerColor, Square } from '@/lib/draughts-types';
import Link from 'next/link';

/* ─────────── Tutorial data ─────────── */

interface TutorialStep {
  title: string;
  description: string;
  board: Square[];
  highlights?: number[];
  /** Detailed bullet points (rendered below description) */
  details?: string[];
}

const createTutorialBoard = (
  pieces: { sq: number; type: PieceType; color: PlayerColor }[],
): Square[] => {
  const board = createEmptyBoard();
  for (const p of pieces) {
    board[p.sq] = { type: p.type, color: p.color };
  }
  return board;
};

const TUTORIAL_STEPS: TutorialStep[] = [
  /* 1 — Board & Setup */
  {
    title: '1. The Board & Setup',
    description:
      'International Draughts is played on a 10×10 board with alternating light and dark squares. Only the dark (brown) squares are used. Each player starts with 20 pieces — called "men" — placed on the first four rows of their side.',
    board: createInitialBoard(),
    details: [
      'White pieces occupy squares 31–50 (the bottom four rows).',
      'Black pieces occupy squares 1–20 (the top four rows).',
      'Squares 21–30 (the middle two rows) start empty.',
      'White always moves first.',
    ],
  },
  /* 2 — How Men Move */
  {
    title: '2. How Men Move',
    description:
      'Men move diagonally forward by exactly one square onto an empty dark square. White moves towards the top of the board (ascending square numbers), and Black moves towards the bottom.',
    board: createTutorialBoard([
      { sq: 33, type: PieceType.Man, color: PlayerColor.White },
    ]),
    highlights: [28, 29],
    details: [
      'A man can only move forward — never backward (except when capturing).',
      'Each move goes diagonally to an adjacent empty square.',
      'If a man has no legal moves and cannot capture, it is stuck.',
    ],
  },
  /* 3 — Capturing with Men */
  {
    title: '3. Capturing with Men',
    description:
      'Men capture by jumping diagonally over an adjacent enemy piece to the empty square beyond it. Unlike regular moves, men can capture both forward AND backward.',
    board: createTutorialBoard([
      { sq: 33, type: PieceType.Man, color: PlayerColor.White },
      { sq: 28, type: PieceType.Man, color: PlayerColor.Black },
    ]),
    highlights: [22],
    details: [
      'The square behind the enemy piece must be empty.',
      'The captured piece is removed from the board.',
      'Men can capture backward — this is a key rule of International Draughts!',
    ],
  },
  /* 4 — Mandatory Capture */
  {
    title: '4. Mandatory Capture!',
    description:
      'In International Draughts, capturing is mandatory. If you can capture, you must capture — you cannot make a regular move instead. This is one of the most important rules to remember.',
    board: createTutorialBoard([
      { sq: 33, type: PieceType.Man, color: PlayerColor.White },
      { sq: 28, type: PieceType.Man, color: PlayerColor.Black },
      { sq: 38, type: PieceType.Man, color: PlayerColor.White },
    ]),
    highlights: [22],
    details: [
      'If any of your pieces can capture, you must make a capture move.',
      'You cannot choose to move a different piece that cannot capture.',
      'This rule applies to both men and kings.',
    ],
  },
  /* 5 — Maximum Capture Rule */
  {
    title: '5. The Maximum Capture Rule',
    description:
      'When you have multiple capture sequences available, you MUST choose the sequence that captures the most pieces. This is called the "majority rule" and is unique to International Draughts.',
    board: createTutorialBoard([
      { sq: 37, type: PieceType.Man, color: PlayerColor.White },
      { sq: 32, type: PieceType.Man, color: PlayerColor.Black },
      { sq: 33, type: PieceType.Man, color: PlayerColor.Black },
      { sq: 22, type: PieceType.Man, color: PlayerColor.Black },
    ]),
    highlights: [28, 17],
    details: [
      'Count the total pieces captured in each possible sequence.',
      'You must pick the sequence with the highest total captures.',
      'If two sequences capture the same number of pieces, you may choose either.',
      'A king capture and a man capture count equally.',
    ],
  },
  /* 6 — Chain Captures */
  {
    title: '6. Chain (Multiple) Captures',
    description:
      'After making a capture, if the same piece can capture again from its landing square, it must continue capturing. This creates chain captures where you can take several pieces in one turn.',
    board: createTutorialBoard([
      { sq: 39, type: PieceType.Man, color: PlayerColor.White },
      { sq: 33, type: PieceType.Man, color: PlayerColor.Black },
      { sq: 22, type: PieceType.Man, color: PlayerColor.Black },
    ]),
    highlights: [28, 17],
    details: [
      'A man continues jumping as long as captures are available.',
      'You may not stop in the middle of a chain capture.',
      'Captured pieces are removed only after the entire chain is complete.',
      'A piece cannot jump over the same enemy piece twice in one chain.',
    ],
  },
  /* 7 — Promotion to King */
  {
    title: '7. Promotion to King',
    description:
      'When a man reaches the opposite back row (the opponent\'s first row), it is promoted to a King. Kings are marked with a crown symbol. Promotion happens at the end of a move — if a man reaches the back row during a chain capture, it does NOT promote until the chain is finished.',
    board: createTutorialBoard([
      { sq: 4, type: PieceType.Man, color: PlayerColor.White },
      { sq: 47, type: PieceType.Man, color: PlayerColor.Black },
      { sq: 25, type: PieceType.King, color: PlayerColor.White },
    ]),
    details: [
      'White promotes on squares 1–5 (top row).',
      'Black promotes on squares 46–50 (bottom row).',
      'Kings are much more powerful than men — protect yours and try to promote!',
    ],
  },
  /* 8 — Flying Kings — Movement */
  {
    title: '8. Flying Kings — Movement',
    description:
      'Kings in International Draughts are "flying kings" — they can move any number of squares along a diagonal, like a bishop in chess. This makes kings extremely powerful pieces.',
    board: createTutorialBoard([
      { sq: 28, type: PieceType.King, color: PlayerColor.White },
    ]),
    highlights: [1, 6, 10, 14, 19, 23, 32, 37, 41, 46, 5, 12, 17, 22, 33, 39, 44, 50],
    details: [
      'A king can move along any of its four diagonals.',
      'It can travel any number of empty squares along a diagonal.',
      'It must stay on the same diagonal for a single move.',
      'This is different from English/American checkers, where kings move only one square!',
    ],
  },
  /* 9 — Flying Kings — Capturing */
  {
    title: '9. Flying Kings — Capturing',
    description:
      'Kings capture by jumping over an enemy piece from any distance along a diagonal, and can land on any empty square beyond the captured piece. This gives kings enormous capturing power.',
    board: createTutorialBoard([
      { sq: 46, type: PieceType.King, color: PlayerColor.White },
      { sq: 28, type: PieceType.Man, color: PlayerColor.Black },
    ]),
    highlights: [23, 19, 14, 10, 5],
    details: [
      'The king can be far from the enemy piece — it just needs a clear diagonal path.',
      'After capturing, the king can land on ANY empty square beyond the captured piece.',
      'Kings can change direction during chain captures (onto a different diagonal).',
      'A king cannot jump over its own pieces or over two enemy pieces in a row.',
    ],
  },
  /* 10 — Winning the Game */
  {
    title: '10. Winning the Game',
    description:
      'You win by either capturing all of your opponent\'s pieces, or by blocking them so they have no legal moves. If your opponent cannot move on their turn, you win!',
    board: createTutorialBoard([
      { sq: 28, type: PieceType.King, color: PlayerColor.White },
      { sq: 22, type: PieceType.Man, color: PlayerColor.White },
      { sq: 47, type: PieceType.Man, color: PlayerColor.Black },
    ]),
    details: [
      'Capture all enemy pieces — most common way to win.',
      'Block all enemy pieces so they cannot move — a positional win.',
      'Games may also end in a draw (see next step).',
    ],
  },
  /* 11 — Draw Rules */
  {
    title: '11. Draw Rules',
    description:
      'A game can end in a draw in several ways. Draws are relatively common in high-level play, so knowing these rules is important.',
    board: createTutorialBoard([
      { sq: 28, type: PieceType.King, color: PlayerColor.White },
      { sq: 46, type: PieceType.King, color: PlayerColor.Black },
    ]),
    details: [
      'Mutual agreement — both players agree to a draw.',
      'Threefold repetition — the same position occurs three times with the same player to move.',
      '25-move rule — if 25 consecutive moves are made by each side without a capture or man move, the game is drawn.',
      '16-move endgame rule — in a king-vs-king endgame (with limited material), the stronger side must win within 16 moves.',
      'In this app, draw rules are enforced automatically!',
    ],
  },
  /* 12 — Basic Strategy Tips */
  {
    title: '12. Basic Strategy Tips',
    description:
      'Now that you know the rules, here are some strategic principles to improve your game. International Draughts is a deep game with lots of tactics!',
    board: createInitialBoard(),
    details: [
      'Control the center — pieces in the center have more movement options.',
      'Keep your back row filled — this prevents your opponent from promoting.',
      'Build formations — pieces supporting each other are stronger.',
      'Think ahead — look for forced capture sequences that win material.',
      'Race to promote — a king is worth much more than a man.',
      'Don\'t overextend — lone pieces pushed too far forward are easy targets.',
      'Use the mandatory capture rule — sometimes you can force your opponent into bad captures.',
      'Practice tactics — multiple captures and sacrifices are the heart of the game!',
    ],
  },
];

/* ─────────── Learn Page component ─────────── */

type LearnTab = 'tutorial' | 'practice';

export default function LearnPage() {
  const [tab, setTab] = useState<LearnTab>('tutorial');
  const [stepIndex, setStepIndex] = useState(0);
  const { phase, startGame } = useGameStore();

  const step = TUTORIAL_STEPS[stepIndex]!;

  const startPractice = useCallback(() => {
    setTab('practice');
    if (phase === 'not-started') {
      startGame({
        gameMode: 'learning',
        opponent: 'ai',
        aiDifficulty: 'easy',
        showLegalMoves: true,
        timedMode: false,
      });
    }
  }, [phase, startGame]);

  const startNewPractice = useCallback(() => {
    startGame({
      gameMode: 'learning',
      opponent: 'ai',
      aiDifficulty: 'easy',
      showLegalMoves: true,
      timedMode: false,
    });
  }, [startGame]);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Skip navigation */}
      <a
        href="#learn-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg"
      >
        Skip to content
      </a>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Learn Draughts
            </h1>
          </div>
          <Link
            href="/play"
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            ♟ Play Game
          </Link>
        </header>

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 bg-gray-200 dark:bg-gray-800 rounded-lg p-1 max-w-sm" role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'tutorial'}
            onClick={() => setTab('tutorial')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === 'tutorial'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            📖 Tutorial
          </button>
          <button
            role="tab"
            aria-selected={tab === 'practice'}
            onClick={startPractice}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === 'practice'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            🎮 Practice
          </button>
        </div>

        {/* Content */}
        <div id="learn-content">
          {tab === 'tutorial' && (
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left: step content */}
              <div className="flex-1 max-w-2xl">
                {/* Compact progress */}
                <div className="flex gap-0.5 mb-4">
                  {TUTORIAL_STEPS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setStepIndex(i)}
                      className={`flex-1 h-1.5 rounded-full transition-colors ${
                        i <= stepIndex ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'
                      }`}
                      aria-label={`Go to step ${i + 1}`}
                    />
                  ))}
                </div>

                {/* Step card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    {step.title}
                  </h2>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                    {step.description}
                  </p>
                  {step.details && (
                    <ul className="space-y-2 mb-4">
                      {step.details.map((detail, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <span className="text-blue-500 mt-1 shrink-0">•</span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Board visualization */}
                  <div className="max-w-sm mx-auto mt-4">
                    <Board
                      position={step.board}
                      showNotation={true}
                      legalMoveSquares={step.highlights}
                    />
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex justify-between items-center">
                  <button
                    onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                    disabled={stepIndex === 0}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
                  >
                    ← Previous
                  </button>

                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Step {stepIndex + 1} of {TUTORIAL_STEPS.length}
                  </span>

                  {stepIndex < TUTORIAL_STEPS.length - 1 ? (
                    <button
                      onClick={() => setStepIndex((i) => i + 1)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
                    >
                      Next →
                    </button>
                  ) : (
                    <button
                      onClick={startPractice}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm inline-flex items-center gap-1"
                    >
                      Start Practicing! 🎮
                    </button>
                  )}
                </div>
              </div>

              {/* Right: step list sidebar (desktop) */}
              <aside className="hidden lg:block w-72" aria-label="Tutorial steps">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sticky top-6">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Lesson overview</h3>
                  <nav className="space-y-1">
                    {TUTORIAL_STEPS.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => setStepIndex(i)}
                        className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                          i === stepIndex
                            ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium'
                            : i < stepIndex
                              ? 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <span className="inline-flex items-center gap-2">
                          {i < stepIndex ? (
                            <span className="text-green-500 text-xs">✓</span>
                          ) : i === stepIndex ? (
                            <span className="text-blue-500 text-xs">▶</span>
                          ) : (
                            <span className="text-gray-400 text-xs">○</span>
                          )}
                          {s.title}
                        </span>
                      </button>
                    ))}
                  </nav>
                </div>
              </aside>
            </div>
          )}

          {tab === 'practice' && (
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left: board and controls */}
              <div className="flex-1 flex flex-col items-center">
                {/* Learning mode banner */}
                <div className="w-full max-w-[600px] mb-4 px-4 py-3 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎓</span>
                    <div>
                      <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                        Learning Mode
                      </p>
                      <p className="text-xs text-purple-600 dark:text-purple-400">
                        Use <strong>Hint</strong> to see the best move, <strong>Undo/Redo</strong> to experiment freely, and watch for feedback after each move.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Game Status */}
                <div className="w-full max-w-[600px] mb-2">
                  <GameStatus />
                </div>

                {/* Move feedback */}
                <div className="w-full max-w-[600px] mb-2">
                  <MoveFeedback />
                </div>

                {/* Board */}
                <GameBoard />

                {/* Controls */}
                <div className="w-full max-w-[600px]">
                  <GameControls />
                </div>

                {/* Quick start if game ended */}
                {(phase === 'white-wins' || phase === 'black-wins' || phase === 'draw') && (
                  <button
                    onClick={startNewPractice}
                    className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                  >
                    🔄 New Practice Game
                  </button>
                )}
              </div>

              {/* Right: move history + tips */}
              <aside className="w-full lg:w-80 space-y-4" aria-label="Game information">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Moves</h2>
                  <MoveHistory />
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Quick Tips</h2>
                  <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                    <li className="flex items-start gap-2">
                      <span className="text-purple-500 mt-0.5">💡</span>
                      <span>Use the <strong>Hint</strong> button if you&apos;re unsure what to play.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-500 mt-0.5">↩</span>
                      <span>Use <strong>Undo</strong> to take back a move and try a different approach.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-500 mt-0.5">↪</span>
                      <span>Use <strong>Redo</strong> to replay your undone moves.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-500 mt-0.5">🎯</span>
                      <span>Green dots show legal moves. Look for captures first — they&apos;re mandatory!</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-500 mt-0.5">👑</span>
                      <span>Try to get a king by reaching the opposite back row.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-500 mt-0.5">📖</span>
                      <span>
                        Switch to the{' '}
                        <button
                          onClick={() => setTab('tutorial')}
                          className="text-blue-500 hover:underline"
                        >
                          Tutorial tab
                        </button>{' '}
                        to review the rules.
                      </span>
                    </li>
                  </ul>
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>

      <PauseOverlay />
    </main>
  );
}
