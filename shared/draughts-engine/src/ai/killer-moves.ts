/**
 * Killer move heuristic for alpha-beta search.
 * Stores non-capture moves that caused beta cutoffs, used for move ordering.
 * Two slots per depth, up to MAX_DEPTH.
 */

/** Maximum supported search depth */
const MAX_DEPTH = 64;

/** Number of killer move slots per depth */
const NUM_SLOTS = 2;

/**
 * Killer move table.
 * Stores move indices (into the legal moves array) that caused beta cutoffs.
 * Used to improve move ordering in non-capture positions.
 */
export class KillerMoves {
  /** [depth][slot] → move signature (from_square * 100 + to_square) */
  private readonly table: Int32Array;

  constructor() {
    this.table = new Int32Array(MAX_DEPTH * NUM_SLOTS).fill(-1);
  }

  /**
   * Records a killer move at the given depth.
   * Shifts existing killer to slot 1, stores new killer in slot 0.
   * @param depth - Search depth
   * @param moveSignature - Unique move identifier (fromSquare * 100 + toSquare)
   */
  store(depth: number, moveSignature: number): void {
    if (depth >= MAX_DEPTH) return;
    const base = depth * NUM_SLOTS;

    // Don't store duplicates
    if (this.table[base] === moveSignature) return;

    // Shift slot 0 → slot 1, store new in slot 0
    this.table[base + 1] = this.table[base]!;
    this.table[base] = moveSignature;
  }

  /**
   * Checks if a move matches a killer move at the given depth.
   * @returns Priority score (400000 for slot 0, 399000 for slot 1, 0 if not a killer)
   */
  getScore(depth: number, moveSignature: number): number {
    if (depth >= MAX_DEPTH) return 0;
    const base = depth * NUM_SLOTS;

    if (this.table[base] === moveSignature) return 400_000;
    if (this.table[base + 1] === moveSignature) return 399_000;
    return 0;
  }

  /**
   * Computes a unique signature for a move based on its start and end squares.
   * @param fromSquare - Origin square (1-50)
   * @param toSquare - Destination square (1-50)
   */
  static signature(fromSquare: number, toSquare: number): number {
    return fromSquare * 100 + toSquare;
  }

  /** Clears all stored killer moves. */
  clear(): void {
    this.table.fill(-1);
  }
}
