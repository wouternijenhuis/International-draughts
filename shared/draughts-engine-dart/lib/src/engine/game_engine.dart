import '../board/topology.dart';
import '../types/board.dart';
import '../types/game_state.dart';
import '../types/move.dart';
import '../types/piece.dart';
import 'board_utils.dart';
import 'move_generator.dart';

/// Result of applying a move.
class MoveResult {
  /// Creates a move result.
  const MoveResult({
    required this.newState,
    required this.isValid,
    this.error,
  });

  /// The resulting game state.
  final GameState newState;

  /// Whether the move was valid.
  final bool isValid;

  /// Error message if the move was invalid.
  final String? error;
}

/// Game outcome types.
enum GameOutcome {
  /// A player has won.
  win,

  /// The game is a draw.
  draw,

  /// The game is still in progress.
  inProgress,
}

/// Computes a position hash for repetition detection.
/// Returns a [BigInt] hash based on piece positions and current player.
BigInt computePositionHash(BoardPosition board, PlayerColor currentPlayer) {
  // Polynomial hash using BigInt.
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

/// Applies a move to the board and returns the new board state.
/// Handles piece movement, captures (removing jumped pieces), and promotion.
List<Piece?> applyMoveToBoard(BoardPosition board, Move move) {
  final newBoard = List<Piece?>.of(board);

  switch (move) {
    case QuietMove(:final from, :final to):
      final piece = newBoard[from];
      newBoard[from] = null;
      newBoard[to] = piece;

      // Check for promotion
      if (piece != null && piece.type == PieceType.man) {
        final color = piece.color == PlayerColor.white ? 'white' : 'black';
        if (isPromotionSquare(to, color)) {
          newBoard[to] = Piece(type: PieceType.king, color: piece.color);
        }
      }

    case CaptureMove():
      final origin = getMoveOrigin(move);
      final piece = newBoard[origin]!;

      // Clear origin
      newBoard[origin] = null;

      // Remove all captured pieces
      final capturedSquares = getCapturedSquares(move);
      for (final sq in capturedSquares) {
        newBoard[sq] = null;
      }

      // Place piece at final destination
      final destination = getMoveDestination(move);
      newBoard[destination] = piece;

      // Check for promotion (only at the end of the capture sequence)
      if (piece.type == PieceType.man) {
        final color = piece.color == PlayerColor.white ? 'white' : 'black';
        if (isPromotionSquare(destination, color)) {
          newBoard[destination] = Piece(type: PieceType.king, color: piece.color);
        }
      }
  }

  return newBoard;
}

/// Determines the opponent color.
PlayerColor oppositeColor(PlayerColor color) {
  return color == PlayerColor.white ? PlayerColor.black : PlayerColor.white;
}

/// Checks if a draw condition is met.
/// Returns the [DrawReason] if a draw is detected, or null otherwise.
DrawReason? checkDrawCondition(
  BoardPosition board,
  DrawRuleState drawRuleState,
  PlayerColor currentPlayer,
) {
  // 1. Threefold repetition
  final currentHash = computePositionHash(board, currentPlayer);
  var occurrences = 0;
  for (final h in drawRuleState.positionHistory) {
    if (h == currentHash) occurrences++;
  }
  if (occurrences >= 3) {
    return DrawReason.threefoldRepetition;
  }

  // 2. 25-move rule: if only kings remain on both sides
  //    and 50 consecutive half-moves (25 per side) without a capture
  final whitePieces = countPieces(board, PlayerColor.white);
  final blackPieces = countPieces(board, PlayerColor.black);
  final onlyKings = whitePieces.men == 0 && blackPieces.men == 0;

  if (onlyKings && drawRuleState.kingOnlyMoveCount >= 50) {
    return DrawReason.twentyFiveMoveRule;
  }

  // 3. 16-move endgame rule: special endgame positions
  if (drawRuleState.isEndgameRuleActive &&
      drawRuleState.endgameMoveCount >= 32) {
    return DrawReason.sixteenMoveRule;
  }

  return null;
}

/// Determines whether the 16-move endgame rule should be active.
///
/// Active for specific FMJD endgame configurations:
/// - 3 kings vs 1 king (either side)
/// - 2 kings + 1 man vs 1 king (stronger side has the 2K+1M)
/// - 1 king + 2 men vs 1 king (stronger side has the 1K+2M)
bool _shouldActivateEndgameRule(BoardPosition board) {
  final white = countPieces(board, PlayerColor.white);
  final black = countPieces(board, PlayerColor.black);

  // Check if one side has exactly 1 king and 0 men (the weaker side)
  final whiteIsWeaker = white.kings == 1 && white.men == 0 && white.total == 1;
  final blackIsWeaker = black.kings == 1 && black.men == 0 && black.total == 1;

  if (!whiteIsWeaker && !blackIsWeaker) {
    return false;
  }

  // Determine the stronger side's piece counts
  final stronger = whiteIsWeaker ? black : white;

  // 3 kings vs 1 king
  if (stronger.kings == 3 && stronger.men == 0) return true;

  // 2 kings + 1 man vs 1 king
  if (stronger.kings == 2 && stronger.men == 1) return true;

  // 1 king + 2 men vs 1 king
  if (stronger.kings == 1 && stronger.men == 2) return true;

  return false;
}

/// Updates the draw rule state after a move.
DrawRuleState updateDrawRuleState(
  DrawRuleState prevState,
  Move move,
  BoardPosition board,
  Piece movingPiece,
  PlayerColor nextPlayer,
) {
  final isCapture = move is CaptureMove;

  // King-only move count: reset when any man exists on the board or on capture, else increment
  final whitePieces = countPieces(board, PlayerColor.white);
  final blackPieces = countPieces(board, PlayerColor.black);
  final anyMenOnBoard = whitePieces.men > 0 || blackPieces.men > 0;
  final kingOnlyMoveCount =
      isCapture || anyMenOnBoard ? 0 : prevState.kingOnlyMoveCount + 1;

  // Endgame rule tracking
  final endgameActive = _shouldActivateEndgameRule(board);
  final endgameMoveCount = endgameActive && !isCapture
      ? (prevState.isEndgameRuleActive
          ? prevState.endgameMoveCount + 1
          : 1)
      : 0;

  // Add current position hash to history
  final positionHash = computePositionHash(board, nextPlayer);
  final positionHistory = [...prevState.positionHistory, positionHash];

  return DrawRuleState(
    positionHistory: positionHistory,
    kingOnlyMoveCount: kingOnlyMoveCount,
    endgameMoveCount: endgameMoveCount,
    isEndgameRuleActive: endgameActive,
  );
}

/// Serializes a move to a string for move history storage.
String _serializeMove(Move move) {
  switch (move) {
    case QuietMove(:final from, :final to):
      return '$from-$to';
    case CaptureMove(:final steps):
      final parts = steps.map((s) => '${s.from}x${s.captured}x${s.to}');
      return parts.join(',');
  }
}

/// Validates that a move is legal in the current game state.
String? validateMove(GameState state, Move move) {
  if (state.phase != GamePhase.inProgress) {
    return 'Game is not in progress';
  }

  final legalMoves = generateLegalMoves(state.board, state.currentPlayer);
  final moveOrigin = getMoveOrigin(move);
  final moveDestination = getMoveDestination(move);

  final isLegal = legalMoves.any((m) {
    if (getMoveOrigin(m) != moveOrigin) return false;
    if (getMoveDestination(m) != moveDestination) return false;
    if (m.runtimeType != move.runtimeType) return false;
    if (m is CaptureMove && move is CaptureMove) {
      final mCaptured = getCapturedSquares(m);
      final moveCaptured = getCapturedSquares(move);
      if (mCaptured.length != moveCaptured.length) return false;
      for (var i = 0; i < mCaptured.length; i++) {
        if (mCaptured[i] != moveCaptured[i]) return false;
      }
    }
    return true;
  });

  if (!isLegal) {
    return 'Illegal move';
  }

  return null;
}

/// Applies a move to the game state and returns the new state.
/// This is the main entry point for game progression.
MoveResult applyMove(GameState state, Move move) {
  // Validate the move
  final error = validateMove(state, move);
  if (error != null) {
    return MoveResult(newState: state, isValid: false, error: error);
  }

  // Get the moving piece before applying
  final movingPiece = getPiece(state.board, getMoveOrigin(move));
  if (movingPiece == null) {
    return MoveResult(
      newState: state,
      isValid: false,
      error: 'No piece at origin',
    );
  }

  // Apply the move to the board
  final newBoard = applyMoveToBoard(state.board, move);

  // Switch player
  final nextPlayer = oppositeColor(state.currentPlayer);

  // Update draw rule state
  final newDrawRuleState = updateDrawRuleState(
    state.drawRuleState,
    move,
    newBoard,
    movingPiece,
    nextPlayer,
  );

  // Count pieces on new board
  final whitePieces = countPieces(newBoard, PlayerColor.white);
  final blackPieces = countPieces(newBoard, PlayerColor.black);

  // Check for game outcome
  final legalMovesForNext = generateLegalMoves(newBoard, nextPlayer);
  final drawReason = checkDrawCondition(newBoard, newDrawRuleState, nextPlayer);

  var phase = GamePhase.inProgress;
  DrawReason? drawReasonResult;

  if (legalMovesForNext.isEmpty) {
    // Opponent has no legal moves — current player wins
    phase = state.currentPlayer == PlayerColor.white
        ? GamePhase.whiteWins
        : GamePhase.blackWins;
  } else if (drawReason != null) {
    // Draw condition met
    phase = GamePhase.draw;
    drawReasonResult = drawReason;
  }

  final newState = GameState(
    board: newBoard,
    currentPlayer: nextPlayer,
    phase: phase,
    moveHistory: [...state.moveHistory, _serializeMove(move)],
    drawReason: drawReasonResult,
    whitePieceCount: whitePieces.total,
    blackPieceCount: blackPieces.total,
    drawRuleState: newDrawRuleState,
  );

  return MoveResult(newState: newState, isValid: true);
}

/// Starts a new game, returning a game state in InProgress phase.
GameState startGame([GameState? state]) {
  final initial = state ?? createInitialGameState();
  return initial.copyWith(phase: GamePhase.inProgress);
}

/// Gets all legal moves for the current position.
/// Returns empty list if the game is not in progress.
List<Move> getLegalMoves(GameState state) {
  if (state.phase != GamePhase.inProgress) {
    return [];
  }
  return generateLegalMoves(state.board, state.currentPlayer);
}
