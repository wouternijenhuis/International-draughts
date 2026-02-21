import 'dart:typed_data';

import '../types/board.dart';
import '../types/piece.dart';

/// Zobrist hashing for board positions.
///
/// Uses 32-bit hashes for performance (avoids BigInt overhead).
/// Collision rate at 131K TT entries is ~1.5%, which is standard for game TTs.

/// Number of piece types.
const int _numPieceTypes = 4;

/// Number of squares on the board.
const int _numSquares = 50;

/// Seeded pseudo-random number generator (xorshift32) for deterministic Zobrist keys.
/// This ensures reproducible hashes across runs.
int Function() _xorshift32(int seed) {
  var state = seed;
  return () {
    state ^= (state << 13) & 0xFFFFFFFF;
    state ^= state >>> 17;
    state ^= (state << 5) & 0xFFFFFFFF;
    return state & 0xFFFFFFFF; // Unsigned 32-bit
  };
}

/// Precomputed Zobrist table: [square 0-49][pieceType 0-3] → 32-bit random value
final Uint32List _zobristTable = Uint32List(_numSquares * _numPieceTypes);

/// Zobrist key for side-to-move (XOR'd when it's black's turn)
late final int _zobristSide;

/// Whether the Zobrist tables have been initialized.
bool _initialized = false;

/// Initializes the Zobrist tables with a deterministic seed.
void _ensureInitialized() {
  if (_initialized) return;
  _initialized = true;

  final rng = _xorshift32(0x12345678);
  for (var i = 0; i < _numSquares * _numPieceTypes; i++) {
    _zobristTable[i] = rng();
  }
  _zobristSide = rng();
}

/// Gets the Zobrist key component for a piece on a square.
///
/// [square] is the FMJD square number (1-50).
/// [pieceTypeIndex] is 0=WhiteMan, 1=WhiteKing, 2=BlackMan, 3=BlackKing.
int getZobristPiece(int square, int pieceTypeIndex) {
  _ensureInitialized();
  return _zobristTable[(square - 1) * _numPieceTypes + pieceTypeIndex];
}

/// Gets the Zobrist key for side-to-move toggling.
int getZobristSide() {
  _ensureInitialized();
  return _zobristSide;
}

/// Converts piece color + type to a Zobrist piece index.
///
/// Returns 0=WhiteMan, 1=WhiteKing, 2=BlackMan, 3=BlackKing.
int pieceToZobristIndex(bool isWhite, bool isKing) {
  return (isWhite ? 0 : 2) + (isKing ? 1 : 0);
}

/// Computes the full Zobrist hash for a board position.
///
/// Used for initial hash computation; incremental updates use XOR.
int computeZobristHash(BoardPosition board, PlayerColor currentPlayer) {
  _ensureInitialized();
  var hash = 0;

  for (var sq = 1; sq <= 50; sq++) {
    final piece = board[sq];
    if (piece != null) {
      final isWhite = piece.color == PlayerColor.white;
      final isKing = piece.type == PieceType.king;
      hash ^= getZobristPiece(sq, pieceToZobristIndex(isWhite, isKing));
    }
  }

  if (currentPlayer == PlayerColor.black) {
    hash ^= _zobristSide;
  }

  return hash & 0xFFFFFFFF; // Ensure unsigned 32-bit
}
