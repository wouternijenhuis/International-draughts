import 'package:flutter/material.dart';

/// Board theme definition for the draughts board.
///
/// Each theme provides colors for light and dark squares,
/// as well as highlight and selection overlay colors.
class BoardTheme {
  /// Creates a board theme.
  const BoardTheme({
    required this.name,
    required this.lightSquare,
    required this.darkSquare,
    required this.highlightColor,
    required this.selectedColor,
  });

  /// Display name of the theme.
  final String name;

  /// Color for light (non-playable) squares.
  final Color lightSquare;

  /// Color for dark (playable) squares.
  final Color darkSquare;

  /// Color for highlighting legal move targets.
  final Color highlightColor;

  /// Color for the selected piece overlay.
  final Color selectedColor;

  /// Classic wood board theme.
  static const BoardTheme classicWood = BoardTheme(
    name: 'Classic Wood',
    lightSquare: Color(0xFFF0D9B5),
    darkSquare: Color(0xFFB58863),
    highlightColor: Color(0x6644AA44),
    selectedColor: Color(0x66FFFF00),
  );

  /// Dark board theme.
  static const BoardTheme dark = BoardTheme(
    name: 'Dark',
    lightSquare: Color(0xFF6B7280),
    darkSquare: Color(0xFF374151),
    highlightColor: Color(0x6622CC22),
    selectedColor: Color(0x66FFCC00),
  );

  /// Ocean board theme.
  static const BoardTheme ocean = BoardTheme(
    name: 'Ocean',
    lightSquare: Color(0xFF93C5FD),
    darkSquare: Color(0xFF1D4ED8),
    highlightColor: Color(0x6600FF88),
    selectedColor: Color(0x6600CCFF),
  );

  /// Tournament green board theme.
  static const BoardTheme tournamentGreen = BoardTheme(
    name: 'Tournament Green',
    lightSquare: Color(0xFFD4EDDA),
    darkSquare: Color(0xFF2D6A4F),
    highlightColor: Color(0x66FFDD44),
    selectedColor: Color(0x66FFFFFF),
  );

  /// All available board themes.
  static const List<BoardTheme> all = [
    classicWood,
    dark,
    ocean,
    tournamentGreen,
  ];
}
