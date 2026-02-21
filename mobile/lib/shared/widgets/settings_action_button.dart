import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:international_draughts/core/routing/router.dart';

/// Reusable AppBar action button that navigates to the Settings screen.
///
/// Drop into any screen's `AppBar.actions` list:
/// ```dart
/// AppBar(
///   title: const Text('Screen Title'),
///   actions: [const SettingsActionButton()],
/// )
/// ```
class SettingsActionButton extends StatelessWidget {
  /// Creates a [SettingsActionButton].
  const SettingsActionButton({super.key});

  @override
  Widget build(BuildContext context) {
    return IconButton(
      icon: const Icon(Icons.settings_outlined),
      tooltip: 'Settings',
      onPressed: () => context.push(AppRoutes.settings),
    );
  }
}
