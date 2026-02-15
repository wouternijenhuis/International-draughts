/**
 * ArrayBuffer-based transposition table for alpha-beta search.
 * Fixed-size with replace-always policy. Uses 32-bit Zobrist hashes.
 *
 * Memory layout per entry (20 bytes):
 *   [0-3]   hash (uint32)
 *   [4-7]   score (int32)
 *   [8]     depth (uint8)
 *   [9]     type (uint8): 0=exact, 1=lowerBound, 2=upperBound
 *   [10-11] bestMoveIndex (int16, -1 = none)
 *   [12-15] padding (unused, for alignment)
 *
 * Total entry size: 16 bytes (aligned)
 */

/** Transposition table entry types */
export const enum TtEntryType {
  Exact = 0,
  LowerBound = 1,
  UpperBound = 2,
}

/** Transposition table entry */
export interface TtEntry {
  readonly hash: number;
  readonly score: number;
  readonly depth: number;
  readonly type: TtEntryType;
  readonly bestMoveIndex: number;
}

/** Entry size in bytes (aligned to 16 for cache performance) */
const ENTRY_SIZE = 16;

/** Offsets within each entry */
const OFFSET_HASH = 0;
const OFFSET_SCORE = 4;
const OFFSET_DEPTH = 8;
const OFFSET_TYPE = 9;
const OFFSET_BEST_MOVE = 10;

/**
 * Fixed-size transposition table backed by an ArrayBuffer.
 * Replace-always policy with hash-based indexing.
 */
export class TranspositionTable {
  private readonly buffer: ArrayBuffer;
  private readonly view: DataView;
  private readonly numEntries: number;

  /**
   * Creates a transposition table with approximately the given size in MB.
   * @param sizeMb - Table size in megabytes (default 4)
   */
  constructor(sizeMb: number = 4) {
    const sizeBytes = sizeMb * 1024 * 1024;
    this.numEntries = Math.floor(sizeBytes / ENTRY_SIZE);
    this.buffer = new ArrayBuffer(this.numEntries * ENTRY_SIZE);
    this.view = new DataView(this.buffer);
  }

  /** Returns the number of entries in the table. */
  get size(): number {
    return this.numEntries;
  }

  /**
   * Probes the table for an entry matching the given hash.
   * @returns The entry if found and hash matches, or null.
   */
  probe(hash: number): TtEntry | null {
    const index = (hash >>> 0) % this.numEntries;
    const offset = index * ENTRY_SIZE;

    const storedHash = this.view.getUint32(offset + OFFSET_HASH, true);
    if (storedHash !== (hash >>> 0)) return null;

    return {
      hash: storedHash,
      score: this.view.getInt32(offset + OFFSET_SCORE, true),
      depth: this.view.getUint8(offset + OFFSET_DEPTH),
      type: this.view.getUint8(offset + OFFSET_TYPE) as TtEntryType,
      bestMoveIndex: this.view.getInt16(offset + OFFSET_BEST_MOVE, true),
    };
  }

  /**
   * Stores an entry in the table (replace-always policy).
   */
  store(hash: number, score: number, depth: number, type: TtEntryType, bestMoveIndex: number): void {
    const index = (hash >>> 0) % this.numEntries;
    const offset = index * ENTRY_SIZE;

    this.view.setUint32(offset + OFFSET_HASH, hash >>> 0, true);
    this.view.setInt32(offset + OFFSET_SCORE, score, true);
    this.view.setUint8(offset + OFFSET_DEPTH, depth);
    this.view.setUint8(offset + OFFSET_TYPE, type);
    this.view.setInt16(offset + OFFSET_BEST_MOVE, bestMoveIndex, true);
  }

  /**
   * Clears all entries in the table.
   */
  clear(): void {
    new Uint8Array(this.buffer).fill(0);
  }
}
