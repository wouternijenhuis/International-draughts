import 'move.dart';

/// Formats a move in FMJD notation.
///
/// Quiet moves: "32-28"
/// Captures: "19x30" (single) or "19x10x3" (multi-jump)
String formatMoveNotation(Move move) {
  switch (move) {
    case QuietMove(:final from, :final to):
      return '$from-$to';
    case CaptureMove(:final steps):
      final squares = [steps[0].from, ...steps.map((s) => s.to)];
      return squares.join('x');
  }
}

/// Parsed move notation result.
class ParsedNotation {
  /// Creates a parsed notation result.
  const ParsedNotation({required this.type, required this.squares});

  /// The type of move ('quiet' or 'capture').
  final String type;

  /// The square numbers involved.
  final List<int> squares;
}

/// Parses a move notation string.
///
/// Returns the type ('quiet' or 'capture') and the square numbers involved.
ParsedNotation parseMoveNotation(String notation) {
  if (notation.contains('x')) {
    final squares = notation.split('x').map(int.parse).toList();
    return ParsedNotation(type: 'capture', squares: squares);
  }

  if (notation.contains('-')) {
    final parts = notation.split('-');
    if (parts.length != 2) {
      throw FormatException('Invalid quiet move notation: $notation');
    }
    final squares = parts.map(int.parse).toList();
    return ParsedNotation(type: 'quiet', squares: squares);
  }

  throw FormatException('Invalid notation format: $notation');
}

/// Result of deserializing an internal move notation.
///
/// Contains the origin square and the final destination square
/// of the move, regardless of how many intermediate steps it has.
class DeserializedMove {
  /// Creates a deserialized move result.
  const DeserializedMove({required this.from, required this.to});

  /// The origin square number.
  final int from;

  /// The final destination square number.
  final int to;
}

/// Deserializes a move from the internal serialization format used in move history.
///
/// Handles all move formats produced by the game engine's internal serializer:
/// - Quiet moves: `"from-to"` (e.g., `"32-28"`)
/// - Single captures: `"fromxcapturedxto"` (e.g., `"19x24x30"`)
/// - Multi-step captures: `"fromxcapturedxto,fromxcapturedxto,..."`
///   (e.g., `"28x33x39,39x44x50"`)
///
/// Returns a [DeserializedMove] with the origin and final destination squares.
///
/// Throws [FormatException] if the notation string is empty or invalid.
DeserializedMove deserializeMoveNotation(String notation) {
  // Quiet moves: "from-to"
  if (notation.contains('-')) {
    final parts = notation.split('-');
    if (parts.length != 2) {
      throw FormatException('Invalid quiet move notation: $notation');
    }
    return DeserializedMove(
      from: int.parse(parts[0]),
      to: int.parse(parts[1]),
    );
  }

  // Capture moves (may contain commas for multi-step)
  if (notation.contains('x')) {
    final steps = notation.split(',');
    final firstParts = steps.first.split('x');
    final from = int.parse(firstParts.first);
    final lastParts = steps.last.split('x');
    final to = int.parse(lastParts.last);
    return DeserializedMove(from: from, to: to);
  }

  throw FormatException('Invalid notation format: $notation');
}
