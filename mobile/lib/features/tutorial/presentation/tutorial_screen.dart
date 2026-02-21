import 'package:flutter/material.dart';

import 'package:international_draughts/core/theme/design_tokens.dart';
import 'package:international_draughts/shared/widgets/settings_action_button.dart';

/// Tutorial screen displaying the rules of International Draughts.
///
/// Static rules display with sections: Board Setup, Movement,
/// Capturing, Kings, and Draws. Each section includes descriptive
/// text. Scrollable content with expandable sections.
class TutorialScreen extends StatelessWidget {
  /// Creates the [TutorialScreen].
  const TutorialScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Rules & Tutorial'),
        actions: const [SettingsActionButton()],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(DesignTokens.spacingMd),
          children: [
            // Header
            Icon(
              Icons.menu_book,
              size: 48,
              color: theme.colorScheme.primary,
            ),
            const SizedBox(height: DesignTokens.spacingSm),
            Text(
              'International Draughts Rules',
              style: theme.textTheme.headlineSmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: DesignTokens.spacingXs),
            Text(
              'FMJD 10×10 Official Rules',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: DesignTokens.spacingLg),

            // Section 1: Board Setup
            _buildSection(
              context,
              icon: Icons.grid_on,
              title: 'Board Setup',
              items: const [
                _RuleItem(
                  title: 'The Board',
                  description:
                      'International Draughts is played on the dark squares of a '
                      '10×10 board. There are 50 playable squares, numbered 1 to 50.',
                ),
                _RuleItem(
                  title: 'Starting Position',
                  description:
                      'Each player starts with 20 pieces placed on the dark squares '
                      'of their first four rows. White pieces occupy squares 31–50, '
                      'and black pieces occupy squares 1–20.',
                ),
                _RuleItem(
                  title: 'Who Goes First',
                  description: 'White always moves first.',
                ),
              ],
            ),

            // Section 2: Movement
            _buildSection(
              context,
              icon: Icons.open_with,
              title: 'Movement',
              items: const [
                _RuleItem(
                  title: 'Regular Pieces',
                  description:
                      'Regular pieces (men) move diagonally forward one square to '
                      'an adjacent empty dark square. They cannot move backward.',
                ),
                _RuleItem(
                  title: 'Taking Turns',
                  description:
                      'Players alternate turns. Each turn consists of one move '
                      'or one capture sequence.',
                ),
              ],
            ),

            // Section 3: Capturing
            _buildSection(
              context,
              icon: Icons.flash_on,
              title: 'Capturing',
              items: const [
                _RuleItem(
                  title: 'Mandatory Captures',
                  description:
                      'Captures are mandatory. If you can capture, you must. '
                      'You cannot choose to make a non-capturing move instead.',
                ),
                _RuleItem(
                  title: 'How to Capture',
                  description:
                      'Jump diagonally over an adjacent opponent\'s piece to an '
                      'empty square immediately beyond it. The captured piece is '
                      'removed from the board.',
                ),
                _RuleItem(
                  title: 'Multi-Capture',
                  description:
                      'If after capturing a piece you can capture another, you must '
                      'continue capturing in the same turn. Multi-captures can '
                      'change direction.',
                ),
                _RuleItem(
                  title: 'Maximum Capture Rule',
                  description:
                      'When multiple capture sequences are possible, you must '
                      'choose the one that captures the most pieces.',
                ),
                _RuleItem(
                  title: 'Capture Direction',
                  description:
                      'Regular pieces can capture both forward and backward.',
                ),
              ],
            ),

            // Section 4: Kings
            _buildSection(
              context,
              icon: Icons.star,
              title: 'Kings',
              items: const [
                _RuleItem(
                  title: 'Promotion',
                  description:
                      'When a regular piece reaches the opponent\'s back row '
                      '(row 1 for white, row 10 for black) and its move ends there, '
                      'it is promoted to a king.',
                ),
                _RuleItem(
                  title: 'Promotion Timing',
                  description:
                      'A piece only promotes when it stops on the back row at the '
                      'end of its turn. If it passes through the back row during a '
                      'multi-capture, it does not promote until the sequence ends.',
                ),
                _RuleItem(
                  title: 'Flying Kings',
                  description:
                      'Kings are "flying kings" — they can move any number of '
                      'squares diagonally in any direction, like a bishop in chess.',
                ),
                _RuleItem(
                  title: 'King Captures',
                  description:
                      'Kings can capture by jumping over an opponent\'s piece from '
                      'any distance along a diagonal, landing on any empty square '
                      'beyond the captured piece.',
                ),
              ],
            ),

            // Section 5: Draws
            _buildSection(
              context,
              icon: Icons.handshake,
              title: 'Draws',
              items: const [
                _RuleItem(
                  title: 'Threefold Repetition',
                  description:
                      'The game is a draw if the same position occurs three times '
                      'with the same player to move.',
                ),
                _RuleItem(
                  title: '25-Move Rule',
                  description:
                      'If both players make 25 consecutive king moves without '
                      'any capture or man move, the game is a draw.',
                ),
                _RuleItem(
                  title: '16-Move Endgame Rule',
                  description:
                      'In specific endgame configurations (e.g., 3 kings vs 1 king), '
                      'the stronger side must win within 16 moves or the game '
                      'is a draw.',
                ),
                _RuleItem(
                  title: 'Draw by Agreement',
                  description:
                      'Both players may agree to a draw at any time during the game.',
                ),
              ],
            ),

            // Section 6: Winning
            _buildSection(
              context,
              icon: Icons.emoji_events,
              title: 'Winning',
              items: const [
                _RuleItem(
                  title: 'How to Win',
                  description:
                      'You win by capturing all of your opponent\'s pieces, or '
                      'by blocking them so they have no legal moves.',
                ),
                _RuleItem(
                  title: 'Resignation',
                  description:
                      'A player may resign at any time, conceding the game.',
                ),
              ],
            ),

            const SizedBox(height: DesignTokens.spacingXl),

            // Mini board diagram
            _buildBoardDiagram(context),

            const SizedBox(height: DesignTokens.spacingLg),
          ],
        ),
      ),
    );
  }

  Widget _buildSection(
    BuildContext context, {
    required IconData icon,
    required String title,
    required List<_RuleItem> items,
  }) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: DesignTokens.spacingMd),
      child: ExpansionTile(
        leading: Icon(icon, color: theme.colorScheme.primary),
        title: Text(
          title,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        initiallyExpanded: true,
        children: items
            .map(
              (item) => Padding(
                padding: const EdgeInsets.fromLTRB(
                  DesignTokens.spacingLg,
                  0,
                  DesignTokens.spacingMd,
                  DesignTokens.spacingMd,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.title,
                      style: theme.textTheme.bodyLarge?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: DesignTokens.spacingXs),
                    Text(
                      item.description,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurface
                            .withValues(alpha: 0.8),
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
            )
            .toList(),
      ),
    );
  }

  /// Builds a small static board diagram showing the starting position.
  Widget _buildBoardDiagram(BuildContext context) {
    final theme = Theme.of(context);
    const boardSize = 200.0;
    const squareSize = boardSize / 10;

    return Column(
      children: [
        Text(
          'Starting Position',
          style: theme.textTheme.titleMedium,
        ),
        const SizedBox(height: DesignTokens.spacingSm),
        Center(
          child: SizedBox(
            width: boardSize,
            height: boardSize,
            child: CustomPaint(
              painter: _MiniboardPainter(),
            ),
          ),
        ),
        const SizedBox(height: DesignTokens.spacingXs),
        Text(
          'Black (top) vs White (bottom)',
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
          ),
        ),
      ],
    );
  }
}

class _RuleItem {
  const _RuleItem({required this.title, required this.description});
  final String title;
  final String description;
}

/// Paints a small 10×10 board with pieces in starting position.
class _MiniboardPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final sqSize = size.width / 10;

    final lightPaint = Paint()..color = const Color(0xFFF0D9B5);
    final darkPaint = Paint()..color = const Color(0xFFB58863);
    final whitePiecePaint = Paint()..color = const Color(0xFFFFE082);
    final blackPiecePaint = Paint()..color = const Color(0xFF424242);

    // Draw squares.
    for (var row = 0; row < 10; row++) {
      for (var col = 0; col < 10; col++) {
        final isDark = (row + col) % 2 == 1;
        canvas.drawRect(
          Rect.fromLTWH(col * sqSize, row * sqSize, sqSize, sqSize),
          isDark ? darkPaint : lightPaint,
        );
      }
    }

    // Draw pieces in starting position.
    // Black: squares 1-20 (first 4 rows, dark squares).
    // White: squares 31-50 (last 4 rows, dark squares).
    for (var row = 0; row < 10; row++) {
      for (var col = 0; col < 10; col++) {
        final isDark = (row + col) % 2 == 1;
        if (!isDark) continue;

        final cx = col * sqSize + sqSize / 2;
        final cy = row * sqSize + sqSize / 2;
        final radius = sqSize * 0.35;

        if (row < 4) {
          // Black pieces (top).
          canvas.drawCircle(Offset(cx, cy), radius, blackPiecePaint);
        } else if (row > 5) {
          // White pieces (bottom).
          canvas.drawCircle(Offset(cx, cy), radius, whitePiecePaint);
          // Outline for visibility.
          canvas.drawCircle(
            Offset(cx, cy),
            radius,
            Paint()
              ..color = const Color(0xFFFF8F00)
              ..style = PaintingStyle.stroke
              ..strokeWidth = 0.5,
          );
        }
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
