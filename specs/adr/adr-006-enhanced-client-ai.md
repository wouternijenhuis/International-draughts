# ADR-006: Enhanced Client-Side AI Architecture

## Status

Accepted

## Date

2026-02-15

## Context

The client-side AI (Easy, Medium, Hard) plays too weakly relative to its target ratings due to several design flaws identified during a Dev Lead review of the shared engine. Specifically:

1. **Ineffective noise**: `noiseAmplitude` only perturbs the *reported* score after search completes — it never influences move selection. The best move from a clean search is always played unless a blunder triggers.
2. **Minimal evaluation**: The evaluation function uses only material, center control, advancement, back row, and king centralization — 5 basic features. The C# Expert backend uses 9 richer positional features (mobility, structure, runaway regular pieces, tempo, endgame patterns). This limits the AI's positional understanding at all client-side levels.
3. **No feature scaling**: All difficulty levels use the same evaluator at full strength. There is no mechanism to make lower levels "see" less positional nuance.
4. **Inconsistent search formulation**: `searchRoot()` uses NegaMax-style score negation (`-result.score`), but `alphaBeta()` uses a classic min-max formulation with `isMaximizing` branches. This inconsistency makes transposition table integration incorrect — TT entries store scores relative to the maximizing player, but NegaMax expects scores relative to the current player.
5. **Unused time limit**: `timeLimitMs` exists in `DifficultyConfig` but is never checked during iterative deepening.
6. **No transposition table**: Repeated positions are re-evaluated from scratch, wasting search budget.
7. **Missing king mobility weight**: The C# backend defines separate `ManMobility = 1` and `KingMobility = 2` weights, but applies `ManMobility` to all pieces. The TypeScript engine has no mobility evaluation at all.
8. **Incomplete feature set**: 9 features exist in the C# evaluation weights (not 8 as initially counted): ManMobility, KingMobility, PieceStructure, FirstKingBonus, LockedPiecePenalty, RunawayMan, TempoDiagonal, EndgameKingAdvantage, LeftRightBalance.

These issues collectively mean that (a) difficulty differentiation relies almost entirely on depth and blunder probability, (b) the engine lacks the positional vocabulary to produce nuanced play at any level, and (c) performance optimizations (TT) cannot be correctly added without first fixing the search formulation.

### Forces

- **Browser constraints**: Memory usage must be predictable and bounded (target: ≤ 4 MB for TT). No worker threads assumed — all computation on the main thread.
- **Mobile performance**: XOR operations in Zobrist hashing must use native `number` arithmetic, not `BigInt`, to avoid 3–5× slowdown on mobile devices.
- **Engine purity**: The shared engine has zero runtime dependencies and must work identically in browser and Node.js.
- **Difficulty separation**: Lower levels must play noticeably weaker than higher levels through mechanisms that produce *human-like* weakness, not random play.
- **Backward compatibility**: The `DifficultyConfig` interface is used by the frontend game store and must remain additive (new optional fields only, no breaking changes).
- **Testability**: All new components (TT, Zobrist, evaluation features) must be independently unit-testable.
- **Implementation risk**: The improvement must be phased so that high-ROI changes land first without blocking on complex TT infrastructure.

## Decision

### Decision 1: NegaMax Refactoring (Prerequisite)

**Refactor `alphaBeta()` from min-max to NegaMax formulation before adding transposition table support.**

The current implementation has two branches (`isMaximizing` / `!isMaximizing`) that duplicate the search logic with opposite score semantics. `searchRoot()` already negates child scores (`-result.score`), which is the NegaMax convention. The mismatch means that transposition table entries would store scores in an ambiguous frame of reference.

The refactored `alphaBeta()` will:
- Always evaluate from the perspective of `currentPlayer`.
- Always negate child scores: `score = -alphaBeta(..., -beta, -alpha, ...)`.
- Remove the `maximizingPlayer` parameter and `isMaximizing` branching.
- Return scores relative to the side to move, consistent with `searchRoot()`.

This is a correctness prerequisite — TT integration on top of the current min-max would produce incorrect cutoffs.

### Decision 2: Transposition Table — ArrayBuffer with Fixed Size

**Use a fixed-size `ArrayBuffer` with `DataView` access, not a JavaScript `Map`.**

| Aspect | `Map<number, TtEntry>` | `ArrayBuffer` + `DataView` |
|--------|----------------------|---------------------------|
| Memory at 131K entries | ~20 MB (object overhead) | 4 MB (32 bytes/entry) |
| GC pressure | High (object allocation per entry) | Zero (pre-allocated) |
| Access pattern | Hash lookup + object creation | Direct byte offset arithmetic |
| Browser compatibility | Universal | Universal (typed arrays since ES6) |

The TT will use a **replace-always** replacement policy: any new entry unconditionally overwrites the existing entry at that index. This is the simplest policy and avoids branching on entry age, depth, or node type. It is well-suited to iterative deepening, where the most recent search at a given depth is the most relevant.

Table parameters:
- **Entry size**: 32 bytes (hash: 4B, depth: 1B, flag: 1B, score: 2B, bestMove: 4B, padding: 20B for alignment and future use).
- **Entry count**: 131,072 (2^17) — index via `hash & 0x1FFFF`.
- **Total memory**: 4 MB exactly.

### Decision 3: Zobrist Hash — 32-bit Using `number`

**Use 32-bit Zobrist hashing with JavaScript `number` type, not 64-bit `BigInt`.**

Collision analysis at 131,072 table entries:
- Expected collision rate: ~1.5% (by birthday paradox: $P \approx 1 - e^{-n^2/(2 \cdot 2^{32})} \approx 0.015$ for $n = 131072$).
- Impact of collision: a wrong TT hit may cause a slightly inaccurate score or move ordering at one node. This is standard practice in game-playing programs and does not affect move legality.

Performance comparison:
- `BigInt` XOR: ~3–5× slower than `number` XOR on V8 (Chrome, Node.js), worse on mobile.
- At typical search rates (50K–200K nodes/sec), the overhead of `BigInt` would reduce effective search depth by ~0.5–1 ply within time budgets.

The Zobrist table will contain pre-generated random 32-bit integers for each (square, piece-type, color) combination: 50 squares × 2 types × 2 colors = 200 entries, plus one entry for side-to-move.

### Decision 4: Evaluation Architecture — Single Function with Feature Scale

**Use a single `evaluate()` function with a `featureScale` parameter (0.0–1.0) that multiplies all positional feature weights.**

```
evaluate(board, player, featureScale = 1.0): number
  materialScore = (regular pieces diff × 100) + (kings diff × 300)       // always full strength
  positionalScore = Σ(feature_i × weight_i) × featureScale    // scaled by difficulty
  return materialScore + positionalScore
```

The alternative — two separate evaluators (material-only and full) — was rejected because:
- It creates code duplication for the material calculation.
- It forces a binary choice (material-only vs. full) instead of a spectrum.
- Intermediate feature scales (e.g., 0.5 for Medium) cannot be expressed.
- Testing requires maintaining two evaluation functions.

Per-difficulty `featureScale` values:

| Level | `featureScale` | Effect |
|-------|---------------|--------|
| Easy | 0.0 | Pure material evaluation — no positional awareness |
| Medium | 0.4 | Weak positional sense — sees basic patterns |
| Hard | 1.0 | Full positional evaluation |

The `featureScale` field will be added to `DifficultyConfig` as an optional property with a default of `1.0`.

### Decision 5: Noise Redesign — Leaf-Node Perturbation

**Apply noise as a random perturbation to leaf-node evaluations during search. Remove the current ineffective post-search noise.**

Current behavior (broken):
```
bestMove = search(board)           // noise-free search → always finds best move
reportedScore = bestMove.score + random(noiseAmplitude)   // cosmetic only
```

New behavior:
```
evaluate(board, player, featureScale, noiseAmplitude):
  score = materialScore + positionalScore × featureScale
  score += random(-noiseAmplitude, +noiseAmplitude)        // perturbs search decisions
  return score
```

This ensures that the search tree itself is affected by noise — different leaf evaluations cause different backed-up values, leading to different move selections at the root. The noise becomes a genuine weakening mechanism rather than cosmetic.

The `noiseAmplitude` parameter will be passed through the search to the evaluation function (via either a config parameter or closure). The blunder mechanism is retained as a separate, rare "safety valve" (`blunderProbability`) that produces occasional larger tactical mistakes, distinct from the continuous positional noise.

The post-search score perturbation in the current `applyBlunderLogic()` (the `score: bestResult.score + (Math.random() - 0.5) * config.noiseAmplitude` line) will be removed.

### Decision 6: Time Limit — Complete-Depth Check in Iterative Deepening

**Check `performance.now()` after each completed depth in iterative deepening. If the elapsed time exceeds `timeLimitMs`, stop before starting the next depth.**

```typescript
const startTime = performance.now();
for (let depth = 1; depth <= config.maxDepth; depth++) {
  const result = searchRoot(board, player, depth, legalMoves);
  bestResult = result;
  if (performance.now() - startTime >= config.timeLimitMs) break;
}
```

This is a **complete-depth** time control, not mid-search cancellation. The rationale:
- Mid-search cancellation (checking time at every node) adds overhead and complexity (partial results, interrupted iterative deepening state).
- Complete-depth control is simple, deterministic for testing, and sufficient for client-side time budgets (1–2 seconds).
- The primary depth constraint is `maxDepth`; the time limit is a safety net for positions where a given depth takes unexpectedly long (e.g., positions with many captures creating deep forced sequences).

### Decision 7: King Mobility Weight — Separate from regular piece Mobility

**Implement king mobility with weight 2 (distinct from regular piece mobility weight 1), matching the intended C# `EvaluationWeights` design.**

The C# `EvaluationWeights` record defines `ManMobility = 1` and `KingMobility = 2`, but the C# evaluation code applies `ManMobility` to all pieces. The TypeScript port will implement the *intended* design:

| Feature | Weight |
|---------|--------|
| Regular piece mobility (available non-capture moves per regular piece) | 1 |
| King mobility (available non-capture moves per king) | 2 |

Kings are inherently more mobile due to flying king rules, so a higher weight correctly values the positional advantage of king mobility. The C# implementation will be fixed separately to match.

### Decision 8: Feature Count — All 9 Features

**Port all 9 evaluation features from the C# `EvaluationWeights` to the TypeScript evaluation function.**

| # | Feature | Weight | Description |
|---|---------|--------|-------------|
| 1 | ManMobility | 1 | Number of non-capture moves available per regular piece |
| 2 | KingMobility | 2 | Number of non-capture moves available per king |
| 3 | PieceStructure | 3 | Pieces protected by friendly pieces behind them |
| 4 | FirstKingBonus | 30 | Bonus for first player to promote a king |
| 5 | LockedPiecePenalty | -5 | Penalty for pieces with no legal moves |
| 6 | RunawayMan | 15 | Bonus for regular pieces with a clear path to promotion |
| 7 | TempoDiagonal | 2 | Control of the long diagonal (squares 5–46) |
| 8 | EndgameKingAdvantage | 20 | King advantage amplified in endgames (< 6 pieces) |
| 9 | LeftRightBalance | -3 | Penalty for imbalanced piece distribution |

These replace the current 5 ad-hoc features (centerControl, advancement, backRow, kingCentralization) which are not aligned with the C# engine and lack tactical features like mobility and structure.

### Decision 9: Implementation Phasing — High-ROI First

**Phase 1 (High ROI — ~80% of improvement):**
- Leaf-node noise (Decision 5)
- Evaluation enrichment with all 9 features (Decisions 7, 8)
- Feature scaling per difficulty (Decision 4)
- Parameter tuning (adjust `noiseAmplitude`, `featureScale` per level)

Phase 1 addresses the two root causes of weak play: ineffective noise and poor evaluation. These changes are localized to `evaluation.ts` and `difficulty.ts`, with minimal impact on search logic.

**Phase 2 (Optimization — search infrastructure):**
- NegaMax refactoring (Decision 1)
- Zobrist hashing (Decision 3)
- Transposition table (Decision 2)
- Killer move heuristic (move ordering improvement)
- Time limit enforcement (Decision 6)

Phase 2 improves search efficiency, primarily benefiting Hard difficulty (depth 5) where the search tree is large enough for TT hits to matter. NegaMax refactoring is a prerequisite for TT, so both land together.

**Rationale for ordering**: Phase 1 delivers the most perceptible improvement (better moves, distinct difficulty feel) with the least implementation risk. Phase 2 is important for Hard-level refinement but has higher complexity (TT correctness, Zobrist incremental update) and its benefits are less visible to players at Easy/Medium.

## Consequences

### Positive

- **Effective difficulty differentiation.** Leaf-node noise and feature scaling create genuinely different playing styles per level — Easy plays material-only with high randomness, Medium has partial positional awareness, Hard plays with full evaluation and minimal noise.
- **Stronger Hard level.** The TT and killer moves allow Hard to search more effectively within its depth budget, producing stronger play that better bridges the gap to Expert.
- **Richer positional play.** All 9 evaluation features give the AI vocabulary for structure, mobility, tempo, and endgame patterns — producing moves that look more "intentional" to human opponents.
- **Predictable memory usage.** The 4 MB ArrayBuffer TT has no GC overhead and no risk of unbounded growth, making it safe for mobile browsers.
- **Phased delivery reduces risk.** Phase 1 can be shipped and validated independently. If Phase 2 encounters issues, the AI is already meaningfully improved.
- **Time limit prevents UI freezes.** The iterative deepening time check ensures the AI never blocks the main thread beyond the configured budget, even in complex positions.

### Negative

- **NegaMax refactoring is a non-trivial rewrite.** The entire `alphaBeta()` function must be restructured, and all search tests must be updated. Risk mitigation: extensive unit tests on known positions before and after, verifying identical move selection.
- **Evaluation is slower.** 9 features (especially mobility, which requires move generation per piece) are more expensive than the current 5 simple features. Mitigation: `featureScale = 0.0` at Easy level skips all positional features entirely; king/regular piece mobility can use a cached move count or approximate calculation.
- **Zobrist hash collisions (~1.5%).** A small fraction of TT lookups will return incorrect entries, causing occasional suboptimal play. Mitigation: this is standard practice in game engines; incorrect entries affect only one node's score, not move legality.
- **Increased code complexity.** The shared engine gains ~400 lines of new code (Zobrist table, TT, evaluation features). Mitigation: each component is independently testable and has clear module boundaries.
- **Behavioral change across all difficulty levels.** Players accustomed to current AI behavior will notice different play patterns. Mitigation: this is the intended outcome — the current behavior is broken (noise is ineffective). The new behavior will more accurately match the target Elo ratings established in ADR-005.
- **`DifficultyConfig` gains a new field.** Adding `featureScale` is backward-compatible (optional with default 1.0), but consumers must be updated to pass it through to evaluation. Mitigation: the frontend only uses pre-built `DIFFICULTY_CONFIGS` entries, which will include the field.

## Alternatives Considered

### Alternative 1: 64-bit Zobrist Hashing with BigInt

Use 64-bit hashes for a near-zero collision rate (~0.0000003% at 131K entries).

**Rejected because:**
- `BigInt` XOR is 3–5× slower than `number` XOR on V8, and worse on mobile JavaScript engines.
- At 50K–200K nodes/sec search rates, the overhead reduces effective search depth by 0.5–1 ply within typical time budgets.
- The 1.5% collision rate at 32 bits is standard practice in commercial game engines (including Stockfish's original implementation) and does not affect move legality.
- If collision rate becomes a problem (no evidence it will), a future migration to 64-bit is straightforward — the Zobrist table and TT entry format are internal implementation details.

### Alternative 2: JavaScript Map for Transposition Table

Use `Map<number, TtEntry>` with LRU eviction for simplicity.

**Rejected because:**
- Each Map entry creates a JavaScript object (~160 bytes overhead on V8), resulting in ~20 MB for 131K entries vs. 4 MB for ArrayBuffer.
- Object allocation and garbage collection cause unpredictable latency spikes during search — exactly when consistent performance matters most.
- LRU eviction adds complexity (doubly-linked list or access tracking) for no benefit over replace-always in an iterative deepening context.
- ArrayBuffer with DataView is well-supported in all target browsers and provides cache-friendly sequential access patterns.

### Alternative 3: Two Separate Evaluators (Material-Only and Full)

Create `evaluateMaterial()` for Easy/Medium and `evaluateFull()` for Hard, selected by difficulty level.

**Rejected because:**
- Binary choice (material-only vs. full) cannot express intermediate positions like Medium's "partial positional awareness."
- Two functions duplicate the material calculation and must be kept in sync.
- The `featureScale` approach (Decision 4) subsumes this: `featureScale = 0.0` is material-only, `featureScale = 1.0` is full, and any value in between is a valid intermediate.
- Testing burden doubles: two evaluation functions require two sets of evaluation tests.

### Alternative 4: Post-Search Move Randomization Instead of Leaf-Node Noise

Keep the current noise approach but apply it to move selection: after search, randomly deviate from the best move with probability proportional to score difference.

**Rejected because:**
- Post-search randomization is fundamentally limited: the search has already committed to a move ordering, so randomization can only choose among the root moves. It cannot cause the AI to "overlook" a tactic the way a human would.
- Leaf-node noise naturally propagates through the search tree via minimax backup, causing different lines to appear better or worse. This produces more natural-looking suboptimal play — the AI "thinks" a slightly worse move is actually better, rather than knowingly choosing a worse move.
- The current implementation demonstrates the failure mode: noise on the reported score has zero effect on which move is selected.

### Alternative 5: Web Worker for Search Computation

Run the AI search in a Web Worker to avoid blocking the main thread, enabling mid-search time cancellation.

**Rejected for this ADR because:**
- Web Worker adds cross-browser complexity (Safari's Web Worker limitations, SharedArrayBuffer restrictions, message serialization overhead for board state).
- The complete-depth time control (Decision 6) is sufficient for current time budgets (1–2 seconds) without mid-search cancellation.
- Web Worker is a valid future enhancement if search times increase (e.g., adding an "Advanced" difficulty at depth 7+), but is out of scope for the current difficulty improvement effort.
- The shared engine's zero-dependency constraint would require careful structuring of the worker entry point.

## Related

- [ADR-005: AI Difficulty Scaling Model](adr-005-difficulty-scaling.md) — establishes the target Elo ratings and parameter ranges that this ADR's enhancements must achieve
- [Feature Spec: AI Computer Opponent](../features/ai-computer-opponent.md)
- [Feature Spec: AI Difficulty Level Recalibration](../features/difficulty-calibration.md)
- Source: [shared/draughts-engine/src/ai/evaluation.ts](../../shared/draughts-engine/src/ai/evaluation.ts) — current evaluation function (5 features)
- Source: [shared/draughts-engine/src/ai/search.ts](../../shared/draughts-engine/src/ai/search.ts) — current alphaBeta with min-max formulation
- Source: [shared/draughts-engine/src/ai/difficulty.ts](../../shared/draughts-engine/src/ai/difficulty.ts) — `DifficultyConfig` interface and `DIFFICULTY_CONFIGS`
- Reference: [EVALUATION-WEIGHTS.md](../../EVALUATION-WEIGHTS.md) — C# evaluation weights defining the 9 features
