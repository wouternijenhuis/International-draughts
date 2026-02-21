import 'package:flutter/material.dart';

import 'package:international_draughts/core/theme/design_tokens.dart';

/// Error display widget with retry button.
///
/// Shows an error message and an optional retry callback.
class AppErrorWidget extends StatelessWidget {
  /// Creates an [AppErrorWidget].
  const AppErrorWidget({
    required this.message, super.key,
    this.onRetry,
  });

  /// The error message to display.
  final String message;

  /// Callback when the retry button is pressed.
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(DesignTokens.spacingLg),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.error_outline,
              size: 48,
              color: Theme.of(context).colorScheme.error,
            ),
            const SizedBox(height: DesignTokens.spacingMd),
            Text(
              message,
              style: Theme.of(context).textTheme.bodyLarge,
              textAlign: TextAlign.center,
            ),
            if (onRetry != null) ...[
              const SizedBox(height: DesignTokens.spacingMd),
              ElevatedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
