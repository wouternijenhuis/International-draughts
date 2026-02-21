import 'package:dio/dio.dart';

import 'package:international_draughts/core/constants/api_endpoints.dart';
import 'auth_interceptor.dart';

/// HTTP client for communicating with the International Draughts backend API.
///
/// Configured with base URL, timeouts, and the [AuthInterceptor] for
/// automatic Bearer token injection and 401 refresh handling.
class ApiClient {
  /// Creates an [ApiClient] with the given [authInterceptor].
  ApiClient({required AuthInterceptor authInterceptor})
      : _dio = Dio(
          BaseOptions(
            baseUrl: ApiEndpoints.baseUrl,
            connectTimeout: const Duration(seconds: 10),
            receiveTimeout: const Duration(seconds: 30),
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          ),
        ) {
    _dio.interceptors.add(authInterceptor);
    _dio.interceptors.add(LogInterceptor(
      requestBody: true,
      responseBody: true,
    ),);
  }

  final Dio _dio;

  /// The underlying [Dio] instance for direct access if needed.
  Dio get dio => _dio;

  /// Performs a GET request to the given [path].
  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) {
    return _dio.get<T>(
      path,
      queryParameters: queryParameters,
      options: options,
    );
  }

  /// Performs a POST request to the given [path].
  Future<Response<T>> post<T>(
    String path, {
    Object? data,
    Options? options,
  }) {
    return _dio.post<T>(
      path,
      data: data,
      options: options,
    );
  }

  /// Performs a PUT request to the given [path].
  Future<Response<T>> put<T>(
    String path, {
    Object? data,
    Options? options,
  }) {
    return _dio.put<T>(
      path,
      data: data,
      options: options,
    );
  }

  /// Performs a PATCH request to the given [path].
  Future<Response<T>> patch<T>(
    String path, {
    Object? data,
    Options? options,
  }) {
    return _dio.patch<T>(
      path,
      data: data,
      options: options,
    );
  }

  /// Performs a DELETE request to the given [path].
  Future<Response<T>> delete<T>(
    String path, {
    Object? data,
    Options? options,
  }) {
    return _dio.delete<T>(
      path,
      data: data,
      options: options,
    );
  }
}
