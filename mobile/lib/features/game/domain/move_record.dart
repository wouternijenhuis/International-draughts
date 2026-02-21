import 'package:draughts_engine/draughts_engine.dart';

/// A record of a single move in the game history.
class MoveRecord {
  /// Creates a [MoveRecord].
  const MoveRecord({
    required this.move,
    required this.notation,
    required this.player,
    required this.moveNumber,
    this.timestamp,
  });

  /// The move that was made.
  final Move move;

  /// Standard notation string for the move (e.g., "32-28" or "23x14").
  final String notation;

  /// The player who made the move.
  final PlayerColor player;

  /// The sequential move number.
  final int moveNumber;

  /// Timestamp when the move was made, if tracked.
  final DateTime? timestamp;

  @override
  String toString() => 'MoveRecord($moveNumber: $notation by ${player.name})';
}
