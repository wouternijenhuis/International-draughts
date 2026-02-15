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
    maxDepth: 2,
    timeLimitMs: 1000,
    noiseAmplitude: 200,
    blunderProbability: 0.30,
    blunderMargin: 250,
    evalFeatureScale: 0.0,
    useTranspositionTable: false,
    useKillerMoves: false,
  },
  medium: {
    name: 'Medium',
    maxDepth: 4,
    timeLimitMs: 2000,
    noiseAmplitude: 60,
    blunderProbability: 0.08,
    blunderMargin: 120,
    evalFeatureScale: 0.5,
    useTranspositionTable: false,
    useKillerMoves: false,
  },
  hard: {
    name: 'Hard',
    maxDepth: 6,
    timeLimitMs: 3000,
    noiseAmplitude: 15,
    blunderProbability: 0.02,
    blunderMargin: 50,
    evalFeatureScale: 1.0,
    useTranspositionTable: true,
    useKillerMoves: true,
  },
  expert: {
    name: 'Expert',
    maxDepth: 20,
    timeLimitMs: 5000,
    noiseAmplitude: 0,
    blunderProbability: 0,
    blunderMargin: 0,
    evalFeatureScale: 1.0,
    useTranspositionTable: false,
    useKillerMoves: false,
  },
};

/** Get difficulty config by name */
export const getDifficultyConfig = (name: string): DifficultyConfig | null =>
  DIFFICULTY_CONFIGS[name.toLowerCase()] ?? null;
