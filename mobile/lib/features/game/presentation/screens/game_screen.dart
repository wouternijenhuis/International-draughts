import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:international_draughts/core/theme/design_tokens.dart';
import '../../domain/game_phase.dart';
import '../providers/ai_provider.dart';
import '../providers/clock_provider.dart';
import '../providers/game_orchestration_provider.dart';
import '../providers/game_provider.dart';
import '../widgets/board/board_widget.dart';
import '../widgets/clock/chess_clock.dart';
import '../widgets/controls/game_controls.dart';
import '../widgets/controls/game_status.dart';
import '../widgets/controls/move_history.dart';
import '../widgets/pause_overlay.dart';
import '../widgets/setup/game_setup_dialog.dart';
import '../widgets/victory_animation.dart';

/// Main game screen for playing draughts.
///
/// Displays the board, controls, status, move history, and optional clock.
/// Responsive layout: portrait stacks vertically, landscape goes side-by-side.
/// Shows a [PauseOverlay] when the clock is paused, and a SnackBar when
/// Expert AI falls back to local Hard AI.
class GameScreen extends ConsumerStatefulWidget {
  /// Creates the [GameScreen].
  const GameScreen({super.key});

  @override
  ConsumerState<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends ConsumerState<GameScreen> {
  bool _showVictoryAnimation = false;
  bool _isWhiteWinner = true;

  @override
  Widget build(BuildContext context) {
    final phase = ref.watch(gameProvider);

    // Eagerly read the orchestration provider so its listeners are active.
    ref.watch(gameOrchestrationProvider);

    // Listen for Expert AI fallback — show SnackBar once.
    ref.listen<AiState>(aiProvider, (previous, next) {
      if (next.usedFallback && !(previous?.usedFallback ?? false)) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'Expert AI unavailable — using Hard difficulty.',
              ),
              duration: Duration(seconds: 3),
            ),
          );
        }
      }
    });

    // Listen for game-over to trigger victory animation.
    ref.listen<AppGamePhase>(gameProvider, (previous, next) {
      if (previous is InProgress) {
        if (next is WhiteWins || next is BlackWins) {
          setState(() {
            _showVictoryAnimation = true;
            _isWhiteWinner = next is WhiteWins;
          });
        }
      }
    });

    return Scaffold(
      appBar: AppBar(
        title: const Text('Play'),
        actions: [
          // Pause button when timed game is active.
          if (phase is InProgress && phase.config.isTimed)
            _buildPauseResumeButton(),
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () {
              // TODO: Open in-game settings.
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Stack(
          children: [
            switch (phase) {
              NotStarted() => _buildSetupPrompt(context),
              InProgress() => _buildGameView(context),
              WhiteWins(:final reason) =>
                _buildGameOverView(context, 'White Wins!', reason),
              BlackWins(:final reason) =>
                _buildGameOverView(context, 'Black Wins!', reason),
              DrawResult(:final reason) =>
                _buildGameOverView(context, 'Draw', reason),
            },
            // Victory animation overlay
            if (_showVictoryAnimation)
              Positioned.fill(
                child: VictoryAnimation(
                  isWhiteWinner: _isWhiteWinner,
                  onDismiss: () {
                    if (mounted) {
                      setState(() => _showVictoryAnimation = false);
                    }
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }

  /// Builds a pause/resume toggle button for the AppBar.
  Widget _buildPauseResumeButton() {
    final clockState = ref.watch(clockProvider);
    final isRunning = clockState?.isRunning ?? false;

    return IconButton(
      icon: Icon(isRunning ? Icons.pause : Icons.play_arrow),
      tooltip: isRunning ? 'Pause' : 'Resume',
      onPressed: () {
        if (isRunning) {
          ref.read(clockProvider.notifier).pause();
        } else {
          ref.read(clockProvider.notifier).resume();
        }
      },
    );
  }

  Widget _buildSetupPrompt(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.sports_esports,
            size: 80,
            color: Theme.of(context).colorScheme.primary,
          ),
          const SizedBox(height: DesignTokens.spacingLg),
          Text(
            'Ready to Play?',
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: DesignTokens.spacingSm),
          Text(
            'Set up a new game to get started.',
            style: Theme.of(context).textTheme.bodyLarge,
          ),
          const SizedBox(height: DesignTokens.spacingXl),
          ElevatedButton.icon(
            onPressed: () {
              showDialog<void>(
                context: context,
                builder: (context) => const GameSetupDialog(),
              );
            },
            icon: const Icon(Icons.play_arrow),
            label: const Text('New Game'),
          ),
        ],
      ),
    );
  }

  Widget _buildGameView(BuildContext context) {
    final clockState = ref.watch(clockProvider);
    final isPaused = clockState != null && !clockState.isRunning;
    final isLandscape =
        MediaQuery.of(context).orientation == Orientation.landscape;

    if (isLandscape) {
      return Stack(
        children: [
          Positioned.fill(
            child: Row(
              children: [
                // Board takes up left side.
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(DesignTokens.spacingSm),
                    child: Center(child: _buildBoard()),
                  ),
                ),
                // Controls on the right.
                SizedBox(
                  width: 260,
                  child: Column(
                    children: [
                      const GameStatus(),
                      if (clockState != null) _buildClock(clockState),
                      const Expanded(child: MoveHistory()),
                      const GameControls(),
                      const SizedBox(height: DesignTokens.spacingSm),
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (isPaused) const PauseOverlay(),
        ],
      );
    }

    // Portrait layout.
    return Stack(
      children: [
        Positioned.fill(
          child: Column(
            children: [
              const GameStatus(),
              if (clockState != null) _buildClock(clockState),
              const SizedBox(height: DesignTokens.spacingSm),
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: DesignTokens.spacingSm,
                ),
                child: _buildBoard(),
              ),
              const SizedBox(height: DesignTokens.spacingSm),
              const MoveHistory(),
              const Spacer(),
              const GameControls(),
              const SizedBox(height: DesignTokens.spacingSm),
            ],
          ),
        ),
        if (isPaused) const PauseOverlay(),
      ],
    );
  }

  Widget _buildBoard() {
    return const BoardWidget();
  }

  Widget _buildClock(ClockState clock) {
    return ChessClock(
      whiteTimeMs: clock.whiteTimeMs,
      blackTimeMs: clock.blackTimeMs,
      activeColor: clock.activeColor,
      isRunning: clock.isRunning,
    );
  }

  Widget _buildGameOverView(
    BuildContext context,
    String title,
    String reason,
  ) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            title.contains('Draw') ? Icons.handshake : Icons.emoji_events,
            size: 64,
            color: Theme.of(context).colorScheme.primary,
          ),
          const SizedBox(height: DesignTokens.spacingMd),
          Text(
            title,
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: DesignTokens.spacingSm),
          Text(reason),
          const SizedBox(height: DesignTokens.spacingLg),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              OutlinedButton(
                onPressed: () {
                  ref.read(gameProvider.notifier).reset();
                },
                child: const Text('Back'),
              ),
              const SizedBox(width: DesignTokens.spacingMd),
              ElevatedButton.icon(
                onPressed: () {
                  showDialog<void>(
                    context: context,
                    builder: (context) => const GameSetupDialog(),
                  );
                },
                icon: const Icon(Icons.play_arrow),
                label: const Text('New Game'),
              ),
            ],
          ),
          const SizedBox(height: DesignTokens.spacingLg),
          // Show the final board position via undo history.
          const SizedBox(
            width: 250,
            child: MoveHistory(),
          ),
        ],
      ),
    );
  }
}
