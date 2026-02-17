import { describe, it, expect } from 'vitest';
import {
  updateRating,
  applyRdDecay,
  formatConfidenceRange,
  createDefaultRating,
  isRatedGame,
  AI_RATINGS,
  Glicko2Rating,
  GameResult,
} from '../src/rating/glicko2';

describe('Glicko-2 Rating Engine', () => {
  describe('createDefaultRating', () => {
    it('creates rating with default values', () => {
      const rating = createDefaultRating();
      expect(rating.rating).toBe(1500);
      expect(rating.rd).toBe(350);
      expect(rating.volatility).toBe(0.06);
    });
  });

  describe('updateRating - Glickman test vectors', () => {
    // Test case from Glickman's paper (Section 5)
    // Player: rating=1500, RD=200, vol=0.06
    // Games: beat 1400/RD30, lost to 1550/RD100, lost to 1700/RD300
    it('matches Glickman paper example', () => {
      const player: Glicko2Rating = { rating: 1500, rd: 200, volatility: 0.06 };
      const results: GameResult[] = [
        { opponentRating: 1400, opponentRd: 30, score: 1.0 },
        { opponentRating: 1550, opponentRd: 100, score: 0.0 },
        { opponentRating: 1700, opponentRd: 300, score: 0.0 },
      ];

      const updated = updateRating(player, results);

      // Expected from Glickman's paper (approximate):
      // μ' ≈ -0.2069 → rating ≈ 1464.06
      // φ' ≈ 0.8722 → RD ≈ 151.52
      // σ' ≈ 0.05999
      expect(updated.rating).toBeCloseTo(1464.06, 0);
      expect(updated.rd).toBeCloseTo(151.52, 0);
      expect(updated.volatility).toBeCloseTo(0.05999, 3);
    });
  });

  describe('Rating changes with game results', () => {
    it('rating increases on win against lower-rated opponent', () => {
      const player: Glicko2Rating = { rating: 1500, rd: 100, volatility: 0.06 };
      const results: GameResult[] = [
        { opponentRating: 1200, opponentRd: 0, score: 1.0 },
      ];
      const updated = updateRating(player, results);
      expect(updated.rating).toBeGreaterThan(player.rating);
    });

    it('rating decreases on loss against lower-rated opponent', () => {
      const player: Glicko2Rating = { rating: 1500, rd: 100, volatility: 0.06 };
      const results: GameResult[] = [
        { opponentRating: 1200, opponentRd: 0, score: 0.0 },
      ];
      const updated = updateRating(player, results);
      expect(updated.rating).toBeLessThan(player.rating);
    });

    it('rating increases on win against higher-rated opponent', () => {
      const player: Glicko2Rating = { rating: 1500, rd: 100, volatility: 0.06 };
      const results: GameResult[] = [
        { opponentRating: 1800, opponentRd: 0, score: 1.0 },
      ];
      const updated = updateRating(player, results);
      expect(updated.rating).toBeGreaterThan(player.rating);
    });

    it('draw adjusts rating toward expected score', () => {
      // Player rated higher than opponent → expects to win → draw lowers rating
      const player: Glicko2Rating = { rating: 1700, rd: 100, volatility: 0.06 };
      const results: GameResult[] = [
        { opponentRating: 1200, opponentRd: 0, score: 0.5 },
      ];
      const updated = updateRating(player, results);
      expect(updated.rating).toBeLessThan(player.rating);
    });

    it('RD decreases after playing games', () => {
      const player: Glicko2Rating = { rating: 1500, rd: 200, volatility: 0.06 };
      const results: GameResult[] = [
        { opponentRating: 1500, opponentRd: 50, score: 1.0 },
      ];
      const updated = updateRating(player, results);
      expect(updated.rd).toBeLessThan(player.rd);
    });

    it('higher RD leads to bigger rating swings', () => {
      const highRd: Glicko2Rating = { rating: 1500, rd: 300, volatility: 0.06 };
      const lowRd: Glicko2Rating = { rating: 1500, rd: 50, volatility: 0.06 };
      const results: GameResult[] = [
        { opponentRating: 1500, opponentRd: 50, score: 1.0 },
      ];
      const updatedHigh = updateRating(highRd, results);
      const updatedLow = updateRating(lowRd, results);
      const changeHigh = Math.abs(updatedHigh.rating - highRd.rating);
      const changeLow = Math.abs(updatedLow.rating - lowRd.rating);
      expect(changeHigh).toBeGreaterThan(changeLow);
    });
  });

  describe('No games played', () => {
    it('RD increases with no games', () => {
      const player: Glicko2Rating = { rating: 1500, rd: 200, volatility: 0.06 };
      const updated = updateRating(player, []);
      expect(updated.rd).toBeGreaterThan(player.rd);
      expect(updated.rating).toBe(player.rating);
    });
  });

  describe('applyRdDecay', () => {
    it('RD increases over inactive periods', () => {
      const player: Glicko2Rating = { rating: 1500, rd: 100, volatility: 0.06 };
      const decayed = applyRdDecay(player, 30);
      expect(decayed.rd).toBeGreaterThan(player.rd);
      expect(decayed.rating).toBe(player.rating);
    });

    it('RD is capped at maxRd (350)', () => {
      const player: Glicko2Rating = { rating: 1500, rd: 100, volatility: 0.06 };
      const decayed = applyRdDecay(player, 10000);
      expect(decayed.rd).toBeLessThanOrEqual(350);
    });

    it('no decay for 0 periods', () => {
      const player: Glicko2Rating = { rating: 1500, rd: 100, volatility: 0.06 };
      const decayed = applyRdDecay(player, 0);
      expect(decayed.rd).toBe(player.rd);
    });

    it('no decay for negative periods', () => {
      const player: Glicko2Rating = { rating: 1500, rd: 100, volatility: 0.06 };
      const decayed = applyRdDecay(player, -5);
      expect(decayed.rd).toBe(player.rd);
    });
  });

  describe('formatConfidenceRange', () => {
    it('formats correctly', () => {
      const rating: Glicko2Rating = { rating: 1620.3, rd: 43.5, volatility: 0.06 };
      expect(formatConfidenceRange(rating)).toBe('1620 ± 85');
    });

    it('handles default rating', () => {
      const rating = createDefaultRating();
      expect(formatConfidenceRange(rating)).toBe('1500 ± 686');
    });
  });

  describe('isRatedGame', () => {
    it('medium is rated', () => expect(isRatedGame('medium')).toBe(true));
    it('hard is rated', () => expect(isRatedGame('hard')).toBe(true));
    it('expert is rated', () => expect(isRatedGame('expert')).toBe(true));
    it('easy is not rated', () => expect(isRatedGame('easy')).toBe(false));
    it('local-pvp is not rated', () => expect(isRatedGame('local-pvp')).toBe(false));
    it('is case-insensitive', () => expect(isRatedGame('Medium')).toBe(true));
  });

  describe('AI ratings', () => {
    it('has all AI difficulties configured', () => {
      expect(AI_RATINGS.medium!.rating).toBe(1000);
      expect(AI_RATINGS.hard!.rating).toBe(1600);
      expect(AI_RATINGS.expert!.rating).toBe(2200);
      expect(AI_RATINGS.easy!.rating).toBe(500);
    });

    it('AI opponents have RD=0 (fully known)', () => {
      for (const key of Object.keys(AI_RATINGS)) {
        expect(AI_RATINGS[key]!.rd).toBe(0);
      }
    });
  });

  describe('Multiple games in one period', () => {
    it('handles multiple results correctly', () => {
      const player: Glicko2Rating = { rating: 1500, rd: 200, volatility: 0.06 };
      const results: GameResult[] = [
        { opponentRating: 1400, opponentRd: 50, score: 1.0 },
        { opponentRating: 1500, opponentRd: 50, score: 1.0 },
        { opponentRating: 1600, opponentRd: 50, score: 0.0 },
      ];
      const updated = updateRating(player, results);
      // 2 wins + 1 loss → rating should increase slightly
      expect(updated.rating).toBeGreaterThan(player.rating);
      expect(updated.rd).toBeLessThan(player.rd);
    });
  });

  describe('Edge cases', () => {
    it('very high RD player beats very low RD opponent', () => {
      const player: Glicko2Rating = { rating: 1500, rd: 350, volatility: 0.06 };
      const results: GameResult[] = [
        { opponentRating: 1000, opponentRd: 30, score: 1.0 },
      ];
      const updated = updateRating(player, results);
      expect(updated.rating).toBeGreaterThan(player.rating);
      expect(updated.rd).toBeLessThan(player.rd);
    });
  });
});
