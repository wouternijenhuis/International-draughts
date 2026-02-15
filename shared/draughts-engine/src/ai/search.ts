import { BoardPosition } from '../types/board';
import { Move, getMoveOrigin, getMoveDestination } from '../types/move';
import { PlayerColor } from '../types/piece';
import { generateLegalMoves } from '../engine/move-generator';
import { applyMoveToBoard, oppositeColor } from '../engine/game-engine';
import { evaluate, quickEvaluate } from './evaluation';
import { DifficultyConfig, DIFFICULTY_CONFIGS } from './difficulty';
import { computeZobristHash } from './zobrist';
import { TranspositionTable, TtEntryType } from './transposition-table';
import { KillerMoves } from './killer-moves';

/** Result of an AI search */
export interface SearchResult {
  /** The selected move */
  readonly move: Move;
  /** Evaluation score (from the AI's perspective) */
  readonly score: number;
  /** Search depth reached */
  readonly depthReached: number;
  /** Number of nodes evaluated */
  readonly nodesEvaluated: number;
}

/** Internal search state, passed through the recursive search */
interface SearchState {
  readonly config: DifficultyConfig;
  readonly tt: TranspositionTable | null;
  readonly killers: KillerMoves | null;
  nodesEvaluated: number;
  readonly startTime: number;
  aborted: boolean;
}

/**
 * Find the best move using iterative deepening NegaMax alpha-beta search.
 * This is the main entry point for the AI.
 *
 * Enhancements applied based on difficulty config:
 * - Leaf-node evaluation noise (all levels)
 * - Evaluation feature scaling (all levels)
 * - Transposition table (Hard)
 * - Killer move heuristic (Hard)
 * - Time-limit enforcement (all levels)
 */
export const findBestMove = (
  board: BoardPosition,
  player: PlayerColor,
  config: DifficultyConfig = DIFFICULTY_CONFIGS.hard!,
): SearchResult | null => {
  const legalMoves = generateLegalMoves(board, player);
  if (legalMoves.length === 0) return null;
  if (legalMoves.length === 1) {
    return { move: legalMoves[0]!, score: 0, depthReached: 0, nodesEvaluated: 1 };
  }

  // Initialize search infrastructure based on config
  const tt = config.useTranspositionTable ? new TranspositionTable(4) : null;
  const killers = config.useKillerMoves ? new KillerMoves() : null;

  const state: SearchState = {
    config,
    tt,
    killers,
    nodesEvaluated: 0,
    startTime: typeof performance !== 'undefined' ? performance.now() : Date.now(),
    aborted: false,
  };

  let bestResult: SearchResult | null = null;

  // Iterative deepening with time-limit enforcement
  for (let depth = 1; depth <= config.maxDepth; depth++) {
    const result = searchRoot(board, player, depth, legalMoves, state);
    if (state.aborted && bestResult !== null) break; // Use previous depth's result

    bestResult = { ...result, depthReached: depth, nodesEvaluated: state.nodesEvaluated };

    // Check time limit before starting next iteration
    const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - state.startTime;
    if (elapsed >= config.timeLimitMs) break;
  }

  if (!bestResult) return null;

  // Apply blunder logic for lower difficulties
  return applyBlunderLogic(board, player, legalMoves, bestResult, config);
};

/**
 * Root-level search: evaluates all legal moves using NegaMax and returns the best.
 */
const searchRoot = (
  board: BoardPosition,
  player: PlayerColor,
  depth: number,
  legalMoves: readonly Move[],
  state: SearchState,
): SearchResult => {
  let bestMove = legalMoves[0]!;
  let bestScore = -Infinity;
  let alpha = -Infinity;
  const beta = Infinity;

  // Compute hash for root position
  const hash = state.tt ? computeZobristHash(board, player) : 0;

  // Order moves: captures first, then killer moves, then by quick evaluation
  const orderedMoves = orderMoves(board, legalMoves, player, state, depth);

  let bestMoveIndex = 0;
  for (let i = 0; i < orderedMoves.length; i++) {
    const move = orderedMoves[i]!;
    const newBoard = applyMoveToBoard(board, move);

    // Compute child hash incrementally (simplified: full recomputation)
    const childHash = state.tt ? computeZobristHash(newBoard, oppositeColor(player)) : 0;

    const score = -negamax(newBoard, oppositeColor(player), depth - 1, -beta, -alpha, state, childHash);

    if (state.aborted) break;

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
      bestMoveIndex = i;
    }
    if (score > alpha) {
      alpha = score;
    }
  }

  // Store root result in TT
  if (state.tt && !state.aborted) {
    state.tt.store(hash, bestScore, depth, TtEntryType.Exact, bestMoveIndex);
  }

  return { move: bestMove, score: bestScore, depthReached: depth, nodesEvaluated: state.nodesEvaluated };
};

/**
 * NegaMax alpha-beta search with transposition table and killer move support.
 * Score is always from the perspective of `currentPlayer`.
 */
const negamax = (
  board: BoardPosition,
  currentPlayer: PlayerColor,
  depth: number,
  alpha: number,
  beta: number,
  state: SearchState,
  hash: number,
): number => {
  // Check time limit every 4096 nodes
  if ((state.nodesEvaluated & 4095) === 0 && state.nodesEvaluated > 0) {
    const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - state.startTime;
    if (elapsed >= state.config.timeLimitMs) {
      state.aborted = true;
      return 0;
    }
  }

  // Terminal depth — evaluate with noise
  if (depth <= 0) {
    state.nodesEvaluated++;
    let score = evaluate(board, currentPlayer, state.config.evalFeatureScale);

    // Apply leaf-node noise for difficulty degradation
    if (state.config.noiseAmplitude > 0) {
      score += (Math.random() - 0.5) * state.config.noiseAmplitude;
    }

    return score;
  }

  const legalMoves = generateLegalMoves(board, currentPlayer);

  // No legal moves — loss for current player
  if (legalMoves.length === 0) {
    state.nodesEvaluated++;
    return -10000;
  }

  // TT probe
  let ttBestMoveIndex = -1;
  if (state.tt) {
    const ttEntry = state.tt.probe(hash);
    if (ttEntry && ttEntry.depth >= depth) {
      if (ttEntry.type === TtEntryType.Exact) return ttEntry.score;
      if (ttEntry.type === TtEntryType.LowerBound && ttEntry.score > alpha) alpha = ttEntry.score;
      if (ttEntry.type === TtEntryType.UpperBound && ttEntry.score < beta) beta = ttEntry.score;
      if (alpha >= beta) return ttEntry.score;
    }
    if (ttEntry) {
      ttBestMoveIndex = ttEntry.bestMoveIndex;
    }
  }

  // Order moves
  const orderedMoves = orderMovesInternal(board, legalMoves, currentPlayer, state, depth, ttBestMoveIndex);

  let bestScore = -Infinity;
  let bestMoveIndex = 0;
  const origAlpha = alpha;

  for (let i = 0; i < orderedMoves.length; i++) {
    const move = orderedMoves[i]!;
    const newBoard = applyMoveToBoard(board, move);

    // Compute child hash
    const childHash = state.tt ? computeZobristHash(newBoard, oppositeColor(currentPlayer)) : 0;

    const score = -negamax(newBoard, oppositeColor(currentPlayer), depth - 1, -beta, -alpha, state, childHash);

    if (state.aborted) return 0;

    if (score > bestScore) {
      bestScore = score;
      bestMoveIndex = i;
    }

    if (score > alpha) {
      alpha = score;
    }

    if (alpha >= beta) {
      // Beta cutoff — store killer move (non-capture only)
      if (state.killers && move.type !== 'capture') {
        const sig = KillerMoves.signature(getMoveOrigin(move), getMoveDestination(move));
        state.killers.store(depth, sig);
      }
      break;
    }
  }

  // Store in TT
  if (state.tt && !state.aborted) {
    let ttType: TtEntryType;
    if (bestScore <= origAlpha) ttType = TtEntryType.UpperBound;
    else if (bestScore >= beta) ttType = TtEntryType.LowerBound;
    else ttType = TtEntryType.Exact;

    state.tt.store(hash, bestScore, depth, ttType, bestMoveIndex);
  }

  return bestScore;
};

/**
 * Order moves for the root search.
 * Wraps internal ordering with the root-level interface.
 */
const orderMoves = (
  board: BoardPosition,
  moves: readonly Move[],
  player: PlayerColor,
  state: SearchState,
  depth: number,
): Move[] => {
  return orderMovesInternal(board, moves, player, state, depth, -1);
};

/**
 * Internal move ordering with full priority system:
 * 1. TT best move (1,000,000)
 * 2. Captures (500,000 + captureCount × 1000)
 * 3. Killer moves (400,000 / 399,000)
 * 4. Quick positional evaluation
 */
const orderMovesInternal = (
  board: BoardPosition,
  moves: readonly Move[],
  player: PlayerColor,
  state: SearchState,
  depth: number,
  ttBestMoveIndex: number,
): Move[] => {
  const scored: { move: Move; score: number; index: number }[] = [];

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i]!;
    let score = 0;

    // TT best move gets highest priority
    if (i === ttBestMoveIndex) {
      score = 1_000_000;
    } else if (move.type === 'capture') {
      // Captures get high priority, more captures = higher
      score = 500_000 + (move.steps.length) * 1000;
    } else {
      // Killer move check
      if (state.killers) {
        const sig = KillerMoves.signature(getMoveOrigin(move), getMoveDestination(move));
        score = state.killers.getScore(depth, sig);
      }

      // Quick evaluation as tiebreaker
      if (score === 0) {
        const newBoard = applyMoveToBoard(board, move);
        score = quickEvaluate(newBoard, player);
      }
    }

    scored.push({ move, score, index: i });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.map(s => s.move);
};

/**
 * Apply blunder logic for lower difficulty levels.
 * With a configured probability, selects a suboptimal but legal move.
 * The noise-based degradation now happens in the search (leaf nodes),
 * so this only handles rare deliberate blunders.
 */
const applyBlunderLogic = (
  board: BoardPosition,
  player: PlayerColor,
  legalMoves: readonly Move[],
  bestResult: SearchResult,
  config: DifficultyConfig,
): SearchResult => {
  if (config.blunderProbability <= 0) return bestResult;

  // Roll for blunder
  if (Math.random() >= config.blunderProbability) {
    // No blunder — return the best move from search (noise already applied in leaves)
    return bestResult;
  }

  // Blunder triggered: evaluate all moves with static eval and pick a suboptimal one
  const moveScores: { move: Move; score: number }[] = [];
  for (const move of legalMoves) {
    const newBoard = applyMoveToBoard(board, move);
    const score = evaluate(newBoard, player, config.evalFeatureScale);
    moveScores.push({ move, score });
  }

  moveScores.sort((a, b) => b.score - a.score);
  const bestScore = moveScores[0]!.score;

  // Find moves within blunder margin
  const blunderCandidates = moveScores.filter(
    (m) => bestScore - m.score <= config.blunderMargin && m.move !== bestResult.move,
  );

  if (blunderCandidates.length === 0) return bestResult;

  // Pick a random blunder candidate
  const blunder = blunderCandidates[Math.floor(Math.random() * blunderCandidates.length)]!;
  return {
    move: blunder.move,
    score: blunder.score,
    depthReached: bestResult.depthReached,
    nodesEvaluated: bestResult.nodesEvaluated,
  };
};
