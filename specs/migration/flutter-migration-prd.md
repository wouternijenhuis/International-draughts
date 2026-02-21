# Product Requirements Document — Flutter Migration

## International Draughts: Next.js → Flutter

**Version:** 1.0
**Created:** 2026-02-21
**Status:** Draft — Awaiting Review (DevLead, Architect, Stakeholder)
**Companion Document:** [flutter-migration-analysis.md](flutter-migration-analysis.md)

---

## Contents

1. [Executive Summary](#1-executive-summary)
2. [Migration Scope](#2-migration-scope)
3. [Functional Requirements](#3-functional-requirements)
4. [Non-Functional Requirements](#4-non-functional-requirements)
5. [Security Requirements](#5-security-requirements)
6. [Migration Strategy](#6-migration-strategy)
7. [Shared Engine Strategy](#7-shared-engine-strategy)
8. [User Personas](#8-user-personas)
9. [Success Criteria](#9-success-criteria)
10. [Resolved Decision Log (Historical Q&A)](#10-resolved-decision-log-historical-qa)
11. [Dependencies & Risks](#11-dependencies--risks)
12. [Timeline Estimate](#12-timeline-estimate)

---

## 1. Executive Summary

### 1.1 Why Migrate to Flutter

International Draughts is currently a Progressive Web App built with Next.js 16, React 19, TypeScript 5.9, Zustand, and Tailwind CSS, deployed as a static export to Azure Static Web Apps. The PWA has served initial launch goals, but it has structural limits for long-term growth:

- **No native app store presence.** The #1 discovery channel for mobile games (App Store and Google Play) is inaccessible. Users cannot find the app by searching "draughts" in their app store.
- **Limited native capabilities.** Push notifications, biometric auth, background processing, haptic feedback, and hardware-accelerated rendering are unavailable or unreliable through a browser PWA.
- **Mobile gaming expectations.** Board game players on mobile expect a native app experience — instant launch, smooth 60fps animations, native gestures, and offline reliability.
- **Cross-platform from a single codebase.** Flutter supports iOS, Android, Web, macOS, Windows, and Linux from one Dart codebase; this migration targets iOS + Android (ADR-013).

### 1.2 Business Rationale

| Driver | Current State (Next.js PWA) | Target State (Flutter) |
|--------|---------------------------|----------------------|
| **Distribution** | URL-only; no app store presence | iOS App Store + Google Play + Web |
| **Discoverability** | Zero organic app store traffic | Searchable in both app stores under "draughts", "checkers", "board games" |
| **User Retention** | Browser bookmarks; easy to forget | Home screen icon, push notifications (future), native engagement patterns |
| **Performance** | JavaScript rendering through browser compositing | Compiled native code with Skia/Impeller rendering engine; consistent 60fps |
| **Offline Play** | Service worker caching (fragile) | Native offline support; local storage; full client-side AI without network |
| **Monetization Readiness** | Limited; no IAP infrastructure | App store IAP, subscriptions, ad frameworks available if needed |
| **Tablet Experience** | Responsive web layout | Native tablet layout optimized for board game play |

### 1.3 What Changes vs. What Stays the Same

| Aspect | Changes? | Details |
|--------|----------|---------|
| **Frontend framework** | ✅ Changes | Next.js / React / TypeScript → Flutter / Dart |
| **UI components** | ✅ Changes | 27 React components → Flutter widgets |
| **State management** | ✅ Changes | Zustand → Riverpod (ADR-009) |
| **Styling** | ✅ Changes | Tailwind CSS → Flutter `ThemeData` + custom design tokens |
| **Shared draughts engine** | ✅ Changes | TypeScript → Dart port (~2,500 LoC) |
| **Backend API** | ❌ No change | ASP.NET Core 9 Minimal API stays as-is |
| **Game rules / AI algorithms** | ❌ No change | FMJD rules, alpha-beta search, Glicko-2 — logic stays identical |
| **Database / Infrastructure** | ❌ No change | Azure deployment, EF Core, SQL Server stay as-is |
| **API contract** | ⚠️ Minor changes | Auth header and token lifecycle updates; native apps use direct HTTPS (no browser CORS) |
| **Authentication flow** | ⚠️ Minor changes | JWT storage moves from `localStorage` to platform secure storage |

---

## 2. Migration Scope

### 2.1 In Scope

| Area | Description |
|------|-------------|
| **Flutter app** | New cross-platform Flutter application implementing all current frontend features |
| **Dart engine port** | Port of `@international-draughts/engine` (~2,500 LoC TypeScript) to a standalone Dart package |
| **Engine test port** | Port of all 190+ shared engine tests to Dart |
| **Widget tests** | New Flutter widget tests achieving equivalent coverage to current frontend tests (162 tests) |
| **Integration tests** | New integration tests replacing current Playwright E2E suite (45 tests) |
| **Theming system** | Port of 4 board themes, dark mode, and all CSS custom properties to Flutter `ThemeData` |
| **Auth token storage** | Migration from `localStorage` to platform-secure credential storage |
| **App store assets** | App icons, screenshots, store descriptions, privacy policy for iOS and Android |
| **CI/CD updates** | GitHub Actions workflows for Flutter build, test, and deployment |

### 2.2 Out of Scope

| Area | Rationale |
|------|-----------|
| **Backend API changes** | The ASP.NET Core backend is stable and well-tested (192 tests). No endpoint changes except minimal CORS/auth adjustments. |
| **Game rules modifications** | FMJD rule compliance is 100%. Rules are ported as-is. |
| **AI algorithm changes** | Client-side AI (Easy/Medium/Hard) and Expert backend AI are ported/consumed as-is. No strength changes. |
| **New features** | This migration achieves feature parity only. New features (online PvP, push notifications, social features) are post-migration. |
| **Database schema changes** | Player profiles, game history, ratings — all data stays in existing schema. |
| **Backend deployment changes** | Azure App Service configuration remains unchanged. |
| **Internationalization (i18n)** | English-only as per original PRD [C6]. i18n can leverage Flutter's `intl` package post-migration. |
| **OAuth providers (Microsoft, Apple, Google)** | Current implementation uses email/password only. OAuth is future work per original PRD [TF-6]. |

### 2.3 Platform Targets

| Platform | Priority | Rationale |
|----------|----------|-----------|
| **iOS** | 🔴 P0 | Primary mobile gaming platform; highest revenue potential for board games |
| **Android** | 🔴 P0 | Largest mobile user base globally |
| **Web (Next.js)** | ✅ Retained | Superseded by ADR-013: Flutter Web is excluded; existing Next.js web frontend remains in place |
| **macOS** | ⚪ Post-MVP | Not in Flutter MVP scope |
| **Windows** | ⚪ Post-MVP | Not in Flutter MVP scope |
| **Linux** | ⚪ Post-MVP | Not in Flutter MVP scope |

> **Resolved (ADR-013):** Flutter migration targets iOS + Android only. Next.js remains the web frontend.

---

## 3. Functional Requirements

All functional requirements from the original PRD ([specs/prd.md](../prd.md)) must be satisfied in the Flutter app. This section maps each existing feature to its Flutter equivalent.

### 3.1 Game Board Rendering

**Original:** [REQ-1, REQ-2, REQ-13, REQ-14, REQ-44, REQ-45, REQ-46, REQ-52]
**Current Implementation:** `Board.tsx`, `BoardSquare.tsx`, `BoardPiece.tsx` — 250 lines total

| Feature | Current (React) | Flutter Equivalent |
|---------|----------------|-------------------|
| 10×10 grid with 50 playable dark squares | Pre-computed static grid, CSS Grid or flexbox | `CustomPainter` on `Canvas` or `GridView` with `Stack` |
| 4 board themes (classic-wood, dark, ocean, tournament-green) | CSS custom properties swapped per theme class | `BoardTheme` data class with `Color` pairs, applied via `InheritedWidget` or Riverpod |
| Board orientation flip (White/Black perspective) | Grid array reversal based on `orientation` prop | Same logic; grid data reversal before rendering |
| Square notation (1–50) | Conditional text overlay per square | `Positioned` text widget within each square |
| Selected square highlighting | CSS class toggle (blue/purple ring) | `BoxDecoration` or `CustomPainter` highlight overlay |
| Legal move indicators | Semi-transparent circles on eligible squares | `CustomPainter` circle or `Container` with `BoxDecoration` |
| Last move highlights | Background color tint on from/to squares | `BoxDecoration` color overlay |
| Responsive board sizing | `--board-size: min(90vw, 90vh, 600px)` via CSS | `LayoutBuilder` + `MediaQuery` computing `min(width * 0.9, height * 0.9, 600)` |
| Piece rendering (amber/gray with 3D ring, SVG crown) | CSS radial gradients + inline SVG | `CustomPainter` with `RadialGradient` + `Path` for crown |

**Acceptance Criteria:**
- Board renders correctly at all screen sizes from 320px (small phone) to 2560px (desktop).
- All 4 themes render with correct color pairs.
- Notation numbers are legible and toggle on/off.
- Performance: board redraws complete in < 16ms (60fps target).

### 3.2 Piece Interaction

**Original:** [REQ-47]
**Current Implementation:** `GameBoard.tsx` — 165 lines (mouse + touch event handling)

| Feature | Current (React) | Flutter Equivalent |
|---------|----------------|-------------------|
| Tap-to-select, tap-to-move | `onClick` on `BoardSquare` → `selectSquare()` in game store | `GestureDetector.onTap` → state action |
| Drag-and-drop (mouse) | `onMouseDown`, `onMouseMove`, `onMouseUp` with coordinate-to-square mapping | `Draggable` + `DragTarget` or `GestureDetector.onPan*` |
| Drag-and-drop (touch) | `onTouchStart`, `onTouchMove`, `onTouchEnd` with `getBoundingClientRect` | Same `GestureDetector` — unified touch/mouse in Flutter |
| Visual drag feedback | Piece follows cursor/finger, opacity change on source square | `Draggable.feedback` widget or manual `Positioned` overlay tracking pointer |
| Multi-capture path selection | Automatic (engine selects maximum capture path) | Same logic — engine enforces maximum capture rule |

**Acceptance Criteria:**
- Tap-to-move works with single tap to select, single tap to execute.
- Drag-and-drop works smoothly on both iOS and Android with no dropped gestures.
- Drag feedback piece tracks finger position with zero perceptible lag.
- Invalid drop targets reject the piece and return it to origin.

### 3.3 Move Animations

**Original:** [REQ-37]
**Current Implementation:** `useMoveAnimation.ts` — 307 lines, `AnimatedPieceOverlay.tsx` — 97 lines

| Feature | Current (React) | Flutter Equivalent |
|---------|----------------|-------------------|
| Single-step slide animation | CSS `transform: translate()` with `transition` | `AnimatedPositioned` or `TweenAnimationBuilder` |
| Multi-capture sequence (step-by-step slides) | State machine with sequential CSS transitions, `onTransitionEnd` callbacks | Chained `AnimationController`s or `SequenceAnimation` with `Tween<Offset>` |
| Captured piece ghost fade-out | `opacity` transition on overlay elements | `FadeTransition` or `AnimatedOpacity` on captured piece widgets |
| Animation speed control (instant/fast/normal/slow) | Duration mapped: 0 / 100ms / 200ms / 400ms | Same duration values applied to `AnimationController.duration` |
| Position diffing (detect what moved) | Compares previous and next `BoardPosition` arrays | Same algorithm ported to Dart |

**Acceptance Criteria:**
- Single-move animations play at the configured speed.
- Multi-capture sequences animate step-by-step (piece slides to each intermediate square, captured piece fades).
- "Instant" speed skips all animation.
- Animations never drop below 60fps on mid-range devices (iPhone 12, Pixel 6).

### 3.4 Game Setup Dialog

**Original:** [REQ-25, REQ-26, REQ-30, REQ-31]
**Current Implementation:** `GameSetupDialog.tsx` (230 lines) + 4 sub-components (295 lines total)

| Feature | Current (React) | Flutter Equivalent |
|---------|----------------|-------------------|
| Modal dialog | Native `<dialog>` element with `showModal()` | `showDialog()` with `AlertDialog` or custom `Dialog` widget |
| Opponent selector (AI / Human) | Two-card toggle (`OpponentSelector`) | `SegmentedButton` or custom `ToggleButtons` |
| Difficulty selector (Easy/Medium/Hard/Expert) | 4-button segmented control with "Server" badge on Expert | `SegmentedButton` with custom segment widgets |
| Color picker (White/Black/Random) | 3-button selector with emoji icons | `SegmentedButton` or custom chips |
| Timed mode toggle + preset grid | Switch + expandable `AnimatePresence`-style grid | `SwitchListTile` + `AnimatedCrossFade` or `AnimatedSize` with grid |
| Quick Start button | Starts with last-used configuration (persisted to `localStorage`) | Starts with last-used config (persisted to `SharedPreferences`) |
| Config persistence | `localStorage` key `draughts-game-config` | `SharedPreferences` or `Hive` |

**Acceptance Criteria:**
- Dialog opens with last-used configuration pre-filled.
- All 5 clock presets selectable when timed mode enabled.
- Expert difficulty shows visual "Server" indicator.
- Quick Start works without opening the full dialog.
- Dialog dismissible via backdrop tap or explicit close button.

### 3.5 AI Opponent

**Original:** [REQ-15, REQ-16, REQ-17, REQ-18, REQ-70, REQ-71, REQ-72, REQ-73]
**Current Implementation:** Game store AI logic + shared engine `findBestMove()`

| Feature | Current (React) | Flutter Equivalent |
|---------|----------------|-------------------|
| **Easy/Medium/Hard** (client-side) | Shared engine `findBestMove()` called directly; configurable depth, noise, blunder rate | Dart engine port `findBestMove()` — identical algorithm, identical configs |
| **Expert** (server-side) | `POST /api/v1/ai/move` with board position (180° rotated), difficulty, time limit | Same API call via `http`/`dio`; same rotation logic |
| AI thinking indicator | `isAiThinking` state → overlay on board | Same state → `Stack` overlay with loading indicator |
| AI move delay | `setTimeout(150ms)` before executing | `Future.delayed(Duration(milliseconds: 150))` |
| AI cancellation | Module-level generation counter; stale moves discarded | Cancellation token pattern or generation counter in state manager |
| Expert fallback to Hard | On network error, falls back to client-side Hard AI | Same fallback logic; `connectivity_plus` for detection |

**Acceptance Criteria:**
- Easy/Medium/Hard AI respond in < 2 seconds per move (same as current).
- Expert AI request/response works identically to current implementation.
- AI never makes an illegal move at any difficulty [REQ-18, REQ-73].
- Expert fallback to Hard activates on network failure with user notification [REQ-63, REQ-64].
- AI must compute moves on a background isolate to avoid blocking the UI thread.

### 3.6 Chess Clock

**Original:** [REQ-30, REQ-31, REQ-32, REQ-33]
**Current Implementation:** `ChessClock.tsx` (89 lines) + shared engine clock module

| Feature | Current (React) | Flutter Equivalent |
|---------|----------------|-------------------|
| Dual clock faces (White/Black) | Two `div` blocks with conditional styling | Two `Container`/`Card` widgets with `AnimatedContainer` for active state |
| Active clock scaling + green ring | CSS `transform: scale(1.05)` + green border | `AnimatedScale` + `BoxDecoration` border color change |
| Low time warning (red text, pulse) | CSS `@keyframes` pulse animation + red color | `AnimationController` with `ColorTween` + `ScaleTransition` |
| Tenths of seconds below 10s | Conditional format string | Same conditional formatting in Dart |
| Clock tick (100ms interval) | `setInterval` stored in module-level ref | `Timer.periodic(Duration(milliseconds: 100))` or `Ticker` |
| 6 clock presets | Shared engine `CLOCK_PRESETS` | Dart engine port clock presets |

**Acceptance Criteria:**
- Clock updates visually every 100ms.
- Active player's clock is visually distinct (scale + color).
- Low time warning activates at configurable threshold (default 30s).
- Time expiry triggers game end [REQ-33].

### 3.7 Learning Mode

**Original:** [REQ-50, REQ-51]
**Current Implementation:** `learn/page.tsx` — 838 lines with 30+ tutorial steps

| Feature | Current (React) | Flutter Equivalent |
|---------|----------------|-------------------|
| 30+ interactive tutorial steps | Hardcoded step data with board positions, goals, hints | Dart data models with same step definitions |
| Custom board states per step | `BoardPosition` arrays set per step | Same `BoardPosition` arrays in Dart |
| Goal validation (make specific move, capture specific piece) | Per-step validation functions | Same validation logic in Dart |
| Move feedback (good/neutral/bad) | `MoveFeedback` component with toast notification | `SnackBar` or custom overlay widget |
| Hint system | `showHint()` highlights best move squares | Same engine-powered hint with highlighted squares |
| Step navigation (next/previous/restart) | Step index state with arrow buttons | Same UX with `PageView` or index-based navigation |
| Progress tracking | Step completion state | Local storage via `SharedPreferences` |

**Acceptance Criteria:**
- All 30+ tutorial steps load with correct board positions.
- Goal validation works identically to current implementation.
- Move feedback displays and auto-dismisses after 3 seconds.
- Hint shows correct squares for each step.
- Progress persists across app restarts.

### 3.8 Player Authentication

**Original:** [REQ-19, REQ-20, REQ-21, REQ-22, REQ-24, REQ-57]
**Current Implementation:** `auth-store.ts` (70 lines) + `login/page.tsx` (87 lines) + `register/page.tsx` (133 lines)

| Feature | Current (React) | Flutter Equivalent |
|---------|----------------|-------------------|
| Email/password login | POST `/api/auth/login` → JWT in Zustand + `localStorage` | POST `/api/auth/login` → JWT in state + `flutter_secure_storage` |
| Registration | POST `/api/auth/register` → JWT response | Same API call; same response handling |
| Guest mode | No auth; `sessionStorage` for game state | No auth; local storage for game state |
| Token expiry check | Client-side `expiresAt` comparison | Same check in Dart |
| Logout | Clear Zustand state + `localStorage` | Clear state + `flutter_secure_storage` |
| Account deletion | DELETE `/api/auth/account/{userId}` | Same API call |

**⚠️ Gap Identified:** No token refresh mechanism exists. See [Section 5.4](#54-token-refresh-gap).

**Acceptance Criteria:**
- Login/register flows work identically.
- JWT stored in platform-secure storage (Keychain on iOS, EncryptedSharedPreferences on Android).
- Guest mode fully functional without authentication.
- App handles expired tokens gracefully (redirect to login).

### 3.9 Player Profile

**Original:** [REQ-22, REQ-74–REQ-82]
**Current Implementation:** `profile/page.tsx` (277 lines) + 4 profile components (684 lines total)

| Feature | Current (React) | Flutter Equivalent |
|---------|----------------|-------------------|
| Profile header (name, avatar, rating) | Fetch GET `/player/{userId}/profile` | Same API call; `FutureBuilder` or Riverpod `AsyncValue` |
| Avatar selector (12 emoji avatars) | Modal grid with PATCH `/player/{userId}/avatar` | `showDialog` with grid; same API call |
| Display name edit | Inline edit with PATCH `/player/{userId}/display-name` | `TextField` with submit; same API call |
| Stats overview (games/wins/losses/draws/streaks) | `StatsOverview` component with stacked progress bar | `Card` widgets with `LinearProgressIndicator` or custom painter |
| Glicko-2 rating chart | Pure SVG line chart with confidence band, hover tooltip (269 lines) | `fl_chart` package or `CustomPainter` with `GestureDetector` for touch tooltip |
| Game history (paginated, filterable) | Infinite scroll list with filters (239 lines) | `ListView.builder` with `ScrollController` for pagination + filter chips |
| Replay link from history | Navigate to replay viewer with game data | Navigator push to replay screen with game data |

**Acceptance Criteria:**
- Profile loads and displays all data fields.
- Avatar selector shows 12 options and persists selection to backend.
- Rating chart renders with confidence band and responds to touch for tooltips.
- Game history paginates correctly with working filters (result, difficulty, mode).
- All API calls use authenticated requests.

### 3.10 Game Persistence

**Original:** [REQ-28, REQ-58, REQ-60, REQ-61, REQ-62, REQ-66]
**Current Implementation:** `game-persistence.ts` (197 lines) + `game-config-persistence.ts` (90 lines)

| Feature | Current (React) | Flutter Equivalent |
|---------|----------------|-------------------|
| Guest game auto-save | `sessionStorage` after each move | `SharedPreferences` or `Hive` (persists across app restarts — **improvement** over web) |
| Registered user auto-save | `localStorage` + fire-and-forget POST `/games/in-progress/{userId}` | `SharedPreferences` + same async backend POST |
| Game resume on launch | Check storage → `ResumePrompt` dialog | Check storage on startup → resume dialog |
| Game state serialization | JSON stringify of `SerializedGameState` | `json_serializable` or `freezed` models with `toJson`/`fromJson` |
| Config persistence | `localStorage` key `draughts-game-config` | `SharedPreferences` |

**Improvement over current:** On native mobile, guest game state persists across app restarts (not just page reloads), providing a better experience than `sessionStorage`.

**Acceptance Criteria:**
- In-progress games survive app backgrounding, termination, and restart.
- Resume prompt shows correct game description, move count, and save timestamp.
- Backend sync works for registered users.
- Game-over or resign clears all persisted state.

### 3.11 Settings

**Original:** [REQ-34, REQ-37, REQ-38, REQ-39]
**Current Implementation:** `SettingsPanel.tsx` — 112 lines

| Feature | Current (React) | Flutter Equivalent |
|---------|----------------|-------------------|
| Board theme (4 options) | Button grid updating `boardTheme` in game store | `SegmentedButton` or `ChoiceChip` grid |
| Show notation toggle | Switch updating `showNotation` | `SwitchListTile` |
| Show legal moves toggle | Switch updating `showLegalMoves` | `SwitchListTile` |
| Animation speed (4 options) | Segmented button (instant/fast/normal/slow) | `SegmentedButton` |
| Settings persistence | Stored in game store; synced to backend for registered users | `SharedPreferences` for local; backend sync for registered users |

**Acceptance Criteria:**
- All settings take effect immediately without restart.
- Settings persist across app restarts.
- Registered user settings sync with backend.

### 3.12 Victory Animation

**Original:** [REQ-44]
**Current Implementation:** `VictoryAnimation.tsx` — 346 lines (Canvas physics simulation)

| Feature | Current (React) | Flutter Equivalent |
|---------|----------------|-------------------|
| Bouncing piece cascade | `<canvas>` + `requestAnimationFrame`, gravity + bounce physics | `CustomPainter` + `Ticker` with physics simulation |
| Trail effects | Canvas path drawing with fading alpha | `CustomPainter` path drawing with fading `Paint.color` alpha |
| 8-second duration with fade-out | Opacity transition at 6s mark | `AnimationController` with 8s duration, fade-out at 6s |
| Piece colors matching game participant | Amber (white) / gray (black) particle colors | Same color constants in Dart |

**Acceptance Criteria:**
- Victory animation plays on game completion.
- Smooth 60fps animation on mid-range devices.
- Animation can be dismissed by tap.
- Fade-out completes and animation disposes cleanly (no resource leaks).

### 3.13 Replay Viewer

**Original:** [REQ-29, REQ-61]
**Current Implementation:** `ReplayViewer.tsx` — 163 lines

| Feature | Current (React) | Flutter Equivalent |
|---------|----------------|-------------------|
| Animated board playback | Reuses `Board` + `useMoveAnimation` | Reuses board widget + animation controller |
| Playback controls (⏮ ◀ ▶ ⏭) | Button row with index-based navigation | `IconButton` row controlling move index |
| Clickable move list | Move history with click-to-jump | `ListView` with `GestureDetector` per move |
| Game info sidebar | White/Black player, result, date | `Column` with info widgets |
| Auto-play mode | Not yet implemented | Optional: auto-advance with `Timer.periodic` |

**Acceptance Criteria:**
- All completed games replay correctly with animations.
- Controls navigate to any move in the game.
- Move list highlights the current position.
- Game info displays correctly.

### 3.14 Offline Support

**Original:** [REQ-54, REQ-63]
**Current Implementation:** Service worker (cache-first for static, network-first for API) + `OfflineBanner.tsx`

| Feature | Current (React) | Flutter Equivalent |
|---------|----------------|-------------------|
| Offline detection | `navigator.onLine` + `useSyncExternalStore` | `connectivity_plus` package |
| Offline banner | Fixed top banner when offline | `MaterialBanner` or custom top banner |
| Offline gameplay | Client-side AI (Easy/Medium/Hard) works offline | Native app — all client-side features work offline by default |
| Expert AI fallback | Prompt to switch to Hard on network failure | Same fallback with connectivity check |
| Offline page | Dedicated `/offline` route | Not needed — native app shows inline offline state |

**Improvement over current:** Native Flutter apps are inherently offline-capable for client-side features. No service worker needed. The app binary includes all UI and client AI code.

**Acceptance Criteria:**
- Easy/Medium/Hard AI games work fully offline.
- App detects network loss and shows non-intrusive indicator.
- Expert AI gracefully degrades to Hard with user notification.

---

## 4. Non-Functional Requirements

### 4.1 Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Cold start time** | < 2 seconds | Time from app launch to interactive home screen |
| **Warm start time** | < 500ms | Time from background to foreground |
| **Frame rate** | 60fps sustained | During board animations, drag-and-drop, victory animation |
| **Board render time** | < 16ms per frame | `CustomPainter.paint()` execution time |
| **AI response (Easy)** | < 500ms | `findBestMove()` in isolate |
| **AI response (Medium)** | < 1 second | `findBestMove()` in isolate |
| **AI response (Hard)** | < 2 seconds | `findBestMove()` in isolate |
| **Expert AI round-trip** | < 5 seconds (network) | POST + server compute + response |
| **Memory usage** | < 150 MB peak | During active gameplay with animations |
| **App binary size** | < 30 MB (iOS), < 20 MB (Android) | Release build, split per ABI |
| **Clock tick accuracy** | ± 10ms | `Timer.periodic` or `Ticker` precision |

**Critical:** Client-side AI (Easy/Medium/Hard) MUST run on a background `Isolate` to prevent UI thread blocking. The current web implementation runs on the main thread, which is acceptable in browsers but will cause jank in Flutter.

### 4.2 Accessibility

| Requirement | Implementation |
|-------------|---------------|
| **Screen reader support** | All interactive elements wrapped in `Semantics` widgets with descriptive labels |
| **Board square labels** | Each square: `Semantics(label: "Square 23, White king")` (mirrors current ARIA labels) |
| **Game status announcements** | `SemanticsService.announce()` for turn changes, captures, game end (mirrors current `aria-live`) |
| **Text scaling** | Support system text scale factor up to 2.0× without layout breakage |
| **High contrast** | Respect platform high contrast settings; ensure 4.5:1 contrast ratios (WCAG AA) |
| **Touch target sizes** | Minimum 48×48dp for all interactive elements (Material guidelines) |
| **Keyboard navigation** | Full keyboard support on desktop/web targets |
| **Reduce motion** | Respect `MediaQuery.disableAnimations` to skip or minimize animations |
| **Focus management** | Logical focus order for dialogs, controls, and board interaction |

### 4.3 Localization Readiness

While v1 is English-only [C6], the Flutter app should be structured for future localization:
- All user-facing strings extracted into ARB files using `flutter_localizations`.
- No hardcoded English strings in widget code.
- RTL layout support via Flutter's built-in `Directionality`.

### 4.4 Platform Parity

All features listed in Section 3 must work identically across iOS and Android. Web parity is maintained separately by the existing Next.js frontend per ADR-013.

| Concern | iOS | Android |
|---------|-----|---------|
| **Navigation** | iOS-style back swipe gesture | Android back button |
| **Haptic feedback** | `HapticFeedback.mediumImpact()` on piece placement | `HapticFeedback.mediumImpact()` |
| **Status bar** | Respect safe area insets | Respect safe area insets |
| **Keyboard** | iOS keyboard for text fields | Android keyboard |
| **Secure storage** | Keychain | EncryptedSharedPreferences |
| **Share** | `Share.share()` (native sheet) | `Share.share()` (native sheet) |

---

## 5. Security Requirements

### 5.1 Transport Security

| Requirement | Details |
|-------------|---------|
| **HTTPS/TLS enforcement** | All API communication over HTTPS. No fallback to HTTP. |
| **Minimum TLS version** | TLS 1.2 minimum; prefer TLS 1.3 |
| **Certificate pinning** | Post-launch enhancement (not MVP). MVP uses standard TLS validation; pinning is scheduled after launch hardening. |
| **Certificate rotation plan** | Defined for post-launch pinning rollout (backup pins + forced-update path via ADR-014). |

### 5.2 Authentication & Token Management

| Requirement | Details |
|-------------|---------|
| **JWT storage** | Store JWT tokens using `flutter_secure_storage` (iOS Keychain accessibility: `first_unlock_this_device`; Android EncryptedSharedPreferences). **Never** store in `SharedPreferences` or plain text files. |
| **Token in memory** | Keep active token in memory (state management) for API calls. Read from secure storage only on app launch. |
| **Token expiry** | Check `expiresAt` before each API call. Redirect to login when expired. |
| **Logout cleanup** | On logout: clear secure storage, clear in-memory state, clear all cached data. |
| **Auto-logout** | Automatically log out when token expiry is detected (currently only checked on `isAuthenticated()` calls). |

### 5.3 Native App Security

| Requirement | Details |
|-------------|---------|
| **No CORS needed** | Native iOS/Android apps make direct HTTPS calls — no browser CORS restrictions. Backend CORS config should still allow web origin if Flutter Web is deployed. |
| **API authentication header** | Migrate from `credentials: 'include'` (cookie-based) to `Authorization: Bearer <token>` header. This is a **backend change** needed to support native apps. |
| **Obfuscation** | Enable Dart code obfuscation in release builds (`--obfuscate --split-debug-info`). |
| **Root/jailbreak detection** | Consider detecting rooted/jailbroken devices and warning users (not blocking). |
| **Debugger detection** | Disable debug tools in release builds (Flutter default). |
| **ProGuard/R8** | Enable for Android release builds to minify and obfuscate. |

### 5.4 Token Refresh Gap

> **⚠️ CRITICAL GAP:** The current implementation has **no token refresh mechanism**. Tokens expire and users must re-login. This is problematic for mobile apps where users expect persistent sessions.

**Recommended implementation for Flutter migration:**

| Component | Details |
|-----------|---------|
| **Refresh token** | Backend issues a long-lived refresh token alongside the short-lived JWT access token. |
| **Refresh storage** | Refresh token stored in `flutter_secure_storage` (same as access token). |
| **Auto-refresh** | HTTP client interceptor (e.g., `dio` with interceptor) detects 401 responses, attempts token refresh, and retries the original request. |
| **Refresh endpoint** | New backend endpoint: `POST /api/auth/refresh` accepting `{ refreshToken }` and returning new access + refresh tokens. |
| **Refresh token rotation** | Each refresh request invalidates the old refresh token and issues a new one (prevents replay attacks). |
| **Session revocation** | Backend must support revoking all refresh tokens for a user (for logout-everywhere and security incidents). |

> **Resolved (ADR-012):** Token refresh is mandatory pre-migration backend work (Phase 0).

### 5.5 Biometric Authentication (Optional Enhancement)

| Feature | Details |
|---------|---------|
| **Biometric unlock** | Allow users to enable Face ID / Touch ID / fingerprint to unlock the app and retrieve stored tokens without re-entering credentials. |
| **Implementation** | `local_auth` Flutter package for biometric prompt. Tokens remain in `flutter_secure_storage` with biometric access control. |
| **Fallback** | PIN/password fallback if biometric fails. |

> **Resolved:** Biometric auth is post-MVP.

### 5.6 Data Protection

| Requirement | Details |
|-------------|---------|
| **Sensitive data in logs** | Never log JWT tokens, passwords, or user PII. |
| **Clipboard protection** | Do not automatically copy sensitive data to clipboard. |
| **Screenshot protection** | Consider `FlutterWindowManager` to prevent screenshots on sensitive screens (login). Platform-dependent. |
| **App backgrounding** | Optionally obscure screen content in app switcher for privacy. |
| **GDPR compliance** | Account deletion (already implemented via DELETE `/api/auth/account/{userId}`) must clear all local storage including secure storage. |

---

## 6. Migration Strategy

### 6.1 Phased Approach

The migration follows a 5-phase incremental approach. Each phase delivers testable, demonstrable functionality. No "big bang" switch.

```
Phase 1: Foundation (Dart Engine + App Skeleton)
    ↓
Phase 2: Core Gameplay (Board + Moves + AI)
    ↓
Phase 3: Full Game Experience (Clock + Setup + Persistence + Learning)
    ↓
Phase 4: Profile & Polish (Auth + Profile + Replay + Settings + Animations)
    ↓
Phase 5: Testing, QA & Launch Prep
```

### 6.2 Phase Details

#### Phase 1: Foundation

**Goal:** Dart engine passes all 190+ shared engine tests. Flutter app skeleton with routing and theming is functional.

| Deliverable | Description | Success Criteria |
|-------------|-------------|-----------------|
| Dart engine package | Port all modules: types, board, engine, AI, clock, rating | All 190+ tests pass in Dart |
| Flutter project scaffold | Project structure, dependencies, CI setup | `flutter build` succeeds for iOS + Android + Web |
| Routing | All 8 screens with placeholder content | Navigation works between all screens |
| Theme system | 4 board themes + dark mode + design tokens | Themes switch correctly; dark mode follows system |
| API client | HTTP client with auth headers, error handling | Can call health endpoint and receive response |
| Auth state management | Login, register, logout, token storage | Login flow works end-to-end with backend |

#### Phase 2: Core Gameplay

**Goal:** A fully playable draughts game against client-side AI (no animations, no clock, no persistence).

| Deliverable | Description | Success Criteria |
|-------------|-------------|-----------------|
| Board widget | 10×10 grid with pieces, themes, orientation | Board renders correctly in all themes |
| Piece interaction | Tap-to-select + tap-to-move + drag-and-drop | Moves execute correctly; illegal moves rejected |
| Game state management | Full game lifecycle: setup → play → game over | Complete game can be played start to finish |
| Client-side AI | Easy/Medium/Hard on background isolate | AI responds within time targets; no UI jank |
| Basic game controls | New Game, Undo, Resign, Draw | All controls function correctly |
| Game status display | Turn indicator, move count, game result | Status updates in real-time |
| Move history | Scrollable move list with FMJD notation | All moves display correctly |

#### Phase 3: Full Game Experience

**Goal:** Feature-complete gameplay including clock, animations, persistence, Expert AI, and learning mode.

| Deliverable | Description | Success Criteria |
|-------------|-------------|-----------------|
| Move animations | Single-step + multi-capture sequence animations | Animations play correctly at all 4 speed settings |
| Game setup dialog | Full dialog with opponent/difficulty/color/clock config | All options work; Quick Start uses saved config |
| Chess clock | Dual clock with presets, warnings, time expiry | Clock ticks accurately; time-out ends game |
| Expert AI integration | Backend API calls with board rotation | Expert AI returns valid moves; fallback works |
| Game persistence | Auto-save for guest + registered users | Game resumes correctly after app restart |
| Learning mode | All 30+ tutorial steps with validation | All steps completable; feedback correct |
| Pause/resume | Pause overlay hides board; clock pauses | Pause/resume works correctly |

#### Phase 4: Profile & Polish

**Goal:** Full feature parity with current web app. Visual polish and platform-specific refinements.

| Deliverable | Description | Success Criteria |
|-------------|-------------|-----------------|
| Login / Register screens | Email/password auth forms | Auth flow works end-to-end |
| Profile screen | Stats, rating chart, game history | All profile data displays correctly |
| Replay viewer | Full playback with controls | Completed games replay correctly |
| Settings panel | All display preferences | Settings persist and take effect |
| Victory animation | Physics-based celebration | Smooth 60fps; dismissible |
| Offline detection | Banner + Expert fallback | Network loss detected; fallback activates |
| Haptic feedback | Piece placement, capture, game end | Haptics fire on iOS and Android |
| App icons & splash | Platform-specific launch assets | Clean launch experience |

#### Phase 5: Testing, QA & Launch Prep

**Goal:** Production-ready quality. App store submission.

| Deliverable | Description | Success Criteria |
|-------------|-------------|-----------------|
| Unit tests | Engine (190+), state (50+), utilities (30+) | Coverage meets thresholds (see Section 9) |
| Widget tests | All screens and components (160+) | Coverage meets thresholds |
| Integration tests | Full user journeys (45+ scenarios) | All E2E scenarios pass on real devices |
| Accessibility audit | Screen reader, contrast, touch targets | WCAG AA compliance verified |
| Performance profiling | Startup, frame rate, memory on target devices | All perf targets met (see Section 4.1) |
| App store assets | Screenshots, descriptions, keywords, privacy policy | Reviews submitted to Apple + Google |
| Beta testing | TestFlight (iOS) + internal testing (Android) | No P0 bugs; < 5 P1 bugs |

### 6.3 Feature Parity Checklist

The following checklist must be 100% complete before Flutter replaces the web app:

- [ ] 10×10 board with 4 themes
- [ ] Piece rendering (man + king, both colors)
- [ ] Board notation (1–50)
- [ ] Board orientation (White/Black perspective)
- [ ] Tap-to-move
- [ ] Drag-and-drop
- [ ] Move animations (single + multi-capture)
- [ ] Selected square highlighting
- [ ] Legal move indicators
- [ ] Last move highlighting
- [ ] AI thinking overlay
- [ ] Game setup dialog (all options)
- [ ] Quick Start
- [ ] Easy AI
- [ ] Medium AI
- [ ] Hard AI
- [ ] Expert AI (backend)
- [ ] Expert → Hard fallback
- [ ] Chess clock (6 presets)
- [ ] Clock low-time warning
- [ ] Clock time expiry
- [ ] Pause / Resume
- [ ] Undo / Redo
- [ ] Resign
- [ ] Offer Draw
- [ ] Move history (FMJD notation)
- [ ] Game status (turn, result, move count)
- [ ] Game config summary
- [ ] Victory animation
- [ ] Learning mode (30+ steps)
- [ ] Learning mode hints
- [ ] Learning mode move feedback
- [ ] Login
- [ ] Register
- [ ] Guest mode
- [ ] Logout
- [ ] Account deletion
- [ ] Profile (display name, avatar)
- [ ] Stats overview
- [ ] Glicko-2 rating display
- [ ] Rating chart
- [ ] Game history (paginated, filtered)
- [ ] Replay viewer
- [ ] Settings: board theme
- [ ] Settings: show notation
- [ ] Settings: show legal moves
- [ ] Settings: animation speed
- [ ] Guest game persistence
- [ ] Registered user game persistence
- [ ] Backend game sync
- [ ] Resume prompt on launch
- [ ] Offline gameplay (Easy/Medium/Hard)
- [ ] Offline detection banner
- [ ] Dark mode
- [ ] Responsive layout (phone, tablet, desktop)
- [ ] Accessibility (screen reader, contrast)

### 6.4 Regression Testing Plan

| Test Layer | Framework | Runs When | Covers |
|-----------|-----------|-----------|--------|
| **Dart engine unit tests** | `flutter_test` | Every PR | Rules, AI, clock, rating — algorithmic correctness |
| **State management tests** | `flutter_test` | Every PR | Game store, auth store — state transitions |
| **Widget tests** | `flutter_test` | Every PR | Component rendering, interaction, accessibility |
| **Integration tests** | `integration_test` | Nightly + pre-release | Full user journeys on real devices/emulators |
| **Manual QA** | Checklist | Pre-release | Platform-specific: gestures, performance, app lifecycle |
| **Backend regression** | xUnit (existing) | Every PR | Ensure backend still works with new client |

---

## 7. Shared Engine Strategy

### 7.1 Recommended Approach: Port to Dart

The shared draughts engine (`@international-draughts/engine`) should be ported to a standalone Dart package. Rationale:

| Factor | Port to Dart | JS Interop / FFI | Dual Maintenance |
|--------|-------------|-------------------|-----------------|
| **Mobile performance** | ✅ Native Dart, compiled to ARM | ❌ JS runtime overhead on mobile | ✅ Native on each platform |
| **Isolate support** | ✅ Native `Isolate` for AI compute | ❌ Complex JS↔Dart bridge across isolates | ✅ But duplicated effort |
| **Testability** | ✅ Standard `flutter_test` | ⚠️ Requires JS environment | ✅ Each in its own ecosystem |
| **Maintenance** | ✅ Single Dart codebase | ⚠️ Bridge code adds complexity | ❌ 2× maintenance burden |
| **Dependencies** | ✅ Zero (same as TypeScript version) | ⚠️ JS runtime dependency | ✅ Zero each |
| **Code size** | ~2,500 LoC to port | N/A | ~2,500 LoC × 2 languages |

### 7.2 Engine Module Port Plan

| Module | LoC (est.) | Port Difficulty | Key Considerations |
|--------|-----------|----------------|-------------------|
| `types/` (piece, board, move, notation, game-state) | ~200 | Low | Direct type mapping; use Dart enums, `freezed` or plain classes |
| `board/topology.ts` | ~150 | Low | Adjacency tables — pure data. Direct port. |
| `engine/move-generator.ts` | ~500 | **High** | FMJD-compliant move generation. Most critical module. Must pass all tests. |
| `engine/board-utils.ts` | ~100 | Low | `applyMoveToBoard` and helpers. Direct port. |
| `engine/game-engine.ts` | ~100 | Low | `oppositeColor`, game logic. Direct port. |
| `ai/search.ts` | ~400 | **High** | Alpha-beta with iterative deepening, transposition table integration, killer moves. Performance-sensitive. |
| `ai/evaluation.ts` | ~300 | Medium | Material + positional evaluation. Must produce identical scores. |
| `ai/difficulty.ts` | ~100 | Low | Configuration constants. Direct port. |
| `ai/zobrist.ts` | ~100 | Medium | Zobrist hashing — random number generation must match or be re-initialized. |
| `ai/transposition-table.ts` | ~100 | Low | Hash map with replacement strategy. Direct port. |
| `ai/killer-moves.ts` | ~50 | Low | Simple data structure. Direct port. |
| `clock/clock.ts` | ~200 | Low | Pure functions. Direct port. |
| `rating/glicko2.ts` | ~200 | Medium | Math-heavy; floating-point precision matters. Validate with test parity. |

### 7.3 Test Parity Requirement

**All 190+ existing shared engine tests must be ported to Dart and must pass.**

Port strategy:
1. Port test files first (they serve as the specification).
2. Port engine modules one-by-one.
3. Run tests after each module port — fail fast on regressions.
4. After full port, run a cross-validation: feed identical inputs to both TypeScript and Dart engines, compare outputs for 10,000+ random board positions.

### 7.4 Package Structure

> **Resolved (ADR-015):** Use an in-project monorepo package at `shared/draughts-engine-dart/`.

Recommended structure:
```
shared/
├── draughts-engine/          # Existing TypeScript engine
│   └── ...
└── draughts-engine-dart/     # New Dart engine
    ├── pubspec.yaml
    ├── lib/
    │   ├── draughts_engine.dart  # Barrel export
    │   ├── src/
    │   │   ├── types/
    │   │   ├── board/
    │   │   ├── engine/
    │   │   ├── ai/
    │   │   ├── clock/
    │   │   └── rating/
    └── test/
        ├── ai_test.dart
        ├── board_utils_test.dart
        ├── clock_test.dart
        ├── game_engine_test.dart
        ├── glicko2_test.dart
        ├── move_generator_test.dart
        ├── topology_test.dart
        └── types_test.dart
```

---

## 8. User Personas

### 8.1 Mobile-First Casual Player

> **"Fatou"** — 32, plays board games on her phone during lunch breaks. Has limited time (5–15 min per session). Wants to jump in quickly, play a game against Easy or Medium AI, and close the app. Expects it to remember her game if she's interrupted.

- **Device:** iPhone 14 / Samsung Galaxy A54
- **Session length:** 5–15 minutes
- **Key needs:** Quick Start, game persistence, responsive portrait layout, offline play on commute
- **Discovery:** App Store search for "draughts" or "checkers"

### 8.2 Tablet Board Game Enthusiast

> **"Marcus"** — 45, loves the tactile feel of board games. Uses his iPad for digital board games. The larger screen is ideal for draughts with clear pieces and satisfying drag-and-drop.

- **Device:** iPad Air / Samsung Galaxy Tab S9
- **Session length:** 20–60 minutes
- **Key needs:** Large, beautiful board rendering, drag-and-drop, landscape layout, local PvP for playing with family
- **Discovery:** iPad App Store "board games" category

### 8.3 Competitive Training Player

> **"Dmitri"** — 28, competitive club-level draughts player. Uses the Expert AI to train openings and endgames. Tracks his Glicko-2 rating obsessively. Wants to analyze games afterwards.

- **Device:** iPhone 15 Pro + desktop
- **Session length:** 30–90 minutes
- **Key needs:** Expert AI, timed mode, rating chart, game history, replay viewer, profile stats
- **Discovery:** Draughts community forums, word of mouth

### 8.4 Daily Commute Player

> **"Aisha"** — 24, plays during her 30-minute subway commute. Connection is spotty (underground). Needs the app to work offline and resume seamlessly.

- **Device:** Pixel 8
- **Session length:** 15–30 minutes, often interrupted
- **Key needs:** Offline play, fast cold start, game persistence, compact portrait layout
- **Discovery:** Google Play search, recommended by friend

### 8.5 Learner / Newcomer

> **"James"** — 19, knows how to play English checkers but is curious about international draughts. Wants to learn the differences (flying kings, maximum capture rule). Uses the learning mode.

- **Device:** iPhone SE / budget Android
- **Session length:** 10–20 minutes
- **Key needs:** Learning mode, rules tutorial, move hints, clear legal move indicators
- **Discovery:** App Store search for "learn draughts" or "10x10 checkers"

---

## 9. Success Criteria

### 9.1 Feature Parity

| Criterion | Target |
|-----------|--------|
| Feature parity checklist (Section 6.3) | 100% complete |
| FMJD rule compliance | 100% (verified by ported engine tests) |
| Dart engine test parity | All 190+ tests passing |
| All existing user flows reproducible in Flutter | Verified by integration tests |

### 9.2 Performance Targets

| Metric | iOS Target | Android Target | Web Target |
|--------|-----------|---------------|-----------|
| Cold start | < 2s | < 2s | < 3s |
| Frame rate (gameplay) | 60fps | 60fps | 60fps |
| Frame rate (victory animation) | 60fps | 60fps | 50fps (acceptable) |
| AI response (Hard) | < 2s | < 2s | < 2s |
| Memory peak | < 150 MB | < 150 MB | < 200 MB |
| Binary size | < 30 MB | < 20 MB (per ABI) | < 5 MB (compressed) |

### 9.3 Quality Targets

| Metric | Target |
|--------|--------|
| Dart engine unit test coverage | ≥ 85% (statements, branches, functions, lines) |
| Flutter widget test coverage | ≥ 50% statements, ≥ 40% branches |
| Integration test scenario coverage | 45+ scenarios (matching current E2E suite) |
| Crash-free rate | ≥ 99.5% (measured via Crashlytics/Sentry) |
| App Store rating | ≥ 4.0 stars (after 100+ reviews) |

### 9.4 App Store Readiness

| Platform | Requirements |
|----------|-------------|
| **iOS App Store** | App review guidelines compliance, privacy nutrition labels, screenshots (6.7", 5.5", iPad), app description, keywords, age rating (4+), privacy policy URL |
| **Google Play** | Content rating (Everyone), screenshots (phone + 7" tablet + 10" tablet), feature graphic, short/full description, privacy policy URL, data safety declaration |
| **Both** | No crashes during review, test accounts provided for reviewers, accessibility compliance |

### 9.5 Accessibility Targets

| Standard | Target |
|----------|--------|
| WCAG 2.1 Level AA | All screens pass |
| iOS VoiceOver | Full game playable via VoiceOver |
| Android TalkBack | Full game playable via TalkBack |
| Dynamic Type (iOS) / Font scaling (Android) | Layout stable up to 2× text scale |

---

## 10. Resolved Decision Log (Historical Q&A)

These questions are retained for traceability, but the decisions are now ratified in ADR-009 through ADR-015 and reflected in the migration strategy and implementation plan.

### Q1: Should Flutter Web replace the Next.js frontend or coexist?

| Option | Pros | Cons |
|--------|------|------|
| **A. Replace** | Single codebase; no dual maintenance; cleaner | Flutter Web performance may lag behind optimized Next.js; SEO concerns (landing page); uncertain rendering fidelity for complex canvas animations |
| **B. Coexist** (transition period) | Low risk; existing web users unaffected; gradual migration | Two frontends to maintain; potential feature drift; confusing deployment |
| **C. Coexist permanently** | Each platform uses optimal technology | Permanent dual maintenance cost; feature parity burden |

**Recommendation:** Option B — coexist during migration, evaluate Flutter Web quality, then decide on permanent replacement.
**Priority:** 🔴 High — affects project scope and timeline.
**Decision Owner:** Product + Engineering Lead

---

### Q2: Target platform priority?

| Option | Description |
|--------|-------------|
| **A. iOS + Android first** | Mobile-first; web stays on Next.js. Shorter timeline to app stores. |
| **B. iOS + Android + Web simultaneously** | Full replacement. Longer Phase 1 but single codebase from day one. |

**Recommendation:** Option A — ship mobile first; evaluate Flutter Web later.
**Priority:** 🔴 High — determines migration phases and timeline.
**Decision Owner:** Product

---

### Q3: State management choice?

| Option | Pros | Cons |
|--------|------|------|
| **Riverpod** | Compile-safe, testable, good for complex state, strong community | Learning curve; verbose for simple cases |
| **BLoC** | Battle-tested, event-driven (good for game state machine), great tooling | Boilerplate-heavy; overkill for simple stores |
| **Provider + ChangeNotifier** | Simple, built-in almost, low ceremony | Limited for complex async; scaling concerns |

**Recommendation:** Riverpod for game store (complex state machine), Provider for simple state (settings, theme).
**Priority:** 🟡 Medium — affects architecture but can be changed early.
**Decision Owner:** Tech Lead / Architect

---

### Q4: Navigation library?

| Option | Pros | Cons |
|--------|------|------|
| **go_router** | Official Google package, declarative, type-safe, deep linking | Less flexible for complex nested routing |
| **auto_route** | Code generation, strongly typed, supports nested navigation | Additional dependency; slower build times |
| **Navigator 2.0 (raw)** | No dependency | Verbose; complex for deep linking |

**Recommendation:** `go_router` — 8 simple routes, no deep nesting needed. Official support. Deep linking built-in.
**Priority:** 🟢 Low — straightforward decision; 8 simple routes.
**Decision Owner:** Tech Lead

---

### Q5: Should the Dart engine be a standalone package?

| Option | Description |
|--------|-------------|
| **A. Standalone Dart package** | Publishable to pub.dev; reusable; clean dependency boundary |
| **B. In-project package** (monorepo) | Lower ceremony; simpler version management; still a separate package with `pubspec.yaml` |

**Recommendation:** Option B — in-project package under `shared/draughts-engine-dart/`. Simpler to manage. Can publish to pub.dev later if there's demand.
**Priority:** 🟢 Low — packaging decision; doesn't affect functionality.
**Decision Owner:** Tech Lead

---

### Q6: Token refresh implementation strategy?

| Option | Description |
|--------|-------------|
| **A. Implement before migration** | Backend adds refresh token endpoint first; both React + Flutter benefit |
| **B. Implement during migration** | Backend + Flutter client implement refresh tokens together |
| **C. Defer to post-migration** | Ship Flutter with current (no-refresh) behavior; add later |

**Recommendation:** Option A — implement refresh tokens on backend before Flutter work begins. Critical for mobile UX where sessions are expected to persist for weeks.
**Priority:** 🔴 High — mobile users expect persistent sessions.
**Decision Owner:** Backend Lead + Product

---

### Q7: Deep linking / Universal Links support?

| Feature | Description |
|---------|-------------|
| **Deep links** | `internationaldraughts://play?setup=true` to open game setup |
| **Universal Links (iOS) / App Links (Android)** | `https://draughts.example.com/play` opens in app instead of browser |

**Recommendation:** Implement basic deep linking (app scheme) in Phase 1. Universal Links in Phase 4 (requires backend `.well-known` configuration).
**Priority:** 🟡 Medium — nice for sharing/marketing; not blocking for MVP.
**Decision Owner:** Product

---

### Q8: Biometric authentication?

| Option | Description |
|--------|-------------|
| **A. In scope for migration** | Adds native-differentiating feature; leverages platform capabilities |
| **B. Post-migration enhancement** | Keeps migration scope focused on parity |

**Recommendation:** Option B — post-migration. Focus on feature parity first.
**Priority:** 🟢 Low — enhancement, not parity requirement.
**Decision Owner:** Product

---

### Q9: Haptic feedback?

Should piece placement, captures, and game-end events trigger haptic feedback on mobile?

**Recommendation:** Yes — minimal effort, significant UX improvement. Include in Phase 4.
**Priority:** 🟢 Low — small scope; big impact on native feel.
**Decision Owner:** Product / UX

---

### Q10: Analytics and crash reporting?

| Option | Description |
|--------|-------------|
| **Firebase Analytics + Crashlytics** | Industry standard for mobile; free tier sufficient |
| **Sentry** | Cross-platform; works on web too; privacy-friendly |
| **None (for now)** | Minimal; add later |

**Recommendation:** Firebase Crashlytics for crash reporting (essential for app store quality). Analytics can wait.
**Priority:** 🟡 Medium — needed before app store launch.
**Decision Owner:** Engineering Lead

---

## 11. Dependencies & Risks

### 11.1 Critical Dependencies

| Dependency | Description | Impact if Delayed |
|-----------|-------------|-------------------|
| **Dart engine port accuracy** | Engine must be 100% FMJD-compliant in Dart. Any bug breaks gameplay. | Blocks Phase 2 entirely. |
| **Backend API auth changes** | Native apps need `Authorization: Bearer` header support (currently cookie-based). | Blocks authenticated features. |
| **Token refresh endpoint** | New `POST /api/auth/refresh` endpoint on backend. | Degrades mobile UX (frequent re-login). |
| **Apple Developer account** | Required for iOS development and App Store submission. | Blocks iOS testing and launch. |
| **Google Play Developer account** | Required for Android distribution. | Blocks Android launch. |
| **CI/CD Flutter support** | GitHub Actions runners with Flutter SDK, iOS build (macOS runner), Android build. | Slows development velocity. |

### 11.2 Risks

#### High Risk

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Engine port introduces rule bugs** | Medium | Critical — incorrect gameplay | Port all 190+ tests first; cross-validate with TypeScript engine on 10,000+ positions; test every FMJD edge case |
| **Move animation fidelity gap** | Medium | High — degraded user experience | Build dedicated `MoveAnimationController`; test multi-capture scenarios on device; compare side-by-side with web |
| **Game store complexity in new state management** | Medium | High — core architecture risk | Prototype game store in Phase 1; extensive state transition tests; consider BLoC for explicit event-driven control |
| **Backend auth changes break existing web app** | Low | High — regression for current users | Implement bearer token auth as additional option, not replacement. Keep cookie auth working during transition. |

#### Medium Risk

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Flutter Web canvas performance** | High | Medium — board rendering may lag | Profile early; consider CanvasKit vs HTML renderer; may need platform-specific optimizations |
| **Victory animation (physics simulation) fidelity** | Medium | Low–Medium — visual regression | Accept simplified animation initially; iterate to parity post-launch |
| **Rating chart (SVG → CustomPainter)** | Medium | Medium — complex custom rendering | Use `fl_chart` package as accelerator; fall back to CustomPainter only if needed |
| **App Store review delays** | Medium | Medium — delays launch | Submit early beta builds; respond to review feedback quickly |
| **Learning mode 838-line page port** | Medium | Medium — large single-file port | Extract tutorial step data into separate data file; port logic independent of UI |
| **Isolate communication overhead for AI** | Low | Medium — AI response latency | Measure early; optimize serialization; consider `compute()` for simple calls |

#### Low Risk

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Tailwind → Flutter theme port** | Low | Low — mechanical task | Flutter theming is more structured; systematic port |
| **Routing (8 routes)** | Low | Low — `go_router` handles simply | Straightforward; no complex nested routing |
| **Auth flow port** | Low | Low — simple forms + API calls | Direct port; well-tested pattern |
| **Offline support** | Low | Low — native apps are inherently offline-capable | Flutter default; less work than current PWA approach |

### 11.3 External Dependencies (Flutter Packages)

| Package | Purpose | Risk Level | Alternative |
|---------|---------|------------|-------------|
| `go_router` | Navigation | Low (Google-maintained) | `auto_route` |
| `flutter_riverpod` | State management | Low (popular, well-maintained) | `flutter_bloc` |
| `dio` | HTTP client with interceptors | Low (widely used) | `http` (official) |
| `flutter_secure_storage` | Secure token storage | Low (platform keychain wrappers) | Direct platform channels |
| `connectivity_plus` | Network status | Low (Flutter Community maintained) | Custom implementation |
| `fl_chart` | Rating chart | Medium (less mainstream) | `CustomPainter` (no dependency) |
| `shared_preferences` | Simple key-value persistence | Low (Flutter first-party) | `hive` |
| `local_auth` | Biometric auth (if included) | Low (Flutter first-party) | N/A |
| `firebase_crashlytics` | Crash reporting | Low (Google-maintained) | `sentry_flutter` |

---

## 12. Timeline Estimate

> **Superseded by Strategy/Implementation Plan:** Approved migration timeline is **26–34 weeks** including Phase 0 backend hardening. See `flutter-migration-strategy.md` and `flutter-implementation-plan.md`.

### 12.1 Assumptions

- **Team:** 2 Flutter developers, 1 backend developer (part-time for auth changes), 1 QA.
- **Existing codebase:** Well-documented, well-tested. Analysis document provides complete inventory.
- **Backend changes:** Minimal (auth header support, token refresh endpoint).
- **Parallel workstreams:** Engine port (developer A) runs parallel to app skeleton (developer B) in Phase 1.

### 12.2 Phase Estimates

| Phase | Duration | Cumulative | Key Deliverables |
|-------|----------|-----------|-----------------|
| **Phase 1: Foundation** | 4–5 weeks | Week 5 | Dart engine (all tests pass), app skeleton, routing, theme, auth flow |
| **Phase 2: Core Gameplay** | 4–5 weeks | Week 10 | Playable game, board, AI, basic controls, game status |
| **Phase 3: Full Experience** | 5–6 weeks | Week 16 | Animations, clock, setup dialog, persistence, Expert AI, learning mode |
| **Phase 4: Profile & Polish** | 3–4 weeks | Week 20 | Profile, replay, settings, victory animation, offline, haptics |
| **Phase 5: Testing & Launch** | 3–4 weeks | Week 24 | Full test suite, QA passes, app store assets, beta feedback |

### 12.3 Total Estimate

| Scenario | Duration |
|----------|----------|
| **Optimistic** | 20 weeks (5 months) |
| **Expected** | 24 weeks (6 months) |
| **Conservative** | 28 weeks (7 months) |

### 12.4 Key Milestones

| Milestone | Target Week | Gate Criteria |
|-----------|-------------|--------------|
| **M1: Engine Validated** | Week 4 | All 190+ Dart engine tests pass; cross-validation with TypeScript engine |
| **M2: First Playable** | Week 10 | Complete game against Hard AI in Flutter (no polish) |
| **M3: Feature Complete** | Week 16 | All Section 3 functional requirements implemented |
| **M4: Feature Parity** | Week 20 | Section 6.3 checklist 100% complete |
| **M5: Beta Submission** | Week 22 | TestFlight + Google Play internal testing |
| **M6: App Store Launch** | Week 24 | Public release on iOS App Store + Google Play |

### 12.5 Pre-Migration Work (Before Phase 1)

The following should be completed before the Flutter migration begins:

| Task | Owner | Duration | Rationale |
|------|-------|----------|-----------|
| Backend: Add `Authorization: Bearer` header support | Backend developer | Included in auth overhaul | Native apps need header-based auth |
| Backend: Implement token refresh endpoint | Backend developer | Included in 2.5–3 week auth overhaul | Mobile sessions require refresh tokens |
| Backend: Update CORS to allow both web + native origins | Backend developer | 1 day | Ensure existing web app keeps working |
| Decision: Apply ratified ADRs (009–015) | Product + Tech Lead | 1–2 days | Decisions already finalized |
| Apple Developer Program enrollment | Product | 1–2 weeks | Required for iOS development |
| Google Play Developer registration | Product | 1 day | Required for Android distribution |

**Pre-migration total:** 2.5–3 weeks (can overlap with Phase 1 setup).

---

## Appendix A: Requirement Traceability

This table maps original PRD requirements to their Flutter migration status.

| Original REQ | Description | Migration Status |
|-------------|-------------|-----------------|
| REQ-1 to REQ-13 | FMJD game rules | Ported via Dart engine (§7) |
| REQ-14 | Legal move highlighting | §3.1 Board Rendering |
| REQ-15 to REQ-18 | AI opponent (4 levels) | §3.5 AI Opponent |
| REQ-19 | Multi-provider auth | Out of scope (email/password only per current implementation) |
| REQ-20 | Guest/register prompt | §3.8 Authentication |
| REQ-21 | Guest mode | §3.8 Authentication |
| REQ-22 | Player profile | §3.9 Player Profile |
| REQ-23 | Link login methods | Out of scope (not yet implemented) |
| REQ-24 | Account deletion | §3.8 Authentication |
| REQ-25 | PvC mode | §3.5 AI Opponent |
| REQ-26 | Local PvP | §3.4 Game Setup Dialog |
| REQ-27 | Resign, draw, undo | §3.4 / §6.2 Phase 2 |
| REQ-28 | Pause/resume | §6.2 Phase 3 |
| REQ-29 | Replay viewer | §3.13 Replay Viewer |
| REQ-30 to REQ-33 | Timed mode / clock | §3.6 Chess Clock |
| REQ-34 | Board theme | §3.11 Settings |
| REQ-35 | Piece style | Out of scope (single style in current implementation) |
| REQ-36 | Sound effects | Out of scope (not yet implemented in current app) |
| REQ-37 | Animation speed | §3.11 Settings |
| REQ-38 | Show legal moves | §3.11 Settings |
| REQ-39 | Show notation | §3.11 Settings |
| REQ-40 | Show move history | §3.11 Settings |
| REQ-41 | Timed mode config | §3.4 Game Setup Dialog |
| REQ-42 | Confirm move | Out of scope (not yet implemented in current app) |
| REQ-43 | Promotion animation | Out of scope (not yet implemented in current app) |
| REQ-44 to REQ-52 | UI/UX requirements | §3.1–§3.14 |
| REQ-53 to REQ-57 | Deployment / infrastructure | §2.2 Out of Scope (backend unchanged) |
| REQ-58 to REQ-62 | Game state / data flow | §3.10 Game Persistence |
| REQ-63, REQ-64 | Error handling | §3.5 AI Opponent (fallback) |
| REQ-66 | Browser/tab closure recovery | §3.10 Game Persistence (improved for native) |
| REQ-67 | User-facing errors | Non-functional requirement |
| REQ-68, REQ-70 | API communication | §5 Security + §3.5 AI Opponent |
| REQ-71 to REQ-73 | Difficulty scaling | §3.5 AI Opponent |
| REQ-74 to REQ-82 | Rating system | §3.9 Player Profile (rating chart) + engine port |

---

## Appendix B: Glossary

| Term | Definition |
|------|-----------|
| **FMJD** | Fédération Mondiale du Jeu de Dames — World Draughts Federation. Governs international draughts rules. |
| **Glicko-2** | Rating system used to estimate player skill. Extends Elo with rating deviation and volatility. |
| **Isolate** | Dart's concurrency model. A separate execution context with its own memory, used for background computation (e.g., AI search). |
| **CustomPainter** | Flutter widget for custom canvas-based rendering. Used for board, pieces, animations, and charts. |
| **Riverpod** | A reactive state management library for Flutter. Type-safe, testable, and supports async state. |
| **BLoC** | Business Logic Component — a state management pattern using Streams for input (events) and output (states). |
| **go_router** | A declarative routing package for Flutter maintained by the Flutter team. |
| **flutter_secure_storage** | A Flutter plugin for storing key-value pairs in platform-secure storage (Keychain / EncryptedSharedPreferences). |
| **Certificate Pinning** | A security technique where the app validates that the server's certificate matches a known, trusted certificate. Prevents MITM attacks. |
| **PWA** | Progressive Web App — a web application with native-like capabilities (offline, installable, push notifications). |
