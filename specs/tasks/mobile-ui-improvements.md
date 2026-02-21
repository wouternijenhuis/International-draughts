# Mobile UI/UX Improvements — Task Breakdown

> Per DevLead direction and ADR-017. Three PRs, ordered by urgency.

---

## PR 1: Quick Fixes (ship same day)

### 1. H-004 — Replace `context.go()` with `context.push()` for forward navigation

**Files:**
- `mobile/lib/features/home/presentation/home_screen.dart` (3 calls: profile, settings, play, learn, tutorial)
- `mobile/lib/features/auth/presentation/login_screen.dart` (2 calls: home after login, register link)
- `mobile/lib/features/auth/presentation/register_screen.dart` (2 calls: home after register, login link)
- `mobile/lib/features/profile/presentation/profile_screen.dart` (2 calls: home after logout, login redirect)

**What:** `context.go()` replaces the entire navigation stack. Forward navigation from Home → Profile/Settings/Game should use `context.push()` so the back button works. Keep `context.go()` only for auth redirects (login→home, register→home, logout→home) where stack-replacement is intentional.

**Effort:** S  
**Dependencies:** None

---

### 2. H-003 — Wire `boardTheme` from SettingsProvider to all BoardWidget instances

**Files:**
- `mobile/lib/features/game/presentation/screens/game_screen.dart` — `_buildBoard()` at L253 passes no `boardTheme` (defaults to `classicWood`)
- `mobile/lib/features/replay/presentation/replay_viewer.dart` — hard-coded `boardTheme: BoardTheme.classicWood` at L254
- `mobile/lib/features/learning/presentation/learn_screen.dart` — hard-coded `boardTheme: BoardTheme.classicWood` at L368

**What:** Read `ref.watch(settingsProvider).boardTheme` and pass it to every `BoardWidget(boardTheme: ...)`. The `BoardWidget` already accepts the param (default `classicWood`); we just need to thread the user's preference through.

**Effort:** S  
**Dependencies:** None

---

### 3. H-006 — Pass `flipped` to ChessClock when player is black

**Files:**
- `mobile/lib/features/game/presentation/screens/game_screen.dart` — `_buildClock()` at L256

**What:** `_buildClock()` currently creates `ChessClock(...)` without passing `flipped`. The `ChessClock` widget already has a `flipped` param (defaults `false`). When `phase.config.playerColor == PlayerColor.black`, pass `flipped: true` so the clock labels match the board orientation (player's clock at bottom).

**Effort:** S  
**Dependencies:** None

---

### 4. M-001 — Replace hardcoded colors in `GameStatus` with theme colors

**Files:**
- `mobile/lib/features/game/presentation/widgets/controls/game_status.dart`

**What:** Lines 40-41 and 48-49 use hardcoded `Color(0xFFFFC107)` (amber) and `Color(0xFF616161)` (gray) for the turn indicator dot plus `Colors.black26` for the border. Replace with `Theme.of(context).colorScheme` equivalents:
  - White dot: `colorScheme.tertiary` or `colorScheme.primaryContainer`
  - Black dot: `colorScheme.onSurface.withOpacity(0.6)`
  - Dot border: `colorScheme.outline`

**Effort:** S  
**Dependencies:** None

---

### 5. H-005 — Use `IconButton.filledTonal()` for game controls

**Files:**
- `mobile/lib/features/game/presentation/widgets/controls/game_controls.dart` (5 `IconButton` instances: resign, draw, undo, redo, new game)

**What:** Replace each `IconButton(...)` with `IconButton.filledTonal(...)`. This gives the buttons a visible tonal fill matching Material 3, improving discoverability and touch targets. Constructor signature is the same — only the factory changes.

**Effort:** S  
**Dependencies:** None

---

### 6. M-007 — Fix Expert "Server" badge font size

**Files:**
- `mobile/lib/features/game/presentation/widgets/setup/game_setup_dialog.dart` — around L228

**What:** The `Text('Server', style: TextStyle(fontSize: 9, ...))` inside the Expert difficulty `ButtonSegment` is too small to read on many devices. Change `fontSize: 9` → `fontSize: 11`.

**Effort:** S  
**Dependencies:** None

---

## PR 2: Bottom Sheet Conversion (1–2 days)

### 7. H-002 + H-001 — Convert GameSetupDialog from AlertDialog to modal bottom sheet

**Files:**
- `mobile/lib/features/game/presentation/widgets/setup/game_setup_dialog.dart` (main refactor)
- `mobile/lib/features/game/presentation/screens/game_screen.dart` (2 call sites at L159 and L287 — change `showDialog` → `showModalBottomSheet`)

**What:** The current `AlertDialog`-based setup dialog overflows on small screens because the 4-segment difficulty `SegmentedButton` is too wide. Convert to a `showModalBottomSheet` with `DraggableScrollableSheet`.

**Sub-tasks:**

#### 7a. Create the bottom sheet wrapper
- Use `showModalBottomSheet(isScrollControlled: true, ...)` with a `DraggableScrollableSheet`.
- `initialChildSize`: 0.75 (portrait) / 0.65 (landscape) — detect via `MediaQuery.of(context).orientation`.
- `maxChildSize`: 0.95.
- `minChildSize`: 0.5.
- Wrap content in `ConstrainedBox(maxWidth: 480)` + `Center` for tablet layouts.
- Add drag handle at top (`Container` with 40×4 rounded bar).

**Effort:** M  
**Dependencies:** None

#### 7b. Migrate dialog content into the sheet body
- Move all existing form content (opponent selector, difficulty, color, clock, time controls) into the `DraggableScrollableSheet` builder.
- Content should be a `ListView` (not `SingleChildScrollView` + `Column`) for better scroll behavior.
- The `SegmentedButton` for difficulty now has full sheet width — overflow issue resolved.

**Effort:** M  
**Dependencies:** 7a

#### 7c. Add sticky bottom action bar
- Pin a bottom bar with three buttons: **Cancel** (text), **Quick Start** (outlined), **Start Game** (filled).
- Use `Column` with the `ListView` in an `Expanded` and the action bar in a `SafeArea`-wrapped `Padding` at the bottom.
- Quick Start starts a game with last-used or default config (already partially implemented via `_loadLastConfig()`).

**Effort:** M  
**Dependencies:** 7b

#### 7d. Update call sites in game_screen.dart
- Replace `showDialog<void>(builder: (ctx) => const GameSetupDialog())` with the new `showModalBottomSheet` invocation at both call sites (setup prompt button and game-over "New Game" button).

**Effort:** S  
**Dependencies:** 7a

---

## PR 3: Accessibility & Polish (follow-up)

### 8. M-002 — Add `Semantics` wrappers to board pieces

**Files:**
- `mobile/lib/features/game/presentation/widgets/board/piece_widget.dart`
- `mobile/lib/features/game/presentation/widgets/board/board_widget.dart` (pass semantic info)

**What:** Wrap each `PieceWidget` in a `Semantics` widget with a label like `"White piece on square 23"` or `"Black king on square 5"`. Use `excludeSemantics: true` on the inner `CustomPaint`. The board widget already knows piece positions; pass `squareNumber`, `isKing`, `isWhite` context down.

**Effort:** M  
**Dependencies:** None

---

### 9. M-003 — Stats cards: use `Wrap` for narrow screens

**Files:**
- `mobile/lib/features/profile/presentation/profile_screen.dart` — `_buildStatsOverview()` method

**What:** The stats cards (wins, losses, draws, etc.) currently use a `Row`. On narrow screens (< 360dp) they overflow. Replace with `Wrap(spacing: 8, runSpacing: 8, ...)` so cards wrap to the next line. Each card should have a `ConstrainedBox(minWidth: 80)`.

**Effort:** S  
**Dependencies:** None

---

### 10. M-004 — Profile error state handling

**Files:**
- `mobile/lib/features/profile/presentation/profile_screen.dart`
- `mobile/lib/features/profile/presentation/profile_provider.dart`

**What:** When `profileState` has an error (API failure, network timeout), the screen shows a loading spinner indefinitely. Add an `error` field to `ProfileState`, check it in `_buildProfileContent`, and show a retry-able error widget (`ErrorWidget` from `shared/widgets/error_widget.dart` or a custom one with a "Retry" button calling `_loadProfileData()`).

**Effort:** M  
**Dependencies:** None

---

### 11. M-005 — Replay viewer board flip toggle

**Files:**
- `mobile/lib/features/replay/presentation/replay_viewer.dart`

**What:** Add an `IconButton` (flip icon: `Icons.swap_vert`) to the replay viewer's control bar (alongside first/prev/play/next/last buttons). It should toggle a local `_flipped` state variable and pass it to `BoardWidget(flipped: _flipped, ...)`. The `BoardWidget` already supports the `flipped` concept via `BoardPainter`.

**Effort:** S  
**Dependencies:** None

---

## Summary

| #  | ID            | Description                              | PR | Effort | Depends On |
|----|---------------|------------------------------------------|----|--------|------------|
| 1  | H-004         | `context.go()` → `context.push()`        | 1  | S      | —          |
| 2  | H-003         | BoardTheme from settings → all boards    | 1  | S      | —          |
| 3  | H-006         | Pass `flipped` to ChessClock             | 1  | S      | —          |
| 4  | M-001         | Theme colors in GameStatus               | 1  | S      | —          |
| 5  | H-005         | `IconButton.filledTonal()` game controls | 1  | S      | —          |
| 6  | M-007         | Expert badge font 9→11                   | 1  | S      | —          |
| 7  | H-002 + H-001 | Bottom sheet conversion                  | 2  | L      | —          |
| 7a |               | ↳ Sheet wrapper + DraggableScrollable    | 2  | M      | —          |
| 7b |               | ↳ Migrate form content                   | 2  | M      | 7a         |
| 7c |               | ↳ Sticky action bar                      | 2  | M      | 7b         |
| 7d |               | ↳ Update call sites                      | 2  | S      | 7a         |
| 8  | M-002         | Semantics on board pieces                | 3  | M      | —          |
| 9  | M-003         | Stats cards Wrap layout                  | 3  | S      | —          |
| 10 | M-004         | Profile error state                      | 3  | M      | —          |
| 11 | M-005         | Replay board flip toggle                 | 3  | S      | —          |

**Effort key:** S = < 30 min, M = 30 min – 2 hrs, L = 2+ hrs (aggregate of sub-tasks)
