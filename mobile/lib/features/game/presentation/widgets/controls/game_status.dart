import 'package:draughts_engine/draughts_engine.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../domain/game_phase.dart';
import '../../providers/ai_provider.dart';
import '../../providers/game_provider.dart';

/// Displays the current game status with turn indicator dot,
/// status text, and move count.
///
/// Uses [Semantics] `liveRegion` for accessibility announcements.
class GameStatus extends ConsumerWidget {
  /// Creates a [GameStatus] widget.
  const GameStatus({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final phase = ref.watch(gameProvider);
    final aiState = ref.watch(aiProvider);

    final String statusText;
    final Color? dotColor;
    final String moveCountText;

    switch (phase) {
      case NotStarted():
        statusText = 'Start a new game';
        dotColor = null;
        moveCountText = '';
      case InProgress(:final gameState):
        final isWhiteTurn = gameState.currentPlayer == PlayerColor.white;
        if (aiState.isThinking) {
          statusText = 'AI is thinking…';
        } else {
          statusText = isWhiteTurn ? "White's turn" : "Black's turn";
        }
        dotColor = isWhiteTurn
            ? Theme.of(context).colorScheme.tertiary
            : Theme.of(context).colorScheme.onSurfaceVariant;
        final totalMoves = (gameState.moveHistory.length + 1) ~/ 2;
        moveCountText = 'Move $totalMoves';
      case WhiteWins(:final reason):
        statusText = 'White wins! $reason';
        dotColor = Theme.of(context).colorScheme.tertiary;
        moveCountText = '';
      case BlackWins(:final reason):
        statusText = 'Black wins! $reason';
        dotColor = Theme.of(context).colorScheme.onSurfaceVariant;
        moveCountText = '';
      case DrawResult(:final reason):
        statusText = 'Draw — $reason';
        dotColor = null;
        moveCountText = '';
    }

    return Semantics(
      liveRegion: true,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (dotColor != null) ...[
              Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  color: dotColor,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.black26),
                ),
              ),
              const SizedBox(width: 8),
            ],
            Flexible(
              child: Text(
                statusText,
                style: Theme.of(context).textTheme.titleMedium,
                textAlign: TextAlign.center,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            if (moveCountText.isNotEmpty) ...[
              const SizedBox(width: 12),
              Text(
                moveCountText,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
