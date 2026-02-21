import 'dart:math';

import 'package:draughts_engine/draughts_engine.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:international_draughts/core/theme/design_tokens.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../domain/game_phase.dart';
import '../../providers/game_provider.dart';

/// SharedPreferences key for last-used game config.
const String _lastConfigKey = 'last_game_config_v1';

/// Clock preset definitions.
class _ClockPreset {
  const _ClockPreset({
    required this.label,
    required this.baseTimeMs,
    required this.incrementMs,
    required this.format,
  });

  final String label;
  final int baseTimeMs;
  final int incrementMs;
  final ClockFormat format;
}

/// Available clock presets.
const List<_ClockPreset> _clockPresets = [
  _ClockPreset(
    label: '3+2',
    baseTimeMs: 3 * 60 * 1000,
    incrementMs: 2 * 1000,
    format: ClockFormat.fischer,
  ),
  _ClockPreset(
    label: '5+5',
    baseTimeMs: 5 * 60 * 1000,
    incrementMs: 5 * 1000,
    format: ClockFormat.fischer,
  ),
  _ClockPreset(
    label: '10+0',
    baseTimeMs: 10 * 60 * 1000,
    incrementMs: 0,
    format: ClockFormat.countdown,
  ),
  _ClockPreset(
    label: '15+10',
    baseTimeMs: 15 * 60 * 1000,
    incrementMs: 10 * 1000,
    format: ClockFormat.fischer,
  ),
  _ClockPreset(
    label: '30+0',
    baseTimeMs: 30 * 60 * 1000,
    incrementMs: 0,
    format: ClockFormat.countdown,
  ),
];

/// Dialog for configuring a new game before starting.
///
/// Allows selection of opponent, difficulty, player color, and time control.
/// Persists last-used configuration via SharedPreferences.
class GameSetupDialog extends ConsumerStatefulWidget {
  /// Creates a [GameSetupDialog].
  const GameSetupDialog({super.key});

  @override
  ConsumerState<GameSetupDialog> createState() => _GameSetupDialogState();
}

class _GameSetupDialogState extends ConsumerState<GameSetupDialog> {
  String _mode = 'vsAi';
  String _difficulty = 'medium';
  String _playerColor = 'white';
  bool _isTimed = false;
  int _clockPresetIndex = 2; // default: 10+0
  bool _configLoaded = false;

  @override
  void initState() {
    super.initState();
    _loadLastConfig();
  }

  Future<void> _loadLastConfig() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final mode = prefs.getString('${_lastConfigKey}_mode');
      final difficulty = prefs.getString('${_lastConfigKey}_difficulty');
      final color = prefs.getString('${_lastConfigKey}_color');
      final timed = prefs.getBool('${_lastConfigKey}_timed');
      final clockIdx = prefs.getInt('${_lastConfigKey}_clockIdx');

      if (mounted) {
        setState(() {
          if (mode != null) _mode = mode;
          if (difficulty != null) _difficulty = difficulty;
          if (color != null) _playerColor = color;
          if (timed != null) _isTimed = timed;
          if (clockIdx != null) _clockPresetIndex = clockIdx;
          _configLoaded = true;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _configLoaded = true);
      }
    }
  }

  Future<void> _saveConfig() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('${_lastConfigKey}_mode', _mode);
      await prefs.setString('${_lastConfigKey}_difficulty', _difficulty);
      await prefs.setString('${_lastConfigKey}_color', _playerColor);
      await prefs.setBool('${_lastConfigKey}_timed', _isTimed);
      await prefs.setInt('${_lastConfigKey}_clockIdx', _clockPresetIndex);
    } catch (_) {
      // Ignore save errors.
    }
  }

  void _startGame() {
    final resolvedColor = _playerColor == 'random'
        ? (Random().nextBool() ? 'white' : 'black')
        : _playerColor;

    final clockPreset = _clockPresets[_clockPresetIndex];
    final clockSeconds = clockPreset.baseTimeMs ~/ 1000;

    final config = GameConfig(
      mode: _mode,
      difficulty: _mode == 'vsAi' ? _difficulty : 'medium',
      playerColor: resolvedColor == 'white'
          ? PlayerColor.white
          : PlayerColor.black,
      isTimed: _isTimed,
      clockPresetSeconds: clockSeconds,
      clockIncrementMs: clockPreset.incrementMs,
      clockFormat: clockPreset.format,
    );

    _saveConfig();
    ref.read(gameProvider.notifier).startGame(config);
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final screenWidth = MediaQuery.of(context).size.width;

    Widget content = Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: const BorderRadius.vertical(
          top: Radius.circular(28),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle.
          Center(
            child: Container(
              width: 32,
              height: 4,
              margin: const EdgeInsets.only(top: 12),
              decoration: BoxDecoration(
                color: theme.colorScheme.onSurfaceVariant
                    .withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          // Title.
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              'New Game',
              style: theme.textTheme.headlineSmall,
            ),
          ),
          // Scrollable content.
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Opponent selector.
                  Text(
                    'Opponent',
                    style: theme.textTheme.titleSmall,
                  ),
                  const SizedBox(height: DesignTokens.spacingSm),
                  SegmentedButton<String>(
                    segments: const [
                      ButtonSegment(
                        value: 'vsAi',
                        label: Text('AI'),
                        icon: Icon(Icons.smart_toy, size: 16),
                      ),
                      ButtonSegment(
                        value: 'vsHuman',
                        label: Text('Human'),
                        icon: Icon(Icons.people, size: 16),
                      ),
                    ],
                    selected: {_mode},
                    onSelectionChanged: (selected) {
                      setState(() {
                        _mode = selected.first;
                      });
                    },
                  ),
                  const SizedBox(height: DesignTokens.spacingMd),

                  // Difficulty (only for AI mode).
                  if (_mode == 'vsAi') ...[
                    Text(
                      'Difficulty',
                      style: theme.textTheme.titleSmall,
                    ),
                    const SizedBox(height: DesignTokens.spacingSm),
                    SegmentedButton<String>(
                      segments: [
                        const ButtonSegment(
                          value: 'easy',
                          label: Text('Easy'),
                        ),
                        const ButtonSegment(
                          value: 'medium',
                          label: Text('Medium'),
                        ),
                        const ButtonSegment(
                          value: 'hard',
                          label: Text('Hard'),
                        ),
                        ButtonSegment(
                          value: 'expert',
                          label: FittedBox(
                            fit: BoxFit.scaleDown,
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Text('Expert'),
                                const SizedBox(width: 4),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 4,
                                    vertical: 1,
                                  ),
                                  decoration: BoxDecoration(
                                    color: theme.colorScheme.tertiary,
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    'Server',
                                    style: TextStyle(
                                      fontSize: 11,
                                      color:
                                          theme.colorScheme.onTertiary,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                      selected: {_difficulty},
                      onSelectionChanged: (selected) {
                        setState(() {
                          _difficulty = selected.first;
                        });
                      },
                    ),
                    const SizedBox(height: DesignTokens.spacingMd),
                  ],

                  // Player color.
                  Text(
                    'Play as',
                    style: theme.textTheme.titleSmall,
                  ),
                  const SizedBox(height: DesignTokens.spacingSm),
                  SegmentedButton<String>(
                    segments: const [
                      ButtonSegment(value: 'white', label: Text('White')),
                      ButtonSegment(value: 'black', label: Text('Black')),
                      ButtonSegment(
                        value: 'random',
                        label: Text('Random'),
                        icon: Icon(Icons.shuffle, size: 16),
                      ),
                    ],
                    selected: {_playerColor},
                    onSelectionChanged: (selected) {
                      setState(() {
                        _playerColor = selected.first;
                      });
                    },
                  ),
                  const SizedBox(height: DesignTokens.spacingMd),

                  // Time control toggle with animated expand.
                  SwitchListTile(
                    title: const Text('Timed Game'),
                    value: _isTimed,
                    contentPadding: EdgeInsets.zero,
                    onChanged: (value) {
                      setState(() {
                        _isTimed = value;
                      });
                    },
                  ),
                  AnimatedCrossFade(
                    duration: const Duration(milliseconds: 200),
                    crossFadeState: _isTimed
                        ? CrossFadeState.showFirst
                        : CrossFadeState.showSecond,
                    firstChild: _ClockPresetGrid(
                      selectedIndex: _clockPresetIndex,
                      onSelected: (index) {
                        setState(() {
                          _clockPresetIndex = index;
                        });
                      },
                    ),
                    secondChild: const SizedBox.shrink(),
                  ),
                ],
              ),
            ),
          ),
          // Bottom action bar (sticky).
          Padding(
            padding: EdgeInsets.fromLTRB(
              24,
              12,
              24,
              MediaQuery.of(context).viewInsets.bottom + 24,
            ),
            child: Row(
              children: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Cancel'),
                ),
                const Spacer(),
                if (_configLoaded)
                  OutlinedButton(
                    onPressed: _startGame,
                    child: const Text('Quick Start'),
                  ),
                if (_configLoaded)
                  const SizedBox(width: 12),
                FilledButton(
                  onPressed: _startGame,
                  child: const Text('Start Game'),
                ),
              ],
            ),
          ),
        ],
      ),
    );

    // Responsive: constrain width on tablets.
    if (screenWidth > 600) {
      content = Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 480),
          child: content,
        ),
      );
    }

    return content;
  }
}

/// Grid of clock presets for the timed game section.
class _ClockPresetGrid extends StatelessWidget {
  const _ClockPresetGrid({
    required this.selectedIndex,
    required this.onSelected,
  });

  final int selectedIndex;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: DesignTokens.spacingSm),
      child: Wrap(
        spacing: DesignTokens.spacingSm,
        runSpacing: DesignTokens.spacingSm,
        children: List.generate(_clockPresets.length, (index) {
          final preset = _clockPresets[index];
          final isSelected = index == selectedIndex;
          return ChoiceChip(
            label: Text(preset.label),
            selected: isSelected,
            onSelected: (_) => onSelected(index),
          );
        }),
      ),
    );
  }
}
