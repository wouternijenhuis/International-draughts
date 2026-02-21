import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:international_draughts/core/theme/board_theme.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// State for application settings.
class SettingsState {
  /// Creates a [SettingsState].
  const SettingsState({
    this.boardThemeName = 'Classic Wood',
    this.showNotation = true,
    this.showLegalMoves = true,
    this.animationSpeed = 1.0,
    this.isDarkMode = false,
  });

  /// The name of the selected board theme.
  final String boardThemeName;

  /// Whether to show square notation on the board.
  final bool showNotation;

  /// Whether to highlight legal moves for the selected piece.
  final bool showLegalMoves;

  /// Animation speed multiplier (0.5 = slow, 1.0 = normal, 2.0 = fast).
  final double animationSpeed;

  /// Whether dark mode is enabled.
  final bool isDarkMode;

  /// Gets the [BoardTheme] matching [boardThemeName].
  BoardTheme get boardTheme {
    return BoardTheme.all.firstWhere(
      (theme) => theme.name == boardThemeName,
      orElse: () => BoardTheme.classicWood,
    );
  }

  /// Creates a copy with the given fields replaced.
  SettingsState copyWith({
    String? boardThemeName,
    bool? showNotation,
    bool? showLegalMoves,
    double? animationSpeed,
    bool? isDarkMode,
  }) {
    return SettingsState(
      boardThemeName: boardThemeName ?? this.boardThemeName,
      showNotation: showNotation ?? this.showNotation,
      showLegalMoves: showLegalMoves ?? this.showLegalMoves,
      animationSpeed: animationSpeed ?? this.animationSpeed,
      isDarkMode: isDarkMode ?? this.isDarkMode,
    );
  }
}

/// Manages settings state with SharedPreferences persistence.
///
/// Loads settings on initialization and persists on every change.
class SettingsNotifier extends StateNotifier<SettingsState> {
  /// Creates a [SettingsNotifier].
  SettingsNotifier() : super(const SettingsState()) {
    _loadSettings();
  }

  static const String _boardThemeKey = 'settings_boardTheme';
  static const String _showNotationKey = 'settings_showNotation';
  static const String _showLegalMovesKey = 'settings_showLegalMoves';
  static const String _animationSpeedKey = 'settings_animationSpeed';
  static const String _isDarkModeKey = 'settings_isDarkMode';

  /// Loads settings from SharedPreferences.
  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    state = SettingsState(
      boardThemeName: prefs.getString(_boardThemeKey) ?? 'Classic Wood',
      showNotation: prefs.getBool(_showNotationKey) ?? true,
      showLegalMoves: prefs.getBool(_showLegalMovesKey) ?? true,
      animationSpeed: prefs.getDouble(_animationSpeedKey) ?? 1.0,
      isDarkMode: prefs.getBool(_isDarkModeKey) ?? false,
    );
  }

  /// Sets the board theme.
  Future<void> setBoardTheme(String themeName) async {
    state = state.copyWith(boardThemeName: themeName);
    await _persist();
  }

  /// Toggles notation display.
  Future<void> setShowNotation(bool value) async {
    state = state.copyWith(showNotation: value);
    await _persist();
  }

  /// Toggles legal move highlighting.
  Future<void> setShowLegalMoves(bool value) async {
    state = state.copyWith(showLegalMoves: value);
    await _persist();
  }

  /// Sets the animation speed.
  Future<void> setAnimationSpeed(double value) async {
    state = state.copyWith(animationSpeed: value);
    await _persist();
  }

  /// Toggles dark mode.
  Future<void> setDarkMode(bool value) async {
    state = state.copyWith(isDarkMode: value);
    await _persist();
  }

  /// Persists current settings to SharedPreferences.
  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_boardThemeKey, state.boardThemeName);
    await prefs.setBool(_showNotationKey, state.showNotation);
    await prefs.setBool(_showLegalMovesKey, state.showLegalMoves);
    await prefs.setDouble(_animationSpeedKey, state.animationSpeed);
    await prefs.setBool(_isDarkModeKey, state.isDarkMode);
  }
}

/// Provider for application settings.
final settingsProvider =
    StateNotifierProvider<SettingsNotifier, SettingsState>((ref) {
  return SettingsNotifier();
});
