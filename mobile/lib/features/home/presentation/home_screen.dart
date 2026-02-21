import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:international_draughts/core/routing/router.dart';
import 'package:international_draughts/core/theme/design_tokens.dart';
import 'package:international_draughts/shared/widgets/settings_action_button.dart';

/// Home screen — the main landing page of the app.
///
/// Provides navigation to play, learn, tutorial, settings, and profile.
class HomeScreen extends StatelessWidget {
  /// Creates the [HomeScreen].
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('International Draughts'),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_outline),
            tooltip: 'Profile',
            onPressed: () => context.push(AppRoutes.profile),
          ),
          const SettingsActionButton(),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(DesignTokens.spacingLg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: DesignTokens.spacingXl),

              // Logo / title area
              Icon(
                Icons.sports_esports,
                size: 80,
                color: Theme.of(context).colorScheme.primary,
              ),
              const SizedBox(height: DesignTokens.spacingMd),
              Text(
                'International Draughts',
                style: Theme.of(context).textTheme.headlineMedium,
                textAlign: TextAlign.center,
              ),
              Text(
                '10×10 Board Game',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                textAlign: TextAlign.center,
              ),

              const Spacer(),

              // Navigation buttons
              _HomeButton(
                icon: Icons.play_arrow,
                label: 'Play vs AI',
                onPressed: () => context.push(AppRoutes.play),
              ),
              const SizedBox(height: DesignTokens.spacingMd),
              _HomeButton(
                icon: Icons.school,
                label: 'Learn',
                onPressed: () => context.push(AppRoutes.learn),
              ),
              const SizedBox(height: DesignTokens.spacingMd),
              _HomeButton(
                icon: Icons.help_outline,
                label: 'Tutorial',
                onPressed: () => context.push(AppRoutes.tutorial),
              ),

              const Spacer(),
            ],
          ),
        ),
      ),
    );
  }
}

class _HomeButton extends StatelessWidget {
  const _HomeButton({
    required this.icon,
    required this.label,
    required this.onPressed,
  });

  final IconData icon;
  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return FilledButton.icon(
      onPressed: onPressed,
      icon: Icon(icon),
      label: Text(label),
      style: FilledButton.styleFrom(
        padding: const EdgeInsets.symmetric(
          vertical: DesignTokens.spacingMd,
        ),
        textStyle: Theme.of(context).textTheme.titleMedium,
      ),
    );
  }
}
