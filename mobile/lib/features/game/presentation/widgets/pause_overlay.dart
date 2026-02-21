import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:international_draughts/core/theme/design_tokens.dart';
import '../providers/clock_provider.dart';

/// Full-screen overlay displayed when the game is paused.
///
/// Hides the board to prevent peeking while paused.
/// Provides a resume button and accessible semantics.
class PauseOverlay extends ConsumerWidget {
  /// Creates a [PauseOverlay].
  const PauseOverlay({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Semantics(
      label: 'Game paused. Tap resume to continue.',
      child: Container(
        color: Theme.of(context).colorScheme.surface.withValues(alpha: 0.95),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.pause_circle_filled,
                size: 80,
                color: Theme.of(context).colorScheme.primary,
              ),
              const SizedBox(height: DesignTokens.spacingLg),
              Text(
                'Game Paused',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: DesignTokens.spacingSm),
              Text(
                'The board is hidden while paused.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withValues(alpha: 0.6),
                    ),
              ),
              const SizedBox(height: DesignTokens.spacingXl),
              Semantics(
                button: true,
                label: 'Resume game',
                child: FilledButton.icon(
                  onPressed: () {
                    ref.read(clockProvider.notifier).resume();
                  },
                  icon: const Icon(Icons.play_arrow),
                  label: const Text('Resume'),
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(
                      horizontal: DesignTokens.spacingXl,
                      vertical: DesignTokens.spacingMd,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
