import 'board.dart';
import 'piece.dart';

/// The possible phases of a game.
enum GamePhase {
  /// Game is in progress.
  inProgress,

  /// White has won.
  whiteWins,

  /// Black has won.
  blackWins,

  /// Game ended in a draw.
  draw,
}

/// Reason for a draw.
enum DrawReason {
  /// Threefold repetition of position.
  threefoldRepetition,

  /// 25-move rule (only kings, no captures for 25 moves per side).
  twentyFiveMoveRule,

  /// 16-move endgame rule.
  sixteenMoveRule,

  /// Draw by mutual agreement.
  agreement,
}

/// Draw-rule tracking state.
class DrawRuleState {
  /// Creates a draw rule state.
  const DrawRuleState({
    required this.positionHistory,
    required this.kingOnlyMoveCount,
    required this.endgameMoveCount,
    required this.isEndgameRuleActive,
  });

  /// Position hashes for threefold repetition detection.
  final List<BigInt> positionHistory;

  /// Consecutive half-moves where both sides have only kings and no captures.
  final int kingOnlyMoveCount;

  /// Half-moves in the current 16-move endgame scenario.
  final int endgameMoveCount;

  /// Whether the 16-move endgame rule is active.
  final bool isEndgameRuleActive;
}

/// Complete game state.
class GameState {
  /// Creates a game state.
  const GameState({
    required this.board,
    required this.currentPlayer,
    required this.moveHistory,
    required this.phase,
    required this.drawReason,
    required this.whitePieceCount,
    required this.blackPieceCount,
    required this.drawRuleState,
  });

  /// The current board position.
  final BoardPosition board;

  /// The player whose turn it is.
  final PlayerColor currentPlayer;

  /// The history of moves (serialized strings).
  final List<String> moveHistory;

  /// The current phase of the game.
  final GamePhase phase;

  /// The reason for a draw, if applicable.
  final DrawReason? drawReason;

  /// Total number of white pieces remaining.
  final int whitePieceCount;

  /// Total number of black pieces remaining.
  final int blackPieceCount;

  /// Draw rule tracking state.
  final DrawRuleState drawRuleState;

  /// Creates a copy with the given fields replaced.
  GameState copyWith({
    BoardPosition? board,
    PlayerColor? currentPlayer,
    List<String>? moveHistory,
    GamePhase? phase,
    DrawReason? drawReason,
    bool clearDrawReason = false,
    int? whitePieceCount,
    int? blackPieceCount,
    DrawRuleState? drawRuleState,
  }) {
    return GameState(
      board: board ?? this.board,
      currentPlayer: currentPlayer ?? this.currentPlayer,
      moveHistory: moveHistory ?? this.moveHistory,
      phase: phase ?? this.phase,
      drawReason: clearDrawReason ? null : (drawReason ?? this.drawReason),
      whitePieceCount: whitePieceCount ?? this.whitePieceCount,
      blackPieceCount: blackPieceCount ?? this.blackPieceCount,
      drawRuleState: drawRuleState ?? this.drawRuleState,
    );
  }
}

/// Creates the initial position for a new game.
List<Square> createInitialBoard() {
  final board = createEmptyBoard();

  // White pieces on squares 1-20
  for (var i = 1; i <= 20; i++) {
    board[i] = createPiece(PieceType.man, PlayerColor.white);
  }

  // Black pieces on squares 31-50
  for (var i = 31; i <= 50; i++) {
    board[i] = createPiece(PieceType.man, PlayerColor.black);
  }

  return board;
}

/// Computes a position hash for the initial position.
///
/// Uses the same algorithm as [computePositionHash] in game_engine
/// but is self-contained to avoid circular dependencies.
BigInt _computeInitialPositionHash(
  BoardPosition board,
  PlayerColor currentPlayer,
) {
  // Base must be > max per-square coefficient (50*5 + 4 = 254), so we use 257 (prime).
  final base = BigInt.from(257);
  var hash = BigInt.from(currentPlayer == PlayerColor.white ? 1 : 2);
  for (var sq = 1; sq <= 50; sq++) {
    final piece = board[sq];
    if (piece != null) {
      final pieceValue = piece.color == PlayerColor.white
          ? (piece.type == PieceType.man ? BigInt.one : BigInt.two)
          : (piece.type == PieceType.man ? BigInt.from(3) : BigInt.from(4));
      hash = hash * base + BigInt.from(sq) * BigInt.from(5) + pieceValue;
    } else {
      hash = hash * base;
    }
  }
  return hash;
}

/// Creates a new game state in the initial position.
GameState createInitialGameState() {
  final board = createInitialBoard();
  final initialHash =
      _computeInitialPositionHash(board, PlayerColor.white);
  return GameState(
    board: board,
    currentPlayer: PlayerColor.white,
    moveHistory: const [],
    phase: GamePhase.inProgress,
    drawReason: null,
    whitePieceCount: 20,
    blackPieceCount: 20,
    drawRuleState: DrawRuleState(
      positionHistory: [initialHash],
      kingOnlyMoveCount: 0,
      endgameMoveCount: 0,
      isEndgameRuleActive: false,
    ),
  );
}

/// Checks if two board positions are equal.
bool positionsEqual(BoardPosition a, BoardPosition b) {
  if (a.length != b.length) return false;
  for (var i = 1; i <= 50; i++) {
    final squareA = a[i];
    final squareB = b[i];
    if (squareA == null && squareB == null) continue;
    if (squareA == null || squareB == null) return false;
    if (squareA.type != squareB.type || squareA.color != squareB.color) {
      return false;
    }
  }
  return true;
}
