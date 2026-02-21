import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Secure wrapper around [FlutterSecureStorage] for auth token persistence.
///
/// Provides a typed API for storing and retrieving access and refresh tokens.
class SecureTokenStorage {
  /// Creates a [SecureTokenStorage] instance.
  SecureTokenStorage()
      : _storage = const FlutterSecureStorage(
          aOptions: AndroidOptions(encryptedSharedPreferences: true),
        );

  final FlutterSecureStorage _storage;

  static const String _accessTokenKey = 'access_token';
  static const String _refreshTokenKey = 'refresh_token';

  /// Stores the [accessToken].
  Future<void> saveAccessToken(String accessToken) async {
    await _storage.write(key: _accessTokenKey, value: accessToken);
  }

  /// Retrieves the stored access token, or `null` if not set.
  Future<String?> getAccessToken() async {
    return _storage.read(key: _accessTokenKey);
  }

  /// Stores the [refreshToken].
  Future<void> saveRefreshToken(String refreshToken) async {
    await _storage.write(key: _refreshTokenKey, value: refreshToken);
  }

  /// Retrieves the stored refresh token, or `null` if not set.
  Future<String?> getRefreshToken() async {
    return _storage.read(key: _refreshTokenKey);
  }

  /// Clears all stored tokens.
  Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}
