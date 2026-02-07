import { BoardPosition } from '../types/board';
import { Move } from '../types/move';
import { PlayerColor } from '../types/piece';
import { generateLegalMoves } from '../engine/move-generator';
import { applyMoveToBoard, oppositeColor } from '../engine/game-engine';
import { evaluate, quickEvaluate } from './evaluation';
import { DifficultyConfig, DIFFICULTY_CONFIGS } from './difficulty';

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

/**
 * Find the best move using iterative deepening alpha-beta search.
 * This is the main entry point for the AI.
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

  let bestResult: SearchResult | null = null;
  let totalNodes = 0;

  // Iterative deepening
  for (let depth = 1; depth <= config.maxDepth; depth++) {
    const result = searchRoot(board, player, depth, legalMoves);
    totalNodes += result.nodesEvaluated;
    bestResult = { ...result, depthReached: depth, nodesEvaluated: totalNodes };
  }

  if (!bestResult) return null;

  // Apply blunder logic for lower difficulties
  return applyBlunderLogic(board, player, legalMoves, bestResult, config);
};

/**
 * Root-level search: evaluates all legal moves and returns the best.
 */
const searchRoot = (
  board: BoardPosition,
  player: PlayerColor,
  depth: number,
  legalMoves: readonly Move[],
): SearchResult => {
  let bestMove = legalMoves[0]!;
  let bestScore = -Infinity;
  let nodesEvaluated = 0;
  let alpha = -Infinity;
  const beta = Infinity;

  // Order moves: captures first (better move ordering)
  const orderedMoves = orderMoves(board, legalMoves, player);

  for (const move of orderedMoves) {
    const newBoard = applyMoveToBoard(board, move);
    const result = alphaBeta(newBoard, oppositeColor(player), depth - 1, -beta, -alpha, player);
    nodesEvaluated += result.nodes;
    const score = -result.score;

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
    if (score > alpha) {
      alpha = score;
    }
  }

  return { move: bestMove, score: bestScore, depthReached: depth, nodesEvaluated };
};

/**
 * Alpha-beta pruning minimax search.
 */
const alphaBeta = (
  board: BoardPosition,
  currentPlayer: PlayerColor,
  depth: number,
  alpha: number,
  beta: number,
  maximizingPlayer: PlayerColor,
): { score: number; nodes: number } => {
  // Terminal depth — evaluate
  if (depth <= 0) {
    return { score: evaluate(board, maximizingPlayer), nodes: 1 };
  }

  const legalMoves = generateLegalMoves(board, currentPlayer);

  // No legal moves — loss for current player
  if (legalMoves.length === 0) {
    const score = currentPlayer === maximizingPlayer ? -10000 : 10000;
    return { score, nodes: 1 };
  }

  let nodes = 0;
  const isMaximizing = currentPlayer === maximizingPlayer;

  if (isMaximizing) {
    let value = -Infinity;
    for (const move of legalMoves) {
      const newBoard = applyMoveToBoard(board, move);
      const result = alphaBeta(newBoard, oppositeColor(currentPlayer), depth - 1, alpha, beta, maximizingPlayer);
      nodes += result.nodes;
      value = Math.max(value, result.score);
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break; // Prune
    }
    return { score: value, nodes };
  } else {
    let value = Infinity;
    for (const move of legalMoves) {
      const newBoard = applyMoveToBoard(board, move);
      const result = alphaBeta(newBoard, oppositeColor(currentPlayer), depth - 1, alpha, beta, maximizingPlayer);
      nodes += result.nodes;
      value = Math.min(value, result.score);
      beta = Math.min(beta, value);
      if (alpha >= beta) break; // Prune
    }
    return { score: value, nodes };
  }
};

/**
 * Order moves for better alpha-beta pruning.
 * Captures first, then moves evaluated by quick evaluation.
 */
const orderMoves = (board: BoardPosition, moves: readonly Move[], player: PlayerColor): Move[] => {
  return [...moves].sort((a, b) => {
    // Captures first
    if (a.type === 'capture' && b.type !== 'capture') return -1;
    if (a.type !== 'capture' && b.type === 'capture') return 1;

    // Among same type, order by quick positional score
    const boardA = applyMoveToBoard(board, a);
    const boardB = applyMoveToBoard(board, b);
    return quickEvaluate(boardB, player) - quickEvaluate(boardA, player);
  });
};

/**
 * Apply blunder logic for lower difficulty levels.
 * With a configured probability, selects a suboptimal but legal move.
 */
const applyBlunderLogic = (
  board: BoardPosition,
  player: PlayerColor,
  legalMoves: readonly Move[],
  bestResult: SearchResult,
  config: DifficultyConfig,
): SearchResult => {
  if (config.blunderProbability <= 0 || config.noiseAmplitude <= 0) return bestResult;

  // Roll for blunder
  if (Math.random() >= config.blunderProbability) {
    // Add noise to the score but keep the best move
    return {
      ...bestResult,
      score: bestResult.score + (Math.random() - 0.5) * config.noiseAmplitude,
    };
  }

  // Evaluate all moves and pick a suboptimal one within blunder margin
  const moveScores: { move: Move; score: number }[] = [];
  for (const move of legalMoves) {
    const newBoard = applyMoveToBoard(board, move);
    const score = evaluate(newBoard, player);
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
