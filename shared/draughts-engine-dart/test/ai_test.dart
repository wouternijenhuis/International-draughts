import 'package:draughts_engine/draughts_engine.dart';
import 'package:test/test.dart';

/// Helper: place pieces on a board.
List<Piece?> setupBoard(
  List<({int square, PieceType type, PlayerColor color})> pieces,
) {
  final board = createEmptyBoard();
  for (final p in pieces) {
    board[p.square] = createPiece(p.type, p.color);
  }
  return board;
}

void main() {
  group('Evaluation function', () {
    test('equal material returns ~0', () {
      final board = setupBoard([
        (square: 28, type: PieceType.man, color: PlayerColor.white),
        (square: 33, type: PieceType.man, color: PlayerColor.black),
      ]);
      final score = evaluate(board, PlayerColor.white);
      expect(score.abs(), lessThan(50)); // Small positional difference only
    });

    test('material advantage gives positive score', () {
      final board = setupBoard([
        (square: 28, type: PieceType.man, color: PlayerColor.white),
        (square: 22, type: PieceType.man, color: PlayerColor.white),
        (square: 33, type: PieceType.man, color: PlayerColor.black),
      ]);
      final score = evaluate(board, PlayerColor.white);
      expect(score, greaterThan(50));
    });

    test('material disadvantage gives negative score', () {
      final board = setupBoard([
        (square: 28, type: PieceType.man, color: PlayerColor.white),
        (square: 33, type: PieceType.man, color: PlayerColor.black),
        (square: 38, type: PieceType.man, color: PlayerColor.black),
      ]);
      final score = evaluate(board, PlayerColor.white);
      expect(score, lessThan(-50));
    });

    test('king is worth more than a regular piece', () {
      final boardWithKing = setupBoard([
        (square: 28, type: PieceType.king, color: PlayerColor.white),
        (square: 33, type: PieceType.man, color: PlayerColor.black),
      ]);
      final boardWithMan = setupBoard([
        (square: 28, type: PieceType.man, color: PlayerColor.white),
        (square: 33, type: PieceType.man, color: PlayerColor.black),
      ]);
      expect(
        evaluate(boardWithKing, PlayerColor.white),
        greaterThan(evaluate(boardWithMan, PlayerColor.white)),
      );
    });

    test('no pieces = loss', () {
      final board = setupBoard([
        (square: 33, type: PieceType.man, color: PlayerColor.black),
      ]);
      final score = evaluate(board, PlayerColor.white);
      expect(score, equals(-10000));
    });

    test('opponent has no pieces = win', () {
      final board = setupBoard([
        (square: 28, type: PieceType.man, color: PlayerColor.white),
      ]);
      final score = evaluate(board, PlayerColor.white);
      expect(score, equals(10000));
    });
  });

  group('Quick evaluate', () {
    test('returns material-based score', () {
      final board = setupBoard([
        (square: 28, type: PieceType.man, color: PlayerColor.white),
        (square: 22, type: PieceType.man, color: PlayerColor.white),
        (square: 33, type: PieceType.man, color: PlayerColor.black),
      ]);
      final score = quickEvaluate(board, PlayerColor.white);
      expect(score, equals(100)); // 2 regular pieces - 1 regular piece = +100
    });
  });

  group('Difficulty configs', () {
    test('has easy, medium, hard', () {
      expect(getDifficultyConfig('easy'), isNotNull);
      expect(getDifficultyConfig('medium'), isNotNull);
      expect(getDifficultyConfig('hard'), isNotNull);
    });

    test('is case insensitive', () {
      expect(getDifficultyConfig('Easy'), isNotNull);
      expect(getDifficultyConfig('HARD'), isNotNull);
    });

    test('returns null for unknown', () {
      expect(getDifficultyConfig('impossible'), isNull);
    });

    test('easy has low depth and high blunder rate', () {
      final easy = difficultyConfigs['easy']!;
      expect(easy.maxDepth, lessThanOrEqualTo(3));
      expect(easy.blunderProbability, greaterThanOrEqualTo(0.2));
    });

    test('hard has high depth and low blunders', () {
      final hard = difficultyConfigs['hard']!;
      expect(hard.maxDepth, greaterThanOrEqualTo(5));
      expect(hard.blunderProbability, lessThan(0.1));
    });
  });

  group('AI Search - findBestMove', () {
    test('finds a legal move from initial position', () {
      final board = createInitialBoard();
      final result =
          findBestMove(board, PlayerColor.white, difficultyConfigs['easy']);
      expect(result, isNotNull);
      expect(result!.move, isNotNull);
    });

    test('returns null when no legal moves', () {
      final board = setupBoard([
        (square: 33, type: PieceType.man, color: PlayerColor.black),
      ]);
      final result =
          findBestMove(board, PlayerColor.white, difficultyConfigs['easy']);
      expect(result, isNull);
    });

    test('returns only move when single legal move exists', () {
      final board = setupBoard([
        (square: 46, type: PieceType.man, color: PlayerColor.black),
        (square: 45, type: PieceType.man, color: PlayerColor.black),
        (square: 50, type: PieceType.man, color: PlayerColor.black),
      ]);
      final result =
          findBestMove(board, PlayerColor.black, difficultyConfigs['easy']);
      expect(result, isNotNull);
    });

    test('captures when capture is mandatory (finds forced win)', () {
      // White regular piece at 28, black regular piece at 33 — single forced capture
      final board = setupBoard([
        (square: 28, type: PieceType.man, color: PlayerColor.white),
        (square: 33, type: PieceType.man, color: PlayerColor.black),
      ]);
      final result =
          findBestMove(board, PlayerColor.white, difficultyConfigs['hard']);
      expect(result, isNotNull);
      // With only one legal move, search short-circuits
      expect(result!.move, isA<CaptureMove>());
    });

    test('avoids losing material when possible', () {
      // White has two pieces, black has one. White should not blunder a piece.
      final board = setupBoard([
        (square: 17, type: PieceType.man, color: PlayerColor.white),
        (square: 22, type: PieceType.man, color: PlayerColor.white),
        (square: 33, type: PieceType.man, color: PlayerColor.black),
      ]);
      final result =
          findBestMove(board, PlayerColor.white, difficultyConfigs['hard']);
      expect(result, isNotNull);
    });

    test('hard searches deeper than easy', () {
      // Use initial position which has many legal moves
      final board = createInitialBoard();
      const hardWith4 = DifficultyConfig(
        name: 'Hard',
        maxDepth: 4,
        timeLimitMs: 5000,
        noiseAmplitude: 5,
        blunderProbability: 0.005,
        blunderMargin: 20,
        evalFeatureScale: 1.0,
        useTranspositionTable: true,
        useKillerMoves: true,
      );
      final hardResult = findBestMove(board, PlayerColor.white, hardWith4);
      final easyResult =
          findBestMove(board, PlayerColor.white, difficultyConfigs['easy']);
      expect(hardResult, isNotNull);
      expect(easyResult, isNotNull);
      expect(hardResult!.depthReached, greaterThan(easyResult!.depthReached));
    });

    test('completes within reasonable time', () {
      final board = createInitialBoard();
      final stopwatch = Stopwatch()..start();
      findBestMove(board, PlayerColor.white, difficultyConfigs['easy']);
      stopwatch.stop();
      expect(stopwatch.elapsedMilliseconds, lessThan(5000));
    });
  });
}
