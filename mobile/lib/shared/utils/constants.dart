/// Application-wide constants.
abstract final class AppConstants {
  /// The name of the application.
  static const String appName = 'International Draughts';

  /// Board size (10×10).
  static const int boardSize = 10;

  /// Total number of playable squares (1-50).
  static const int totalSquares = 50;

  /// Pieces per player at game start.
  static const int piecesPerPlayer = 20;

  /// Maximum AI search depth.
  static const int maxAiDepth = 8;

  /// Default animation duration in milliseconds.
  static const int defaultAnimationMs = 200;

  /// Session storage key for guest game state.
  static const String guestGameKey = 'guest_game_state';

  /// Local storage key for registered user game state.
  static const String userGameKey = 'user_game_state';
}
