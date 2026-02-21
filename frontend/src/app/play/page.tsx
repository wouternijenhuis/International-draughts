'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { GameBoard } from '@/components/game/GameBoard';
import { GameControls } from '@/components/game/GameControls';
import { GameStatus } from '@/components/game/GameStatus';
import { MoveHistory } from '@/components/game/MoveHistory';
import { PauseOverlay } from '@/components/game/PauseOverlay';
import { VictoryAnimation } from '@/components/game/VictoryAnimation';
import { GameConfigSummary } from '@/components/game/GameConfigSummary';
import { ChessClock } from '@/components/clock/ChessClock';
import { ResumePrompt } from '@/components/game/ResumePrompt';
import { GameSetupDialog } from '@/components/game/setup/GameSetupDialog';
import { useGameStore } from '@/stores/game-store';
import { useAuthStore } from '@/stores/auth-store';
import { PlayerColor } from '@/lib/draughts-types';
import type { LastGameConfig } from '@/lib/game-config-persistence';
import {
  loadGuestGame,
  loadUserGame,
  clearGuestGame,
  clearUserGameLocal,
  clearUserGameBackend,
  type SerializedGameState,
} from '@/lib/game-persistence';

function getGameDescription(game: SerializedGameState): string {
  if (game.config.opponent === 'ai') {
    const difficulty = game.config.aiDifficulty.charAt(0).toUpperCase() + game.config.aiDifficulty.slice(1);
    return `vs AI (${difficulty})`;
  }
  return 'Local PvP';
}

/**
 * Resolves a LastGameConfig into Partial<GameConfig> for the store,
 * handling 'random' color assignment.
 */
function resolveSetupConfig(setupConfig: LastGameConfig): {
  opponent: LastGameConfig['opponent'];
  aiDifficulty: LastGameConfig['difficulty'];
  playerColor: PlayerColor;
  timedMode: boolean;
  clockPreset: string;
} {
  let playerColor: PlayerColor;
  if (setupConfig.playAs === 'random') {
    playerColor = Math.random() < 0.5 ? PlayerColor.White : PlayerColor.Black;
  } else {
    playerColor = setupConfig.playAs === 'white' ? PlayerColor.White : PlayerColor.Black;
  }

  return {
    opponent: setupConfig.opponent,
    aiDifficulty: setupConfig.difficulty,
    playerColor,
    timedMode: setupConfig.timedMode,
    clockPreset: setupConfig.clockPreset,
  };
}

/** Inner component that reads searchParams (must be wrapped in Suspense). */
function PlayPageContent() {
  const { config, currentTurn, isPaused, clockState, resumeGame, phase, startGame } = useGameStore();
  const { user, isAuthenticated } = useAuthStore();
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [savedGame, setSavedGame] = useState<SerializedGameState | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Adjusting state during rendering: handle ?setup=true query param from Home page
  const [setupParamHandled, setSetupParamHandled] = useState(false);
  const hasSetupParam = searchParams.get('setup') === 'true';
  if (hasSetupParam && !setupParamHandled) {
    setSetupParamHandled(true);
    setShowSetupDialog(true);
  }

  // Clean up the ?setup=true param from the URL (side effect only, no setState)
  useEffect(() => {
    if (searchParams.get('setup') === 'true') {
      router.replace('/play', { scroll: false });
    }
  }, [searchParams, router]);

  useEffect(() => {
    const checkForSavedGame = async () => {
      let saved: SerializedGameState | null = null;

      if (user && isAuthenticated()) {
        saved = await loadUserGame(user.userId);
      } else {
        saved = loadGuestGame();
      }

      if (saved) {
        setSavedGame(saved);
        setShowResumePrompt(true);
      } else if (phase === 'not-started') {
        // No saved game — auto-open the setup dialog
        setShowSetupDialog(true);
      }
    };

    if (phase === 'not-started') {
      checkForSavedGame();
    }
  }, [user, isAuthenticated, phase]);

  const handleResume = () => {
    if (savedGame) {
      resumeGame(savedGame);
    }
    setShowResumePrompt(false);
    setSavedGame(null);
  };

  const handleDiscard = () => {
    setShowResumePrompt(false);
    setSavedGame(null);
    clearGuestGame();
    clearUserGameLocal();
    if (user?.userId) {
      void clearUserGameBackend(user.userId);
    }
    // After discarding, open the setup dialog
    setShowSetupDialog(true);
  };

  /** Called by the setup dialog when the user clicks "Start Game" or "Quick Start". */
  const handleStartGame = useCallback((setupConfig: LastGameConfig) => {
    const resolvedConfig = resolveSetupConfig(setupConfig);
    startGame(resolvedConfig);
  }, [startGame]);

  /** Called by GameControls when the user clicks "New Game". */
  const handleNewGame = useCallback(() => {
    setShowSetupDialog(true);
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Skip navigation link for accessibility */}
      <a
        href="#game-board"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg"
      >
        Skip to game board
      </a>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header with navigation */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              International Draughts
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/tutorial"
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm text-gray-600 dark:text-gray-400"
              aria-label="How to play"
            >
              ?
            </Link>
          </div>
        </header>

        {/* Main content area — responsive grid */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left column: Board and controls */}
          <div className="flex-1 flex flex-col items-center" id="game-board">
            {/* Clock (above board) */}
            {config.timedMode && clockState && (
              <div className="w-full max-w-[600px] mb-4">
                <ChessClock
                  whiteTime={clockState.white.remainingMs}
                  blackTime={clockState.black.remainingMs}
                  activePlayer={currentTurn}
                  isPaused={isPaused}
                />
              </div>
            )}

            {/* Game Status */}
            <div className="w-full max-w-[600px] mb-4">
              <GameStatus />
            </div>

            {/* In-game config summary */}
            <div className="w-full max-w-[600px]">
              <GameConfigSummary />
            </div>

            {/* Board */}
            <GameBoard />

            {/* Controls */}
            <div className="w-full max-w-[600px]">
              <GameControls onNewGame={handleNewGame} />
            </div>
          </div>

          {/* Right column: Move history and settings */}
          <aside className="w-full lg:w-80 space-y-4" aria-label="Game information">
            {/* Move History */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Moves</h2>
              <MoveHistory />
            </div>


          </aside>
        </div>
      </div>

      {/* Pause overlay */}
      <PauseOverlay />

      {/* Victory animation — Solitaire-style piece cascade */}
      <VictoryAnimation />

      {/* Resume prompt for saved games */}
      {showResumePrompt && savedGame && (
        <ResumePrompt
          savedAt={new Date(savedGame.savedAt)}
          gameDescription={getGameDescription(savedGame)}
          moveCount={savedGame.moveHistory.length}
          onResume={handleResume}
          onDiscard={handleDiscard}
        />
      )}

      {/* Game setup dialog */}
      {!showResumePrompt && (
        <GameSetupDialog
          open={showSetupDialog}
          onClose={() => setShowSetupDialog(false)}
          onStartGame={handleStartGame}
        />
      )}
    </main>
  );
}

/** Play page with Suspense boundary for useSearchParams. */
export default function PlayPage() {
  return (
    <Suspense>
      <PlayPageContent />
    </Suspense>
  );
}
