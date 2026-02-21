import 'package:draughts_engine/draughts_engine.dart';
import 'package:flutter/material.dart';

/// A bottom sheet that lets the player choose between ambiguous capture paths.
///
/// When a king has multiple maximum-capture sequences with the same origin
/// and destination but different captured pieces, FMJD rules entitle the
/// player to choose. This widget presents each option with the list of
/// captured squares so the player can pick the intended path.
class CapturePathDialog extends StatelessWidget {
  /// Creates a [CapturePathDialog].
  const CapturePathDialog({
    required this.ambiguousMoves,
    required this.onPathSelected,
    required this.onCancel,
    super.key,
  });

  /// The list of capture moves sharing the same origin/destination.
  final List<CaptureMove> ambiguousMoves;

  /// Called with the index of the selected path.
  final ValueChanged<int> onPathSelected;

  /// Called when the player cancels disambiguation.
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Drag handle.
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: theme.colorScheme.onSurfaceVariant.withValues(
                    alpha: 0.4,
                  ),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),

            Text(
              'Choose capture path',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Multiple paths capture the same number of pieces. '
              'Tap the path you want to take.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 12),

            ...List.generate(ambiguousMoves.length, (index) {
              final move = ambiguousMoves[index];
              final capturedSquares = getCapturedSquares(move);
              final origin = getMoveOrigin(move);
              final destination = getMoveDestination(move);

              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Material(
                  color: theme.colorScheme.surfaceContainerHigh,
                  borderRadius: BorderRadius.circular(12),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: () => onPathSelected(index),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                      child: Row(
                        children: [
                          // Path number badge.
                          Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              color: _pathColor(index),
                              shape: BoxShape.circle,
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              '${index + 1}',
                              style: theme.textTheme.titleSmall?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),

                          // Path details.
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Path ${index + 1}: '
                                  '$origin \u2192 $destination',
                                  style: theme.textTheme.bodyMedium?.copyWith(
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'Captures: '
                                  '${capturedSquares.join(", ")}',
                                  style: theme.textTheme.bodySmall?.copyWith(
                                    color: theme.colorScheme.onSurfaceVariant,
                                  ),
                                ),
                              ],
                            ),
                          ),

                          Icon(
                            Icons.chevron_right,
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            }),

            const SizedBox(height: 4),
            TextButton(
              onPressed: onCancel,
              child: const Text('Cancel'),
            ),
          ],
        ),
      ),
    );
  }

  /// Returns a distinct color for each path option.
  static Color _pathColor(int index) {
    const colors = [
      Color(0xFF4CAF50), // green
      Color(0xFF2196F3), // blue
      Color(0xFFFF9800), // orange
      Color(0xFF9C27B0), // purple
      Color(0xFFF44336), // red
    ];
    return colors[index % colors.length];
  }
}

/// Shows the capture path disambiguation bottom sheet.
///
/// Returns the index of the selected path, or `null` if cancelled.
Future<int?> showCapturePathBottomSheet(
  BuildContext context,
  List<CaptureMove> ambiguousMoves,
) {
  return showModalBottomSheet<int>(
    context: context,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (ctx) => CapturePathDialog(
      ambiguousMoves: ambiguousMoves,
      onPathSelected: (index) => Navigator.of(ctx).pop(index),
      onCancel: () => Navigator.of(ctx).pop(),
    ),
  );
}
