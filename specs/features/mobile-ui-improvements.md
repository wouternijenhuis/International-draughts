# Feature: Mobile UI/UX Improvements

**Feature ID:** `mobile-ui-improvements`  
**PRD Version:** 1.0  
**Last Updated:** 2026-02-21  
**Status:** Draft

---

## 1. Purpose

Address 26 UI/UX issues identified during a comprehensive audit of the Flutter mobile app (`mobile/`). The issues range from layout overflow bugs and broken navigation to Material 3 non-compliance and missing accessibility features. Resolving these issues is required to meet the premium, polished user experience demanded by business goal G2 (Fun & classy user experience) and the accessibility requirements in REQ-48.

### Problem Statement

A UI/UX audit uncovered 6 High-priority, 9 Medium-priority, and 11 Low-priority issues. The most severe problems include:

- The **AI Difficulty Selector** overflows on narrow screens — the 4-segment `SegmentedButton` is crammed inside an `AlertDialog` (~280dp max width), causing segment text collision and a nearly illegible 9px "Server" badge.
- The **Game Setup Dialog** packs 3 `SegmentedButton`s, a `SwitchListTile`, clock presets, and 3 action buttons into a narrow `AlertDialog`, which is inadequate for this density of controls.
- The **board theme** setting is not applied — `BoardWidget()` is always instantiated as `const` with `BoardTheme.classicWood` and never receives the user's selected theme from `SettingsProvider`.
- **Navigation is broken** — the home screen uses `context.go()` (which replaces the navigation stack) instead of `context.push()`, breaking back-navigation and iOS swipe-back gestures.
- **Game controls lack visual hierarchy** — `IconButton`s are bare icons with no tonal/filled backgrounds, violating M3 guidelines for action prominence.
- The **ChessClock** is not flipped when the player is black — clock labels show the wrong player positions.

### User Impact

| Persona | Impact |
|---------|--------|
| **All players** | Board theme selection has no visible effect; navigation feels broken |
| **Players on narrow devices (<360dp)** | AI difficulty selector overflows; stats cards truncate |
| **Players choosing black** | Clock labels are inverted; confusing time management |
| **Accessibility users** | Board pieces have no semantic labels; screen readers cannot describe board state |
| **Competitive players** | Game controls are visually ambiguous; Expert badge is unreadable |

---

## 2. PRD Traceability

| Requirement | Description | Coverage |
|-------------|-------------|----------|
| REQ-44 | Elegant, classy, modern design | Visual hierarchy, M3 compliance, design tokens |
| REQ-45 | Board and pieces legible at all screen sizes | Narrow-screen overflow fixes, responsive layout |
| REQ-46 | Responsive design: portrait and landscape | Adaptive layout for setup dialog, stats cards |
| REQ-47 | Drag-and-drop and tap-to-move interaction | Touch target compliance (48dp minimum) |
| REQ-48 | Full accessibility: keyboard nav, screen reader, WCAG 2.1 AA | Semantic labels, contrast ratios, a11y audit |
| REQ-34 | Board theme: choice of color schemes | Board theme propagation fix |
| REQ-15 | Four difficulty levels | AI difficulty selector redesign |
| REQ-25 | PvC: player selects difficulty | Game setup dialog redesign |
| REQ-32 | Visible, prominent clock display | Clock flip fix for black-side play |

---

## 3. Inputs

- Current Flutter mobile app codebase (`mobile/lib/`)
- Material 3 design specifications and Flutter M3 widget library
- WCAG 2.1 AA accessibility guidelines
- User-selected settings from `SettingsProvider` (board theme, animation speed, etc.)
- Device screen dimensions and orientation

---

## 4. Outputs

- Redesigned game setup flow (bottom sheet replacing `AlertDialog`)
- Corrected board theme propagation from settings to all board instances
- Fixed navigation stack (push-based navigation from home screen)
- M3-compliant game controls with visual hierarchy
- Corrected clock orientation when player is black
- Accessible semantic labels on all interactive and informational elements
- Responsive layouts that function on screens as narrow as 320dp

---

## 5. Dependencies

| Direction | Feature | Relationship |
|-----------|---------|-------------|
| Upstream | Settings & Customization | Provides board theme, animation speed, and other user preferences |
| Upstream | Game Modes & Lifecycle | Provides game state, config, and phase information |
| Integration | Game Rules Engine | Board state consumed by BoardWidget and replay viewer |
| Integration | UI & Board Experience | Shared visual design language and interaction patterns |
| Integration | Game Setup Flow | Setup dialog is the primary target of the redesign |

---

## 6. Issues by Priority

### 6.1 HIGH Priority (P0/P1) — 6 Issues

#### H-001: AI Difficulty Selector Overflow

**Component:** `game_setup_dialog.dart` — Difficulty `SegmentedButton`  
**Current state:** A 4-segment `SegmentedButton<String>` (Easy | Medium | Hard | Expert) is rendered inside an `AlertDialog` with ~280dp max content width. The Expert segment contains a nested `Row` with a text label and a "Server" badge at 9px font size. On screens narrower than 360dp, segments collide and text overflows.  
**Root cause:** `SegmentedButton` requires adequate horizontal space for all segments. The `AlertDialog` width constraint is too narrow for 4 segments plus icon badges.

**Fix approach:**
- Replace the `AlertDialog` with a bottom sheet (see H-002).
- In the wider bottom sheet context, keep `SegmentedButton` but increase the "Server" badge font to ≥11sp (M3 minimum).
- As a fallback for extremely narrow screens (<320dp), switch to `ChoiceChip` in a `Wrap` layout.

**Acceptance criteria:**
- [ ] All 4 difficulty options are fully visible and tappable on screens ≥320dp wide.
- [ ] No text overflow or segment collision at any supported screen width.
- [ ] "Server" badge font size is ≥11sp.
- [ ] Each difficulty segment meets the 48dp minimum touch target.
- [ ] Expert segment badge uses `Theme.of(context).colorScheme.tertiary` (already correct; verify after refactor).

---

#### H-002: Game Setup Dialog Too Narrow

**Component:** `game_setup_dialog.dart` — `AlertDialog` container  
**Current state:** The game setup dialog is an `AlertDialog` containing 3 `SegmentedButton`s (Opponent, Difficulty, Play As), a `SwitchListTile` (Timed Game), an animated clock preset grid, and 3 action buttons. This exceeds what an `AlertDialog` is designed for per M3 guidelines.  
**Root cause:** `AlertDialog` has a fixed max width (~280dp) and is intended for simple confirmations, not complex forms.

**Fix approach:**
- Replace `AlertDialog` + `showDialog` with `showModalBottomSheet(isScrollControlled: true)` using a `DraggableScrollableSheet`.
- The bottom sheet should take ≥80% of screen height on phones and cap at 480dp width on tablets.
- Use `Padding` with `DesignTokens.spacingLg` for internal content.
- Action buttons become a sticky bottom bar inside the sheet.

**Acceptance criteria:**
- [ ] Game setup is presented as a modal bottom sheet, not an `AlertDialog`.
- [ ] All controls (Opponent, Difficulty, Play As, Timed toggle, Clock presets) are visible without horizontal overflow.
- [ ] The sheet is scrollable if content exceeds viewport height.
- [ ] Action buttons (Start Game, Quick Start, Cancel) are always visible at the bottom.
- [ ] Sheet can be dismissed by swiping down or tapping the scrim.
- [ ] On tablets (>600dp width), the sheet constrains to a max width of 480dp, centered.

---

#### H-003: Board Theme Not Applied

**Component:** `game_screen.dart` → `BoardWidget`, `replay_viewer.dart`, `learn_screen.dart`  
**Current state:** `BoardWidget` accepts a `boardTheme` parameter (default: `BoardTheme.classicWood`), but the game screen instantiates it as `const BoardWidget()`, never passing the user's selected theme. The replay viewer and learn screen also hardcode `BoardTheme.classicWood`.  
**Root cause:** The settings provider's board theme value is never read and forwarded to `BoardWidget`.

**Fix approach:**
- In `game_screen.dart`, read the board theme from `SettingsProvider` (or the equivalent Riverpod provider) and pass it to `BoardWidget(boardTheme: selectedTheme)`.
- Remove `const` from `BoardWidget()` instantiation (since it now receives a runtime value).
- Apply the same fix in `replay_viewer.dart` and `learn_screen.dart`.

**Acceptance criteria:**
- [ ] Changing the board theme in Settings immediately updates the board appearance on the game screen.
- [ ] The replay viewer uses the user's selected board theme.
- [ ] The learn screen uses the user's selected board theme.
- [ ] Default theme remains `BoardTheme.classicWood` when no preference is set.
- [ ] All 4 board themes (Classic Wood, Dark, Ocean, Tournament Green) render correctly.

---

#### H-004: Navigation Stack Broken

**Component:** `home_screen.dart` — navigation calls  
**Current state:** The home screen navigates to Profile, Settings, Play, Learn, and Tutorial using `context.go()`, which replaces the entire navigation stack. This means pressing the back button or using iOS swipe-back from any of those screens does not return to Home — it either does nothing or exits the app.  
**Root cause:** `context.go()` is the GoRouter equivalent of replacing the route; `context.push()` is the correct method for pushing onto the stack.

**Fix approach:**
- Replace all `context.go(AppRoutes.xxx)` calls in `home_screen.dart` with `context.push(AppRoutes.xxx)`.
- Audit all other screens for incorrect `go()` vs `push()` usage. Auth screens (login → home, register → home) should correctly use `go()` since they replace the auth flow.

**Acceptance criteria:**
- [ ] Navigating from Home to Profile, Settings, Play, Learn, or Tutorial pushes onto the stack.
- [ ] Pressing the back button from any of those screens returns to Home.
- [ ] iOS swipe-back gesture works correctly from all pushed screens.
- [ ] Android system back button works correctly.
- [ ] Auth flow screens (Login → Home, Register → Home) still use `go()` to replace the stack (no back to login).

---

#### H-005: Game Controls Lack Visual Hierarchy

**Component:** `game_controls.dart` — `IconButton` widgets  
**Current state:** All 5 game control buttons (Resign, Offer Draw, Undo, Redo, New Game) are plain `IconButton`s with no background, no fill, and no visual differentiation. Per M3 guidelines, actions should have visual hierarchy: primary actions use filled or tonal buttons, secondary actions use outlined or standard buttons.  
**Root cause:** All buttons use the same bare `IconButton` style regardless of importance.

**Fix approach:**
- Apply M3 `IconButton.styleFrom` with tonal or filled backgrounds for primary actions.
- Group actions logically: destructive actions (Resign) get `colorScheme.errorContainer`; constructive actions (New Game) get `colorScheme.primaryContainer`; neutral actions (Undo, Redo, Draw) get `colorScheme.surfaceContainerHighest`.
- Add `Tooltip` (already present via `tooltip:`) and ensure 48dp touch targets.

**Acceptance criteria:**
- [ ] Game control buttons have visible tonal/filled backgrounds distinguishing action types.
- [ ] Resign button uses error-toned styling (e.g., `colorScheme.errorContainer`).
- [ ] New Game button uses primary-toned styling (e.g., `colorScheme.primaryContainer`).
- [ ] All buttons meet the 48dp minimum touch target size.
- [ ] Disabled state is visually distinct (reduced opacity or muted colors).
- [ ] Visual hierarchy is consistent in both light and dark themes.

---

#### H-006: ChessClock Not Flipped When Player Is Black

**Component:** `game_screen.dart` → `ChessClock` instantiation  
**Current state:** `ChessClock` accepts a `flipped` parameter and correctly swaps labels/times when `flipped: true`. However, the game screen never passes `flipped` — it always uses the default (`false`), even when the human player is black and the board is flipped.  
**Root cause:** The `_buildClock()` method does not read the player color from the game config.

**Fix approach:**
- Read the game config's `playerColor` from the current game state.
- Pass `flipped: config.playerColor == PlayerColor.black` to `ChessClock`.

**Acceptance criteria:**
- [ ] When the player chooses black, the clock shows Black's time at the bottom and White's time at the top.
- [ ] When the player chooses white, the clock shows White's time at the bottom (default behavior unchanged).
- [ ] Clock orientation matches board orientation at all times.
- [ ] Flipping works correctly in both timed PvC and timed PvP modes.

---

### 6.2 MEDIUM Priority (P2) — 9 Issues

#### M-001: Hardcoded Colors in GameStatus Dot

**Component:** `game_status.dart`  
**Current state:** The turn-indicator dot uses hardcoded colors: `Color(0xFFFFC107)` for White's turn and `Color(0xFF616161)` for Black's turn.  
**Fix:** Replace with `Theme.of(context).colorScheme` tokens (e.g., `colorScheme.primary` and `colorScheme.onSurfaceVariant` or appropriate semantic colors). Ensure adequate contrast in both light and dark themes.

**Acceptance criteria:**
- [ ] No hardcoded `Color()` literals in `game_status.dart`.
- [ ] Dot colors adapt to light/dark theme.
- [ ] Dot colors maintain ≥3:1 contrast ratio against the background in both themes.

---

#### M-002: Board Pieces Lack Accessibility Semantic Labels

**Component:** `board_widget.dart` → `PieceWidget`  
**Current state:** Board pieces are rendered as visual-only widgets with no `Semantics` wrapper. Screen readers cannot identify pieces, their positions, or their types.  
**Fix:** Wrap each `PieceWidget` in a `Semantics` widget with a descriptive label (e.g., "White man on square 23", "Black king on square 5"). Add `Semantics` for empty playable squares as well (e.g., "Empty square 15"). Mark the board as a semantic group.

**Acceptance criteria:**
- [ ] Every piece on the board has a semantic label describing its color, type (man/king), and FMJD square number.
- [ ] Empty playable squares have semantic labels.
- [ ] Screen readers (TalkBack, VoiceOver) can navigate and identify all board positions.
- [ ] Selected piece state is conveyed via semantic properties (`selected: true`).
- [ ] Legal move destinations are announced when a piece is selected.

---

#### M-003: Stats Cards Overflow on Narrow Screens

**Component:** `profile_screen.dart` — statistics cards  
**Current state:** Statistics cards (win/loss/draw counts, rating) are laid out in a fixed `Row` that overflows on screens narrower than 320dp.  
**Fix:** Use `Wrap` or a responsive grid (`GridView` with `SliverGridDelegateWithMaxCrossAxisExtent`) that adapts column count based on available width. Alternatively, use `LayoutBuilder` to switch between row and column layouts.

**Acceptance criteria:**
- [ ] Stats cards render without overflow on screens as narrow as 320dp.
- [ ] Cards wrap to multiple rows on narrow screens.
- [ ] Cards display in a single row on screens ≥400dp (if space allows).
- [ ] No horizontal scrolling required to view all stats.

---

#### M-004: Profile Screen No Error State Handling

**Component:** `profile_screen.dart`  
**Current state:** The profile screen does not handle API error states. If profile data fails to load, the user sees either a blank screen or an unhandled exception.  
**Fix:** Add error state handling: display a user-friendly error message with a retry button when profile data fails to load. Use the standard error widget pattern consistent with other screens.

**Acceptance criteria:**
- [ ] When profile data fails to load, a clear error message is displayed (non-technical language).
- [ ] A "Retry" button is provided to re-fetch profile data.
- [ ] Loading state shows a `CircularProgressIndicator` or skeleton UI.
- [ ] Error state is visually consistent with the app's design language.
- [ ] No unhandled exceptions are thrown to the user.

---

#### M-005: Replay Viewer No Board Flip Option

**Component:** `replay_viewer.dart`  
**Current state:** The replay viewer always shows the board from White's perspective. There is no option to flip the board to view from Black's perspective.  
**Fix:** Add a flip-board toggle button to the replay viewer toolbar. Pass the `flipped` state to `BoardWidget` and the replay board instance.

**Acceptance criteria:**
- [ ] A flip-board button (e.g., `Icons.swap_vert`) is visible in the replay viewer toolbar.
- [ ] Tapping the button toggles the board orientation between White-at-bottom and Black-at-bottom.
- [ ] The flip state persists for the duration of the replay session.
- [ ] The button has a tooltip ("Flip board") and meets 48dp touch target.

---

#### M-006: Animation Speed Code Comments Inverted

**Component:** Animation speed constants or configuration  
**Current state:** Code comments describing animation speed values are inverted — "fast" is labeled as "slow" and vice versa.  
**Fix:** Correct the inline comments to match the actual behavior.

**Acceptance criteria:**
- [ ] All animation speed comments accurately describe their corresponding values.
- [ ] No behavioral change — only documentation fix.

---

#### M-007: Expert "Server" Badge Font Too Small

**Component:** `game_setup_dialog.dart` — Expert segment badge  
**Current state:** The "Server" badge uses `fontSize: 9`, which is below the Material 3 minimum of 11sp for readable text.  
**Fix:** Increase font size to ≥11sp. Adjust badge padding if needed to maintain visual balance. This issue is partially addressed by H-001/H-002 (bottom sheet gives more space), but the font size must be fixed regardless.

**Acceptance criteria:**
- [ ] "Server" badge font size is ≥11sp.
- [ ] Badge remains visually balanced (not oversized relative to the segment label).
- [ ] Badge text passes WCAG 2.1 AA contrast check against its background.

---

#### M-008: Primary Action Buttons Use Wrong Style

**Component:** Various screens — action buttons  
**Current state:** Primary call-to-action buttons (e.g., "Start Game" in setup dialog) use `ElevatedButton` or `TextButton` instead of the M3-recommended `FilledButton` for primary actions.  
**Fix:** Audit all CTA buttons and apply correct M3 button hierarchy: `FilledButton` for primary actions, `FilledButton.tonal` for secondary, `OutlinedButton` for tertiary, `TextButton` for low-emphasis.

**Acceptance criteria:**
- [ ] Primary CTAs (Start Game, Quick Start, Save, Confirm) use `FilledButton`.
- [ ] Secondary actions use `FilledButton.tonal` or `OutlinedButton`.
- [ ] Dismiss/Cancel actions use `TextButton`.
- [ ] Button hierarchy is consistent across all screens.

---

#### M-009: Design Tokens Inconsistently Applied

**Component:** Multiple screens  
**Current state:** Some screens use `DesignTokens.spacingMd` / `DesignTokens.spacingSm` for spacing while others use hardcoded literal values (e.g., `SizedBox(height: 8)`, `EdgeInsets.all(16)`).  
**Fix:** Audit all widget files and replace hardcoded spacing/sizing values with `DesignTokens` constants. Ensure consistent use of the design token system across the entire app.

**Acceptance criteria:**
- [ ] No hardcoded spacing literals in widget `build()` methods where a `DesignTokens` equivalent exists.
- [ ] All margins, paddings, and gaps use `DesignTokens` constants.
- [ ] Visual appearance is unchanged (tokens should map to the same values).

---

### 6.3 LOW Priority (P3) — 11 Issues

#### L-001: Missing Tooltips on Non-Control IconButtons

**Component:** Various screens — `IconButton` widgets outside game controls  
**Current state:** Some `IconButton` instances (e.g., profile screen, app bar actions, replay viewer) lack `tooltip` properties.  
**Fix:** Add descriptive `tooltip` to every `IconButton` across the app.

**Acceptance criteria:**
- [ ] Every `IconButton` in the app has a non-empty `tooltip`.
- [ ] Tooltips are descriptive and concise (e.g., "Settings", "Flip board", "Delete account").

---

#### L-002: Inconsistent Border Radius Values

**Component:** Various widgets  
**Current state:** Border radii are inconsistent — some use `BorderRadius.circular(4)`, others `8`, `12`, or `16` without a clear pattern.  
**Fix:** Define standard border radius values in `DesignTokens` (e.g., `radiusSm = 4`, `radiusMd = 8`, `radiusLg = 12`, `radiusXl = 16`) and apply them consistently.

**Acceptance criteria:**
- [ ] `DesignTokens` defines named border radius constants.
- [ ] All `BorderRadius.circular()` calls use `DesignTokens` constants.
- [ ] Visual appearance aligns with the M3 shape system.

---

#### L-003: Clock Preset Grid Not Keyboard Navigable

**Component:** `game_setup_dialog.dart` — `_ClockPresetGrid`  
**Current state:** The clock preset grid buttons may not be reachable via keyboard/focus traversal (depends on implementation; audit needed).  
**Fix:** Ensure all preset buttons are focusable and navigable via Tab key. Add `FocusNode` management if needed.

**Acceptance criteria:**
- [ ] All clock preset options are reachable via keyboard Tab navigation.
- [ ] Currently selected preset shows a visible focus indicator.
- [ ] Selection can be confirmed with Enter/Space.

---

#### L-004: SwitchListTile Lacks Semantic Description

**Component:** `game_setup_dialog.dart` — Timed Game toggle  
**Current state:** The `SwitchListTile` for timed mode has a title but no `subtitle` or semantic description explaining what timed mode does.  
**Fix:** Add a brief `subtitle` (e.g., "Add a chess clock to the game") and ensure the switch has proper accessibility semantics.

**Acceptance criteria:**
- [ ] The Timed Game toggle has a descriptive subtitle.
- [ ] Screen readers announce the toggle state (on/off) and its purpose.

---

#### L-005: No Visual Loading State During Config Load

**Component:** `game_setup_dialog.dart`  
**Current state:** The dialog loads last-used config from `SharedPreferences` asynchronously, but shows default values briefly before the loaded values render, causing a visual flash.  
**Fix:** Show a brief loading indicator (or `AnimatedOpacity` fade-in) until `_configLoaded` is true. Alternatively, read config synchronously at app startup and cache it.

**Acceptance criteria:**
- [ ] No visible flash of default values before loaded config renders.
- [ ] Config loads within 100ms (imperceptible delay) or shows a loading skeleton.

---

#### L-006: Game Over View Lacks Rematch/New Game Hierarchy

**Component:** `game_screen.dart` — game over view  
**Current state:** The game over view may not clearly differentiate Rematch (primary action) from New Game (secondary action) per the game-setup-flow FRD specification.  
**Fix:** Ensure Rematch uses `FilledButton` and New Game uses `OutlinedButton` or `FilledButton.tonal`, matching the specified post-game action hierarchy.

**Acceptance criteria:**
- [ ] Rematch is the visually primary button.
- [ ] New Game is the visually secondary button.
- [ ] Both buttons are accessible and meet 48dp touch target.

---

#### L-007: Hardcoded Strings Not Externalized

**Component:** Throughout `mobile/lib/`  
**Current state:** All user-facing strings are hardcoded in widget `build()` methods (e.g., `'New Game'`, `'AI is thinking…'`, `'White wins!'`).  
**Fix:** While full i18n is out of scope for v1 (REQ-49), extract strings to a constants file or use Flutter's `AppLocalizations` pattern to prepare for future localization.

**Acceptance criteria:**
- [ ] User-facing strings are defined in a centralized location (e.g., `lib/core/l10n/strings.dart`).
- [ ] No inline string literals for user-visible text in `build()` methods.
- [ ] App behavior is unchanged.

---

#### L-008: Missing Dark Mode Testing for All Themes

**Component:** Board themes and app theme  
**Current state:** Board themes (Classic Wood, Dark, Ocean, Tournament Green) have not been systematically tested in combination with the app-level dark mode.  
**Fix:** Audit each board theme in both light and dark app modes. Ensure text, icons, and UI chrome remain legible on top of each board theme.

**Acceptance criteria:**
- [ ] All 4 board themes render correctly in light mode.
- [ ] All 4 board themes render correctly in dark mode.
- [ ] Status text, move counters, and controls remain legible over each board theme.

---

#### L-009: AlertDialog Confirm Actions Use Generic Labels

**Component:** `game_controls.dart` — Resign and New Game confirmation dialogs  
**Current state:** Confirmation dialogs use generic button labels that could be more descriptive.  
**Fix:** Use specific, verb-based labels (e.g., "Resign Game" instead of "OK", "Cancel" → "Keep Playing").

**Acceptance criteria:**
- [ ] Confirmation dialog buttons use specific, action-oriented labels.
- [ ] Labels clearly communicate the consequence of the action.

---

#### L-010: Splash/Launch Screen Not Themed

**Component:** App launch experience  
**Current state:** The app launch screen may use default Flutter splash colors that don't match the app's design language.  
**Fix:** Configure the native splash screen (`flutter_native_splash` or manual configuration) to use the app's brand colors.

**Acceptance criteria:**
- [ ] Splash screen background matches the app's primary brand color.
- [ ] Transition from splash to home screen is visually smooth.

---

#### L-011: No Haptic Feedback on Piece Placement

**Component:** `board_widget.dart` — piece move completion  
**Current state:** No haptic/tactile feedback when a piece is placed on the board.  
**Fix:** Add `HapticFeedback.lightImpact()` on successful piece moves and `HapticFeedback.mediumImpact()` on captures.

**Acceptance criteria:**
- [ ] A light haptic pulse occurs on piece placement (non-capture moves).
- [ ] A medium haptic pulse occurs on capture moves.
- [ ] Haptic feedback can be disabled if sound effects are off (or via a separate preference).
- [ ] No haptic feedback on invalid moves or AI moves.

---

## 7. Material 3 Compliance Requirements

All fixes must adhere to the following Material 3 standards:

| Guideline | Requirement |
|-----------|-------------|
| **Color system** | Use `Theme.of(context).colorScheme` for all colors. No hardcoded `Color()` literals for semantic colors. |
| **Typography** | Use `Theme.of(context).textTheme` for all text styles. Minimum readable text size: 11sp. |
| **Spacing** | Use `DesignTokens` constants for all spacing. Follow 4dp grid. |
| **Touch targets** | All interactive elements must be ≥48dp × 48dp. |
| **Shape** | Use consistent border radii from `DesignTokens` aligned with M3 shape system. |
| **Elevation** | Use M3 surface tint system, not legacy shadow-based elevation. |
| **Components** | Use M3 component variants: `FilledButton` for primary CTAs, `SegmentedButton` with adequate space or `ChoiceChip` in `Wrap` for constrained areas. |
| **Dark theme** | All components must render correctly in both light and dark themes. Verify `colorScheme` tokens adapt properly. |
| **Bottom sheets** | Use `showModalBottomSheet(isScrollControlled: true)` for complex forms, not `AlertDialog`. |

---

## 8. Accessibility Requirements

All fixes must meet the following accessibility standards per REQ-48:

| Requirement | Standard |
|-------------|----------|
| **Color contrast** | All text and meaningful graphics meet WCAG 2.1 AA contrast ratios (≥4.5:1 for normal text, ≥3:1 for large text and UI components). |
| **Semantic labels** | All interactive elements have descriptive `Semantics`, `tooltip`, or `label` properties. |
| **Board semantics** | Every board piece has a semantic label (color, type, square number). Empty playable squares are labeled. |
| **Focus management** | All interactive widgets are keyboard-focusable with visible focus indicators. |
| **Live regions** | Dynamic status changes (turn changes, game over, clock warnings) are announced via `Semantics(liveRegion: true)`. |
| **Touch targets** | All tappable elements are ≥48dp × 48dp per M3 and WCAG guidelines. |
| **Screen readers** | The app is fully usable with TalkBack (Android) and VoiceOver (iOS). |

---

## 9. Edge Case Scenarios

### 9.1 Narrow Screens (<320dp)

- Game setup bottom sheet should be full-width with no horizontal padding reduction below safe thresholds.
- Difficulty selector should switch from `SegmentedButton` to `ChoiceChip` in a `Wrap` if horizontal space is insufficient.
- Stats cards should stack vertically.
- Game controls should remain in a single row but allow icon-only mode without labels.

### 9.2 Dark Mode

- Board themes must be tested in combination with app-level dark mode.
- `GameStatus` dot colors must maintain contrast in dark mode.
- Bottom sheet background should use `colorScheme.surfaceContainerLow` in dark mode.
- All text must remain legible on dark surfaces.

### 9.3 Tablets (>600dp width)

- Game setup bottom sheet should constrain to max 480dp width, centered horizontally.
- Board should not stretch beyond a reasonable maximum size (~500dp).
- Stats cards can display in a 3- or 4-column grid.
- Game controls can display with text labels alongside icons.

### 9.4 Landscape Orientation

- Game setup bottom sheet should adapt to landscape by reducing initial height or using a side sheet pattern.
- Board, clock, and controls should reflow to a landscape-appropriate layout (board left, controls right).

### 9.5 Large Font / Accessibility Scaling

- All layouts must handle up to 200% font scale without overflow.
- `SegmentedButton` labels should truncate or abbreviate gracefully at extreme scales.
- The bottom sheet should remain scrollable at large font scales.

---

## 10. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Layout overflow at 320dp** | 0 overflow errors | Flutter debug overflow paint + widget tests |
| **M3 compliance** | 100% of new/modified widgets use `colorScheme` tokens | Code review checklist |
| **Accessibility audit** | 0 critical a11y issues | Flutter Semantics debugger + manual TalkBack/VoiceOver test |
| **Navigation correctness** | Back button returns to previous screen from all pushed routes | Manual testing + integration test |
| **Board theme works** | Theme change in settings instantly reflected on board | Manual test + widget test |
| **Clock orientation** | Clock labels match board orientation for both white and black | Widget test for both player colors |
| **Touch target compliance** | All interactive elements ≥48dp | `debugCheckHasMaterial` + manual audit |
| **User satisfaction** | No UI-related issues reported in first 30 user-testing sessions | User testing feedback |
| **Dark mode** | All screens render correctly in dark mode with no contrast failures | Manual audit of all screens in dark mode |

---

## 11. Implementation Priority

Implementation should follow this phased approach:

### Phase 1 — Critical Fixes (Sprint 1)
| Issue | ID | Effort |
|-------|----|--------|
| Game Setup → bottom sheet | H-002 | Large |
| AI Difficulty selector fix | H-001 | Medium (included in H-002) |
| Board theme propagation | H-003 | Small |
| Navigation stack fix | H-004 | Small |
| Clock flip | H-006 | Small |

### Phase 2 — Visual Polish (Sprint 2)
| Issue | ID | Effort |
|-------|----|--------|
| Game controls hierarchy | H-005 | Medium |
| GameStatus hardcoded colors | M-001 | Small |
| Expert badge font | M-007 | Small |
| Primary button styles | M-008 | Medium |
| Design token consistency | M-009 | Medium |

### Phase 3 — Accessibility (Sprint 3)
| Issue | ID | Effort |
|-------|----|--------|
| Board piece semantics | M-002 | Medium |
| Stats cards overflow | M-003 | Small |
| Profile error state | M-004 | Small |
| Replay viewer flip | M-005 | Small |
| Animation comments | M-006 | Trivial |

### Phase 4 — Polish & Delight (Sprint 4)
| Issue | ID | Effort |
|-------|----|--------|
| All LOW priority issues | L-001 through L-011 | Mixed |

---

## 12. Open Questions

1. Should the game setup bottom sheet include a "preview board" showing the selected theme? This would reinforce the theme setting but adds complexity.
2. For the replay viewer flip (M-005), should the flip state default to match the original player's color (i.e., auto-flip if the player was black)?
3. Should haptic feedback (L-011) be tied to the existing sound effects toggle, or should it be a separate "Haptics" preference?
4. For narrow-screen difficulty selectors, is `ChoiceChip` in a `Wrap` the preferred fallback, or should we use a `DropdownMenu`?
5. Should stats cards use a `Card` widget with M3 elevation, or a flat `Container` with border?
