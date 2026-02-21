import 'piece.dart';

/// Valid FMJD square numbers (1-50).
/// Represented as [int], validated at runtime to be 1-50.
typedef SquareNumber = int;

/// A square on the board: either empty (null) or occupied by a [Piece].
typedef Square = Piece?;

/// Board position using a list indexed by FMJD square number.
/// Index 0 is unused; indices 1-50 map to FMJD squares.
typedef BoardPosition = List<Square>;

/// Row and column coordinates (0-based) on the 10×10 grid.
class BoardCoordinate {
  /// Creates a board coordinate.
  const BoardCoordinate({required this.row, required this.col});

  /// Row (0-9, top to bottom).
  final int row;

  /// Column (0-9, left to right).
  final int col;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is BoardCoordinate && row == other.row && col == other.col;

  @override
  int get hashCode => Object.hash(row, col);

  @override
  String toString() => 'BoardCoordinate(row: $row, col: $col)';
}

/// Validates that a number is a valid FMJD square number (1-50).
bool isValidSquareNumber(int n) => n >= 1 && n <= 50;

/// Converts an FMJD square number (1-50) to board coordinates (row, col).
///
/// FMJD numbering: Square 1 is at the top-right of the board from White's perspective.
/// Squares are numbered left to right, top to bottom, only on dark squares.
///
/// Row 0 (top): squares 1-5    → cols 1,3,5,7,9
/// Row 1:       squares 6-10   → cols 0,2,4,6,8
/// Row 2:       squares 11-15  → cols 1,3,5,7,9
/// ...
BoardCoordinate squareToCoordinate(SquareNumber square) {
  if (!isValidSquareNumber(square)) {
    throw ArgumentError(
      'Invalid square number: $square. Must be between 1 and 50.',
    );
  }
  final index = square - 1;
  final row = index ~/ 5;
  final posInRow = index % 5;

  // Even rows (0,2,4,6,8): dark squares at odd columns (1,3,5,7,9)
  // Odd rows (1,3,5,7,9): dark squares at even columns (0,2,4,6,8)
  final col = row % 2 == 0 ? posInRow * 2 + 1 : posInRow * 2;

  return BoardCoordinate(row: row, col: col);
}

/// Converts board coordinates (row, col) to an FMJD square number (1-50).
/// Returns null if the coordinate is not a playable dark square.
SquareNumber? coordinateToSquare(BoardCoordinate coord) {
  final row = coord.row;
  final col = coord.col;
  if (row < 0 || row > 9 || col < 0 || col > 9) return null;

  // Check if it's a dark square
  final isEvenRow = row % 2 == 0;
  final isDarkSquare = isEvenRow ? col % 2 == 1 : col % 2 == 0;
  if (!isDarkSquare) return null;

  final posInRow = isEvenRow ? (col - 1) ~/ 2 : col ~/ 2;
  return row * 5 + posInRow + 1;
}

/// Creates an empty board with 51 positions (index 0 unused).
List<Square> createEmptyBoard() {
  return List<Square>.filled(51, null);
}
