import { create } from 'zustand';
import { BoardPosition, Square, PlayerColor, PieceType, Piece, createInitialBoard } from '@/lib/draughts-types';
import { GeneratedMove, generateLegalMoves } from '@/lib/move-generation';
import {
  findBestMove,
  DIFFICULTY_CONFIGS,
  getMoveOrigin,
  getMoveDestination,
  getCapturedSquares as engineGetCapturedSquares,
  formatMoveNotation,
  createClockState,
  tickClock,
  switchClock,
  pauseClock,
  resumeClock,
  startClock,
  isTimeExpired,
  CLOCK_PRESETS,
  type Move as EngineMove,
  type CaptureMove as EngineCaptureMove,
  type ClockState,
  type ClockConfig,
} from '@/lib/engine';
import { requestAiMove } from '@/lib/api-client';
import { devLog, devWarn } from '@/lib/dev-logger';

/** Game phase */
export type GamePhase = 'not-started' | 'in-progress' | 'white-wins' | 'black-wins' | 'draw';

/** Opponent type */
export type OpponentType = 'human' | 'ai';

/** AI difficulty */
export type AIDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

/** Move record for history */
export interface MoveRecord {
  /** Move notation (e.g., "28-33" or "28x39") */
  readonly notation: string;
  /** Player who made the move */
  readonly player: PlayerColor;
  /** Board position after this move */
  readonly positionAfter: BoardPosition;
  /** Timestamp */
  readonly timestamp: number;
}

/** Game session configuration */
export interface GameConfig {
  readonly opponent: OpponentType;
  readonly aiDifficulty: AIDifficulty;
  readonly playerColor: PlayerColor;
  readonly timedMode: boolean;
  readonly clockPreset: string;
  readonly showNotation: boolean;
  readonly boardTheme: 'classic-wood' | 'dark' | 'ocean' | 'tournament-green';
  readonly confirmMoves: boolean;
  readonly showLegalMoves: boolean;
  readonly animationSpeed: 'fast' | 'normal' | 'slow';
}

/** Game state managed by the store */
export interface GameState {
  // Phase & config
  phase: GamePhase;
  config: GameConfig;
  
  // Board state
  position: BoardPosition;
  currentTurn: PlayerColor;
  
  // Interaction state
  selectedSquare: number | null;
  legalMoveSquares: number[];
  legalMovesForSelection: readonly GeneratedMove[];
  lastMoveSquares: number[];
  
  // History
  moveHistory: MoveRecord[];
  moveIndex: number;
  
  // Timing
  isPaused: boolean;
  clockState: ClockState | null;
  
  // AI state
  isAiThinking: boolean;
  
  // Game result info
  gameOverReason: string | null;
  
  // Actions
  startGame: (config?: Partial<GameConfig>) => void;
  selectSquare: (square: number) => void;
  makeMove: (from: number, to: number, notation: string, capturedSquares?: number[]) => void;
  undoMove: () => void;
  redoMove: () => void;
  resign: () => void;
  offerDraw: () => void;
  togglePause: () => void;
  resetGame: () => void;
  setConfig: (config: Partial<GameConfig>) => void;
  setBoardTheme: (theme: GameConfig['boardTheme']) => void;
  toggleNotation: () => void;
  tickClockAction: () => void;
}

const DEFAULT_CONFIG: GameConfig = {
  opponent: 'ai',
  aiDifficulty: 'medium',
  playerColor: PlayerColor.White,
  timedMode: false,
  clockPreset: 'rapid-10+0',
  showNotation: false,
  boardTheme: 'classic-wood',
  confirmMoves: false,
  showLegalMoves: true,
  animationSpeed: 'normal',
};

/** Convert the shared engine's Move type to the frontend format for makeMove */
function convertEngineMove(move: EngineMove): {
  from: number;
  to: number;
  notation: string;
  capturedSquares: number[];
} {
  const notation = formatMoveNotation(move);
  if (move.type === 'quiet') {
    return { from: move.from, to: move.to, notation, capturedSquares: [] };
  }
  const captureMove = move as EngineCaptureMove;
  return {
    from: getMoveOrigin(move),
    to: getMoveDestination(move),
    notation,
    capturedSquares: [...engineGetCapturedSquares(captureMove)],
  };
}

/** Check if the opponent has no legal moves (meaning current player wins) */
function checkGameOver(
  position: BoardPosition,
  nextTurn: PlayerColor,
): GamePhase | null {
  const moves = generateLegalMoves(position, nextTurn);
  if (moves.length === 0) {
    return nextTurn === PlayerColor.White ? 'black-wins' : 'white-wins';
  }
  return null;
}

/** Get the clock config for a preset name */
function getClockConfig(presetName: string): ClockConfig {
  const preset = CLOCK_PRESETS[presetName];
  if (preset) return preset;
  // Default to rapid 10+0
  return CLOCK_PRESETS['rapid-10']!;
}

/** Active AI timer reference for cleanup */
let aiTimerRef: ReturnType<typeof setTimeout> | null = null;

/** Generation counter for cancelling stale AI requests (esp. async expert calls) */
let aiMoveGeneration = 0;

/** Active clock interval reference */
let clockIntervalRef: ReturnType<typeof setInterval> | null = null;

export const useGameStore = create<GameState>((set, get) => ({
  // Initial state
  phase: 'not-started',
  config: DEFAULT_CONFIG,
  position: createInitialBoard(),
  currentTurn: PlayerColor.White,
  selectedSquare: null,
  legalMoveSquares: [],
  legalMovesForSelection: [],
  lastMoveSquares: [],
  moveHistory: [],
  moveIndex: -1,
  isPaused: false,
  clockState: null,
  isAiThinking: false,
  gameOverReason: null,

  startGame: (configOverrides) => {
    // Clear any pending AI move
    if (aiTimerRef) {
      clearTimeout(aiTimerRef);
      aiTimerRef = null;
    }
    aiMoveGeneration++;
    if (clockIntervalRef) {
      clearInterval(clockIntervalRef);
      clockIntervalRef = null;
    }

    const config = { ...get().config, ...configOverrides };
    devLog('game-store', 'Starting game', {
      opponent: config.opponent,
      aiDifficulty: config.aiDifficulty,
      playerColor: config.playerColor,
      timedMode: config.timedMode,
      clockPreset: config.clockPreset,
    });

    // Initialize clock if timed mode
    let initialClock: ClockState | null = null;
    if (config.timedMode) {
      const clockConfig = getClockConfig(config.clockPreset);
      initialClock = startClock(createClockState(clockConfig), 'white', Date.now());

      // Start clock interval
      clockIntervalRef = setInterval(() => {
        const state = get();
        if (state.phase !== 'in-progress' || state.isPaused || !state.clockState) return;
        state.tickClockAction();
      }, 100);
    }

    set({
      phase: 'in-progress',
      config,
      position: createInitialBoard(),
      currentTurn: PlayerColor.White,
      selectedSquare: null,
      legalMoveSquares: [],
      legalMovesForSelection: [],
      lastMoveSquares: [],
      moveHistory: [],
      moveIndex: -1,
      isPaused: false,
      clockState: initialClock,
      isAiThinking: false,
      gameOverReason: null,
    });

    // If player chose Black, AI plays first as White
    if (config.opponent === 'ai' && config.playerColor === PlayerColor.Black) {
      triggerAiMove(get, set);
    }
  },

  selectSquare: (square) => {
    const state = get();
    if (state.phase !== 'in-progress' || state.isPaused || state.isAiThinking) return;
    
    // Block interaction if it's the AI's turn
    if (state.config.opponent === 'ai' && state.currentTurn !== state.config.playerColor) return;

    const piece = state.position[square] as Piece | null;
    
    // If clicking on own piece, select it
    if (piece && piece.color === state.currentTurn) {
      const allLegalMoves = generateLegalMoves(state.position, state.currentTurn);
      const legalMovesForSelection = allLegalMoves.filter((move) => move.from === square);
      const legalMoveSquares = [...new Set(legalMovesForSelection.map((move) => move.to))];

      set({
        selectedSquare: square,
        legalMoveSquares,
        legalMovesForSelection,
      });
      return;
    }

    // If a square is selected and destination is legal, execute move
    if (state.selectedSquare !== null) {
      const selectedMove = state.legalMovesForSelection.find((move) => move.to === square);
      if (selectedMove) {
        get().makeMove(
          selectedMove.from,
          selectedMove.to,
          selectedMove.notation,
          [...selectedMove.capturedSquares],
        );
        return;
      }

      set({
        selectedSquare: null,
        legalMoveSquares: [],
        legalMovesForSelection: [],
      });
    }
  },

  makeMove: (from, to, notation, capturedSquares = []) => {
    const state = get();
    if (state.phase !== 'in-progress') return;
    
    const newPosition = [...state.position] as Square[];
    const piece = newPosition[from];
    if (!piece) return;

    // Move piece
    newPosition[from] = null;
    
    // Check for promotion (man reaching opposite back rank)
    const isPromotion = piece.type === PieceType.Man && (
      (piece.color === PlayerColor.White && to >= 46) ||
      (piece.color === PlayerColor.Black && to <= 5)
    );
    
    newPosition[to] = isPromotion 
      ? { type: PieceType.King, color: piece.color }
      : piece;
    
    // Remove captured pieces
    for (const sq of capturedSquares) {
      newPosition[sq] = null;
    }

    const nextTurn = state.currentTurn === PlayerColor.White 
      ? PlayerColor.Black 
      : PlayerColor.White;

    const moveRecord: MoveRecord = {
      notation,
      player: state.currentTurn,
      positionAfter: newPosition,
      timestamp: Date.now(),
    };
    devLog('game-store', 'Move applied', {
      from,
      to,
      notation,
      player: state.currentTurn,
      capturedSquares,
      isPromotion,
    });

    // Truncate any future history if we were in undo state
    const truncatedHistory = state.moveHistory.slice(0, state.moveIndex + 1);

    // Check game over: does the next player have any legal moves?
    const gameOverPhase = checkGameOver(newPosition, nextTurn);
    
    // Check clock expiry
    let clockUpdate: ClockState | null = state.clockState;
    if (clockUpdate) {
      clockUpdate = switchClock(clockUpdate, Date.now());
    }

    // Determine game over reason
    let gameOverReason: string | null = null;
    let finalPhase: GamePhase = 'in-progress';

    if (gameOverPhase) {
      finalPhase = gameOverPhase;
      gameOverReason = `${gameOverPhase === 'white-wins' ? 'White' : 'Black'} wins — no legal moves remaining`;
      devLog('game-store', 'Game over detected after move', {
        winner: finalPhase,
        reason: gameOverReason,
      });
    }

    set({
      position: newPosition,
      currentTurn: nextTurn,
      selectedSquare: null,
      legalMoveSquares: [],
      legalMovesForSelection: [],
      lastMoveSquares: [from, to],
      moveHistory: [...truncatedHistory, moveRecord],
      moveIndex: truncatedHistory.length,
      phase: finalPhase,
      gameOverReason,
      clockState: clockUpdate,
    });

    // If game is not over and it's AI's turn, schedule AI move
    if (
      finalPhase === 'in-progress' &&
      state.config.opponent === 'ai' &&
      nextTurn !== state.config.playerColor
    ) {
      triggerAiMove(get, set);
    }
  },

  undoMove: () => {
    const state = get();
    if (state.moveIndex < 0) return;

    // Clear any pending AI move
    if (aiTimerRef) {
      clearTimeout(aiTimerRef);
      aiTimerRef = null;
    }
    aiMoveGeneration++;
    
    // For AI games, undo both AI move and player move
    const undoCount = state.config.opponent === 'ai' && state.moveIndex >= 1 ? 2 : 1;
    const targetIndex = state.moveIndex - undoCount;
    devLog('game-store', 'Undo requested', {
      moveIndex: state.moveIndex,
      undoCount,
      targetIndex,
      opponent: state.config.opponent,
    });

    const previousPosition = targetIndex >= 0 
      ? state.moveHistory[targetIndex]!.positionAfter 
      : createInitialBoard();

    // Calculate the correct turn
    let previousTurn = state.currentTurn;
    for (let i = 0; i < undoCount; i++) {
      previousTurn = previousTurn === PlayerColor.White ? PlayerColor.Black : PlayerColor.White;
    }

    set({
      position: previousPosition,
      currentTurn: previousTurn,
      moveIndex: targetIndex,
      selectedSquare: null,
      legalMoveSquares: [],
      legalMovesForSelection: [],
      lastMoveSquares: [],
      phase: 'in-progress',
      gameOverReason: null,
      isAiThinking: false,
    });
  },

  redoMove: () => {
    const state = get();
    if (state.moveIndex >= state.moveHistory.length - 1 || state.isAiThinking) return;
    
    // For AI games, redo both player move and AI move
    const maxRedoCount = state.config.opponent === 'ai' ? 2 : 1;
    const remaining = state.moveHistory.length - 1 - state.moveIndex;
    const redoCount = Math.min(maxRedoCount, remaining);
    
    const nextIndex = state.moveIndex + redoCount;
    const nextMove = state.moveHistory[nextIndex]!;

    // Calculate the correct turn
    let newTurn = state.currentTurn;
    for (let i = 0; i < redoCount; i++) {
      newTurn = newTurn === PlayerColor.White ? PlayerColor.Black : PlayerColor.White;
    }

    // Check game over for the redo'd position
    const gameOverPhase = checkGameOver(nextMove.positionAfter, newTurn);

    set({
      position: nextMove.positionAfter,
      currentTurn: newTurn,
      moveIndex: nextIndex,
      selectedSquare: null,
      legalMoveSquares: [],
      legalMovesForSelection: [],
      lastMoveSquares: [],
      phase: gameOverPhase ?? 'in-progress',
      gameOverReason: gameOverPhase
        ? `${gameOverPhase === 'white-wins' ? 'White' : 'Black'} wins — no legal moves remaining`
        : null,
    });
  },

  resign: () => {
    const state = get();
    if (state.phase !== 'in-progress') return;
    
    // Clean up
    if (aiTimerRef) {
      clearTimeout(aiTimerRef);
      aiTimerRef = null;
    }
    aiMoveGeneration++;
    if (clockIntervalRef) {
      clearInterval(clockIntervalRef);
      clockIntervalRef = null;
    }

    const winner = state.config.playerColor === PlayerColor.White ? 'black-wins' : 'white-wins';
    set({
      phase: winner as GamePhase,
      gameOverReason: `${state.config.playerColor === PlayerColor.White ? 'White' : 'Black'} resigned`,
      isAiThinking: false,
    });
  },

  offerDraw: () => {
    const state = get();
    if (state.phase !== 'in-progress') return;
    // For AI games, accept draw automatically
    if (state.config.opponent === 'ai') {
      if (aiTimerRef) {
        clearTimeout(aiTimerRef);
        aiTimerRef = null;
      }
      aiMoveGeneration++;
      if (clockIntervalRef) {
        clearInterval(clockIntervalRef);
        clockIntervalRef = null;
      }
      set({
        phase: 'draw',
        gameOverReason: 'Draw by mutual agreement',
        isAiThinking: false,
      });
    }
  },

  togglePause: () => {
    const state = get();
    if (state.phase !== 'in-progress') return;
    const nowPaused = !state.isPaused;

    // Pause/resume the clock
    let newClock = state.clockState;
    if (newClock) {
      const now = Date.now();
      if (nowPaused) {
        newClock = pauseClock(newClock, now);
      } else {
        // Resume for the current active player
        const activePlayer = state.currentTurn === PlayerColor.White ? 'white' : 'black';
        newClock = resumeClock(newClock, activePlayer as 'white' | 'black', now);
      }
    }

    set({ isPaused: nowPaused, clockState: newClock });
    devLog('game-store', nowPaused ? 'Game paused' : 'Game resumed', {
      currentTurn: state.currentTurn,
      hasClock: Boolean(state.clockState),
    });
  },

  resetGame: () => {
    if (aiTimerRef) {
      clearTimeout(aiTimerRef);
      aiTimerRef = null;
    }
    aiMoveGeneration++;
    if (clockIntervalRef) {
      clearInterval(clockIntervalRef);
      clockIntervalRef = null;
    }
    set({
      phase: 'not-started',
      position: createInitialBoard(),
      currentTurn: PlayerColor.White,
      selectedSquare: null,
      legalMoveSquares: [],
      legalMovesForSelection: [],
      lastMoveSquares: [],
      moveHistory: [],
      moveIndex: -1,
      isPaused: false,
      clockState: null,
      isAiThinking: false,
      gameOverReason: null,
    });
  },

  setConfig: (configOverrides) => {
    set((state) => ({ config: { ...state.config, ...configOverrides } }));
  },

  setBoardTheme: (theme) => {
    set((state) => ({ config: { ...state.config, boardTheme: theme } }));
  },

  toggleNotation: () => {
    set((state) => ({ config: { ...state.config, showNotation: !state.config.showNotation } }));
  },

  tickClockAction: () => {
    const state = get();
    if (!state.clockState || state.phase !== 'in-progress' || state.isPaused) return;

    const newClock = tickClock(state.clockState, Date.now());

    // Check for time expiry
    if (isTimeExpired(newClock, 'white')) {
      if (clockIntervalRef) {
        clearInterval(clockIntervalRef);
        clockIntervalRef = null;
      }
      set({
        clockState: newClock,
        phase: 'black-wins',
        gameOverReason: 'Black wins on time',
        isAiThinking: false,
      });
      return;
    }
    if (isTimeExpired(newClock, 'black')) {
      if (clockIntervalRef) {
        clearInterval(clockIntervalRef);
        clockIntervalRef = null;
      }
      set({
        clockState: newClock,
        phase: 'white-wins',
        gameOverReason: 'White wins on time',
        isAiThinking: false,
      });
      return;
    }

    set({ clockState: newClock });
  },
}));

/**
 * Rotates a square number via 180-degree board rotation (s → 51-s).
 * Converts between frontend orientation (White on 1-20) and
 * FMJD standard orientation (White on 31-50) used by the backend.
 */
function rotateSquare(square: number): number {
  return 51 - square;
}

/**
 * Converts a frontend board position to the backend's FMJD-standard int[] encoding.
 * Applies 180-degree rotation so White appears on squares 31-50.
 * Piece encoding: 0=empty, 1=white man, 2=black man, 3=white king, 4=black king.
 */
function boardToApiFormat(position: BoardPosition): number[] {
  const board = new Array(51).fill(0);
  for (let sq = 1; sq <= 50; sq++) {
    const piece = position[sq] as Piece | null;
    if (!piece) continue;
    const targetSq = rotateSquare(sq);
    if (piece.color === PlayerColor.White) {
      board[targetSq] = piece.type === PieceType.Man ? 1 : 3;
    } else {
      board[targetSq] = piece.type === PieceType.Man ? 2 : 4;
    }
  }
  return board;
}

/**
 * Triggers an AI move after a short delay to allow UI update.
 * For easy/medium/hard: uses the local shared engine's findBestMove.
 * For expert: calls the backend Expert AI endpoint with board rotation.
 */
function triggerAiMove(
  get: () => GameState,
  set: (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void,
): void {
  const preState = get();
  devLog('ai', 'Scheduling AI move', {
    turn: preState.currentTurn,
    aiDifficulty: preState.config.aiDifficulty,
    moveIndex: preState.moveIndex,
  });

  set({ isAiThinking: true });
  const generation = ++aiMoveGeneration;

  if (preState.config.aiDifficulty === 'expert') {
    // Expert AI: async call to backend
    void (async () => {
      try {
        const state = get();
        const playerStr = state.currentTurn === PlayerColor.White ? 'white' : 'black';
        const apiBoard = boardToApiFormat(state.position);
        const response = await requestAiMove(apiBoard, playerStr, 'expert', 5000);

        // Check if the request is still relevant (game may have been reset/resigned)
        if (generation !== aiMoveGeneration || get().phase !== 'in-progress') {
          set({ isAiThinking: false });
          return;
        }

        // De-rotate the move from FMJD coordinates to frontend coordinates
        const from = rotateSquare(response.from);
        const to = rotateSquare(response.to);
        const capturedSquares = response.capturedSquares.map(rotateSquare);
        const notation = capturedSquares.length > 0 ? `${from}x${to}` : `${from}-${to}`;

        devLog('ai', 'Expert AI move received', {
          from,
          to,
          notation,
          score: response.score,
          depthReached: response.depthReached,
          timeConsumedMs: response.timeConsumedMs,
        });

        set({ isAiThinking: false });
        get().makeMove(from, to, notation, capturedSquares);
      } catch (error) {
        // Check if the request is still relevant
        if (generation !== aiMoveGeneration || get().phase !== 'in-progress') {
          set({ isAiThinking: false });
          return;
        }

        devWarn('ai', 'Expert AI request failed, falling back to hard difficulty', { error });

        // Fallback to local hard AI
        const state = get();
        const difficultyConfig = DIFFICULTY_CONFIGS['hard'];
        if (!difficultyConfig) {
          set({ isAiThinking: false });
          return;
        }

        const result = findBestMove(
          state.position as Square[],
          state.currentTurn,
          difficultyConfig,
        );

        if (!result) {
          const winner = state.currentTurn === PlayerColor.White ? 'black-wins' : 'white-wins';
          set({
            phase: winner as GamePhase,
            gameOverReason: `${state.currentTurn === PlayerColor.White ? 'White' : 'Black'} has no legal moves`,
            isAiThinking: false,
          });
          return;
        }

        const { from, to, notation, capturedSquares } = convertEngineMove(result.move);
        set({ isAiThinking: false });
        get().makeMove(from, to, notation, capturedSquares);
      }
    })();
    return;
  }

  // Local AI (easy/medium/hard): use setTimeout to allow the UI to render "thinking" state
  aiTimerRef = setTimeout(() => {
    aiTimerRef = null;

    // Check if the request is still relevant
    if (generation !== aiMoveGeneration || get().phase !== 'in-progress') {
      set({ isAiThinking: false });
      devWarn('ai', 'Cancelled AI move — game state has changed', {
        phase: get().phase,
      });
      return;
    }

    const state = get();
    const difficultyConfig = DIFFICULTY_CONFIGS[state.config.aiDifficulty];
    if (!difficultyConfig) {
      set({ isAiThinking: false });
      devWarn('ai', 'Missing AI difficulty configuration', {
        difficulty: state.config.aiDifficulty,
      });
      return;
    }

    // Call findBestMove from the shared engine
    // Board positions are structurally compatible between frontend and shared engine
    const result = findBestMove(
      state.position as Square[],
      state.currentTurn,
      difficultyConfig,
    );

    if (!result) {
      // AI has no legal moves — AI loses
      const winner = state.currentTurn === PlayerColor.White ? 'black-wins' : 'white-wins';
      devLog('ai', 'No legal AI move returned', {
        winner,
        turn: state.currentTurn,
      });
      set({
        phase: winner as GamePhase,
        gameOverReason: `${state.currentTurn === PlayerColor.White ? 'White' : 'Black'} has no legal moves`,
        isAiThinking: false,
      });
      return;
    }

    // Convert the engine move to frontend format
    const { from, to, notation, capturedSquares } = convertEngineMove(result.move);
    devLog('ai', 'AI move selected', {
      from,
      to,
      notation,
      score: result.score,
      nodesEvaluated: result.nodesEvaluated,
      depthReached: result.depthReached,
    });

    // Make the move
    set({ isAiThinking: false });
    get().makeMove(from, to, notation, capturedSquares);
  }, 150); // Short delay before AI computes to allow UI to update
}
