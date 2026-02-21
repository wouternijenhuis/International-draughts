import '../board/topology.dart';
import '../engine/board_utils.dart';
import '../types/board.dart';
import '../types/piece.dart';

/// Evaluation weights (evaluation units).
/// Material weights are always applied; positional weights are scaled by [featureScale].
class _Weights {
  // Material (always applied)
  static const int man = 100;
  static const int king = 300;
  static const int firstKingBonus = 50;
  // Positional (scaled by featureScale)
  static const int centerControl = 5;
  static const int innerCenterBonus = 5;
  static const int advancement = 3;
  static const int backRow = 8;
  static const int kingCentralization = 4;
  static const int manMobility = 1;
  static const int kingMobility = 2;
  static const int leftRightBalance = 3;
  static const int lockedPositionPenalty = 10;
  static const int runawayManBonus = 30;
  static const int tempoDiagonal = 2;
  static const int endgameKingAdvantage = 20;
  static const int pieceStructure = 4;
}

/// Central squares bonus — squares in the center of the board get extra value.
const Set<int> _centerSquares = {17, 18, 19, 22, 23, 24, 27, 28, 29, 32, 33, 34};
const Set<int> _innerCenter = {22, 23, 24, 28, 29};

/// Back row squares for each color (defensive value).
const Map<String, Set<int>> _backRow = {
  'white': {1, 2, 3, 4, 5},
  'black': {46, 47, 48, 49, 50},
};

/// Counts available quiet moves for a king from a given square.
/// Walks each diagonal ray until a piece is encountered.
int _countKingMoves(BoardPosition board, int square) {
  var count = 0;
  final topo = getSquareTopology(square);
  for (final dir in allDirections) {
    for (final target in topo.rays[dir]!) {
      if (board[target] == null) {
        count++;
      } else {
        break;
      }
    }
  }
  return count;
}

/// Counts available forward quiet moves for a regular piece from a given square.
int _countManMoves(BoardPosition board, int square, PlayerColor color) {
  var count = 0;
  final topo = getSquareTopology(square);
  final dirs = color == PlayerColor.white
      ? whiteForwardDirections
      : blackForwardDirections;
  for (final dir in dirs) {
    final adj = topo.adjacent[dir];
    if (adj != null && board[adj] == null) count++;
  }
  return count;
}

/// Checks if a piece has an adjacent friendly piece (piece structure).
bool _hasAdjacentFriendly(BoardPosition board, int square, PlayerColor color) {
  final topo = getSquareTopology(square);
  for (final dir in allDirections) {
    final adj = topo.adjacent[dir];
    if (adj != null) {
      final p = board[adj];
      if (p != null && p.color == color) return true;
    }
  }
  return false;
}

/// Checks if a regular piece has a clear path to promotion and is likely unstoppable.
///
/// Simplified runaway detection: checks that diagonal squares ahead are free of enemies.
bool _isRunawayMan(BoardPosition board, int square, PlayerColor color) {
  final coord = squareToCoordinate(square);
  final promRow = color == PlayerColor.white ? 9 : 0;
  final distance = (promRow - coord.row).abs();

  if (distance == 0) return false; // Already on promotion row
  if (distance > 4) return false; // Too far to be considered runaway

  final dRow = color == PlayerColor.white ? 1 : -1;
  var checkRow = coord.row;

  for (var d = 0; d < distance; d++) {
    checkRow += dRow;
    if (checkRow < 0 || checkRow > 9) return false;

    final leftCol = coord.col - (d + 1);
    final rightCol = coord.col + (d + 1);

    var leftClear = true;
    var rightClear = true;

    if (leftCol >= 0 && leftCol <= 9) {
      final sq = coordinateToSquare(BoardCoordinate(row: checkRow, col: leftCol));
      if (sq != null) {
        final p = board[sq];
        if (p != null && p.color != color) leftClear = false;
      }
    } else {
      leftClear = false;
    }

    if (rightCol >= 0 && rightCol <= 9) {
      final sq = coordinateToSquare(BoardCoordinate(row: checkRow, col: rightCol));
      if (sq != null) {
        final p = board[sq];
        if (p != null && p.color != color) rightClear = false;
      }
    } else {
      rightClear = false;
    }

    if (!leftClear && !rightClear) return false;
  }

  return true;
}

/// Evaluate a board position from the perspective of the given player.
///
/// Positive = good for player, negative = bad.
/// Returns a score in evaluation units.
///
/// [board] is the current board state.
/// [player] is the player to evaluate for.
/// [featureScale] scales positional features (0.0 = material only, 1.0 = full). Default 1.0.
double evaluate(BoardPosition board, PlayerColor player, [double featureScale = 1.0]) {
  final opponent = player == PlayerColor.white ? PlayerColor.black : PlayerColor.white;

  final playerPieces = countPieces(board, player);
  final opponentPieces = countPieces(board, opponent);

  // Terminal conditions
  if (opponentPieces.total == 0) return 10000;
  if (playerPieces.total == 0) return -10000;

  var score = 0.0;

  // --- Material (always applied, not scaled) ---
  score += (playerPieces.men - opponentPieces.men) * _Weights.man;
  score += (playerPieces.kings - opponentPieces.kings) * _Weights.king;

  // First king advantage bonus
  if (playerPieces.kings > 0 && opponentPieces.kings == 0) {
    score += _Weights.firstKingBonus;
  }
  if (opponentPieces.kings > 0 && playerPieces.kings == 0) {
    score -= _Weights.firstKingBonus;
  }

  // Skip positional features if featureScale is 0
  if (featureScale <= 0) return score;

  // --- Positional evaluation (scaled by featureScale) ---
  var playerLeftPieces = 0;
  var playerRightPieces = 0;
  var opponentLeftPieces = 0;
  var opponentRightPieces = 0;
  var playerMobility = 0;
  var opponentMobility = 0;
  var playerKingMobility = 0;
  var opponentKingMobility = 0;
  var playerConnected = 0;
  var opponentConnected = 0;

  for (var sq = 1; sq <= 50; sq++) {
    final piece = board[sq];
    if (piece == null) continue;

    final isPlayer = piece.color == player;
    final multiplier = isPlayer ? 1.0 : -1.0;
    final coord = squareToCoordinate(sq);

    // Center control
    if (_centerSquares.contains(sq)) {
      score += multiplier * _Weights.centerControl * featureScale;
      if (_innerCenter.contains(sq)) {
        score += multiplier * _Weights.innerCenterBonus * featureScale;
      }
    }

    // Advancement (regular pieces only — closer to promotion is better)
    if (piece.type == PieceType.man) {
      final advancementValue = piece.color == PlayerColor.white
          ? coord.row // White advances by increasing row
          : (9 - coord.row); // Black advances by decreasing row
      score += multiplier * advancementValue * _Weights.advancement * featureScale;

      // Back row bonus for regular pieces (defensive)
      final colorKey = piece.color == PlayerColor.white ? 'white' : 'black';
      if (_backRow[colorKey]!.contains(sq)) {
        score += multiplier * _Weights.backRow * featureScale;
      }

      // Runaway regular piece detection
      if (_isRunawayMan(board, sq, piece.color)) {
        score += multiplier * _Weights.runawayManBonus * featureScale;
      }

      // Regular piece mobility
      final manMoves = _countManMoves(board, sq, piece.color);
      if (isPlayer) {
        playerMobility += manMoves;
      } else {
        opponentMobility += manMoves;
      }
    }

    // King centralization & mobility
    if (piece.type == PieceType.king) {
      final distFromCenter = (coord.row - 4.5).abs() + (coord.col - 4.5).abs();
      score += multiplier *
          (7 - distFromCenter).round() *
          _Weights.kingCentralization *
          featureScale;

      final kingMoves = _countKingMoves(board, sq);
      if (isPlayer) {
        playerMobility += kingMoves;
        playerKingMobility += kingMoves;
      } else {
        opponentMobility += kingMoves;
        opponentKingMobility += kingMoves;
      }
    }

    // Tempo diagonal bonus (main diagonals)
    if (coord.row == coord.col || coord.row + coord.col == 9) {
      score += multiplier * _Weights.tempoDiagonal * featureScale;
    }

    // Left/right balance tracking
    if (isPlayer) {
      if (coord.col < 5) {
        playerLeftPieces++;
      } else {
        playerRightPieces++;
      }
    } else {
      if (coord.col < 5) {
        opponentLeftPieces++;
      } else {
        opponentRightPieces++;
      }
    }

    // Piece structure: connected pieces
    if (_hasAdjacentFriendly(board, sq, piece.color)) {
      if (isPlayer) {
        playerConnected++;
      } else {
        opponentConnected++;
      }
    }
  }

  // --- Mobility ---
  final manMobilityDiff = (playerMobility - playerKingMobility) -
      (opponentMobility - opponentKingMobility);
  score += manMobilityDiff * _Weights.manMobility * featureScale;
  score += (playerKingMobility - opponentKingMobility) *
      _Weights.kingMobility *
      featureScale;

  // --- Left/right balance penalty ---
  final playerImbalance = (playerLeftPieces - playerRightPieces).abs();
  final opponentImbalance = (opponentLeftPieces - opponentRightPieces).abs();
  score -= playerImbalance * _Weights.leftRightBalance * featureScale;
  score += opponentImbalance * _Weights.leftRightBalance * featureScale;

  // --- Piece structure ---
  score += (playerConnected - opponentConnected) *
      _Weights.pieceStructure *
      featureScale;

  // --- Locked position penalty ---
  if (playerMobility <= 2 && playerPieces.total > 2) {
    score -= _Weights.lockedPositionPenalty * featureScale;
  }
  if (opponentMobility <= 2 && opponentPieces.total > 2) {
    score += _Weights.lockedPositionPenalty * featureScale;
  }

  // --- Endgame king advantage ---
  final totalPieces = playerPieces.total + opponentPieces.total;
  if (totalPieces <= 10) {
    final kingDiff = playerPieces.kings - opponentPieces.kings;
    if (kingDiff != 0) {
      score += kingDiff * _Weights.endgameKingAdvantage * featureScale;
    }
  }

  return score.roundToDouble();
}

/// Quick evaluation for move ordering (material only).
///
/// Much faster than full evaluation.
double quickEvaluate(BoardPosition board, PlayerColor player) {
  final opponent = player == PlayerColor.white ? PlayerColor.black : PlayerColor.white;
  final p = countPieces(board, player);
  final o = countPieces(board, opponent);
  return ((p.men - o.men) * _Weights.man + (p.kings - o.kings) * _Weights.king)
      .toDouble();
}
