import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:international_draughts/core/constants/api_endpoints.dart';
import 'package:international_draughts/features/auth/data/secure_token_storage.dart';
import 'package:synchronized/synchronized.dart';

/// Dio interceptor that injects Bearer tokens and handles 401 refresh.
///
/// On every request, attaches the stored access token as an Authorization
/// header. When a 401 response is received, attempts a token refresh
/// using a mutex to prevent concurrent refresh requests.
class AuthInterceptor extends Interceptor {
  /// Creates an [AuthInterceptor] with the given [tokenStorage].
  AuthInterceptor({required SecureTokenStorage tokenStorage})
      : _tokenStorage = tokenStorage;

  final SecureTokenStorage _tokenStorage;
  final Lock _refreshLock = Lock();

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _tokenStorage.getAccessToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (err.response?.statusCode != 401) {
      return handler.next(err);
    }

    // Attempt token refresh with mutex to avoid concurrent refreshes.
    try {
      final refreshed = await _refreshLock.synchronized(() async {
        return _attemptTokenRefresh();
      });

      if (refreshed) {
        // Retry the failed request with the new token.
        final token = await _tokenStorage.getAccessToken();
        final options = err.requestOptions;
        options.headers['Authorization'] = 'Bearer $token';

        final dio = Dio();
        final response = await dio.fetch(options);
        return handler.resolve(response);
      }
    } catch (e) {
      debugPrint('Token refresh failed: $e');
    }

    // If refresh failed, propagate the original 401 error.
    return handler.next(err);
  }

  /// Attempts to refresh the access token using the stored refresh token.
  ///
  /// Returns `true` if the refresh was successful.
  Future<bool> _attemptTokenRefresh() async {
    final refreshToken = await _tokenStorage.getRefreshToken();
    if (refreshToken == null) return false;

    try {
      final dio = Dio();
      final response = await dio.post<Map<String, dynamic>>(
        '${ApiEndpoints.baseUrl}${ApiEndpoints.refreshToken}',
        data: {'refreshToken': refreshToken},
      );

      final data = response.data;
      if (data == null) return false;

      final newAccessToken = data['accessToken'] as String?;
      final newRefreshToken = data['refreshToken'] as String?;

      if (newAccessToken != null) {
        await _tokenStorage.saveAccessToken(newAccessToken);
        if (newRefreshToken != null) {
          await _tokenStorage.saveRefreshToken(newRefreshToken);
        }
        return true;
      }
    } catch (e) {
      debugPrint('Token refresh request failed: $e');
    }

    return false;
  }
}
