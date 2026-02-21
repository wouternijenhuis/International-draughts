import 'package:flutter/material.dart';

/// Centered loading spinner.
///
/// Reusable widget for showing a loading state.
class LoadingIndicator extends StatelessWidget {
  /// Creates a [LoadingIndicator].
  const LoadingIndicator({super.key, this.message});

  /// Optional message to display below the spinner.
  final String? message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          const CircularProgressIndicator(),
          if (message != null) ...[
            const SizedBox(height: 16),
            Text(
              message!,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ],
      ),
    );
  }
}
