import 'package:draughts_engine/draughts_engine.dart';

// Re-export ClockFormat for use in GameConfig.
export 'package:draughts_engine/draughts_engine.dart' show ClockFormat;

/// The phases of a game lifecycle.
///
/// Sealed class hierarchy enabling exhaustive `switch` handling.
/// Each phase carries the data relevant to that state.
sealed class AppGamePhase {
  const AppGamePhase();
}

/// No game is in progress. The user can start a new game.
final class NotStarted extends AppGamePhase {
  /// Creates the [NotStarted] phase.
  const NotStarted();
}

/// A game is actively being played.
final class InProgress extends AppGamePhase {
  /// Creates the [InProgress] phase.
  const InProgress({
    required this.gameState,
    required this.config,
    this.selectedSquare,
    this.legalMoveTargets = const [],
    this.ambiguousMoves = const [],
  });

  /// The current engine game state.
  final GameState gameState;

  /// The game configuration.
  final GameConfig config;

  /// Currently selected square (for move input), if any.
  final int? selectedSquare;

  /// Squares that are valid move targets for the selected piece.
  final List<int> legalMoveTargets;

  /// When non-empty, the player must choose between these capture paths.
  ///
  /// All moves share the same origin and destination but capture different
  /// pieces along different zigzag paths. Per FMJD rules the player is
  /// entitled to choose among equal-length capture sequences.
  final List<CaptureMove> ambiguousMoves;

  /// Whether the player is currently choosing between ambiguous paths.
  bool get isDisambiguating => ambiguousMoves.length > 1;
}

/// White has won the game.
final class WhiteWins extends AppGamePhase {
  /// Creates the [WhiteWins] phase.
  const WhiteWins({required this.reason});

  /// Description of how white won.
  final String reason;
}

/// Black has won the game.
final class BlackWins extends AppGamePhase {
  /// Creates the [BlackWins] phase.
  const BlackWins({required this.reason});

  /// Description of how black won.
  final String reason;
}

/// The game ended in a draw.
final class DrawResult extends AppGamePhase {
  /// Creates the [DrawResult] phase.
  const DrawResult({required this.reason});

  /// Description of the draw reason.
  final String reason;
}

/// Game configuration for starting a new game.
class GameConfig {
  /// Creates a [GameConfig].
  const GameConfig({
    required this.mode,
    required this.difficulty,
    required this.playerColor,
    this.isTimed = false,
    this.clockPresetSeconds = 300,
    this.clockIncrementMs = 0,
    this.clockFormat = ClockFormat.countdown,
  });

  /// Game mode (e.g., 'vsAi', 'vsHuman', 'tutorial').
  final String mode;

  /// AI difficulty level (e.g., 'easy', 'medium', 'hard', 'expert').
  final String difficulty;

  /// The color the human player plays as.
  final PlayerColor playerColor;

  /// Whether the game uses a clock.
  final bool isTimed;

  /// Clock time per player in seconds.
  final int clockPresetSeconds;

  /// Fischer increment per move in milliseconds.
  final int clockIncrementMs;

  /// Clock format (fischer or countdown).
  final ClockFormat clockFormat;
}
