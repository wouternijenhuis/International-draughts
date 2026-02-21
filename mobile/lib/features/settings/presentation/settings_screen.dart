import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:international_draughts/core/theme/board_theme.dart';
import 'package:international_draughts/core/theme/design_tokens.dart';
import 'package:international_draughts/features/auth/domain/auth_state.dart';
import 'package:international_draughts/features/auth/presentation/auth_provider.dart';

import 'settings_provider.dart';

/// Animation speed preset for the segmented selector.
enum _AnimationPreset {
  instant('Instant', 0.0),
  fast('Fast', 0.5),
  normal('Normal', 1.0),
  slow('Slow', 2.0);

  const _AnimationPreset(this.label, this.value);
  final String label;
  final double value;
}

/// Settings screen for configuring app preferences.
///
/// Allows the user to change board theme (with color previews),
/// toggle notation and legal move highlights, select animation speed
/// (4-segment), toggle dark mode, and sync to backend for registered users.
class SettingsScreen extends ConsumerWidget {
  /// Creates the [SettingsScreen].
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(settingsProvider);
    final notifier = ref.read(settingsProvider.notifier);
    final authState = ref.watch(authProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        padding: const EdgeInsets.all(DesignTokens.spacingMd),
        children: [
          // Board theme
          Text('Board Theme', style: theme.textTheme.titleMedium),
          const SizedBox(height: DesignTokens.spacingSm),
          Wrap(
            spacing: DesignTokens.spacingSm,
            runSpacing: DesignTokens.spacingSm,
            children: BoardTheme.all.map((boardTheme) {
              final isSelected = boardTheme.name == settings.boardThemeName;
              return ChoiceChip(
                label: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Color preview
                    Container(
                      width: 16,
                      height: 16,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(2),
                        border: Border.all(
                          color: theme.colorScheme.outline,
                          width: 0.5,
                        ),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Container(
                              decoration: BoxDecoration(
                                color: boardTheme.lightSquare,
                                borderRadius: const BorderRadius.only(
                                  topLeft: Radius.circular(1.5),
                                  bottomLeft: Radius.circular(1.5),
                                ),
                              ),
                            ),
                          ),
                          Expanded(
                            child: Container(
                              decoration: BoxDecoration(
                                color: boardTheme.darkSquare,
                                borderRadius: const BorderRadius.only(
                                  topRight: Radius.circular(1.5),
                                  bottomRight: Radius.circular(1.5),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: DesignTokens.spacingSm),
                    Text(boardTheme.name),
                  ],
                ),
                selected: isSelected,
                onSelected: (selected) {
                  if (selected) {
                    notifier.setBoardTheme(boardTheme.name);
                    _syncIfAuthenticated(ref, authState);
                  }
                },
              );
            }).toList(),
          ),
          const SizedBox(height: DesignTokens.spacingLg),

          // Display options
          Text('Display', style: theme.textTheme.titleMedium),
          SwitchListTile(
            title: const Text('Show Notation'),
            subtitle: const Text('Display square numbers on the board'),
            value: settings.showNotation,
            onChanged: (value) {
              notifier.setShowNotation(value);
              _syncIfAuthenticated(ref, authState);
            },
          ),
          SwitchListTile(
            title: const Text('Show Legal Moves'),
            subtitle:
                const Text('Highlight available moves for selected piece'),
            value: settings.showLegalMoves,
            onChanged: (value) {
              notifier.setShowLegalMoves(value);
              _syncIfAuthenticated(ref, authState);
            },
          ),
          const SizedBox(height: DesignTokens.spacingMd),

          // Animation speed (segmented)
          Text('Animation Speed', style: theme.textTheme.titleMedium),
          const SizedBox(height: DesignTokens.spacingSm),
          SegmentedButton<_AnimationPreset>(
            segments: _AnimationPreset.values.map((preset) {
              return ButtonSegment<_AnimationPreset>(
                value: preset,
                label: Text(preset.label),
              );
            }).toList(),
            selected: {_currentPreset(settings.animationSpeed)},
            onSelectionChanged: (selected) {
              final preset = selected.first;
              notifier.setAnimationSpeed(preset.value);
              _syncIfAuthenticated(ref, authState);
            },
          ),
          const SizedBox(height: DesignTokens.spacingLg),

          // Appearance
          Text('Appearance', style: theme.textTheme.titleMedium),
          SwitchListTile(
            title: const Text('Dark Mode'),
            subtitle: const Text('Use dark theme throughout the app'),
            value: settings.isDarkMode,
            onChanged: (value) {
              notifier.setDarkMode(value);
              _syncIfAuthenticated(ref, authState);
            },
          ),

          // Account section (only for authenticated users)
          if (authState is Authenticated) ...[
            const SizedBox(height: DesignTokens.spacingLg),
            Text('Account', style: theme.textTheme.titleMedium),
            const SizedBox(height: DesignTokens.spacingSm),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(DesignTokens.spacingMd),
                child: Row(
                  children: [
                    const Icon(
                      Icons.cloud_done,
                      color: DesignTokens.successColor,
                      size: 20,
                    ),
                    const SizedBox(width: DesignTokens.spacingSm),
                    Expanded(
                      child: Text(
                        'Settings sync to your account automatically.',
                        style: theme.textTheme.bodySmall,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  _AnimationPreset _currentPreset(double speed) {
    if (speed <= 0.0) return _AnimationPreset.instant;
    if (speed <= 0.75) return _AnimationPreset.fast;
    if (speed <= 1.5) return _AnimationPreset.normal;
    return _AnimationPreset.slow;
  }

  /// Syncs settings to backend if the user is authenticated.
  void _syncIfAuthenticated(WidgetRef ref, AuthState authState) {
    if (authState is! Authenticated) return;
    // Backend sync is handled by the settings provider/repository.
    // Placeholder for PUT /api/settings/{userId} call.
  }
}
