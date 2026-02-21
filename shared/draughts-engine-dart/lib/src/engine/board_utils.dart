import '../types/board.dart';
import '../types/piece.dart';

/// Gets the piece on a given square.
Piece? getPiece(BoardPosition board, int square) {
  return board[square];
}

/// Checks if a square is empty.
bool isEmpty(BoardPosition board, int square) {
  return board[square] == null;
}

/// Checks if a square contains an enemy piece.
bool isEnemy(BoardPosition board, int square, PlayerColor color) {
  final piece = board[square];
  return piece != null && piece.color != color;
}

/// Checks if a square contains a friendly piece.
bool isFriendly(BoardPosition board, int square, PlayerColor color) {
  final piece = board[square];
  return piece != null && piece.color == color;
}

/// Creates a new board with a piece moved from one square to another.
/// Does NOT handle captures — just moves the piece.
List<Piece?> movePiece(BoardPosition board, int from, int to) {
  final newBoard = List<Piece?>.of(board);
  newBoard[to] = newBoard[from]!;
  newBoard[from] = null;
  return newBoard;
}

/// Creates a new board with a piece removed from a square.
List<Piece?> removePiece(BoardPosition board, int square) {
  final newBoard = List<Piece?>.of(board);
  newBoard[square] = null;
  return newBoard;
}

/// Creates a new board with a piece promoted to king.
List<Piece?> promotePiece(BoardPosition board, int square) {
  final piece = board[square];
  if (piece == null || piece.type == PieceType.king) {
    return List<Piece?>.of(board);
  }
  final newBoard = List<Piece?>.of(board);
  newBoard[square] = Piece(type: PieceType.king, color: piece.color);
  return newBoard;
}

/// Finds all squares occupied by pieces of a given color.
List<int> findPieces(BoardPosition board, PlayerColor color) {
  final squares = <int>[];
  for (var sq = 1; sq <= 50; sq++) {
    final piece = board[sq];
    if (piece != null && piece.color == color) {
      squares.add(sq);
    }
  }
  return squares;
}

/// Piece count result.
class PieceCount {
  /// Creates a piece count.
  const PieceCount({required this.men, required this.kings, required this.total});

  /// Number of men.
  final int men;

  /// Number of kings.
  final int kings;

  /// Total pieces.
  final int total;
}

/// Counts pieces of each type for a given color.
PieceCount countPieces(BoardPosition board, PlayerColor color) {
  var men = 0;
  var kings = 0;
  for (var sq = 1; sq <= 50; sq++) {
    final piece = board[sq];
    if (piece != null && piece.color == color) {
      if (piece.type == PieceType.man) {
        men++;
      } else {
        kings++;
      }
    }
  }
  return PieceCount(men: men, kings: kings, total: men + kings);
}
