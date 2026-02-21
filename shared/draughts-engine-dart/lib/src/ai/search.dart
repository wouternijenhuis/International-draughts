import 'dart:math';

import '../engine/game_engine.dart';
import '../engine/move_generator.dart';
import '../types/board.dart';
import '../types/move.dart';
import '../types/piece.dart';
import 'difficulty.dart';
import 'evaluation.dart';
import 'killer_moves.dart';
import 'transposition_table.dart';
import 'zobrist.dart';

/// Result of an AI search.
class SearchResult {
  /// Creates a search result.
  const SearchResult({
    required this.move,
    required this.score,
    required this.depthReached,
    required this.nodesEvaluated,
  });

  /// The selected move.
  final Move move;

  /// Evaluation score (from the AI's perspective).
  final double score;

  /// Search depth reached.
  final int depthReached;

  /// Number of nodes evaluated.
  final int nodesEvaluated;

  /// Creates a copy with the given fields replaced.
  SearchResult copyWith({
    Move? move,
    double? score,
    int? depthReached,
    int? nodesEvaluated,
  }) {
    return SearchResult(
      move: move ?? this.move,
      score: score ?? this.score,
      depthReached: depthReached ?? this.depthReached,
      nodesEvaluated: nodesEvaluated ?? this.nodesEvaluated,
    );
  }
}

/// Internal search state, passed through the recursive search.
class _SearchState {
  _SearchState({
    required this.config,
    required this.tt,
    required this.killers,
    required this.startTime,
  });

  final DifficultyConfig config;
  final TranspositionTable? tt;
  final KillerMoves? killers;
  int nodesEvaluated = 0;
  final int startTime;
  bool aborted = false;
}

/// Random number generator for blunder logic and evaluation noise.
final Random _random = Random();

/// Gets current time in milliseconds.
int _now() => DateTime.now().millisecondsSinceEpoch;

/// Find the best move using iterative deepening NegaMax alpha-beta search.
///
/// This is the main entry point for the AI.
///
/// Enhancements applied based on difficulty config:
/// - Leaf-node evaluation noise (all levels)
/// - Evaluation feature scaling (all levels)
/// - Transposition table (Hard)
/// - Killer move heuristic (Hard)
/// - Time-limit enforcement (all levels)
SearchResult? findBestMove(
  BoardPosition board,
  PlayerColor player, [
  DifficultyConfig? config,
]) {
  config ??= difficultyConfigs['hard']!;
  final legalMoves = generateLegalMoves(board, player);
  if (legalMoves.isEmpty) return null;
  if (legalMoves.length == 1) {
    return SearchResult(
      move: legalMoves[0],
      score: 0,
      depthReached: 0,
      nodesEvaluated: 1,
    );
  }

  // Initialize search infrastructure based on config
  final tt = config.useTranspositionTable ? TranspositionTable(4) : null;
  final killers = config.useKillerMoves ? KillerMoves() : null;

  final state = _SearchState(
    config: config,
    tt: tt,
    killers: killers,
    startTime: _now(),
  );

  SearchResult? bestResult;

  // Iterative deepening with time-limit enforcement
  for (var depth = 1; depth <= config.maxDepth; depth++) {
    final result = _searchRoot(board, player, depth, legalMoves, state);
    if (state.aborted && bestResult != null) break;

    bestResult = result.copyWith(
      depthReached: depth,
      nodesEvaluated: state.nodesEvaluated,
    );

    // Check time limit before starting next iteration
    final elapsed = _now() - state.startTime;
    if (elapsed >= config.timeLimitMs) break;
  }

  if (bestResult == null) return null;

  // Apply blunder logic for lower difficulties
  return _applyBlunderLogic(board, player, legalMoves, bestResult, config);
}

/// Root-level search: evaluates all legal moves using NegaMax and returns the best.
SearchResult _searchRoot(
  BoardPosition board,
  PlayerColor player,
  int depth,
  List<Move> legalMoves,
  _SearchState state,
) {
  var bestMove = legalMoves[0];
  var bestScore = double.negativeInfinity;
  var alpha = double.negativeInfinity;
  const beta = double.infinity;

  // Compute hash for root position
  final hash = state.tt != null ? computeZobristHash(board, player) : 0;

  // Order moves
  final orderedMoves = _orderMoves(board, legalMoves, player, state, depth);

  var bestMoveIndex = 0;
  for (var i = 0; i < orderedMoves.length; i++) {
    final move = orderedMoves[i];
    final newBoard = applyMoveToBoard(board, move);

    final childHash = state.tt != null
        ? computeZobristHash(newBoard, oppositeColor(player))
        : 0;

    final score = -_negamax(
      newBoard,
      oppositeColor(player),
      depth - 1,
      -beta,
      -alpha,
      state,
      childHash,
    );

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
  if (state.tt != null && !state.aborted) {
    state.tt!.store(
      hash,
      bestScore.toInt(),
      depth,
      TtEntryType.exact,
      bestMoveIndex,
    );
  }

  return SearchResult(
    move: bestMove,
    score: bestScore,
    depthReached: depth,
    nodesEvaluated: state.nodesEvaluated,
  );
}

/// NegaMax alpha-beta search with transposition table and killer move support.
///
/// Score is always from the perspective of [currentPlayer].
double _negamax(
  BoardPosition board,
  PlayerColor currentPlayer,
  int depth,
  double alpha,
  double beta,
  _SearchState state,
  int hash,
) {
  // Check time limit every 4096 nodes
  if ((state.nodesEvaluated & 4095) == 0 && state.nodesEvaluated > 0) {
    final elapsed = _now() - state.startTime;
    if (elapsed >= state.config.timeLimitMs) {
      state.aborted = true;
      return 0;
    }
  }

  // Terminal depth — evaluate with noise
  if (depth <= 0) {
    state.nodesEvaluated++;
    var score = evaluate(board, currentPlayer, state.config.evalFeatureScale);

    // Apply leaf-node noise for difficulty degradation
    if (state.config.noiseAmplitude > 0) {
      score += (_random.nextDouble() - 0.5) * state.config.noiseAmplitude;
    }

    return score;
  }

  final legalMoves = generateLegalMoves(board, currentPlayer);

  // No legal moves — loss for current player
  if (legalMoves.isEmpty) {
    state.nodesEvaluated++;
    return -10000;
  }

  // TT probe
  var ttBestMoveIndex = -1;
  if (state.tt != null) {
    final ttEntry = state.tt!.probe(hash);
    if (ttEntry != null && ttEntry.depth >= depth) {
      if (ttEntry.type == TtEntryType.exact) return ttEntry.score.toDouble();
      if (ttEntry.type == TtEntryType.lowerBound && ttEntry.score > alpha) {
        alpha = ttEntry.score.toDouble();
      }
      if (ttEntry.type == TtEntryType.upperBound && ttEntry.score < beta) {
        beta = ttEntry.score.toDouble();
      }
      if (alpha >= beta) return ttEntry.score.toDouble();
    }
    if (ttEntry != null) {
      ttBestMoveIndex = ttEntry.bestMoveIndex;
    }
  }

  // Order moves
  final orderedMoves = _orderMovesInternal(
    board,
    legalMoves,
    currentPlayer,
    state,
    depth,
    ttBestMoveIndex,
  );

  var bestScore = double.negativeInfinity;
  var bestMoveIndex = 0;
  final origAlpha = alpha;

  for (var i = 0; i < orderedMoves.length; i++) {
    final move = orderedMoves[i];
    final newBoard = applyMoveToBoard(board, move);

    final childHash = state.tt != null
        ? computeZobristHash(newBoard, oppositeColor(currentPlayer))
        : 0;

    final score = -_negamax(
      newBoard,
      oppositeColor(currentPlayer),
      depth - 1,
      -beta,
      -alpha,
      state,
      childHash,
    );

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
      if (state.killers != null && move is! CaptureMove) {
        final sig = KillerMoves.signature(
          getMoveOrigin(move),
          getMoveDestination(move),
        );
        state.killers!.store(depth, sig);
      }
      break;
    }
  }

  // Store in TT
  if (state.tt != null && !state.aborted) {
    TtEntryType ttType;
    if (bestScore <= origAlpha) {
      ttType = TtEntryType.upperBound;
    } else if (bestScore >= beta) {
      ttType = TtEntryType.lowerBound;
    } else {
      ttType = TtEntryType.exact;
    }

    state.tt!.store(hash, bestScore.toInt(), depth, ttType, bestMoveIndex);
  }

  return bestScore;
}

/// Order moves for the root search.
List<Move> _orderMoves(
  BoardPosition board,
  List<Move> moves,
  PlayerColor player,
  _SearchState state,
  int depth,
) {
  return _orderMovesInternal(board, moves, player, state, depth, -1);
}

/// Internal move ordering with full priority system:
/// 1. TT best move (1,000,000)
/// 2. Captures (500,000 + captureCount × 1000)
/// 3. Killer moves (400,000 / 399,000)
/// 4. Quick positional evaluation
List<Move> _orderMovesInternal(
  BoardPosition board,
  List<Move> moves,
  PlayerColor player,
  _SearchState state,
  int depth,
  int ttBestMoveIndex,
) {
  final scored = <({Move move, double score, int index})>[];

  for (var i = 0; i < moves.length; i++) {
    final move = moves[i];
    double score = 0;

    // TT best move gets highest priority
    if (i == ttBestMoveIndex) {
      score = 1000000;
    } else if (move is CaptureMove) {
      // Captures get high priority, more captures = higher
      score = 500000 + move.steps.length * 1000;
    } else {
      // Killer move check
      if (state.killers != null) {
        final sig = KillerMoves.signature(
          getMoveOrigin(move),
          getMoveDestination(move),
        );
        score = state.killers!.getScore(depth, sig).toDouble();
      }

      // Quick evaluation as tiebreaker
      if (score == 0) {
        final newBoard = applyMoveToBoard(board, move);
        score = quickEvaluate(newBoard, player);
      }
    }

    scored.add((move: move, score: score, index: i));
  }

  scored.sort((a, b) => b.score.compareTo(a.score));
  return scored.map((s) => s.move).toList();
}

/// Apply blunder logic for lower difficulty levels.
///
/// With a configured probability, selects a suboptimal but legal move.
SearchResult _applyBlunderLogic(
  BoardPosition board,
  PlayerColor player,
  List<Move> legalMoves,
  SearchResult bestResult,
  DifficultyConfig config,
) {
  if (config.blunderProbability <= 0) return bestResult;

  // Roll for blunder
  if (_random.nextDouble() >= config.blunderProbability) {
    return bestResult;
  }

  // Blunder triggered: evaluate all moves with static eval and pick a suboptimal one
  final moveScores = <({Move move, double score})>[];
  for (final move in legalMoves) {
    final newBoard = applyMoveToBoard(board, move);
    final score = evaluate(newBoard, player, config.evalFeatureScale);
    moveScores.add((move: move, score: score));
  }

  moveScores.sort((a, b) => b.score.compareTo(a.score));
  final bestScore = moveScores[0].score;

  // Find moves within blunder margin
  final blunderCandidates = moveScores
      .where(
        (m) =>
            bestScore - m.score <= config.blunderMargin &&
            m.move != bestResult.move,
      )
      .toList();

  if (blunderCandidates.isEmpty) return bestResult;

  // Pick a random blunder candidate
  final blunder = blunderCandidates[_random.nextInt(blunderCandidates.length)];
  return SearchResult(
    move: blunder.move,
    score: blunder.score,
    depthReached: bestResult.depthReached,
    nodesEvaluated: bestResult.nodesEvaluated,
  );
}
