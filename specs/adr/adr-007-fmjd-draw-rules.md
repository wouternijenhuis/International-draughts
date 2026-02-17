# ADR-007: FMJD Draw Rule Implementation Strategy

## Status

Proposed

## Date

2026-02-17

## Context

A comprehensive review of draw rule handling across the codebase revealed 11 critical defects that, taken together, mean the application does not comply with FMJD International Draughts rules for any of the three automatic draw conditions (threefold repetition, 25-move king-only rule, 16-move endgame rule). The defects span four system layers — shared engine, frontend, client-side AI, and backend — and require coordinated architectural decisions to resolve correctly.

### Defect Summary

| # | Defect | Layer | Severity |
|---|--------|-------|----------|
| 1 | 25-move rule threshold is 25 half-moves instead of 50 | Shared engine + frontend engine | Critical — fires at half the correct threshold |
| 2 | 16-move rule threshold is 16 half-moves instead of 32 | Shared engine + frontend engine | Critical — fires at half the correct threshold |
| 3 | 16-move rule activates on any ≤4 kings, not the specific FMJD configurations (3K-vs-1K, 2K+1M-vs-1K, 1K+2M-vs-1K) | Shared engine + frontend engine | Critical — wrong activation criteria |
| 4 | Frontend game store never calls `checkDrawCondition`; games continue past draw conditions indefinitely | Frontend game store | Critical — draws never fire in-game |
| 5 | Client-side AI (Easy/Medium/Hard) has no draw awareness; loops endlessly in drawn endgames | Shared engine AI | High — AI credibility |
| 6 | Expert AI (C# backend) has no draw awareness; cannot detect or reason about draws during search | Backend AI | High — AI credibility |
| 7 | Initial board position is missing from the repetition history list | Shared engine + frontend engine | High — first threefold repetition occurrence is lost |
| 8 | Backend `GameRecord` stores `GameResult.Draw` with no sub-type; draw reasons are lost | Backend domain | Medium — data loss |
| 9 | Two hash functions coexist: polynomial rolling hash (`BigInt`) for repetition detection, Zobrist hash (`number`) for TT | Shared engine | Medium — duplication, serialization issues |
| 10 | Frontend `makeMove` duplicates board mutation logic instead of delegating to the shared engine | Frontend game store | Medium — divergence risk |
| 11 | Undo/redo does not preserve draw-rule state (counters, position history, endgame flag) | Frontend game store | Medium — incorrect state after undo |

### Architectural Tensions

Several defects interact in ways that require cross-cutting decisions:

**Hash unification (defect 9).** The shared engine has two position hash implementations: a polynomial rolling hash using `BigInt` (in `game-engine.ts`, used for threefold repetition) and a 32-bit Zobrist hash using `number` (in `ai/zobrist.ts`, used for the transposition table). The polynomial hash returns `BigInt`, which cannot be natively JSON-serialized — `JSON.stringify(123n)` throws `TypeError`. The Zobrist hash returns `number`, which serializes trivially. ADR-006 already decided on 32-bit Zobrist for the TT. Unifying to a single hash function eliminates the `BigInt` serialization problem and removes code duplication, but changes the semantics of the position history (from collision-free `BigInt` to collision-possible 32-bit).

**AI draw detection (defects 5, 6).** Client-side AI runs a search tree where positions repeat naturally (transpositions, not game-history repetitions). Game-history draw detection (threefold repetition, move counters) is fundamentally different from search-tree cycle detection. The AI needs both: (a) game-history awareness to evaluate terminal draw nodes, and (b) search-tree cycle detection to avoid infinite loops in transpositions. The Expert AI compounds this because it is stateless — each request receives only a board position (`int[] Board`) with no game history, position history, or draw-rule counters.

**Frontend state management (defects 4, 10, 11).** The frontend `makeMove` manually mutates the board (move piece, remove captured, check promotion) without calling the shared engine's `applyMove`. This means draw detection cannot be added by simply fixing the engine — the frontend bypasses it. Additionally, undo/redo reconstructs the board from stored `positionAfter` snapshots but has no mechanism to restore draw-rule state.

**Backend draw reason storage (defect 8).** The `GameResult` enum has a single `Draw` value with no sub-type. Adding draw reasons requires either extending the domain model (new enum + nullable column) or introducing a separate event table for draw metadata.

### Forces

- **FMJD compliance (C5)** is non-negotiable. All three draw rules must fire at the correct thresholds with the correct activation criteria. This is the primary constraint driving every decision.
- **Performance budgets** must be maintained: client-side AI response < 2 seconds; draw detection < 5ms per move; Expert AI within configured time limits.
- **Shared engine purity** (zero runtime dependencies, browser + Node.js compatible) must be preserved.
- **Backward compatibility** is required for saved games in session/local storage and existing backend `GameRecord` rows with no draw sub-type.
- **Implementation risk** should be managed by phasing changes so that high-value correctness fixes land before optimization work.
- **Testability** is paramount: every draw-rule scenario must be independently verifiable.

---

## Decision

### Decision 1: Hash Function Unification — Adopt 32-bit Zobrist for All Position Hashing

**Unify all position hashing to use the existing 32-bit Zobrist implementation (`shared/draughts-engine/src/ai/zobrist.ts`). Remove the polynomial rolling hash (`BigInt`) from `game-engine.ts`.**

The `DrawRuleState.positionHistory` type changes from `readonly bigint[]` to `readonly number[]`, and `computePositionHash` is replaced by (or re-implemented as a thin wrapper around) `computeZobristHash`.

**Rationale:**

| Concern | Polynomial (`BigInt`) | Zobrist 32-bit (`number`) |
|---------|----------------------|--------------------------|
| Serialization | `BigInt` throws on `JSON.stringify`; requires custom serializer/deserializer for game persistence, session storage, and API payloads | `number` serializes natively via JSON |
| Performance | `BigInt` operations are 3–5× slower than `number` on V8; significant on mobile | Native `number` XOR is a single CPU instruction |
| Collision risk | Effectively zero (arbitrary precision) | ~1.5% at 131K TT entries; negligible for repetition history (typical game < 200 positions, collision probability < $10^{-5}$) |
| Code duplication | Separate implementation from TT hash | Shared implementation — single source of truth |
| Incremental update | Not supported (must scan all 50 squares) | Supported via XOR (only update changed squares) |

The collision risk for threefold repetition detection is orders of magnitude lower than for the TT, because the position history for a single game is typically 50–200 entries (not 131K). By the birthday paradox, the probability of any collision in a 200-position game is $P \approx 1 - e^{-200^2 / (2 \cdot 2^{32})} \approx 4.7 \times 10^{-6}$ — astronomically unlikely.

**Migration:** Saved games in storage that contain `BigInt` position histories will fail to deserialize (since `BigInt` was already unserializable, these games likely had broken persistence). The migration path is: if `positionHistory` contains non-`number` values or is missing, reconstruct it by replaying the move history from the initial position. This is a one-time cost on game load.

### Decision 2: AI Search-Tree Draw Detection — Game-History Propagation + Path-Based Cycle Detection

**Use two complementary mechanisms for AI draw awareness:**

1. **Game-history draw state propagation:** Pass the current game's `DrawRuleState` (position history, king-only counter, endgame counter) into the search root. At each node, update the draw-rule state incrementally (append position hash, increment/reset counters). If a draw condition is met at any node, score it as `0` (draw) and treat it as a terminal node.

2. **Path-based cycle detection in search:** Maintain a set of position hashes along the current search path (root → current node). If a position hash appears that is already in the path set, score it as `0` (draw by repetition within the search tree). This prevents the search from looping infinitely through transpositions and naturally causes the AI to avoid repetitive play when winning.

**Design details:**

- The `DrawRuleState` is cloned at the search root and updated immutably (or via undo) at each node. This is O(1) per node for counter updates and O(1) for hash-set membership checks.
- The path hash set uses a lightweight `Set<number>` (Zobrist hashes). Since the set contains at most `maxDepth` entries (≤ 20), membership checks are effectively O(1).
- Game-history repetition checks count occurrences across the combined game history + search path. A position occurring twice in game history and once in the search path counts as three occurrences → draw.
- The 25-move and 16-move counters propagate through the search tree: incrementing on quiet king moves, resetting on captures. If a counter reaches the threshold at any node, that node is scored as 0.
- For Easy and Medium (max depth 1 and 3), the overhead is negligible. For Hard (max depth 5), draw-rule state propagation adds approximately 1 object allocation per node but does not meaningfully impact total search time.

**Why not check draws only at the root?** Root-only checking detects draws that have already happened but cannot prevent the AI from playing into a draw. Propagating draw state through the tree enables the AI to: (a) avoid draws when winning (prefer captures that reset counters), (b) seek draws when losing (steer toward repetition or counter thresholds), and (c) correctly evaluate endgame positions where draws are imminent.

### Decision 3: Expert AI Data Flow — Extend API Payload with Draw-Rule State

**Extend the `AiMoveRequest` to include draw-rule state as an optional payload. The frontend sends the current draw-rule counters and a compact position history. The backend does not reconstruct game history.**

New fields on `AiMoveRequest`:

```csharp
public record AiMoveRequest(
    int[] Board,
    string CurrentPlayer,
    string Difficulty,
    int? TimeLimitMs = null,
    // Draw-rule state (optional for backward compatibility)
    int[]? PositionHistory = null,      // Zobrist hashes of all prior positions
    int? KingOnlyMoveCount = null,       // Current 25-move rule counter
    int? EndgameMoveCount = null,        // Current 16-move rule counter
    bool? IsEndgameRuleActive = null     // Whether 16-move rule is currently active
);
```

**Rationale for extending the payload (vs. backend reconstruction):**

| Approach | Pros | Cons |
|----------|------|------|
| **Extend payload** (chosen) | Simple; frontend is the source of truth for game state; no move-replay logic needed on backend; backward compatible (all new fields nullable) | Slightly larger request payload (~800 bytes for 200-position history); client could send incorrect data |
| **Send full move history, reconstruct on backend** | Backend can validate the entire game independently | Requires a full C# move-replay engine; O(n) computation per request for n moves; duplicates game logic across frontend and backend; breaks statelessness goal by adding state reconstruction overhead |
| **Make Expert AI stateful (session-based)** | No extra payload; backend maintains its own game state | Contradicts REQ-70 (stateless API); adds session management, concurrency, and cleanup complexity; breaks horizontal scaling |

The position history is transmitted as `int[]` (32-bit Zobrist hashes), not `BigInt[]`, thanks to Decision 1. A typical 100-move game produces ~200 position entries × 4 bytes = ~800 bytes — negligible overhead on the API payload.

The backend search engine (`SearchEngine.FindBestMove`) will accept an optional `DrawRuleState` parameter. If provided, it propagates draw-rule state through the search tree (same mechanism as Decision 2, ported to C#). If not provided (backward compatibility), draw detection is skipped in the search, preserving current behavior.

**Validation:** The backend does not validate that the position history is consistent with the board position (this would require full game replay). The draw-rule state is treated as advisory input from the client. Incorrect client data can only cause the AI to miscalculate draw proximity — it cannot cause illegal moves or crashes.

### Decision 4: Frontend State Management — Delegate to Shared Engine's `applyMove`

**Refactor the frontend game store's `makeMove` to delegate board mutation and game-outcome detection to the shared engine's `applyMove` function, eliminating duplicated logic.**

Current architecture (broken):
```
makeMove(from, to, notation, capturedSquares)
  ├── Manual board mutation (duplicate of engine logic)
  ├── Manual promotion check (duplicate)
  ├── checkGameOver() — only checks for no-legal-moves
  └── No draw detection
```

New architecture:
```
makeMove(move: Move)
  ├── engine.applyMove(currentGameState, move)
  │   ├── Board mutation (single implementation)
  │   ├── Promotion check (single implementation)
  │   ├── Draw-rule state update (counters, position history)
  │   ├── checkDrawCondition() → DrawReason | null
  │   └── Win/loss check (no legal moves)
  ├── Store the returned GameState (includes phase, drawReason, drawRuleState)
  └── UI updates (selected square, move history, clock, etc.)
```

**Key changes:**

1. **`makeMove` signature change:** Instead of `(from, to, notation, capturedSquares?)`, accept a `Move` object from the shared engine's type system. The `Move` type already encodes origin, destination, captured squares, and move type (quiet/capture). The store already has access to `Move` objects from `generateLegalMoves`.

2. **Game state is the shared engine's `GameState`:** The store's `position`, `currentTurn`, `phase`, and `drawReason` are replaced by (or derived from) the engine's `GameState`. This ensures that the store's state is always consistent with the engine's rules.

3. **The store retains UI-specific state:** `selectedSquare`, `legalMoveSquares`, `moveHistory` (as `MoveRecord[]` for display), `clockState`, `moveFeedback`, and other UI concerns remain in the store. The split is: *game-rule state* lives in the engine's `GameState`; *UI state* lives in the store.

4. **`checkGameOver` is removed from the store.** The engine's `applyMove` already returns the correct phase (including draws). The store reads `newState.phase` and `newState.drawReason` directly.

**Migration risk:** This is a significant refactor of the game store's most critical method. Mitigation: (a) the shared engine's `applyMove` is already fully tested with correct draw detection (once thresholds and criteria are fixed); (b) the store's existing test suite validates move application, game-over detection, and AI triggering — these tests will be updated to use the new signature; (c) the refactor is decomposable: first wire `applyMove` for board mutation, then remove `checkGameOver`, then add draw detection — each step is independently testable.

### Decision 5: Undo/Redo Strategy — Snapshot Per Move

**Store a complete `DrawRuleState` snapshot in each `MoveRecord`. On undo, restore the snapshot from the target move index. On redo, restore the snapshot from the redone move.**

```typescript
interface MoveRecord {
  notation: string;
  player: PlayerColor;
  positionAfter: BoardPosition;
  drawRuleStateAfter: DrawRuleState;  // NEW: complete snapshot
  timestamp: number;
}
```

**Why snapshot per move (vs. recompute from initial state)?**

| Approach | Time complexity | Space overhead | Correctness risk |
|----------|----------------|----------------|-----------------|
| **Snapshot per move** (chosen) | O(1) undo/redo | ~1 KB per move (position history grows linearly) | Zero — stored state is the exact state that was computed during forward play |
| **Recompute from initial state** | O(n) undo (replay n moves) | Zero extra storage | Low risk of divergence if engine logic changes between forward play and recompute; requires engine to be deterministic |

For a typical game of 100 moves, the overhead is ~100 KB of `DrawRuleState` snapshots (mostly position history arrays). This is negligible compared to the existing `positionAfter` board snapshots (51 elements × 100 moves ≈ 40 KB already stored).

**Behavior on undo past a draw:** When undoing the move that triggered a draw, the restored `DrawRuleState` is from the previous move, which has counters below the draw threshold. The game phase reverts to `InProgress`, and play can continue. This is consistent with the existing behavior for win/loss undo.

**Position history trimming on undo:** The `DrawRuleState.positionHistory` in the restored snapshot contains exactly the positions up to (and including) the target move. No manual trimming or splicing is needed — the snapshot is the correct state.

### Decision 6: BigInt Serialization — Eliminate BigInt from Public API

**Eliminate `BigInt` from all serializable types. The `DrawRuleState.positionHistory` becomes `readonly number[]` (32-bit Zobrist hashes per Decision 1). No custom serialization is needed.**

This is a direct consequence of Decision 1 (hash unification). With `BigInt` removed:

- `JSON.stringify(gameState)` works natively for game persistence (session storage, local storage, backend API).
- No custom `replacer`/`reviver` functions are needed for `JSON.parse`.
- The `DrawRuleState` type is fully serializable without transformation.

**Backward compatibility for saved games:** Existing saved games in session/local storage may contain `BigInt` values in `positionHistory` (if any were successfully saved — note that `BigInt` serialization actually throws, so it's likely that no valid saved games contain `BigInt` position histories). The loading logic should:
1. Attempt to parse the saved game.
2. If `positionHistory` is missing, empty, or contains invalid values, reconstruct it by replaying the `moveHistory` from the initial position using the engine's `applyMove`.
3. If reconstruction fails (corrupted move history), start the position history fresh with just the current position.

### Decision 7: Backend Draw Reason Storage — New Enum + Nullable Column

**Add a `DrawReason` enum to the Domain layer and a nullable `DrawReason?` column to the `GameRecord` entity. Do not create a separate draw event table.**

```csharp
// InternationalDraughts.Domain/Enums/DrawReason.cs
public enum DrawReason
{
    ThreefoldRepetition,
    TwentyFiveMoveRule,
    SixteenMoveRule,
    MutualAgreement
}

// GameRecord entity — new property
public DrawReason? DrawReason { get; private set; }

// Updated Complete method
public void Complete(GameResult result, string moveHistory, int? moveCount = null, DrawReason? drawReason = null)
{
    Result = result;
    DrawReason = drawReason;
    MoveHistory = moveHistory;
    MoveCount = moveCount ?? 0;
    CompletedAt = DateTime.UtcNow;
    UpdatedAt = DateTime.UtcNow;
}
```

**Why enum + nullable column (vs. separate event table)?**

| Approach | Query complexity | Schema impact | Data model fit |
|----------|-----------------|---------------|---------------|
| **Enum + nullable column** (chosen) | `SELECT DrawReason FROM GameRecords WHERE Result = 'Draw'` — simple, indexed | One new column, one new enum; one EF migration | Draw reason is a property of the game outcome, not an independent event. A 1:1 relationship with `GameRecord` is the natural model. |
| **Separate draw event table** | JOIN required for draw statistics; more complex aggregation queries | New table, new entity, new repository methods, new migration | Over-engineered for a single nullable field. A separate table is justified when the relationship is 1:many or when the event has its own lifecycle — neither applies here. |

**Backward compatibility:** The column is nullable. Existing `GameRecord` rows with `Result = Draw` and no `DrawReason` are valid — they represent games completed before draw sub-type tracking was added. The API response includes `drawReason: null` for these records. No data migration is required.

**API response change:** The game history API response includes the new field:

```json
{
  "result": "Draw",
  "drawReason": "ThreefoldRepetition"
}
```

For non-draw results, `drawReason` is `null` (omitted or explicit null, depending on serializer configuration).

---

## Consequences

### Positive

- **FMJD compliance.** All three draw rules will fire at the correct thresholds (50 half-moves for 25-move rule, 32 half-moves for 16-move rule) with the correct activation criteria (specific FMJD endgame configurations for 16-move rule). This resolves the critical compliance violations.
- **AI draw awareness.** Both client-side and server-side AI will detect, reason about, and strategically play around draw conditions. This eliminates the endless-loop problem in drawn endgames and enables strategic draw-seeking/avoidance behavior.
- **Single source of truth.** The frontend delegates all game-rule logic to the shared engine, eliminating the duplicated board mutation in the game store. This removes an entire class of divergence bugs and makes future rule changes a single-point update.
- **Native JSON serialization.** Eliminating `BigInt` from `DrawRuleState` makes game state natively serializable. No custom serialization code, no edge cases, no silent data loss.
- **Correct undo/redo.** Draw-rule state snapshots per move ensure that undo/redo always produces the exact draw-rule state from forward play. No recomputation, no edge cases, no drift.
- **Rich draw statistics.** Backend draw reason tracking enables per-reason draw breakdowns in player profiles, game history, and analytics ("14 draws: 8 by threefold repetition, 3 by 25-move rule…").
- **Reduced code surface.** Eliminating the polynomial hash, the duplicated `makeMove` logic, and the `checkGameOver` function reduces total code by approximately 80 lines while increasing correctness.

### Negative

- **Frontend `makeMove` refactor is high-risk.** The game store's `makeMove` is called from 5+ code paths (human move, AI move, learning mode, redo, replay). Changing its signature and internal logic requires updating all callers and their tests. **Mitigation:** The refactor is decomposable into independently testable steps: (1) wire `applyMove` for board mutation without changing the public interface, (2) change the interface to accept `Move` objects, (3) remove `checkGameOver`. Each step can be merged separately.
- **Expert AI payload grows.** Adding draw-rule state to `AiMoveRequest` increases request size by ~800 bytes for a typical game. **Mitigation:** This is negligible relative to the existing board payload (204 bytes) and HTTP overhead. The fields are optional — old clients that don't send them still work (no draw detection in Expert search, same as current behavior).
- **32-bit hash has non-zero collision probability for repetition detection.** Although the probability is ~$4.7 \times 10^{-6}$ per game, it is theoretically possible for a hash collision to cause a false threefold-repetition detection. **Mitigation:** This probability is astronomically low (approximately 1 in 200,000 games). If it becomes a concern, the mitigation is to add a full board comparison on hash match (verify that the positions are actually identical), which is O(50) per match and occurs at most a few times per game.
- **Snapshot-per-move increases memory for long games.** A 300-move game would store ~300 `DrawRuleState` snapshots, each growing linearly with game length (the position history in the last snapshot contains ~300 hashes). Total additional memory: ~360 KB. **Mitigation:** 360 KB is well within browser memory budgets. For extreme cases (1000+ move games, which shouldn't occur with correct draw rules), position history can be capped — but this scenario is self-preventing: correct draw rules will end games long before 300 moves in king-vs-king endgames.
- **C# Expert AI must implement draw-rule propagation.** The backend search engine needs new logic to accept and propagate draw-rule state, mirroring the TypeScript implementation. **Mitigation:** The C# search engine already has sophisticated infrastructure (TT, PVS, LMR). Adding draw-rule state propagation is localized to the search loop and does not interact with the complex pruning logic — it's a terminal-node check analogous to the existing no-legal-moves check.
- **Breaking change for `DrawRuleState.positionHistory` type.** Changing from `bigint[]` to `number[]` is a compile-time breaking change in any code that references the type directly. **Mitigation:** The type is internal to the shared engine and the frontend engine copy. No external consumers depend on it. The frontend engine copy will be updated simultaneously (or, better, eventually eliminated in favor of importing directly from the shared engine).

---

## Alternatives Considered

### Alternative 1: 64-bit Zobrist Hash for Repetition Detection (Retain BigInt)

Use 64-bit `BigInt` Zobrist hashes for repetition detection (near-zero collision probability) while keeping 32-bit `number` Zobrist for the TT.

**Rejected because:**
- Retains the `BigInt` serialization problem — the primary motivation for hash unification. Custom `JSON.stringify` replacers are fragile (must be applied consistently everywhere game state is serialized: session storage, local storage, backend API, debug logging).
- Performance: `BigInt` XOR is 3–5× slower than `number` XOR on V8. While repetition detection performs fewer hashes than TT lookup, the overhead is unnecessary given the negligible collision risk at game-length position histories.
- ADR-006 already established 32-bit Zobrist as the standard. Introducing a second bit-width creates confusion about which hash to use where.
- The collision probability for repetition detection at 200 positions ($\sim 4.7 \times 10^{-6}$) is orders of magnitude lower than the TT collision rate already accepted in ADR-006 (1.5%). If 1.5% is acceptable for move quality, $0.0005\%$ is acceptable for repetition detection.

### Alternative 2: Full Board Comparison for Repetition (No Hash)

Store full board positions (51-element arrays) in the position history and compare element-by-element for threefold repetition.

**Rejected because:**
- Storage: 51 elements × ~8 bytes × 200 positions = ~80 KB per game, vs. 200 × 4 bytes = 800 bytes for hashes.
- Comparison time: O(50) per position pair, O(50n) per move to check all n historical positions, vs. O(n) for hash comparison with O(1) per comparison.
- Does not help with AI draw detection — the search tree cannot store full boards at every node.
- The hash approach is standard practice in all serious draughts and chess engines.

### Alternative 3: Expert AI — Reconstruct Game History from Move List on Backend

Instead of sending draw-rule state in the API payload, send the complete move history (notation list). The backend replays all moves from the initial position to reconstruct the draw-rule state.

**Rejected because:**
- Requires a complete C# move-replay engine (notation parser, board mutation, promotion detection, draw-rule state tracking) — essentially duplicating the entire shared engine in C#. While the backend has move generation, it does not have a notation-to-move parser or a game-state replay function.
- O(n) computation per API request, where n is the number of moves played. For a 200-move game, this adds ~10–20ms of CPU time per request, which is non-trivial relative to the search time budget.
- The move notation format must be kept in perfect sync between frontend and backend. Any discrepancy causes replay failure and a 500 error on the AI endpoint.
- Sending pre-computed draw-rule state (Decision 3) is simpler, faster, and decouples the frontend's notation format from the backend.

### Alternative 4: Stateful Expert AI (Server-Side Session)

Maintain game state on the backend across requests. Each game gets a session; the backend updates its own draw-rule state with each move.

**Rejected because:**
- Violates REQ-70 (stateless API). The Expert AI is designed to be stateless — each request is independent, enabling horizontal scaling and zero-downtime deployments.
- Requires session management infrastructure (Redis, sticky sessions, or in-memory state with cleanup). This is significant added complexity for a feature that can be solved with a ~800-byte payload extension.
- Session lifecycle management (creation, timeout, cleanup, reconnection after network failure) adds failure modes that do not exist in the stateless design.
- The frontend is already the source of truth for game state (it manages the game lifecycle, undo/redo, persistence). Having the backend maintain a parallel game state creates synchronization problems.

### Alternative 5: Undo/Redo — Recompute from Initial State

Instead of storing draw-rule state snapshots, replay the move history from the initial position up to the target move index to reconstruct the draw-rule state.

**Rejected because:**
- O(n) time for undo, where n is the current move index. For a 200-move game, undoing the last move requires replaying 199 moves through the engine. While each replay is fast (~0.1ms), the approach scales poorly and introduces latency that users can perceive (≥ 20ms for long games).
- Requires the engine to produce identical draw-rule states when replaying as it did during forward play. If the engine's draw-rule logic is ever refactored (e.g., hash function changes), replaying old moves may produce different states, causing subtle correctness bugs.
- The snapshot approach is O(1) for undo/redo with ~1 KB of additional storage per move — a trivially acceptable cost.
- The existing undo/redo already uses board position snapshots (`positionAfter`), so adding draw-rule state snapshots is a natural extension of the existing pattern.

### Alternative 6: Backend Draw Reason — Separate Draw Event Table

Create a `DrawEvent` table with a foreign key to `GameRecord`, storing the draw reason and any associated metadata (e.g., which position was repeated, final counter values).

**Rejected because:**
- Over-engineered for a single scalar value. The draw reason is a property of the game outcome, not an independent entity with its own lifecycle. A 1:1 relationship between `GameRecord` and draw reason is naturally modeled as a column, not a table.
- Increases query complexity for the most common use case (fetching game history with draw reasons): requires a JOIN instead of a simple SELECT.
- The potential metadata (repeated position, counter values) is of marginal value for the MVP and can be added as additional nullable columns on `GameRecord` if ever needed, without requiring a separate table.
- Adds a new entity, a new repository, new EF Core configuration, and new migration — substantial infrastructure for minimal benefit.

### Alternative 7: Frontend — Bolt Draw Detection onto Existing makeMove (No Refactor)

Keep the current `makeMove` implementation (manual board mutation) and add `checkDrawCondition` calls after the board update, computing draw-rule state inline in the store.

**Rejected because:**
- Perpetuates the code duplication between the store and the engine. Every rule change (promotion logic, capture handling) must be applied in two places. This duplication already caused the draw detection gap — it will cause future gaps.
- Requires re-implementing draw-rule state update logic (counter incrementing, endgame rule activation, position hash computation) in the store, duplicating the engine's `updateDrawRuleState`. This is the same anti-pattern that caused the current defects.
- The refactor to delegate to `applyMove` is a one-time cost that permanently eliminates the duplication problem. The bolt-on approach is a short-term fix that increases long-term maintenance burden.
- The engine's `applyMove` returns a complete `GameState` with correct draw-rule state, phase, and draw reason. The store can consume this directly with no additional logic.

---

## Implementation Phasing

The decisions above should be implemented in the following order, with each phase independently deployable and testable:

### Phase 1: Engine Correctness (Decisions 1, 5, 7 — Backend)

Fix the shared engine's draw-rule thresholds and activation criteria. Unify hash functions. Add `DrawRuleState` snapshots to move records. Add backend `DrawReason` enum and column.

This phase fixes all three draw rules at the engine level and ensures the backend can store draw reasons. No frontend or AI changes yet.

### Phase 2: Frontend Integration (Decisions 4, 6)

Refactor the frontend `makeMove` to delegate to the shared engine. Eliminate `BigInt` from types. Wire draw detection into the game loop. Implement undo/redo with draw-rule state restoration.

This phase makes draws actually fire in the UI and ensures correct undo/redo behavior.

### Phase 3: AI Draw Awareness (Decisions 2, 3)

Add draw-rule state propagation to client-side AI search. Extend the Expert AI API payload. Implement C# draw-rule propagation in the backend search engine.

This phase gives the AI strategic draw awareness, completing FMJD compliance across all system layers.

---

## Related

- [ADR-005: AI Difficulty Scaling Model](adr-005-difficulty-scaling.md) — establishes AI difficulty architecture; draw awareness must not violate performance budgets established here
- [ADR-006: Enhanced Client-Side AI Architecture](adr-006-enhanced-client-ai.md) — establishes 32-bit Zobrist hashing, NegaMax refactoring, and transposition table design that this ADR builds upon
- [Feature Spec: Draw Rules — FMJD Compliance](../features/draw-rules-compliance.md) — comprehensive requirements, acceptance criteria, and edge cases for all draw rule fixes
- [Task 009: Game Outcome Detection & Draw Rules](../tasks/009-task-game-outcome-draw-rules.md) — original task spec; superseded by the feature spec for draw-rule requirements
- Source: [shared/draughts-engine/src/engine/game-engine.ts](../../shared/draughts-engine/src/engine/game-engine.ts) — `checkDrawCondition`, `computePositionHash` (polynomial, to be replaced), `updateDrawRuleState`, `applyMove`
- Source: [shared/draughts-engine/src/ai/zobrist.ts](../../shared/draughts-engine/src/ai/zobrist.ts) — 32-bit Zobrist hash implementation (to become the unified hash)
- Source: [shared/draughts-engine/src/types/game-state.ts](../../shared/draughts-engine/src/types/game-state.ts) — `DrawRuleState`, `GameState`, `DrawReason`
- Source: [frontend/src/stores/game-store.ts](../../frontend/src/stores/game-store.ts) — `makeMove` (duplicated logic to be refactored), `undoMove`
- Source: [frontend/src/lib/engine/engine/game-engine.ts](../../frontend/src/lib/engine/engine/game-engine.ts) — frontend engine copy with same defects
- Source: [backend/src/InternationalDraughts.Application/Interfaces/IAiService.cs](../../backend/src/InternationalDraughts.Application/Interfaces/IAiService.cs) — `AiMoveRequest` (to be extended)
- Source: [backend/src/InternationalDraughts.Application/Services/AiService.cs](../../backend/src/InternationalDraughts.Application/Services/AiService.cs) — Expert AI entry point (stateless, per Decision 3)
- Source: [backend/src/InternationalDraughts.Domain/Entities/GameRecord.cs](../../backend/src/InternationalDraughts.Domain/Entities/GameRecord.cs) — game persistence entity (to gain `DrawReason` column)
- Source: [backend/src/InternationalDraughts.Domain/Enums/GameResult.cs](../../backend/src/InternationalDraughts.Domain/Enums/GameResult.cs) — existing `GameResult` enum (unchanged; `DrawReason` is a separate enum)
