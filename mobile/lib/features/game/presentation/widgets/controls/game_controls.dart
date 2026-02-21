import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:international_draughts/core/theme/design_tokens.dart';
import '../../../domain/game_phase.dart';
import '../../providers/ai_provider.dart';
import '../../providers/game_provider.dart';

/// Game control buttons (resign, draw, undo, redo, new game).
///
/// Buttons are enabled/disabled based on the current game state.
class GameControls extends ConsumerWidget {
  /// Creates [GameControls].
  const GameControls({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final phase = ref.watch(gameProvider);
    final aiState = ref.watch(aiProvider);
    final gameNotifier = ref.read(gameProvider.notifier);

    final isInProgress = phase is InProgress;
    final isAiThinking = aiState.isThinking;

    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: DesignTokens.spacingMd,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          // Resign.
          IconButton.outlined(
            icon: const Icon(Icons.flag),
            tooltip: 'Resign',
            onPressed: isInProgress && !isAiThinking
                ? () => _confirmResign(context, gameNotifier)
                : null,
          ),
          // Draw offer.
          IconButton.outlined(
            icon: const Icon(Icons.handshake),
            tooltip: 'Offer Draw',
            onPressed: isInProgress && !isAiThinking
                ? gameNotifier.offerDraw
                : null,
          ),
          // Undo.
          IconButton.filledTonal(
            icon: const Icon(Icons.undo),
            tooltip: 'Undo',
            onPressed: gameNotifier.canUndo && !isAiThinking
                ? () {
                    ref.read(aiProvider.notifier).cancel();
                    gameNotifier.undoMove();
                  }
                : null,
          ),
          // Redo.
          IconButton.filledTonal(
            icon: const Icon(Icons.redo),
            tooltip: 'Redo',
            onPressed: gameNotifier.canRedo && !isAiThinking
                ? gameNotifier.redoMove
                : null,
          ),
          // New Game.
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'New Game',
            onPressed: () => _confirmNewGame(context, gameNotifier, ref),
          ),
        ],
      ),
    );
  }

  void _confirmResign(BuildContext context, GameNotifier notifier) {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Resign?'),
        content: const Text('Are you sure you want to resign this game?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              notifier.resign();
            },
            child: const Text('Resign'),
          ),
        ],
      ),
    );
  }

  void _confirmNewGame(
    BuildContext context,
    GameNotifier notifier,
    WidgetRef ref,
  ) {
    final phase = ref.read(gameProvider);
    if (phase is InProgress) {
      showDialog<void>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('New Game?'),
          content: const Text(
            'Starting a new game will abandon the current one.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () {
                Navigator.of(ctx).pop();
                ref.read(aiProvider.notifier).cancel();
                notifier.reset();
              },
              child: const Text('New Game'),
            ),
          ],
        ),
      );
    } else {
      notifier.reset();
    }
  }
}
