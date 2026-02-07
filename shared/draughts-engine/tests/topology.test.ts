import { describe, it, expect } from 'vitest';
import {
  Direction,
  getSquareTopology,
  getAdjacentSquare,
  getDiagonalRay,
  isPromotionSquare,
  FORWARD_DIRECTIONS,
  ALL_DIRECTIONS,
} from '../src/board/topology';

describe('Board Topology', () => {
  describe('getSquareTopology', () => {
    it('should return topology for valid squares', () => {
      for (let sq = 1; sq <= 50; sq++) {
        const topo = getSquareTopology(sq);
        expect(topo).toBeDefined();
        expect(topo.adjacent).toBeDefined();
        expect(topo.rays).toBeDefined();
      }
    });

    it('should throw for invalid square 0', () => {
      expect(() => getSquareTopology(0)).toThrow();
    });

    it('should throw for invalid square 51', () => {
      expect(() => getSquareTopology(51)).toThrow();
    });
  });

  describe('Adjacent squares', () => {
    // Square 1 (row 0, col 1) - top-left area
    it('square 1: NE=null, NW=null (top edge), SE=7, SW=6', () => {
      expect(getAdjacentSquare(1, Direction.NorthEast)).toBeNull();
      expect(getAdjacentSquare(1, Direction.NorthWest)).toBeNull();
      expect(getAdjacentSquare(1, Direction.SouthEast)).toBe(7);
      expect(getAdjacentSquare(1, Direction.SouthWest)).toBe(6);
    });

    // Square 5 (row 0, col 9) - top-right corner
    it('square 5: NE=null, NW=null, SE=null (right edge), SW=10', () => {
      expect(getAdjacentSquare(5, Direction.NorthEast)).toBeNull();
      expect(getAdjacentSquare(5, Direction.NorthWest)).toBeNull();
      expect(getAdjacentSquare(5, Direction.SouthEast)).toBeNull();
      expect(getAdjacentSquare(5, Direction.SouthWest)).toBe(10);
    });

    // Square 6 (row 1, col 0) - left edge
    it('square 6: NE=1, NW=null (left edge), SE=11, SW=null (left edge)', () => {
      expect(getAdjacentSquare(6, Direction.NorthEast)).toBe(1);
      expect(getAdjacentSquare(6, Direction.NorthWest)).toBeNull();
      expect(getAdjacentSquare(6, Direction.SouthEast)).toBe(11);
      expect(getAdjacentSquare(6, Direction.SouthWest)).toBeNull();
    });

    // Square 28 (row 5, col 4) - center
    it('square 28: has all four neighbors', () => {
      expect(getAdjacentSquare(28, Direction.NorthEast)).toBe(23);
      expect(getAdjacentSquare(28, Direction.NorthWest)).toBe(22);
      expect(getAdjacentSquare(28, Direction.SouthEast)).toBe(33);
      expect(getAdjacentSquare(28, Direction.SouthWest)).toBe(32);
    });

    // Square 46 (row 9, col 0) - bottom-left corner
    it('square 46: SE=null, SW=null (bottom edge), NE=41, NW=null', () => {
      expect(getAdjacentSquare(46, Direction.SouthEast)).toBeNull();
      expect(getAdjacentSquare(46, Direction.SouthWest)).toBeNull();
      expect(getAdjacentSquare(46, Direction.NorthEast)).toBe(41);
      expect(getAdjacentSquare(46, Direction.NorthWest)).toBeNull();
    });

    // Square 50 (row 9, col 8) - bottom-right area
    it('square 50: SE=null, SW=null (bottom edge), NE=45, NW=44', () => {
      expect(getAdjacentSquare(50, Direction.SouthEast)).toBeNull();
      expect(getAdjacentSquare(50, Direction.SouthWest)).toBeNull();
      expect(getAdjacentSquare(50, Direction.NorthEast)).toBe(45);
      expect(getAdjacentSquare(50, Direction.NorthWest)).toBe(44);
    });
  });

  describe('Diagonal rays', () => {
    it('should return full diagonal from square 1 SE', () => {
      const ray = getDiagonalRay(1, Direction.SouthEast);
      expect(ray).toEqual([7, 12, 18, 23, 29, 34, 40, 45]);
    });

    it('should return empty ray from square 5 NE', () => {
      const ray = getDiagonalRay(5, Direction.NorthEast);
      expect(ray).toEqual([]);
    });

    it('should return correct ray from center square 28 NW', () => {
      const ray = getDiagonalRay(28, Direction.NorthWest);
      expect(ray).toEqual([22, 17, 11, 6]);
    });

    it('rays in opposite directions should be consistent', () => {
      // If square A's SE ray contains B, then B's NW ray should contain A
      for (let sq = 1; sq <= 50; sq++) {
        const seRay = getDiagonalRay(sq, Direction.SouthEast);
        for (const target of seRay) {
          const nwRay = getDiagonalRay(target, Direction.NorthWest);
          expect(nwRay).toContain(sq);
        }
      }
    });
  });

  describe('Promotion squares', () => {
    it('squares 46-50 are promotion squares for white', () => {
      for (let sq = 46; sq <= 50; sq++) {
        expect(isPromotionSquare(sq, 'white')).toBe(true);
      }
    });

    it('squares 1-5 are promotion squares for black', () => {
      for (let sq = 1; sq <= 5; sq++) {
        expect(isPromotionSquare(sq, 'black')).toBe(true);
      }
    });

    it('middle squares are not promotion squares', () => {
      expect(isPromotionSquare(28, 'white')).toBe(false);
      expect(isPromotionSquare(28, 'black')).toBe(false);
    });
  });

  describe('Forward directions', () => {
    it('white moves toward higher rows (SE, SW)', () => {
      expect(FORWARD_DIRECTIONS.white).toEqual([Direction.SouthEast, Direction.SouthWest]);
    });

    it('black moves toward lower rows (NE, NW)', () => {
      expect(FORWARD_DIRECTIONS.black).toEqual([Direction.NorthEast, Direction.NorthWest]);
    });
  });

  describe('All directions', () => {
    it('should have exactly 4 directions', () => {
      expect(ALL_DIRECTIONS).toHaveLength(4);
    });
  });

  describe('All squares have consistent topology', () => {
    it('every adjacent square should have the source in opposite adjacent', () => {
      const opposite: Record<Direction, Direction> = {
        [Direction.NorthEast]: Direction.SouthWest,
        [Direction.NorthWest]: Direction.SouthEast,
        [Direction.SouthEast]: Direction.NorthWest,
        [Direction.SouthWest]: Direction.NorthEast,
      };

      for (let sq = 1; sq <= 50; sq++) {
        for (const dir of ALL_DIRECTIONS) {
          const neighbor = getAdjacentSquare(sq, dir);
          if (neighbor !== null) {
            const reverseNeighbor = getAdjacentSquare(neighbor, opposite[dir]);
            expect(reverseNeighbor).toBe(sq);
          }
        }
      }
    });
  });
});
