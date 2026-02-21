import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:international_draughts/core/di/providers.dart';
import 'package:international_draughts/core/errors/result.dart';
import '../data/profile_repository.dart';
import '../domain/player_profile.dart';
import '../domain/player_stats.dart';

/// State for the profile screen.
class ProfileState {
  /// Creates a [ProfileState].
  const ProfileState({
    this.profile,
    this.stats,
    this.ratingHistory = const [],
    this.isLoading = false,
    this.error,
  });

  /// The player's profile data.
  final PlayerProfile? profile;

  /// The player's game statistics.
  final PlayerStats? stats;

  /// Rating history entries for the chart.
  final List<RatingHistoryEntry> ratingHistory;

  /// Whether data is currently loading.
  final bool isLoading;

  /// Error message, if any.
  final String? error;

  /// Creates a copy with the given fields replaced.
  ProfileState copyWith({
    PlayerProfile? profile,
    PlayerStats? stats,
    List<RatingHistoryEntry>? ratingHistory,
    bool? isLoading,
    String? error,
  }) {
    return ProfileState(
      profile: profile ?? this.profile,
      stats: stats ?? this.stats,
      ratingHistory: ratingHistory ?? this.ratingHistory,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

/// Manages profile screen state and data fetching.
class ProfileNotifier extends StateNotifier<ProfileState> {
  /// Creates a [ProfileNotifier].
  ProfileNotifier(this._ref) : super(const ProfileState());

  final Ref _ref;

  ProfileRepository get _profileRepository =>
      _ref.read(profileRepositoryProvider);

  /// Loads the full profile data for the given [userId].
  Future<void> loadProfile(String userId) async {
    state = state.copyWith(isLoading: true);

    // Fetch profile, stats, and rating history in parallel.
    final results = await Future.wait([
      _profileRepository.getProfile(userId),
      _profileRepository.getStats(userId),
      _profileRepository.getRatingHistory(userId),
    ]);

    final profileResult = results[0] as Result<PlayerProfile>;
    final statsResult = results[1] as Result<PlayerStats>;
    final historyResult = results[2] as Result<List<RatingHistoryEntry>>;

    state = ProfileState(
      profile: switch (profileResult) {
        Success(:final value) => value,
        Failure() => null,
      },
      stats: switch (statsResult) {
        Success(:final value) => value,
        Failure() => null,
      },
      ratingHistory: switch (historyResult) {
        Success(:final value) => value,
        Failure() => const [],
      },
      error: switch (profileResult) {
        Success() => null,
        Failure(:final error) => error.message,
      },
    );
  }

  /// Updates the display name.
  Future<void> updateDisplayName(String userId, String displayName) async {
    final result =
        await _profileRepository.updateDisplayName(userId, displayName);
    if (result.isSuccess && state.profile != null) {
      state = state.copyWith(
        profile: state.profile!.copyWith(displayName: displayName),
      );
    }
  }

  /// Updates the avatar emoji.
  Future<void> updateAvatar(String userId, String avatar) async {
    final result = await _profileRepository.updateAvatar(userId, avatar);
    if (result.isSuccess && state.profile != null) {
      state = state.copyWith(
        profile: state.profile!.copyWith(avatar: avatar),
      );
    }
  }
}

/// Provider for the profile state.
final profileProvider =
    StateNotifierProvider<ProfileNotifier, ProfileState>((ref) {
  return ProfileNotifier(ref);
});
