# Feature: Mobile Global Settings Button

**Feature ID:** `mobile-global-settings-button`  
**PRD Version:** 1.0  
**Last Updated:** 2026-02-21  
**Status:** Draft  
**Platform:** Flutter mobile (iOS & Android)  
**Related Features:** `global-settings-button` (web), `settings-customization`

---

## 1. Overview

The settings button (gear icon) in the International Draughts Flutter mobile app is inconsistently available across screens. On the HomeScreen it correctly navigates to `/settings`. On the GameScreen it exists but has an empty callback (`// TODO: Open in-game settings.`). On the LearnScreen, TutorialScreen, and ProfileScreen it does not exist at all. This means users on most screens have no way to access display preferences such as board theme, notation visibility, legal-move highlighting, animation speed, or dark mode.

This feature standardises settings access by:

1. Creating a reusable **`SettingsActionButton`** widget.
2. Adding it to the `AppBar.actions` of every applicable screen.
3. Fixing the GameScreen's broken empty callback.

The SettingsScreen already exists as a full-page route (`/settings`) with all preference controls and SharedPreferences persistence. No new settings functionality is needed — only consistent access to the existing screen.

### Current vs Target State (Summary)

| Screen | Current | Target |
|--------|---------|--------|
| HomeScreen | ✅ Works | ✅ Refactored to use shared widget |
| GameScreen | ❌ Empty callback | ✅ Navigates to `/settings` |
| LearnScreen | ❌ Missing | ✅ Added to AppBar |
| TutorialScreen | ❌ Missing | ✅ Added to AppBar |
| ProfileScreen | ❌ Missing | ✅ Added to AppBar |
| LoginScreen | — Not needed | — No change |
| RegisterScreen | — Not needed | — No change |

---

## 2. User Personas

| Persona | Description | Pain Point |
|---------|-------------|------------|
| **New Learner** | A beginner using `/learn` to study draughts through guided steps with an interactive board | Cannot change board theme or toggle notation/legal-move highlights during lessons; stuck with defaults that may not suit their preference or accessibility needs |
| **Casual Player** | Plays games on `/play`, reads rules on `/tutorial`, checks stats on `/profile` | Notices the gear icon on the game screen but tapping it does nothing; has to navigate home to change settings |
| **Profile Browser** | A registered user reviewing their rating history and game stats | No settings access from the profile screen; must leave the profile flow entirely to adjust dark mode or board theme |
| **Accessibility-focused User** | Relies on high‐contrast board themes or notation overlays for orientation | Settings are effectively unreachable from 3 of 5 main screens, blocking access to accessibility-relevant preferences |
| **Power User** | An experienced player who actively customises every visual detail and switches themes for different lighting conditions | Must navigate back to home just to tap settings, then navigate forward again — unnecessary friction |

---

## 3. User Stories

| ID | Story | Priority |
|----|-------|----------|
| US-1 | As a user, I want a settings gear icon in the AppBar on every main screen so I can access display preferences from wherever I am. | P0 |
| US-2 | As a player on the GameScreen, I want the existing gear icon to actually open the settings screen instead of doing nothing. | P0 |
| US-3 | As a learner on the LearnScreen, I want to change the board theme and toggle notation while following guided steps so the board matches my preferences. | P0 |
| US-4 | As a user on the TutorialScreen, I want to change the board theme so the static rule examples render in my preferred visual style. | P1 |
| US-5 | As a user on the ProfileScreen, I want to toggle dark mode or change board theme without leaving the profile flow. | P1 |
| US-6 | As a user, I want settings changes to apply immediately and reactively to the current screen when I navigate back from the settings page. | P0 |
| US-7 | As a user, I want the settings icon to look and behave identically on every screen so the experience feels consistent. | P1 |
| US-8 | As a developer, I want a single reusable `SettingsActionButton` widget so I don't duplicate navigation logic across screens. | P1 |

---

## 4. Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | A reusable `SettingsActionButton` widget must be created under `lib/shared/widgets/`. | P0 |
| FR-2 | `SettingsActionButton` must be a `StatelessWidget` that renders an `IconButton` with `Icons.settings_outlined`, tooltip `'Settings'`, and an `onPressed` that calls `context.push(AppRoutes.settings)`. | P0 |
| FR-3 | `SettingsActionButton` must be added to the `AppBar.actions` list of: HomeScreen, GameScreen, LearnScreen, TutorialScreen, and ProfileScreen. | P0 |
| FR-4 | On **HomeScreen**, the existing inline `IconButton` for settings must be replaced with `SettingsActionButton`. The profile icon button remains as-is. | P0 |
| FR-5 | On **GameScreen**, the existing `IconButton` with the empty `onPressed` TODO must be replaced with `SettingsActionButton`. The existing pause/resume button remains as-is. | P0 |
| FR-6 | On **LearnScreen**, `SettingsActionButton` must be appended to the existing `actions` list (after the restart tutorial button). | P0 |
| FR-7 | On **TutorialScreen**, `SettingsActionButton` must be added to a new `actions` list on the AppBar (currently has no actions). | P0 |
| FR-8 | On **ProfileScreen**, `SettingsActionButton` must be added to the `actions` list alongside the existing logout button. It must appear before the logout icon. | P0 |
| FR-9 | LoginScreen and RegisterScreen must **not** receive a settings button. | P0 |
| FR-10 | Navigation to settings must use `context.push(AppRoutes.settings)` (push, not go) to preserve the back-stack so users return to the originating screen. | P0 |
| FR-11 | After returning from SettingsScreen, all reactive `ref.watch(settingsProvider)` consumers on the originating screen must reflect updated preferences immediately (board theme, notation, legal moves, animation speed, dark mode). | P0 |
| FR-12 | The `SettingsActionButton` icon must use `Icons.settings_outlined` (outlined variant) to match the HomeScreen's current convention. | P1 |
| FR-13 | The widget must include a `tooltip: 'Settings'` for accessibility (long-press hint on mobile). | P1 |

---

## 5. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-1 | The `SettingsActionButton` widget must be under 30 lines of code with zero external dependencies beyond Flutter and GoRouter. |
| NFR-2 | Adding the button to a screen must require **one import + one line** of widget insertion in the `actions` list. |
| NFR-3 | The button must meet WCAG 2.1 AA touch-target size (minimum 48×48 dp) — satisfied by default via `IconButton`. |
| NFR-4 | The widget must include a `/// JSDoc`-style Dart doc comment on the class and constructor per project conventions. |
| NFR-5 | A unit/widget test must be created for `SettingsActionButton` verifying: (a) it renders a gear icon, (b) tapping it triggers navigation to `/settings`. |
| NFR-6 | Existing tests for affected screens must continue to pass without modification, or be updated minimally to account for the new AppBar action. |
| NFR-7 | No new packages or dependencies may be introduced. |

---

## 6. Acceptance Criteria

| AC | Criterion | Verification |
|----|-----------|--------------|
| AC-1 | A gear icon (⚙) is visible in the AppBar on HomeScreen (`/`), GameScreen (`/play`), LearnScreen (`/learn`), TutorialScreen (`/tutorial`), and ProfileScreen (`/profile`). | Manual QA — navigate to each screen and visually confirm |
| AC-2 | Tapping the gear icon on **each** of the five screens navigates to the SettingsScreen (`/settings`). | Manual QA + widget test |
| AC-3 | Tapping the system back button or AppBar back arrow from SettingsScreen returns to the originating screen. | Manual QA |
| AC-4 | On GameScreen, the settings gear icon is no longer a no-op; it navigates to `/settings`. | Widget test — verify `context.push` is called |
| AC-5 | On LearnScreen, changing the board theme in settings and navigating back causes the interactive board to re-render with the new theme. | Manual QA |
| AC-6 | On GameScreen, changing display preferences in settings and navigating back causes the game board to reflect updated theme/notation/legal-move settings immediately. | Manual QA |
| AC-7 | Toggling dark mode in settings from any screen applies the theme change app-wide upon return. | Manual QA |
| AC-8 | LoginScreen and RegisterScreen do **not** show a settings gear icon. | Manual QA |
| AC-9 | All existing widget and unit tests pass (`flutter test`). | CI |
| AC-10 | A new widget test for `SettingsActionButton` exists and passes. | CI |
| AC-11 | `flutter analyze` reports zero issues on the new and modified files. | CI |

---

## 7. Screens Affected

### 7.1 HomeScreen (`/`)

- **File:** `lib/features/home/presentation/home_screen.dart`
- **Current state:** Has an inline `IconButton(icon: Icon(Icons.settings_outlined), onPressed: () => context.push(AppRoutes.settings))` in `AppBar.actions`.
- **Required change:** Replace the inline `IconButton` with `const SettingsActionButton()`. Add import for the shared widget. Behaviour is identical — this is a DRY refactor.

### 7.2 GameScreen (`/play`)

- **File:** `lib/features/game/presentation/screens/game_screen.dart`
- **Current state:** Has `IconButton(icon: Icon(Icons.settings), onPressed: () { // TODO: Open in-game settings. })` — the callback is empty, the button is non-functional.
- **Required change:** Replace the broken `IconButton` with `const SettingsActionButton()`. Remove the TODO. The button will navigate to `/settings` via `context.push`, preserving the game state on the back-stack.

### 7.3 LearnScreen (`/learn`)

- **File:** `lib/features/learning/presentation/learn_screen.dart`
- **Current state:** `AppBar.actions` contains only a restart-tutorial `IconButton`. No settings access.
- **Required change:** Append `const SettingsActionButton()` to the `actions` list after the restart button. Add import.

### 7.4 TutorialScreen (`/tutorial`)

- **File:** `lib/features/tutorial/presentation/tutorial_screen.dart`
- **Current state:** `AppBar` has a title only — no `actions` property.
- **Required change:** Add `actions: [const SettingsActionButton()]` to the AppBar. Add import.

### 7.5 ProfileScreen (`/profile`)

- **File:** `lib/features/profile/presentation/profile_screen.dart`
- **Current state:** `AppBar.actions` contains only a conditional logout `IconButton`. No settings access.
- **Required change:** Insert `const SettingsActionButton()` into the `actions` list before the logout button. Add import.

### 7.6 LoginScreen (`/login`) — No Change

Settings not applicable during authentication flow.

### 7.7 RegisterScreen (`/register`) — No Change

Settings not applicable during authentication flow.

---

## 8. UX Requirements

### 8.1 Icon & Placement

- **Icon:** `Icons.settings_outlined` (Material outlined variant) — matches the existing HomeScreen convention.
- **Placement:** Always in `AppBar.actions`, right-aligned. On screens with multiple actions (e.g. ProfileScreen with logout), the settings icon should appear **before** other contextual actions to maintain a consistent leftmost position.
- **Tooltip:** `'Settings'` — surfaces on long-press (mobile) and as accessibility label.

### 8.2 Ordering Convention (AppBar Actions)

| Screen | Actions (left → right) |
|--------|----------------------|
| HomeScreen | Profile, **Settings** |
| GameScreen | Pause/Resume (conditional), **Settings** |
| LearnScreen | Restart Tutorial, **Settings** |
| TutorialScreen | **Settings** |
| ProfileScreen | **Settings**, Logout (conditional) |

### 8.3 Navigation Pattern

- Use `context.push(AppRoutes.settings)` — **push**, not `go` — so the SettingsScreen is pushed onto the navigation stack and the user returns to their previous screen with the back gesture or AppBar back arrow.
- The SettingsScreen already has its own AppBar with a back button (default GoRouter behaviour).

### 8.4 Visual Consistency

- The `SettingsActionButton` widget must look identical on all screens: same icon, same size (48dp default), same tooltip.
- No per-screen visual variations.

### 8.5 Reactivity

- Settings changes apply reactively via Riverpod. All screens already use `ref.watch(settingsProvider)` for board theme (GameScreen, LearnScreen, ReplayViewer) and the App widget watches it for dark mode. No additional reactive wiring is needed — navigating back from SettingsScreen will rebuild any watching consumers automatically.

---

## 9. Out of Scope

| Item | Rationale |
|------|-----------|
| In-game settings overlay/bottom-sheet | The SettingsScreen is a full-page route. A contextual overlay during gameplay is a separate future enhancement. This feature ensures the full settings screen is reachable — not that settings are inline. |
| New settings fields | No new preferences are added. Only access to the existing SettingsScreen is improved. |
| Backend sync changes | Backend sync for authenticated users is already handled by the SettingsScreen/provider. No changes needed. |
| Settings on LoginScreen / RegisterScreen | These authentication screens intentionally omit settings access. |
| SettingsScreen redesign | The existing SettingsScreen layout (board theme chips, toggles, segmented animation speed, dark mode switch) is unchanged. |
| Keyboard / focus-trap (web-style) | This is a mobile app — the web-specific overlay/drawer pattern with Escape-key dismissal and modal focus trap does not apply. The mobile pattern is full-page navigation. |
| Deep-link support for settings | Settings are accessed via in-app navigation only. |
| Tablet / foldable layout adjustments | The current single-column layout works on tablets. Adaptive layouts are out of scope. |

---

## 10. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| **Screen coverage** | Settings button present on 5/5 applicable screens | Automated widget tests verifying the presence of `SettingsActionButton` in each screen's AppBar |
| **Zero broken callbacks** | 0 screens with empty or no-op settings `onPressed` | Code review + widget test for GameScreen |
| **Test pass rate** | 100% of existing + new tests pass | `flutter test` in CI |
| **Static analysis** | 0 issues from `flutter analyze` on changed files | CI pipeline |
| **Code deduplication** | Settings navigation logic defined in exactly 1 widget (`SettingsActionButton`) instead of duplicated inline in N screens | Code review — `grep -r "AppRoutes.settings"` returns only the widget and the router definition |
| **User friction reduction** | Users can access settings within 1 tap from any main screen | Manual QA walkthrough |
| **Implementation size** | ≤ 1 new file (~25 LOC), ≤ 5 files modified (1–3 lines each) | PR diff |

---

## Appendix A: Proposed Widget

```dart
// lib/shared/widgets/settings_action_button.dart

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:international_draughts/core/routing/router.dart';

/// AppBar action button that navigates to the Settings screen.
///
/// Drop into any screen's `AppBar.actions` list:
/// ```dart
/// AppBar(
///   title: const Text('Screen Title'),
///   actions: [const SettingsActionButton()],
/// )
/// ```
class SettingsActionButton extends StatelessWidget {
  /// Creates a [SettingsActionButton].
  const SettingsActionButton({super.key});

  @override
  Widget build(BuildContext context) {
    return IconButton(
      icon: const Icon(Icons.settings_outlined),
      tooltip: 'Settings',
      onPressed: () => context.push(AppRoutes.settings),
    );
  }
}
```

## Appendix B: Technical Dependencies

| Dependency | Version | Usage |
|------------|---------|-------|
| `flutter` | SDK | Core framework |
| `go_router` | ^15.1.2 | `context.push(AppRoutes.settings)` navigation |
| `flutter_riverpod` | ^2.6.1 | Reactive settings state (already wired in affected screens) |
| `shared_preferences` | ^2.5.3 | Settings persistence (no changes needed) |

No new dependencies are required.

## Appendix C: Files Changed (Estimated)

| File | Change Type | Lines Changed (est.) |
|------|------------|---------------------|
| `lib/shared/widgets/settings_action_button.dart` | **New** | ~25 |
| `lib/features/home/presentation/home_screen.dart` | Modified | ~3 (replace inline IconButton + add import) |
| `lib/features/game/presentation/screens/game_screen.dart` | Modified | ~5 (replace broken IconButton + remove TODO + add import) |
| `lib/features/learning/presentation/learn_screen.dart` | Modified | ~2 (append to actions + add import) |
| `lib/features/tutorial/presentation/tutorial_screen.dart` | Modified | ~2 (add actions + add import) |
| `lib/features/profile/presentation/profile_screen.dart` | Modified | ~2 (insert into actions + add import) |
| `test/shared/widgets/settings_action_button_test.dart` | **New** | ~40 |
---

## Dev Lead Review

**Reviewer:** Dev Lead Agent  
**Date:** 2026-02-21  
**Verdict:** Approved with required changes (see below)

### 1. Technical Accuracy Validation

| FRD Claim | Verified? | Notes |
|-----------|-----------|-------|
| HomeScreen has inline `IconButton` for settings in `AppBar.actions` | ✅ Yes | Profile icon first, then settings icon — order matches FRD Section 8.2 |
| GameScreen has `IconButton` with empty `onPressed` and `// TODO: Open in-game settings.` | ✅ Yes | Confirmed at `game_screen.dart` line 87. Icon is `Icons.settings` (filled), **not** `Icons.settings_outlined` |
| LearnScreen `AppBar.actions` has only a restart-tutorial button | ✅ Yes | Single `IconButton` with `Icons.refresh` |
| TutorialScreen AppBar has no `actions` | ✅ Yes | `AppBar(title: const Text('Rules & Tutorial'))` with no actions property |
| ProfileScreen `AppBar.actions` has only a conditional logout button | ✅ Yes | Conditional on `authState is Authenticated` |
| `AppRoutes.settings` exists as `/settings` | ✅ Yes | Defined in `router.dart`, routes to `SettingsScreen` |
| `lib/shared/widgets/` directory exists | ✅ Yes | Already contains `error_widget.dart`, `loading_indicator.dart`, `offline_banner.dart` |
| "All screens already use `ref.watch(settingsProvider)` for board theme" (Section 8.5) | ❌ **No** | See Issue #1 below |
| Proposed widget code is correct | ✅ Yes | Imports, `context.push`, `AppRoutes.settings`, `StatelessWidget` usage all valid |

### 2. Issues Found

#### Issue #1 (BLOCKER): LearnScreen board does NOT watch `settingsProvider`

**FRD Section 8.5** states: *"All screens already use `ref.watch(settingsProvider)` for board theme (GameScreen, LearnScreen, ReplayViewer). No additional reactive wiring is needed."*

This is **incorrect for LearnScreen**. The `_LearningBoard` widget in `learn_screen.dart` (line ~379) constructs its `BoardPainter` with a **hardcoded** theme:

```dart
painter: BoardPainter(
  boardTheme: BoardTheme.classicWood,  // ← hardcoded, not from settings
  ...
),
```

**Impact:**
- **US-3** ("change the board theme and toggle notation while following guided steps") will NOT work with just adding the settings button.
- **AC-5** ("changing the board theme in settings and navigating back causes the interactive board to re-render with the new theme") will **FAIL**.
- The `_LearningBoard` is a `StatelessWidget`, not a `ConsumerWidget`, so it cannot watch providers. It needs to be refactored to accept a `BoardTheme` parameter passed down from the `ConsumerWidget` parent, which watches `settingsProvider`.

**Required FRD changes:**
- Update Section 8.5 to acknowledge LearnScreen does NOT currently watch `settingsProvider`.
- Add a requirement (e.g., FR-14) to wire `LearnScreen`'s `_LearningBoard` to `settingsProvider` for board theme.
- Update Appendix C: `learn_screen.dart` estimated lines changed should increase from ~2 to ~8 (add import for `settingsProvider`, pass `boardTheme` from `ref.watch(settingsProvider).boardTheme` through to `_LearningBoard`, add parameter to `_LearningBoard`, update `BoardPainter` construction).
- Consider whether `showNotation` and `showLegalMoves` settings should also apply to LearnScreen's board (currently they don't).

#### Issue #2 (HIGH): Clock continues running during settings navigation from GameScreen

When a user taps the settings button on GameScreen during a **timed game**, `context.push(AppRoutes.settings)` navigates to the settings screen. However:

- The `ClockNotifier` only pauses on **app-level** lifecycle changes (`WidgetsBindingObserver.didChangeAppLifecycleState`) — e.g., minimizing the app or switching apps.
- In-app `context.push` navigation does **not** trigger a lifecycle state change. The app remains in `AppLifecycleState.resumed`.
- The `Timer.periodic` inside `ClockNotifier` continues ticking because the notifier is a Riverpod `StateNotifier` that lives outside the widget lifecycle.
- **Result: The player's clock ticks down while they browse settings.** In a timed game, this could cause an unintended time-out loss.

**Recommended actions (pick one):**
1. **(Preferred) Auto-pause the clock** before navigating to settings from GameScreen. The `SettingsActionButton` could accept an optional `VoidCallback? onBeforeNavigate` parameter, and GameScreen would pass `() => ref.read(clockProvider.notifier).pause()`. Alternatively, `GameScreen` could use a custom wrapper instead of the generic `SettingsActionButton` for this one screen.
2. **Show a confirmation dialog** on GameScreen when the clock is running: "Pause game and open settings?" — only navigate if confirmed.
3. **Document as accepted behavior** if the team decides it's the user's responsibility.

The FRD should explicitly address this in a new requirement or in the Out of Scope / Risks section.

#### Issue #3 (LOW): GameScreen icon variant changes from filled to outlined

The existing GameScreen uses `Icons.settings` (filled variant). The new `SettingsActionButton` uses `Icons.settings_outlined`. This is a minor visual change. The FRD Section 7.2 description mentions the existing icon but doesn't explicitly call out this variant change. Not a blocker — the outlined variant is the correct target per the HomeScreen convention.

### 3. Feasibility Assessment

**Overall: Feasible.** The proposed approach is sound:
- The `lib/shared/widgets/` directory is established and follows existing patterns.
- `GoRouter` `context.push` is the correct navigation method and is already used throughout the app.
- Riverpod reactivity will handle settings changes on return for screens that already watch `settingsProvider` (GameScreen via `settingsProvider.select`, App widget for dark mode).
- The proposed widget code is correct and idiomatic Dart/Flutter.

### 4. Test Coverage Assessment

**Current test state is extremely sparse:**
- `test/widget_test.dart` is boilerplate (tests a non-existent counter widget — likely auto-generated by `flutter create`).
- Only one meaningful test exists: `test/features/learning/learning_notifier_test.dart`.
- **No existing widget tests for any of the five affected screens.**

**Implications:**
- NFR-6 ("Existing tests must continue to pass") is trivially satisfied.
- NFR-5 proposes a widget test for `SettingsActionButton` — this is good but minimal.
- Consider adding per-screen smoke tests verifying the settings icon is present in the AppBar. This would provide regression protection and directly verify AC-1.

### 5. Recommended Additions to FRD

| # | Type | Recommendation |
|---|------|---------------|
| R1 | **New Requirement** | Add FR-14: Wire `LearnScreen`'s `_LearningBoard` to `settingsProvider` so board theme changes apply reactively. (Blocks US-3 and AC-5.) |
| R2 | **New Requirement or Risk** | Address clock behavior when navigating from GameScreen to settings during a timed game. Either add a requirement to auto-pause, or add to Out of Scope with rationale. |
| R3 | **Correction** | Update Section 8.5 to remove the incorrect claim that LearnScreen already watches `settingsProvider`. |
| R4 | **Appendix C update** | Increase `learn_screen.dart` estimated lines changed from ~2 to ~8 to account for `settingsProvider` wiring. |
| R5 | **Test enhancement** | Consider adding per-screen smoke tests (even simple `find.byIcon(Icons.settings_outlined)` assertions) beyond just the `SettingsActionButton` unit test. |
| R6 | **Clarification** | Note in Section 7.2 that the GameScreen icon changes from `Icons.settings` (filled) to `Icons.settings_outlined`. |