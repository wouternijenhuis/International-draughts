import '../types/board.dart';

/// The four diagonal directions.
enum Direction {
  /// Up-right (decreasing row, increasing col).
  northEast,

  /// Up-left (decreasing row, decreasing col).
  northWest,

  /// Down-right (increasing row, increasing col).
  southEast,

  /// Down-left (increasing row, decreasing col).
  southWest,
}

/// Row/col deltas for each direction.
const Map<Direction, ({int dRow, int dCol})> _directionDeltas = {
  Direction.northEast: (dRow: -1, dCol: 1),
  Direction.northWest: (dRow: -1, dCol: -1),
  Direction.southEast: (dRow: 1, dCol: 1),
  Direction.southWest: (dRow: 1, dCol: -1),
};

/// Forward directions for white.
const List<Direction> whiteForwardDirections = [
  Direction.southEast,
  Direction.southWest,
];

/// Forward directions for black.
const List<Direction> blackForwardDirections = [
  Direction.northEast,
  Direction.northWest,
];

/// All four diagonal directions.
const List<Direction> allDirections = [
  Direction.northEast,
  Direction.northWest,
  Direction.southEast,
  Direction.southWest,
];

/// Returns the forward directions for the given color string ('white' or 'black').
List<Direction> forwardDirectionsFor(String color) {
  return color == 'white' ? whiteForwardDirections : blackForwardDirections;
}

/// Precomputed diagonal ray from a square in a given direction (ordered by distance).
typedef DiagonalRay = List<int>;

/// For each square (1-50), the diagonal rays in each direction.
class SquareTopology {
  /// Creates a square topology.
  const SquareTopology({required this.adjacent, required this.rays});

  /// Adjacent square in each direction (null if at board edge).
  final Map<Direction, int?> adjacent;

  /// Full diagonal ray in each direction (all squares, ordered by distance).
  final Map<Direction, DiagonalRay> rays;
}

/// Computes the diagonal ray from a given coordinate in a direction.
/// Returns all FMJD square numbers along that diagonal (excluding the start square).
List<int> _computeRay(BoardCoordinate start, Direction direction) {
  final delta = _directionDeltas[direction]!;
  final ray = <int>[];

  var row = start.row + delta.dRow;
  var col = start.col + delta.dCol;

  while (row >= 0 && row <= 9 && col >= 0 && col <= 9) {
    final sq = coordinateToSquare(BoardCoordinate(row: row, col: col));
    if (sq != null) {
      ray.add(sq);
    }
    row += delta.dRow;
    col += delta.dCol;
  }

  return ray;
}

/// Precomputed topology for all 50 squares. Index 0 is null (unused).
final List<SquareTopology?> _topology = _buildTopology();

List<SquareTopology?> _buildTopology() {
  final topology = List<SquareTopology?>.filled(51, null);

  for (var sq = 1; sq <= 50; sq++) {
    final coord = squareToCoordinate(sq);
    final rays = <Direction, DiagonalRay>{};
    for (final dir in allDirections) {
      rays[dir] = _computeRay(coord, dir);
    }

    final adjacent = <Direction, int?>{};
    for (final dir in allDirections) {
      adjacent[dir] = rays[dir]!.isNotEmpty ? rays[dir]![0] : null;
    }

    topology[sq] = SquareTopology(adjacent: adjacent, rays: rays);
  }

  return topology;
}

/// Gets the precomputed topology for a square.
///
/// Throws if the square number is invalid.
SquareTopology getSquareTopology(int square) {
  final topo = _topology[square];
  if (topo == null) {
    throw ArgumentError('Invalid square number: $square');
  }
  return topo;
}

/// Gets the adjacent square in a given direction.
/// Returns null if at the board edge.
int? getAdjacentSquare(int square, Direction direction) {
  return getSquareTopology(square).adjacent[direction];
}

/// Gets the full diagonal ray from a square in a given direction.
DiagonalRay getDiagonalRay(int square, Direction direction) {
  return getSquareTopology(square).rays[direction]!;
}

/// The promotion row for each color (the farthest row from start).
const Map<String, int> promotionRow = {
  'white': 9, // Row 9 = squares 46-50
  'black': 0, // Row 0 = squares 1-5
};

/// Check if a square is on the promotion row for a given color.
bool isPromotionSquare(int square, String color) {
  final coord = squareToCoordinate(square);
  return coord.row == promotionRow[color];
}
