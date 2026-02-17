/** Difficulty configuration for AI */
export interface DifficultyConfig {
  /** Display name */
  readonly name: string;
  /** Maximum search depth (ply) */
  readonly maxDepth: number;
  /** Time limit per move in milliseconds */
  readonly timeLimitMs: number;
  /** Evaluation noise amplitude — random perturbation applied to leaf-node evaluations during search */
  readonly noiseAmplitude: number;
  /** Probability of making a deliberate blunder (0-1) */
  readonly blunderProbability: number;
  /** Score margin for blunder selection (evaluation units) */
  readonly blunderMargin: number;
  /** Scale factor for positional evaluation features (0.0 = material only, 1.0 = full positional) */
  readonly evalFeatureScale: number;
  /** Whether to use a transposition table for search */
  readonly useTranspositionTable: boolean;
  /** Whether to use killer move heuristic */
  readonly useKillerMoves: boolean;
}

/** Pre-configured difficulty levels */
export const DIFFICULTY_CONFIGS: Record<string, DifficultyConfig> = {
  easy: {
    name: 'Easy',
    maxDepth: 3,
    timeLimitMs: 1500,
    noiseAmplitude: 150,
    blunderProbability: 0.20,
    blunderMargin: 200,
    evalFeatureScale: 0.3,
    useTranspositionTable: false,
    useKillerMoves: false,
  },
  medium: {
    name: 'Medium',
    maxDepth: 5,
    timeLimitMs: 3000,
    noiseAmplitude: 40,
    blunderProbability: 0.05,
    blunderMargin: 80,
    evalFeatureScale: 0.7,
    useTranspositionTable: true,
    useKillerMoves: true,
  },
  hard: {
    name: 'Hard',
    maxDepth: 8,
    timeLimitMs: 5000,
    noiseAmplitude: 5,
    blunderProbability: 0.005,
    blunderMargin: 20,
    evalFeatureScale: 1.0,
    useTranspositionTable: true,
    useKillerMoves: true,
  },
};

/** Get difficulty config by name */
export const getDifficultyConfig = (name: string): DifficultyConfig | null =>
  DIFFICULTY_CONFIGS[name.toLowerCase()] ?? null;
