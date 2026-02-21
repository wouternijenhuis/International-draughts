import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app/app.dart';
import 'app/startup.dart';

/// Application entry point.
///
/// Wraps the app in a [ProviderScope] to enable Riverpod state management
/// and runs the startup flow before launching the UI.
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await performStartup();
  runApp(
    const ProviderScope(
      child: InternationalDraughtsApp(),
    ),
  );
}
