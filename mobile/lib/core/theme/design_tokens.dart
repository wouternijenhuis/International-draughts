import 'package:flutter/material.dart';

/// Design tokens for consistent spacing, sizing, and colors.
///
/// All UI components should reference these tokens rather than
/// hard-coding numeric values or colors directly.
abstract final class DesignTokens {
  // ── Spacing ─────────────────────────────────────────────────────────

  /// Extra-small spacing (4px).
  static const double spacingXs = 4.0;

  /// Small spacing (8px).
  static const double spacingSm = 8.0;

  /// Medium spacing (16px).
  static const double spacingMd = 16.0;

  /// Large spacing (24px).
  static const double spacingLg = 24.0;

  /// Extra-large spacing (32px).
  static const double spacingXl = 32.0;

  /// Double extra-large spacing (48px).
  static const double spacingXxl = 48.0;

  // ── Border radius ──────────────────────────────────────────────────

  /// Small border radius (4px).
  static const double radiusSm = 4.0;

  /// Medium border radius (8px).
  static const double radiusMd = 8.0;

  /// Large border radius (16px).
  static const double radiusLg = 16.0;

  /// Full/circular border radius (999px).
  static const double radiusFull = 999.0;

  // ── Colors ─────────────────────────────────────────────────────────

  /// Primary brand color.
  static const Color primaryColor = Color(0xFF2D6A4F);

  /// Light theme background.
  static const Color lightBackground = Color(0xFFF8F9FA);

  /// Light theme text on background.
  static const Color lightOnBackground = Color(0xFF1A1A2E);

  /// Dark theme background.
  static const Color darkBackground = Color(0xFF121212);

  /// Dark theme text on background.
  static const Color darkOnBackground = Color(0xFFE0E0E0);

  /// Error/destructive color.
  static const Color errorColor = Color(0xFFDC2626);

  /// Success color.
  static const Color successColor = Color(0xFF16A34A);

  /// Warning color.
  static const Color warningColor = Color(0xFFD97706);

  // ── Typography ─────────────────────────────────────────────────────

  /// Default font family.
  static const String fontFamily = 'Roboto';

  // ── Animation ──────────────────────────────────────────────────────

  /// Standard animation duration.
  static const Duration animationDuration = Duration(milliseconds: 200);

  /// Slow animation duration.
  static const Duration animationDurationSlow = Duration(milliseconds: 400);
}
