import 'dart:typed_data';

/// ArrayBuffer-based transposition table for alpha-beta search.
///
/// Fixed-size with replace-always policy. Uses 32-bit Zobrist hashes.
///
/// Memory layout per entry (16 bytes):
///   [0-3]   hash (uint32)
///   [4-7]   score (int32)
///   [8]     depth (uint8)
///   [9]     type (uint8): 0=exact, 1=lowerBound, 2=upperBound
///   [10-11] bestMoveIndex (int16, -1 = none)
///   [12-15] padding (unused, for alignment)

/// Transposition table entry types.
enum TtEntryType {
  /// Exact score.
  exact,

  /// Lower bound (alpha cutoff).
  lowerBound,

  /// Upper bound (beta cutoff).
  upperBound,
}

/// Transposition table entry.
class TtEntry {
  /// Creates a TT entry.
  const TtEntry({
    required this.hash,
    required this.score,
    required this.depth,
    required this.type,
    required this.bestMoveIndex,
  });

  /// The hash of the position.
  final int hash;

  /// The evaluation score.
  final int score;

  /// The search depth.
  final int depth;

  /// The type of entry.
  final TtEntryType type;

  /// Index of the best move found.
  final int bestMoveIndex;
}

/// Entry size in bytes (aligned to 16 for cache performance).
const int _entrySize = 16;

/// Offsets within each entry.
const int _offsetHash = 0;
const int _offsetScore = 4;
const int _offsetDepth = 8;
const int _offsetType = 9;
const int _offsetBestMove = 10;

/// Fixed-size transposition table backed by a [ByteData].
///
/// Replace-always policy with hash-based indexing.
class TranspositionTable {
  /// Creates a transposition table with approximately the given size in MB.
  ///
  /// [sizeMb] defaults to 4 MB.
  TranspositionTable([int sizeMb = 4]) {
    final sizeBytes = sizeMb * 1024 * 1024;
    _numEntries = sizeBytes ~/ _entrySize;
    _buffer = Uint8List(_numEntries * _entrySize);
    _view = ByteData.sublistView(_buffer);
  }

  late final Uint8List _buffer;
  late final ByteData _view;
  late final int _numEntries;

  /// Returns the number of entries in the table.
  int get size => _numEntries;

  /// Probes the table for an entry matching the given hash.
  ///
  /// Returns the entry if found and hash matches, or null.
  TtEntry? probe(int hash) {
    final unsignedHash = hash & 0xFFFFFFFF;
    final index = unsignedHash % _numEntries;
    final offset = index * _entrySize;

    final storedHash = _view.getUint32(offset + _offsetHash, Endian.little);
    if (storedHash != unsignedHash) return null;

    return TtEntry(
      hash: storedHash,
      score: _view.getInt32(offset + _offsetScore, Endian.little),
      depth: _view.getUint8(offset + _offsetDepth),
      type: TtEntryType.values[_view.getUint8(offset + _offsetType)],
      bestMoveIndex: _view.getInt16(offset + _offsetBestMove, Endian.little),
    );
  }

  /// Stores an entry in the table (replace-always policy).
  void store(int hash, int score, int depth, TtEntryType type, int bestMoveIndex) {
    final unsignedHash = hash & 0xFFFFFFFF;
    final index = unsignedHash % _numEntries;
    final offset = index * _entrySize;

    _view.setUint32(offset + _offsetHash, unsignedHash, Endian.little);
    _view.setInt32(offset + _offsetScore, score, Endian.little);
    _view.setUint8(offset + _offsetDepth, depth);
    _view.setUint8(offset + _offsetType, type.index);
    _view.setInt16(offset + _offsetBestMove, bestMoveIndex, Endian.little);
  }

  /// Clears all entries in the table.
  void clear() {
    _buffer.fillRange(0, _buffer.length, 0);
  }
}
