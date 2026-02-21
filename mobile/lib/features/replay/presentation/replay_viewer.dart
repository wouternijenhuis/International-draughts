import 'package:draughts_engine/draughts_engine.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:international_draughts/core/theme/design_tokens.dart';
import 'package:international_draughts/features/game/presentation/widgets/board/board_painter.dart';
import 'package:international_draughts/features/game/presentation/widgets/board/piece_widget.dart';
import 'package:international_draughts/features/profile/domain/player_stats.dart';
import 'package:international_draughts/features/settings/presentation/settings_provider.dart';
import 'package:international_draughts/shared/utils/date_formatter.dart';

/// Replay viewer for reviewing completed games.
///
/// Displays a read-only board with playback controls to step through
/// the game move by move. Supports jump-to-any-position via the move list.
class ReplayViewer extends ConsumerStatefulWidget {
  /// Creates the [ReplayViewer].
  const ReplayViewer({super.key, this.game});

  /// The game history entry to replay (passed via route extra).
  final GameHistoryEntry? game;

  @override
  ConsumerState<ReplayViewer> createState() => _ReplayViewerState();
}

class _ReplayViewerState extends ConsumerState<ReplayViewer> {
  /// All board states from the initial position through each move.
  final List<GameState> _states = [];

  /// Current position index (0 = initial, 1 = after move 1, etc.).
  int _currentIndex = 0;

  /// Whether auto-play is active.
  bool _isPlaying = false;

  @override
  void initState() {
    super.initState();
    _buildStates();
  }

  void _buildStates() {
    final initialState = createInitialGameState();
    _states.add(initialState);

    if (widget.game == null || widget.game!.moves.isEmpty) return;

    var currentState = initialState;
    for (final notation in widget.game!.moves) {
      final legalMoves =
          generateLegalMoves(currentState.board, currentState.currentPlayer);
      final move = _findMoveByNotation(legalMoves, notation);
      if (move == null) break;

      final result = applyMove(currentState, move);
      if (!result.isValid) break;

      currentState = result.newState;
      _states.add(currentState);
    }
  }

  Move? _findMoveByNotation(List<Move> legalMoves, String notation) {
    for (final move in legalMoves) {
      if (formatMoveNotation(move) == notation) return move;
    }
    // Fallback: try deserializing the internal notation format.
    final deserialized = deserializeMoveNotation(notation);
    for (final move in legalMoves) {
      if (getMoveOrigin(move) == deserialized.from &&
          getMoveDestination(move) == deserialized.to) {
        return move;
      }
    }
    return null;
  }

  void _goToStart() {
    setState(() {
      _currentIndex = 0;
      _isPlaying = false;
    });
  }

  void _goBack() {
    if (_currentIndex > 0) {
      setState(() {
        _currentIndex--;
        _isPlaying = false;
      });
    }
  }

  void _goForward() {
    if (_currentIndex < _states.length - 1) {
      setState(() => _currentIndex++);
    } else {
      setState(() => _isPlaying = false);
    }
  }

  void _goToEnd() {
    setState(() {
      _currentIndex = _states.length - 1;
      _isPlaying = false;
    });
  }

  void _toggleAutoPlay() {
    setState(() {
      _isPlaying = !_isPlaying;
      if (_isPlaying && _currentIndex >= _states.length - 1) {
        _currentIndex = 0;
      }
    });
    if (_isPlaying) _autoPlayStep();
  }

  Future<void> _autoPlayStep() async {
    if (!_isPlaying || !mounted) return;
    await Future.delayed(const Duration(milliseconds: 800));
    if (!_isPlaying || !mounted) return;

    if (_currentIndex < _states.length - 1) {
      setState(() => _currentIndex++);
      _autoPlayStep();
    } else {
      setState(() => _isPlaying = false);
    }
  }

  void _jumpToMove(int index) {
    setState(() {
      _currentIndex = index;
      _isPlaying = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final game = widget.game;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Game Replay'),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Game info header
            if (game != null) _buildGameInfo(context, game),

            // Board (read-only)
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: DesignTokens.spacingSm,
              ),
              child: _buildBoard(context),
            ),
            const SizedBox(height: DesignTokens.spacingSm),

            // Playback controls
            _buildPlaybackControls(context),
            const SizedBox(height: DesignTokens.spacingSm),

            // Move list
            Expanded(child: _buildMoveList(context)),
          ],
        ),
      ),
    );
  }

  Widget _buildGameInfo(BuildContext context, GameHistoryEntry game) {
    final theme = Theme.of(context);
    final resultColor = switch (game.result.toLowerCase()) {
      'won' => DesignTokens.successColor,
      'lost' => DesignTokens.errorColor,
      _ => DesignTokens.warningColor,
    };

    return Container(
      padding: const EdgeInsets.all(DesignTokens.spacingSm),
      color: theme.colorScheme.surfaceContainerHighest,
      child: Row(
        children: [
          Expanded(
            child: Text(
              'vs ${game.opponent}',
              style: theme.textTheme.bodyLarge?.copyWith(
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: DesignTokens.spacingSm,
              vertical: 2,
            ),
            decoration: BoxDecoration(
              color: resultColor.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(DesignTokens.radiusSm),
            ),
            child: Text(
              game.result.toUpperCase(),
              style: TextStyle(
                color: resultColor,
                fontWeight: FontWeight.bold,
                fontSize: 12,
              ),
            ),
          ),
          const SizedBox(width: DesignTokens.spacingSm),
          Text(
            '${game.moveCount} moves',
            style: theme.textTheme.bodySmall,
          ),
          const SizedBox(width: DesignTokens.spacingSm),
          Text(
            DateFormatter.shortDate(game.date),
            style: theme.textTheme.bodySmall,
          ),
        ],
      ),
    );
  }

  Widget _buildBoard(BuildContext context) {
    final boardTheme = ref.watch(
      settingsProvider.select((s) => s.boardTheme),
    );
    final boardState = _states[_currentIndex];
    final board = boardState.board;

    // Determine last move highlights.
    int? lastMoveFrom;
    int? lastMoveTo;
    if (_currentIndex > 0 && widget.game != null) {
      final moveNotation = widget.game!.moves[_currentIndex - 1];
      final deserialized = deserializeMoveNotation(moveNotation);
      lastMoveFrom = deserialized.from;
      lastMoveTo = deserialized.to;
    }

    return AspectRatio(
      aspectRatio: 1.0,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final boardSize = constraints.maxWidth;
          final squareSize = boardSize / 10;

          return Stack(
            children: [
              CustomPaint(
                size: Size(boardSize, boardSize),
                painter: BoardPainter(
                  boardTheme: boardTheme,
                  lastMoveFrom: lastMoveFrom,
                  lastMoveTo: lastMoveTo,
                ),
              ),
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
                    ),
                  ),
                );
              }),
            ],
          );
        },
      ),
    );
  }

  Widget _buildPlaybackControls(BuildContext context) {
    final theme = Theme.of(context);
    final canGoBack = _currentIndex > 0;
    final canGoForward = _currentIndex < _states.length - 1;

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        IconButton(
          icon: const Icon(Icons.skip_previous),
          tooltip: 'First move',
          onPressed: canGoBack ? _goToStart : null,
        ),
        IconButton(
          icon: const Icon(Icons.chevron_left),
          tooltip: 'Previous move',
          onPressed: canGoBack ? _goBack : null,
        ),
        IconButton(
          icon: Icon(_isPlaying ? Icons.pause : Icons.play_arrow),
          tooltip: _isPlaying ? 'Pause' : 'Auto-play',
          onPressed: _states.length > 1 ? _toggleAutoPlay : null,
          style: IconButton.styleFrom(
            backgroundColor: theme.colorScheme.primaryContainer,
          ),
        ),
        IconButton(
          icon: const Icon(Icons.chevron_right),
          tooltip: 'Next move',
          onPressed: canGoForward ? _goForward : null,
        ),
        IconButton(
          icon: const Icon(Icons.skip_next),
          tooltip: 'Last move',
          onPressed: canGoForward ? _goToEnd : null,
        ),
      ],
    );
  }

  Widget _buildMoveList(BuildContext context) {
    final theme = Theme.of(context);
    final moves = widget.game?.moves ?? [];

    if (moves.isEmpty) {
      return Center(
        child: Text(
          'No moves to display.',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
          ),
        ),
      );
    }

    return Card(
      margin: const EdgeInsets.symmetric(
        horizontal: DesignTokens.spacingMd,
      ),
      child: ListView.builder(
        padding: const EdgeInsets.all(DesignTokens.spacingSm),
        itemCount: (moves.length + 1) ~/ 2,
        itemBuilder: (context, pairIndex) {
          final whiteIdx = pairIndex * 2;
          final blackIdx = pairIndex * 2 + 1;
          final moveNumber = pairIndex + 1;

          return Padding(
            padding: const EdgeInsets.symmetric(
              vertical: 2,
            ),
            child: Row(
              children: [
                // Move number
                SizedBox(
                  width: 32,
                  child: Text(
                    '$moveNumber.',
                    style: theme.textTheme.bodySmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                // White's move
                _buildMoveChip(
                  context,
                  moves[whiteIdx],
                  whiteIdx + 1,
                ),
                const SizedBox(width: DesignTokens.spacingSm),
                // Black's move
                if (blackIdx < moves.length)
                  _buildMoveChip(
                    context,
                    moves[blackIdx],
                    blackIdx + 1,
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildMoveChip(
    BuildContext context,
    String notation,
    int stateIndex,
  ) {
    final isActive = _currentIndex == stateIndex;
    final theme = Theme.of(context);

    return Expanded(
      child: InkWell(
        onTap: stateIndex < _states.length
            ? () => _jumpToMove(stateIndex)
            : null,
        borderRadius: BorderRadius.circular(DesignTokens.radiusSm),
        child: Container(
          padding: const EdgeInsets.symmetric(
            horizontal: DesignTokens.spacingSm,
            vertical: DesignTokens.spacingXs,
          ),
          decoration: BoxDecoration(
            color: isActive
                ? theme.colorScheme.primaryContainer
                : Colors.transparent,
            borderRadius: BorderRadius.circular(DesignTokens.radiusSm),
          ),
          child: Text(
            notation,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
              fontFamily: 'monospace',
            ),
          ),
        ),
      ),
    );
  }
}
