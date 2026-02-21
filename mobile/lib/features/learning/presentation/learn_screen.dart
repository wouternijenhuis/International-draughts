import 'package:draughts_engine/draughts_engine.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:international_draughts/core/theme/board_theme.dart';
import 'package:international_draughts/core/theme/design_tokens.dart';
import 'package:international_draughts/features/game/presentation/widgets/board/board_painter.dart';
import 'package:international_draughts/features/game/presentation/widgets/board/piece_widget.dart';
import '../data/tutorial_steps.dart';
import 'learning_provider.dart';

/// Learning mode screen for guided draughts instruction.
///
/// Displays interactive tutorial steps with a board, goal text,
/// hints, navigation, and progress indicator.
class LearnScreen extends ConsumerWidget {
  /// Creates the [LearnScreen].
  const LearnScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final learningState = ref.watch(learningProvider);
    final step = tutorialSteps[learningState.currentStep];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Learn'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Restart tutorial',
            onPressed: () {
              ref.read(learningProvider.notifier).restart();
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Progress indicator.
            _ProgressBar(
              currentStep: learningState.currentStep,
              totalSteps: learningState.totalSteps,
              completedSteps: learningState.completedSteps,
            ),

            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(DesignTokens.spacingMd),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Step title and description.
                    Text(
                      step.title,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: DesignTokens.spacingSm),
                    Text(
                      step.description,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),

                    // Details bullets.
                    if (step.details.isNotEmpty) ...[
                      const SizedBox(height: DesignTokens.spacingSm),
                      ...step.details.map((detail) => Padding(
                            padding: const EdgeInsets.only(
                              bottom: DesignTokens.spacingXs,
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '• ',
                                  style: TextStyle(
                                    color:
                                        Theme.of(context).colorScheme.primary,
                                  ),
                                ),
                                Expanded(
                                  child: Text(
                                    detail,
                                    style: Theme.of(context)
                                        .textTheme
                                        .bodySmall,
                                  ),
                                ),
                              ],
                            ),
                          ),),
                    ],

                    const SizedBox(height: DesignTokens.spacingMd),

                    // Interactive prompt.
                    if (step.goalAction.type != TutorialGoalType.info &&
                        !learningState.stepCompleted)
                      Padding(
                        padding: const EdgeInsets.only(
                          bottom: DesignTokens.spacingSm,
                        ),
                        child: Text(
                          'Your turn! Tap on a white piece to make the move.',
                          textAlign: TextAlign.center,
                          style: Theme.of(context)
                              .textTheme
                              .bodySmall
                              ?.copyWith(
                                color: Theme.of(context).colorScheme.primary,
                                fontWeight: FontWeight.w600,
                              ),
                        ),
                      ),

                    // Board.
                    Center(
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 400),
                        child: _LearningBoard(
                          board: ref
                              .read(learningProvider.notifier)
                              .currentBoard,
                          selectedSquare: learningState.selectedSquare,
                          legalMoveTargets: learningState.legalMoveTargets,
                          highlights: (learningState.showHint ||
                                  step.goalAction.type ==
                                      TutorialGoalType.info)
                              ? step.highlights
                              : const [],
                          onSquareTap: learningState.stepCompleted
                              ? null
                              : (sq) => ref
                                  .read(learningProvider.notifier)
                                  .onSquareTap(sq),
                        ),
                      ),
                    ),

                    // Feedback message.
                    if (learningState.feedbackMessage != null) ...[
                      const SizedBox(height: DesignTokens.spacingSm),
                      _FeedbackBanner(
                        message: learningState.feedbackMessage!,
                        type: learningState.feedbackType ?? 'neutral',
                      ),
                    ],

                    const SizedBox(height: DesignTokens.spacingMd),

                    // Hint button.
                    if (step.goalAction.type != TutorialGoalType.info &&
                        !learningState.stepCompleted &&
                        !learningState.showHint)
                      Center(
                        child: TextButton.icon(
                          onPressed: () {
                            ref.read(learningProvider.notifier).showHint();
                          },
                          icon: const Icon(Icons.lightbulb_outline, size: 18),
                          label: const Text('Show Hint'),
                        ),
                      ),
                  ],
                ),
              ),
            ),

            // Navigation bar.
            _NavigationBar(
              currentStep: learningState.currentStep,
              totalSteps: learningState.totalSteps,
              canAdvance: step.goalAction.type == TutorialGoalType.info ||
                  learningState.stepCompleted,
              onPrev: () => ref.read(learningProvider.notifier).prevStep(),
              onNext: () => ref.read(learningProvider.notifier).nextStep(),
            ),
          ],
        ),
      ),
    );
  }
}

/// Progress bar showing completed steps.
class _ProgressBar extends StatelessWidget {
  const _ProgressBar({
    required this.currentStep,
    required this.totalSteps,
    required this.completedSteps,
  });

  final int currentStep;
  final int totalSteps;
  final Set<int> completedSteps;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: DesignTokens.spacingMd,
        vertical: DesignTokens.spacingXs,
      ),
      child: Row(
        children: List.generate(totalSteps, (i) {
          final isCompleted = completedSteps.contains(i);
          final isCurrent = i == currentStep;
          return Expanded(
            child: Container(
              height: 4,
              margin: const EdgeInsets.symmetric(horizontal: 1),
              decoration: BoxDecoration(
                color: isCurrent
                    ? Theme.of(context).colorScheme.primary
                    : isCompleted
                        ? Theme.of(context)
                            .colorScheme
                            .primary
                            .withValues(alpha: 0.5)
                        : Theme.of(context).colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          );
        }),
      ),
    );
  }
}

/// Navigation bar with prev/next buttons and step counter.
class _NavigationBar extends StatelessWidget {
  const _NavigationBar({
    required this.currentStep,
    required this.totalSteps,
    required this.canAdvance,
    required this.onPrev,
    required this.onNext,
  });

  final int currentStep;
  final int totalSteps;
  final bool canAdvance;
  final VoidCallback onPrev;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(DesignTokens.spacingMd),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          TextButton.icon(
            onPressed: currentStep > 0 ? onPrev : null,
            icon: const Icon(Icons.arrow_back, size: 18),
            label: const Text('Previous'),
          ),
          Text(
            'Step ${currentStep + 1} of $totalSteps',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          if (currentStep < totalSteps - 1)
            FilledButton.icon(
              onPressed: canAdvance ? onNext : null,
              icon: const Icon(Icons.arrow_forward, size: 18),
              label: const Text('Next'),
            )
          else
            FilledButton.icon(
              onPressed: null,
              icon: const Icon(Icons.check, size: 18),
              label: const Text('Done!'),
            ),
        ],
      ),
    );
  }
}

/// Feedback banner for move results.
class _FeedbackBanner extends StatelessWidget {
  const _FeedbackBanner({
    required this.message,
    required this.type,
  });

  final String message;
  final String type;

  @override
  Widget build(BuildContext context) {
    final isSuccess = type == 'success';
    final color = isSuccess ? Colors.green : Colors.red;

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: DesignTokens.spacingMd,
        vertical: DesignTokens.spacingSm,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(DesignTokens.radiusMd),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            isSuccess ? Icons.check_circle : Icons.cancel,
            color: color,
            size: 20,
          ),
          const SizedBox(width: DesignTokens.spacingSm),
          Text(
            message,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: color,
                  fontWeight: FontWeight.w600,
                ),
          ),
        ],
      ),
    );
  }
}

/// Compact board widget for the learning screen.
class _LearningBoard extends StatelessWidget {
  const _LearningBoard({
    required this.board,
    this.selectedSquare,
    this.legalMoveTargets = const [],
    this.highlights = const [],
    this.onSquareTap,
  });

  final BoardPosition board;
  final int? selectedSquare;
  final List<int> legalMoveTargets;
  final List<int> highlights;
  final ValueChanged<int>? onSquareTap;

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 1.0,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final boardSize = constraints.maxWidth;
          final squareSize = boardSize / 10;

          return GestureDetector(
            onTapUp: (details) {
              if (onSquareTap == null) return;
              final sq = _positionToSquare(
                details.localPosition,
                squareSize,
              );
              if (sq != null) onSquareTap!(sq);
            },
            child: Stack(
              children: [
                // Board grid.
                CustomPaint(
                  size: Size(boardSize, boardSize),
                  painter: BoardPainter(
                    boardTheme: BoardTheme.classicWood,
                    selectedSquare: selectedSquare,
                    legalMoveTargets: [
                      ...legalMoveTargets,
                      ...highlights,
                    ],
                  ),
                ),
                // Pieces.
                ...List.generate(50, (index) {
                  final sq = index + 1;
                  final piece = board[sq];
                  if (piece == null) return const SizedBox.shrink();

                  final coord = squareToCoordinate(sq);
                  return Positioned(
                    left: coord.col * squareSize,
                    top: coord.row * squareSize,
                    width: squareSize,
                    height: squareSize,
                    child: Center(
                      child: PieceWidget(
                        isWhite: piece.color == PlayerColor.white,
                        isKing: piece.type == PieceType.king,
                        size: squareSize * 0.85,
                        isSelected: sq == selectedSquare,
                      ),
                    ),
                  );
                }),
              ],
            ),
          );
        },
      ),
    );
  }

  int? _positionToSquare(Offset pos, double squareSize) {
    final col = (pos.dx / squareSize).floor().clamp(0, 9);
    final row = (pos.dy / squareSize).floor().clamp(0, 9);
    final isDark = (row + col) % 2 == 1;
    if (!isDark) return null;
    final posInRow = row % 2 == 0 ? (col - 1) ~/ 2 : col ~/ 2;
    return row * 5 + posInRow + 1;
  }
}
