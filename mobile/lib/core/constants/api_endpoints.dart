/// API endpoint constants.
///
/// Centralizes all backend API paths used throughout the application.
abstract final class ApiEndpoints {
  /// Base URL for the backend API.
  ///
  /// Override via environment configuration for different environments.
  static const String baseUrl = 'https://api.internationaldraughts.com';

  // ── Auth ──────────────────────────────────────────────────────────

  /// Login endpoint.
  static const String login = '/api/auth/login';

  /// Registration endpoint.
  static const String register = '/api/auth/register';

  /// Token refresh endpoint.
  static const String refreshToken = '/api/auth/refresh';

  /// Account deletion endpoint.
  static const String deleteAccount = '/api/auth/delete';

  // ── Settings ──────────────────────────────────────────────────────

  /// User settings endpoint.
  static const String settings = '/api/settings';

  // ── Player ────────────────────────────────────────────────────────

  /// Player profile endpoint (append /{userId}).
  static const String playerProfile = '/api/player';

  /// Player stats endpoint (append /{userId}).
  static const String playerStats = '/api/player/stats';

  /// Rating history endpoint (append /{userId}).
  static const String ratingHistory = '/api/player/rating-history';

  /// Game history endpoint (append /{userId}).
  static const String gameHistory = '/api/player/games';

  // ── AI ────────────────────────────────────────────────────────────

  /// Expert AI move computation endpoint.
  static const String aiMove = '/api/v1/ai/move';

  // ── Games ─────────────────────────────────────────────────────────

  /// Saved game state endpoint.
  static const String savedGame = '/api/v1/games';

  // ── Health ────────────────────────────────────────────────────────

  /// Health check endpoint.
  static const String health = '/health';
}
