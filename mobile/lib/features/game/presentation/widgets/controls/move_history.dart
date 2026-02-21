import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:international_draughts/core/theme/design_tokens.dart';
import '../../../domain/game_phase.dart';
import '../../../domain/move_record.dart';
import '../../providers/game_provider.dart';

/// Displays the list of moves made in the current game.
///
/// Shows paired move notation (White, Black) in a scrollable horizontal
/// list with the current move highlighted. Auto-scrolls to the latest move.
class MoveHistory extends ConsumerStatefulWidget {
  /// Creates a [MoveHistory] widget.
  const MoveHistory({super.key});

  @override
  ConsumerState<MoveHistory> createState() => _MoveHistoryState();
}

class _MoveHistoryState extends ConsumerState<MoveHistory> {
  final ScrollController _scrollController = ScrollController();

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final phase = ref.watch(gameProvider);
    final gameNotifier = ref.read(gameProvider.notifier);

    List<MoveRecord> moves;
    if (phase is InProgress) {
      moves = gameNotifier.moveRecords;
    } else {
      moves = gameNotifier.moveRecords;
    }

    if (moves.isEmpty) {
      return const Padding(
        padding: EdgeInsets.all(DesignTokens.spacingMd),
        child: Text(
          'No moves yet',
          style: TextStyle(fontStyle: FontStyle.italic),
        ),
      );
    }

    // Build paired moves (1. White Black, 2. White Black, …).
    final pairs = <_MovePair>[];
    for (var i = 0; i < moves.length; i += 2) {
      pairs.add(_MovePair(
        number: (i ~/ 2) + 1,
        white: moves[i].notation,
        black: i + 1 < moves.length ? moves[i + 1].notation : null,
      ),);
    }

    // Auto-scroll to latest after build.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });

    final currentMoveIdx = gameNotifier.moveIndex - 1; // 0-based move record index

    return SizedBox(
      height: 60,
      child: ListView.builder(
        controller: _scrollController,
        scrollDirection: Axis.horizontal,
        itemCount: pairs.length,
        padding: const EdgeInsets.symmetric(
          horizontal: DesignTokens.spacingSm,
        ),
        itemBuilder: (context, index) {
          final pair = pairs[index];
          final whiteIdx = index * 2;
          final blackIdx = index * 2 + 1;
          final isWhiteCurrent = whiteIdx == currentMoveIdx;
          final isBlackCurrent = blackIdx == currentMoveIdx;

          return Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: DesignTokens.spacingXs,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Move number.
                Text(
                  '${pair.number}.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                ),
                const SizedBox(width: 4),
                // White's move.
                _MoveChip(
                  notation: pair.white,
                  isCurrent: isWhiteCurrent,
                ),
                if (pair.black != null) ...[
                  const SizedBox(width: 4),
                  // Black's move.
                  _MoveChip(
                    notation: pair.black!,
                    isCurrent: isBlackCurrent,
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

class _MovePair {
  const _MovePair({
    required this.number,
    required this.white,
    this.black,
  });

  final int number;
  final String white;
  final String? black;
}

class _MoveChip extends StatelessWidget {
  const _MoveChip({
    required this.notation,
    required this.isCurrent,
  });

  final String notation;
  final bool isCurrent;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: isCurrent
            ? Theme.of(context).colorScheme.primaryContainer
            : Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(DesignTokens.radiusSm),
      ),
      child: Text(
        notation,
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
              fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
      ),
    );
  }
}
