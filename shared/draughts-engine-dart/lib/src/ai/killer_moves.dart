import 'dart:typed_data';

/// Killer move heuristic for alpha-beta search.
///
/// Stores non-capture moves that caused beta cutoffs, used for move ordering.
/// Two slots per depth, up to MAX_DEPTH.

/// Maximum supported search depth.
const int _maxDepth = 64;

/// Number of killer move slots per depth.
const int _numSlots = 2;

/// Killer move table.
///
/// Stores move signatures that caused beta cutoffs.
/// Used to improve move ordering in non-capture positions.
class KillerMoves {
  /// Creates a new killer moves table.
  KillerMoves() : _table = Int32List(_maxDepth * _numSlots) {
    _table.fillRange(0, _table.length, -1);
  }

  /// [depth][slot] → move signature (from_square * 100 + to_square)
  final Int32List _table;

  /// Records a killer move at the given depth.
  ///
  /// Shifts existing killer to slot 1, stores new killer in slot 0.
  void store(int depth, int moveSignature) {
    if (depth >= _maxDepth) return;
    final base = depth * _numSlots;

    // Don't store duplicates
    if (_table[base] == moveSignature) return;

    // Shift slot 0 → slot 1, store new in slot 0
    _table[base + 1] = _table[base];
    _table[base] = moveSignature;
  }

  /// Checks if a move matches a killer move at the given depth.
  ///
  /// Returns priority score (400000 for slot 0, 399000 for slot 1, 0 if not a killer).
  int getScore(int depth, int moveSignature) {
    if (depth >= _maxDepth) return 0;
    final base = depth * _numSlots;

    if (_table[base] == moveSignature) return 400000;
    if (_table[base + 1] == moveSignature) return 399000;
    return 0;
  }

  /// Computes a unique signature for a move based on its start and end squares.
  ///
  /// [fromSquare] is the origin square (1-50).
  /// [toSquare] is the destination square (1-50).
  static int signature(int fromSquare, int toSquare) {
    return fromSquare * 100 + toSquare;
  }

  /// Clears all stored killer moves.
  void clear() {
    _table.fillRange(0, _table.length, -1);
  }
}
