/// Difficulty configuration for AI.
class DifficultyConfig {
  /// Creates a difficulty configuration.
  const DifficultyConfig({
    required this.name,
    required this.maxDepth,
    required this.timeLimitMs,
    required this.noiseAmplitude,
    required this.blunderProbability,
    required this.blunderMargin,
    required this.evalFeatureScale,
    required this.useTranspositionTable,
    required this.useKillerMoves,
  });

  /// Display name.
  final String name;

  /// Maximum search depth (ply).
  final int maxDepth;

  /// Time limit per move in milliseconds.
  final int timeLimitMs;

  /// Evaluation noise amplitude — random perturbation applied to leaf-node evaluations during search.
  final double noiseAmplitude;

  /// Probability of making a deliberate blunder (0-1).
  final double blunderProbability;

  /// Score margin for blunder selection (evaluation units).
  final double blunderMargin;

  /// Scale factor for positional evaluation features (0.0 = material only, 1.0 = full positional).
  final double evalFeatureScale;

  /// Whether to use a transposition table for search.
  final bool useTranspositionTable;

  /// Whether to use killer move heuristic.
  final bool useKillerMoves;
}

/// Pre-configured difficulty levels.
const Map<String, DifficultyConfig> difficultyConfigs = {
  'easy': DifficultyConfig(
    name: 'Easy',
    maxDepth: 3,
    timeLimitMs: 1500,
    noiseAmplitude: 150,
    blunderProbability: 0.20,
    blunderMargin: 200,
    evalFeatureScale: 0.3,
    useTranspositionTable: false,
    useKillerMoves: false,
  ),
  'medium': DifficultyConfig(
    name: 'Medium',
    maxDepth: 5,
    timeLimitMs: 3000,
    noiseAmplitude: 40,
    blunderProbability: 0.05,
    blunderMargin: 80,
    evalFeatureScale: 0.7,
    useTranspositionTable: true,
    useKillerMoves: true,
  ),
  'hard': DifficultyConfig(
    name: 'Hard',
    maxDepth: 8,
    timeLimitMs: 5000,
    noiseAmplitude: 5,
    blunderProbability: 0.005,
    blunderMargin: 20,
    evalFeatureScale: 1.0,
    useTranspositionTable: true,
    useKillerMoves: true,
  ),
};

/// Get difficulty config by name.
DifficultyConfig? getDifficultyConfig(String name) =>
    difficultyConfigs[name.toLowerCase()];
