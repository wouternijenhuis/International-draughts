/// Typed API exception for network errors.
///
/// Wraps HTTP error information into a structured exception that can be
/// pattern-matched or caught at the repository layer.
sealed class ApiException implements Exception {
  const ApiException({required this.message});

  /// Human-readable error message.
  final String message;

  @override
  String toString() => '$runtimeType: $message';
}

/// Network connectivity error (no internet, DNS failure, timeout).
final class NetworkException extends ApiException {
  /// Creates a [NetworkException].
  const NetworkException({required super.message});
}

/// Server returned an error status code.
final class ServerException extends ApiException {
  /// Creates a [ServerException].
  const ServerException({
    required super.message,
    required this.statusCode,
    this.responseBody,
  });

  /// HTTP status code.
  final int statusCode;

  /// Raw response body, if available.
  final String? responseBody;
}

/// Authentication error (401/403).
final class UnauthorizedException extends ApiException {
  /// Creates an [UnauthorizedException].
  const UnauthorizedException({required super.message});
}

/// Request was well-formed but server rejected it (422, validation errors).
final class ValidationException extends ApiException {
  /// Creates a [ValidationException].
  const ValidationException({
    required super.message,
    required this.errors,
  });

  /// Field-level validation errors.
  final Map<String, List<String>> errors;
}

/// Request timed out.
final class TimeoutException extends ApiException {
  /// Creates a [TimeoutException].
  const TimeoutException({required super.message});
}
