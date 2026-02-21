/// The two piece types in international draughts.
enum PieceType {
  /// A regular piece (man).
  man,

  /// A promoted piece (king).
  king,
}

/// The two player colors.
enum PlayerColor {
  /// White player (pieces start on squares 1-20).
  white,

  /// Black player (pieces start on squares 31-50).
  black,
}

/// A piece on the board.
class Piece {
  /// Creates a piece with the given [type] and [color].
  const Piece({required this.type, required this.color});

  /// The type of piece (man or king).
  final PieceType type;

  /// The color of the piece.
  final PlayerColor color;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Piece && type == other.type && color == other.color;

  @override
  int get hashCode => Object.hash(type, color);

  @override
  String toString() => 'Piece(${color.name} ${type.name})';
}

/// Factory function for creating pieces.
Piece createPiece(PieceType type, PlayerColor color) =>
    Piece(type: type, color: color);

/// Creates a white man piece.
Piece createWhiteMan() => const Piece(type: PieceType.man, color: PlayerColor.white);

/// Creates a black man piece.
Piece createBlackMan() => const Piece(type: PieceType.man, color: PlayerColor.black);

/// Creates a white king piece.
Piece createWhiteKing() =>
    const Piece(type: PieceType.king, color: PlayerColor.white);

/// Creates a black king piece.
Piece createBlackKing() =>
    const Piece(type: PieceType.king, color: PlayerColor.black);
