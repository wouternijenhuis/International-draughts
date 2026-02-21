import 'package:international_draughts/core/constants/api_endpoints.dart';
import 'package:international_draughts/core/errors/error_handler.dart';
import 'package:international_draughts/core/errors/result.dart';
import 'package:international_draughts/core/network/api_client.dart';

import '../domain/user.dart';
import 'secure_token_storage.dart';

/// Repository for authentication operations.
///
/// Handles login, registration, token refresh, and logout
/// by communicating with the backend auth API.
class AuthRepository {
  /// Creates an [AuthRepository].
  const AuthRepository({
    required ApiClient apiClient,
    required SecureTokenStorage tokenStorage,
  })  : _apiClient = apiClient,
        _tokenStorage = tokenStorage;

  final ApiClient _apiClient;
  final SecureTokenStorage _tokenStorage;

  /// Logs in with [email] and [password].
  ///
  /// On success, stores the tokens and returns the [User].
  Future<Result<User>> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _apiClient.post<Map<String, dynamic>>(
        ApiEndpoints.login,
        data: {'email': email, 'password': password},
      );

      final data = response.data!;
      final accessToken = data['accessToken'] as String;
      final refreshToken = data['refreshToken'] as String;
      final user = User.fromJson(data['user'] as Map<String, dynamic>);

      await _tokenStorage.saveAccessToken(accessToken);
      await _tokenStorage.saveRefreshToken(refreshToken);

      return Result.success(user);
    } catch (e, st) {
      return Result.failure(ErrorHandler.handle(e, st));
    }
  }

  /// Registers a new account with [email], [password], and optional [username].
  ///
  /// On success, stores the tokens and returns the [User].
  Future<Result<User>> register({
    required String email,
    required String password,
    String? username,
  }) async {
    try {
      final response = await _apiClient.post<Map<String, dynamic>>(
        ApiEndpoints.register,
        data: {
          'email': email,
          'password': password,
          if (username != null && username.isNotEmpty) 'username': username,
        },
      );

      final data = response.data!;
      final accessToken = data['accessToken'] as String;
      final refreshToken = data['refreshToken'] as String;
      final user = User.fromJson(data['user'] as Map<String, dynamic>);

      await _tokenStorage.saveAccessToken(accessToken);
      await _tokenStorage.saveRefreshToken(refreshToken);

      return Result.success(user);
    } catch (e, st) {
      return Result.failure(ErrorHandler.handle(e, st));
    }
  }

  /// Refreshes the current auth tokens.
  ///
  /// Returns `true` if refresh succeeded.
  Future<Result<bool>> refreshTokens() async {
    try {
      final refreshToken = await _tokenStorage.getRefreshToken();
      if (refreshToken == null) {
        return const Result.failure(
          AuthError(message: 'No refresh token available'),
        );
      }

      final response = await _apiClient.post<Map<String, dynamic>>(
        ApiEndpoints.refreshToken,
        data: {'refreshToken': refreshToken},
      );

      final data = response.data!;
      await _tokenStorage.saveAccessToken(data['accessToken'] as String);
      if (data['refreshToken'] != null) {
        await _tokenStorage.saveRefreshToken(data['refreshToken'] as String);
      }

      return const Result.success(true);
    } catch (e, st) {
      return Result.failure(ErrorHandler.handle(e, st));
    }
  }

  /// Logs out by clearing stored tokens.
  Future<void> logout() async {
    await _tokenStorage.clearAll();
  }

  /// Checks whether the user has stored auth tokens.
  Future<bool> hasStoredTokens() async {
    final token = await _tokenStorage.getAccessToken();
    return token != null;
  }
}
