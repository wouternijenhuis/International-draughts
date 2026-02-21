import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:international_draughts/core/network/api_exception.dart';

import 'app_error.dart';

/// Centralized error handler for converting exceptions to typed [AppError]s.
///
/// Maps [DioException], [ApiException], and generic exceptions into the
/// appropriate [AppError] subtype.
abstract final class ErrorHandler {
  /// Converts an arbitrary exception into a typed [AppError].
  static AppError handle(Object error, [StackTrace? stackTrace]) {
    debugPrint('ErrorHandler: $error');

    if (error is AppError) return error;

    if (error is DioException) {
      return _handleDioError(error, stackTrace);
    }

    if (error is ApiException) {
      return _handleApiException(error, stackTrace);
    }

    return UnknownError(
      message: error.toString(),
      stackTrace: stackTrace,
    );
  }

  static AppError _handleDioError(DioException error, StackTrace? stackTrace) {
    return switch (error.type) {
      DioExceptionType.connectionTimeout ||
      DioExceptionType.sendTimeout ||
      DioExceptionType.receiveTimeout =>
        NetworkError(
          message: 'Request timed out. Please check your connection.',
          stackTrace: stackTrace,
        ),
      DioExceptionType.connectionError =>
        NetworkError(
          message: 'Unable to connect to the server.',
          stackTrace: stackTrace,
        ),
      DioExceptionType.badResponse => _handleStatusCode(
          error.response?.statusCode,
          error.response?.data?.toString() ?? 'Server error',
          stackTrace,
        ),
      _ => NetworkError(
          message: error.message ?? 'Network error occurred.',
          stackTrace: stackTrace,
        ),
    };
  }

  static AppError _handleStatusCode(
    int? statusCode,
    String message,
    StackTrace? stackTrace,
  ) {
    return switch (statusCode) {
      null => ServerError(
          message: message,
          statusCode: 0,
          stackTrace: stackTrace,
        ),
      401 || 403 => AuthError(
          message: 'Authentication failed. Please log in again.',
          stackTrace: stackTrace,
        ),
      404 => ServerError(
          message: 'Resource not found.',
          statusCode: statusCode,
          stackTrace: stackTrace,
        ),
      422 => ValidationError(
          message: message,
          stackTrace: stackTrace,
        ),
      >= 500 => ServerError(
          message: 'Server error. Please try again later.',
          statusCode: statusCode,
          stackTrace: stackTrace,
        ),
      _ => ServerError(
          message: message,
          statusCode: statusCode,
          stackTrace: stackTrace,
        ),
    };
  }

  static AppError _handleApiException(
    ApiException error,
    StackTrace? stackTrace,
  ) {
    return switch (error) {
      NetworkException() => NetworkError(
          message: error.message,
          stackTrace: stackTrace,
        ),
      UnauthorizedException() => AuthError(
          message: error.message,
          stackTrace: stackTrace,
        ),
      ValidationException(:final errors) => ValidationError(
          message: error.message,
          fieldErrors: errors,
          stackTrace: stackTrace,
        ),
      ServerException(:final statusCode) => ServerError(
          message: error.message,
          statusCode: statusCode,
          stackTrace: stackTrace,
        ),
      TimeoutException() => NetworkError(
          message: error.message,
          stackTrace: stackTrace,
        ),
    };
  }
}
