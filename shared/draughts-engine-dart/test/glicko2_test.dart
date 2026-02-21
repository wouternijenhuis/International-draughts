import 'package:draughts_engine/draughts_engine.dart';
import 'package:test/test.dart';

void main() {
  group('Glicko-2 Rating Engine', () {
    group('createDefaultRating', () {
      test('creates rating with default values', () {
        final rating = createDefaultRating();
        expect(rating.rating, equals(1500));
        expect(rating.rd, equals(350));
        expect(rating.volatility, equals(0.06));
      });
    });

    group('updateRating - Glickman test vectors', () {
      // Test case from Glickman's paper (Section 5)
      // Player: rating=1500, RD=200, vol=0.06
      // Games: beat 1400/RD30, lost to 1550/RD100, lost to 1700/RD300
      test('matches Glickman paper example', () {
        const player = Glicko2Rating(
          rating: 1500,
          rd: 200,
          volatility: 0.06,
        );
        final results = [
          const GameResult(opponentRating: 1400, opponentRd: 30, score: 1.0),
          const GameResult(opponentRating: 1550, opponentRd: 100, score: 0.0),
          const GameResult(opponentRating: 1700, opponentRd: 300, score: 0.0),
        ];

        final updated = updateRating(player, results);

        // Expected from Glickman's paper (approximate):
        // μ' ≈ -0.2069 → rating ≈ 1464.06
        // φ' ≈ 0.8722 → RD ≈ 151.52
        // σ' ≈ 0.05999
        expect(updated.rating, closeTo(1464.06, 1));
        expect(updated.rd, closeTo(151.52, 1));
        expect(updated.volatility, closeTo(0.05999, 0.001));
      });
    });

    group('Rating changes with game results', () {
      test('rating increases on win against lower-rated opponent', () {
        const player = Glicko2Rating(
          rating: 1500,
          rd: 100,
          volatility: 0.06,
        );
        final results = [
          const GameResult(opponentRating: 1200, opponentRd: 0, score: 1.0),
        ];
        final updated = updateRating(player, results);
        expect(updated.rating, greaterThan(player.rating));
      });

      test('rating decreases on loss against lower-rated opponent', () {
        const player = Glicko2Rating(
          rating: 1500,
          rd: 100,
          volatility: 0.06,
        );
        final results = [
          const GameResult(opponentRating: 1200, opponentRd: 0, score: 0.0),
        ];
        final updated = updateRating(player, results);
        expect(updated.rating, lessThan(player.rating));
      });

      test('rating increases on win against higher-rated opponent', () {
        const player = Glicko2Rating(
          rating: 1500,
          rd: 100,
          volatility: 0.06,
        );
        final results = [
          const GameResult(opponentRating: 1800, opponentRd: 0, score: 1.0),
        ];
        final updated = updateRating(player, results);
        expect(updated.rating, greaterThan(player.rating));
      });

      test('draw adjusts rating toward expected score', () {
        // Player rated higher than opponent → expects to win → draw lowers rating
        const player = Glicko2Rating(
          rating: 1700,
          rd: 100,
          volatility: 0.06,
        );
        final results = [
          const GameResult(opponentRating: 1200, opponentRd: 0, score: 0.5),
        ];
        final updated = updateRating(player, results);
        expect(updated.rating, lessThan(player.rating));
      });

      test('RD decreases after playing games', () {
        const player = Glicko2Rating(
          rating: 1500,
          rd: 200,
          volatility: 0.06,
        );
        final results = [
          const GameResult(opponentRating: 1500, opponentRd: 50, score: 1.0),
        ];
        final updated = updateRating(player, results);
        expect(updated.rd, lessThan(player.rd));
      });

      test('higher RD leads to bigger rating swings', () {
        const highRd = Glicko2Rating(
          rating: 1500,
          rd: 300,
          volatility: 0.06,
        );
        const lowRd = Glicko2Rating(
          rating: 1500,
          rd: 50,
          volatility: 0.06,
        );
        final results = [
          const GameResult(opponentRating: 1500, opponentRd: 50, score: 1.0),
        ];
        final updatedHigh = updateRating(highRd, results);
        final updatedLow = updateRating(lowRd, results);
        final changeHigh = (updatedHigh.rating - highRd.rating).abs();
        final changeLow = (updatedLow.rating - lowRd.rating).abs();
        expect(changeHigh, greaterThan(changeLow));
      });
    });

    group('No games played', () {
      test('RD increases with no games', () {
        const player = Glicko2Rating(
          rating: 1500,
          rd: 200,
          volatility: 0.06,
        );
        final updated = updateRating(player, []);
        expect(updated.rd, greaterThan(player.rd));
        expect(updated.rating, equals(player.rating));
      });
    });

    group('applyRdDecay', () {
      test('RD increases over inactive periods', () {
        const player = Glicko2Rating(
          rating: 1500,
          rd: 100,
          volatility: 0.06,
        );
        final decayed = applyRdDecay(player, 30);
        expect(decayed.rd, greaterThan(player.rd));
        expect(decayed.rating, equals(player.rating));
      });

      test('RD is capped at maxRd (350)', () {
        const player = Glicko2Rating(
          rating: 1500,
          rd: 100,
          volatility: 0.06,
        );
        final decayed = applyRdDecay(player, 10000);
        expect(decayed.rd, lessThanOrEqualTo(350));
      });

      test('no decay for 0 periods', () {
        const player = Glicko2Rating(
          rating: 1500,
          rd: 100,
          volatility: 0.06,
        );
        final decayed = applyRdDecay(player, 0);
        expect(decayed.rd, equals(player.rd));
      });

      test('no decay for negative periods', () {
        const player = Glicko2Rating(
          rating: 1500,
          rd: 100,
          volatility: 0.06,
        );
        final decayed = applyRdDecay(player, -5);
        expect(decayed.rd, equals(player.rd));
      });
    });

    group('formatConfidenceRange', () {
      test('formats correctly', () {
        const rating = Glicko2Rating(
          rating: 1620.3,
          rd: 43.5,
          volatility: 0.06,
        );
        expect(formatConfidenceRange(rating), equals('1620 ± 85'));
      });

      test('handles default rating', () {
        final rating = createDefaultRating();
        expect(formatConfidenceRange(rating), equals('1500 ± 686'));
      });
    });

    group('isRatedGame', () {
      test('medium is rated', () => expect(isRatedGame('medium'), isTrue));
      test('hard is rated', () => expect(isRatedGame('hard'), isTrue));
      test('expert is rated', () => expect(isRatedGame('expert'), isTrue));
      test('easy is not rated', () => expect(isRatedGame('easy'), isFalse));
      test('local-pvp is not rated',
          () => expect(isRatedGame('local-pvp'), isFalse));
      test('is case-insensitive',
          () => expect(isRatedGame('Medium'), isTrue));
    });

    group('AI ratings', () {
      test('has all AI difficulties configured', () {
        expect(aiRatings['medium']!.rating, equals(1000));
        expect(aiRatings['hard']!.rating, equals(1600));
        expect(aiRatings['expert']!.rating, equals(2200));
        expect(aiRatings['easy']!.rating, equals(500));
      });

      test('AI opponents have RD=0 (fully known)', () {
        for (final key in aiRatings.keys) {
          expect(aiRatings[key]!.rd, equals(0));
        }
      });
    });

    group('Multiple games in one period', () {
      test('handles multiple results correctly', () {
        const player = Glicko2Rating(
          rating: 1500,
          rd: 200,
          volatility: 0.06,
        );
        final results = [
          const GameResult(opponentRating: 1400, opponentRd: 50, score: 1.0),
          const GameResult(opponentRating: 1500, opponentRd: 50, score: 1.0),
          const GameResult(opponentRating: 1600, opponentRd: 50, score: 0.0),
        ];
        final updated = updateRating(player, results);
        // 2 wins + 1 loss → rating should increase slightly
        expect(updated.rating, greaterThan(player.rating));
        expect(updated.rd, lessThan(player.rd));
      });
    });

    group('Edge cases', () {
      test('very high RD player beats very low RD opponent', () {
        const player = Glicko2Rating(
          rating: 1500,
          rd: 350,
          volatility: 0.06,
        );
        final results = [
          const GameResult(opponentRating: 1000, opponentRd: 30, score: 1.0),
        ];
        final updated = updateRating(player, results);
        expect(updated.rating, greaterThan(player.rating));
        expect(updated.rd, lessThan(player.rd));
      });
    });
  });
}
