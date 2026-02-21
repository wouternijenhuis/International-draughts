# ADR-019: Mobile Global Settings Button — Widget Strategy, Navigation, and Side-Effects

## Status

Proposed

## Date

2026-02-21

## Context

The International Draughts Flutter mobile app has inconsistent settings access. The gear icon works correctly on `HomeScreen` (navigates to `/settings` via `context.push`), but on `GameScreen` the icon's callback is an empty TODO, and on `LearnScreen`, `TutorialScreen`, and `ProfileScreen` the icon is absent entirely. Users on 4 of 5 main screens cannot reach display preferences.

The [Mobile Global Settings Button FRD](../features/mobile-global-settings-button.md) requires a settings gear icon in the AppBar of all five main screens, using a shared reusable widget. During design review, four additional architectural questions surfaced:

1. **Widget approach**: shared reusable widget vs. inline duplication per screen.
2. **Navigation pattern**: `context.push()` vs. `context.go()` for settings navigation.
3. **Clock behaviour**: the `ClockNotifier` continues ticking when a user navigates away from `GameScreen` to settings mid-game.
4. **LearnScreen board theme**: `_LearningBoard` in [`learn_screen.dart`](../../mobile/lib/features/learning/presentation/learn_screen.dart#L368) hardcodes `BoardTheme.classicWood` instead of reading from `settingsProvider`.
5. **Widget directory**: `lib/shared/widgets/` vs. `lib/core/widgets/`.

### Current Architecture

- **Router**: [`router.dart`](../../mobile/lib/core/routing/router.dart) defines `AppRoutes` with `GoRouter`. All routes are top-level `GoRoute` entries; no `ShellRoute` or `StatefulShellRoute` is used.
- **HomeScreen**: Has an inline `IconButton(icon: Icon(Icons.settings_outlined), onPressed: () => context.push(AppRoutes.settings))` in `AppBar.actions`.
- **GameScreen**: [`game_screen.dart`](../../mobile/lib/features/game/presentation/screens/game_screen.dart#L87-L91) has `IconButton(icon: Icon(Icons.settings), onPressed: () { // TODO: Open in-game settings. })` — a no-op.
- **LearnScreen**: [`learn_screen.dart`](../../mobile/lib/features/learning/presentation/learn_screen.dart#L31-L38) has `AppBar.actions` with only a restart-tutorial button. No settings button.
- **TutorialScreen**: AppBar has a title only — no `actions` list.
- **ProfileScreen**: `AppBar.actions` contains only a conditional logout button.
- **LoginScreen / RegisterScreen**: No settings button needed (per FRD).
- **Clock**: `ClockNotifier` ([`clock_provider.dart`](../../mobile/lib/features/game/presentation/providers/clock_provider.dart)) runs a `Timer.periodic` that ticks every second. It has `.pause()` and `.resume()` methods exposed on the notifier.
- **Shared widgets directory**: `lib/shared/widgets/` exists and contains `error_widget.dart`, `loading_indicator.dart`, and `offline_banner.dart`.
- **Core widgets directory**: `lib/core/widgets/` does not exist.

### Forces

- The existing `HomeScreen` already demonstrates the correct pattern: `context.push(AppRoutes.settings)` preserving back-stack. The goal is to replicate this across all screens without duplication.
- The clock continues ticking during navigation because `GoRouter.push()` keeps `GameScreen` mounted on the navigation stack — Riverpod providers scoped to that `ConsumerStatefulWidget` remain alive.
- `_LearningBoard` bypasses `settingsProvider` and hardcodes `BoardTheme.classicWood` (line 368 of `learn_screen.dart`). This means theme changes made in settings will not apply to the learn board until the hardcoding is fixed.
- ADR-017 already identified both the navigation pattern issue (issue #4–5) and the board theme hardcoding (issues #6–7) but deferred them for separate PRs. This ADR covers the settings button specifically, and makes decisions on how to handle the discovered side-effects.
- The `lib/shared/widgets/` directory is the established location for cross-feature reusable widgets (3 widgets already live there). No `lib/core/widgets/` directory exists.
- NFR-1 in the FRD requires the widget to be under 30 lines with zero external dependencies beyond Flutter and GoRouter.

---

## Decision

### Decision 1: Shared Reusable `SettingsActionButton` Widget

**Create a single `SettingsActionButton` StatelessWidget in `lib/shared/widgets/settings_action_button.dart` and use it on all five screens.**

#### Rationale

- **DRY**: The same icon (`Icons.settings_outlined`), tooltip (`'Settings'`), and navigation call (`context.push(AppRoutes.settings)`) would otherwise be duplicated five times. A shared widget means bug fixes and visual changes (e.g. switching to an animated icon, adding a badge) require a single edit.
- **Consistency**: Guarantees identical appearance and behaviour on every screen — icon variant, size, tooltip text, and navigation method are defined once.
- **Low cost**: The widget is ~15 lines of code with zero new dependencies. It follows the exact pattern of the three existing widgets in `lib/shared/widgets/`.
- **Testability**: One widget test covers all five screens' settings-navigation behaviour.

#### Rejected Alternative

*Inline `IconButton` on each screen*: Simpler for initial implementation but violates the FRD (FR-1, US-8) and introduces maintenance risk — any change to the settings navigation pattern (e.g. adding a modal variant) would require updating five files.

---

### Decision 2: Navigation via `context.push(AppRoutes.settings)` (Not `context.go()`)

**All settings navigation must use `context.push()` to push the settings route onto the GoRouter stack, preserving the originating screen.**

#### Rationale

- **Back-stack preservation**: `context.push()` adds `/settings` on top of the current route. Pressing the system back button or AppBar back arrow returns the user to the exact screen they came from. `context.go()` replaces the entire navigation stack, which would strand users — after visiting settings from `/learn`, back would exit the app instead of returning to `/learn`.
- **Platform expectations**: iOS swipe-back and Android system-back gestures expect a push/pop navigation model. ADR-017 already flagged `context.go()` misuse as a high-severity issue (#4–5) and mandated the switch to `context.push()` for navigation from the home screen.
- **State preservation**: `context.push()` keeps the originating screen's widget tree mounted. For `GameScreen`, this means the game state, board position, and clock continue operating — the user returns to exactly where they left off. `context.go()` would destroy and recreate the screen, losing in-progress game state.
- **Existing pattern**: `HomeScreen` already uses `context.push(AppRoutes.settings)` correctly. This decision standardises that pattern.

#### Rejected Alternative

*`context.go(AppRoutes.settings)`*: Would replace the navigation stack. This is destructive for `GameScreen` (destroys game state) and confusing for the user (no way to go back to the originating screen via back gesture).

---

### Decision 3: Clock Continues Running During Settings Navigation — Accepted Behaviour (Option B)

**The game clock will NOT be auto-paused when the user navigates to settings from GameScreen. This is accepted behaviour.**

#### Rationale

- **Player responsibility**: In competitive draughts (and chess), the clock is the player's responsibility. Navigating to settings is a voluntary action — the time cost is the player's to manage. This mirrors real-world tournament etiquette.
- **Brief interaction**: The settings screen is a quick preference toggle (theme, notation, legal moves). Typical visit duration is 2–5 seconds. Auto-pausing for such a brief interaction adds complexity without meaningful benefit.
- **Complexity vs. value**: Auto-pausing (Option A) would require:
  1. Detecting navigation away from `GameScreen` (e.g. via `RouteAware` mixin or `GoRouter` redirect guards).
  2. Pausing the clock on departure and resuming on return.
  3. Handling edge cases: what if the user navigates settings → home instead of settings → back? What if the game ends via timeout while on settings? What about the opponent's clock in a hypothetical multiplayer scenario?
  
  This is non-trivial state management for a marginal UX improvement.
- **Explicit pause exists**: The `GameScreen` AppBar already has a dedicated pause/resume button for timed games. Users who want to pause the clock can tap pause before navigating. This is the correct mental model — pause is an explicit action, not an implicit side-effect of navigation.
- **Warning dialog (Option C) is disruptive**: Adding a confirmation dialog every time a user taps settings during a timed game introduces friction for the most common case (quick theme change). It penalises all users for an edge case.

#### Accepted Trade-off

In extreme edge cases (e.g. user navigates to settings and gets distracted), time will elapse. This is acceptable because:
- The existing pause button provides an explicit mechanism.
- The clock timeout handler in `ClockNotifier` will correctly end the game if time runs out, even while on the settings screen, because the provider remains alive (see Decision 2).

---

### Decision 4: LearnScreen Board Theme Hardcoding — Tracked as Separate Issue (Option B)

**The `BoardTheme.classicWood` hardcoding in `_LearningBoard` will NOT be fixed as part of this feature. It will be tracked and resolved as a separate issue.**

#### Rationale

- **Scope discipline**: The FRD for `mobile-global-settings-button` is specifically about adding a settings *button* to screens. Fixing the board theme wiring in `LearnScreen` is a settings *consumption* fix — a distinct concern already identified in ADR-017 (issue #7).
- **Risk isolation**: The `_LearningBoard` widget has its own rendering pipeline (`BoardPainter`, `PieceWidget`, layout math). Wiring it to `settingsProvider` requires converting `_LearningBoard` from a `StatelessWidget` to a `ConsumerWidget` or passing the theme as a parameter from the parent `ConsumerWidget`. This change should be tested independently.
- **ADR-017 already covers it**: Issue #7 in ADR-017 explicitly identifies "`LearnScreen` hardcodes `BoardTheme.classicWood`" as a medium-severity theming issue. The fix belongs in the ADR-017 implementation PR, which addresses all board theme wiring issues together (including `BoardWidget` hardcoding, issue #6).
- **User value still delivered**: Even without the board theme fix, adding the `SettingsActionButton` to `LearnScreen` means users can *reach* settings from `/learn` for the first time. Theme changes will apply to the game board and other reactive consumers immediately — the learn board fix follows shortly after.

#### Follow-Up Required

Create a tracked issue: *"Wire `_LearningBoard` in `learn_screen.dart` to `settingsProvider.boardTheme` instead of hardcoded `BoardTheme.classicWood`"* — to be resolved alongside ADR-017 implementation.

---

### Decision 5: Widget Directory — `lib/shared/widgets/` (Not `lib/core/widgets/`)

**Place `SettingsActionButton` in `lib/shared/widgets/settings_action_button.dart`.**

#### Rationale

- **Convention**: The `lib/shared/widgets/` directory already exists and contains three reusable cross-feature widgets (`error_widget.dart`, `loading_indicator.dart`, `offline_banner.dart`). Placing the new widget here follows the established project convention.
- **`lib/core/` purpose**: In this codebase, `lib/core/` contains infrastructure-level concerns: routing (`core/routing/`), theming (`core/theme/`), and constants. It does not contain feature-facing widgets. Creating a `core/widgets/` directory would blur the distinction between infrastructure and shared UI.
- **Discoverability**: Developers looking for reusable widgets will naturally look in `shared/widgets/`. The directory name clearly communicates its purpose.
- **FRD alignment**: FR-1 explicitly specifies `lib/shared/widgets/` as the target directory.

#### Rejected Alternative

*`lib/core/widgets/`*: Would require creating a new directory and establishing a new convention. No clear benefit over the existing `shared/widgets/` pattern, and risks confusion about what belongs in `core/` vs `shared/`.

---

## Consequences

### Positive

- **Consistent UX**: Users can access settings from all five main screens via an identical gear icon with identical behaviour.
- **Maintainability**: Single widget definition means changes propagate automatically to all screens.
- **Navigation correctness**: All settings navigation uses `context.push()`, ensuring back-stack integrity across the app.
- **Minimal risk**: No changes to clock logic, game state management, or settings persistence. The feature is purely additive (one new widget + five single-line insertions).
- **Test coverage**: One widget test for `SettingsActionButton` plus minimal updates to existing screen tests.

### Negative

- **Clock keeps running**: Users who navigate to settings mid-timed-game without pausing will lose time. Mitigated by the existing explicit pause button.
- **LearnScreen theme not fixed**: After this feature ships, the learn board still won't reflect theme changes. Mitigated by tracking as a follow-up issue and resolving alongside ADR-017.
- **Minor icon inconsistency during transition**: `GameScreen` currently uses `Icons.settings` (filled); the new widget uses `Icons.settings_outlined`. This is intentional — the FRD specifies the outlined variant to match `HomeScreen`'s existing convention.

### Neutral

- No new packages or dependencies introduced.
- No changes to the router configuration or route definitions.
- No changes to `settingsProvider` or `SharedPreferences` persistence.
- Existing tests require at most minimal updates (e.g. `find.byIcon(Icons.settings)` → `find.byIcon(Icons.settings_outlined)` in `GameScreen` tests if they assert on the icon).

---

## References

- [Mobile Global Settings Button FRD](../features/mobile-global-settings-button.md)
- [ADR-017: Mobile UI/UX Improvements](adr-017-mobile-ui-improvements.md) — Issues #4–7 (navigation, board theme hardcoding)
- [ADR-018: Global Display Settings Architecture](adr-018-global-settings-architecture.md) — Web frontend equivalent
- [ADR-009: Flutter State Management](adr-009-flutter-state-management.md) — Riverpod + `settingsProvider` pattern
- [`router.dart`](../../mobile/lib/core/routing/router.dart) — GoRouter configuration and `AppRoutes`
- [`game_screen.dart`](../../mobile/lib/features/game/presentation/screens/game_screen.dart) — GameScreen with empty settings callback
- [`learn_screen.dart`](../../mobile/lib/features/learning/presentation/learn_screen.dart) — LearnScreen with hardcoded board theme
- [`clock_provider.dart`](../../mobile/lib/features/game/presentation/providers/clock_provider.dart) — ClockNotifier with pause/resume
