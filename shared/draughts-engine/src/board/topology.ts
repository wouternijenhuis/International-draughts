import { squareToCoordinate, coordinateToSquare, BoardCoordinate } from '../types/board';

/** The four diagonal directions */
export enum Direction {
  NorthEast = 'NE', // up-right (decreasing row, increasing col)
  NorthWest = 'NW', // up-left (decreasing row, decreasing col)
  SouthEast = 'SE', // down-right (increasing row, increasing col)
  SouthWest = 'SW', // down-left (increasing row, decreasing col)
}

/** Row/col deltas for each direction */
const DIRECTION_DELTAS: Record<Direction, { dRow: number; dCol: number }> = {
  [Direction.NorthEast]: { dRow: -1, dCol: 1 },
  [Direction.NorthWest]: { dRow: -1, dCol: -1 },
  [Direction.SouthEast]: { dRow: 1, dCol: 1 },
  [Direction.SouthWest]: { dRow: 1, dCol: -1 },
};

/** Forward directions for each color */
export const FORWARD_DIRECTIONS = {
  white: [Direction.SouthEast, Direction.SouthWest] as const,
  black: [Direction.NorthEast, Direction.NorthWest] as const,
};

export const ALL_DIRECTIONS = [Direction.NorthEast, Direction.NorthWest, Direction.SouthEast, Direction.SouthWest] as const;

/** Precomputed diagonal ray from a square in a given direction (ordered by distance) */
export type DiagonalRay = readonly number[];

/** For each square (1-50), the diagonal rays in each direction */
export interface SquareTopology {
  /** Adjacent square in each direction (null if at board edge) */
  readonly adjacent: Readonly<Record<Direction, number | null>>;
  /** Full diagonal ray in each direction (all squares, ordered by distance) */
  readonly rays: Readonly<Record<Direction, DiagonalRay>>;
}

/**
 * Computes the diagonal ray from a given coordinate in a direction.
 * Returns all FMJD square numbers along that diagonal (excluding the start square).
 */
function computeRay(start: BoardCoordinate, direction: Direction): number[] {
  const { dRow, dCol } = DIRECTION_DELTAS[direction];
  const ray: number[] = [];

  let row = start.row + dRow;
  let col = start.col + dCol;

  while (row >= 0 && row <= 9 && col >= 0 && col <= 9) {
    const sq = coordinateToSquare({ row, col });
    if (sq !== null) {
      ray.push(sq);
    }
    row += dRow;
    col += dCol;
  }

  return ray;
}

/** Precomputed topology for all 50 squares. Index 0 is unused. */
const TOPOLOGY: (SquareTopology | null)[] = new Array(51).fill(null);

// Build topology at module load
for (let sq = 1; sq <= 50; sq++) {
  const coord = squareToCoordinate(sq);
  const rays: Record<Direction, DiagonalRay> = {
    [Direction.NorthEast]: computeRay(coord, Direction.NorthEast),
    [Direction.NorthWest]: computeRay(coord, Direction.NorthWest),
    [Direction.SouthEast]: computeRay(coord, Direction.SouthEast),
    [Direction.SouthWest]: computeRay(coord, Direction.SouthWest),
  };

  const adjacent: Record<Direction, number | null> = {
    [Direction.NorthEast]: rays[Direction.NorthEast][0] ?? null,
    [Direction.NorthWest]: rays[Direction.NorthWest][0] ?? null,
    [Direction.SouthEast]: rays[Direction.SouthEast][0] ?? null,
    [Direction.SouthWest]: rays[Direction.SouthWest][0] ?? null,
  };

  TOPOLOGY[sq] = { adjacent, rays };
}

/**
 * Gets the precomputed topology for a square.
 * @throws if the square number is invalid
 */
export const getSquareTopology = (square: number): SquareTopology => {
  const topo = TOPOLOGY[square];
  if (!topo) {
    throw new Error(`Invalid square number: ${square}`);
  }
  return topo;
};

/**
 * Gets the adjacent square in a given direction.
 * Returns null if at the board edge.
 */
export const getAdjacentSquare = (square: number, direction: Direction): number | null => {
  return getSquareTopology(square).adjacent[direction];
};

/**
 * Gets the full diagonal ray from a square in a given direction.
 */
export const getDiagonalRay = (square: number, direction: Direction): DiagonalRay => {
  return getSquareTopology(square).rays[direction];
};

/** The promotion row for each color (the farthest row from start) */
export const PROMOTION_ROW = {
  white: 9, // Row 9 = squares 46-50
  black: 0, // Row 0 = squares 1-5
} as const;

/** Check if a square is on the promotion row for a given color */
export const isPromotionSquare = (square: number, color: 'white' | 'black'): boolean => {
  const coord = squareToCoordinate(square);
  return coord.row === PROMOTION_ROW[color];
};
