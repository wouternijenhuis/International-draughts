import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';

/// Banner shown when the device loses network connectivity.
///
/// Uses [connectivity_plus] to listen for connectivity changes.
/// Automatically shows when offline and dismisses when back online.
/// Non-intrusive — displayed at the top of the screen as a [MaterialBanner].
class OfflineBanner extends StatefulWidget {
  /// Creates an [OfflineBanner].
  const OfflineBanner({required this.child, super.key});

  /// The child widget to display below the banner.
  final Widget child;

  @override
  State<OfflineBanner> createState() => _OfflineBannerState();
}

class _OfflineBannerState extends State<OfflineBanner> {
  bool _isOffline = false;
  late StreamSubscription<List<ConnectivityResult>> _subscription;

  @override
  void initState() {
    super.initState();
    _checkConnectivity();
    _subscription = Connectivity().onConnectivityChanged.listen(_onChanged);
  }

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }

  Future<void> _checkConnectivity() async {
    final result = await Connectivity().checkConnectivity();
    _onChanged(result);
  }

  void _onChanged(List<ConnectivityResult> results) {
    final offline = results.isEmpty ||
        results.every((r) => r == ConnectivityResult.none);
    if (mounted && offline != _isOffline) {
      setState(() => _isOffline = offline);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        if (_isOffline)
          MaterialBanner(
            content: const Text(
              'You are offline. Some features may be unavailable.',
            ),
            leading: Icon(
              Icons.wifi_off,
              color: Theme.of(context).colorScheme.error,
            ),
            backgroundColor: Theme.of(context).colorScheme.errorContainer,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            actions: [
              TextButton(
                onPressed: () {
                  setState(() => _isOffline = false);
                },
                child: const Text('Dismiss'),
              ),
            ],
          ),
        Expanded(child: widget.child),
      ],
    );
  }
}
