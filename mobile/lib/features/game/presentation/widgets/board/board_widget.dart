import 'package:draughts_engine/draughts_engine.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:international_draughts/core/theme/board_theme.dart';
import '../../../domain/game_phase.dart';
import '../../controllers/move_animation_controller.dart';
import '../../providers/game_provider.dart';
import 'board_painter.dart';
import 'capture_path_dialog.dart';
import 'piece_widget.dart';

/// Widget that renders the 10x10 draughts board with pieces.
///
/// Uses [CustomPaint] with [BoardPainter] for the grid, and overlays
/// [PieceWidget]s at the correct positions. Supports tap-to-select,
/// legal move indicators, selection & last-move highlighting,
/// board orientation flip, and move animations.
class BoardWidget extends ConsumerStatefulWidget {
  /// Creates a [BoardWidget].
  const BoardWidget({
    super.key,
    this.boardTheme = BoardTheme.classicWood,
    this.animationSpeed = AnimationSpeed.normal,
  });

  /// The board color theme to use.
  final BoardTheme boardTheme;

  /// Speed for move animations.
  final AnimationSpeed animationSpeed;

  @override
  ConsumerState<BoardWidget> createState() => _BoardWidgetState();
}

class _BoardWidgetState extends ConsumerState<BoardWidget>
    with TickerProviderStateMixin {
  /// Drag state for drag-and-drop.
  int? _dragFromSquare;
  Offset? _dragPosition;

  /// Move animation controller.
  late MoveAnimationController _animationController;

  /// Current animation state.
  MoveAnimationState _animationState = MoveAnimationState.none;

  /// Previous board position for detecting changes.
  BoardPosition? _prevBoard;

  @override
  void initState() {
    super.initState();
    _animationController = MoveAnimationController(
      vsync: this,
      speed: widget.animationSpeed,
      onUpdate: (state) {
        if (mounted) {
          setState(() {
            _animationState = state;
          });
        }
      },
    );
  }

  @override
  void didUpdateWidget(BoardWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.animationSpeed != widget.animationSpeed) {
      _animationController.speed = widget.animationSpeed;
    }
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  /// Whether we are currently showing the disambiguation bottom sheet.
  bool _isShowingDisambiguation = false;

  @override
  Widget build(BuildContext context) {
    final phase = ref.watch(gameProvider);

    // Auto-open the bottom sheet when disambiguation mode activates.
    if (phase is InProgress &&
        phase.isDisambiguating &&
        !_isShowingDisambiguation) {
      _isShowingDisambiguation = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          _showDisambiguationSheet(context, phase.ambiguousMoves).then((_) {
            _isShowingDisambiguation = false;
          });
        }
      });
    }

    // Extract data from InProgress phase; show empty board otherwise.
    final BoardPosition? board;
    final int? selectedSquare;
    final List<int> legalMoveTargets;
    final bool flipped;
    final int? lastMoveFrom;
    final int? lastMoveTo;
    final List<CaptureMove> ambiguousMoves;

    if (phase is InProgress) {
      board = phase.gameState.board;
      selectedSquare = phase.selectedSquare;
      legalMoveTargets = phase.legalMoveTargets;
      ambiguousMoves = phase.ambiguousMoves;
      // Flip when human plays as black.
      flipped = phase.config.playerColor == PlayerColor.black;

      // Compute last move from/to from the game state move history.
      final history = phase.gameState.moveHistory;
      if (history.isNotEmpty) {
        final lastNotation = history.last;
        final deserialized = deserializeMoveNotation(lastNotation);
        lastMoveFrom = deserialized.from;
        lastMoveTo = deserialized.to;
      } else {
        lastMoveFrom = null;
        lastMoveTo = null;
      }
    } else {
      board = null;
      selectedSquare = null;
      legalMoveTargets = const [];
      ambiguousMoves = const [];
      flipped = false;
      lastMoveFrom = null;
      lastMoveTo = null;
    }

    return AspectRatio(
      aspectRatio: 1.0,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final boardSize = constraints.maxWidth;
          final squareSize = boardSize / 10;

          return GestureDetector(
            onTapUp: (details) =>
                _onTap(details.localPosition, squareSize, flipped),
            onPanStart: (details) =>
                _onDragStart(details.localPosition, squareSize, flipped, board),
            onPanUpdate: (details) {
              setState(() {
                _dragPosition = details.localPosition;
              });
            },
            onPanEnd: (details) =>
                _onDragEnd(squareSize, flipped),
            child: Stack(
              children: [
                // Board grid + overlays.
                CustomPaint(
                  size: Size(boardSize, boardSize),
                  painter: BoardPainter(
                    boardTheme: widget.boardTheme,
                    selectedSquare: selectedSquare,
                    legalMoveTargets: legalMoveTargets,
                    lastMoveFrom: lastMoveFrom,
                    lastMoveTo: lastMoveTo,
                    flipped: flipped,
                  ),
                ),
                // Pieces.
                if (board != null)
                  ...List.generate(50, (index) {
                    final sq = index + 1;
                    final piece = board![sq];
                    if (piece == null) return const SizedBox.shrink();

                    // Skip the dragged piece — it follows the finger.
                    if (sq == _dragFromSquare && _dragPosition != null) {
                      return const SizedBox.shrink();
                    }

                    // Hide pieces being animated.
                    if (_animationState.hiddenSquares.contains(sq)) {
                      return const SizedBox.shrink();
                    }

                    final coord = squareToCoordinate(sq);
                    final displayRow = flipped ? 9 - coord.row : coord.row;
                    final displayCol = flipped ? 9 - coord.col : coord.col;

                    return Positioned(
                      left: displayCol * squareSize,
                      top: displayRow * squareSize,
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

                // Animated sliding piece.
                if (_animationState.slidingPiece != null)
                  _buildSlidingPiece(
                    _animationState.slidingPiece!,
                    squareSize,
                    flipped,
                  ),

                // Animated fading captured pieces.
                ..._animationState.fadingCaptures.map(
                  (cap) => _buildFadingCapture(
                    cap,
                    squareSize,
                    flipped,
                    _animationState.fadeProgress,
                  ),
                ),

                // Dragged piece follows the pointer.
                if (_dragFromSquare != null &&
                    _dragPosition != null &&
                    board != null &&
                    board[_dragFromSquare!] != null)
                  Positioned(
                    left: _dragPosition!.dx - squareSize * 0.45,
                    top: _dragPosition!.dy - squareSize * 0.45,
                    child: IgnorePointer(
                      child: PieceWidget(
                        isWhite: board[_dragFromSquare!]!.color ==
                            PlayerColor.white,
                        isKing: board[_dragFromSquare!]!.type == PieceType.king,
                        size: squareSize * 0.9,
                        isSelected: true,
                      ),
                    ),
                  ),

                // Disambiguation: highlight captured squares for each path.
                if (ambiguousMoves.length > 1)
                  ..._buildDisambiguationOverlays(
                    ambiguousMoves,
                    squareSize,
                    flipped,
                  ),

                // Disambiguation: show a semi-transparent scrim + prompt.
                if (ambiguousMoves.length > 1)
                  Positioned.fill(
                    child: GestureDetector(
                      behavior: HitTestBehavior.translucent,
                      onTap: () => _showDisambiguationSheet(
                        context,
                        ambiguousMoves,
                      ),
                      child: Align(
                        alignment: Alignment.bottomCenter,
                        child: Container(
                          margin: const EdgeInsets.all(8),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.black87,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Text(
                            'Multiple capture paths — tap to choose',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  /// Builds the sliding piece widget at its interpolated position.
  Widget _buildSlidingPiece(
    SlideAnimation slide,
    double squareSize,
    bool flipped,
  ) {
    final fromCoord = squareToCoordinate(slide.fromSquare);
    final toCoord = squareToCoordinate(slide.toSquare);

    final fromRow = flipped ? 9 - fromCoord.row : fromCoord.row;
    final fromCol = flipped ? 9 - fromCoord.col : fromCoord.col;
    final toRow = flipped ? 9 - toCoord.row : toCoord.row;
    final toCol = flipped ? 9 - toCoord.col : toCoord.col;

    final t = _animationState.slideProgress;
    final left = (fromCol + (toCol - fromCol) * t) * squareSize;
    final top = (fromRow + (toRow - fromRow) * t) * squareSize;

    return Positioned(
      left: left,
      top: top,
      width: squareSize,
      height: squareSize,
      child: Center(
        child: PieceWidget(
          isWhite: slide.piece.color == PlayerColor.white,
          isKing: slide.piece.type == PieceType.king,
          size: squareSize * 0.85,
        ),
      ),
    );
  }

  /// Builds a fading captured piece widget.
  Widget _buildFadingCapture(
    CapturedPieceFade capture,
    double squareSize,
    bool flipped,
    double fadeProgress,
  ) {
    final coord = squareToCoordinate(capture.square);
    final displayRow = flipped ? 9 - coord.row : coord.row;
    final displayCol = flipped ? 9 - coord.col : coord.col;

    return Positioned(
      left: displayCol * squareSize,
      top: displayRow * squareSize,
      width: squareSize,
      height: squareSize,
      child: Opacity(
        opacity: fadeProgress.clamp(0.0, 1.0),
        child: Center(
          child: PieceWidget(
            isWhite: capture.piece.color == PlayerColor.white,
            isKing: capture.piece.type == PieceType.king,
            size: squareSize * 0.85,
          ),
        ),
      ),
    );
  }

  /// Converts a local pixel position to an FMJD square number.
  int? _positionToSquare(Offset pos, double squareSize, bool flipped) {
    final col = (pos.dx / squareSize).floor().clamp(0, 9);
    final row = (pos.dy / squareSize).floor().clamp(0, 9);
    final displayRow = flipped ? 9 - row : row;
    final displayCol = flipped ? 9 - col : col;
    final isDark = (displayRow + displayCol) % 2 == 1;
    if (!isDark) return null;
    final posInRow =
        displayRow % 2 == 0 ? (displayCol - 1) ~/ 2 : displayCol ~/ 2;
    return displayRow * 5 + posInRow + 1;
  }

  void _onTap(Offset position, double squareSize, bool flipped) {
    if (_animationState.isAnimating) return;
    final sq = _positionToSquare(position, squareSize, flipped);
    if (sq != null) {
      ref.read(gameProvider.notifier).onSquareTap(sq);
    }
  }

  void _onDragStart(
    Offset position,
    double squareSize,
    bool flipped,
    BoardPosition? board,
  ) {
    if (_animationState.isAnimating) return;
    final sq = _positionToSquare(position, squareSize, flipped);
    if (sq == null || board == null) return;

    final piece = board[sq];
    if (piece == null) return;

    // Select the piece via the provider.
    ref.read(gameProvider.notifier).onSquareTap(sq);

    setState(() {
      _dragFromSquare = sq;
      _dragPosition = position;
    });
  }

  void _onDragEnd(double squareSize, bool flipped) {
    if (_dragFromSquare != null && _dragPosition != null) {
      final sq = _positionToSquare(_dragPosition!, squareSize, flipped);
      if (sq != null) {
        // Attempt to move to the drop target.
        ref.read(gameProvider.notifier).onSquareTap(sq);
      }
    }
    setState(() {
      _dragFromSquare = null;
      _dragPosition = null;
    });
  }

  // ── Disambiguation helpers ──────────────────────────────────────────

  /// Distinct path colors used to highlight captured squares per path.
  static const _pathColors = [
    Color(0xAA4CAF50), // green
    Color(0xAA2196F3), // blue
    Color(0xAAFF9800), // orange
    Color(0xAA9C27B0), // purple
    Color(0xAAF44336), // red
  ];

  /// Builds coloured circle overlays on the captured squares of each
  /// ambiguous capture path so the player can visually compare routes.
  List<Widget> _buildDisambiguationOverlays(
    List<CaptureMove> moves,
    double squareSize,
    bool flipped,
  ) {
    final widgets = <Widget>[];

    for (var i = 0; i < moves.length; i++) {
      final captured = getCapturedSquares(moves[i]);
      final color = _pathColors[i % _pathColors.length];

      for (final sq in captured) {
        final coord = squareToCoordinate(sq);
        final displayRow = flipped ? 9 - coord.row : coord.row;
        final displayCol = flipped ? 9 - coord.col : coord.col;

        widgets.add(
          Positioned(
            left: displayCol * squareSize,
            top: displayRow * squareSize,
            width: squareSize,
            height: squareSize,
            child: IgnorePointer(
              child: Center(
                child: Container(
                  width: squareSize * 0.4,
                  height: squareSize * 0.4,
                  decoration: BoxDecoration(
                    color: color,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 1.5),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    '${i + 1}',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: squareSize * 0.22,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      }
    }

    return widgets;
  }

  /// Shows the capture path bottom sheet and applies the selected path.
  Future<void> _showDisambiguationSheet(
    BuildContext context,
    List<CaptureMove> ambiguousMoves,
  ) async {
    final index = await showCapturePathBottomSheet(context, ambiguousMoves);
    if (index != null && mounted) {
      ref.read(gameProvider.notifier).selectCapturePathByIndex(index);
    } else if (mounted) {
      ref.read(gameProvider.notifier).cancelDisambiguation();
    }
  }
}
