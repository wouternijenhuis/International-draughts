import 'package:draughts_engine/draughts_engine.dart';
import 'package:test/test.dart';

/// Helper: set up a board with specific pieces.
List<Piece?> setupBoard(
  List<({int square, PieceType type, PlayerColor color})> pieces,
) {
  final board = createEmptyBoard();
  for (final p in pieces) {
    board[p.square] = createPiece(p.type, p.color);
  }
  return board;
}

/// Helper: create an in-progress game state from a board.
GameState createGameStateHelper(
  List<Piece?> board,
  PlayerColor currentPlayer, {
  int? kingOnlyMoveCount,
  int? endgameMoveCount,
  bool? isEndgameRuleActive,
  List<BigInt>? positionHistory,
}) {
  var white = 0;
  var black = 0;
  for (var i = 1; i <= 50; i++) {
    if (board[i] != null) {
      if (board[i]!.color == PlayerColor.white) white++;
      if (board[i]!.color == PlayerColor.black) black++;
    }
  }
  return GameState(
    board: board,
    currentPlayer: currentPlayer,
    phase: GamePhase.inProgress,
    moveHistory: const [],
    drawReason: null,
    whitePieceCount: white,
    blackPieceCount: black,
    drawRuleState: DrawRuleState(
      positionHistory: positionHistory ?? const [],
      kingOnlyMoveCount: kingOnlyMoveCount ?? 0,
      endgameMoveCount: endgameMoveCount ?? 0,
      isEndgameRuleActive: isEndgameRuleActive ?? false,
    ),
  );
}

void main() {
  group('startGame', () {
    test('transitions state to InProgress', () {
      final state = createInitialGameState();
      expect(state.phase, equals(GamePhase.inProgress));

      final started = startGame(state);
      expect(started.phase, equals(GamePhase.inProgress));
      expect(started.currentPlayer, equals(PlayerColor.white));
    });

    test('creates new game if no state provided', () {
      final started = startGame();
      expect(started.phase, equals(GamePhase.inProgress));
    });
  });

  group('applyMoveToBoard', () {
    test('applies quiet move correctly', () {
      final board = setupBoard([
        (square: 28, type: PieceType.man, color: PlayerColor.white),
      ]);
      final move = createQuietMove(28, 33);
      final newBoard = applyMoveToBoard(board, move);

      expect(newBoard[28], isNull);
      expect(
        newBoard[33],
        equals(const Piece(type: PieceType.man, color: PlayerColor.white)),
      );
    });

    test('promotes regular piece on quiet move to promotion row', () {
      // White promotes on row 9 (squares 46-50)
      final board = setupBoard([
        (square: 41, type: PieceType.man, color: PlayerColor.white),
      ]);
      final move = createQuietMove(41, 46);
      final newBoard = applyMoveToBoard(board, move);

      expect(
        newBoard[46],
        equals(const Piece(type: PieceType.king, color: PlayerColor.white)),
      );
    });

    test('applies capture move correctly', () {
      final board = setupBoard([
        (square: 28, type: PieceType.man, color: PlayerColor.white),
        (square: 33, type: PieceType.man, color: PlayerColor.black),
      ]);
      final steps = [const CaptureStep(from: 28, to: 39, captured: 33)];
      final move = createCaptureMove(steps);
      final newBoard = applyMoveToBoard(board, move);

      expect(newBoard[28], isNull); // Origin cleared
      expect(newBoard[33], isNull); // Captured piece removed
      expect(
        newBoard[39],
        equals(const Piece(type: PieceType.man, color: PlayerColor.white)),
      ); // Piece at destination
    });

    test('promotes regular piece on capture ending on promotion row', () {
      final board = setupBoard([
        (square: 39, type: PieceType.man, color: PlayerColor.white),
        (square: 44, type: PieceType.man, color: PlayerColor.black),
      ]);
      final steps = [const CaptureStep(from: 39, to: 50, captured: 44)];
      final move = createCaptureMove(steps);
      final newBoard = applyMoveToBoard(board, move);

      expect(
        newBoard[50],
        equals(const Piece(type: PieceType.king, color: PlayerColor.white)),
      );
    });
  });

  group('applyMove', () {
    test('applies a legal quiet move', () {
      final board = setupBoard([
        (square: 28, type: PieceType.man, color: PlayerColor.white),
        (square: 40, type: PieceType.man, color: PlayerColor.black),
      ]);
      final state = createGameStateHelper(board, PlayerColor.white);
      final move = createQuietMove(28, 33);
      final result = applyMove(state, move);

      expect(result.isValid, isTrue);
      expect(result.newState.currentPlayer, equals(PlayerColor.black));
      expect(result.newState.moveHistory, hasLength(1));
    });

    test('rejects move on completed game', () {
      final state = createGameStateHelper(
        createEmptyBoard(),
        PlayerColor.white,
      ).copyWith(phase: GamePhase.whiteWins);
      final move = createQuietMove(28, 33);
      final result = applyMove(state, move);

      expect(result.isValid, isFalse);
      expect(result.error, contains('not in progress'));
    });

    test('rejects illegal move', () {
      final board = setupBoard([
        (square: 28, type: PieceType.man, color: PlayerColor.white),
        (square: 40, type: PieceType.man, color: PlayerColor.black),
      ]);
      final state = createGameStateHelper(board, PlayerColor.white);
      final move =
          createQuietMove(28, 22); // Backward — illegal for regular piece

      final result = applyMove(state, move);
      expect(result.isValid, isFalse);
    });

    test('detects win when opponent has no legal moves', () {
      // Set up position where black has one piece that will be captured
      final board = setupBoard([
        (square: 28, type: PieceType.man, color: PlayerColor.white),
        (square: 33, type: PieceType.man, color: PlayerColor.black),
      ]);
      final state = createGameStateHelper(board, PlayerColor.white);

      // Generate legal moves — should be a capture
      final moves = getLegalMoves(state);
      expect(moves.length, greaterThan(0));

      final result = applyMove(state, moves[0]);
      expect(result.isValid, isTrue);
      // After capture, black has no pieces -> no legal moves -> white wins
      expect(result.newState.phase, equals(GamePhase.whiteWins));
    });
  });

  group('computePositionHash', () {
    test('produces same hash for identical positions', () {
      final board1 = setupBoard([
        (square: 28, type: PieceType.man, color: PlayerColor.white),
      ]);
      final board2 = setupBoard([
        (square: 28, type: PieceType.man, color: PlayerColor.white),
      ]);
      expect(
        computePositionHash(board1, PlayerColor.white),
        equals(computePositionHash(board2, PlayerColor.white)),
      );
    });

    test('produces different hash for different turn', () {
      final board = setupBoard([
        (square: 28, type: PieceType.man, color: PlayerColor.white),
      ]);
      expect(
        computePositionHash(board, PlayerColor.white),
        isNot(equals(computePositionHash(board, PlayerColor.black))),
      );
    });

    test('produces different hash for different piece positions', () {
      final board1 = setupBoard([
        (square: 28, type: PieceType.man, color: PlayerColor.white),
      ]);
      final board2 = setupBoard([
        (square: 29, type: PieceType.man, color: PlayerColor.white),
      ]);
      expect(
        computePositionHash(board1, PlayerColor.white),
        isNot(equals(computePositionHash(board2, PlayerColor.white))),
      );
    });

    test('no collision: WM@12+WK@13 vs WK@12+empty@13 (BUG-002 regression)', () {
      // With old base 67 these two positions produced the same hash
      final boardA = setupBoard([
        (square: 12, type: PieceType.man, color: PlayerColor.white),
        (square: 13, type: PieceType.king, color: PlayerColor.white),
      ]);
      final boardB = setupBoard([
        (square: 12, type: PieceType.king, color: PlayerColor.white),
      ]);
      expect(
        computePositionHash(boardA, PlayerColor.white),
        isNot(equals(computePositionHash(boardB, PlayerColor.white))),
      );
    });
  });

  group('checkDrawCondition', () {
    test('detects threefold repetition', () {
      final board = setupBoard([
        (square: 28, type: PieceType.king, color: PlayerColor.white),
        (square: 50, type: PieceType.king, color: PlayerColor.black),
      ]);
      final hash = computePositionHash(board, PlayerColor.white);
      final drawState = DrawRuleState(
        positionHistory: [hash, hash, hash], // 3 occurrences
        kingOnlyMoveCount: 0,
        endgameMoveCount: 0,
        isEndgameRuleActive: false,
      );

      final result = checkDrawCondition(board, drawState, PlayerColor.white);
      expect(result, equals(DrawReason.threefoldRepetition));
    });

    test('detects 25-move king-only rule at 50 half-moves', () {
      final board = setupBoard([
        (square: 28, type: PieceType.king, color: PlayerColor.white),
        (square: 50, type: PieceType.king, color: PlayerColor.black),
      ]);
      const drawState = DrawRuleState(
        positionHistory: [],
        kingOnlyMoveCount: 50,
        endgameMoveCount: 0,
        isEndgameRuleActive: false,
      );

      final result = checkDrawCondition(board, drawState, PlayerColor.white);
      expect(result, equals(DrawReason.twentyFiveMoveRule));
    });

    test('does not trigger 25-move rule at 25 half-moves (needs 50)', () {
      final board = setupBoard([
        (square: 28, type: PieceType.king, color: PlayerColor.white),
        (square: 50, type: PieceType.king, color: PlayerColor.black),
      ]);
      const drawState = DrawRuleState(
        positionHistory: [],
        kingOnlyMoveCount: 25,
        endgameMoveCount: 0,
        isEndgameRuleActive: false,
      );

      final result = checkDrawCondition(board, drawState, PlayerColor.white);
      expect(result, isNull);
    });

    test('does not trigger 25-move rule if regular pieces remain', () {
      final board = setupBoard([
        (square: 28, type: PieceType.man, color: PlayerColor.white),
        (square: 50, type: PieceType.king, color: PlayerColor.black),
      ]);
      const drawState = DrawRuleState(
        positionHistory: [],
        kingOnlyMoveCount: 50,
        endgameMoveCount: 0,
        isEndgameRuleActive: false,
      );

      final result = checkDrawCondition(board, drawState, PlayerColor.white);
      expect(result, isNull);
    });

    test('detects 16-move endgame rule at 32 half-moves', () {
      final board = setupBoard([
        (square: 28, type: PieceType.king, color: PlayerColor.white),
        (square: 33, type: PieceType.king, color: PlayerColor.white),
        (square: 39, type: PieceType.king, color: PlayerColor.white),
        (square: 50, type: PieceType.king, color: PlayerColor.black),
      ]);
      const drawState = DrawRuleState(
        positionHistory: [],
        kingOnlyMoveCount: 32,
        endgameMoveCount: 32,
        isEndgameRuleActive: true,
      );

      final result = checkDrawCondition(board, drawState, PlayerColor.white);
      expect(result, equals(DrawReason.sixteenMoveRule));
    });

    test('does not trigger 16-move rule at 16 half-moves (needs 32)', () {
      final board = setupBoard([
        (square: 28, type: PieceType.king, color: PlayerColor.white),
        (square: 33, type: PieceType.king, color: PlayerColor.white),
        (square: 39, type: PieceType.king, color: PlayerColor.white),
        (square: 50, type: PieceType.king, color: PlayerColor.black),
      ]);
      const drawState = DrawRuleState(
        positionHistory: [],
        kingOnlyMoveCount: 16,
        endgameMoveCount: 16,
        isEndgameRuleActive: true,
      );

      final result = checkDrawCondition(board, drawState, PlayerColor.white);
      expect(result, isNull);
    });

    test('returns null when no draw condition met', () {
      final board = setupBoard([
        (square: 28, type: PieceType.man, color: PlayerColor.white),
        (square: 50, type: PieceType.man, color: PlayerColor.black),
      ]);
      const drawState = DrawRuleState(
        positionHistory: [],
        kingOnlyMoveCount: 5,
        endgameMoveCount: 0,
        isEndgameRuleActive: false,
      );

      final result = checkDrawCondition(board, drawState, PlayerColor.white);
      expect(result, isNull);
    });
  });

  group('16-move endgame rule activation', () {
    test('activates for 3 kings vs 1 king', () {
      final board = setupBoard([
        (square: 1, type: PieceType.king, color: PlayerColor.white),
        (square: 6, type: PieceType.king, color: PlayerColor.white),
        (square: 11, type: PieceType.king, color: PlayerColor.white),
        (square: 50, type: PieceType.king, color: PlayerColor.black),
      ]);
      final state = createGameStateHelper(board, PlayerColor.white);
      // White king makes a quiet move
      final move = createQuietMove(1, 7);
      final result = applyMove(state, move);
      expect(result.isValid, isTrue);
      expect(result.newState.drawRuleState.isEndgameRuleActive, isTrue);
    });

    test('activates for 2K+1M vs 1K', () {
      final board = setupBoard([
        (square: 1, type: PieceType.king, color: PlayerColor.white),
        (square: 6, type: PieceType.king, color: PlayerColor.white),
        (square: 11, type: PieceType.man, color: PlayerColor.white),
        (square: 50, type: PieceType.king, color: PlayerColor.black),
      ]);
      final state = createGameStateHelper(board, PlayerColor.white);
      final move = createQuietMove(1, 7);
      final result = applyMove(state, move);
      expect(result.isValid, isTrue);
      expect(result.newState.drawRuleState.isEndgameRuleActive, isTrue);
    });

    test('activates for 1K+2M vs 1K', () {
      final board = setupBoard([
        (square: 1, type: PieceType.king, color: PlayerColor.white),
        (square: 11, type: PieceType.man, color: PlayerColor.white),
        (square: 16, type: PieceType.man, color: PlayerColor.white),
        (square: 50, type: PieceType.king, color: PlayerColor.black),
      ]);
      final state = createGameStateHelper(board, PlayerColor.white);
      final move = createQuietMove(1, 7);
      final result = applyMove(state, move);
      expect(result.isValid, isTrue);
      expect(result.newState.drawRuleState.isEndgameRuleActive, isTrue);
    });

    test('does NOT activate for 2K vs 2K', () {
      final board = setupBoard([
        (square: 1, type: PieceType.king, color: PlayerColor.white),
        (square: 6, type: PieceType.king, color: PlayerColor.white),
        (square: 45, type: PieceType.king, color: PlayerColor.black),
        (square: 50, type: PieceType.king, color: PlayerColor.black),
      ]);
      final state = createGameStateHelper(board, PlayerColor.white);
      final move = createQuietMove(1, 7);
      final result = applyMove(state, move);
      expect(result.isValid, isTrue);
      expect(result.newState.drawRuleState.isEndgameRuleActive, isFalse);
    });

    test('does NOT activate for 2K vs 2K (all kings, 4 pieces)', () {
      final board = setupBoard([
        (square: 28, type: PieceType.king, color: PlayerColor.white),
        (square: 33, type: PieceType.king, color: PlayerColor.white),
        (square: 39, type: PieceType.king, color: PlayerColor.black),
        (square: 50, type: PieceType.king, color: PlayerColor.black),
      ]);
      const drawState = DrawRuleState(
        positionHistory: [],
        kingOnlyMoveCount: 32,
        endgameMoveCount: 32,
        isEndgameRuleActive: false,
      );
      // Even at 32 half-moves, should not trigger because 2K vs 2K is not valid
      final result =
          checkDrawCondition(board, drawState, PlayerColor.white);
      expect(result, isNull);
    });
  });

  group('initial position in repetition history', () {
    test('includes the initial position hash in positionHistory', () {
      final state = createInitialGameState();
      expect(state.drawRuleState.positionHistory, hasLength(1));
    });

    test('initial position hash matches computePositionHash', () {
      final state = createInitialGameState();
      final expectedHash =
          computePositionHash(state.board, PlayerColor.white);
      expect(state.drawRuleState.positionHistory[0], equals(expectedHash));
    });
  });

  group('king-only counter reset logic', () {
    test('resets king-only counter when men exist on the board', () {
      // Board with kings and men — king move should NOT increment counter
      final board = setupBoard([
        (square: 1, type: PieceType.king, color: PlayerColor.white),
        (square: 11, type: PieceType.man, color: PlayerColor.white),
        (square: 50, type: PieceType.king, color: PlayerColor.black),
      ]);
      final state = createGameStateHelper(
        board,
        PlayerColor.white,
        kingOnlyMoveCount: 10,
      );
      final move = createQuietMove(1, 7);
      final result = applyMove(state, move);
      expect(result.isValid, isTrue);
      // Counter should reset to 0 because men exist on the board
      expect(result.newState.drawRuleState.kingOnlyMoveCount, equals(0));
    });

    test('increments king-only counter when only kings remain', () {
      final board = setupBoard([
        (square: 1, type: PieceType.king, color: PlayerColor.white),
        (square: 50, type: PieceType.king, color: PlayerColor.black),
      ]);
      final state = createGameStateHelper(
        board,
        PlayerColor.white,
        kingOnlyMoveCount: 10,
      );
      final move = createQuietMove(1, 7);
      final result = applyMove(state, move);
      expect(result.isValid, isTrue);
      expect(result.newState.drawRuleState.kingOnlyMoveCount, equals(11));
    });
  });

  group('oppositeColor', () {
    test('returns Black for White', () {
      expect(oppositeColor(PlayerColor.white), equals(PlayerColor.black));
    });

    test('returns White for Black', () {
      expect(oppositeColor(PlayerColor.black), equals(PlayerColor.white));
    });
  });

  group('getLegalMoves', () {
    test('returns empty for completed game', () {
      final state = createGameStateHelper(
        createInitialBoard(),
        PlayerColor.white,
      ).copyWith(phase: GamePhase.whiteWins);
      expect(getLegalMoves(state), hasLength(0));
    });

    test('returns empty for draw game', () {
      final state = createGameStateHelper(
        createInitialBoard(),
        PlayerColor.white,
      ).copyWith(phase: GamePhase.draw);
      expect(getLegalMoves(state), hasLength(0));
    });

    test('returns moves for in-progress game', () {
      final state = startGame();
      final moves = getLegalMoves(state);
      expect(moves.length, greaterThan(0));
    });
  });
}
