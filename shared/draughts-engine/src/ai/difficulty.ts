/** Difficulty configuration for AI */
export interface DifficultyConfig {
  /** Display name */
  readonly name: string;
  /** Maximum search depth (ply) */
  readonly maxDepth: number;
  /** Time limit per move in milliseconds */
  readonly timeLimitMs: number;
  /** Evaluation noise amplitude — random value added to scores */
  readonly noiseAmplitude: number;
  /** Probability of making a deliberate blunder (0-1) */
  readonly blunderProbability: number;
  /** Score margin for blunder selection (centipawns) */
  readonly blunderMargin: number;
}

/** Pre-configured difficulty levels */
export const DIFFICULTY_CONFIGS: Record<string, DifficultyConfig> = {
  easy: {
    name: 'Easy',
    maxDepth: 2,
    timeLimitMs: 1000,
    noiseAmplitude: 150,
    blunderProbability: 0.35,
    blunderMargin: 200,
  },
  medium: {
    name: 'Medium',
    maxDepth: 5,
    timeLimitMs: 1500,
    noiseAmplitude: 50,
    blunderProbability: 0.10,
    blunderMargin: 100,
  },
  hard: {
    name: 'Hard',
    maxDepth: 8,
    timeLimitMs: 2000,
    noiseAmplitude: 0,
    blunderProbability: 0,
    blunderMargin: 0,
  },
};

/** Get difficulty config by name */
export const getDifficultyConfig = (name: string): DifficultyConfig | null =>
  DIFFICULTY_CONFIGS[name.toLowerCase()] ?? null;
