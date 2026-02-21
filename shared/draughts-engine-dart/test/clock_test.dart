import 'package:draughts_engine/draughts_engine.dart';
import 'package:test/test.dart';

void main() {
  const fischerConfig = ClockConfig(
    format: ClockFormat.fischer,
    baseTimeMs: 5 * 60 * 1000,
    incrementMs: 5000,
  );
  const countdownConfig = ClockConfig(
    format: ClockFormat.countdown,
    baseTimeMs: 10 * 60 * 1000,
    incrementMs: 0,
  );

  group('Clock - createClockState', () {
    test('creates correct initial state for Fischer', () {
      final state = createClockState(fischerConfig);
      expect(state.white.remainingMs, equals(300000));
      expect(state.black.remainingMs, equals(300000));
      expect(state.activePlayer, isNull);
      expect(state.isStarted, isFalse);
    });

    test('creates correct initial state for Countdown', () {
      final state = createClockState(countdownConfig);
      expect(state.white.remainingMs, equals(600000));
      expect(state.black.remainingMs, equals(600000));
    });
  });

  group('Clock - Presets', () {
    test('creates from valid preset name', () {
      final state = createClockFromPreset('blitz-3+2');
      expect(state, isNotNull);
      expect(state!.config.baseTimeMs, equals(3 * 60 * 1000));
      expect(state.config.incrementMs, equals(2000));
    });

    test('returns null for invalid preset', () {
      expect(createClockFromPreset('nonexistent'), isNull);
    });

    test('has all expected presets', () {
      expect(clockPresets.keys, contains('blitz-3+2'));
      expect(clockPresets.keys, contains('blitz-5+5'));
      expect(clockPresets.keys, contains('rapid-10+0'));
      expect(clockPresets.keys, contains('rapid-15+10'));
      expect(clockPresets.keys, contains('classical-30+0'));
      expect(clockPresets.keys, contains('classical-60+30'));
    });
  });

  group('Clock - startClock', () {
    test('starts white clock', () {
      final state = createClockState(fischerConfig);
      final started = startClock(state, 'white', 1000);
      expect(started.white.isRunning, isTrue);
      expect(started.white.lastStartedAt, equals(1000));
      expect(started.activePlayer, equals('white'));
      expect(started.isStarted, isTrue);
    });
  });

  group('Clock - tickClock', () {
    test('decreases remaining time based on elapsed', () {
      var state = createClockState(fischerConfig);
      state = startClock(state, 'white', 1000);
      final ticked = tickClock(state, 6000); // 5 seconds elapsed
      expect(ticked.white.remainingMs, equals(300000 - 5000));
    });

    test('remaining time never goes below 0', () {
      var state = createClockState(fischerConfig);
      state = startClock(state, 'white', 0);
      final ticked = tickClock(state, 999999999); // way past
      expect(ticked.white.remainingMs, equals(0));
    });

    test('does nothing when no active player', () {
      final state = createClockState(fischerConfig);
      final ticked = tickClock(state, 5000);
      // When no active player, tickClock returns the same object
      expect(identical(ticked, state), isTrue);
    });
  });

  group('Clock - switchClock', () {
    test('Fischer: stops current, adds increment, starts opponent', () {
      var state = createClockState(fischerConfig);
      state = startClock(state, 'white', 0);
      final switched = switchClock(state, 3000); // 3 seconds elapsed

      // White: 300000 - 3000 + 5000 (increment) = 302000
      expect(switched.white.remainingMs, equals(302000));
      expect(switched.white.isRunning, isFalse);

      // Black starts
      expect(switched.black.isRunning, isTrue);
      expect(switched.activePlayer, equals('black'));
    });

    test('Countdown: no increment added', () {
      var state = createClockState(countdownConfig);
      state = startClock(state, 'white', 0);
      final switched = switchClock(state, 3000);

      // White: 600000 - 3000 = 597000 (no increment)
      expect(switched.white.remainingMs, equals(597000));
    });

    test('correctly alternates between players', () {
      var state = createClockState(fischerConfig);
      state = startClock(state, 'white', 0);
      state = switchClock(state, 2000); // white → black
      expect(state.activePlayer, equals('black'));
      state = switchClock(state, 4000); // black → white
      expect(state.activePlayer, equals('white'));
    });
  });

  group('Clock - pauseClock', () {
    test('stops both clocks', () {
      var state = createClockState(fischerConfig);
      state = startClock(state, 'white', 0);
      final paused = pauseClock(state, 5000);

      expect(paused.white.isRunning, isFalse);
      expect(paused.black.isRunning, isFalse);
      expect(paused.activePlayer, isNull);
      // White should have lost 5 seconds
      expect(paused.white.remainingMs, equals(295000));
    });
  });

  group('Clock - resumeClock', () {
    test('resumes the correct player', () {
      var state = createClockState(fischerConfig);
      state = startClock(state, 'white', 0);
      state = pauseClock(state, 5000);
      final resumed = resumeClock(state, 'white', 10000);

      expect(resumed.white.isRunning, isTrue);
      expect(resumed.activePlayer, equals('white'));
    });
  });

  group('Clock - isTimeExpired', () {
    test('returns false when time remains', () {
      final state = createClockState(fischerConfig);
      expect(isTimeExpired(state, 'white'), isFalse);
    });

    test('returns true when time is 0', () {
      var state = createClockState(fischerConfig);
      state = startClock(state, 'white', 0);
      state = tickClock(state, 999999999);
      expect(isTimeExpired(state, 'white'), isTrue);
    });
  });

  group('Clock - isLowTime', () {
    test('returns false when time is sufficient', () {
      final state = createClockState(fischerConfig);
      expect(isLowTime(state, 'white'), isFalse);
    });

    test('returns true below threshold', () {
      final state = createClockState(const ClockConfig(
        format: ClockFormat.countdown,
        baseTimeMs: 25000,
        incrementMs: 0,
      ));
      expect(isLowTime(state, 'white'), isTrue);
    });

    test('returns false when time is 0 (expired, not low)', () {
      var state = createClockState(fischerConfig);
      state = startClock(state, 'white', 0);
      state = tickClock(state, 999999999);
      expect(isLowTime(state, 'white'), isFalse);
    });
  });

  group('Clock - formatTime', () {
    test('formats 5 minutes as "5:00"', () {
      expect(formatTime(5 * 60 * 1000), equals('5:00'));
    });

    test('formats 1:05 as "1:05"', () {
      expect(formatTime(65 * 1000), equals('1:05'));
    });

    test('formats 59.3 seconds as "59.3"', () {
      expect(formatTime(59300), equals('59.3'));
    });

    test('formats 0 as "0:00"', () {
      expect(formatTime(0), equals('0:00'));
    });

    test('formats negative as "0:00"', () {
      expect(formatTime(-1000), equals('0:00'));
    });

    test('formats 10.0 seconds as "10.0"', () {
      expect(formatTime(10000), equals('10.0'));
    });
  });

  group('Clock - serialization', () {
    test('serialization preserves remaining times', () {
      var state = createClockState(fischerConfig);
      state = startClock(state, 'white', 0);
      final serialized = serializeClockState(state, 5000);

      expect(serialized.white.remainingMs, equals(295000));
      expect(serialized.white.isRunning, isFalse);
      expect(serialized.activePlayer, isNull);
    });

    test('deserialization returns paused state', () {
      const data = ClockState(
        config: fischerConfig,
        white: PlayerClockState(
          remainingMs: 250000,
          isRunning: true,
          lastStartedAt: 12345,
        ),
        black: PlayerClockState(
          remainingMs: 300000,
          isRunning: false,
          lastStartedAt: null,
        ),
        activePlayer: 'white',
        isStarted: true,
      );
      final restored = deserializeClockState(data);
      expect(restored.white.isRunning, isFalse);
      expect(restored.black.isRunning, isFalse);
      expect(restored.activePlayer, isNull);
      expect(restored.white.remainingMs, equals(250000));
    });
  });
}
