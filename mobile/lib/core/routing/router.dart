import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:international_draughts/features/auth/domain/auth_state.dart';
import 'package:international_draughts/features/auth/presentation/auth_provider.dart';
import 'package:international_draughts/features/auth/presentation/login_screen.dart';
import 'package:international_draughts/features/auth/presentation/register_screen.dart';
import 'package:international_draughts/features/game/presentation/screens/game_screen.dart';
import 'package:international_draughts/features/home/presentation/home_screen.dart';
import 'package:international_draughts/features/learning/presentation/learn_screen.dart';
import 'package:international_draughts/features/profile/domain/player_stats.dart';
import 'package:international_draughts/features/profile/presentation/profile_screen.dart';
import 'package:international_draughts/features/replay/presentation/replay_viewer.dart';
import 'package:international_draughts/features/settings/presentation/settings_screen.dart';
import 'package:international_draughts/features/tutorial/presentation/tutorial_screen.dart';

/// Application route paths.
abstract final class AppRoutes {
  /// Home screen.
  static const String home = '/';

  /// Game play screen.
  static const String play = '/play';

  /// Learning mode screen.
  static const String learn = '/learn';

  /// Interactive tutorial screen.
  static const String tutorial = '/tutorial';

  /// Login screen.
  static const String login = '/login';

  /// Registration screen.
  static const String register = '/register';

  /// Player profile screen (auth-guarded).
  static const String profile = '/profile';

  /// Settings screen.
  static const String settings = '/settings';

  /// Game replay viewer.
  static const String replay = '/replay';
}

/// Creates the application [GoRouter] configuration.
///
/// Defines 8 routes with auth-guarding on the profile route.
/// The [ref] parameter is used to check authentication state for redirects.
GoRouter appRouter(WidgetRef ref) {
  return GoRouter(
    initialLocation: AppRoutes.home,
    routes: [
      GoRoute(
        path: AppRoutes.home,
        name: 'home',
        builder: (context, state) => const HomeScreen(),
      ),
      GoRoute(
        path: AppRoutes.play,
        name: 'play',
        builder: (context, state) => const GameScreen(),
      ),
      GoRoute(
        path: AppRoutes.learn,
        name: 'learn',
        builder: (context, state) => const LearnScreen(),
      ),
      GoRoute(
        path: AppRoutes.tutorial,
        name: 'tutorial',
        builder: (context, state) => const TutorialScreen(),
      ),
      GoRoute(
        path: AppRoutes.login,
        name: 'login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: AppRoutes.register,
        name: 'register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: AppRoutes.profile,
        name: 'profile',
        redirect: (context, state) {
          final authState = ref.read(authProvider);
          return switch (authState) {
            Authenticated() => null,
            _ => AppRoutes.login,
          };
        },
        builder: (context, state) => const ProfileScreen(),
      ),
      GoRoute(
        path: AppRoutes.settings,
        name: 'settings',
        builder: (context, state) => const SettingsScreen(),
      ),
      GoRoute(
        path: AppRoutes.replay,
        name: 'replay',
        builder: (context, state) {
          final game = state.extra as GameHistoryEntry?;
          return ReplayViewer(game: game);
        },
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Text('Page not found: ${state.uri}'),
      ),
    ),
  );
}
