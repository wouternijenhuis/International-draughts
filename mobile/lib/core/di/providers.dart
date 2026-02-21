import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:international_draughts/core/network/api_client.dart';
import 'package:international_draughts/core/network/auth_interceptor.dart';
import 'package:international_draughts/features/auth/data/auth_repository.dart';
import 'package:international_draughts/features/auth/data/secure_token_storage.dart';
import 'package:international_draughts/features/profile/data/profile_repository.dart';

/// Provider for [SecureTokenStorage].
final secureTokenStorageProvider = Provider<SecureTokenStorage>((ref) {
  return SecureTokenStorage();
});

/// Provider for the [AuthInterceptor].
final authInterceptorProvider = Provider<AuthInterceptor>((ref) {
  final tokenStorage = ref.watch(secureTokenStorageProvider);
  return AuthInterceptor(tokenStorage: tokenStorage);
});

/// Provider for the [ApiClient].
final apiClientProvider = Provider<ApiClient>((ref) {
  final authInterceptor = ref.watch(authInterceptorProvider);
  return ApiClient(authInterceptor: authInterceptor);
});

/// Provider for the [AuthRepository].
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  final tokenStorage = ref.watch(secureTokenStorageProvider);
  return AuthRepository(
    apiClient: apiClient,
    tokenStorage: tokenStorage,
  );
});

/// Provider for the [ProfileRepository].
final profileRepositoryProvider = Provider<ProfileRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return ProfileRepository(apiClient: apiClient);
});
