import 'package:draughts_engine/draughts_engine.dart';
import 'package:test/test.dart';

void main() {
  group('Piece', () {
    test('should create a white regular piece', () {
      final piece = createWhiteMan();
      expect(piece.type, equals(PieceType.man));
      expect(piece.color, equals(PlayerColor.white));
    });

    test('should create a black regular piece', () {
      final piece = createBlackMan();
      expect(piece.type, equals(PieceType.man));
      expect(piece.color, equals(PlayerColor.black));
    });

    test('should create a white king', () {
      final piece = createWhiteKing();
      expect(piece.type, equals(PieceType.king));
      expect(piece.color, equals(PlayerColor.white));
    });

    test('should create a black king', () {
      final piece = createBlackKing();
      expect(piece.type, equals(PieceType.king));
      expect(piece.color, equals(PlayerColor.black));
    });

    test('should create a piece with specific type and color', () {
      final piece = createPiece(PieceType.king, PlayerColor.black);
      expect(piece.type, equals(PieceType.king));
      expect(piece.color, equals(PlayerColor.black));
    });
  });

  group('Board - Square validation', () {
    test('should accept valid square numbers 1-50', () {
      for (var i = 1; i <= 50; i++) {
        expect(isValidSquareNumber(i), isTrue);
      }
    });

    test('should reject invalid square numbers', () {
      expect(isValidSquareNumber(0), isFalse);
      expect(isValidSquareNumber(51), isFalse);
      expect(isValidSquareNumber(-1), isFalse);
      // Note: isValidSquareNumber(1.5) is not testable in Dart
      // because the function takes int — the type system prevents non-integers.
    });
  });

  group('Board - Coordinate conversion', () {
    test('should convert square 1 to row 0, col 1', () {
      final coord = squareToCoordinate(1);
      expect(coord.row, equals(0));
      expect(coord.col, equals(1));
    });

    test('should convert square 5 to row 0, col 9', () {
      final coord = squareToCoordinate(5);
      expect(coord.row, equals(0));
      expect(coord.col, equals(9));
    });

    test('should convert square 6 to row 1, col 0', () {
      final coord = squareToCoordinate(6);
      expect(coord.row, equals(1));
      expect(coord.col, equals(0));
    });

    test('should convert square 46 to row 9, col 0', () {
      final coord = squareToCoordinate(46);
      expect(coord.row, equals(9));
      expect(coord.col, equals(0));
    });

    test('should convert square 50 to row 9, col 8', () {
      final coord = squareToCoordinate(50);
      expect(coord.row, equals(9));
      expect(coord.col, equals(8));
    });

    test('should throw for invalid square number', () {
      expect(() => squareToCoordinate(0), throwsA(anything));
      expect(() => squareToCoordinate(51), throwsA(anything));
    });

    test('should round-trip all 50 squares', () {
      for (var sq = 1; sq <= 50; sq++) {
        final coord = squareToCoordinate(sq);
        final result = coordinateToSquare(coord);
        expect(result, equals(sq));
      }
    });

    test('should return null for light squares', () {
      // Row 0 (even), col 0 is a light square
      expect(
        coordinateToSquare(const BoardCoordinate(row: 0, col: 0)),
        isNull,
      );
      // Row 1 (odd), col 1 is a light square
      expect(
        coordinateToSquare(const BoardCoordinate(row: 1, col: 1)),
        isNull,
      );
    });

    test('should return null for out-of-bounds coordinates', () {
      expect(
        coordinateToSquare(const BoardCoordinate(row: -1, col: 0)),
        isNull,
      );
      expect(
        coordinateToSquare(const BoardCoordinate(row: 10, col: 0)),
        isNull,
      );
      expect(
        coordinateToSquare(const BoardCoordinate(row: 0, col: 10)),
        isNull,
      );
    });
  });

  group('Board - Empty board', () {
    test('should create a board with 51 positions', () {
      final board = createEmptyBoard();
      expect(board.length, equals(51));
    });

    test('should have all squares empty', () {
      final board = createEmptyBoard();
      for (var i = 1; i <= 50; i++) {
        expect(board[i], isNull);
      }
    });
  });

  group('Initial position', () {
    test('should place 20 white regular pieces on squares 1-20', () {
      final board = createInitialBoard();
      for (var i = 1; i <= 20; i++) {
        expect(board[i], isNotNull);
        expect(board[i]!.type, equals(PieceType.man));
        expect(board[i]!.color, equals(PlayerColor.white));
      }
    });

    test('should leave squares 21-30 empty', () {
      final board = createInitialBoard();
      for (var i = 21; i <= 30; i++) {
        expect(board[i], isNull);
      }
    });

    test('should place 20 black regular pieces on squares 31-50', () {
      final board = createInitialBoard();
      for (var i = 31; i <= 50; i++) {
        expect(board[i], isNotNull);
        expect(board[i]!.type, equals(PieceType.man));
        expect(board[i]!.color, equals(PlayerColor.black));
      }
    });
  });

  group('Game state', () {
    test('should create initial game state with correct defaults', () {
      final state = createInitialGameState();
      expect(state.currentPlayer, equals(PlayerColor.white));
      expect(state.moveHistory, equals([]));
      expect(state.phase, equals(GamePhase.inProgress));
      expect(state.drawReason, isNull);
      expect(state.whitePieceCount, equals(20));
      expect(state.blackPieceCount, equals(20));
    });

    test('should have correct draw rule state', () {
      final state = createInitialGameState();
      expect(state.drawRuleState.positionHistory, hasLength(1));
      expect(state.drawRuleState.kingOnlyMoveCount, equals(0));
      expect(state.drawRuleState.endgameMoveCount, equals(0));
      expect(state.drawRuleState.isEndgameRuleActive, isFalse);
    });
  });

  group('Position equality', () {
    test('should consider identical positions equal', () {
      final a = createInitialBoard();
      final b = createInitialBoard();
      expect(positionsEqual(a, b), isTrue);
    });

    test('should consider different positions not equal', () {
      final a = createInitialBoard();
      final b = createInitialBoard();
      b[1] = null; // Remove a piece
      expect(positionsEqual(a, b), isFalse);
    });

    test('should consider empty boards equal', () {
      final a = createEmptyBoard();
      final b = createEmptyBoard();
      expect(positionsEqual(a, b), isTrue);
    });
  });

  group('Move types', () {
    test('should create a quiet move', () {
      final move = createQuietMove(32, 28);
      expect(move, isA<QuietMove>());
      expect(move.from, equals(32));
      expect(move.to, equals(28));
    });

    test('should create a capture move', () {
      final move = createCaptureMove([
        const CaptureStep(from: 19, to: 30, captured: 24),
      ]);
      expect(move, isA<CaptureMove>());
      expect(move.steps, hasLength(1));
      expect(move.steps[0].captured, equals(24));
    });

    test('should get move origin and destination', () {
      final quiet = createQuietMove(32, 28);
      expect(getMoveOrigin(quiet), equals(32));
      expect(getMoveDestination(quiet), equals(28));

      final capture = createCaptureMove([
        const CaptureStep(from: 19, to: 30, captured: 24),
        const CaptureStep(from: 30, to: 41, captured: 36),
      ]);
      expect(getMoveOrigin(capture), equals(19));
      expect(getMoveDestination(capture), equals(41));
    });

    test('should get all captured squares', () {
      final capture = createCaptureMove([
        const CaptureStep(from: 19, to: 30, captured: 24),
        const CaptureStep(from: 30, to: 41, captured: 36),
      ]);
      expect(getCapturedSquares(capture), equals([24, 36]));
    });
  });

  group('FMJD Notation', () {
    test('should format a quiet move', () {
      final move = createQuietMove(32, 28);
      expect(formatMoveNotation(move), equals('32-28'));
    });

    test('should format a single capture', () {
      final move = createCaptureMove([
        const CaptureStep(from: 19, to: 30, captured: 24),
      ]);
      expect(formatMoveNotation(move), equals('19x30'));
    });

    test('should format a multi-jump capture', () {
      final move = createCaptureMove([
        const CaptureStep(from: 19, to: 10, captured: 14),
        const CaptureStep(from: 10, to: 3, captured: 7),
      ]);
      expect(formatMoveNotation(move), equals('19x10x3'));
    });

    test('should parse quiet move notation', () {
      final result = parseMoveNotation('32-28');
      expect(result.type, equals('quiet'));
      expect(result.squares, equals([32, 28]));
    });

    test('should parse capture notation', () {
      final result = parseMoveNotation('19x30');
      expect(result.type, equals('capture'));
      expect(result.squares, equals([19, 30]));
    });

    test('should parse multi-jump notation', () {
      final result = parseMoveNotation('19x10x3');
      expect(result.type, equals('capture'));
      expect(result.squares, equals([19, 10, 3]));
    });

    test('should throw for invalid notation', () {
      expect(() => parseMoveNotation('abc'), throwsA(anything));
      expect(() => parseMoveNotation('32-abc'), throwsA(anything));
      expect(() => parseMoveNotation('ax3'), throwsA(anything));
    });
  });
}
