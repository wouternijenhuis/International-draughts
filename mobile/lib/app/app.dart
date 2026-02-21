import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:international_draughts/core/routing/router.dart';
import 'package:international_draughts/core/theme/app_theme.dart';
import 'package:international_draughts/features/settings/presentation/settings_provider.dart';
import 'package:international_draughts/shared/widgets/offline_banner.dart';

/// The root application widget.
///
/// Sets up [MaterialApp.router] with GoRouter, theming, Riverpod
/// integration, and offline detection for the International Draughts mobile app.
class InternationalDraughtsApp extends ConsumerWidget {
  /// Creates the root application widget.
  const InternationalDraughtsApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(settingsProvider);
    final isDarkMode = settings.isDarkMode;

    return MaterialApp.router(
      title: 'International Draughts',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: isDarkMode ? ThemeMode.dark : ThemeMode.light,
      routerConfig: appRouter(ref),
      builder: (context, child) {
        return OfflineBanner(
          child: child ?? const SizedBox.shrink(),
        );
      },
    );
  }
}
