import 'package:draughts_engine/draughts_engine.dart';
import 'package:test/test.dart';

void main() {
  group('deserializeMoveNotation', () {
    test('QuietMove_SimpleNotation_ReturnsCorrectFromTo', () {
      final result = deserializeMoveNotation('32-28');
      expect(result.from, equals(32));
      expect(result.to, equals(28));
    });

    test('QuietMove_LowSquareNumbers_ReturnsCorrectFromTo', () {
      final result = deserializeMoveNotation('1-6');
      expect(result.from, equals(1));
      expect(result.to, equals(6));
    });

    test('SingleCapture_InternalFormat_ReturnsOriginAndDestination', () {
      // Internal format: "fromxcapturedxto"
      final result = deserializeMoveNotation('19x24x30');
      expect(result.from, equals(19));
      expect(result.to, equals(30));
    });

    test('TwoStepCapture_InternalFormat_ReturnsFirstOriginAndLastDestination',
        () {
      // Internal format: "step1,step2"
      final result = deserializeMoveNotation('28x33x39,39x44x50');
      expect(result.from, equals(28));
      expect(result.to, equals(50));
    });

    test(
        'ThreeStepCapture_InternalFormat_ReturnsFirstOriginAndLastDestination',
        () {
      // Internal format: "step1,step2,step3"
      final result = deserializeMoveNotation('6x11x17,17x22x28,28x33x39');
      expect(result.from, equals(6));
      expect(result.to, equals(39));
    });

    test('FourStepCapture_InternalFormat_ReturnsFirstOriginAndLastDestination',
        () {
      final result = deserializeMoveNotation(
        '1x6x11,11x16x21,21x27x32,32x38x43',
      );
      expect(result.from, equals(1));
      expect(result.to, equals(43));
    });

    test('InvalidNotation_EmptyString_ThrowsFormatException', () {
      expect(
        () => deserializeMoveNotation(''),
        throwsFormatException,
      );
    });

    test('InvalidNotation_NoSeparator_ThrowsFormatException', () {
      expect(
        () => deserializeMoveNotation('32'),
        throwsFormatException,
      );
    });

    test('InvalidQuietMove_TooManyParts_ThrowsFormatException', () {
      expect(
        () => deserializeMoveNotation('32-28-24'),
        throwsFormatException,
      );
    });
  });

  group('deserializeMoveNotation round-trip with game engine', () {
    test('QuietMove_RoundTrip_DeserializesCorrectly', () {
      // Apply a quiet move and verify the serialized history can be deserialized
      var state = createInitialGameState();
      final legalMoves =
          generateLegalMoves(state.board, state.currentPlayer);
      final move = legalMoves.whereType<QuietMove>().first;
      final from = getMoveOrigin(move);
      final to = getMoveDestination(move);
      state = applyMove(state, move).newState;

      final serialized = state.moveHistory.last;
      final result = deserializeMoveNotation(serialized);
      expect(result.from, equals(from));
      expect(result.to, equals(to));
    });

    test('CaptureMove_RoundTrip_DeserializesCorrectly', () {
      // Play moves until a capture occurs, then verify deserialization
      var state = createInitialGameState();

      // Play up to 30 half-moves looking for a capture in the history
      for (var i = 0; i < 30; i++) {
        final legalMoves =
            generateLegalMoves(state.board, state.currentPlayer);
        if (legalMoves.isEmpty) break;

        // Prefer captures if available
        final captures = legalMoves.whereType<CaptureMove>();
        final move = captures.isNotEmpty ? captures.first : legalMoves.first;

        if (move is CaptureMove) {
          final from = getMoveOrigin(move);
          final to = getMoveDestination(move);
          state = applyMove(state, move).newState;

          final serialized = state.moveHistory.last;
          final result = deserializeMoveNotation(serialized);
          expect(result.from, equals(from));
          expect(result.to, equals(to));
          return; // Test passed
        }

        state = applyMove(state, move).newState;
      }

      // If we never found a capture, skip (shouldn't happen in practice)
      fail('No capture occurred within 30 half-moves');
    });
  });

  group('parseMoveNotation', () {
    test('QuietMove_ReturnsCorrectType', () {
      final result = parseMoveNotation('32-28');
      expect(result.type, equals('quiet'));
      expect(result.squares, equals([32, 28]));
    });

    test('SingleCapture_ReturnsCorrectSquares', () {
      final result = parseMoveNotation('19x30');
      expect(result.type, equals('capture'));
      expect(result.squares, equals([19, 30]));
    });

    test('MultiCapture_DisplayFormat_ReturnsCorrectSquares', () {
      final result = parseMoveNotation('28x39x50');
      expect(result.type, equals('capture'));
      expect(result.squares, equals([28, 39, 50]));
    });
  });

  group('formatMoveNotation', () {
    test('QuietMove_FormatsCorrectly', () {
      const move = QuietMove(from: 32, to: 28);
      expect(formatMoveNotation(move), equals('32-28'));
    });

    test('SingleCapture_FormatsCorrectly', () {
      const move = CaptureMove(steps: [
        CaptureStep(from: 19, captured: 24, to: 30),
      ]);
      expect(formatMoveNotation(move), equals('19x30'));
    });

    test('MultiCapture_FormatsCorrectly', () {
      const move = CaptureMove(steps: [
        CaptureStep(from: 28, captured: 33, to: 39),
        CaptureStep(from: 39, captured: 44, to: 50),
      ]);
      expect(formatMoveNotation(move), equals('28x39x50'));
    });
  });
}
