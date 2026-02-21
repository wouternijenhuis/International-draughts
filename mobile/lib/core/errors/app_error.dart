/// Typed application errors.
///
/// Uses a sealed class hierarchy so that error handling can be
/// exhaustive via `switch` expressions.
sealed class AppError {
  const AppError({required this.message, this.stackTrace});

  /// Human-readable error description.
  final String message;

  /// Stack trace at the point of error, if available.
  final StackTrace? stackTrace;

  @override
  String toString() => '$runtimeType: $message';
}

/// Network-related error (no connectivity, DNS, timeout).
final class NetworkError extends AppError {
  /// Creates a [NetworkError].
  const NetworkError({required super.message, super.stackTrace});
}

/// Server returned an unexpected error.
final class ServerError extends AppError {
  /// Creates a [ServerError].
  const ServerError({
    required super.message,
    required this.statusCode, super.stackTrace,
  });

  /// The HTTP status code.
  final int statusCode;
}

/// Authentication/authorization error.
final class AuthError extends AppError {
  /// Creates an [AuthError].
  const AuthError({required super.message, super.stackTrace});
}

/// Input validation error.
final class ValidationError extends AppError {
  /// Creates a [ValidationError].
  const ValidationError({
    required super.message,
    super.stackTrace,
    this.fieldErrors = const {},
  });

  /// Per-field error messages.
  final Map<String, List<String>> fieldErrors;
}

/// Local storage error (SharedPreferences, SecureStorage).
final class StorageError extends AppError {
  /// Creates a [StorageError].
  const StorageError({required super.message, super.stackTrace});
}

/// An unexpected/unknown error.
final class UnknownError extends AppError {
  /// Creates an [UnknownError].
  const UnknownError({required super.message, super.stackTrace});
}
