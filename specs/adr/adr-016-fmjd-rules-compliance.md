# ADR-016: FMJD Rules Compliance Fixes

## Status

Accepted

## Date

2026-02-21

## Context

A rules-compliance audit of the International Draughts codebase identified four bugs that violate FMJD regulations or cause correctness failures in the game UI and engine. These bugs span the shared TypeScript engine, the shared Dart engine, and the Flutter mobile app. Left unfixed, they undermine the project's core requirement of 100% FMJD rule compliance (AGENTS.md §11) and degrade user experience on the mobile platform.

### Bug Summary

| ID | Title | Affected Layers | Severity |
|----|-------|-----------------|----------|
| BUG-001 | Board Widget Crash | Flutter (`board_widget.dart`, `replay_viewer.dart`) | High — crashes the UI |
| BUG-002 | Position Hash Collisions | Shared TS engine (`game-engine.ts`), Shared Dart engine (`game_engine.dart`) | Critical — false threefold repetition draws |
| BUG-003 | Game Config Lost on Game Over | Flutter (`GameNotifier`, game state machine) | Medium — config inaccessible after game ends |
| BUG-004 | King Capture Path Ambiguity | Flutter (board UI, move selection) | Medium — incorrect move executed in ambiguous captures |

### BUG-001: Board Widget Crash

The internal move serialization format (used for persistence and state transfer) is incompatible with the display notation parser used by `board_widget.dart` and `replay_viewer.dart`. When the board widget or replay viewer attempts to parse a serialized move string, the parser fails and the widget crashes. The root cause is that serialized moves use a compact internal format that does not match the human-readable algebraic notation the display parser expects.

### BUG-002: Position Hash Collisions

The polynomial rolling hash in `computePositionHash` uses base 67 but produces coefficients up to 254 (square number × 5 + piece value = 50 × 5 + 4 = 254). When the base is smaller than the alphabet size, the hash function is not injective — distinct positions can produce the same hash value. This creates **provable** collisions, not merely theoretical birthday-paradox collisions.

Concretely: two different board positions can hash to the same `BigInt` value, causing the threefold repetition detector to declare a draw in a position that has not actually been repeated three times. This is a direct FMJD rules violation.

The bug exists identically in both:
- TypeScript: `shared/draughts-engine/src/engine/game-engine.ts` (line 46, `hash = hash * 67n`)
- Dart: `shared/draughts-engine-dart/lib/src/engine/game_engine.dart` (line 52, `hash = hash * BigInt.from(67)`)

### BUG-003: Game Config Lost on Game Over

The game configuration (difficulty, time control, player colors, etc.) is only accessible from the `InProgress` state of the game state machine. When the game transitions to a terminal state (white wins, black wins, draw), the config is lost. This prevents the UI from displaying post-game information that requires config (e.g., "You played against Hard AI with 5+3 time control") and blocks features like "rematch with same settings."

### BUG-004: King Capture Path Ambiguity

When a flying king has multiple maximum-length capture sequences that share the same origin and destination squares but differ in intermediate squares (the path taken), the UI always picks the first matching capture. Under FMJD rules, all maximum-length captures are legal, but they may capture different pieces — selecting the wrong one changes the resulting board position. The player must be able to choose which capture path to execute.

### Forces

- **FMJD compliance** is non-negotiable (AGENTS.md §11). BUG-002 directly violates rule correctness; BUG-004 can cause the wrong pieces to be captured.
- **Cross-platform parity** between TypeScript and Dart engines must be maintained (ADR-015). BUG-002 must be fixed in both simultaneously.
- **Backward compatibility** for saved games in local storage and session storage must be preserved. Hash function changes invalidate existing position histories.
- **Minimal blast radius** — each fix should be scoped tightly to avoid destabilizing unrelated features.
- **Performance budgets** must not regress: draw detection < 5 ms per move (ADR-007).

---

## Decision

### Fix Order: BUG-001 → BUG-002 → BUG-003 → BUG-004

Bugs are fixed in dependency and severity order. BUG-001 is a crash and blocks basic mobile testing. BUG-002 is a rules-critical engine defect affecting both platforms. BUG-003 and BUG-004 are UI/state issues in Flutter only.

---

### Decision 1: BUG-001 — Create `deserializeMove()`, Keep Serialization Format Unchanged

**Create a dedicated `deserializeMove()` function that converts the internal serialization format into a `Move` object. Fix all consumers (`board_widget.dart`, `replay_viewer.dart`) to use `deserializeMove()` instead of the display notation parser.**

The internal serialization format is intentionally compact and optimized for persistence. The display notation format is human-readable and intended for UI rendering. These are two distinct concerns that should not share a parser.

**Changes:**

1. **New function `deserializeMove()`** in the Dart engine (or a Flutter utility layer) that parses the internal serialized format and returns a typed `Move` object (either `QuietMove` or `CaptureMove`).
2. **`board_widget.dart`** uses `deserializeMove()` to reconstruct the `Move` object from serialized data, then extracts display-relevant fields (origin, destination, captures) from the typed object.
3. **`replay_viewer.dart`** uses the same `deserializeMove()` for move reconstruction during replay rendering.
4. **Serialization format (`serializeMove`)** remains unchanged — no migration needed for existing saved games.

**Rationale for not changing the serialization format:** Changing the format would require migrating all persisted game data (local storage, session storage, any backend-stored move histories). Since the format itself is correct and compact, the problem is only that consumers were using the wrong parser. Adding a proper deserialization function is lower-risk and requires no data migration.

---

### Decision 2: BUG-002 — Change Hash Base from 67 to 257 in Both TS and Dart

**Change the polynomial hash base from 67 to 257 in both the TypeScript and Dart implementations of `computePositionHash`. Defer Zobrist hashing to a future iteration.**

The maximum coefficient in the hash polynomial is 254 (= 50 × 5 + 4). For a polynomial hash to be collision-resistant, the base must be strictly greater than the maximum coefficient value. Changing the base from 67 to 257 (a prime > 254) makes the polynomial hash injective over the coefficient space, eliminating provable collisions.

**TypeScript change** (`shared/draughts-engine/src/engine/game-engine.ts`):
```typescript
// Before:
hash = hash * 67n + BigInt(sq) * 5n + pieceValue;
// ...
hash = hash * 67n;

// After:
hash = hash * 257n + BigInt(sq) * 5n + pieceValue;
// ...
hash = hash * 257n;
```

**Dart change** (`shared/draughts-engine-dart/lib/src/engine/game_engine.dart`):
```dart
// Before:
hash = hash * BigInt.from(67) + BigInt.from(sq) * BigInt.from(5) + pieceValue;
// ...
hash = hash * BigInt.from(67);

// After:
hash = hash * BigInt.from(257) + BigInt.from(sq) * BigInt.from(5) + pieceValue;
// ...
hash = hash * BigInt.from(257);
```

**Migration — Clear position history on saved-game upgrade:** Existing saved games contain position histories computed with base 67. After the fix, newly computed hashes will not match historical ones, which could cause false negatives (failing to detect actual repetitions) or other inconsistencies. The migration strategy is:

- On game load, if the saved game version predates this fix, **clear the `positionHistory` array** and rebuild it by replaying the move history from the initial position using the corrected hash function.
- If move history is unavailable (edge case), clear position history and start fresh — this may miss repetitions that occurred before the upgrade, but avoids false positives.
- Increment the saved-game schema version to distinguish pre-fix and post-fix saves.

**Why 257 and not another value?**
- 257 is the smallest prime greater than 254 (the maximum coefficient).
- Prime bases provide better distribution in polynomial hashing.
- A larger base (e.g., 1009) would also work but produces larger intermediate `BigInt` values with no correctness benefit.

---

### Decision 3: BUG-003 — Store Config on GameNotifier, Persist Across State Transitions

**Store the game configuration as a top-level field on the `GameNotifier` (or equivalent state holder), independent of the game phase state. The config is set at game start and retained through all state transitions including game-over.**

**Current architecture (broken):**
```
GameState = InProgress { config, board, turn, ... }
          | WhiteWins { ... }          // no config
          | BlackWins { ... }          // no config  
          | Draw { reason, ... }       // no config
```

**New architecture:**
```
GameNotifier {
  config: GameConfig?           // Set at game start, retained through game-over
  state: GameState              // Phase-specific state (InProgress, WhiteWins, etc.)
}
```

The `config` field is:
- Set to the `GameConfig` when `startGame()` is called.
- **Not** modified or cleared on game-over transitions.
- Cleared only when the user explicitly starts a new game with a different config or navigates away from the game screen.
- Available to the UI at all times (including post-game screens for "rematch", stats display, etc.).

---

### Decision 4: BUG-004 — Disambiguation UI for Ambiguous King Captures

**When multiple maximum-length captures share the same origin and destination but differ in intermediate squares, detect the ambiguity and present a disambiguation UI that highlights the intermediate squares of each candidate capture path. The player selects the intended path.**

**Detection:** After the player selects an origin and destination square, check if more than one legal `CaptureMove` matches that (origin, destination) pair. If exactly one matches, execute it immediately (current behavior, correct). If multiple match, enter disambiguation mode.

**Disambiguation UI:**

1. Highlight the intermediate squares (captured pieces or traversed squares) for each candidate capture, using visually distinct indicators (e.g., numbered paths, color-coded overlays).
2. The player taps/clicks on one of the highlighted intermediate squares (or a path indicator) to select the intended capture.
3. Once selected, execute the chosen `CaptureMove`.
4. Provide a "cancel" action to deselect and choose a different move entirely.

**Implementation scope:** This is a Flutter-only change (the TypeScript frontend uses click-based sequential square selection that naturally disambiguates). The shared engine already generates all legal captures with full path information — no engine changes are needed.

**Edge case:** If the player is in learning mode (hints enabled), the hint system should also account for ambiguous captures when evaluating whether the player's chosen path matches the engine's recommended move.

---

## Consequences

### Positive

1. **FMJD compliance restored.** BUG-002 fix eliminates provable hash collisions, ensuring threefold repetition detection is correct. BUG-004 fix ensures the player can execute the intended capture when ambiguity exists.
2. **Mobile app stability improved.** BUG-001 fix eliminates crashes in `board_widget.dart` and `replay_viewer.dart`.
3. **Post-game UX unlocked.** BUG-003 fix enables rematch, post-game stats, and config display after game-over.
4. **Cross-platform parity maintained.** BUG-002 is fixed identically in both TS and Dart, keeping the engines in sync.
5. **Minimal migration burden.** No serialization format changes (BUG-001), no data model changes (BUG-003). Only BUG-002 requires a saved-game migration (position history rebuild).

### Negative

1. **Position history invalidation.** The BUG-002 fix changes hash values, requiring existing saved games to rebuild their position histories. Games in progress at upgrade time may lose repetition-detection accuracy for moves played before the upgrade.
2. **Disambiguation UI complexity.** BUG-004 introduces a new interaction mode that must be tested across screen sizes, accessibility configurations, and input methods (touch, mouse, keyboard).
3. **Test surface expansion.** All four fixes require new test cases, particularly BUG-002 (collision regression tests) and BUG-004 (multi-path capture scenarios). Estimated: ~20–30 new test cases across TS, Dart, and Flutter.

### Neutral

1. **Performance impact is negligible.** Changing the hash base from 67 to 257 does not measurably affect `BigInt` arithmetic performance. The polynomial hash remains O(50) per position.
2. **No API changes.** All fixes are client-side (shared engines + Flutter app). The backend C# engine is unaffected because it uses its own hash implementation (which should be audited separately for the same base-67 issue if applicable).

---

## Alternatives Considered

### Alternative 1: Zobrist Hashing Instead of Polynomial Fix (BUG-002)

Replace the polynomial rolling hash entirely with a Zobrist hash (XOR of random bitstrings indexed by square and piece type), as already used by the AI transposition table.

**Deferred (not rejected) because:**
- Zobrist hashing requires a shared table of random values (one per square × piece-type combination = 200 entries for 50 squares × 4 piece types). This table must be identical across TS, Dart, and C# engines — any discrepancy causes cross-platform hash mismatches.
- The current `BigInt` polynomial hash is used for repetition detection, while Zobrist (32-bit `number`) is used for the transposition table. Unifying them (as proposed in ADR-007, Decision 1) is a larger refactor that also changes the `positionHistory` type from `bigint[]` to `number[]`, affecting serialization, persistence, and the Expert AI API payload.
- The base-67→257 fix is a one-line change per engine that is provably correct, requires no shared tables, and can be deployed immediately. Zobrist unification is the right long-term direction (per ADR-007) but should be done as a dedicated effort, not bundled with a critical bug fix.
- **Plan:** Fix the base now (this ADR). Unify to Zobrist in the ADR-007 Phase 1 implementation.

### Alternative 2: Change Move Serialization Format (BUG-001)

Redesign the internal serialization format to match the display notation, so a single parser works for both.

**Rejected because:**
- Changing the serialization format requires migrating all persisted game data (local storage saved games, replay data). This is a non-trivial migration with risk of data loss.
- The two formats serve different purposes: serialization is optimized for compactness and machine readability; display notation is optimized for human readability. Forcing them to be identical compromises one or both.
- The actual fix (adding `deserializeMove()`) is simpler, safer, and requires no data migration. Existing serialized games remain valid.

### Alternative 3: Embed Config in Every Game State Variant (BUG-003)

Instead of lifting config to the notifier, include a `config` field in every sealed class variant (`InProgress`, `WhiteWins`, `BlackWins`, `Draw`).

**Rejected because:**
- Violates DRY — config is duplicated across 4+ state variants with identical semantics.
- Requires threading config through every state transition, increasing the surface for bugs (forgetting to pass config in one transition path).
- Conceptually, config is not phase-specific state. It describes the game setup, not the current phase. Lifting it to the notifier correctly models this.

### Alternative 4: Auto-Select "Best" Capture for AI Evaluation (BUG-004)

Instead of showing disambiguation UI, automatically select the capture that the engine evaluates as strongest (best resulting board position).

**Rejected because:**
- Violates player agency — in FMJD rules, the player chooses which maximum-length capture to execute. The rules mandate the maximum-capture rule (must take the longest sequence) but do not mandate which longest sequence when multiple exist.
- Can produce surprising behavior where the player's intended capture is overridden silently.
- In competitive/rated games, the player must have control over which pieces they capture.

---

## Cross-Platform Parity Requirements

The International Draughts project maintains three engine implementations that must produce identical game-rule results:

| Engine | Language | Location | Affected by This ADR |
|--------|----------|----------|---------------------|
| Shared Engine (web) | TypeScript | `shared/draughts-engine/src/` | BUG-002 only |
| Shared Engine (mobile) | Dart | `shared/draughts-engine-dart/lib/src/` | BUG-001, BUG-002, BUG-003, BUG-004 |
| Backend Engine | C# | `backend/src/InternationalDraughts.Application/` | Audit recommended |

### Parity Rules for This ADR

1. **BUG-002 (hash base change):** The TypeScript and Dart `computePositionHash` functions must use the same base (257), the same coefficient formula (`sq * 5 + pieceValue`), and the same initial seed (1 for white, 2 for black). After the fix, both engines must produce identical hashes for identical board positions. **Add a cross-platform test**: define 5–10 reference positions with expected hash values and verify in both TS and Dart test suites.

2. **Backend C# engine audit:** The backend's position hash implementation (if it uses a polynomial hash) should be audited for the same base-67 issue. If the backend has its own `computePositionHash` with base 67, it must also be updated to 257. This audit should be performed during BUG-002 implementation, even though the backend is not directly affected by the other three bugs.

3. **Test parity:** Any new test case added for BUG-002 in the TypeScript engine must have a corresponding test in the Dart engine. Test data (board positions, expected hashes, expected game outcomes) should be defined in a shared format (e.g., JSON test fixtures) that both test suites can consume.

4. **BUG-001, BUG-003, BUG-004** are Flutter/Dart-only fixes and do not require TypeScript or C# changes. However, if BUG-004's disambiguation logic requires any engine-level changes (e.g., a helper to detect ambiguous captures), that helper should be added to all three engines for parity.

---

## Implementation Phasing

| Phase | Bugs | Scope | Deployable Independently |
|-------|------|-------|--------------------------|
| 1 | BUG-001 | Flutter: add `deserializeMove()`, fix `board_widget.dart` and `replay_viewer.dart` | Yes — mobile only |
| 2 | BUG-002 | Shared TS + Shared Dart: change hash base to 257. Add migration logic for saved games. Add cross-platform hash tests. | Yes — engine only, no UI changes |
| 3 | BUG-003 | Flutter: lift config to `GameNotifier`, persist across state transitions | Yes — mobile only |
| 4 | BUG-004 | Flutter: detect ambiguous captures, implement disambiguation UI | Yes — mobile only, depends on engine already generating full capture paths |

Each phase produces a standalone PR with its own tests and can be merged independently.

---

## Related

- [ADR-007: FMJD Draw Rule Implementation Strategy](adr-007-fmjd-draw-rules.md) — establishes hash unification roadmap (Zobrist) and draw-rule architecture. BUG-002 fix in this ADR is a prerequisite quick-fix; full Zobrist unification follows in ADR-007 Phase 1.
- [ADR-009: Flutter State Management Architecture](adr-009-flutter-state-management.md) — defines the Riverpod provider architecture. BUG-003 fix aligns with the notifier decomposition pattern.
- [ADR-015: Shared Engine as Dart Package](adr-015-shared-engine-dart-package.md) — defines the Dart engine package structure. BUG-001 and BUG-002 fixes modify files within this package.
- Source: [shared/draughts-engine/src/engine/game-engine.ts](../../shared/draughts-engine/src/engine/game-engine.ts) — TypeScript `computePositionHash` (BUG-002)
- Source: [shared/draughts-engine-dart/lib/src/engine/game_engine.dart](../../shared/draughts-engine-dart/lib/src/engine/game_engine.dart) — Dart `computePositionHash` (BUG-002)
- Source: [mobile/lib/features/game/presentation/widgets/board/board_widget.dart](../../mobile/lib/features/game/presentation/widgets/board/board_widget.dart) — Flutter board widget (BUG-001)
- Source: [mobile/lib/features/replay/presentation/replay_viewer.dart](../../mobile/lib/features/replay/presentation/replay_viewer.dart) — Flutter replay viewer (BUG-001)
