# FMJD Rules Compliance Fixes — Task Breakdown

**Feature:** `fmjd-rules-compliance`  
**ADR:** [ADR-016](../adr/adr-016-fmjd-rules-compliance.md)  
**Created:** 2026-02-21  
**Status:** Planned  

---

## Phase 1 — BUG-001: Board Widget Crash on Multi-Step Captures

> **Goal:** Fix crash when `board_widget.dart` and `replay_viewer.dart` attempt to parse internal serialized move format.

| # | Task | Files | Description | Depends On | Effort |
|---|------|-------|-------------|------------|--------|
| 1.1 | Implement `deserializeMoveNotation()` | [notation.dart](../../shared/draughts-engine-dart/lib/src/types/notation.dart) | Add a function that parses the internal comma-separated step format into a typed `Move` object (`QuietMove` or `CaptureMove`). Must handle both simple moves and multi-step captures. | — | S |
| 1.2 | Add unit tests for `deserializeMoveNotation()` | [notation_test.dart](../../shared/draughts-engine-dart/test/notation_test.dart) (new) | Test cases: simple quiet move, single capture, multi-step capture, king promotion move, invalid input. Verify round-trip with existing `serializeMove()`. | 1.1 | S |
| 1.3 | Fix board widget last-move parsing | [board_widget.dart](../../mobile/lib/features/game/presentation/widgets/board/board_widget.dart) | Replace display notation parser with `deserializeMoveNotation()` when reconstructing the last move for highlighting. | 1.1 | S |
| 1.4 | Fix replay viewer move parsing | [replay_viewer.dart](../../mobile/lib/features/replay/presentation/replay_viewer.dart) | Same fix as 1.3 — use `deserializeMoveNotation()` for parsing moves during replay rendering. | 1.1 | S |
| 1.5 | Manual smoke test | — | Verify multi-step captures render correctly in live game and replay viewer without crash. | 1.3, 1.4 | S |

---

## Phase 2 — BUG-002: Position Hash Collisions

> **Goal:** Eliminate provable hash collisions in `computePositionHash` by changing the polynomial base from 67 to 257 in both TS and Dart engines.

| # | Task | Files | Description | Depends On | Effort |
|---|------|-------|-------------|------------|--------|
| 2.1 | Change hash base in Dart engine | [game_engine.dart](../../shared/draughts-engine-dart/lib/src/engine/game_engine.dart) | Replace `BigInt.from(67)` → `BigInt.from(257)` in `computePositionHash`. | — | S |
| 2.2 | Change hash base in TS engine | [game-engine.ts](../../shared/draughts-engine/src/engine/game-engine.ts) | Replace `67n` → `257n` in `computePositionHash`. | — | S |
| 2.3 | Create cross-platform hash test fixtures | JSON fixture file (new, e.g. `shared/test-fixtures/position-hashes.json`) | Define 5–10 reference board positions with expected hash values (computed with base 257). Both TS and Dart test suites consume this file. | 2.1 or 2.2 | S |
| 2.4 | Add Dart hash collision regression test | Dart engine test file (existing or new) | Test the specific proven collision case from the ADR. Verify the two previously-colliding positions now produce different hashes. Also verify hashes match the cross-platform fixtures. | 2.1, 2.3 | S |
| 2.5 | Add TS hash collision regression test | TS engine test file (existing or new) | Same collision regression test + cross-platform fixture verification. | 2.2, 2.3 | S |
| 2.6 | Audit backend C# hash implementation | [backend/src/InternationalDraughts.Application/](../../backend/src/InternationalDraughts.Application/) | Check if the C# engine uses a polynomial hash with base 67. If so, update to 257 and add corresponding test. | — | S |
| 2.7 | Add saved-game migration logic (Dart) | Game persistence / provider layer in `mobile/lib/` | On load, detect pre-fix saves (version check). Clear `positionHistory` and rebuild by replaying move history with corrected hash. Increment schema version. | 2.1 | M |

---

## Phase 3 — BUG-003: Game Config Lost on Game Over

> **Goal:** Retain `GameConfig` across all state transitions so post-game UI (rematch, stats) can access it.

| # | Task | Files | Description | Depends On | Effort |
|---|------|-------|-------------|------------|--------|
| 3.1 | Add `config` field to `GameNotifier` | [game_provider.dart](../../mobile/lib/features/game/presentation/providers/game_provider.dart) | Add a top-level `GameConfig?` field. Set it in `startGame()`. Do **not** clear it on game-over transitions. Clear only on explicit new-game or navigation away. | — | S |
| 3.2 | Update state transition methods | [game_provider.dart](../../mobile/lib/features/game/presentation/providers/game_provider.dart) | Ensure `WhiteWins`, `BlackWins`, `Draw` transitions preserve the config field. Remove any code that discards config on terminal states. | 3.1 | S |
| 3.3 | Expose config to post-game UI | Relevant Flutter widgets consuming `GameNotifier` | Verify post-game screens can read `notifier.config` for difficulty label, time control, player color, etc. | 3.2 | S |
| 3.4 | Add unit tests | Test file for `GameNotifier` (existing or new) | Test: config is non-null after game over; config survives white-wins, black-wins, draw transitions; config is null before first game. | 3.1, 3.2 | S |

---

## Phase 4 — BUG-004: King Capture Path Ambiguity

> **Goal:** When multiple maximum-length captures share origin + destination but differ in path, let the player choose which capture to execute.

| # | Task | Files | Description | Depends On | Effort |
|---|------|-------|-------------|------------|--------|
| 4.1 | Add ambiguity detection to `GameNotifier` | [game_provider.dart](../../mobile/lib/features/game/presentation/providers/game_provider.dart) | After player selects origin + destination, check if >1 legal `CaptureMove` matches. If so, expose a `disambiguationCandidates` list and enter disambiguation state. | — | M |
| 4.2 | Implement disambiguation UI in board widget | [board_widget.dart](../../mobile/lib/features/game/presentation/widgets/board/board_widget.dart) | When disambiguation state is active: highlight intermediate squares for each candidate path with distinct visual indicators. Player taps an intermediate square (or path indicator) to select. Include a cancel action. | 4.1 | L |
| 4.3 | Handle disambiguation selection | [game_provider.dart](../../mobile/lib/features/game/presentation/providers/game_provider.dart) | `selectCapturePathByIndex(int index)` or `selectCapturePathBySquare(int square)` — execute the chosen capture and exit disambiguation mode. | 4.1 | S |
| 4.4 | Add unit tests for ambiguity detection | Test file for `GameNotifier` | Test with known king positions that produce multiple same-origin-destination captures. Verify disambiguation activates and each candidate is distinct. | 4.1 | M |
| 4.5 | Add widget tests for disambiguation UI | Widget test for `board_widget.dart` | Verify visual indicators appear, tap selects correct path, cancel exits disambiguation. | 4.2 | M |
| 4.6 | Edge case: hints in learning mode | Hint system (if applicable) | If hints are enabled, ensure hint evaluation accounts for ambiguous captures — don't penalize the player for choosing a different valid path than the engine's top pick. | 4.2 | S |

---

## Dependency Graph

```
Phase 1:  1.1 ─→ 1.2
          1.1 ─→ 1.3 ─→ 1.5
          1.1 ─→ 1.4 ─→ 1.5

Phase 2:  2.1 ─→ 2.4        2.2 ─→ 2.5
          2.1 ─→ 2.7        2.3 ─→ 2.4
          (2.1 ∥ 2.2)       2.3 ─→ 2.5
          2.6 (independent)

Phase 3:  3.1 ─→ 3.2 ─→ 3.3
          3.1 ─→ 3.4

Phase 4:  4.1 ─→ 4.2 ─→ 4.5
          4.1 ─→ 4.3
          4.1 ─→ 4.4
          4.2 ─→ 4.6

Cross-phase: Phase 1 → Phase 2 → Phase 3 → Phase 4
(each phase is a standalone PR, merged in order)
```

---

## Effort Summary

| Effort | Count |
|--------|-------|
| S | 16 |
| M | 4 |
| L | 1 |
| **Total tasks** | **21** |
