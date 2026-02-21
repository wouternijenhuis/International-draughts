import 'dart:math';

/// Glicko-2 Rating System Implementation.
///
/// Based on Mark Glickman's specification:
/// http://www.glicko.net/glicko/glicko2.pdf

/// Glicko-2 rating parameters.
class Glicko2Rating {
  /// Creates a Glicko-2 rating.
  const Glicko2Rating({
    required this.rating,
    required this.rd,
    required this.volatility,
  });

  /// Glicko-1 scale rating (default 1500).
  final double rating;

  /// Glicko-1 scale rating deviation (default 350).
  final double rd;

  /// Volatility (default 0.06).
  final double volatility;
}

/// A single game result for rating calculation.
class GameResult {
  /// Creates a game result.
  const GameResult({
    required this.opponentRating,
    required this.opponentRd,
    required this.score,
  });

  /// Opponent's rating (Glicko-1 scale).
  final double opponentRating;

  /// Opponent's RD (Glicko-1 scale).
  final double opponentRd;

  /// Score: 1.0 = win, 0.5 = draw, 0.0 = loss.
  final double score;
}

/// Configuration for the Glicko-2 system.
class Glicko2Config {
  /// Creates a Glicko-2 configuration.
  const Glicko2Config({
    required this.tau,
    required this.epsilon,
    required this.maxRd,
    required this.defaultRating,
    required this.defaultRd,
    required this.defaultVolatility,
  });

  /// System constant τ (constrains volatility change). Default 0.5.
  final double tau;

  /// Convergence tolerance for volatility iteration. Default 0.000001.
  final double epsilon;

  /// Maximum RD value (cap). Default 350.
  final double maxRd;

  /// Default rating for new players. Default 1500.
  final double defaultRating;

  /// Default RD for new players. Default 350.
  final double defaultRd;

  /// Default volatility for new players. Default 0.06.
  final double defaultVolatility;
}

/// AI opponent ratings (pre-configured, RD=0).
const Map<String, ({double rating, double rd})> aiRatings = {
  'easy': (rating: 500, rd: 0),
  'medium': (rating: 1000, rd: 0),
  'hard': (rating: 1600, rd: 0),
  'expert': (rating: 2200, rd: 0),
};

/// Glicko-2 scaling constant.
const double _glicko2Scale = 173.7178;

/// Default Glicko-2 configuration.
const Glicko2Config defaultConfig = Glicko2Config(
  tau: 0.5,
  epsilon: 0.000001,
  maxRd: 350,
  defaultRating: 1500,
  defaultRd: 350,
  defaultVolatility: 0.06,
);

/// Creates a new default rating.
Glicko2Rating createDefaultRating([Glicko2Config config = defaultConfig]) =>
    Glicko2Rating(
      rating: config.defaultRating,
      rd: config.defaultRd,
      volatility: config.defaultVolatility,
    );

// -- Internal conversion functions --

/// Convert Glicko-1 rating to Glicko-2 scale (μ).
double _toGlicko2Rating(double rating) => (rating - 1500) / _glicko2Scale;

/// Convert Glicko-2 rating back to Glicko-1 scale.
double _fromGlicko2Rating(double mu) => mu * _glicko2Scale + 1500;

/// Convert Glicko-1 RD to Glicko-2 scale (φ).
double _toGlicko2Rd(double rd) => rd / _glicko2Scale;

/// Convert Glicko-2 RD back to Glicko-1 scale.
double _fromGlicko2Rd(double phi) => phi * _glicko2Scale;

/// g(φ) function.
double _g(double phi) => 1 / sqrt(1 + 3 * phi * phi / (pi * pi));

/// E(μ, μj, φj) - expected score.
double _e(double mu, double muJ, double phiJ) =>
    1 / (1 + exp(-_g(phiJ) * (mu - muJ)));

/// Compute the estimated variance (v) of the player's rating
/// based on game outcomes.
double _computeVariance(
  double mu,
  List<({double muJ, double phiJ, double score})> results,
) {
  var sum = 0.0;
  for (final r in results) {
    final gPhiJ = _g(r.phiJ);
    final eVal = _e(mu, r.muJ, r.phiJ);
    sum += gPhiJ * gPhiJ * eVal * (1 - eVal);
  }
  return 1 / sum;
}

/// Compute the estimated improvement (Δ) in rating.
double _computeDelta(
  double mu,
  double v,
  List<({double muJ, double phiJ, double score})> results,
) {
  var sum = 0.0;
  for (final r in results) {
    sum += _g(r.phiJ) * (r.score - _e(mu, r.muJ, r.phiJ));
  }
  return v * sum;
}

/// Compute new volatility (σ') using the Illinois algorithm
/// to solve the equation f(x) = 0.
double _computeNewVolatility(
  double phi,
  double v,
  double delta,
  double sigma,
  double tau,
  double epsilon,
) {
  final a = log(sigma * sigma);
  final phiSq = phi * phi;
  final deltaSq = delta * delta;

  double f(double x) {
    final ex = exp(x);
    final denom = 2 * (phiSq + v + ex) * (phiSq + v + ex);
    return (ex * (deltaSq - phiSq - v - ex)) / denom - (x - a) / (tau * tau);
  }

  // Set initial values of A and B
  var aa = a;
  double bb;

  if (deltaSq > phiSq + v) {
    bb = log(deltaSq - phiSq - v);
  } else {
    var k = 1;
    while (f(a - k * tau) < 0) {
      k++;
    }
    bb = a - k * tau;
  }

  // Iterative algorithm
  var fA = f(aa);
  var fB = f(bb);

  while ((bb - aa).abs() > epsilon) {
    final cc = aa + ((aa - bb) * fA) / (fB - fA);
    final fC = f(cc);

    if (fC * fB <= 0) {
      aa = bb;
      fA = fB;
    } else {
      fA = fA / 2;
    }

    bb = cc;
    fB = fC;
  }

  return exp(aa / 2);
}

/// Updates a player's Glicko-2 rating based on game results in a rating period.
///
/// [current] is the player's current rating.
/// [results] is the array of game results in this rating period.
/// [config] is the Glicko-2 system configuration.
/// Returns the updated rating.
Glicko2Rating updateRating(
  Glicko2Rating current,
  List<GameResult> results, [
  Glicko2Config config = defaultConfig,
]) {
  // Step 1: Determine initial values
  final mu = _toGlicko2Rating(current.rating);
  final phi = _toGlicko2Rd(current.rd);
  final sigma = current.volatility;

  // Step 2: If no games played, only increase RD for inactivity
  if (results.isEmpty) {
    final newPhi = sqrt(phi * phi + sigma * sigma);
    final newRd = min(_fromGlicko2Rd(newPhi), config.maxRd);
    return Glicko2Rating(
      rating: current.rating,
      rd: newRd,
      volatility: sigma,
    );
  }

  // Convert opponent data to Glicko-2 scale
  final glicko2Results = results
      .map((r) => (
            muJ: _toGlicko2Rating(r.opponentRating),
            phiJ: _toGlicko2Rd(r.opponentRd),
            score: r.score,
          ))
      .toList();

  // Step 3: Compute estimated variance (v)
  final v = _computeVariance(mu, glicko2Results);

  // Step 4: Compute estimated improvement (Δ)
  final delta = _computeDelta(mu, v, glicko2Results);

  // Step 5: Compute new volatility (σ')
  final newSigma = _computeNewVolatility(
    phi,
    v,
    delta,
    sigma,
    config.tau,
    config.epsilon,
  );

  // Step 6: Update RD to new pre-rating period value (φ*)
  final phiStar = sqrt(phi * phi + newSigma * newSigma);

  // Step 7: Update rating and RD
  final newPhi = 1 / sqrt(1 / (phiStar * phiStar) + 1 / v);
  var newMu = mu;
  for (final r in glicko2Results) {
    newMu += newPhi * newPhi * _g(r.phiJ) * (r.score - _e(mu, r.muJ, r.phiJ));
  }

  // Convert back to Glicko-1 scale and cap RD
  final newRating = _fromGlicko2Rating(newMu);
  final newRd = min(_fromGlicko2Rd(newPhi), config.maxRd);

  return Glicko2Rating(
    rating: newRating,
    rd: newRd,
    volatility: newSigma,
  );
}

/// Applies RD decay for N inactive rating periods.
///
/// RD increases over time when the player doesn't play, reflecting growing uncertainty.
///
/// [current] is the current rating.
/// [periods] is the number of inactive rating periods (days).
/// [config] is the Glicko-2 system configuration.
/// Returns the rating with increased RD.
Glicko2Rating applyRdDecay(
  Glicko2Rating current,
  int periods, [
  Glicko2Config config = defaultConfig,
]) {
  if (periods <= 0) return current;

  final phi = _toGlicko2Rd(current.rd);
  final sigma = current.volatility;

  // Apply decay for each period: φ* = sqrt(φ² + σ²) per period
  var newPhi = phi;
  for (var i = 0; i < periods; i++) {
    newPhi = sqrt(newPhi * newPhi + sigma * sigma);
  }

  final newRd = min(_fromGlicko2Rd(newPhi), config.maxRd);

  return Glicko2Rating(
    rating: current.rating,
    rd: newRd,
    volatility: current.volatility,
  );
}

/// Formats the rating display with confidence range.
///
/// Display: "rating ± (1.96 × RD)" rounded to integers.
String formatConfidenceRange(Glicko2Rating rating) {
  final ratingRounded = rating.rating.round();
  final margin = (1.96 * rating.rd).round();
  return '$ratingRounded ± $margin';
}

/// Determines if a game result should affect rating (only Medium/Hard/Expert PvC).
bool isRatedGame(String difficulty) {
  const rated = ['medium', 'hard', 'expert'];
  return rated.contains(difficulty.toLowerCase());
}
