import '../domain/user.dart';

/// Authentication state.
///
/// Sealed class hierarchy enabling exhaustive `switch` handling
/// in the UI layer for all possible auth states.
sealed class AuthState {
  const AuthState();
}

/// Initial state before any auth check has been performed.
final class Initial extends AuthState {
  /// Creates the [Initial] auth state.
  const Initial();
}

/// Authentication check or operation is in progress.
final class Loading extends AuthState {
  /// Creates the [Loading] auth state.
  const Loading();
}

/// User is authenticated.
final class Authenticated extends AuthState {
  /// Creates the [Authenticated] auth state.
  const Authenticated({required this.user});

  /// The authenticated user.
  final User user;
}

/// User is not authenticated.
final class Unauthenticated extends AuthState {
  /// Creates the [Unauthenticated] auth state.
  const Unauthenticated();
}

/// An error occurred during authentication.
final class AuthErrorState extends AuthState {
  /// Creates the [AuthErrorState].
  const AuthErrorState({required this.message});

  /// The error message to display.
  final String message;
}
