import 'app_error.dart';
export 'app_error.dart';

/// A Result type for error handling without exceptions.
///
/// Encapsulates either a successful value or an [AppError].
/// Use exhaustive pattern matching to handle both cases.
///
/// ```dart
/// final result = await repository.fetchData();
/// return switch (result) {
///   Success(:final value) => Text(value.toString()),
///   Failure(:final error) => ErrorWidget(error: error),
/// };
/// ```
sealed class Result<T> {
  const Result();

  /// Creates a successful result with the given [value].
  const factory Result.success(T value) = Success<T>;

  /// Creates a failure result with the given [error].
  const factory Result.failure(AppError error) = Failure<T>;

  /// Whether this result is a success.
  bool get isSuccess => this is Success<T>;

  /// Whether this result is a failure.
  bool get isFailure => this is Failure<T>;

  /// Maps the success value using [transform], preserving failures.
  Result<U> map<U>(U Function(T value) transform) {
    return switch (this) {
      Success(:final value) => Result.success(transform(value)),
      Failure(:final error) => Result.failure(error),
    };
  }

  /// Flat-maps the success value, preserving failures.
  Result<U> flatMap<U>(Result<U> Function(T value) transform) {
    return switch (this) {
      Success(:final value) => transform(value),
      Failure(:final error) => Result.failure(error),
    };
  }

  /// Returns the success value or the result of [orElse] on failure.
  T getOrElse(T Function(AppError error) orElse) {
    return switch (this) {
      Success(:final value) => value,
      Failure(:final error) => orElse(error),
    };
  }
}

/// A successful result containing [value].
final class Success<T> extends Result<T> {
  /// Creates a success with the given [value].
  const Success(this.value);

  /// The successful value.
  final T value;
}

/// A failure result containing an [error].
final class Failure<T> extends Result<T> {
  /// Creates a failure with the given [error].
  const Failure(this.error);

  /// The error that occurred.
  final AppError error;
}


