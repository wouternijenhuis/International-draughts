# ADR-017: Mobile UI/UX Improvements — Game Setup Bottom Sheet, Navigation, and Design Token Compliance

## Status

Proposed

## Date

2026-02-21

## Context

A comprehensive UI/UX audit of the Flutter mobile app identified **26 issues** spanning layout, navigation, theming, and component ergonomics. While many are isolated cosmetic fixes, several require architectural decisions that affect component hierarchy, navigation flow, and state propagation patterns.

The most impactful finding is that the **Game Setup Dialog** — the entry point for every new game — uses an `AlertDialog` that is structurally unsuitable for its content complexity. The dialog currently renders three `SegmentedButton` controls (opponent, difficulty, player color), a `SwitchListTile` (timed game), a clock preset grid (`ChoiceChip` wrap), and three action buttons (Cancel, Quick Start, Start Game) inside a container constrained to ~280dp maximum width on most devices. This causes text truncation, cramped touch targets, and overflow on smaller screens.

### Current Architecture (Game Setup)

```
showDialog<void>(
  builder: (_) => const GameSetupDialog(),    // AlertDialog
)
└── AlertDialog
    ├── title: "New Game"
    ├── content: SingleChildScrollView
    │   ├── SegmentedButton<String>  (Opponent: AI | Human)
    │   ├── SegmentedButton<String>  (Difficulty: Easy | Medium | Hard | Expert)
    │   ├── SegmentedButton<String>  (Color: White | Black | Random)
    │   ├── SwitchListTile           (Timed Game)
    │   └── AnimatedCrossFade → _ClockPresetGrid (ChoiceChip wrap)
    └── actions: [Cancel, Quick Start, Start Game]
```

Source: [`mobile/lib/features/game/presentation/widgets/setup/game_setup_dialog.dart`](../../mobile/lib/features/game/presentation/widgets/setup/game_setup_dialog.dart) (349 lines).

### Specific Problems Identified

| # | Issue | Category | Severity |
|---|-------|----------|----------|
| 1 | Difficulty `SegmentedButton` truncates "Expert" + server badge at AlertDialog width | Layout | High |
| 2 | Three action buttons overflow horizontally on narrow devices | Layout | High |
| 3 | Clock preset chips wrap awkwardly in ~280dp container | Layout | Medium |
| 4 | Home screen uses `context.go()` for all navigation, replacing the stack | Navigation | High |
| 5 | Back gesture from Play/Settings/Profile returns to OS, not Home | Navigation | High |
| 6 | `BoardWidget` hardcodes `BoardTheme.classicWood` instead of reading user settings | Theming | Medium |
| 7 | `LearnScreen` hardcodes `BoardTheme.classicWood` | Theming | Medium |
| 8 | Hardcoded colors in various widgets instead of `Theme.of(context).colorScheme` | Theming | Low |
| 9 | Hardcoded spacing values instead of `DesignTokens` constants | Theming | Low |
| 10–26 | Additional cosmetic/polish items (clock display flip, icon sizing, padding, etc.) | UI Polish | Low |

### Forces

- **Touch target compliance**: Material 3 mandates 48dp minimum touch targets. AlertDialog's constrained width makes it difficult to meet this for 4-segment buttons.
- **Responsive layout**: The app must work from 320dp (small phones) to 600dp+ (tablets). A single fixed-width dialog is the wrong primitive for this range.
- **Consistency with web**: ADR-008 established the modal dialog pattern for the Next.js frontend. The mobile equivalent should be the platform-idiomatic bottom sheet, not a direct port of the web dialog.
- **Navigation expectations**: iOS and Android users expect back gestures to navigate up the screen hierarchy. `context.go()` replaces the entire stack, defeating this expectation.
- **Settings propagation**: The Riverpod `settingsProvider` (ADR-009) already holds `boardTheme`, but several widgets bypass it and hardcode `BoardTheme.classicWood`.
- **Incremental delivery**: DevLead recommends shipping trivial fixes (navigation, board theme, clock flip) as a quick PR, followed by the bottom sheet conversion as a focused PR.

---

## Decision

### Decision 1: Convert Game Setup from AlertDialog to ModalBottomSheet with DraggableScrollableSheet

**Replace `showDialog<void>(() => AlertDialog(...))` with `showModalBottomSheet(() => DraggableScrollableSheet(...))` for the game setup flow.**

The bottom sheet will use `DraggableScrollableSheet` to provide:
- Full device width (minus safe area insets), solving all truncation issues.
- Drag-to-dismiss gesture, matching platform conventions.
- Scrollable content for smaller screens and landscape orientation.
- A drag handle for affordance.

**New architecture:**

```
showModalBottomSheet<void>(
  isScrollControlled: true,
  useSafeArea: true,
  builder: (_) => const GameSetupBottomSheet(),
)
└── DraggableScrollableSheet
    ├── initialChildSize: 0.75  (portrait) / 0.65 (landscape)
    ├── maxChildSize: 0.95
    ├── minChildSize: 0.4
    └── builder: (context, scrollController)
        └── Container (capped at 480dp maxWidth for tablets, centered)
            ├── Drag handle bar
            ├── "New Game" header
            ├── ListView (controller: scrollController)
            │   ├── SegmentedButton<String>  (Opponent)
            │   ├── SegmentedButton<String>  (Difficulty — now fits at full width)
            │   ├── SegmentedButton<String>  (Color)
            │   ├── SwitchListTile           (Timed Game)
            │   └── AnimatedCrossFade → _ClockPresetGrid
            └── Action bar (pinned at bottom)
                ├── TextButton: Cancel
                ├── OutlinedButton: Quick Start
                └── FilledButton: Start Game
```

**Widget implementation pattern:**

```dart
showModalBottomSheet<void>(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  shape: const RoundedRectangleBorder(
    borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
  ),
  builder: (context) => const GameSetupBottomSheet(),
);
```

**Responsive constraints:**

| Condition | Behavior |
|-----------|----------|
| Portrait phone (< 600dp) | Full width, `initialChildSize: 0.75` |
| Landscape phone | Full width, `initialChildSize: 0.65` to leave board visible above |
| Tablet (≥ 600dp) | Content capped at `maxWidth: 480dp`, centered horizontally |

The 480dp cap prevents the form from stretching uncomfortably on tablets while still being substantially wider than the ~280dp AlertDialog constraint.

**Rationale:**

| Criterion | ModalBottomSheet (chosen) | AlertDialog (current) | Full-screen dialog |
|-----------|--------------------------|----------------------|-------------------|
| **Available width** | Full device width (minus insets) | ~280dp (Material spec) | Full device width |
| **Touch targets** | Easily meets 48dp minimums | Cramped; 4 segments overflow | Easily meets 48dp |
| **Dismiss gesture** | Drag down — platform-native | Tap outside or Cancel button | Back button/gesture only |
| **Content scrolling** | Built-in via `DraggableScrollableSheet` | Needs `SingleChildScrollView` inside fixed container | Full page scroll |
| **Visual context** | Board visible above the sheet | Board dimmed behind overlay | Board fully hidden |
| **Implementation complexity** | Moderate — `DraggableScrollableSheet` + pinned action bar | Low (current) | Low, but requires separate route |
| **Platform convention** | iOS: drag-up sheet is standard for setup flows. Android: bottom sheet is Material 3 pattern. | More suited for simple confirmations | Heavyweight for a 5-option form |

---

### Decision 2: Keep SegmentedButton for Difficulty Selector (Do Not Switch to ChoiceChip)

**Retain `SegmentedButton<String>` with 4 segments (Easy | Medium | Hard | Expert) for the difficulty selector. Do not convert to `ChoiceChip`.**

The SegmentedButton was originally problematic because the AlertDialog constrained it to ~280dp. In the new bottom sheet, the full device width provides ample room:

| Device width | Available width (sheet) | Per-segment width (4 segments) |
|-------------|------------------------|-------------------------------|
| 320dp | ~304dp (minus 16dp padding) | ~76dp |
| 375dp | ~343dp | ~86dp |
| 414dp | ~382dp | ~96dp |
| 480dp (tablet cap) | ~448dp | ~112dp |

At 76dp per segment (worst case), "Expert" + the server badge fits comfortably with the existing `FittedBox` wrapper.

**Rationale for rejecting ChoiceChip:**
- `SegmentedButton` communicates single-select semantics visually — the user sees exactly one option is active. `ChoiceChip` in a `Wrap` looks like multi-select to users unfamiliar with the pattern.
- `SegmentedButton` provides a connected visual group, making the four difficulty levels feel like a spectrum/scale. Disconnected chips lose this affordance.
- The Expert segment's "Server" badge already uses a `FittedBox` for graceful scaling — this pattern works well at the width available in the bottom sheet.
- Consistency: the Opponent and Color selectors also use `SegmentedButton`. Mixing chip and segmented patterns in the same dialog adds visual noise.

---

### Decision 3: Replace `context.go()` with `context.push()` for Home Screen Navigation

**Change all `context.go()` calls in `home_screen.dart` to `context.push()` so that navigated-to screens are pushed onto the navigation stack rather than replacing it.**

Currently, [`home_screen.dart`](../../mobile/lib/features/home/presentation/home_screen.dart) uses `context.go()` for all navigation buttons:

```dart
onPressed: () => context.go(AppRoutes.play),     // replaces stack
onPressed: () => context.go(AppRoutes.learn),     // replaces stack
onPressed: () => context.go(AppRoutes.tutorial),  // replaces stack
// AppBar actions:
onPressed: () => context.go(AppRoutes.profile),   // replaces stack
onPressed: () => context.go(AppRoutes.settings),  // replaces stack
```

With `context.go()`, GoRouter replaces the navigation stack. The user lands on `/play` with no back stack — swiping back or pressing the back button exits the app instead of returning to Home.

**Change to:**

```dart
onPressed: () => context.push(AppRoutes.play),
onPressed: () => context.push(AppRoutes.learn),
onPressed: () => context.push(AppRoutes.tutorial),
onPressed: () => context.push(AppRoutes.profile),
onPressed: () => context.push(AppRoutes.settings),
```

**Scope:** Only `home_screen.dart` changes. Other screens that use `context.go()` (e.g., `login_screen.dart` navigating to Home after login, `register_screen.dart` navigating to Home after registration) correctly use `go()` because they intend to replace the stack (the user should not "go back" to the login screen after authenticating).

---

### Decision 4: Design Token and Theme Compliance

**All widgets must use `Theme.of(context)` color/typography references and `DesignTokens` spacing constants. Hardcoded values are prohibited.**

The audit found instances of:
- Direct `Color(0xFF...)` literals instead of `Theme.of(context).colorScheme.*`
- Numeric spacing (`SizedBox(height: 8)`) instead of `DesignTokens.spacingSm`
- `BoardWidget` and `LearnScreen` hardcoding `BoardTheme.classicWood` instead of reading from `settingsProvider`

**Board theme propagation pattern:**

```dart
// In any widget that renders a BoardWidget:
final boardTheme = ref.watch(
  settingsProvider.select((s) => s.boardTheme),
);

BoardWidget(
  boardTheme: boardTheme,  // not BoardTheme.classicWood
  // ...
)
```

Using `.select((s) => s.boardTheme)` scopes rebuilds — the widget only re-renders when the board theme changes, not when any other setting changes. This follows the Riverpod selective rebuild pattern established in ADR-009.

**Affected widgets (non-exhaustive):**

| Widget | Current | Fix |
|--------|---------|-----|
| `GameScreen` → `BoardWidget` | Hardcoded `classicWood` | Read from `settingsProvider` |
| `LearnScreen` → `BoardWidget` | Hardcoded `classicWood` | Read from `settingsProvider` |
| `ReplayViewer` → `BoardWidget` | Hardcoded `classicWood` | Read from `settingsProvider` |
| Various widgets | `Color(0xFF...)` | `Theme.of(context).colorScheme.*` |
| Various widgets | `SizedBox(height: 8)` | `SizedBox(height: DesignTokens.spacingSm)` |

---

## Consequences

### Positive

- **Difficulty selector fits without truncation** — the 4-segment `SegmentedButton` renders comfortably at full bottom-sheet width, even on 320dp devices.
- **Action buttons never overflow** — the three action buttons have full width to lay out horizontally, with room to wrap to a column on extremely narrow screens.
- **Platform-native UX** — bottom sheets are the expected mobile pattern for configuration flows on both iOS and Android.
- **Back navigation works** — users can swipe back from any screen to return to Home, matching platform expectations.
- **Theme consistency** — a single source of truth for board colors, spacing, and typography. Changing a theme in Settings immediately reflects everywhere.
- **Scoped rebuilds** — `ref.watch(settingsProvider.select(...))` prevents unnecessary re-renders when unrelated settings change.
- **Incremental delivery** — the decisions decompose into two independent PRs (trivial fixes first, bottom sheet second) with no cross-dependencies.

### Negative

- **Bottom sheet adds complexity over AlertDialog** — `DraggableScrollableSheet` with a pinned action bar requires more layout code than the current `AlertDialog` with `actions`. Estimated +80 lines net in the setup widget.
- **Landscape handling** — the reduced `initialChildSize: 0.65` in landscape requires an `OrientationBuilder` or `MediaQuery` check, adding a conditional code path.
- **Tablet width cap** — the 480dp `maxWidth` constraint requires a wrapping `Center` + `ConstrainedBox`, adding nesting to the widget tree.
- **Testing surface** — bottom sheet dismiss gestures require integration-level testing (`tester.drag`) that AlertDialog tests did not need.

### Neutral

- **No state management changes** — the game setup state machine (local `StatefulWidget` state + `SharedPreferences` persistence) is unchanged. Only the presentation container changes from `AlertDialog` to bottom sheet.
- **No engine changes** — all 26 issues are UI-layer only. The shared Dart engine and backend are unaffected.
- **Config persistence unaffected** — `SharedPreferences` keys and save/load logic remain identical.
- **ADR-008 alignment** — the web frontend (ADR-008) uses a centered modal dialog, which is the correct web pattern. The mobile app using a bottom sheet is the correct mobile equivalent — both serve the same UX function through platform-idiomatic primitives.

---

## Alternatives Considered

### Alternative 1: Keep AlertDialog, Switch Difficulty to ChoiceChip

Retain the `AlertDialog` container but replace the 4-segment `SegmentedButton` for difficulty with four `ChoiceChip` widgets in a `Wrap` layout.

**Rejected because:**
- Only addresses the difficulty truncation issue. The three action buttons still overflow at ~280dp. The clock preset grid is still cramped.
- `ChoiceChip` in a wrap loses the visual "scale" affordance that `SegmentedButton` provides for difficulty levels.
- Introduces a mixed component vocabulary — `SegmentedButton` for opponent and color, `ChoiceChip` for difficulty — adding visual inconsistency.
- Does not solve the fundamental width constraint; it merely works around one symptom.

### Alternative 2: Full-Screen Dialog (`showGeneralDialog` / `MaterialPageRoute`)

Replace the `AlertDialog` with a full-screen modal page (like Flutter's `showGeneralDialog` with `fullscreenDialog: true`) that takes over the entire screen.

**Rejected because:**
- Heavyweight for a 5-option form. Full-screen dialogs in Material Design are intended for complex multi-step flows (e.g., composing an email, editing a document).
- Destroys visual context — the user cannot see the board behind the setup form. The bottom sheet intentionally leaves the top portion of the screen visible.
- Requires a dedicated route or `PageRouteBuilder`, adding routing complexity.
- Inconsistent with the "quick start" flow — a full-screen takeover feels heavy when the user just wants to tap "Quick Start" with their last settings.

### Alternative 3: Inline Setup Panel (No Overlay)

Replace the dialog/sheet with an inline configuration panel rendered directly on the game screen when no game is active (similar to how the web frontend's original `SettingsPanel` worked before ADR-008).

**Rejected because:**
- Requires managing the board area visibility/sizing alongside the setup panel, adding layout complexity.
- The game screen already handles the board, controls, move history, and game-over overlay. Adding a conditional setup panel increases the screen's responsibility count.
- The "New Game" flow from the Home screen would need to navigate to `/play` and then conditionally show the panel — a less clear UX than a bottom sheet that explicitly requests user attention.
- ADR-008 explicitly rejected this pattern for the web frontend for similar reasons.

### Alternative 4: Keep `context.go()`, Add Home to Every Route's Back Stack

Use GoRouter's `ShellRoute` or nested navigation to ensure Home is always in the back stack even with `go()`.

**Rejected because:**
- Over-engineered for the problem. The app has a flat route structure (Home → leaf screens). `push()` is the correct primitive for "navigate forward." `go()` is intended for deep-link-style navigation where the stack should be rebuilt.
- `ShellRoute` introduces a persistent shell widget (e.g., `BottomNavigationBar`) which is not part of the app's design.
- Changing from `go()` to `push()` is a one-line change per call site with zero architectural risk.

---

## Implementation Phasing

| Phase | PR | Scope | Effort |
|-------|-----|-------|--------|
| 1 | Quick fixes | `context.go()` → `context.push()` in `home_screen.dart`; board theme propagation via `settingsProvider.select()`; clock display flip; miscellaneous spacing/color token fixes | Small (1–2 hours) |
| 2 | Bottom sheet | Convert `GameSetupDialog` → `GameSetupBottomSheet` with `DraggableScrollableSheet`; responsive `initialChildSize`; tablet 480dp cap; pinned action bar; update all call sites (`game_screen.dart`) | Medium (4–6 hours) |

Each phase produces a standalone PR with its own tests and can be merged independently. Phase 2 depends on Phase 1 only in the sense that Phase 1 should merge first to reduce diff noise, but there are no code-level dependencies.

---

## Related

- [ADR-008: Game Setup Dialog (Web)](adr-008-game-setup-dialog.md) — establishes the web frontend's modal dialog pattern for game setup. This ADR is the mobile counterpart.
- [ADR-009: Flutter State Management Architecture](adr-009-flutter-state-management.md) — defines the Riverpod provider architecture including `settingsProvider` and `gameProvider`.
- [ADR-016: FMJD Rules Compliance Fixes](adr-016-fmjd-rules-compliance.md) — BUG-003 (config lost on game over) affects the same `GameNotifier`. UI improvements in this ADR should be coordinated with BUG-003's state fix.
- Source: [`mobile/lib/features/game/presentation/widgets/setup/game_setup_dialog.dart`](../../mobile/lib/features/game/presentation/widgets/setup/game_setup_dialog.dart) — current AlertDialog implementation (349 lines)
- Source: [`mobile/lib/features/home/presentation/home_screen.dart`](../../mobile/lib/features/home/presentation/home_screen.dart) — `context.go()` calls to be changed
- Source: [`mobile/lib/core/routing/router.dart`](../../mobile/lib/core/routing/router.dart) — GoRouter configuration
