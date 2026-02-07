import { create } from 'zustand';
import { BoardPosition, Square, PlayerColor, PieceType, Piece, createInitialBoard } from '@/lib/draughts-types';

/** Game phase */
export type GamePhase = 'not-started' | 'in-progress' | 'white-wins' | 'black-wins' | 'draw';

/** Opponent type */
export type OpponentType = 'human' | 'ai';

/** AI difficulty */
export type AIDifficulty = 'easy' | 'medium' | 'hard';

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
  readonly showNotation: boolean;
  readonly boardTheme: 'classic-wood' | 'dark' | 'ocean' | 'tournament-green';
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
  lastMoveSquares: number[];
  
  // History
  moveHistory: MoveRecord[];
  moveIndex: number; // For undo/redo
  
  // Timing
  isPaused: boolean;
  
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
}

const DEFAULT_CONFIG: GameConfig = {
  opponent: 'ai',
  aiDifficulty: 'medium',
  playerColor: PlayerColor.White,
  timedMode: false,
  showNotation: false,
  boardTheme: 'classic-wood',
};

export const useGameStore = create<GameState>((set, get) => ({
  // Initial state
  phase: 'not-started',
  config: DEFAULT_CONFIG,
  position: createInitialBoard(),
  currentTurn: PlayerColor.White,
  selectedSquare: null,
  legalMoveSquares: [],
  lastMoveSquares: [],
  moveHistory: [],
  moveIndex: -1,
  isPaused: false,

  startGame: (configOverrides) => {
    const config = { ...get().config, ...configOverrides };
    set({
      phase: 'in-progress',
      config,
      position: createInitialBoard(),
      currentTurn: PlayerColor.White,
      selectedSquare: null,
      legalMoveSquares: [],
      lastMoveSquares: [],
      moveHistory: [],
      moveIndex: -1,
      isPaused: false,
    });
  },

  selectSquare: (square) => {
    const state = get();
    if (state.phase !== 'in-progress' || state.isPaused) return;
    
    const piece = state.position[square] as Piece | null;
    
    // If clicking on own piece, select it
    if (piece && piece.color === state.currentTurn) {
      set({ selectedSquare: square, legalMoveSquares: [] });
      return;
    }
    
    // If a square was already selected and clicking on an empty/enemy square,
    // this would be handled by makeMove from the interaction layer
    if (state.selectedSquare !== null) {
      set({ selectedSquare: null, legalMoveSquares: [] });
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

    // Truncate any future history if we were in undo state
    const truncatedHistory = state.moveHistory.slice(0, state.moveIndex + 1);

    set({
      position: newPosition,
      currentTurn: nextTurn,
      selectedSquare: null,
      legalMoveSquares: [],
      lastMoveSquares: [from, to],
      moveHistory: [...truncatedHistory, moveRecord],
      moveIndex: truncatedHistory.length,
    });
  },

  undoMove: () => {
    const state = get();
    if (state.moveIndex < 0) return;
    
    const previousIndex = state.moveIndex - 1;
    const previousPosition = previousIndex >= 0 
      ? state.moveHistory[previousIndex].positionAfter 
      : createInitialBoard();
    const previousTurn = state.currentTurn === PlayerColor.White 
      ? PlayerColor.Black 
      : PlayerColor.White;

    set({
      position: previousPosition,
      currentTurn: previousTurn,
      moveIndex: previousIndex,
      selectedSquare: null,
      legalMoveSquares: [],
      lastMoveSquares: [],
    });
  },

  redoMove: () => {
    const state = get();
    if (state.moveIndex >= state.moveHistory.length - 1) return;
    
    const nextIndex = state.moveIndex + 1;
    const nextMove = state.moveHistory[nextIndex];

    set({
      position: nextMove.positionAfter,
      currentTurn: nextMove.player === PlayerColor.White 
        ? PlayerColor.Black 
        : PlayerColor.White,
      moveIndex: nextIndex,
      selectedSquare: null,
      legalMoveSquares: [],
      lastMoveSquares: [],
    });
  },

  resign: () => {
    const state = get();
    if (state.phase !== 'in-progress') return;
    
    const winner = state.currentTurn === PlayerColor.White ? 'black-wins' : 'white-wins';
    set({ phase: winner as GamePhase });
  },

  offerDraw: () => {
    const state = get();
    if (state.phase !== 'in-progress') return;
    // For AI games, accept draw automatically if position is balanced
    if (state.config.opponent === 'ai') {
      set({ phase: 'draw' });
    }
    // For human games, this would trigger a draw offer dialog
  },

  togglePause: () => {
    const state = get();
    if (state.phase !== 'in-progress') return;
    set({ isPaused: !state.isPaused });
  },

  resetGame: () => {
    set({
      phase: 'not-started',
      position: createInitialBoard(),
      currentTurn: PlayerColor.White,
      selectedSquare: null,
      legalMoveSquares: [],
      lastMoveSquares: [],
      moveHistory: [],
      moveIndex: -1,
      isPaused: false,
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
}));
