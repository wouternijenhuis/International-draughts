# Flutter Migration PRD — Developer Lead Review

**Reviewer:** Developer Lead
**Date:** 2026-02-21
**PRD Version Reviewed:** 1.0 (Draft)
**Status:** Review Complete — Action Required Before Implementation

> **Note:** This is a point-in-time review of PRD v1.0. Final approved planning baselines are documented in `flutter-migration-strategy.md` and `flutter-implementation-plan.md` (timeline: 26–34 weeks, backend auth hardening: 2.5–3 weeks).

---

## Executive Summary

The Flutter Migration PRD is comprehensive and well-structured. It correctly identifies the major work areas, proposes a sensible phased approach, and flags several critical decisions. However, this review identifies **8 must-fix gaps**, **11 significant technical risks** the PRD underestimates, and **6 areas needing architect decisions (ADR candidates)**. These must be resolved before implementation begins to avoid costly mid-migration rework.

**Overall Assessment:** Technically sound foundation with critical gaps in authentication architecture, CI/CD planning, and Dart language-specific porting risks. Timeline estimates are optimistic by 3–5 weeks for the expected case.

---

## 1. Technical Feasibility Assessment

### 1.1 Dart Engine Port — Feasible with Caveats

**Verdict: Technically sound, but complexity is underestimated in two areas.**

| Module | PRD Assessment | Revised Assessment | Notes |
|--------|---------------|-------------------|-------|
| `types/` | Low | Low | Direct mapping. `Move = QuietMove \| CaptureMove` union requires **sealed class** in Dart (see §3.1). |
| `board/topology.ts` | Low | Low | Pure adjacency data. Trivial. |
| `engine/move-generator.ts` | High | **High** | Correct. Most critical module. 500 LoC of FMJD rules. |
| `engine/board-utils.ts` | Low | Low | Correct. |
| `ai/search.ts` | High | **Very High** | PRD underestimates. The search runs on an `Isolate`, but the `TranspositionTable` uses `ArrayBuffer`/`DataView` (see §3.3). Dart's `ByteData` is equivalent but the table **cannot be shared across Isolate boundaries** without explicit `TransferableTypedData`. This is a design constraint the PRD doesn't mention. |
| `ai/zobrist.ts` | Medium | **Low** | PRD flags BigInt as a concern, but the actual Zobrist implementation uses **32-bit unsigned integers** (not BigInt). Trivially portable. The BigInt usage is only in `game-state.ts` for position hashing (threefold repetition), which is separate from the AI transposition table. |
| `ai/transposition-table.ts` | Low | **Medium** | Uses `ArrayBuffer` + `DataView` with explicit byte offsets (16-byte aligned entries). Dart equivalent is `ByteData` on a `Uint8List`. Portable but requires care with endianness and the Isolate memory model. |
| `clock/clock.ts` | Low | Low | Correct. Pure functions. |
| `rating/glicko2.ts` | Medium | Medium | Correct. Math-heavy. Floating-point precision validation needed. |

**Key Risk the PRD Missed:** The transposition table is allocated as a contiguous `ArrayBuffer` (4 MB default). When the AI runs on a Dart `Isolate`, the TT must either:
- (a) Be created fresh per Isolate invocation (losing cached positions between moves — **performance regression**), or
- (b) Use `Isolate.exit()` to transfer the TT back and pass it in on the next invocation, or
- (c) Use `dart:ffi` for shared memory (complex, fragile).

This needs an **architecture decision** before Phase 1.

### 1.2 Board Rendering — Feasible

**Verdict: Sound. Two approaches, both viable.**

The PRD correctly identifies `CustomPainter` and `GridView`/`Stack` as options. Recommendation:

- Use `CustomPainter` for the board background (grid lines, square colors) — single draw call, excellent performance.
- Use `Stack` + `Positioned` for pieces — enables Flutter's built-in animation system (`AnimatedPositioned`, `Hero`), hit testing, and accessibility (`Semantics` per piece).
- This hybrid approach avoids the testing difficulty of pure `CustomPainter` (see §5.1).

### 1.3 Move Animations — Feasible but High Effort

**Verdict: Sound approach, but the 307-line `useMoveAnimation` hook is the single hardest UI port.**

The PRD correctly rates this as High difficulty. The current implementation uses:
- Position diffing to detect which piece moved
- A state machine for animation phases (idle → animating → waiting-for-next-leg → done)
- CSS `transform` + `transition` with `onTransitionEnd` callbacks for sequencing
- Captured piece "ghost" overlays with fade-out

In Flutter, this maps to chained `AnimationController`s. The tricky part is the **multi-capture sequencing** — a capture of 3 pieces requires 3 sequential slide animations with intermediate captured-piece removals. This needs a dedicated `MoveAnimationController` class (as the PRD suggests) with a clear finite state machine.

**Hidden Complexity:** The current implementation relies on DOM `onTransitionEnd` events to sequence steps. Flutter's `AnimationController` uses `addStatusListener` which is more reliable, but the sequencing logic must be rewritten from scratch — it can't be a mechanical port.

### 1.4 State Management — Feasible but Architecture-Critical

**Verdict: Riverpod is the right choice. BLoC is also viable. See §4 for deep dive.**

### 1.5 Victory Animation — Feasible

**Verdict: Sound. `CustomPainter` + `Ticker` is the correct approach.**

The 346-line canvas physics simulation (gravity, bounce, trail effects) maps directly. `Canvas` API in Dart is nearly identical to HTML Canvas. Lower priority for visual fidelity — can ship with a simplified version initially.

### 1.6 Rating Chart — Feasible with Package

**Verdict: Use `fl_chart`. Custom `CustomPainter` SVG port would take 2–3× longer.**

The current 269-line pure SVG chart with hover/touch tooltips and Glicko-2 confidence band is a significant rendering effort. `fl_chart` handles line charts with bands and tooltips out of the box. Port time drops from ~2 weeks to ~3 days.

### 1.7 Timeline Realism

| Phase | PRD Estimate | Revised Estimate | Delta | Rationale |
|-------|-------------|-----------------|-------|-----------|
| Phase 1: Foundation | 4–5 weeks | 5–6 weeks | +1 week | Transposition table Isolate design, sealed class patterns for unions, CI/CD pipeline setup (macOS runner for iOS) |
| Phase 2: Core Gameplay | 4–5 weeks | 5–6 weeks | +1 week | Game store port is underestimated; 1,087 LoC state machine needs major restructuring for Riverpod/BLoC |
| Phase 3: Full Experience | 5–6 weeks | 6–7 weeks | +1 week | Move animation rewrite (not port), learning mode 838 LoC extraction |
| Phase 4: Profile & Polish | 3–4 weeks | 3–4 weeks | — | Reasonable estimate |
| Phase 5: Testing & Launch | 3–4 weeks | 4–5 weeks | +1 week | App Store review cycles, code signing issues (first-time), golden test baseline creation |

**Revised Total:**

| Scenario | PRD | Revised |
|----------|-----|---------|
| Optimistic | 20 weeks | 23 weeks |
| Expected | 24 weeks | 28 weeks |
| Conservative | 28 weeks | 32 weeks |

The 4-week delta is primarily from: (1) CI/CD pipeline complexity for iOS/Android builds, (2) the Isolate memory management problem, and (3) first-time App Store submission friction.

---

## 2. Missing Technical Requirements

### 2.1 Authentication Architecture — CRITICAL GAP

**Severity: 🔴 Blocker**

The PRD correctly identifies the `credentials: 'include'` → `Authorization: Bearer` migration (§5.3) and the token refresh gap (§5.4). However, it understates the scope of backend changes required:

**Current State (verified from source):**
- The API client sends `credentials: 'include'` on every request (cookie-based auth pattern)
- However, the backend has **no `AddAuthentication()` / JWT bearer middleware** configured — `Program.cs` only calls `app.UseAuthorization()` without any authentication scheme
- The auth endpoints return a JWT token in the response body, but there's **no middleware validating that token on subsequent requests**
- The API endpoints (player, games, settings) have **no `[Authorize]` attributes** or equivalent guards

**Implication:** The backend currently has **no server-side authentication enforcement**. Any client can call `/api/player/{userId}/*` with any userId. Authentication is purely client-side honor system.

**Required Backend Changes (must happen before migration):**
1. Add `Microsoft.AspNetCore.Authentication.JwtBearer` NuGet package
2. Configure `AddAuthentication().AddJwtBearer()` in `Program.cs`
3. Add JWT validation middleware (issuer, audience, signing key, expiry)
4. Add `[Authorize]` or `.RequireAuthorization()` to protected endpoints
5. Extract userId from JWT claims instead of trusting the URL parameter
6. Implement `POST /api/auth/refresh` for token refresh
7. Implement refresh token storage (database table) and rotation logic
8. Support **both** cookie-based (for existing web app during transition) and Bearer token auth

**This is 2–3 weeks of backend work, not the "1 week" estimated in §12.5.**

### 2.2 CORS Configuration for Native Apps

**Severity: 🟡 Medium**

The PRD mentions CORS briefly (§5.3) but doesn't specify the implementation:

- Native iOS/Android apps don't send `Origin` headers → CORS doesn't apply
- But if the backend's CORS middleware **rejects requests without an Origin header**, native app requests will fail
- Current config uses `.AllowCredentials()` which requires specific origins (not `*`)
- **Fix:** Backend CORS must be configured to:
  - Continue allowing the web frontend origin
  - Not reject requests without an `Origin` header (native apps)
  - Alternatively, detect native app requests via a custom header (e.g., `X-Client-Platform: flutter-ios`)

### 2.3 API Rate Limiting — Missing

**Severity: 🟡 Medium**

The PRD doesn't mention rate limiting. Currently, web browser CORS and cookies provide implicit protection. Native apps remove this:

- The Expert AI endpoint (`POST /api/v1/ai/move`) is CPU-intensive. Without rate limiting, a malicious client could DDoS the AI engine.
- Authenticated endpoints need per-user rate limits.
- Unauthenticated endpoints (health check, login/register) need IP-based rate limits.

**Recommendation:** Add `AspNetCoreRateLimit` or .NET 8's built-in `RateLimiter` middleware before migration.

### 2.4 Deep Linking / URL Schemes — Partially Covered

**Severity: 🟢 Low (for launch)**

The PRD covers this in Q7 (§10) with a reasonable recommendation (basic deep linking in Phase 1, Universal Links in Phase 4). However, it should specify:

- **App scheme:** `intl-draughts://` (registered in `Info.plist` and `AndroidManifest.xml`)
- **Supported deep links:** `intl-draughts://play`, `intl-draughts://play?setup=true`, `intl-draughts://profile`, `intl-draughts://learn`
- **Universal Links:** Requires `/.well-known/apple-app-site-association` hosted on the backend domain and `/.well-known/assetlinks.json` for Android App Links
- `go_router` handles deep linking natively — good choice

### 2.5 Push Notifications — Not Covered

**Severity: 🟢 Low (post-migration)**

Not needed for feature parity, but the PRD should acknowledge this as a post-migration enhancement since it was listed as a motivation for the Flutter migration (§1.1: "Push notifications [...] unavailable or unreliable through a browser PWA"). Should be listed in §2.2 (Out of Scope) with rationale.

### 2.6 App Versioning & Forced Updates — Not Covered

**Severity: 🟡 Medium**

Critical for mobile apps but entirely missing from the PRD:

- **Semantic versioning:** `pubspec.yaml` version + build number strategy
- **Forced update mechanism:** Backend returns minimum required app version; client checks on launch and displays "update required" if below minimum
- **Endpoint needed:** `GET /api/v1/app-config` returning `{ minVersion, latestVersion, maintenanceMode }`
- **Firebase Remote Config** or a simple backend endpoint can serve this
- Without forced updates, you cannot deprecate old API versions or fix critical security issues in deployed apps

### 2.7 Crashlytics / Error Reporting — Partially Covered

**Severity: 🟡 Medium**

The PRD mentions this in Q10 (§10) and recommends Firebase Crashlytics. Good. But it should be a **non-functional requirement** (§4), not an open question. You cannot responsibly ship a mobile app without crash reporting. Minimum requirements:

- Crash-free rate tracking (target: ≥99.5% — correctly specified in §9.3)
- Dart error boundary (Flutter's `FlutterError.onError` + `PlatformDispatcher.instance.onError`)
- Network error logging (failed API calls, timeouts)
- ANR (Application Not Responding) detection on Android
- Source maps / debug symbols uploaded to Crashlytics for symbolicated stack traces

### 2.8 CI/CD for Mobile — CRITICAL GAP

**Severity: 🔴 Blocker**

The PRD mentions "GitHub Actions workflows for Flutter build, test, and deployment" (§2.1) and "CI/CD Flutter support" (§11.1) but provides **zero detail** on what is a notoriously complex topic:

**iOS Build Pipeline:**
- Requires a **macOS runner** (GitHub Actions `macos-latest` or self-hosted)
- macOS runners are **3–10× more expensive** than Linux runners ($0.08/min vs $0.008/min)
- Apple code signing requires:
  - Distribution certificate (`.p12`) stored as GitHub secret
  - Provisioning profile (`.mobileprovision`) stored as GitHub secret
  - Keychain management in CI (create temporary keychain, import cert, build, delete keychain)
  - Xcode version pinning (different Xcode → different Swift runtime)
- App Store submission via `xcrun altool` or Fastlane `deliver`
- TestFlight distribution for beta

**Android Build Pipeline:**
- Java/Gradle version management
- Keystore (`.jks`) file stored as GitHub secret
- `key.properties` generation in CI
- APK/AAB signing configuration
- Play Store upload via Fastlane `supply` or `gradle-play-publisher`

**Recommended CI Architecture:**
```
ci-flutter.yml (triggered on PR + push to main/develop):
  job-1 (Linux): flutter analyze + flutter test + dart engine tests
  job-2 (macOS): flutter build ios --no-codesign (verify iOS build compiles)
  job-3 (Linux): flutter build apk (verify Android build compiles)

deploy-flutter.yml (triggered manually or on tag):
  job-1 (macOS): flutter build ipa → sign → upload to TestFlight
  job-2 (Linux): flutter build appbundle → sign → upload to Play Console
```

**Recommendation:** Evaluate **Fastlane** vs **Codemagic** vs raw GitHub Actions. Fastlane is free but requires maintenance. Codemagic is purpose-built for Flutter CI/CD.

**This needs a dedicated ADR and at least 1 week of pipeline engineering.**

---

## 3. Shared Engine Port Risks

### 3.1 Union Types → Sealed Classes

**Risk: Medium | Impact: Pervasive**

TypeScript's `type Move = QuietMove | CaptureMove` with discriminated union (`type: 'quiet' | 'capture'`) is used extensively throughout the engine. Dart doesn't have union types. The port requires **sealed classes** (Dart 3.0+):

```dart
sealed class Move {
  const Move();
}

final class QuietMove extends Move {
  final int from;
  final int to;
  const QuietMove({required this.from, required this.to});
}

final class CaptureMove extends Move {
  final List<CaptureStep> steps;
  const CaptureMove({required this.steps});
}
```

Consumers use `switch` with exhaustive checking:
```dart
switch (move) {
  case QuietMove(:final from, :final to):
    // ...
  case CaptureMove(:final steps):
    // ...
}
```

This is a **good** mapping, but it touches every file that uses `Move`, `GamePhase`, `DrawReason`, etc. The PRD's module-level estimates don't account for the cascading changes. Sealed class patterns should be established in a **style guide** before porting begins.

### 3.2 `readonly` Arrays → Immutable Collections

**Risk: Low | Impact: Moderate**

TypeScript's `readonly Square[]` and `readonly CaptureStep[]` map to Dart's `UnmodifiableListView` or `List.unmodifiable()`. But performance characteristics differ:

- TypeScript `readonly` is compile-time only — zero runtime cost
- Dart `UnmodifiableListView` wraps the original list — minimal overhead but allocates a wrapper object
- For hot paths (move generation, evaluation), consider using plain `List` with documentation-enforced immutability to avoid the wrapper allocation
- `BoardPosition` (51-element array accessed millions of times during search) should be a plain `List<Piece?>` for performance

### 3.3 `ArrayBuffer`/`DataView` → `ByteData`/`Uint8List`

**Risk: Medium | Impact: Concentrated in TT**

The `TranspositionTable` uses `ArrayBuffer` (4 MB) with structured `DataView` reads/writes at specific byte offsets. Dart equivalent:

```dart
class TranspositionTable {
  late final ByteData _view;
  late final int numEntries;
  
  TranspositionTable({int sizeMb = 4}) {
    final sizeBytes = sizeMb * 1024 * 1024;
    numEntries = sizeBytes ~/ _entrySize;
    _view = ByteData(numEntries * _entrySize);
  }
  
  TtEntry? probe(int hash) {
    final index = (hash & 0xFFFFFFFF) % numEntries;
    final offset = index * _entrySize;
    final storedHash = _view.getUint32(offset, Endian.little);
    if (storedHash != (hash & 0xFFFFFFFF)) return null;
    // ...
  }
}
```

This is a clean mapping. The key concern is **Isolate transfer** — when the AI runs on a background Isolate, the TT's `Uint8List` backing must be transferred (not copied) using `TransferableTypedData` to avoid 4 MB copies per move. This is doable but the PRD doesn't address it.

### 3.4 BigInt for Position Hashing (Threefold Repetition)

**Risk: Low | Impact: Isolated**

The PRD flags BigInt as a concern for Zobrist hashing, but this is a **non-issue** for two reasons:

1. **Zobrist hashing** (used in AI search TT) uses **32-bit unsigned integers** — no BigInt. The `zobrist.ts` file explicitly comments: "Uses 32-bit hashes for browser performance (avoids BigInt overhead)."

2. **Position hashing** for threefold repetition (in `game-state.ts`) uses BigInt for a polynomial hash. Dart has native `BigInt` support with identical semantics. Direct port:

```dart
BigInt hash = BigInt.from(currentPlayer == PlayerColor.white ? 1 : 2);
// ...
hash = hash * BigInt.from(67) + BigInt.from(sq) * BigInt.from(5) + pieceValue;
```

Alternatively, the position hash could be refactored to use the existing 32-bit Zobrist hash for threefold detection (which is what most chess engines do), eliminating BigInt entirely. This would be a **small optimization** during the port.

### 3.5 Performance Characteristics: Dart VM vs V8

**Risk: Low | Impact: AI response time**

- Dart AOT compilation (release builds) produces native ARM code — expected to be **faster** than V8 JIT for sustained computation (AI search)
- Dart's integer arithmetic is 64-bit natively — no BigInt needed for most operations
- `Uint32Array` (JS) maps to `Uint32List` (Dart) with similar performance
- **Risk area:** Dart's garbage collector may cause micro-pauses during deep search. The TypeScript engine allocates many small objects (Move records). Consider object pooling for move generation in Dart if profiling shows GC pressure.

### 3.6 Module-Level State → Isolate-Safe Patterns

**Risk: Medium | Impact: AI architecture**

The TypeScript engine uses module-level (singleton) state for:
- `ZOBRIST_TABLE` and `ZOBRIST_SIDE` — immutable after initialization, safe
- `TranspositionTable` instance — mutable, must be managed across Isolate boundaries
- `KillerMoves` instance — mutable, per-search, safe if created per invocation

In Dart Isolates, top-level variables are **not shared** — each Isolate gets its own copy. This is actually safer but means:
- The Zobrist table will be re-initialized in each Isolate (acceptable — it's deterministic from a fixed seed)
- The TranspositionTable must be explicitly transferred or recreated (see §3.3)

---

## 4. State Management Deep Dive

### 4.1 Game Store Decomposition

The current 1,087-line Zustand store is a monolith with tightly coupled concerns:

| Concern | Lines (est.) | Dart Pattern |
|---------|-------------|-------------|
| Game phase state machine | ~200 | Riverpod `StateNotifier` or BLoC with events |
| Board state + move execution | ~250 | Part of game state, pure reducer logic |
| AI scheduling + cancellation | ~150 | Separate `AiService` class with Isolate management |
| Clock management | ~100 | Separate `ClockNotifier` with `Ticker` |
| Game persistence | ~150 | Separate `GamePersistenceService` |
| Learning mode | ~100 | Separate `LearningModeNotifier` |
| Settings/config | ~80 | Separate `SettingsNotifier` |
| Serialization/deserialization | ~60 | Separate utility/model classes |

**Recommendation: Decompose into 5–6 focused providers/notifiers.** The monolithic store is the #1 architecture risk. Do NOT port it as a single class.

### 4.2 Timer-Based Side Effects

| Side Effect | Current Pattern | Flutter Pattern |
|-------------|----------------|-----------------|
| Clock tick (100ms) | `setInterval` stored in module-level `clockIntervalRef` | `Ticker` from `SingleTickerProviderStateMixin` or `Timer.periodic` in the clock notifier. `Ticker` is preferred — it pauses when the widget is not visible (app backgrounded). |
| AI move delay (150ms) | `setTimeout` stored in module-level `aiTimerRef` | `Future.delayed` in the AI service. Cancellation via `CancelableOperation` from `package:async`. |
| Move feedback dismiss (3s) | `setTimeout` in component | `Future.delayed` or `Timer` in the feedback notifier, or `SnackBar` with auto-dismiss duration. |

**Critical Concern:** The clock must use `Ticker` (not `Timer.periodic`) because `Ticker` is tied to the widget lifecycle and automatically pauses when the app is backgrounded. `Timer.periodic` continues running in the background, which would drain battery and give incorrect time readings when the user returns.

### 4.3 AI Cancellation Pattern

The current implementation uses a generation counter:

```typescript
let aiMoveGeneration = 0;
// In triggerAiMove():
const myGeneration = ++aiMoveGeneration;
// ... after AI completes:
if (myGeneration !== aiMoveGeneration) return; // Stale, discard
```

In Dart with Riverpod, the equivalent is:

```dart
// Option A: CancelableOperation
CancelableOperation<Move?>? _pendingAi;

void triggerAiMove() {
  _pendingAi?.cancel();
  _pendingAi = CancelableOperation.fromFuture(
    compute(findBestMove, params),
  );
  _pendingAi!.value.then((move) {
    if (move != null) executeMove(move);
  });
}
```

```dart
// Option B: Generation counter (simpler, closer to current)
int _aiGeneration = 0;

void triggerAiMove() {
  final gen = ++_aiGeneration;
  compute(findBestMove, params).then((move) {
    if (gen != _aiGeneration) return;
    if (move != null) executeMove(move);
  });
}
```

Option B is recommended for simplicity and direct parity.

### 4.4 Complex State Transitions

The game store manages these phase transitions:

```
not-started → in-progress (via startGame)
in-progress → white-wins | black-wins | draw (via makeMove, resign, offerDraw, clock expiry)
any → not-started (via resetGame)
```

Plus sub-states: `isPaused`, `isAiThinking`, `selectedSquare`, `legalMoveSquares`.

**Recommendation:** Model as a sealed class hierarchy for the game phase, with separate mutable state for transient UI state:

```dart
sealed class GamePhase { ... }
class NotStarted extends GamePhase { ... }
class InProgress extends GamePhase {
  final BoardPosition position;
  final PlayerColor currentTurn;
  final List<MoveRecord> moveHistory;
  final ClockState? clockState;
  // ... all in-progress state
}
class GameOver extends GamePhase {
  final GameResult result;
  final String reason;
  // ... result data
}
```

This makes illegal transitions type-impossible (can't call `makeMove` in `NotStarted` phase).

---

## 5. Testing Strategy Gaps

### 5.1 Widget Testing for Canvas/CustomPainter

**Gap: No strategy for testing board rendering correctness.**

If the board uses `CustomPainter`, standard widget tests (`find.byType`, `find.text`) cannot verify what was painted. Options:

1. **Golden tests:** Render the board widget, capture a screenshot, compare against a known-good "golden" image. Flutter supports this natively with `matchesGoldenFile()`. **Recommended for board rendering.**
2. **Separate rendering logic from painting:** Extract the "what to paint" logic (square colors, piece positions, highlight overlays) into testable data models. The `CustomPainter.paint()` method only reads from these models. Unit test the models; golden-test the painter.
3. **Hybrid approach:** Use `Stack`/`Positioned` for pieces (testable via `find.byType(BoardPiece)`) and `CustomPainter` only for the board background (golden-tested once per theme).

**Recommendation:** Hybrid approach (#3). This is why §1.2 recommends Stack for pieces.

### 5.2 Integration Test Strategy for AI

**Gap: How to test AI move computation in integration tests without slow timeouts.**

- AI at Hard difficulty takes up to 2 seconds per move — integration tests covering a full game would take 60+ seconds
- **Solution:** Create a `TestDifficultyConfig` with depth=1 for integration tests. The engine already supports configurable depth via `DifficultyConfig`.
- **Alternative:** Mock the AI service interface in integration tests and verify only the UI flow.

### 5.3 Golden Tests for Visual Regression

**Gap: No mention of golden tests in the PRD.**

Golden tests are essential for a game with visual rendering as a core feature:

- Board in all 4 themes (8 goldens: 4 themes × 2 orientations)
- Piece rendering (man, king, both colors)
- Legal move indicators, selection highlights, last move highlights
- Victory animation frames (1–2 key frames)
- Clock widget states (active, inactive, low-time)
- Responsive layouts at 3 breakpoints (phone, tablet, desktop)

**Estimated golden count:** 30–40 images. Must be updated when themes change.

**CI consideration:** Golden test images are platform-specific (different font rendering on macOS vs Linux). CI must run goldens on a pinned environment (Docker image or specific macOS version).

### 5.4 Drag-and-Drop Testing

**Gap: No mention of how to test drag interactions.**

Flutter's `WidgetTester` supports drag simulation:

```dart
await tester.drag(find.byKey(pieceKey), const Offset(50, 50));
await tester.pumpAndSettle();
```

But testing drag-and-drop on a game board requires:
- Coordinate-to-square mapping validation
- Drag feedback widget rendering during drag
- Drop target acceptance/rejection
- Edge cases: drag off-board, drag to occupied square, drag during AI turn

**Recommendation:** Add drag-and-drop scenarios to the integration test plan (§6.4). Estimate: 5–8 additional test cases.

### 5.5 Maintaining Test Parity

**Gap: How to ensure Flutter tests cover the same scenarios as current React tests.**

The PRD targets 190+ engine tests (ported) and 160+ widget tests (new). But React Testing Library tests and Flutter widget tests have different testing philosophies:

- RTL tests the DOM output and user interactions — "what does the user see?"
- Flutter widget tests can test both widgets and their state separately
- Some React tests may be testing React-specific behavior (hook lifecycle, re-renders) that don't apply to Flutter

**Recommendation:** Create a **test parity matrix** mapping each existing React test to its Flutter equivalent (or marking it as "N/A — React-specific"). This ensures no behavioral coverage gap.

---

## 6. Platform-Specific Concerns

### 6.1 iOS

| Concern | Details | PRD Coverage |
|---------|---------|-------------|
| **App Transport Security (ATS)** | iOS blocks non-HTTPS connections by default. The backend uses HTTPS in production, but development (`localhost:5000`) uses HTTP. Need an ATS exception for debug builds or use mkcert for local HTTPS. | ❌ Not covered |
| **Keychain access** | `flutter_secure_storage` uses Keychain. Must set `kSecAttrAccessible` to `kSecAttrAccessibleAfterFirstUnlock` so tokens are available after device restart without unlock. Default is `kSecAttrAccessibleWhenUnlocked`. | ❌ Not covered |
| **App Store review** | Board game categorization (Games → Board). Age rating 4+ (no gambling, no violence). Review guidelines §4.2.2 requires games to work without authentication — guest mode satisfies this. | ⚠️ Partially (§9.4) |
| **Universal Links** | Requires `apple-app-site-association` file on the backend domain. | ⚠️ Mentioned in Q7 |
| **Background execution** | iOS aggressively kills background apps. Clock timer must save state before backgrounding and restore on foreground. `WidgetsBindingObserver.didChangeAppLifecycleState` handles this. | ❌ Not covered — critical for timed games |
| **iPad multitasking** | Split View and Slide Over must be handled. Board should resize gracefully. `LayoutBuilder` handles this. | ❌ Not mentioned |
| **Privacy Nutrition Labels** | App Store requires disclosure of all data collected. Need to declare: email (account), gameplay data (analytics if added), identifiers (userId). | ❌ Not covered |
| **Minimum iOS version** | Flutter 3.x supports iOS 12+. Should target iOS 16+ (covers 95%+ of active devices, enables latest APIs). | ❌ Not specified |

### 6.2 Android

| Concern | Details | PRD Coverage |
|---------|---------|-------------|
| **ProGuard/R8** | PRD mentions this (§5.3) but doesn't specify Flutter's ProGuard rules. Flutter release builds use R8 by default. Need to add keep rules for any reflection-based code. | ⚠️ Mentioned |
| **Signing configuration** | `key.properties` + `*.jks` keystore. Must be created before first release and stored securely (losing the keystore = can never update the app). | ❌ Not covered |
| **Minimum SDK version** | Flutter 3.x supports Android SDK 21+ (Android 5.0). Recommend SDK 23+ (Android 6.0) to simplify permission model and cover 97%+ of active devices. | ❌ Not specified |
| **Play Store data safety** | Similar to iOS Privacy Nutrition Labels — must declare data types collected and shared. | ❌ Not covered |
| **Back button behavior** | Android hardware/gesture back button must work correctly with `go_router`. `WillPopScope` (deprecated) → `PopScope` for controlling back navigation from game board (confirm exit). | ❌ Not covered |
| **Split-screen mode** | Android supports split-screen. Board must resize. Same `LayoutBuilder` approach as iPad. | ❌ Not mentioned |

### 6.3 Web (Flutter Web)

| Concern | Details | PRD Coverage |
|---------|---------|-------------|
| **Renderer choice** | Flutter Web has two renderers: **HTML** (smaller bundle, better text) and **CanvasKit** (better fidelity, larger bundle ~2 MB). Board rendering with `CustomPainter` requires CanvasKit for consistent results. | ❌ Not specified |
| **Bundle size** | CanvasKit adds ~2 MB. Total Flutter Web bundle will be ~5–8 MB (compressed), vs current Next.js static export which is likely <500 KB. This is a **significant regression** for web users. | ❌ Not covered |
| **SEO** | Flutter Web renders to a `<canvas>` — no server-rendered HTML, no SEO. Landing page optimization is lost. | ❌ Not covered |
| **Browser compatibility** | CanvasKit requires WebAssembly and WebGL2. Older browsers (IE, very old Safari) won't work. | ❌ Not covered |
| **URL routing** | Flutter Web uses hash-based routing by default (`/#/play`). For clean URLs (`/play`), need `usePathUrlStrategy()`. | ❌ Not covered |
| **Accessibility on Web** | Flutter Web accessibility (SemanticsBinding) is less mature than native HTML. Screen reader support may degrade. | ❌ Not covered |

**Recommendation:** Given the significant web regression risks, strongly favor **Option A (Q2): iOS + Android first**, keeping the Next.js web app. Flutter Web should only be evaluated after native apps are stable.

---

## 7. Recommendations

### 7.1 Must-Fix Before Implementation (P0)

| # | Item | Action | Owner | Effort |
|---|------|--------|-------|--------|
| 1 | **Backend auth enforcement** | Implement proper JWT validation middleware, add `[Authorize]` to protected endpoints, implement refresh tokens | Backend Lead | 2–3 weeks |
| 2 | **CI/CD pipeline design** | Create ADR for mobile CI/CD. Set up iOS/Android signing, Fastlane config, GitHub Actions workflows | DevOps / Tech Lead | 1–2 weeks |
| 3 | **Transposition Table Isolate strategy** | Decide: recreate per move, transfer via `TransferableTypedData`, or use `Isolate.exit()` return. Create ADR. | Architect | 2 days |
| 4 | **Backend CORS for native apps** | Update CORS middleware to not reject requests without `Origin` header | Backend developer | 1 day |
| 5 | **Sealed class patterns guide** | Create Dart style guide for union type mapping (Move, GamePhase, DrawReason, etc.) | Tech Lead | 1 day |
| 6 | **Game store decomposition plan** | Design the Riverpod provider tree before coding. Document which notifiers own which state. | Architect | 2 days |
| 7 | **App lifecycle management** | Add requirement for saving clock/game state on app background (iOS kills background apps) | PRD Author | Hours |
| 8 | **App versioning & forced update** | Design API endpoint and client-side check mechanism | Tech Lead + Backend | 3 days |

### 7.2 Should-Fix During Implementation (P1)

| # | Item | Action | Owner | Effort |
|---|------|--------|-------|--------|
| 9 | **Rate limiting** | Add rate limiter middleware to backend API (especially Expert AI endpoint) | Backend developer | 2–3 days |
| 10 | **Crashlytics integration** | Move from open question to firm requirement. Set up Firebase project. | Tech Lead | 1 day setup + ongoing |
| 11 | **Golden test infrastructure** | Set up golden test framework, generate baseline images for 4 themes | Flutter developer | 2–3 days |
| 12 | **Test parity matrix** | Map each React/Vitest test to Flutter equivalent before writing tests | QA / Tech Lead | 1 day |
| 13 | **Android keystore creation** | Generate release keystore, store securely, document recovery process | Tech Lead | 1 hour + documentation |
| 14 | **iOS/Android minimum SDK versions** | Decide and document: iOS 16+ / Android SDK 23+ recommended | Tech Lead | Decision |
| 15 | **Flutter Web renderer decision** | If web target is included, decide CanvasKit vs HTML renderer | Architect | Decision |

### 7.3 Nice-to-Have / Post-Migration (P2)

| # | Item | Action |
|---|------|--------|
| 16 | Push notifications infrastructure |
| 17 | Biometric authentication |
| 18 | Universal Links / App Links |
| 19 | Position hash optimization (BigInt → 32-bit Zobrist for threefold) |
| 20 | iPad/Android split-screen optimization |
| 21 | Flutter Web as Next.js replacement (evaluate after native launch) |

### 7.4 ADR Candidates

| ADR | Topic | Key Decision Point |
|-----|-------|-------------------|
| **ADR-009** | Flutter state management architecture | Riverpod provider tree design, game store decomposition |
| **ADR-010** | Mobile CI/CD pipeline | Fastlane vs Codemagic vs raw GHA, signing strategy |
| **ADR-011** | AI Isolate memory management | Transposition table transfer strategy between Isolate invocations |
| **ADR-012** | Backend authentication overhaul | JWT validation, refresh tokens, dual auth (cookie + bearer) |
| **ADR-013** | Flutter Web strategy | Replace Next.js, coexist, or skip web target |
| **ADR-014** | App versioning and forced update mechanism | Client/server protocol for minimum version enforcement |

---

## 8. PRD Changes Required

### 8.1 Additions

| Section | Change |
|---------|--------|
| **§2.2 (Out of Scope)** | Add push notifications with rationale |
| **§4 (Non-Functional)** | Add §4.5 "Crash Reporting" — make Crashlytics/Sentry a firm requirement, not an open question |
| **§4 (Non-Functional)** | Add §4.6 "App Versioning" — minimum version check, forced update flow |
| **§4 (Non-Functional)** | Add §4.7 "App Lifecycle" — state preservation on background/terminate (critical for timed games) |
| **§5 (Security)** | Expand §5.3 to detail the full backend auth overhaul needed (JWT middleware, [Authorize], claim extraction) — current description understates the work |
| **§5 (Security)** | Add §5.7 "API Rate Limiting" |
| **§6.2 (Phase Details)** | Add CI/CD pipeline setup as Phase 1 deliverable (currently missing) |
| **§6.4 (Testing Plan)** | Add golden test strategy, drag-and-drop testing, test parity matrix |
| **§7 (Engine Strategy)** | Add §7.5 "Isolate Communication Strategy" — TT memory transfer |
| **§7 (Engine Strategy)** | Add §7.6 "Type System Mapping" — sealed class guide for unions |
| **§11.1 (Dependencies)** | Add "CI/CD pipeline for iOS/Android" as a critical dependency with realistic effort |
| **§12.2 (Phase Estimates)** | Revise timeline per §1.7 of this review (+4 weeks expected case) |
| **§12.5 (Pre-Migration)** | Revise backend auth estimate from "1 week" to "2–3 weeks" |

### 8.2 Modifications

| Section | Change |
|---------|--------|
| **§5.3 (API auth header)** | Change "This is a **backend change**" to detail the full scope: JWT bearer middleware, authorize attributes, claim extraction, dual-mode auth support |
| **§7.2 (Zobrist)** | Correct: Zobrist uses 32-bit ints, not BigInt. BigInt is only for position hashing in `game-state.ts`. Reduce Zobrist risk from "Medium" to "Low". |
| **§10 Q10 (Crashlytics)** | Move from "open question" to "non-functional requirement" |
| **§12.2 (Timeline)** | Phase 1: 5–6 weeks (add CI/CD setup). Phase 3: 6–7 weeks (animation rewrite). Phase 5: 4–5 weeks (app store cycles). Total expected: 28 weeks. |
| **Platform targets (§2.3)** | Add minimum OS versions: iOS 16+, Android SDK 23+ |

### 8.3 Corrections

| Item | Current (Incorrect/Incomplete) | Corrected |
|------|-------------------------------|-----------|
| Backend auth "1 week" estimate | §12.5: "Backend: Add Authorization: Bearer header support — 1 week" | 2–3 weeks: includes JWT validation middleware, [Authorize] guards, claim extraction, refresh tokens, testing, ensuring web app isn't broken |
| Zobrist BigInt concern | §7.2: "Zobrist hashing — random number generation must match" (Medium difficulty) | Zobrist uses 32-bit ints (Low difficulty). BigInt is only in game-state.ts position hashing — separate concern. |
| "No CORS needed" for native | §5.3: "Native iOS/Android apps make direct HTTPS calls — no browser CORS restrictions" | True, but the backend's CORS middleware may still **reject** requests without an Origin header. Must be tested and configured. |
| Backend has auth enforcement | Implicit assumption throughout PRD | Backend currently has **no JWT validation middleware** and **no authorization guards**. Endpoints are unprotected. |

---

## Appendix: Source File References

Key source files examined during this review:

| File | Relevance |
|------|-----------|
| [frontend/src/lib/api-client.ts](../../frontend/src/lib/api-client.ts) | Verified `credentials: 'include'` pattern and no `Authorization` header usage |
| [backend/src/InternationalDraughts.Api/Program.cs](../../backend/src/InternationalDraughts.Api/Program.cs) | Verified no `AddAuthentication()` or JWT bearer config; only `UseAuthorization()` without auth scheme |
| [backend/src/InternationalDraughts.Api/Endpoints/AuthEndpoints.cs](../../backend/src/InternationalDraughts.Api/Endpoints/AuthEndpoints.cs) | Verified no `[Authorize]` or `.RequireAuthorization()` on endpoints |
| [shared/draughts-engine/src/ai/zobrist.ts](../../shared/draughts-engine/src/ai/zobrist.ts) | Verified 32-bit unsigned int hashing (not BigInt) |
| [shared/draughts-engine/src/ai/transposition-table.ts](../../shared/draughts-engine/src/ai/transposition-table.ts) | Verified `ArrayBuffer`/`DataView` usage with 16-byte aligned entries |
| [shared/draughts-engine/src/types/game-state.ts](../../shared/draughts-engine/src/types/game-state.ts) | Verified BigInt usage for position hashing (threefold repetition) |
| [shared/draughts-engine/src/types/move.ts](../../shared/draughts-engine/src/types/move.ts) | Verified discriminated union pattern (`type: 'quiet' \| 'capture'`) |
