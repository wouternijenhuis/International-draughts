/**
 * Glicko-2 Rating System Implementation
 * Based on Mark Glickman's specification:
 * http://www.glicko.net/glicko/glicko2.pdf
 */

/** Glicko-2 rating parameters */
export interface Glicko2Rating {
  /** Glicko-1 scale rating (default 1500) */
  readonly rating: number;
  /** Glicko-1 scale rating deviation (default 350) */
  readonly rd: number;
  /** Volatility (default 0.06) */
  readonly volatility: number;
}

/** A single game result for rating calculation */
export interface GameResult {
  /** Opponent's rating (Glicko-1 scale) */
  readonly opponentRating: number;
  /** Opponent's RD (Glicko-1 scale) */
  readonly opponentRd: number;
  /** Score: 1.0 = win, 0.5 = draw, 0.0 = loss */
  readonly score: number;
}

/** Configuration for the Glicko-2 system */
export interface Glicko2Config {
  /** System constant τ (constrains volatility change). Default 0.5 */
  readonly tau: number;
  /** Convergence tolerance for volatility iteration. Default 0.000001 */
  readonly epsilon: number;
  /** Maximum RD value (cap). Default 350 */
  readonly maxRd: number;
  /** Default rating for new players. Default 1500 */
  readonly defaultRating: number;
  /** Default RD for new players. Default 350 */
  readonly defaultRd: number;
  /** Default volatility for new players. Default 0.06 */
  readonly defaultVolatility: number;
}

/** AI opponent ratings (pre-configured, RD=0) */
export const AI_RATINGS: Record<string, { rating: number; rd: number }> = {
  easy: { rating: 500, rd: 0 },
  medium: { rating: 1000, rd: 0 },
  hard: { rating: 1600, rd: 0 },
  expert: { rating: 2200, rd: 0 },
};

// Glicko-2 scaling constant
const GLICKO2_SCALE = 173.7178;

/** Default Glicko-2 configuration */
export const DEFAULT_CONFIG: Glicko2Config = {
  tau: 0.5,
  epsilon: 0.000001,
  maxRd: 350,
  defaultRating: 1500,
  defaultRd: 350,
  defaultVolatility: 0.06,
};

/** Creates a new default rating */
export const createDefaultRating = (config: Glicko2Config = DEFAULT_CONFIG): Glicko2Rating => ({
  rating: config.defaultRating,
  rd: config.defaultRd,
  volatility: config.defaultVolatility,
});

// -- Internal conversion functions --

/** Convert Glicko-1 rating to Glicko-2 scale (μ) */
const toGlicko2Rating = (rating: number): number =>
  (rating - 1500) / GLICKO2_SCALE;

/** Convert Glicko-2 rating back to Glicko-1 scale */
const fromGlicko2Rating = (mu: number): number =>
  mu * GLICKO2_SCALE + 1500;

/** Convert Glicko-1 RD to Glicko-2 scale (φ) */
const toGlicko2Rd = (rd: number): number =>
  rd / GLICKO2_SCALE;

/** Convert Glicko-2 RD back to Glicko-1 scale */
const fromGlicko2Rd = (phi: number): number =>
  phi * GLICKO2_SCALE;

/** g(φ) function */
const g = (phi: number): number =>
  1 / Math.sqrt(1 + 3 * phi * phi / (Math.PI * Math.PI));

/** E(μ, μj, φj) - expected score */
const E = (mu: number, muJ: number, phiJ: number): number =>
  1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));

/**
 * Compute the estimated variance (v) of the player's rating
 * based on game outcomes.
 */
const computeVariance = (
  mu: number,
  results: { muJ: number; phiJ: number; score: number }[],
): number => {
  let sum = 0;
  for (const r of results) {
    const gPhiJ = g(r.phiJ);
    const eVal = E(mu, r.muJ, r.phiJ);
    sum += gPhiJ * gPhiJ * eVal * (1 - eVal);
  }
  return 1 / sum;
};

/**
 * Compute the estimated improvement (Δ) in rating.
 */
const computeDelta = (
  mu: number,
  v: number,
  results: { muJ: number; phiJ: number; score: number }[],
): number => {
  let sum = 0;
  for (const r of results) {
    sum += g(r.phiJ) * (r.score - E(mu, r.muJ, r.phiJ));
  }
  return v * sum;
};

/**
 * Compute new volatility (σ') using the Illinois algorithm
 * to solve the equation f(x) = 0.
 */
const computeNewVolatility = (
  phi: number,
  v: number,
  delta: number,
  sigma: number,
  tau: number,
  epsilon: number,
): number => {
  const a = Math.log(sigma * sigma);
  const phiSq = phi * phi;
  const deltaSq = delta * delta;

  const f = (x: number): number => {
    const ex = Math.exp(x);
    const denom = 2 * (phiSq + v + ex) * (phiSq + v + ex);
    return (
      (ex * (deltaSq - phiSq - v - ex)) / denom -
      (x - a) / (tau * tau)
    );
  };

  // Set initial values of A and B
  let A = a;
  let B: number;

  if (deltaSq > phiSq + v) {
    B = Math.log(deltaSq - phiSq - v);
  } else {
    let k = 1;
    while (f(a - k * tau) < 0) {
      k++;
    }
    B = a - k * tau;
  }

  // Iterative algorithm
  let fA = f(A);
  let fB = f(B);

  while (Math.abs(B - A) > epsilon) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);

    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA = fA / 2;
    }

    B = C;
    fB = fC;
  }

  return Math.exp(A / 2);
};

/**
 * Updates a player's Glicko-2 rating based on game results in a rating period.
 *
 * @param current - The player's current rating
 * @param results - Array of game results in this rating period
 * @param config - Glicko-2 system configuration
 * @returns Updated rating
 */
export const updateRating = (
  current: Glicko2Rating,
  results: readonly GameResult[],
  config: Glicko2Config = DEFAULT_CONFIG,
): Glicko2Rating => {
  // Step 1: Determine initial values
  const mu = toGlicko2Rating(current.rating);
  const phi = toGlicko2Rd(current.rd);
  const sigma = current.volatility;

  // Step 2: If no games played, only increase RD for inactivity
  if (results.length === 0) {
    const newPhi = Math.sqrt(phi * phi + sigma * sigma);
    const newRd = Math.min(fromGlicko2Rd(newPhi), config.maxRd);
    return {
      rating: current.rating,
      rd: newRd,
      volatility: sigma,
    };
  }

  // Convert opponent data to Glicko-2 scale
  const glicko2Results = results.map((r) => ({
    muJ: toGlicko2Rating(r.opponentRating),
    phiJ: toGlicko2Rd(r.opponentRd),
    score: r.score,
  }));

  // Step 3: Compute estimated variance (v)
  const v = computeVariance(mu, glicko2Results);

  // Step 4: Compute estimated improvement (Δ)
  const delta = computeDelta(mu, v, glicko2Results);

  // Step 5: Compute new volatility (σ')
  const newSigma = computeNewVolatility(phi, v, delta, sigma, config.tau, config.epsilon);

  // Step 6: Update RD to new pre-rating period value (φ*)
  const phiStar = Math.sqrt(phi * phi + newSigma * newSigma);

  // Step 7: Update rating and RD
  const newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  let newMu = mu;
  for (const r of glicko2Results) {
    newMu += newPhi * newPhi * g(r.phiJ) * (r.score - E(mu, r.muJ, r.phiJ));
  }

  // Convert back to Glicko-1 scale and cap RD
  const newRating = fromGlicko2Rating(newMu);
  const newRd = Math.min(fromGlicko2Rd(newPhi), config.maxRd);

  return {
    rating: newRating,
    rd: newRd,
    volatility: newSigma,
  };
};

/**
 * Applies RD decay for N inactive rating periods.
 * RD increases over time when the player doesn't play, reflecting growing uncertainty.
 *
 * @param current - Current rating
 * @param periods - Number of inactive rating periods (days)
 * @param config - Glicko-2 system configuration
 * @returns Rating with increased RD
 */
export const applyRdDecay = (
  current: Glicko2Rating,
  periods: number,
  config: Glicko2Config = DEFAULT_CONFIG,
): Glicko2Rating => {
  if (periods <= 0) return current;

  const phi = toGlicko2Rd(current.rd);
  const sigma = current.volatility;

  // Apply decay for each period: φ* = sqrt(φ² + σ²) per period
  let newPhi = phi;
  for (let i = 0; i < periods; i++) {
    newPhi = Math.sqrt(newPhi * newPhi + sigma * sigma);
  }

  const newRd = Math.min(fromGlicko2Rd(newPhi), config.maxRd);

  return {
    rating: current.rating,
    rd: newRd,
    volatility: current.volatility,
  };
};

/**
 * Formats the rating display with confidence range.
 * Display: "rating ± (1.96 × RD)" rounded to integers.
 *
 * @param rating - The Glicko-2 rating to format
 * @returns Display string like "1620 ± 85"
 */
export const formatConfidenceRange = (rating: Glicko2Rating): string => {
  const ratingRounded = Math.round(rating.rating);
  const margin = Math.round(1.96 * rating.rd);
  return `${ratingRounded} ± ${margin}`;
};

/**
 * Determines if a game result should affect rating (only Medium/Hard/Expert PvC).
 */
export const isRatedGame = (difficulty: string): boolean => {
  const rated = ['medium', 'hard', 'expert'];
  return rated.includes(difficulty.toLowerCase());
};
