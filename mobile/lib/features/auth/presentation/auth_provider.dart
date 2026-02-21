import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:international_draughts/core/di/providers.dart';
import 'package:international_draughts/core/errors/result.dart';
import '../data/auth_repository.dart';
import '../domain/auth_state.dart';

/// Manages authentication state transitions.
///
/// Provides login, register, logout, and token refresh operations.
/// Depends on [AuthRepository] via [authRepositoryProvider].
class AuthNotifier extends StateNotifier<AuthState> {
  /// Creates an [AuthNotifier].
  AuthNotifier(this._ref) : super(const Initial()) {
    _checkExistingSession();
  }

  final Ref _ref;

  AuthRepository get _authRepository => _ref.read(authRepositoryProvider);

  /// Checks for an existing session on startup.
  Future<void> _checkExistingSession() async {
    final hasTokens = await _authRepository.hasStoredTokens();
    if (!hasTokens) {
      state = const Unauthenticated();
      return;
    }

    state = const Loading();
    final result = await _authRepository.refreshTokens();
    state = switch (result) {
      Success() => const Unauthenticated(), // Need user data; will re-auth.
      Failure() => const Unauthenticated(),
    };
  }

  /// Logs in with [email] and [password].
  Future<void> login({
    required String email,
    required String password,
  }) async {
    state = const Loading();
    final result = await _authRepository.login(
      email: email,
      password: password,
    );
    state = switch (result) {
      Success(:final value) => Authenticated(user: value),
      Failure(:final error) => AuthErrorState(message: error.message),
    };
  }

  /// Registers a new account with [email], [password], and optional [username].
  Future<void> register({
    required String email,
    required String password,
    String? username,
  }) async {
    state = const Loading();
    final result = await _authRepository.register(
      email: email,
      password: password,
      username: username,
    );
    state = switch (result) {
      Success(:final value) => Authenticated(user: value),
      Failure(:final error) => AuthErrorState(message: error.message),
    };
  }

  /// Logs out and clears stored tokens.
  Future<void> logout() async {
    await _authRepository.logout();
    state = const Unauthenticated();
  }

  /// Refreshes the authentication token.
  Future<void> refresh() async {
    final result = await _authRepository.refreshTokens();
    if (result.isFailure) {
      state = const Unauthenticated();
    }
  }
}

/// Provider for the authentication state.
///
/// Depends on: [authRepositoryProvider].
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref);
});
