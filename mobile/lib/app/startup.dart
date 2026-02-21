import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Performs application startup tasks.
///
/// Runs version check and token refresh in parallel before the UI is shown.
/// Called from [main] before [runApp].
Future<void> performStartup() async {
  await Future.wait([
    _initPreferences(),
    _refreshTokenIfNeeded(),
  ]);
}

/// Initialize shared preferences cache.
Future<void> _initPreferences() async {
  try {
    await SharedPreferences.getInstance();
  } catch (e) {
    debugPrint('Failed to initialize preferences: $e');
  }
}

/// Attempt to refresh the auth token if one exists.
///
/// Failures are silently ignored — the user will be prompted to log in
/// if the token is invalid when an authenticated API call is made.
Future<void> _refreshTokenIfNeeded() async {
  // Token refresh will be implemented when the auth flow is connected.
  // For now this is a no-op placeholder.
}
