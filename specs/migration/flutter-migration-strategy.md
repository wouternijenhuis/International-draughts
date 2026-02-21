# Flutter Mobile Migration Strategy

## International Draughts: Extending to iOS & Android

**Version:** 1.0
**Created:** 2026-02-21
**Status:** Draft
**Inputs:** [flutter-migration-analysis.md](flutter-migration-analysis.md), [flutter-migration-prd.md](flutter-migration-prd.md), [flutter-migration-prd-review.md](flutter-migration-prd-review.md), ADR-009 through ADR-015, [AGENTS.md](../../AGENTS.md)

---

## Contents

1. [Migration Approach](#1-migration-approach)
2. [Technical Debt to Fix First](#2-technical-debt-to-fix-first)
3. [Pre-Migration Prerequisites (Phase 0)](#3-pre-migration-prerequisites-phase-0)
4. [Detailed Migration Phases](#4-detailed-migration-phases)
5. [Risk Matrix](#5-risk-matrix)
6. [Quality Gates](#6-quality-gates)
7. [Rollback Strategy](#7-rollback-strategy)
8. [Success Metrics](#8-success-metrics)
9. [Team & Skills](#9-team--skills)
10. [Modernization Opportunities](#10-modernization-opportunities)

---

## 1. Migration Approach

### 1.1 Framing: Extend, Don't Replace

Per ADR-013, the Next.js web app **remains the web frontend**. This migration is an **extension** that adds native iOS and Android clients alongside the existing web app. All clients share the same ASP.NET Core backend API.

```
                    ┌──────────────┐
                    │  ASP.NET Core │
                    │  Backend API  │
                    └──────┬───────┘
                           │
               ┌───────────┼───────────┐
               │           │           │
        ┌──────▼──────┐ ┌──▼────┐ ┌───▼─────┐
        │  Next.js Web │ │  iOS  │ │ Android │
        │  (unchanged) │ │  App  │ │   App   │
        └─────────────┘ └───────┘ └─────────┘
                         Flutter (shared codebase)
```

**Implications:**

- The backend is the **single source of truth**. Backend changes must remain backward-compatible with the existing Next.js frontend throughout the migration.
- Game rules logic exists in two implementations: TypeScript (web) and Dart (mobile). Test parity ensures correctness. The engines are maintained independently.
- Feature development follows a **mobile-first, web-follows** cadence for new features. Existing web features remain supported at current quality.
- Flutter Web is **explicitly excluded** from the build matrix. The Next.js app is superior on every web-specific metric (bundle size, accessibility, SEO, load time).

### 1.2 Strategy Principles

| Principle | Rationale |
|-----------|-----------|
| **Backend first, then frontend** | Fix authentication, add rate limiting, and harden the API before exposing it to native clients that are easier to reverse-engineer. |
| **Port tests before code** | Dart engine tests serve as the specification. Port the 190+ shared engine tests first; then port modules until tests pass. |
| **Decompose the monolith** | The 1,087-line Zustand game store is the #1 architecture risk. Decompose into 8 Riverpod units (6 core game providers + learning + orchestration, ADR-009) — do not port it as a single class. |
| **Ship incrementally** | Each phase produces a testable, demonstrable build. No "big bang" integration at the end. Internal TestFlight/Play Store builds from Phase 2 onward. |
| **Platform-native UX** | Leverage native capabilities (haptics, secure storage, biometrics) rather than mimicking web behavior on mobile. |

### 1.3 Technology Decisions (From ADRs)

| Decision | ADR | Choice |
|----------|-----|--------|
| State management | ADR-009 | **Riverpod** — 8 decomposed units (6 core + learning + orchestration) |
| CI/CD pipeline | ADR-010 | **GitHub Actions + Fastlane** |
| AI isolate strategy | ADR-011 | **`Isolate.run()` + TransferableTypedData** for TT transfer |
| Backend auth | ADR-012 | **JWT validation middleware + refresh tokens** |
| Web strategy | ADR-013 | **Keep Next.js for web; Flutter = iOS + Android only** |
| App versioning | ADR-014 | **Custom `/api/v1/app-config` endpoint** |
| Engine packaging | ADR-015 | **Single monorepo Dart package** at `shared/draughts-engine-dart/` |

---

## 2. Technical Debt to Fix First

The migration analysis and DevLead review surfaced five critical technical-debt items. These are not Flutter-specific; they are existing quality and security gaps that must be resolved.

### 2.1 No JWT Validation Middleware (Severity: 🔴 Blocker)

**Current state:** `Program.cs` calls `app.UseAuthorization()` but has no `AddAuthentication()` or `AddJwtBearer()` configured. No authentication scheme is registered. Endpoints have no `[Authorize]` attributes. Authentication is a client-side honor system — any client can access any user's data by knowing the userId.

**Impact:** Native apps are trivially reverse-engineerable. An attacker on a rooted device can discover unprotected endpoints and access any user's profile, game history, and settings.

**Fix:** Full backend auth overhaul per ADR-012, Part 1–2.

### 2.2 No Token Refresh Mechanism (Severity: 🔴 Blocker)

**Current state:** Tokens expire (currently 24-hour lifetime) and users must re-login. The auth store checks `expiresAt` client-side but cannot refresh tokens.

**Impact:** Mobile users expect persistent sessions lasting weeks or months. Forcing daily re-login for a casual board game causes abandonment.

**Fix:** Implement refresh token flow per ADR-012, Part 3. Short-lived access tokens (15 min) + long-lived refresh tokens (30 days) with rotation.

### 2.3 Inconsistent Auth Model (Severity: 🟡 High)

**Current state:** The frontend sends `credentials: 'include'` (implying cookie-based auth) but no cookies are set. The JWT is stored in `localStorage` and used only for client-side `isAuthenticated()` checks. No `Authorization` header is ever sent.

**Impact:** Two clients (web + mobile) cannot share the same auth model if the web uses a non-functional cookie pattern. The web client must be updated to send `Authorization: Bearer <token>` headers.

**Fix:** Update web `api-client.ts` to send Bearer headers as part of the ADR-012 backend rollout. Test backward compatibility.

### 2.4 Board Rotation Inconsistency at API Boundary (Severity: 🟡 Medium)

**Current state:** The frontend uses inverted board numbering (White pieces on squares 1–20) while the backend uses FMJD standard (White pieces on squares 31–50). A `rotateSquare(s) = 51 - s` transformation is applied at the API boundary. This logic is embedded in the game store with inline comments explaining the rotation.

**Impact:** If the Dart engine or Flutter API client doesn't apply the same rotation, Expert AI moves will be applied to the wrong squares — a game-breaking bug that's invisible until a specific board state triggers it.

**Fix:** Isolate the rotation logic in both the TypeScript and Dart codebases into a dedicated, heavily-tested utility. Add round-trip integration tests: send a position to the Expert AI endpoint from the Dart engine, verify the returned move is correct.

### 2.5 1,087-Line Monolith Game Store (Severity: 🟡 Medium)

**Current state:** `game-store.ts` is a single Zustand store managing 8 tightly coupled concerns: phase state machine, board state, AI scheduling, clock management, game persistence, learning mode, settings/config, and serialization.

**Impact:** Porting this as a single class to Dart/Riverpod would create a 1,500+ line notifier that's untestable and unmaintainable. Cross-concern dependencies make individual features impossible to develop or test in isolation.

**Fix:** Decompose per ADR-009 into 8 units (6 core providers + `learningModeProvider` + `gameOrchestrationProvider`) and design the provider dependency graph before implementation.

---

## 3. Pre-Migration Prerequisites (Phase 0)

**Duration:** 3–4 weeks
**Gate:** All items complete before Phase 1 begins. Backend changes deployed to staging and verified with the existing web frontend.

### 3.1 Backend Hardening

| Task | Description | Owner | Effort | Dependency |
|------|-------------|-------|--------|------------|
| **JWT validation middleware** | Add `AddAuthentication().AddJwtBearer()` in `Program.cs`. Configure issuer, audience, signing key, expiry validation. Add `app.UseAuthentication()` before `app.UseAuthorization()`. | Backend Lead | 3 days | None |
| **Authorization guards** | Add `.RequireAuthorization()` to all protected endpoints, including `POST /api/v1/ai/move`. Extract userId from JWT `sub` claim instead of trusting URL parameter. Verify URL userId matches token userId. | Backend Lead | 2 days | JWT middleware |
| **Refresh token support** | New `POST /api/auth/refresh` endpoint. `RefreshTokens` database table (EF Core migration). Token rotation logic. Token family tracking for compromise detection. | Backend Lead | 5 days | JWT middleware |
| **Update login/register responses** | Return `{ token, expiresAt, refreshToken }` from auth endpoints. Access token lifetime: 15 min. Refresh token lifetime: 30 days. | Backend Lead | 1 day | Refresh token table |
| **App-config endpoint** | New `GET /api/v1/app-config` (unauthenticated) returning `{ minimumVersion, latestVersion, updateUrl, maintenanceMode, maintenanceMessage }`. Per ADR-014. | Backend Dev | 1 day | None |
| **Rate limiting** | Add `Microsoft.AspNetCore.RateLimiting` middleware. Per-user rate limits on authenticated endpoints. IP-based rate limits on unauthenticated endpoints. Per-endpoint limits on the CPU-intensive `POST /api/v1/ai/move`. | Backend Dev | 2 days | JWT middleware |
| **CORS update for mobile** | Verify ASP.NET Core CORS middleware passes through requests without `Origin` header (native apps). Add integration test confirming this behavior. | Backend Dev | 0.5 day | None |
| **Web API client update** | Update `frontend/src/lib/api-client.ts` to send `Authorization: Bearer <token>` headers. Remove `credentials: 'include'`. Test login, profile, game persistence with the updated backend. | Frontend Dev | 1 day | JWT middleware |
| **Dual auth support** | Configure JWT bearer events to check `Authorization` header first, fall back to reading token from request (transition support). | Backend Lead | 0.5 day | JWT middleware |
| **Backend testing** | Update existing 192 backend tests for auth changes. Add tests for: JWT validation, refresh token rotation, token family revocation, rate limiting, app-config endpoint. Target: 225+ tests. | Backend Lead | 3 days | All above |

**Total estimated effort:** 2.5–3 weeks of backend work (one senior backend developer).

### 3.2 Account & Infrastructure Setup

| Task | Owner | Effort | Notes |
|------|-------|--------|-------|
| **Apple Developer Program enrollment** | Product/Ops | 1–2 weeks (approval) | $99/year. Required for iOS builds and TestFlight. Start immediately — Apple can take 48 hours to approve. |
| **Google Play Developer registration** | Product/Ops | 1 day | $25 one-time. Required for Android distribution. |
| **Finalize open questions** | Product + Tech Lead | 2 days | Ratify all ADR decisions (009–015). Confirm: Riverpod, Fastlane, Isolate.run(), iOS 16+ / Android SDK 23+ minimums. |
| **Create Dart style guide** | Tech Lead | 1 day | Document sealed class patterns for union types (`Move`, `GamePhase`, `DrawReason`). Establish naming conventions, immutability patterns, error handling (`Result` types vs exceptions). |
| **Design Riverpod provider graph** | Architect | 1 day | Diagram 8 units (6 core providers + `learningModeProvider` + `gameOrchestrationProvider`), their state types, actions, and inter-provider dependencies. Identify cross-cutting responsibilities (`onGameOver`, `onMoveMade`). |
| **Generate Android release keystore** | Tech Lead | 1 hour | Store `.jks` securely. **This keystore cannot be regenerated** — losing it means you can never update the app on Play Store. Document the recovery/backup process. |

### 3.3 Phase 0 Exit Criteria

- [ ] Backend deploys to staging with JWT validation active; all 225+ tests pass
- [ ] Existing web frontend works with updated auth flow (Bearer tokens)
- [ ] Refresh token flow works end-to-end (login → API call → token expiry → auto-refresh → retry)
- [ ] `GET /api/v1/app-config` returns valid response
- [ ] Rate limiting verified on Expert AI endpoint
- [ ] Apple Developer and Google Play accounts active
- [ ] All ADRs ratified (009–015)
- [ ] Dart style guide published
- [ ] Riverpod provider graph documented
- [ ] Android keystore generated and backed up

---

## 4. Detailed Migration Phases

### 4.1 Phase 1: Foundation

**Duration:** 5–6 weeks
**Goal:** Dart engine passes all 190+ tests. Flutter app skeleton with routing, theming, auth flow, and CI pipeline is functional.

#### Deliverables

| # | Deliverable | Description | Effort |
|---|-------------|-------------|--------|
| 1.1 | **Dart engine package** | Port all 15 source files (~2,500 LoC) to `shared/draughts-engine-dart/`. Sealed classes for union types. `Uint8List`/`ByteData` for transposition table. | 2.5 weeks |
| 1.2 | **Dart engine tests** | Port all 190+ tests to Dart. Cross-validate: feed 10,000+ random positions to both TypeScript and Dart engines, compare outputs. | 1 week (parallel with 1.1) |
| 1.3 | **Flutter project scaffold** | `flutter create`, project structure matching ADR-015 layout. `pubspec.yaml` with dependencies: `go_router`, `flutter_riverpod`, `dio`, `flutter_secure_storage`, `shared_preferences`, `connectivity_plus`. | 1 day |
| 1.4 | **CI/CD pipeline** | `ci-flutter.yml`: lint + test (Linux), Android compile check (Linux), iOS compile check (macOS). `deploy-flutter.yml`: Fastlane iOS beta + Android beta. Per ADR-010. | 3 days |
| 1.5 | **Navigation (go_router)** | 8 routes with placeholder screens: `/`, `/play`, `/learn`, `/tutorial`, `/login`, `/register`, `/profile`, `/settings`. Deep link scheme: `intl-draughts://`. | 1 day |
| 1.6 | **Theme system** | `ThemeData` for light/dark modes. `BoardTheme` data class with 4 themes (classic-wood, dark, ocean, tournament-green). System-aware `ThemeMode`. Design tokens for colors, typography, spacing. | 2 days |
| 1.7 | **API client (dio)** | HTTP client with base URL configuration. `AuthInterceptor` for Bearer token injection and auto-refresh on 401. Error handling with typed `ApiException`. | 2 days |
| 1.8 | **Auth provider** | Riverpod `authProvider` (StateNotifier). Login, register, logout, token refresh. Secure token storage via `flutter_secure_storage`. Token expiry checks. | 3 days |
| 1.9 | **App version check** | `AppVersionService` consuming `GET /api/v1/app-config`. Startup flow: splash → version check → app. Per ADR-014. | 1 day |
| 1.10 | **Crashlytics / error reporting** | Firebase Crashlytics integration. `FlutterError.onError` + `PlatformDispatcher.instance.onError` for uncaught exceptions. Debug symbol upload in CI. | 1 day |

#### Acceptance Criteria

- [ ] All 190+ Dart engine tests pass
- [ ] Cross-validation with TypeScript engine: 10,000+ positions
  - Move generation: zero discrepancies (exact set match for legal moves)
  - Evaluation/scoring: divergence ≤ ε < 0.001 (acceptable floating-point variance between Dart and JavaScript)
  - Best move: same move selected OR same evaluation score (multiple moves can be equally optimal)
- [ ] `flutter analyze --fatal-infos` produces zero issues
- [ ] `flutter build ios --no-codesign` succeeds in CI
- [ ] `flutter build apk --debug` succeeds in CI
- [ ] Navigation between all 8 routes works
- [ ] All 4 board themes render correct color pairs
- [ ] Dark mode follows system setting
- [ ] Login flow works end-to-end against staging backend
- [ ] Token refresh works (expire access token → auto-refresh → retry succeeds)
- [ ] App version check shows "force update" when `minimumVersion` exceeds app version
- [ ] Crashlytics receives test crash reports

#### Dependencies

- Phase 0 complete (backend auth hardening, accounts, ADRs ratified)
- Xcode installed on macOS dev machines
- Android Studio / Flutter SDK installed

#### Risks

| Risk | Probability | Mitigation |
|------|-------------|------------|
| Sealed class patterns cascade more changes than estimated | Medium | Start with `Move` type (most pervasive); establish pattern before porting other unions |
| Transposition table byte-level port has endianness issues | Low | Use `Endian.little` explicitly; write byte-level round-trip tests |
| CI macOS runner costs exceed budget | Low | Path-filter iOS jobs; only run on `lib/`/`pubspec.yaml` changes |
| Floating-point precision differences in Glicko-2 | Low | Accept ±0.001 tolerance in rating tests; document any divergence |

#### Effort Estimate

| Resource | Weeks |
|----------|-------|
| Flutter Developer A (engine port) | 5 |
| Flutter Developer B (app scaffold, CI, auth) | 5 |
| Backend Developer (monitoring Phase 0 rollout) | 0.5 |

---

### 4.2 Phase 2: Core Gameplay

**Duration:** 5–6 weeks
**Goal:** A fully playable draughts game against client-side AI. Tap-to-move and drag-and-drop. No animations, no clock, no persistence. First internal TestFlight/Play Store build.

#### Deliverables

| # | Deliverable | Description | Effort |
|---|-------------|-------------|--------|
| 2.1 | **Board widget** | `CustomPainter` for board background (grid, square colors, notation). `Stack` + `Positioned` for pieces. Renders all 4 themes. Orientation flip (White/Black perspective). Responsive sizing via `LayoutBuilder`. | 5 days |
| 2.2 | **Piece widget** | `CustomPainter` with `RadialGradient` for 3D ring effect. SVG crown `Path` for kings. Amber/gray color system. | 2 days |
| 2.3 | **Tap-to-select, tap-to-move** | `GestureDetector.onTap` on board → coordinate-to-square mapping → `gameProvider.selectSquare()`. Legal move indicators (semi-transparent circles). Selected square highlight. | 3 days |
| 2.4 | **Drag-and-drop** | `GestureDetector.onPanStart/Update/End` for unified mouse+touch drag. Drag feedback piece tracks pointer. Invalid drop returns piece to origin. | 3 days |
| 2.5 | **Game provider (Riverpod)** | `gameProvider` StateNotifier with `GamePhase` sealed class hierarchy (`NotStarted`, `InProgress`, `GameOver`). Actions: `startGame`, `selectSquare`, `makeMove`, `resign`, `offerDraw`, `resetGame`. | 5 days |
| 2.6 | **AI provider + Isolate service** | `aiProvider` StateNotifier. `AiService` with `Isolate.run()` + TT transfer per ADR-011. Generation-counter cancellation. Easy/Medium/Hard difficulty. 150ms move delay. | 5 days |
| 2.7 | **Game controls** | `GameControls` widget: New Game, Undo, Resign, Offer Draw. Conditional rendering based on game phase and mode. | 2 days |
| 2.8 | **Game status** | `GameStatus` widget: turn indicator dot, status text, move count. `Semantics` with `liveRegion: true` for screen reader announcements. | 1 day |
| 2.9 | **Move history** | Scrollable `ListView` of paired moves (White/Black) with FMJD notation. Current-move highlighting. Auto-scroll to latest move. | 2 days |
| 2.10 | **Undo / Redo** | Undo 1 move (PvP) or 2 moves (vs AI). Redo with game-over re-check. Cancel pending AI on undo. | 2 days |
| 2.11 | **Last move highlighting** | Highlight from/to squares of the last move. Background color overlay on board squares. | 0.5 day |

#### Acceptance Criteria

- [ ] Complete game playable start to finish against all 3 client-side AI difficulties
- [ ] Tap-to-move: single tap selects, single tap executes
- [ ] Drag-and-drop works on both iOS and Android physical devices with zero dropped gestures
- [ ] AI responds within targets: Easy < 500ms, Medium < 1s, Hard < 2s
- [ ] AI never makes an illegal move at any difficulty
- [ ] Zero UI jank during AI computation (verified with Flutter DevTools performance overlay)
- [ ] Undo works correctly for both PvP and vs-AI
- [ ] Board renders correctly at 320px (SE) through 1366px (iPad landscape)
- [ ] Screen reader announces turn changes and game status
- [ ] Internal TestFlight build installable and playable

#### Dependencies

- Phase 1 complete (Dart engine validated, app skeleton functional)

#### Risks

| Risk | Probability | Mitigation |
|------|-------------|------------|
| Game store decomposition causes subtle state bugs | Medium | Write exhaustive state transition tests before building UI. Test every phase transition path. |
| Drag-and-drop feels laggy on older Android devices | Medium | Profile on Pixel 4a/Samsung A54. Optimize pointer coordinate calculation. Use `RepaintBoundary` to isolate board repaints. |
| TT transfer overhead on Android | Low | Benchmark `Isolate.run()` round-trip. Fall back to `compute()` with fresh TT if transfer overhead >50ms. |

#### Effort Estimate

| Resource | Weeks |
|----------|-------|
| Flutter Developer A (board, pieces, interaction) | 5 |
| Flutter Developer B (game state, AI, controls) | 5 |

---

### 4.3 Phase 3: Full Experience

**Duration:** 6–7 weeks
**Goal:** Feature-complete gameplay including animations, clock, setup dialog, Expert AI, persistence, learning mode, and pause/resume. Weekly TestFlight builds.

#### Deliverables

| # | Deliverable | Description | Effort |
|---|-------------|-------------|--------|
| 3.1 | **Move animation system** | `MoveAnimationController` class: position diffing, single-step slide (`AnimatedPositioned`), multi-capture sequencing (chained `AnimationController`s with `SequenceAnimation`), captured piece fade-out (`FadeTransition`). 4 speed settings (0/100/200/400ms). **This is a rewrite, not a port** — CSS transition sequencing cannot be mechanically translated. | 8 days |
| 3.2 | **Game setup dialog** | `showDialog` with `GameSetupForm`: opponent selector, difficulty selector (4-segment with "Server" badge on Expert), color picker, timed mode toggle + clock preset grid (5 presets, animated expand/collapse). Config persistence to `SharedPreferences`. Quick Start button. | 5 days |
| 3.3 | **Clock provider + widget** | `clockProvider` StateNotifier using `Ticker` (not `Timer.periodic` — pauses when app backgrounded). Dual clock faces with `AnimatedScale` for active clock. Low-time warning: `ColorTween` pulse + red text. Tenths of seconds below 10s. Time expiry triggers game over. 6 presets from engine. | 4 days |
| 3.4 | **Expert AI integration** | Authenticated `POST /api/v1/ai/move` via `dio` (`Authorization: Bearer`). Board rotation (`rotateSquare(s) = 51 - s`) at API boundary. Response parsing. Fallback to local Hard AI on network error or 401/403 with user notification (`SnackBar`). Network detection via `connectivity_plus`. | 3 days |
| 3.5 | **Game persistence** | `gamePersistenceProvider` service. Guest: auto-save to `SharedPreferences` after each move. Registered user: `SharedPreferences` + fire-and-forget `POST /api/v1/games/in-progress/{userId}`. Load on startup → `ResumePrompt` dialog. Serialization via `json_serializable`. | 4 days |
| 3.6 | **Learning mode** | `learningModeProvider` StateNotifier. Port 30+ tutorial step definitions (board positions, goals, hints, validation functions) from the 838-line `learn/page.tsx`. Step navigation (next/prev/restart). Move feedback (`SnackBar` with auto-dismiss at 3s). Hint highlight visualization. Progress persistence to `SharedPreferences`. | 6 days |
| 3.7 | **Pause / Resume** | `PauseOverlay` widget hiding board. `gameProvider.togglePause()` pauses clock ticker, sets `isPaused`. Resume restores clock. `role="dialog"` equivalent: `Semantics(namesRoute: true)`. | 1 day |
| 3.8 | **App lifecycle handling** | `WidgetsBindingObserver.didChangeAppLifecycleState`. On `paused`/`inactive`: save clock state, save game state, pause clock ticker. On `resumed`: restore clock, recalculate elapsed time. Critical for timed games — iOS aggressively kills background apps. | 2 days |

#### Acceptance Criteria

- [ ] Single-move animations play correctly at all 4 speed settings
- [ ] Multi-capture sequences animate step-by-step (slide → fade captured piece → next slide)
- [ ] "Instant" speed skips all animation
- [ ] Animations maintain 60fps on iPhone 12 / Pixel 6
- [ ] Setup dialog opens with last-used config pre-filled
- [ ] All 5 clock presets selectable; clock ticks at 100ms
- [ ] Clock low-time warning activates at 30s
- [ ] Time expiry ends game with correct result
- [ ] Expert AI returns valid moves; board rotation verified with integration test
- [ ] Expert fallback to Hard activates on airplane mode with SnackBar notification
- [ ] In-progress game survives app backgrounding, termination, and restart
- [ ] Resume prompt shows correct game description and move count
- [ ] All 30+ learning mode steps completable
- [ ] Learning mode hints highlight correct squares
- [ ] Move feedback auto-dismisses after 3 seconds
- [ ] Clock pauses when app is backgrounded and resumes correctly when foregrounded

#### Dependencies

- Phase 2 complete (playable game with AI)
- Staging backend accessible for Expert AI integration testing

#### Risks

| Risk | Probability | Mitigation |
|------|-------------|------------|
| Move animation rewrite takes longer than estimated | High | Build single-step animation first (2 days). Then multi-capture sequencing (5 days). Victory animation deferred to Phase 4. |
| Learning mode data port is tedious (30+ steps with custom board states) | Medium | Extract step data into a JSON or Dart data file. Port logic and data separately. Automate data conversion from TypeScript. |
| App lifecycle state save/restore has edge cases | Medium | Test with: iOS app killed by OS, Android low-memory kill, rapid background/foreground cycling. Use Sentry to capture lifecycle-related crashes in beta. |
| Clock drift during app background/foreground | Low | Record wall-clock time (`DateTime.now()`) on pause. On resume, compute elapsed real time and adjust clock state. |

#### Effort Estimate

| Resource | Weeks |
|----------|-------|
| Flutter Developer A (animations, clock, app lifecycle) | 6 |
| Flutter Developer B (setup dialog, persistence, learning mode) | 6 |
| Backend Developer (Expert AI integration testing support) | 0.5 |

---

### 4.4 Phase 4: Profile & Polish

**Duration:** 3–4 weeks
**Goal:** Full feature parity with the current web app. Visual polish, platform-specific refinements, every item on the feature parity checklist complete.

#### Deliverables

| # | Deliverable | Description | Effort |
|---|-------------|-------------|--------|
| 4.1 | **Login / Register screens** | Email/password forms with validation. Loading states, error handling. Registration: username + email + password. Post-auth navigation to previous route or home. | 2 days |
| 4.2 | **Profile screen** | Profile header (name, avatar, rating). `StatsOverview` widget: games/wins/losses/draws cards, win rate stacked `LinearProgressIndicator`, streaks. `AvatarSelector` dialog (12 emoji avatars). Display name inline edit with PATCH API. | 3 days |
| 4.3 | **Rating chart** | Glicko-2 rating line chart with confidence band using `fl_chart` (not CustomPainter — per DevLead recommendation, 3 days vs 2 weeks). Touch tooltip for data points. Responsive via `LayoutBuilder`. | 3 days |
| 4.4 | **Game history** | Paginated `ListView.builder` with `ScrollController` for infinite scroll. Filter chips: result (Won/Lost/Draw), difficulty, mode. Each game row links to replay viewer. `GET /api/player/{userId}/games` with query params. | 3 days |
| 4.5 | **Replay viewer** | Board widget + `MoveAnimationController` reuse. Playback controls (⏮ ◀ ▶ ⏭). Clickable move list for jump-to-position. Game info sidebar (players, result, date). | 3 days |
| 4.6 | **Settings panel** | Board theme selector (4 chips), show notation toggle (`SwitchListTile`), show legal moves toggle, animation speed selector (4 segments). Settings persist to `SharedPreferences` and sync to backend for registered users. | 1 day |
| 4.7 | **Victory animation** | `CustomPainter` + `Ticker` physics simulation: bouncing piece cascade with gravity, bounce, trail effects. 8-second duration with fade-out at 6s. Dismissible on tap. Simplified version acceptable for launch — full fidelity can iterate post-launch. | 3 days |
| 4.8 | **Offline detection** | `connectivity_plus` listener. Non-intrusive `MaterialBanner` when offline. Expert AI fallback logic (already in Phase 3, verify integration). | 1 day |
| 4.9 | **Haptic feedback** | `HapticFeedback.mediumImpact()` on piece placement. `HapticFeedback.heavyImpact()` on capture. Vibration pattern on game end. iOS and Android only. | 0.5 day |
| 4.10 | **App icons & splash screen** | `flutter_launcher_icons` for platform-specific app icons (1024×1024 source). `flutter_native_splash` for launch screen with app logo on theme-appropriate background. | 0.5 day |
| 4.11 | **Dark mode polish** | Verify all screens render correctly in dark mode. Ensure 4.5:1 contrast ratios (WCAG AA) on all text elements. Test with system dark mode toggle. | 1 day |

#### Acceptance Criteria

- [ ] Feature parity checklist (PRD §6.3) — **100% complete**
- [ ] All profile data loads and displays correctly
- [ ] Avatar selection persists to backend via PATCH
- [ ] Rating chart renders with confidence band; touch tooltip functional
- [ ] Game history paginates correctly with working filters
- [ ] Replay viewer replays all completed games with animations
- [ ] All 4 settings take effect immediately without restart
- [ ] Victory animation plays at 60fps; dismissible on tap
- [ ] Haptics fire on piece placement and captures (verified on physical iOS + Android devices)
- [ ] Offline banner appears within 3 seconds of network loss
- [ ] All screens pass WCAG AA contrast requirements in both light and dark modes

#### Dependencies

- Phase 3 complete (feature-complete gameplay)
- Backend auth flow working for all profile/history/settings endpoints

#### Risks

| Risk | Probability | Mitigation |
|------|-------------|------------|
| `fl_chart` doesn't support confidence band | Low | Overlay a custom `CustomPainter` for the band on the chart widget. `fl_chart` supports `BetweenBarsData` which renders filled areas between two lines. |
| Victory animation fidelity gap vs. web version | Medium | Accept 80% fidelity for launch. Document visual differences. Iterate post-launch based on user feedback. |
| Profile API calls fail intermittently | Low | Add retry logic to `dio` interceptor (exponential backoff). Cache last successful profile response. |

#### Effort Estimate

| Resource | Weeks |
|----------|-------|
| Flutter Developer A (profile, chart, history, replay) | 3.5 |
| Flutter Developer B (settings, victory animation, haptics, polish) | 3 |

---

### 4.5 Phase 5: Release

**Duration:** 4–5 weeks
**Goal:** Production-ready quality. Complete test suite. Performance optimized. App store submission and approval.

#### Deliverables

| # | Deliverable | Description | Effort |
|---|-------------|-------------|--------|
| 5.1 | **Dart engine unit tests** | Verify 190+ tests pass with ≥85% coverage. Run `flutter test --coverage` on engine package. Fix any gaps found by coverage analysis. | 1 day (mostly done in Phase 1) |
| 5.2 | **State management tests** | Unit tests for 8 Riverpod units (6 core providers + `learningModeProvider` + `gameOrchestrationProvider`). Test every phase transition, every action, every error path. Use `ProviderContainer` overrides for isolation. Target: 60+ tests. | 4 days |
| 5.3 | **Widget tests** | Test all screens and components. `find.byType`, `find.text`, `tester.tap`, `tester.drag`. Golden tests for board rendering: 4 themes × 2 orientations × 2 modes (light/dark) = 16 board goldens minimum. Piece rendering goldens. Clock widget states. Target: 170+ tests. Coverage: ≥50% statements, ≥40% branches. | 6 days |
| 5.4 | **Integration tests** | Full user journeys using `integration_test` package: game setup → play → win/lose/draw, login → profile → settings, learning mode completion, replay viewer, offline gameplay. Run on real devices/emulators. Target: 45+ scenarios matching current E2E suite. | 5 days |
| 5.5 | **Accessibility audit** | VoiceOver (iOS) and TalkBack (Android) testing on physical devices. Verify all interactive elements have `Semantics` labels. Board squares: `"Square 23, White king"`. Minimum 48×48dp touch targets. Text scaling up to 2× without layout breakage. Focus order for dialogs and controls. | 3 days |
| 5.6 | **Performance profiling** | Flutter DevTools profiling on target devices (iPhone 12, Pixel 6, iPad Air). Verify: cold start < 2s, warm start < 500ms, 60fps during animations, board render < 16ms, memory < 150 MB, binary < 30 MB (iOS) / < 20 MB (Android). Fix any regressions. | 3 days |
| 5.7 | **App store assets** | iOS: screenshots at 6.7", 5.5", iPad resolutions. App description, keywords, privacy policy URL, age rating (4+), Privacy Nutrition Labels. Android: screenshots at phone + 7" + 10" tablet. Feature graphic (1024×500). Short/full description, data safety declaration. | 2 days |
| 5.8 | **Beta testing** | TestFlight (iOS, up to 10,000 external testers) + Google Play internal testing track. Minimum 2-week beta period. Track crash-free rate (target ≥99.5%). Fix all P0 bugs; document P1 bugs. | 2 weeks |
| 5.9 | **App store submission** | Submit to App Store (allow 1–3 days for review) and Google Play (allow 1–7 days for review). Provide test account credentials for reviewers. No copyrighted assets in screenshots. | 1 day + wait |
| 5.10 | **Post-launch monitoring** | Monitor Crashlytics for crash spikes. Monitor app store reviews. Hotfix pipeline ready (Fastlane `ios release` / `android release`). | Ongoing |

#### Acceptance Criteria

- [ ] Dart engine: 190+ tests, ≥85% coverage
- [ ] State management: 60+ tests, all phase transitions covered
- [ ] Widget tests: 170+ tests, ≥50% statement coverage, ≥40% branch coverage
- [ ] Integration tests: 45+ scenarios, all passing on iOS simulator + Android emulator
- [ ] Full game playable via VoiceOver (iOS) and TalkBack (Android)
- [ ] All touch targets ≥ 48×48dp
- [ ] Cold start < 2s on iPhone 12 and Pixel 6
- [ ] 60fps sustained during gameplay animations
- [ ] Memory peak < 150 MB during active gameplay
- [ ] Binary size < 30 MB (iOS), < 20 MB (Android, per ABI)
- [ ] Crash-free rate ≥99.5% during beta
- [ ] Zero P0 bugs at submission time
- [ ] App approved on both App Store and Google Play

#### Dependencies

- Phase 4 complete (feature parity)
- Apple Developer and Google Play accounts with production access
- Privacy policy page hosted at a public URL
- Physical iOS and Android test devices available

#### Risks

| Risk | Probability | Mitigation |
|------|-------------|------------|
| App Store review rejection | Medium | Submit early beta builds to surface issues. Common rejection reasons: crash on specific device, missing privacy policy, test account not working. Provide detailed review notes. |
| Golden tests fail on CI (different rendering than local) | Medium | Pin CI environment: use Linux as the baseline runner with a pinned Flutter version. Run goldens in the same Linux image locally and in CI for determinism. Update goldens when themes change. |
| Code signing issues (first-time setup) | High | Budget 2 days for iOS Provisioning Profile + Certificate troubleshooting. Use Fastlane `match` for certificate management. Document the signing process. |
| Beta testers find major workflow bugs | Medium | Prioritize 2-week beta; fix P0 bugs immediately; delay launch if crash-free rate < 99%. |

#### Effort Estimate

| Resource | Weeks |
|----------|-------|
| Flutter Developer A (widget tests, integration tests, perf profiling) | 4 |
| Flutter Developer B (golden tests, a11y audit, app store assets) | 3.5 |
| QA Engineer (beta coordination, manual testing, a11y audit support) | 3 |

---

### 4.6 Timeline Summary

| Phase | Duration | Cumulative | Key Milestone |
|-------|----------|------------|---------------|
| **Phase 0: Prerequisites** | 3–4 weeks | Week 4 | Backend hardened, accounts active, ADRs ratified |
| **Phase 1: Foundation** | 5–6 weeks | Week 10 | Dart engine validated (190+ tests), app skeleton running |
| **Phase 2: Core Gameplay** | 5–6 weeks | Week 16 | First playable game, internal TestFlight build |
| **Phase 3: Full Experience** | 6–7 weeks | Week 23 | Feature-complete gameplay |
| **Phase 4: Profile & Polish** | 3–4 weeks | Week 27 | Feature parity with web app |
| **Phase 5: Release** | 4–5 weeks | Week 32 | App store launch |

| Scenario | Total Duration |
|----------|---------------|
| **Optimistic** | 26 weeks (6.5 months) |
| **Expected** | 30 weeks (7.5 months) |
| **Conservative** | 34 weeks (8.5 months) |

These estimates align with the DevLead's revised assessment (+4 weeks over PRD estimates) plus Phase 0 overhead.

---

## 5. Risk Matrix

| # | Risk | Probability | Impact | Mitigation | Owner |
|---|------|-------------|--------|------------|-------|
| 1 | **Engine port introduces FMJD rule bugs** | Medium | Critical | Port tests first. Cross-validate 10,000+ positions with TypeScript engine. Bit-for-bit move generation comparison. | Engine Dev |
| 2 | **Backend auth changes break existing web app** | Low | Critical | Dual auth support (Bearer + fallback). Deploy backend first, verify web app, then launch mobile. Feature-flag new auth behavior. | Backend Lead |
| 3 | **Game store decomposition causes subtle state bugs** | Medium | High | Design provider graph upfront. Write state transition tests before UI. Test every edge case: undo during AI thinking, pause during animation, resign during Expert API call. | Architect |
| 4 | **Move animation rewrite exceeds estimate** | High | High | Build incrementally: single-step first, then multi-capture. Accept simplified animation for launch (no captured piece fade) and iterate post-launch. | Flutter Dev A |
| 5 | **iOS code signing / provisioning profile issues** | High | Medium | Budget 2 days for signing troubleshooting. Use Fastlane `match` for certificate management. Document every step. Pair with developer who has iOS release experience. | DevOps |
| 6 | **App Store review rejection** | Medium | Medium | Submit beta early via TestFlight. Provide test account. Ensure guest mode works (Apple §4.2.2). No third-party auth required to use the app. Clear privacy policy. | Product |
| 7 | **Board rotation bug at Expert AI boundary** | Medium | High | Isolate `rotateSquare` into dedicated utility. Round-trip integration test: send position → get AI move → apply to board → verify correctness. Test with 100+ positions. | Engine Dev |
| 8 | **TT buffer lost on Isolate error** | Low | Medium | Wrap computation in try/catch inside isolate. Only platform crashes lose the buffer. Fresh TT warms up in 2–3 moves. Monitor via Crashlytics. | Flutter Dev B |
| 9 | **Flutter performance issues on low-end Android** | Medium | Medium | Profile early on Pixel 4a / Samsung A34. Use `RepaintBoundary` to isolate board from other widgets. Avoid rebuilding board on every clock tick. | Flutter Dev A |
| 10 | **Clock drift when app is backgrounded (iOS)** | Medium | Medium | Record wall-clock time on `didChangeAppLifecycleState(paused)`. Recalculate elapsed time on `resumed`. Test with varying background durations. | Flutter Dev B |
| 11 | **Learning mode 838-line port is error-prone** | Medium | Medium | Extract tutorial step data into a separate Dart data file. Port step validation functions independently and test each. | Flutter Dev B |
| 12 | **macOS CI runner costs exceed budget** | Low | Low | Path filters to skip iOS job on non-code changes. ~$50–65/month at 10 PRs/week. Consider self-hosted Mac mini if costs rise. | DevOps |
| 13 | **Android keystore loss** | Low | Critical | Generate keystore immediately. Store encrypted backup in secure vault. Document in team password manager. Losing the keystore = app can never be updated. | Tech Lead |
| 14 | **Refresh token implementation has edge cases (concurrent refresh, token family revocation)** | Medium | Medium | 10-second grace period for old refresh tokens (handles network retries). Integration test for concurrent refresh requests. | Backend Lead |
| 15 | **`fl_chart` package doesn't meet visual requirements** | Low | Low | Fallback: render confidence band as a `CustomPainter` overlay on the chart. `fl_chart` supports `BetweenBarsData` for filled areas. | Flutter Dev A |
| 16 | **Feature drift between web and mobile post-launch** | Medium | Medium | Maintain shared feature parity checklist. Web features implemented within 2 sprints of mobile launch and vice versa. | Product |
| 17 | **Beta testers find critical workflow bugs** | Medium | High | 2-week beta minimum. Prioritize P0 bug fixes. Delay launch if crash-free rate < 99%. Daily monitoring of Crashlytics during beta. | QA Lead |

---

## 6. Quality Gates

### 6.1 Phase Gate: Foundation → Core Gameplay

| Gate | Criterion | Tool |
|------|-----------|------|
| Engine accuracy | All 190+ Dart engine tests pass | `flutter test` in CI |
| Cross-validation | 10,000+ positions: move generation = exact match (zero discrepancies); evaluation scores = divergence ≤ ε < 0.001; best move = same move selected OR same evaluation score | Custom cross-validation script |
| Engine coverage | ≥85% statements, branches, functions, lines | `flutter test --coverage` + `lcov` |
| Static analysis | `flutter analyze --fatal-infos` = 0 issues | CI job |
| Builds compile | iOS (`--no-codesign`) and Android (`--debug`) | CI jobs on macOS and Linux |
| Auth flow | Login → API call → token refresh → works end-to-end | Manual + integration test |
| CI/CD | All 3 CI jobs pass; Fastlane `beta` lane runs without signing errors | CI pipeline |

### 6.2 Phase Gate: Core Gameplay → Full Experience

| Gate | Criterion | Tool |
|------|-----------|------|
| Full game playable | Win/lose/draw all reachable against Hard AI | Manual test on physical device |
| AI performance | Easy < 500ms, Medium < 1s, Hard < 2s | Flutter DevTools timeline |
| AI correctness | AI never makes illegal move (fuzz test 1,000 games) | Automated test script |
| Zero jank | No dropped frames during AI computation | Flutter DevTools performance overlay |
| Drag-and-drop | Works on 3+ physical devices (iOS + Android) | Manual test |
| State tests | 40+ provider tests, all phase transitions covered | `flutter test` |
| Internal TestFlight | Build installable and playable by team | TestFlight |

### 6.3 Phase Gate: Full Experience → Profile & Polish

| Gate | Criterion | Tool |
|------|-----------|------|
| Animation fidelity | Single and multi-capture animations play correctly | Golden tests + manual verification |
| Clock accuracy | ± 10ms accuracy over 5 minutes; pauses on app background | Timer accuracy test + lifecycle test |
| Expert AI | Correct moves returned; fallback works on airplane mode | Integration test against staging |
| Persistence | Game survives app kill and restart; resume prompt works | Manual test (force-kill app) |
| Learning mode | All 30+ steps completable | Automated integration test |
| App lifecycle | Clock/game saved on background; restored on foreground | Lifecycle test on physical devices |

### 6.4 Phase Gate: Profile & Polish → Release

| Gate | Criterion | Tool |
|------|-----------|------|
| **Feature parity** | 100% of PRD §6.3 checklist items complete | Manual checklist review |
| Profile complete | All profile data loads; avatar/name editable | Manual + widget tests |
| Rating chart | Renders with confidence band; touch tooltip works | Golden test + manual |
| All settings | Take effect immediately; persist across restarts | Integration test |
| Dark mode | All screens correct; 4.5:1 contrast (WCAG AA) | Accessibility scanner + manual |

### 6.5 Release Gate

| Gate | Criterion | Tool |
|------|-----------|------|
| **Engine tests** | 190+ tests, ≥85% coverage | CI |
| **Widget tests** | 170+ tests, ≥50% statements, ≥40% branches | CI |
| **Integration tests** | 45+ scenarios passing | CI / device farm |
| **Performance** | Cold start < 2s, 60fps, memory < 150 MB, binary < 30 MB / 20 MB | Flutter DevTools + Xcode Instruments |
| **Accessibility** | VoiceOver + TalkBack full game playable; 48dp targets; 2× text scaling | Manual audit |
| **Crash-free rate** | ≥99.5% during 2-week beta | Crashlytics dashboard |
| **P0 bugs** | Zero open P0 bugs | Issue tracker |
| **Security** | All auth endpoints require valid JWT; refresh flow works; tokens in secure storage | Penetration test checklist |
| **App store** | Screenshots, descriptions, privacy policy, test accounts ready | Submission checklist |

---

## 7. Rollback Strategy

### 7.1 The Web App Is the Safety Net

The existing Next.js web app continues to serve all current users throughout the migration. If the Flutter migration fails, stalls, or ships with critical issues:

- **Web users are unaffected.** They never interact with Flutter code.
- **Mobile users can fall back to the web app** via browser (the URL continues to work).
- **Backend changes are backward-compatible.** The auth overhaul adds Bearer token support alongside the existing pattern. If the web client update is rolled back, the dual auth support still works.

### 7.2 Point of No Return

The **true point of no return** is **app store publication** (Phase 5, Week 30–32). Before that:

| Phase | Rollback Cost |
|-------|---------------|
| Phase 0 (backend hardening) | Zero — backend changes benefit the web app too. Keep them regardless. |
| Phase 1 (foundation) | Low — Dart engine package and Flutter scaffold are sunk cost but don't affect production. |
| Phase 2 (core gameplay) | Low — internal builds only. No external users affected. |
| Phase 3 (full experience) | Low — internal builds only. Weekly TestFlight builds can be abandoned. |
| Phase 4 (polish) | Low — still pre-release. No public users. |
| Phase 5 (beta + release) | **Medium** — beta testers on TestFlight and Play Store internal track. Abandoning here means communicating with beta testers. |
| Post-launch | **High** — app store presence established. Users have installed the app. Removing the app requires explicit delisting and user communication. |

### 7.3 Backend Rollback Plan

All backend changes (Phase 0) are designed to be additive:

- JWT middleware: new middleware added; existing behavior preserved via dual auth
- Refresh tokens: new endpoint and table; existing endpoints unchanged
- Rate limiting: new middleware; no changes to endpoint logic
- App-config: new endpoint; no existing code modified
- CORS: expanded, not restricted

If any backend change causes issues, it can be rolled back independently by removing the specific middleware/endpoint configuration. EF Core migrations can be reverted with `dotnet ef database update <previous-migration>`.

### 7.4 If Flutter Ships but Has Critical Issues

1. **Immediate:** Push `maintenanceMode: true` on the app-config endpoint to block the mobile app gracefully.
2. **Short-term:** Publish a hotfix via Fastlane `ios release` / `android release`. TestFlight internal builds for iOS can be deployed in < 1 hour; Play Store internal track in < 2 hours. Production promotion depends on store review times (1–3 days for iOS, typically same-day for Android).
3. **Last resort:** Update `minimumVersion` in app-config to force users to a working version. If no working version exists, set `maintenanceMode: true` and direct users to the web app via the maintenance message.

---

## 8. Success Metrics

### 8.1 Feature Parity

| Metric | Target | Measurement |
|--------|--------|-------------|
| PRD §6.3 checklist completion | 100% (52 items) | Manual review at Phase 4 gate |
| FMJD rule compliance | 100% | Dart engine test suite (190+ tests) |
| Dart engine test parity | All 190+ tests passing | CI |
| Behavioral equivalence | All existing user flows reproducible | Integration test suite (45+ scenarios) |

### 8.2 Performance Targets

| Metric | iOS (iPhone 12+) | Android (Pixel 6+) |
|--------|-------------------|---------------------|
| Cold start | < 2 seconds | < 2 seconds |
| Warm start | < 500ms | < 500ms |
| Gameplay frame rate | 60fps sustained | 60fps sustained |
| Board render (single frame) | < 16ms | < 16ms |
| AI response (Easy) | < 500ms | < 500ms |
| AI response (Medium) | < 1 second | < 1 second |
| AI response (Hard) | < 2 seconds | < 2 seconds |
| Expert AI round-trip | < 5 seconds | < 5 seconds |
| Memory peak | < 150 MB | < 150 MB |
| Binary size | < 30 MB | < 20 MB (per ABI) |
| Clock accuracy | ± 10ms | ± 10ms |

### 8.3 Quality Targets

| Metric | Target |
|--------|--------|
| Dart engine coverage | ≥85% (statements, branches, functions, lines) |
| Flutter widget test coverage | ≥50% statements, ≥40% branches |
| Integration test coverage | 45+ scenarios (matching E2E suite) |
| Crash-free rate | ≥99.5% (Crashlytics) |
| ANR rate (Android) | < 0.5% |
| App Store rating | ≥4.0 after 100+ reviews |

### 8.4 App Store Approval

| Platform | Requirements |
|----------|-------------|
| iOS App Store | Review guidelines compliance. Privacy Nutrition Labels complete. Screenshots at 6.7", 5.5", iPad. Age rating 4+ (no gambling, violence). Guest mode works without auth (Apple §4.2.2). Privacy policy URL live. |
| Google Play | Content rating (Everyone). Screenshots at phone + 7" + 10" tablet. Feature graphic. Data safety declaration. Privacy policy URL. No deceptive listings. |

### 8.5 User Engagement (Post-Launch, 90-Day Window)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Total installs | 1,000+ across iOS + Android | App store analytics |
| Day-1 retention | ≥40% | Firebase Analytics or equivalent |
| Day-7 retention | ≥20% | Firebase Analytics |
| Games completed per session | ≥1.0 | Custom analytics event |
| Expert AI usage rate | ≥10% of games | API logs |
| Registered user rate | ≥15% of active users | Backend user table |

---

## 9. Team & Skills

### 9.1 Recommended Team Composition

| Role | Count | Key Skills | Phase Involvement |
|------|-------|------------|-------------------|
| **Senior Flutter Developer** | 1 | Dart, Riverpod, CustomPainter, animation system, iOS/Android deployment, Isolate API | All phases (lead) |
| **Flutter Developer** | 1 | Dart, widget development, state management, testing, `dio`/networking | All phases |
| **Senior Backend Developer** | 1 (part-time) | ASP.NET Core, JWT/auth, EF Core migrations, API security | Phase 0 (full-time), Phases 1–5 (support) |
| **QA Engineer** | 1 (part-time → full-time in Phase 5) | Mobile testing (iOS + Android), accessibility testing, VoiceOver/TalkBack | Phase 2 onward |
| **Product/Design** | 1 (part-time) | App store assets, UI polish decisions, feature prioritization | Phases 0, 4, 5 |

**Total:** 3 full-time equivalent during peak phases (2–3), tapering to 2.5 FTE in Phase 4 and rising again in Phase 5 with QA focus.

### 9.2 Critical Skills Required

| Skill | Why Critical | Who |
|-------|-------------|-----|
| **Dart sealed classes + pattern matching** | Union type porting (Move, GamePhase, DrawReason) touches every file in the engine | Senior Flutter Dev |
| **Flutter `Isolate.run()` + `TransferableTypedData`** | TT buffer transfer is the core AI performance mechanism (ADR-011) | Senior Flutter Dev |
| **Riverpod provider architecture** | Game store decomposition into 6 inter-dependent providers is the #1 architecture risk | Senior Flutter Dev |
| **`CustomPainter` + `AnimationController`** | Board rendering, move animation system, victory animation | Either Flutter Dev |
| **ASP.NET Core JWT Bearer auth** | JWT validation middleware, refresh token rotation, claim-based authorization | Senior Backend Dev |
| **iOS code signing + Fastlane** | Provisioning profiles, certificates, TestFlight, App Store submission | Senior Flutter Dev or DevOps |
| **Android keystore + Play Store upload** | Release signing, AAB format, Play Console | Senior Flutter Dev or DevOps |
| **Accessibility (VoiceOver / TalkBack)** | WCAG AA compliance, `Semantics` widget usage, screen reader testing | QA Engineer |

### 9.3 Ramp-Up Plan

| Developer | Background | Ramp-Up Needed | Time |
|-----------|-----------|----------------|------|
| Coming from React/TypeScript | Knows the domain and game logic | Dart language, Flutter widget system, Riverpod, go_router | 1–2 weeks |
| Coming from Flutter (no domain knowledge) | Knows the technology | FMJD rules, game engine architecture, backend API surface | 1 week |
| Backend developer (for auth overhaul) | Knows ASP.NET Core | JWT bearer middleware, refresh token patterns | 2–3 days |

---

## 10. Modernization Opportunities

The migration is a greenfield opportunity to adopt patterns and practices that can't easily be retrofitted into the existing codebase.

### 10.1 Result Types for Error Handling

Replace exception-based error handling with typed `Result` types for predictable error flows:

```dart
sealed class Result<T> {
  const Result();
}

final class Success<T> extends Result<T> {
  final T value;
  const Success(this.value);
}

final class Failure<T> extends Result<T> {
  final AppError error;
  const Failure(this.error);
}

// Usage in API client:
Future<Result<PlayerProfile>> getProfile(String userId) async {
  try {
    final response = await _dio.get('/api/player/$userId/profile');
    return Success(PlayerProfile.fromJson(response.data));
  } on DioException catch (e) {
    return Failure(AppError.fromDio(e));
  }
}

// Exhaustive handling in UI:
switch (result) {
  case Success(:final value):
    return ProfileScreen(profile: value);
  case Failure(:final error):
    return ErrorScreen(message: error.userMessage);
}
```

This eliminates uncaught exception crashes and makes error handling visible at every call site.

### 10.2 Clean Architecture with Dependency Injection

Structure the Flutter app with clear architectural layers and dependency injection from day one:

```
lib/
├── core/              # Cross-cutting: theme, errors, DI, routing
│   ├── di/            # Riverpod provider declarations
│   ├── errors/        # Result type, AppError, error mapping
│   ├── routing/       # go_router configuration
│   └── theme/         # ThemeData, BoardTheme, design tokens
├── features/          # Feature modules (each self-contained)
│   ├── auth/
│   │   ├── data/      # AuthRepository, SecureTokenStorage
│   │   ├── domain/    # AuthState, User entity
│   │   └── presentation/  # LoginScreen, RegisterScreen, AuthProvider
│   ├── game/
│   │   ├── data/      # GamePersistenceRepository, AiService
│   │   ├── domain/    # GamePhase, MoveRecord, GameConfig
│   │   └── presentation/  # GameScreen, Board, GameControls, providers
│   ├── profile/
│   │   ├── data/      # ProfileRepository
│   │   ├── domain/    # PlayerProfile, PlayerStats
│   │   └── presentation/  # ProfileScreen, StatsOverview, RatingChart
│   ├── learning/
│   │   ├── data/      # TutorialStepData
│   │   ├── domain/    # LearningState, step validation
│   │   └── presentation/  # LearningScreen, providers
│   ├── settings/
│   │   ├── data/      # SettingsRepository (SharedPreferences + backend sync)
│   │   └── presentation/  # SettingsPanel, SettingsProvider
│   └── replay/
│       └── presentation/  # ReplayViewer, playback controls
└── shared/            # Shared widgets, utilities used across features
    ├── widgets/       # Common buttons, dialogs, loading indicators
    └── utils/         # Date formatting, validators, constants
```

Each feature module is self-contained with its own data, domain, and presentation layers. Inter-feature communication happens through Riverpod providers, not direct imports.

### 10.3 Golden Tests from Day One

Establish visual regression testing infrastructure in Phase 1, not as an afterthought in Phase 5:

- **Board goldens:** 4 themes × 2 orientations × 2 states (empty, mid-game) = 16 baseline images
- **Piece goldens:** Man and King for both colors = 4 images
- **UI goldens:** Clock (active, low-time), settings panel, game setup dialog = 8+ images
- **CI:** Run golden tests on a pinned Linux runner/image with a fixed Flutter version for deterministic rendering

Golden tests catch visual regressions that widget tests miss (e.g., a `CustomPainter` drawing pieces slightly off-center).

### 10.4 Analytics from Day One

Integrate analytics events from Phase 2 onward (not post-launch retrofitted):

```dart
// Core events to track from launch:
analytics.logEvent('game_started', {
  'opponent': 'ai',
  'difficulty': 'hard',
  'timed': true,
  'preset': 'rapid_15_10',
});
analytics.logEvent('game_completed', {
  'result': 'win',
  'moves': 42,
  'duration_seconds': 1200,
});
analytics.logEvent('expert_ai_fallback', {'reason': 'network_error'});
analytics.logEvent('tutorial_step_completed', {'step': 12});
```

Firebase Analytics (free tier: 500 event types, 25 parameters) is sufficient. Analytics answer critical post-launch questions: Which difficulty is most popular? How many users complete the tutorial? What's the Expert AI fallback rate?

### 10.5 Dependency Injection for Testability

Use Riverpod's override mechanism systemically for testing, not as an afterthought:

```dart
// Production: real implementations
final aiServiceProvider = Provider<AiService>((ref) => AiService());
final apiClientProvider = Provider<Dio>((ref) => createDio(ref));

// Testing: mock everything
final container = ProviderContainer(overrides: [
  aiServiceProvider.overrideWithValue(MockAiService()),
  apiClientProvider.overrideWithValue(MockDio()),
]);
```

Every external dependency (network, storage, platform APIs) is behind a provider that can be overridden in tests. No test should depend on a real network, real storage, or real platform API.

### 10.6 Structured Logging

Use `package:logging` with structured fields for debuggability:

```dart
final _log = Logger('GameProvider');
_log.info('Game started', {
  'opponent': config.opponent,
  'difficulty': config.aiDifficulty,
  'timed': config.timedMode,
});
_log.warning('Expert AI fallback', {'reason': 'network_timeout', 'fallback': 'hard'});
```

In debug mode: print to console. In release mode: forward to Crashlytics as breadcrumbs. When a crash occurs, the last 50 log entries provide context for diagnosis.

### 10.7 Immutable State with Freezed

Use `freezed` code generation for immutable state classes with `copyWith`, `toJson`/`fromJson`, and equality:

```dart
@freezed
class InProgress with _$InProgress {
  const factory InProgress({
    required BoardPosition position,
    required PlayerColor currentTurn,
    required List<MoveRecord> moveHistory,
    required int moveIndex,
    int? selectedSquare,
    @Default([]) List<int> legalMoveSquares,
    @Default([]) List<int> lastMoveSquares,
    @Default(false) bool isPaused,
  }) = _InProgress;
  
  factory InProgress.fromJson(Map<String, dynamic> json) => _$InProgressFromJson(json);
}
```

`freezed` eliminates boilerplate `copyWith`, ensures deep equality, and integrates with `json_serializable` for persistence serialization.

---

## Appendix A: Phase 0 → Phase 5 Dependency Graph

```
Phase 0: Prerequisites ──────────────────────────────────────────────┐
  ├── Backend auth overhaul (ADR-012)                                │
  ├── App-config endpoint (ADR-014)                                  │
  ├── Rate limiting                                                  │
  ├── Apple/Google account setup                                     │
  ├── ADR ratification                                               │
  └── Dart style guide + provider graph design                       │
                                                                     │
Phase 1: Foundation ─────────────────────────────────────────────────┤
  ├── [Dev A] Dart engine port (1.1) + tests (1.2)                  │
  │       ↓                                                         │
  │   Engine validated (gate)                                        │
  │                                                                  │
  ├── [Dev B] App scaffold (1.3) + CI (1.4) + routing (1.5)         │
  │   + theme (1.6) + API client (1.7) + auth (1.8)                 │
  │   + version check (1.9) + crashlytics (1.10)                    │
  │       ↓                                                         │
  │   Auth flow working (gate)                                       │
                                                                     │
Phase 2: Core Gameplay ──────────────────────────────────────────────┤
  ├── [Dev A] Board (2.1) + pieces (2.2) + tap (2.3) + drag (2.4)  │
  ├── [Dev B] Game provider (2.5) + AI provider (2.6)               │
  │           + controls (2.7) + status (2.8) + history (2.9)       │
  │       ↓                                                         │
  │   First playable game (gate)                                     │
  │   Internal TestFlight build                                      │
                                                                     │
Phase 3: Full Experience ────────────────────────────────────────────┤
  ├── [Dev A] Animations (3.1) + clock (3.3) + lifecycle (3.8)      │
  ├── [Dev B] Setup dialog (3.2) + Expert AI (3.4)                  │
  │           + persistence (3.5) + learning (3.6) + pause (3.7)    │
  │       ↓                                                         │
  │   Feature-complete gameplay (gate)                               │
                                                                     │
Phase 4: Profile & Polish ──────────────────────────────────────────┤
  ├── [Dev A] Profile (4.2) + chart (4.3) + history (4.4)           │
  │           + replay (4.5)                                         │
  ├── [Dev B] Login (4.1) + settings (4.6) + victory (4.7)          │
  │           + offline (4.8) + haptics (4.9) + icons (4.10)        │
  │       ↓                                                         │
  │   Feature parity (gate) — 100% of PRD checklist                 │
                                                                     │
Phase 5: Release ────────────────────────────────────────────────────┘
  ├── [Dev A] Widget tests (5.3) + integration tests (5.4) + perf (5.6)
  ├── [Dev B] Golden tests (5.3b) + a11y (5.5) + store assets (5.7)
  ├── [QA] Beta coordination (5.8) + manual testing
  │       ↓
  │   App store submission (5.9) → Launch
```

## Appendix B: Technology Stack Summary

| Concern | Technology | Version |
|---------|-----------|---------|
| Framework | Flutter | 3.x (stable channel) |
| Language | Dart | 3.x |
| State Management | flutter_riverpod | ^2.x |
| Navigation | go_router | ^14.x |
| HTTP Client | dio | ^5.x |
| Secure Storage | flutter_secure_storage | ^9.x |
| Key-Value Storage | shared_preferences | ^2.x |
| Connectivity | connectivity_plus | ^6.x |
| Rating Chart | fl_chart | ^0.68.x |
| Crash Reporting | firebase_crashlytics | ^4.x |
| Analytics | firebase_analytics | ^11.x |
| Code Generation | freezed + json_serializable | latest |
| Testing | flutter_test (built-in) | SDK |
| Integration Testing | integration_test (built-in) | SDK |
| Golden Testing | golden_toolkit | ^0.15.x |
| CI/CD | GitHub Actions + Fastlane | latest |
| iOS Signing | Fastlane match | latest |
| iOS Distribution | TestFlight → App Store | — |
| Android Distribution | Play Console internal → production | — |
| Minimum iOS | 16.0 | — |
| Minimum Android SDK | 23 (Android 6.0) | — |

## Appendix C: Key File References

| Document | Purpose |
|----------|---------|
| [flutter-migration-analysis.md](flutter-migration-analysis.md) | Complete technical inventory of current Next.js frontend |
| [flutter-migration-prd.md](flutter-migration-prd.md) | Product requirements for Flutter migration |
| [flutter-migration-prd-review.md](flutter-migration-prd-review.md) | DevLead review identifying gaps and revised estimates |
| [ADR-009](../adr/adr-009-flutter-state-management.md) | Riverpod with 8 decomposed units (6 core + learning + orchestration) |
| [ADR-010](../adr/adr-010-mobile-cicd-pipeline.md) | GitHub Actions + Fastlane CI/CD |
| [ADR-011](../adr/adr-011-flutter-isolate-strategy.md) | Isolate.run() + TransferableTypedData for AI |
| [ADR-012](../adr/adr-012-backend-auth-overhaul.md) | JWT validation + refresh tokens |
| [ADR-013](../adr/adr-013-flutter-web-strategy.md) | Keep Next.js for web |
| [ADR-014](../adr/adr-014-app-versioning-forced-updates.md) | Custom app-config endpoint |
| [ADR-015](../adr/adr-015-shared-engine-dart-package.md) | Single monorepo Dart package |
| [AGENTS.md](../../AGENTS.md) | Project standards and quality gates |
