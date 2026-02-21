import '../board/topology.dart';
import '../types/board.dart';
import '../types/move.dart';
import '../types/piece.dart';
import 'board_utils.dart';

/// Generates all legal moves for the current player.
///
/// Enforces mandatory capture: if any captures exist, only capture moves are returned.
/// Enforces maximum capture: only capture sequences with the maximum number of captures are returned.
List<Move> generateLegalMoves(BoardPosition board, PlayerColor currentPlayer) {
  final captures = generateAllCaptures(board, currentPlayer);

  if (captures.isNotEmpty) {
    // Maximum capture rule: only keep sequences with the most captures
    var maxCaptures = 0;
    for (final m in captures) {
      if (m.steps.length > maxCaptures) {
        maxCaptures = m.steps.length;
      }
    }
    return captures.where((m) => m.steps.length == maxCaptures).toList();
  }

  // No captures available — return quiet moves
  return generateAllQuietMoves(board, currentPlayer);
}

/// Generates all quiet (non-capture) moves for a player.
List<QuietMove> generateAllQuietMoves(BoardPosition board, PlayerColor player) {
  final moves = <QuietMove>[];

  for (var sq = 1; sq <= 50; sq++) {
    final piece = getPiece(board, sq);
    if (piece == null || piece.color != player) continue;

    if (piece.type == PieceType.man) {
      _generateManQuietMoves(board, sq, player, moves);
    } else {
      _generateKingQuietMoves(board, sq, moves);
    }
  }

  return moves;
}

/// Regular piece quiet moves: one square diagonally forward.
void _generateManQuietMoves(
  BoardPosition board,
  int square,
  PlayerColor color,
  List<QuietMove> moves,
) {
  final forwardDirs = color == PlayerColor.white
      ? whiteForwardDirections
      : blackForwardDirections;
  for (final dir in forwardDirs) {
    final target = getAdjacentSquare(square, dir);
    if (target != null && isEmpty(board, target)) {
      moves.add(createQuietMove(square, target));
    }
  }
}

/// King quiet moves: any number of squares along any diagonal (flying king).
void _generateKingQuietMoves(
  BoardPosition board,
  int square,
  List<QuietMove> moves,
) {
  for (final dir in allDirections) {
    final ray = getDiagonalRay(square, dir);
    for (final target in ray) {
      if (isEmpty(board, target)) {
        moves.add(createQuietMove(square, target));
      } else {
        break; // Blocked by a piece
      }
    }
  }
}

/// Generates all capture sequences for a player.
/// Finds the complete multi-jump sequences by exploring the capture tree.
List<CaptureMove> generateAllCaptures(
  BoardPosition board,
  PlayerColor player,
) {
  final allCaptures = <CaptureMove>[];

  for (var sq = 1; sq <= 50; sq++) {
    final piece = getPiece(board, sq);
    if (piece == null || piece.color != player) continue;

    if (piece.type == PieceType.man) {
      _generateManCaptures(board, sq, player, [], <int>{}, allCaptures);
    } else {
      _generateKingCaptures(board, sq, player, [], <int>{}, allCaptures);
    }
  }

  return allCaptures;
}

/// Recursively finds all capture sequences for a regular piece.
///
/// Regular pieces can capture forward AND backward (diagonally, one square jump).
/// Jumped pieces remain on the board during the sequence but cannot be jumped twice.
/// A regular piece passing through the promotion row mid-capture is NOT promoted (FMJD rule).
void _generateManCaptures(
  BoardPosition board,
  int square,
  PlayerColor color,
  List<CaptureStep> currentSteps,
  Set<int> jumpedSquares,
  List<CaptureMove> result,
) {
  var foundContinuation = false;

  // Regular pieces capture in ALL four directions (forward and backward)
  for (final dir in allDirections) {
    final enemySquare = getAdjacentSquare(square, dir);
    if (enemySquare == null) continue;

    // Must be an enemy piece that hasn't been jumped already
    if (!isEnemy(board, enemySquare, color) ||
        jumpedSquares.contains(enemySquare)) {
      continue;
    }

    // Landing square must be empty (the square beyond the enemy)
    final landingSquare = getAdjacentSquare(enemySquare, dir);
    if (landingSquare == null || !isEmpty(board, landingSquare)) continue;

    // Valid capture found
    foundContinuation = true;
    final step = CaptureStep(
      from: square,
      to: landingSquare,
      captured: enemySquare,
    );
    final newSteps = [...currentSteps, step];
    final newJumped = {...jumpedSquares, enemySquare};

    // Recurse to find continuations from the landing square
    // Note: A regular piece does NOT promote mid-capture
    _generateManCaptures(board, landingSquare, color, newSteps, newJumped, result);
  }

  // If no further captures, record the completed sequence
  if (!foundContinuation && currentSteps.isNotEmpty) {
    result.add(createCaptureMove(currentSteps));
  }
}

/// Recursively finds all capture sequences for a king (flying king).
///
/// A king can capture at any distance along a diagonal.
/// The king must jump over exactly one enemy piece and can land on any empty square beyond it.
/// After capturing, the king can change direction for the next capture.
void _generateKingCaptures(
  BoardPosition board,
  int square,
  PlayerColor color,
  List<CaptureStep> currentSteps,
  Set<int> jumpedSquares,
  List<CaptureMove> result,
) {
  var foundContinuation = false;

  for (final dir in allDirections) {
    final ray = getDiagonalRay(square, dir);
    int? enemySquare;

    for (final target in ray) {
      final piece = getPiece(board, target);

      if (piece == null) {
        // Empty square
        if (enemySquare != null) {
          // We've passed over an enemy — this is a valid landing square
          foundContinuation = true;
          final step = CaptureStep(
            from: square,
            to: target,
            captured: enemySquare,
          );
          final newSteps = [...currentSteps, step];
          final newJumped = {...jumpedSquares, enemySquare};

          // Recurse from this landing square
          _generateKingCaptures(
            board,
            target,
            color,
            newSteps,
            newJumped,
            result,
          );
        }
        // If no enemy yet, this is just an empty square — continue scanning
      } else if (isEnemy(board, target, color) &&
          !jumpedSquares.contains(target)) {
        // Found an enemy piece we haven't jumped yet
        if (enemySquare != null) {
          // Two enemies in a row — can't jump
          break;
        }
        enemySquare = target;
      } else {
        // Friendly piece, or already-jumped enemy — blocked
        break;
      }
    }
  }

  // If no further captures, record the completed sequence
  if (!foundContinuation && currentSteps.isNotEmpty) {
    result.add(createCaptureMove(currentSteps));
  }
}
