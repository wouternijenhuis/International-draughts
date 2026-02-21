import 'package:draughts_engine/draughts_engine.dart';
import 'package:test/test.dart';

void main() {
  group('Board Topology', () {
    group('getSquareTopology', () {
      test('should return topology for valid squares', () {
        for (var sq = 1; sq <= 50; sq++) {
          final topo = getSquareTopology(sq);
          expect(topo, isNotNull);
          expect(topo.adjacent, isNotNull);
          expect(topo.rays, isNotNull);
        }
      });

      test('should throw for invalid square 0', () {
        expect(() => getSquareTopology(0), throwsA(anything));
      });

      test('should throw for invalid square 51', () {
        expect(() => getSquareTopology(51), throwsA(anything));
      });
    });

    group('Adjacent squares', () {
      // Square 1 (row 0, col 1) - top-left area
      test('square 1: NE=null, NW=null (top edge), SE=7, SW=6', () {
        expect(getAdjacentSquare(1, Direction.northEast), isNull);
        expect(getAdjacentSquare(1, Direction.northWest), isNull);
        expect(getAdjacentSquare(1, Direction.southEast), equals(7));
        expect(getAdjacentSquare(1, Direction.southWest), equals(6));
      });

      // Square 5 (row 0, col 9) - top-right corner
      test('square 5: NE=null, NW=null, SE=null (right edge), SW=10', () {
        expect(getAdjacentSquare(5, Direction.northEast), isNull);
        expect(getAdjacentSquare(5, Direction.northWest), isNull);
        expect(getAdjacentSquare(5, Direction.southEast), isNull);
        expect(getAdjacentSquare(5, Direction.southWest), equals(10));
      });

      // Square 6 (row 1, col 0) - left edge
      test('square 6: NE=1, NW=null (left edge), SE=11, SW=null (left edge)',
          () {
        expect(getAdjacentSquare(6, Direction.northEast), equals(1));
        expect(getAdjacentSquare(6, Direction.northWest), isNull);
        expect(getAdjacentSquare(6, Direction.southEast), equals(11));
        expect(getAdjacentSquare(6, Direction.southWest), isNull);
      });

      // Square 28 (row 5, col 4) - center
      test('square 28: has all four neighbors', () {
        expect(getAdjacentSquare(28, Direction.northEast), equals(23));
        expect(getAdjacentSquare(28, Direction.northWest), equals(22));
        expect(getAdjacentSquare(28, Direction.southEast), equals(33));
        expect(getAdjacentSquare(28, Direction.southWest), equals(32));
      });

      // Square 46 (row 9, col 0) - bottom-left corner
      test('square 46: SE=null, SW=null (bottom edge), NE=41, NW=null', () {
        expect(getAdjacentSquare(46, Direction.southEast), isNull);
        expect(getAdjacentSquare(46, Direction.southWest), isNull);
        expect(getAdjacentSquare(46, Direction.northEast), equals(41));
        expect(getAdjacentSquare(46, Direction.northWest), isNull);
      });

      // Square 50 (row 9, col 8) - bottom-right area
      test('square 50: SE=null, SW=null (bottom edge), NE=45, NW=44', () {
        expect(getAdjacentSquare(50, Direction.southEast), isNull);
        expect(getAdjacentSquare(50, Direction.southWest), isNull);
        expect(getAdjacentSquare(50, Direction.northEast), equals(45));
        expect(getAdjacentSquare(50, Direction.northWest), equals(44));
      });
    });

    group('Diagonal rays', () {
      test('should return full diagonal from square 1 SE', () {
        final ray = getDiagonalRay(1, Direction.southEast);
        expect(ray, equals([7, 12, 18, 23, 29, 34, 40, 45]));
      });

      test('should return empty ray from square 5 NE', () {
        final ray = getDiagonalRay(5, Direction.northEast);
        expect(ray, equals([]));
      });

      test('should return correct ray from center square 28 NW', () {
        final ray = getDiagonalRay(28, Direction.northWest);
        expect(ray, equals([22, 17, 11, 6]));
      });

      test('rays in opposite directions should be consistent', () {
        // If square A's SE ray contains B, then B's NW ray should contain A
        for (var sq = 1; sq <= 50; sq++) {
          final seRay = getDiagonalRay(sq, Direction.southEast);
          for (final target in seRay) {
            final nwRay = getDiagonalRay(target, Direction.northWest);
            expect(nwRay, contains(sq));
          }
        }
      });
    });

    group('Promotion squares', () {
      test('squares 46-50 are promotion squares for white', () {
        for (var sq = 46; sq <= 50; sq++) {
          expect(isPromotionSquare(sq, 'white'), isTrue);
        }
      });

      test('squares 1-5 are promotion squares for black', () {
        for (var sq = 1; sq <= 5; sq++) {
          expect(isPromotionSquare(sq, 'black'), isTrue);
        }
      });

      test('middle squares are not promotion squares', () {
        expect(isPromotionSquare(28, 'white'), isFalse);
        expect(isPromotionSquare(28, 'black'), isFalse);
      });
    });

    group('Forward directions', () {
      test('white moves toward higher rows (SE, SW)', () {
        expect(
          whiteForwardDirections,
          equals([Direction.southEast, Direction.southWest]),
        );
      });

      test('black moves toward lower rows (NE, NW)', () {
        expect(
          blackForwardDirections,
          equals([Direction.northEast, Direction.northWest]),
        );
      });
    });

    group('All directions', () {
      test('should have exactly 4 directions', () {
        expect(allDirections, hasLength(4));
      });
    });

    group('All squares have consistent topology', () {
      test(
          'every adjacent square should have the source in opposite adjacent',
          () {
        final opposite = <Direction, Direction>{
          Direction.northEast: Direction.southWest,
          Direction.northWest: Direction.southEast,
          Direction.southEast: Direction.northWest,
          Direction.southWest: Direction.northEast,
        };

        for (var sq = 1; sq <= 50; sq++) {
          for (final dir in allDirections) {
            final neighbor = getAdjacentSquare(sq, dir);
            if (neighbor != null) {
              final reverseNeighbor = getAdjacentSquare(neighbor, opposite[dir]!);
              expect(reverseNeighbor, equals(sq));
            }
          }
        }
      });
    });
  });
}
