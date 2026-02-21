# Flutter Migration — Architecture Review (Second Pass)

**Reviewer:** Developer Lead (Second Pass)
**Date:** 2026-02-21
**Documents Reviewed:** ADR-009 through ADR-015, Migration Strategy, Migration PRD, PRD Review, Migration Analysis, AGENTS.md
**Status:** Review Complete — Issues Must Be Resolved Before Implementation

---

## Table of Contents

1. [Cross-ADR Consistency Check](#1-cross-adr-consistency-check)
2. [Technical Gaps Still Open](#2-technical-gaps-still-open)
3. [Security Review](#3-security-review)
4. [Performance Concerns](#4-performance-concerns)
5. [Testing Strategy Completeness](#5-testing-strategy-completeness)
6. [Unresolved Decisions for User](#6-unresolved-decisions-for-user)
7. [Final Confidence Assessment](#7-final-confidence-assessment)
8. [Amendments to Existing Documents](#8-amendments-to-existing-documents)

---

## 1. Cross-ADR Consistency Check

### 1.1 Inter-Document Reference Accuracy

| Source | Reference | Target | Correct? | Notes |
|--------|-----------|--------|----------|-------|
| ADR-009 | "DevLead review (§4.3, Option B)" | PRD Review §4.3 | ✅ | Correctly references generation counter recommendation |
| ADR-010 | "DevLead review (§2.8)" | PRD Review §2.8 | ✅ | Correctly references CI/CD as critical gap |
| ADR-011 | "ADR-009" | ADR-009 AI cancellation pattern | ✅ | Consistent generation counter pattern |
| ADR-012 | "DevLead review (§2.1)" | PRD Review §2.1 | ✅ | Correctly references auth as blocker |
| ADR-013 | "DevLead review (§6.3)" | PRD Review §6.3 | ✅ | Correctly references Flutter Web analysis |
| ADR-014 | "DevLead review (§2.6)" | PRD Review §2.6 | ✅ | Correctly references missing versioning |
| ADR-015 | "ADR-011" | ADR-011 Isolate strategy | ✅ | Consistent TT transfer approach |
| Strategy | "ADR-009 through ADR-015" | All ADRs | ✅ | References all decisions correctly |
| Strategy | "DevLead review" | PRD Review | ✅ | References specific sections |
| ADR-012 | PRD §5.2, §5.4, §10 Q6 | Migration PRD | ✅ | Correct section references |
| ADR-014 | "ADR-010" build numbers | ADR-010 version bumping | ✅ | Consistent build number strategy |

**Verdict:** Cross-references are accurate and consistent. All ADRs reference each other correctly.

### 1.2 Contradictions Found

#### 🔴 CONTRADICTION 1: `TickerProviderMixin` on `StateNotifier` (ADR-009)

ADR-009 shows `ClockNotifier` as:

```dart
class ClockNotifier extends StateNotifier<ClockState?> with TickerProviderMixin {
```

**This is architecturally incorrect.** `TickerProviderMixin` is designed for `State<T>` subclasses (widget lifecycle), not `StateNotifier`. `StateNotifier` has no `BuildContext`, no `WidgetsBinding` connection, and no way to drive a `Ticker` through the framework's vsync mechanism.

**Impact:** The clock implementation as described won't compile. The `Ticker` must be provided from the widget layer or created with `WidgetsBinding.instance.createTicker()`.

**Resolution options:**
- A) Create the `Ticker` in a widget (`TickerProviderStateMixin`) and pass it to the notifier
- B) Use `WidgetsBinding.instance.createTicker()` directly in the notifier (works but loses automatic pause-on-background)
- C) Use `Timer.periodic` with manual `WidgetsBindingObserver` lifecycle handling in the notifier

Option C is pragmatic: use `Timer.periodic` for the 100ms tick and register the notifier as a `WidgetsBindingObserver` to pause/resume when the app is backgrounded. This matches ADR-011's pattern where `WidgetsBindingObserver.didChangeAppLifecycleState` is already planned for Phase 3 (strategy §4.3, deliverable 3.8).

#### 🟡 CONTRADICTION 2: `freezed` Usage — Engine vs App

ADR-015 explicitly rejects `freezed` for the engine package:

> "Adds `build_runner`, `freezed_annotation`, `freezed`, `json_annotation`, and `json_serializable` as dependencies. This violates the zero-dependency principle."

But the Strategy document §10.7 recommends `freezed` for the Flutter app:

> "Use `freezed` code generation for immutable state classes with `copyWith`, `toJson`/`fromJson`, and equality"

And Strategy §3.5 mentions `json_serializable` for game persistence serialization.

**This is not strictly a contradiction** — the engine and the app are separate packages. However, the documents don't clearly delineate the boundary. The strategy's Appendix B lists `freezed + json_serializable` as project-wide technologies, which could confuse developers into using them in the engine.

**Resolution:** Add an explicit note: "`freezed`/`json_serializable` are used in the **Flutter app only** (`mobile/`), never in the Dart engine package (`shared/draughts-engine-dart/`). The engine maintains zero runtime dependencies."

#### 🟡 CONTRADICTION 3: `compute()` Rejection vs `compute()` Fallback

ADR-011 explicitly rejects `compute()` as Alternative 1:

> "Rejected because `compute()` does **not** support `TransferableTypedData`. The TT buffer would be **copied**."

But then ADR-011 also states:

> "If profiling shows that the TT cache provides negligible benefit [...] `compute()` with a fresh TT per invocation becomes viable. This should be benchmarked during Phase 1."

And the Strategy §4.2 risk mitigation says:

> "Fall back to `compute()` with fresh TT if transfer overhead > 50ms."

These are not contradictory but create ambiguity. The primary path is `Isolate.run()` with transfer, but `compute()` is a valid fallback. **Both paths should be benchmarked in Phase 1** with a clear go/no-go threshold documented.

#### 🟢 MINOR INCONSISTENCY 4: Settings Provider Scope

ADR-009 includes `settingsProvider` as one of the decomposed providers, managing:

> "boardTheme, showNotation, showLegalMoves, animationSpeed, persist to prefs"

But the Strategy's feature structure (§10.2) puts settings in:

> `features/settings/data/SettingsRepository`
> `features/settings/presentation/SettingsPanel, SettingsProvider`

These are consistent in concept but differ in naming and placement. The ADR uses `settingsProvider` (Riverpod global), while the strategy uses feature-module scoping. **Recommend:** Adopt the strategy's feature-module structure. Update ADR-009's provider graph to show that `settingsProvider` lives inside `features/settings/`.

### 1.3 Strategy Alignment with All ADR Decisions

| ADR Decision | Strategy Adherence | Issues |
|-------------|-------------------|--------|
| ADR-009: Riverpod decomposition | ✅ Strategy §1.3 confirms Riverpod. Provider graph in §3.2. | ClockNotifier Ticker issue (see §1.2) |
| ADR-010: GitHub Actions + Fastlane | ✅ Strategy §4.1 deliverable 1.4 includes CI/CD setup. | No issues |
| ADR-011: Isolate.run() + TT transfer | ✅ Strategy §4.2 deliverable 2.6 references ADR-011. | No issues |
| ADR-012: JWT validation + refresh | ✅ Strategy §2 (tech debt), §3.1 (Phase 0 tasks). | Effort aligned (2.5–3 weeks) |
| ADR-013: Keep Next.js for web | ✅ Strategy §1.1 "Extend, Don't Replace". No Flutter Web. | No issues |
| ADR-014: Custom app-config endpoint | ✅ Strategy §3.1 includes app-config task. §4.1 deliverable 1.9. | No issues |
| ADR-015: Single monorepo Dart package | ✅ Strategy §4.1 deliverable 1.1 at `shared/draughts-engine-dart/`. | No issues |
| All ADRs: Phase 0 prerequisite work | ✅ Strategy §3 matches all Phase 0 items from ADRs. | No issues |

**Verdict:** The strategy is well-aligned with all ADR decisions. The only structural issue is the TickerProviderMixin contradiction.

---

## 2. Technical Gaps Still Open

### 2.1 Board Rotation at API Boundary (🔴 High Risk)

**Status: Identified but not designed.**

The frontend uses inverted numbering (White=1–20, Black=31–50). The backend uses FMJD standard (White=31–50, Black=1–20). The transformation is `rotateSquare(s) = 51 - s`.

**What's specified:**
- Strategy §2.4 identifies this as 🟡 Medium severity tech debt
- Strategy §4.3 deliverable 3.4 allocates 3 days for Expert AI integration including rotation
- Risk matrix item #7 calls out integration testing

**What's missing:**
- **Where does the rotation live in the Dart architecture?** Is it in the engine package, the API client, or the game provider? The TypeScript version has it in the game store (`boardToApiFormat()`, `rotateSquare()`). The Dart version should isolate it in a dedicated, heavily-tested utility — but no ADR or strategy specifies the location.
- **Does the Dart engine use the same numbering convention as the TypeScript engine?** Both should use the same convention (White=1-20, inverted from FMJD). If the Dart engine uses FMJD standard, the rotation point changes and the bugs multiply.
- **Integration test specification:** The strategy says "Round-trip integration test: send position → get AI move → apply to board → verify correctness. Test with 100+ positions." But no test architecture is described for this cross-boundary validation.

**Recommendation:** Create a `BoardRotation` utility class in the Flutter app's API layer (not the engine — the engine should be convention-agnostic). Write at minimum 50 parameterized tests covering: initial position, mid-game positions, edge squares (1, 50), king positions, and capture moves spanning rotated coordinates. Include round-trip tests against the actual Expert AI endpoint in staging.

### 2.2 Error State Handling in Riverpod Architecture (🟡 Medium Risk)

**Status: Not designed.**

ADR-009 specifies decomposed providers but doesn't detail error handling patterns. The strategy §10.1 recommends `Result<T>` types but doesn't mandate them.

**Specific gaps:**
- **What happens when `AiService.findBestMove()` throws inside the isolate?** ADR-011 says "rethrow" after checking generation, but the `AiNotifier` doesn't show error state propagation to the UI.
- **What happens when game persistence fails (network error on `POST /api/v1/games/in-progress`)? ** The current web version uses fire-and-forget. Does the mobile version silently fail, retry, or show an error? If the device has connectivity but the API returns 500, is this different from being offline?
- **How does `authProvider` handle a failed refresh token rotation?** ADR-012 shows the interceptor forcing logout, but what about in-flight game state? A user mid-game who gets logged out loses their unsaved progress.

**Recommendation:** Define an error handling matrix:

| Error Source | Error Type | User-Facing Behavior | State Recovery |
|-------------|-----------|---------------------|----------------|
| AI Isolate | Exception | "AI error, trying again..." + auto-retry once | Fresh TT, retry |
| AI Isolate | Stale generation | Silent discard | No action |
| Expert AI API | Network timeout | SnackBar + fallback to Hard | Automatic |
| Expert AI API | 500 Server Error | SnackBar + fallback to Hard | Automatic |
| Game persistence | Network error | Silent (fire-and-forget) | Local save succeeds |
| Game persistence | Backend 500 | Silent + log to Crashlytics | Local save succeeds |
| Auth refresh | 401 (revoked) | "Session expired" dialog → login | Save game locally before logout |
| Auth refresh | Network error | Retry 3× with backoff, then dialog | Keep current token if not expired |
| App-config check | Network error | Proceed normally (graceful degradation) | No action |
| App-config check | Force update | Blocking screen | No bypass |

### 2.3 Game Persistence Across Web and Mobile for Same User (🟡 Medium Risk)

**Status: Not addressed in any document.**

When a registered user has both the web app and the mobile app installed, both clients can save in-progress games to `POST /api/v1/games/in-progress/{userId}`. The backend stores **one** in-progress game per user.

**Scenarios unaddressed:**
1. User starts a game on web → closes browser → opens mobile → loads saved game. Does this work? (Likely yes — same endpoint.)
2. User has a game in progress on mobile, then opens web and starts a new game. The web app's POST overwrites the mobile game. When the user returns to mobile and the app loads the saved game, it gets the web game or nothing.
3. User plays simultaneously on web and mobile. Each client writes to the same endpoint, overwriting each other's game state on every move.

**Recommendation:** Add a `clientId` or `lastModifiedAt` field to the in-progress game API. On load, compare timestamps. Show a conflict resolution dialog: "A game in progress was found from [Web, 5 minutes ago]. Resume this game or start a new one?" This requires a minor backend API change (adding `lastModifiedAt` and `clientPlatform` to the response).

### 2.4 Concurrent Web + Mobile Play by Same User (🟢 Low Risk)

**Status: Not addressed.**

If a user is logged in on both web and mobile simultaneously, actions on one client (resign, change settings, update avatar) affect the other's view. The current architecture has no real-time sync (no WebSocket, no Server-Sent Events).

**Impact:** Low for most scenarios. Profile/settings changes are eventually consistent (next API fetch). Game persistence conflicts are addressed by §2.3 above. The main risk is stale data display.

**Recommendation:** Don't invest in real-time sync for launch. Document this as a known limitation. Consider adding an `ETag`/`If-Match` header to game persistence endpoints for conflict detection as a post-launch enhancement.

### 2.5 Dart Engine vs TypeScript Engine Parity Testing (🔴 High Risk)

**Status: Partially specified but methodology is weak.**

The strategy calls for "feed 10,000+ random positions to both TypeScript and Dart engines, compare outputs" (Phase 1 deliverable 1.2). ADR-015 echoes this.

**What's missing:**
- **How are the 10,000+ random positions generated?** A raw random board is usually illegal (pieces on wrong squares, impossible configurations). The positions must be reachable from legal play.
- **What constitutes a "match" for `findBestMove()`?** ADR-015 says "same move at same depth, or same score if move ordering differs." But alpha-beta with different hash functions or iteration order can produce different best moves at the same evaluation. The Zobrist table is re-initialized from a fixed seed — but is the "fixed seed" the same between TypeScript and Dart?
- **How is the cross-validation script run?** The TypeScript engine runs in Node.js. The Dart engine runs in the Dart VM. A cross-validation script must invoke both, capture outputs, and diff. This requires a harness — likely a Node.js script that shells out to `dart run` or a shared JSON-based test corpus.
- **What about floating-point divergence in `evaluate()`?** ADR-015 acknowledges "minor divergences could cause different AI moves" and accepts ε < 0.001. But the acceptance criterion in the strategy (Phase 1) says "zero discrepancies." These contradict.

**Recommendation:**
1. Generate positions by simulating 1,000 games (random legal moves from initial position) and sampling 10 positions from each game = 10,000 legal positions.
2. For `generateLegalMoves()`: require exact set equality (same moves, order irrelevant).
3. For `evaluate()`: require |TS_score - Dart_score| < 0.001.
4. For `findBestMove()` at fixed depth: require same best move **OR** same score (within ε). If scores differ by > 0.001, investigate.
5. Build the cross-validation as a CI job: Node.js script generating JSON test corpus → Dart script consuming it → diff report.
6. Fix the strategy's acceptance criterion: change "zero discrepancies" to "zero discrepancies in move generation; < 0.001 divergence in evaluation scores."

### 2.6 GameCoordinator Design (🟡 Medium Risk)

**Status: Named but not designed.**

ADR-009 mentions a `GameCoordinator` class for cross-cutting actions:

> "Create a `GameCoordinator` class (not a provider) that orchestrates cross-cutting actions like `onGameOver()`, injected into providers that need it."

**What's missing:**
- What actions does `GameCoordinator` handle? Presumably: `onMoveMade` (trigger AI, auto-save, switch clock), `onGameOver` (stop clock, cancel AI, trigger persistence, record result), `onPause` (pause clock, cancel AI), `onResume` (resume clock).
- Is it a class or a set of `ref.listen` callbacks? ADR-009 offers both options but doesn't choose.
- How does it avoid circular dependencies? The coordinator must reference `gameProvider`, `clockProvider`, `aiProvider`, and `gamePersistenceProvider`. If these providers also reference the coordinator, the dependency graph has cycles.

**Recommendation:** The coordinator should be implemented as a set of `ref.listen` callbacks in a dedicated `gameOrchestrationProvider`. This provider watches `gameProvider` for state changes and triggers side effects on other providers. No circular dependency because it's pure listen/read — it never writes back to `gameProvider` through the coordinator itself.

```dart
final gameOrchestrationProvider = Provider<void>((ref) {
  ref.listen(gameProvider, (prev, next) {
    // On phase transition to GameOver:
    if (prev is InProgress && next is GameOver) {
      ref.read(clockProvider.notifier).stop();
      ref.read(aiProvider.notifier).cancel();
      ref.read(gamePersistenceProvider).clearSavedGame();
    }
    // On move made (InProgress with new moveIndex):
    if (prev is InProgress && next is InProgress && next.moveIndex > prev.moveIndex) {
      ref.read(gamePersistenceProvider).autoSave(next);
      if (/* AI's turn */) ref.read(aiProvider.notifier).triggerAiMove(...);
    }
  });
});
```

### 2.7 Expert AI Timeout and Fallback Flow (🟡 Medium Risk)

**Status: Mentioned but not fully specified.**

The PRD says Expert AI has a 5-second round-trip target. The strategy mentions fallback to Hard on network error. ADR-012 marks Expert AI as a public (unauthenticated) endpoint.

**What's missing:**
- **What is the timeout value on the `dio` request?** 5 seconds? 10 seconds? The backend Expert AI can take variable time depending on board complexity.
- **What happens during the timeout?** Is the AI thinking indicator shown? Can the user cancel?
- **What constitutes a "fallback" trigger?** Network error only? Or also HTTP 408 (timeout), 500 (server error), 503 (overloaded)?
- **Does the fallback notify the user?** Strategy §4.3 says "SnackBar notification." But does the game continue as Hard difficulty for just this move, or for the rest of the game?
- **What if Expert AI returns an invalid move?** (Shouldn't happen but defensive programming.) Does the app crash, retry, or fall back?

**Recommendation:** Specify:
- `dio` timeout: `connectTimeout: 5s`, `receiveTimeout: 15s` (Expert AI can take up to 10s on complex positions)
- Fallback triggers: any `DioException` (timeout, network, 4xx, 5xx)
- Fallback behavior: compute Hard AI move locally for **this move only**. Show SnackBar: "Server unavailable — using local AI for this move." Next move attempts Expert again.
- Invalid move handling: log to Crashlytics, fall back to Hard for this move, flag for investigation.

### 2.8 App Lifecycle State Preservation Edge Cases (🟡 Medium Risk)

**Status: Acknowledged but edge cases not explored.**

Strategy §4.3 deliverable 3.8 allocates 2 days for app lifecycle handling. The strategy mentions iOS killing background apps aggressively.

**Unaddressed edge cases:**
- **iOS memory pressure kill with unsaved clock state:** If iOS kills the app (not just backgrounds it), `didChangeAppLifecycleState` may not fire (it fires for backgrounding but not for SIGKILL). The last persisted clock state may be stale.
- **Rapid background/foreground cycling:** User double-taps home button, then returns. The clock should not lose or gain time.
- **Device clock manipulation:** User backgrounds app, changes system time forward 5 minutes, returns. The clock should not advance 5 minutes. Use monotonic clock (`Stopwatch`) not wall clock (`DateTime.now()`) for elapsed time calculation.

**Recommendation:** Use `Stopwatch` (monotonic) for elapsed time between ticks. On background, persist `remainingMs` for each player, not a timestamp. On resume, restart the `Stopwatch` from zero — don't try to "catch up" elapsed time.

### 2.9 Migration of Existing User Data (🟢 Low Risk)

**Status: Not addressed.**

When an existing registered web user installs the mobile app and logs in, what happens?
- Their profile, stats, rating history, and game history load from the API. ✅
- Their settings load from the API. ✅
- Their in-progress game loads from the API. ✅
- Their `localStorage` auth token is not available to the mobile app. They must log in with email/password. ✅ (Expected behavior.)

No actual migration needed — the backend is the source of truth. **This is correctly handled by the architecture without explicit migration steps.**

### 2.10 `Isolate.run()` on Flutter Web (Compilation Target Consideration)

**Status: Addressed but with a subtle gap.**

ADR-011 states `Isolate.run()` compiles to Web Workers on Flutter Web. ADR-013 says Flutter Web is excluded. The strategy confirms iOS+Android only.

**Gap:** If Flutter Web is ever re-evaluated (ADR-013's re-evaluation triggers), the `Isolate.run()` + `TransferableTypedData` approach must work on Web Workers. ADR-011 claims it does, but `TransferableTypedData` behavior on web is less well-tested than on native. This is a future concern, not blocking.

---

## 3. Security Review

### 3.1 Token Storage: `flutter_secure_storage` Analysis

| Platform | Backend | Encryption | Sufficient? | Caveats |
|----------|---------|-----------|-------------|---------|
| **iOS** | Keychain Services | Hardware-backed (Secure Enclave on Face ID devices) | ✅ Yes | `KeychainAccessibility.first_unlock_this_device` is correct for a game app. `when_unlocked` would break background refresh. |
| **Android API 23+** | EncryptedSharedPreferences (Jetpack Security) | AES-256-GCM, master key in Android Keystore | ✅ Yes | Requires `minSdkVersion 23` (confirmed in strategy). Data cleared on app uninstall (expected). |
| **Android < 23** | Not supported | N/A | N/A | `minSdkVersion 23` excludes these devices. Correct choice. |
| **Rooted Android** | EncryptedSharedPreferences | AES-256-GCM, but Keystore can be extracted on rooted devices | ⚠️ Partial | An attacker with root can theoretically extract the master key. Mitigation: short-lived access tokens (15 min) limit the blast radius. |
| **Jailbroken iOS** | Keychain | Keychain can be dumped on jailbroken devices | ⚠️ Partial | Same mitigation: short-lived access tokens. |

**Assessment:** `flutter_secure_storage` is sufficient for a board game. The refresh token is the higher-value target (30-day lifetime), but refresh token rotation (ADR-012) means a stolen token can only be used once before detection.

**Gap:** No document addresses what happens if `flutter_secure_storage` throws an exception (e.g., Keystore hardware failure, corrupted EncryptedSharedPreferences). The app should catch storage exceptions and force re-login gracefully rather than crashing.

### 3.2 Certificate Pinning

**Status: Mentioned in PRD §5.1, not implemented in any ADR.**

PRD says:

> "Pin the backend API server certificate (or public key) using `http_certificate_pinning` or custom `SecurityContext` in Dart."

**Gaps:**
- **No ADR covers this.** Certificate pinning is a security-critical feature that needs design decisions: public key pinning vs certificate pinning, pin rotation strategy, backup pins, what to do when the pin fails.
- **`dio` integration:** Certificate pinning with `dio` requires a custom `SecurityContext` or the `dio_pinning` package. Neither is specified.
- **Certificate rotation:** If the backend's TLS certificate is rotated (e.g., Let's Encrypt every 90 days), a hard-pinned certificate will break the app for all users until they update. **Public key pinning** (pinning the CA or intermediate certificate's SPKI hash) is safer for rotation.
- **Pin failure behavior:** If pinning fails, should the app refuse to connect (secure but breaks functionality) or log a warning and proceed (insecure but functional)? For a board game, logging + proceeding is reasonable for non-auth endpoints; refusing for auth endpoints.

**Recommendation:** Defer certificate pinning to post-launch. For launch, rely on TLS certificate validation (default `dio` behavior). Certificate pinning adds significant maintenance burden for a board game with no financial transactions. Document this decision as an intentional risk acceptance.

### 3.3 Jailbreak/Root Detection

**Status: PRD §5.3 suggests "detecting rooted/jailbroken devices and warning users (not blocking)."**

**Assessment:** For a board game with no financial features, jailbreak/root detection is **unnecessary overhead** that:
- Generates false positives (legitimate developer devices)
- Annoys power users
- Is trivially bypassed by sophisticated attackers
- Adds dependencies (`flutter_jailbreak_detection`, `safe_device`) that may break with OS updates

**Recommendation:** Skip jailbreak/root detection entirely. If future features handle payments (IAP), revisit. The short-lived access tokens and refresh token rotation are sufficient security measures.

### 3.4 Code Obfuscation

**Status: PRD §5.3 mentions `--obfuscate --split-debug-info`. Not covered in any ADR or strategy deliverable.**

**Assessment:** This is a build flag, not an architecture decision. It should be added to the Fastlane configuration:

```ruby
build_flutter_app(
  build_args: "--release --obfuscate --split-debug-info=build/symbols"
)
```

The `--split-debug-info` directory must be uploaded to Crashlytics for symbolicated stack traces (mentioned in strategy §4.1 deliverable 1.10 but not connected to obfuscation).

**Gap:** The strategy/ADR-010 Fastlane config examples don't include `--obfuscate`. This must be added.

### 3.5 API Key Management

**Status: Not addressed in any document.**

The current architecture uses no API keys — the backend is accessible to any client. With mobile apps, there's no origin-based protection (no CORS for native apps).

**Concerns:**
- The Expert AI endpoint (`POST /api/v1/ai/move`) is public and CPU-intensive. Without API keys or rate limiting, any client can abuse it.
- Rate limiting (strategy §3.1) mitigates per-IP abuse, but doesn't authenticate the client.
- An attacker could build a third-party client using the same API.

**Recommendation:** For launch, rate limiting is sufficient. Post-launch, consider adding an `X-API-Key` header for mobile apps (a compile-time constant embedded in the app binary). This doesn't prevent reverse engineering but raises the barrier. Document this as an intentional trade-off.

### 3.6 Network Layer Security: TLS Enforcement

**Status: PRD §5.1 says "TLS 1.2 minimum; prefer TLS 1.3."**

**Assessment:**
- **iOS:** App Transport Security (ATS) enforces TLS 1.2 minimum by default. TLS 1.3 is used when the server supports it. No additional configuration needed.
- **Android API 23+:** TLS 1.2 is default. TLS 1.3 is supported on API 29+.
- **Backend (ASP.NET Core on Azure):** Default Azure App Service configuration supports TLS 1.2/1.3. Can be enforced via `app.UseHsts()` (already configured per AGENTS.md §3.3).
- **`dio` default behavior:** Uses the platform's TLS implementation. No custom `SecurityContext` needed for TLS enforcement.

**Gap:** No explicit test for TLS version in the integration test plan. Add a test that verifies the API connection uses TLS 1.2+ (e.g., check `SecurityContext` in the `dio` response or use a network interception tool during QA).

### 3.7 Refresh Token Concurrency Race Condition

**Status: ADR-012 mentions a "10-second grace period" but doesn't specify the implementation.**

**Scenario:** The access token expires. Two API calls fire simultaneously (e.g., game persistence + profile fetch). Both get 401. Both trigger `AuthInterceptor.onError()`. Both attempt `POST /api/auth/refresh` simultaneously. The first request succeeds and rotates the token. The second request uses the now-revoked old refresh token — and per ADR-012's token family tracking, this could trigger a full family revocation (security alert), force-logging out the user.

**This is a real bug in the ADR-012 design.**

**Recommendation:** Add a mutex/lock on the refresh operation in the `AuthInterceptor`:

```dart
final _refreshLock = Lock(); // from package:synchronized

@override
void onError(DioException err, ErrorInterceptorHandler handler) async {
  if (err.response?.statusCode == 401) {
    await _refreshLock.synchronized(() async {
      // Check if another call already refreshed
      final currentToken = _ref.read(authProvider).accessToken;
      if (currentToken != originalRequestToken) {
        // Already refreshed — just retry with new token
        return;
      }
      // Perform refresh
      await _ref.read(authProvider.notifier).refreshToken();
    });
    // Retry original request with new token
  }
}
```

This ensures only one refresh request fires even when multiple 401s arrive simultaneously.

---

## 4. Performance Concerns

### 4.1 Dart AOT vs V8 JIT for Alpha-Beta Search

**Status: ADR-015 §Consequences says "Dart AOT compilation produces native ARM code, which is expected to be faster than V8 JIT."**

**Analysis:**
- **Integer arithmetic:** Dart AOT compiles to native 64-bit integers. V8 uses SMI (Small Integer, 31-bit) with overflow to heap-allocated numbers. For board square operations (small ints), V8's SMI optimization is competitive. For hash computation (32-bit operations), Dart may win.
- **Object allocation:** The AI search generates thousands of `Move` objects per search. V8's generational GC is highly optimized for short-lived objects. Dart's GC is also generational but less mature. If move generation creates many objects, GC pauses in Dart could exceed V8's.
- **Array access:** `BoardPosition` (51-element list) is accessed millions of times. Both Dart `List<Piece?>` and JS arrays are optimized for this pattern. No significant difference expected.
- **`ByteData` access:** The transposition table uses `ByteData.getUint32()` / `setUint32()`. In V8, `DataView` operations are reasonably fast. In Dart AOT, `ByteData` compiles to direct memory access — potentially faster.

**Verdict:** Dart AOT is expected to be **comparable or slightly faster** than V8 JIT for this workload. The biggest risk is GC pauses during deep search at Hard difficulty.

**Recommendation:** Benchmark in Phase 1 using a standardized test (e.g., search depth 8 from initial position, measure wall time). If Dart is > 2× slower, investigate GC pressure from move generation — consider object pooling or using `List<int>` encoding instead of `Move` objects in the hot path.

### 4.2 Transposition Table Memory on Mobile

**Status: ADR-011 specifies 4 MB TT. PRD targets < 150 MB memory peak.**

**Analysis:**
- 4 MB TT + ~1 MB search stack + ~0.5 MB move generation buffers = ~5.5 MB for AI
- Flutter framework overhead: ~40–60 MB (widgets, rendering)
- Board `CustomPainter` + textures: ~5–10 MB
- Total estimate: ~60–80 MB peak. Well within the 150 MB target.
- Low-end Android devices (2 GB RAM) may have ~200 MB available for foreground apps. 80 MB is acceptable.

**Gap:** No document specifies a **configurable TT size**. On devices with < 2 GB RAM, a 2 MB TT could be used instead. The `DifficultyConfig` should include a `ttSizeMb` parameter.

**Recommendation:** Default TT to 4 MB. On devices with < 3 GB total RAM (detectable via `SysInfoPlus` or platform channels), reduce to 2 MB. AI response time increases slightly (more cache misses) but avoids memory pressure.

### 4.3 `CustomPainter` Rendering Performance

**Status: PRD targets < 16ms per frame. Strategy mentions `RepaintBoundary`.**

**Gaps:**
- **`shouldRepaint()` optimization:** No document specifies how `shouldRepaint()` is implemented for the board's `CustomPainter`. A naive `shouldRepaint() => true` rebuilds the entire board on every frame including clock ticks. Correct implementation: `shouldRepaint()` should compare the previous and current board state, selected square, highlights, and theme — only repaint when these change.
- **Clock tick isolation:** The clock updates every 100ms. If the clock widget shares a paint boundary with the board, the board repaints 10 times per second for no reason. `RepaintBoundary` between clock and board is essential.
- **Piece rendering during drag:** During drag-and-drop, the dragged piece tracks the pointer position (potentially 60+ updates per second). The board should NOT repaint for each pointer move — only the drag feedback overlay should update.

**Recommendation:** Add to the strategy's Phase 2 deliverables:
- Wrap the board widget in `RepaintBoundary`
- Wrap the clock widget in a separate `RepaintBoundary`
- Implement `shouldRepaint()` that compares `BoardPosition`, `selectedSquare`, `legalMoveSquares`, `lastMoveSquares`, and `boardTheme`
- Use a separate `Overlay` or `Positioned` widget for the drag feedback piece (outside the board's paint boundary)

### 4.4 App Size Estimate

**Status: PRD targets < 30 MB (iOS), < 20 MB (Android per ABI).**

**Estimate breakdown:**

| Component | iOS | Android (per ABI) |
|-----------|-----|-------------------|
| Flutter engine (Impeller/Skia) | ~12 MB | ~7 MB |
| Dart AOT compiled app code | ~3 MB | ~2 MB |
| `fl_chart` + `dio` + dependencies | ~1 MB | ~1 MB |
| Firebase Crashlytics/Analytics | ~3 MB | ~2 MB |
| App assets (icons, splash) | ~1 MB | ~1 MB |
| **Total** | **~20 MB** | **~13 MB** |

Both within targets. Firebase SDKs are the largest optional dependency. If app size becomes an issue, Firebase can be replaced with a lighter alternative (Sentry).

### 4.5 Cold Start Time

**Status: PRD targets < 2 seconds.**

**Analysis:**
- Flutter engine initialization: ~500ms (iOS), ~700ms (Android, depending on device)
- Dart VM startup + first frame: ~300–500ms
- App initialization (providers, SharedPreferences read, secure storage read): ~200–400ms
- Version check (`GET /api/v1/app-config`): ~100–500ms (network)
- Token refresh (if needed): ~200–500ms (network)

**Estimated cold start:** ~1.5–2.5 seconds on mid-range devices.

**Risks:**
- If version check + token refresh are sequential, cold start could exceed 3s on slow networks.
- On older Android devices (Pixel 4a), Flutter initialization can take ~1s.

**Recommendation:** Per ADR-014, run the version check **in parallel** with other startup tasks. Run token refresh in parallel with the version check. Show the splash screen during all initialization. Total visible wait should be max(version_check, token_refresh, provider_init) ≈ 500ms after Flutter initialization.

---

## 5. Testing Strategy Completeness

### 5.1 Engine Parity Testing (Dart vs TypeScript)

**Status: Mentioned but methodology incomplete (see §2.5).**

**What's needed beyond §2.5 recommendations:**
- **Adversarial test cases:** Specifically test positions where the maximum capture rule is ambiguous, where promotion rules differ from English draughts, and where draw rules (threefold repetition, 25-move rule, 16-move endgame rule) trigger.
- **Regression corpus:** After Phase 1 cross-validation, save the test corpus as a permanent fixture. Run it in CI on every PR that modifies the Dart engine. This catches regressions early.
- **Performance parity test:** Verify that `findBestMove()` at depth 8 takes < 2× the TypeScript time. Not for correctness but for user experience parity.

### 5.2 Widget Golden Tests

**Status: Strategy/implementation docs now target ~40–50 golden images and CI environment pinning.**

**Gaps:**
- **Font rendering divergence:** Golden images can differ across host environments. Any mixed macOS/Linux baseline will cause flaky comparisons.
- **Theme-switching test:** No golden test covers the transition between themes (e.g., user changes from `classic-wood` to `dark` mid-game). Not critical but useful for visual regression.
- **Dark mode goldens:** Strategy mentions dark mode polish (Phase 4) but doesn't include dark mode variants in the golden test count. With 4 themes × 2 modes × 2 orientations = 16 board goldens minimum.

**Recommendation:** Pin all golden tests to a single Linux baseline CI environment with a pinned Flutter version. Regenerate goldens only when themes change. Store goldens in the repository. Update golden count estimate to 40-50 images.

### 5.3 Integration Tests for Game Flow

**Status: Strategy §4.5 targets 45+ scenarios. PRD maps E2E tests.**

**Gaps:**
- **AI game completion test:** No integration test plays a full game to completion against AI. This is the most important user flow. At minimum, test: start game → make 3 moves → AI responds to each → verify board state after each move. Use depth-1 AI for speed.
- **Resume flow test:** No integration test covers: start game → background app → kill app → relaunch → resume prompt → resume → verify board state.
- **Expert AI fallback test:** No integration test covers: start Expert game → disable network (airplane mode toggle) → AI makes move → verify Hard AI fallback + SnackBar.
- **Clock expiry test:** No integration test covers: start timed game → advance clock to near-zero → verify game ends on time expiry.

**Recommendation:** Add these 4 critical integration test scenarios explicitly to the Phase 5 deliverables.

### 5.4 Platform-Specific Tests

**Status: Mostly unaddressed.**

| Area | Status | Required? |
|------|--------|-----------|
| iOS Keychain (`first_unlock_this_device` accessibility) | Not tested | ✅ Yes — verify tokens survive device restart |
| Android EncryptedSharedPreferences | Not tested | ✅ Yes — verify encryption doesn't fail on specific OEMs |
| iOS background kill recovery | Mentioned but no test | ✅ Yes — verify game state persisted before kill |
| Android back button behavior | Not mentioned | ✅ Yes — verify `PopScope` prevents accidental game exit |
| iOS safe area insets | Not mentioned | ⚠️ Nice-to-have — visual verification on notch devices |
| Android split-screen | Not mentioned | ⚠️ Nice-to-have — verify layout doesn't break |

**Recommendation:** At minimum, add manual QA checklist items for: Keychain persistence across device restart, EncryptedSharedPreferences on 3 different Android OEMs (Samsung, Pixel, Xiaomi), and back button behavior during active game.

### 5.5 Backend Integration Tests with New Auth Middleware

**Status: Strategy §3.1 targets 225+ backend tests (up from 192).**

**Gaps:**
- **Test: web client with Bearer header works** against new middleware
- **Test: web client with old `credentials: 'include'` pattern** still works during dual auth period
- **Test: expired access token returns 401** (not 403, not 500)
- **Test: refresh token rotation** — use old refresh token, get new pair, verify old is revoked
- **Test: concurrent refresh requests** — two simultaneous refresh calls, verify no family revocation
- **Test: userId in JWT claim matches URL parameter** — mismatch returns 403
- **Test: rate limiting on Expert AI** — exceeding rate returns 429

**Recommendation:** Add these 7 specific test scenarios to the Phase 0 exit criteria.

---

## 6. Unresolved Decisions for User

These decisions **still require human input** despite all the agent analysis. Listed in priority order.

### 6.1 🔴 Ratify ADR-009 TickerProviderMixin Fix

**Context:** ADR-009's `ClockNotifier` uses `TickerProviderMixin`, which doesn't work on `StateNotifier`. See §1.2 Contradiction 1.

**Options:**
- **A) `Timer.periodic` + `WidgetsBindingObserver`** — Simple. Use a 100ms timer in the notifier. Register as `WidgetsBindingObserver` to pause/resume on app lifecycle changes. Loses automatic vsync alignment but 100ms resolution doesn't need vsync.
- **B) Widget-provided `Ticker`** — The game screen widget creates a `Ticker` via `TickerProviderStateMixin` and passes it to the `ClockNotifier`. Maintains vsync alignment but couples the notifier to the widget lifecycle.
- **C) `WidgetsBinding.instance.createTicker()`** — Create a standalone `Ticker` in the notifier. Works but undocumented — the `Ticker` won't auto-pause on background.

**Recommendation:** Option A. The clock ticks at 100ms — vsync alignment is irrelevant (vsync is 16ms). The `WidgetsBindingObserver` handles the main mobile concern (pause on background).

**Priority:** 🔴 High — blocks implementation of `ClockNotifier`.

### 6.2 🔴 Dart Engine Board Numbering Convention

**Context:** See §2.1. The TypeScript engine uses White=1–20 (inverted FMJD). The Dart engine must match this convention for the rotation logic to work consistently. But this is an implicit convention, not explicitly documented.

**Options:**
- **A) Match TypeScript convention (White=1–20)** — Consistent with the web app. Rotation at API boundary is the same.
- **B) Use FMJD standard (White=31–50)** — "Correct" per FMJD. No rotation needed for backend. But the mobile UI would need to display inverted.

**Recommendation:** Option A. Matching the TypeScript convention minimizes differences between engines, simplifies cross-validation, and keeps the rotation logic at the same boundary (API client, not engine).

**Priority:** 🔴 High — must be decided before engine porting begins (Phase 1, day 1).

### 6.3 🟡 `freezed` in Flutter App: Yes or No?

**Context:** See §1.2 Contradiction 2. The strategy recommends `freezed`. ADR-009 uses manual `copyWith`.

**Options:**
- **A) Use `freezed` for app state classes** — Less boilerplate, automatic `==`/`hashCode`/`copyWith`/`toJson`. Requires `build_runner` in CI.
- **B) Manual implementations** — No code generation. More verbose but simpler build. Matches engine's zero-dependency philosophy.

**Recommendation:** Option A for the Flutter app only. The app has 10+ state classes that benefit from `freezed`. `build_runner` adds ~30s to clean builds but subsequent builds are incremental. The engine remains `freezed`-free.

**Priority:** 🟡 Medium — affects developer productivity but can be switched later.

### 6.4 🟡 Certificate Pinning: Launch or Post-Launch?

**Context:** See §3.2. PRD specifies certificate pinning. No ADR covers it.

**Options:**
- **A) Implement for launch** — Public key pinning with backup pins. Requires infrastructure for pin rotation.
- **B) Defer to post-launch** — TLS certificate validation (default) is sufficient for a board game. Add pinning when/if the app handles payments or sensitive data.

**Recommendation:** Option B. Certificate pinning maintenance cost (pin rotation, app updates) exceeds the security benefit for a board game. Revisit if IAP is added.

**Priority:** 🟡 Medium — security posture trade-off.

### 6.5 🟡 Firebase vs Sentry for Crash Reporting

**Context:** PRD recommends Firebase Crashlytics. Strategy includes it. But Sentry is also viable.

**Options:**
- **A) Firebase Crashlytics + Analytics** — Free, Google-maintained, proven. Adds ~3MB to binary. Requires Firebase project setup.
- **B) Sentry** — Cross-platform (works on web too), privacy-friendly (self-hostable), smaller SDK. $0/month for up to 5K events.
- **C) Both** — Use Crashlytics for crash reporting and Sentry for error tracking with more detail.

**Recommendation:** Option A. The project doesn't use Firebase for anything else, but Crashlytics is the industry standard for Flutter crash reporting. Analytics can be added with zero additional setup.

**Priority:** 🟡 Medium — must be decided before Phase 1 (deliverable 1.10).

### 6.6 🟢 Configurable TT Size Based on Device RAM

**Context:** See §4.2. The 4 MB TT is appropriate for most devices but may cause memory pressure on very low-end Android.

**Options:**
- **A) Fixed 4 MB** — Simplest. Works for 95%+ of devices.
- **B) Adaptive (4 MB / 2 MB based on device RAM)** — More complex. Requires platform channel or `device_info_plus` package.

**Recommendation:** Option A for launch. Monitor memory-related Crashlytics reports post-launch. Add adaptive sizing only if memory issues are reported.

**Priority:** 🟢 Low — optimization, not correctness.

### 6.7 🟢 Analytics Scope for Launch

**Context:** Strategy §10.4 recommends analytics from Phase 2. PRD Q10 treats it as optional.

**Options:**
- **A) Core analytics from Phase 2** — game_started, game_completed, expert_ai_fallback, tutorial_completed. 4 events, minimal effort.
- **B) Analytics post-launch** — Ship without analytics. Add based on business questions.

**Recommendation:** Option A. 4 events take < 2 hours to integrate with Firebase Analytics. The data answers critical launch questions (which difficulty is most popular? how many complete the tutorial?).

**Priority:** 🟢 Low — minimal effort, high value.

---

## 7. Final Confidence Assessment

| Area | Rating (1-5) | Justification |
|------|-------------|---------------|
| **Architecture decisions** | **4** | ADRs are thorough, well-reasoned, and consistent. The TickerProviderMixin issue (§1.2) is the only structural bug. All major decisions (Riverpod, Isolate.run(), keep Next.js, custom versioning endpoint) are sound. The GameCoordinator needs more design but the approach is correct. |
| **Security design** | **3** | Auth overhaul (ADR-012) is comprehensive and well-designed. Refresh token rotation with family tracking is production-grade. However: certificate pinning is unspecified, the refresh concurrency race condition (§3.7) is a real bug, API key management is absent, and `flutter_secure_storage` error handling is missing. These are fixable but not trivial. |
| **Migration phasing** | **5** | The 6-phase approach (0-5) is excellent. Each phase has clear deliverables, acceptance criteria, effort estimates, and quality gates. Dependencies are correctly ordered. The "web app as safety net" rollback strategy is realistic. Phase 0 prerequisites are comprehensive. |
| **Testing strategy** | **3** | Engine test parity is well-planned but the cross-validation methodology has gaps (§2.5, §5.1). Widget golden tests need environment standardization. Integration tests are missing 4 critical scenarios (§5.3). Platform-specific tests are largely absent (§5.4). Backend auth test scenarios are incomplete (§5.5). The overall structure is good but details need fleshing out. |
| **Timeline estimates** | **4** | The strategy's 26–34 week range (optimistic to conservative) is realistic, especially after incorporating the DevLead review's +4 week adjustment. Phase 0 is correctly front-loaded. The risk is Phase 3 (animations + persistence + learning mode) — the 6–7 week estimate is tight for the move animation rewrite. Budget 8 weeks for Phase 3. |
| **Risk mitigations** | **4** | 17 risks identified with specific mitigations. The risk matrix is comprehensive. Some mitigations are vague ("budget time for troubleshooting"), some are excellent ("rotateSquare round-trip integration test"). The biggest missing risk: refresh token concurrency race condition (§3.7). The biggest underestimated risk: engine cross-validation methodology gaps could let parity bugs reach production. |

**Overall: 3.8/5 — Strong foundation with targeted fixes needed before implementation.**

---

## 8. Amendments to Existing Documents

### 8.1 Amendments to the PRD (`flutter-migration-prd.md`)

| Section | Amendment | Severity |
|---------|-----------|----------|
| §4 (Non-Functional) | Add §4.8 "Startup Performance Budget": cold start ≤ 2s, version check + token refresh in parallel, splash screen absorbs network latency. Reference ADR-014. | 🟡 |
| §5.1 (Transport Security) | Change certificate pinning from "requirement" to "post-launch enhancement." Add justification: TLS default validation sufficient for a board game. | 🟡 |
| §5.2 (Token Management) | Add: "Handle `flutter_secure_storage` exceptions gracefully — force re-login, don't crash." | 🟡 |
| §5.3 (Native App Security) | Remove jailbreak/root detection recommendation. Replace with: "Not required for a board game. Revisit if IAP is added." | 🟢 |
| §5.4 (Token Refresh Gap) | Moved to ADR-012. Remove the "DECISION NEEDED" flag and reference ADR-012. | 🟢 |
| §6.2 Phase 3 | Increase estimate from "5–6 weeks" to "6–8 weeks" to account for animation rewrite risk. | 🟡 |
| §7.3 (Test Parity) | Revise "zero discrepancies" to "zero discrepancies in move generation; ≤0.001 divergence in evaluation scores." | 🔴 |
| §10 Q1 (Flutter Web) | Resolved by ADR-013. Remove open question, reference ADR-013. | 🟢 |
| §10 Q2 (Platform priority) | Resolved. Remove, reference ADR-013. | 🟢 |
| §10 Q3 (State management) | Resolved by ADR-009. Remove, reference ADR-009. | 🟢 |
| §10 Q5 (Engine package) | Resolved by ADR-015. Remove, reference ADR-015. | 🟢 |
| §10 Q6 (Token refresh) | Resolved by ADR-012. Remove, reference ADR-012. | 🟢 |
| §10 Q10 (Crashlytics) | Move to firm requirement per DevLead review §2.7. | 🟡 |
| §12.2 (Timeline) | Update to match strategy timeline (26–34 weeks including Phase 0). | 🟡 |
| §12.5 (Pre-Migration) | Update backend auth estimate from "1 week" to "2.5–3 weeks" per ADR-012 and strategy. | 🔴 |

### 8.2 Amendments to Individual ADRs

#### ADR-009: Flutter State Management

| Section | Amendment | Severity |
|---------|-----------|----------|
| ClockNotifier code example | **Replace `TickerProviderMixin` with `Timer.periodic` + `WidgetsBindingObserver`.** The current code is architecturally incorrect — `TickerProviderMixin` requires a `State` object. Provide corrected example using `Timer.periodic` with explicit `didChangeAppLifecycleState` override to pause/resume. | 🔴 |
| GameCoordinator | Expand from a vague mention to a concrete design. Recommend the `ref.listen`-based orchestration pattern (see §2.6 of this review). | 🟡 |
| freezed clarification | Add a note: "`freezed` may be used for app-level state classes. The engine package remains dependency-free." Resolve ambiguity with strategy §10.7. | 🟢 |
| Error handling | Add a subsection on error state propagation. How does each provider surface errors to the UI? Recommend `AsyncValue`-style error states or the `Result<T>` pattern from strategy §10.1. | 🟡 |

#### ADR-010: Mobile CI/CD Pipeline

| Section | Amendment | Severity |
|---------|-----------|----------|
| Fastlane build args | Add `--obfuscate --split-debug-info=build/symbols` to release build commands. Currently missing. | 🟡 |
| Debug symbol upload | Add a Fastlane lane step to upload `build/symbols/` to Crashlytics for symbolicated crash reports. | 🟡 |
| Golden test CI environment | Clarify: golden tests run on Linux baseline runner/image with a pinned Flutter version. Add `flutter test --update-goldens` as a manual regeneration step. | 🟢 |

#### ADR-011: Flutter Isolate Strategy

| Section | Amendment | Severity |
|---------|-----------|----------|
| Benchmarking requirement | Add explicit Phase 1 acceptance criterion: "Benchmark `Isolate.run()` round-trip with 4 MB TT transfer on Pixel 4a. If overhead > 50ms, evaluate `compute()` fallback." Currently mentioned informally. | 🟡 |
| Error handling | Add: "If the isolate throws, the TT buffer is lost. Allocate a fresh buffer. Log the error to Crashlytics." The current text mentions this but doesn't specify logging. | 🟢 |

#### ADR-012: Backend Authentication Overhaul

| Section | Amendment | Severity |
|---------|-----------|----------|
| Concurrent refresh race condition | **Add a section on refresh token mutex.** The `AuthInterceptor` must serialize refresh requests to prevent concurrent refreshes from triggering token family revocation. See §3.7 of this review. | 🔴 |
| Access token stored "in-memory" | Clarify: on app launch, access token is null. The refresh token is read from secure storage and used to obtain a fresh access token. During this window (app launch → refresh complete), API calls should queue, not fail. | 🟡 |
| Backend test requirements | Add the 7 specific test scenarios from §5.5 of this review. | 🟡 |

#### ADR-013: Flutter Web Strategy

| Section | Amendment | Severity |
|---------|-----------|----------|
| No amendments needed. | ADR-013 is well-written and complete. the decision, rationale, and re-evaluation triggers are clear. | — |

#### ADR-014: App Versioning and Forced Updates

| Section | Amendment | Severity |
|---------|-----------|----------|
| Build number floor | The mitigation for build number reset ("Use a floor value") should specify the implementation location: `deploy-flutter.yml`, not `pubspec.yaml`. | 🟢 |
| Startup parallelism | Clarify that the version check runs **in parallel** with token refresh and local provider initialization. Reference strategy §4.1 deliverable 1.9 for the implementation. | 🟢 |

#### ADR-015: Shared Engine as Dart Package

| Section | Amendment | Severity |
|---------|-----------|----------|
| Board numbering convention | **Add explicit statement:** "The Dart engine uses the same board numbering convention as the TypeScript engine: Black pieces on squares 1–20, White pieces on squares 31–50 in the initial position. `createInitialPosition()` assigns `blackMan` to squares 1–20 and `whiteMan` to squares 31–50." This is currently shown in the code example but not called out as a design decision. | 🔴 |
| Cross-validation methodology | Expand the testing strategy to include the specific methodology from §2.5 of this review: position generation from simulated games, tolerance thresholds, and CI integration. | 🟡 |
| Performance benchmark | Add acceptance criterion: "Dart engine `findBestMove()` at depth 8 from initial position takes ≤ 2× the TypeScript engine's time on equivalent hardware." | 🟡 |

### 8.3 Amendments to the Migration Strategy (`flutter-migration-strategy.md`)

| Section | Amendment | Severity |
|---------|-----------|----------|
| §4.1 Phase 1 Deliverables | Add deliverable 1.11: "Engine cross-validation CI job: Node.js script generates 10,000 test positions, Dart script validates parity. Running in CI on every PR modifying `shared/draughts-engine-dart/`." | 🟡 |
| §4.2 Phase 2 Deliverables | Add to deliverable 2.1: "Board widget must use `RepaintBoundary` to isolate from clock repaints. `shouldRepaint()` checks board state, not identity." | 🟡 |
| §4.2 Phase 2 Deliverables | Add to deliverable 2.5: "Implement `GameOrchestrationProvider` for cross-cutting side effects (AI trigger, auto-save, clock switch) using `ref.listen` pattern." | 🟡 |
| §4.3 Phase 3 Deliverables | Add to deliverable 3.4: "Expert AI `dio` request configuration: `connectTimeout: 5s`, `receiveTimeout: 15s`. Fallback triggers: any `DioException`. Fallback scope: this move only (next move retries Expert)." | 🟡 |
| §4.3 Phase 3 Deliverables | Add to deliverable 3.8: "Use `Stopwatch` (monotonic) for clock elapsed time calculation, not `DateTime.now()`. Prevents clock manipulation on background/foreground." | 🟡 |
| §4.5 Phase 5 Deliverables | Add 4 critical integration test scenarios: full AI game completion, resume after kill, Expert fallback on airplane mode, clock expiry game end. | 🟡 |
| §5 Risk Matrix | Add Risk #18: "Concurrent refresh token requests trigger token family revocation. Probability: Medium. Mitigation: Mutex on AuthInterceptor refresh logic." | 🔴 |
| §5 Risk Matrix | Add Risk #19: "Cross-validation accepts Dart engine with subtle evaluation divergence that causes different AI moves at high depth. Probability: Medium. Mitigation: Strict ε < 0.001 threshold, adversarial test positions targeting edge cases." | 🟡 |
| §6.1 Phase Gate: Foundation → Core Gameplay | Add gate: "Engine cross-validation: 10,000+ positions, zero move-generation discrepancies, evaluation score divergence < 0.001." | 🟡 |
| §9 Team & Skills | Add skill: "Auth interceptor concurrency patterns (mutex/lock for token refresh)" to the senior Flutter dev requirements. | 🟢 |
| §10.7 Modernization: Freezed | Add clarification: "Use `freezed` in the Flutter app only. The Dart engine package has zero dependencies." | 🟢 |
| Appendix B: Technology Stack | Add: `synchronized` (or `pool`) package for auth refresh mutex. | 🟢 |

---

## Summary of Blocking Issues

These **must be resolved** before implementation begins:

| # | Issue | Document | Section | Action Required |
|---|-------|----------|---------|----------------|
| 1 | `TickerProviderMixin` on `StateNotifier` won't compile | ADR-009 | ClockNotifier | Replace with `Timer.periodic` + `WidgetsBindingObserver` |
| 2 | Refresh token concurrency race condition | ADR-012 | AuthInterceptor | Add mutex/lock on refresh operation |
| 3 | Dart engine board numbering convention undocumented | ADR-015 | createInitialPosition | Add explicit convention statement |
| 4 | Cross-validation "zero discrepancies" vs ε < 0.001 contradiction | PRD §7.3 / ADR-015 | Test parity | Align on: exact move-gen match, ε < 0.001 for eval |
| 5 | PRD backend auth estimate "1 week" is 2.5× too low | PRD §12.5 | Pre-migration work | Update to "2.5–3 weeks" |

**Non-blocking but high-priority:** Board rotation utility design (§2.1), error handling matrix (§2.2), game persistence conflict resolution (§2.3), GameCoordinator design (§2.6), Expert AI timeout specification (§2.7), obfuscation flags in Fastlane (§3.4).

---

*This review is the final quality gate before implementation. All 🔴 items must be resolved. All 🟡 items should be resolved or explicitly deferred with documented rationale. The architecture is fundamentally sound — the issues are targeted, not systemic.*
