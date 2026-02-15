# Feature: AI Difficulty Scaling v2 — Evaluation & Noise Redesign

**Feature ID:** `difficulty-scaling-v2`  
**PRD Version:** 2.0  
**Last Updated:** 2026-02-15  
**Status:** Draft  
**Parent Feature:** `ai-computer-opponent`  
**Supersedes:** `difficulty-calibration` (parameter-only tuning)

---

## 1. Overview

### 1.1 Summary

Redesign the client-side AI difficulty system to produce natural, human-like play at
each difficulty level. This involves three coordinated changes:

1. **Evaluation enrichment** — Port 8 positional evaluation features from the Expert
   engine (C# backend) to the shared TypeScript engine, and scale their influence by
   difficulty level.
2. **Search enhancements** — Add a transposition table and killer move tracking for
   Hard difficulty to improve play quality without increasing search depth.
3. **Noise/blunder redesign** — Apply evaluation noise during search (at leaf nodes)
   instead of only after search, eliminating the binary "perfect or terrible" behavior.

### 1.2 Problem Statement

The current difficulty scaling (implemented in `difficulty-calibration`) adjusted only
four parameters (`maxDepth`, `noiseAmplitude`, `blunderProbability`, `blunderMargin`).
While this successfully redistributed the difficulty levels into 500-Elo bands, testing
reveals five fundamental design flaws:

| # | Problem | Impact |
|---|---------|--------|
| P1 | All client-side levels play too weak — excessive blundering needed to hit target Elo | Players feel the AI is "drunk", not "easy" |
| P2 | Binary behavior: AI plays perfectly most of the time, then makes random terrible moves | Unnatural, frustrating experience |
| P3 | Primitive evaluation: only 6 features vs Expert's 18 | Even at full depth, client AI has poor positional understanding |
| P4 | `noiseAmplitude` only modifies the reported score, not move selection when blunder roll fails | Medium plays at full depth-3 strength 80% of the time; Hard at full depth-5 strength 95% of the time |
| P5 | No search enhancements (TT, killer moves) for Hard | Hard cannot play good positional draughts; it wastes search effort re-evaluating the same positions |

### 1.3 Proposed Solution

Rather than relying solely on blunder injection to weaken play, the redesign introduces
**continuous degradation** of the AI's judgment through three complementary mechanisms:

- **Evaluation feature scaling** (`evalFeatureScale`): Lower difficulties use fewer
  positional features, yielding genuinely weaker evaluation rather than artificially
  noised-up strong evaluation.
- **Leaf-node noise** (`noiseAmplitude` applied during search): Every leaf evaluation
  is perturbed by a random amount, causing the search to naturally prefer slightly
  wrong moves. This produces smooth, natural imprecision instead of abrupt blunders.
- **Reduced blunder probability**: With continuous noise doing most of the weakening,
  discrete blunders are only needed occasionally for the lowest difficulty.

### 1.4 Goals

| # | Goal | Success Metric |
|---|------|---------------|
| G1 | Natural play at all levels | ≥75% of playtesters rate AI behavior as "human-like" across all difficulties |
| G2 | Correct Elo bands | Each level plays within its target 500-Elo band (validated by engine-vs-engine testing) |
| G3 | Smooth difficulty progression | Elo gap between adjacent levels is 400–600 points |
| G4 | No correctness regressions | Zero illegal moves at any difficulty; all existing tests pass |
| G5 | Acceptable performance | Client-side AI responds in <3s on mid-range hardware at all difficulty levels |

---

## 2. User Personas

### 2.1 Casual Player (Easy / Medium)

- **Profile:** A child or adult who has recently learned the rules; plays for fun in
  short sessions.
- **Needs:** An opponent that plays like a human beginner — makes natural-looking
  positional mistakes, occasionally misses captures, but never plays randomly.
- **Pain point with current system:** Easy/Medium alternate between perfect play and
  nonsensical blunders. Wins feel unearned; losses feel unfair.

### 2.2 Intermediate Player (Hard)

- **Profile:** A regular player who understands positional concepts (centre control,
  piece structure, king mobility). Has beaten Medium consistently and wants to improve.
- **Needs:** A challenging opponent with good positional judgment that occasionally
  makes subtle tactical mistakes — similar to a strong club player having a distracted
  day.
- **Pain point with current system:** Hard plays with no positional understanding
  (only 6 eval features) but perfect tactical execution within its depth. It feels
  like playing a calculator, not a draughts player.

### 2.3 Advanced Player (Expert)

- **Profile:** Active competitive player or coach at club/tournament level.
- **Needs:** Near-championship-level opposition.
- **Impact of this feature:** None — Expert is server-side and out of scope.

---

## 3. Functional Requirements

### FR-1: Evaluation Feature Enrichment

**Source files:** `shared/draughts-engine/src/ai/evaluation.ts`

Port the following 8 evaluation features from the Expert engine
(`backend/src/InternationalDraughts.Application/ExpertAi/Evaluator.cs`) to the shared
TypeScript evaluation function:

| Feature | Weight (eu) | Description | Expert Source |
|---------|-------------|-------------|---------------|
| Regular piece mobility | 1 eu/move | Count of available moves for each regular piece | `ManMobility` |
| King mobility | 2 eu/move | Count of available moves for each king | `KingMobility` |
| Piece structure | 4 eu | Bonus for each piece with an adjacent friendly piece | `PieceStructure` |
| First king advantage bonus | 50 eu | Bonus when you have the only king(s) on the board | `FirstKingBonus` |
| Locked position penalty | 10 eu | Penalty when a side has ≤2 moves but >2 pieces | `LockedPositionPenalty` |
| Runaway regular piece bonus | 30 eu | Bonus for a regular piece that cannot be stopped from promoting | `RunawayManBonus` |
| Tempo diagonal | 2 eu | Bonus for pieces on the main diagonals (row == col or row + col == 9) | `TempoDiagonal` |
| Endgame king advantage | 20 eu | Additional king value when total pieces ≤10 | `EndgameKingAdvantage` |
| Left/right balance | 3 eu | Penalty for imbalanced piece distribution across left/right halves | `LeftRightBalance` |

**Acceptance criteria:**
- Each feature uses the same logic and weight as the Expert C# implementation.
- The `evaluate()` function accepts an optional `featureScale` parameter (0.0–1.0)
  that scales all positional weights (material weights are always at 100%).
- When `featureScale = 0.0`, evaluation is equivalent to the current `quickEvaluate()`
  (material only).
- When `featureScale = 1.0`, evaluation uses all features at their full weights.
- The existing `quickEvaluate()` function remains unchanged (used for move ordering).

### FR-2: Evaluation Feature Scaling by Difficulty

**Source files:** `shared/draughts-engine/src/ai/difficulty.ts`

Add an `evalFeatureScale` parameter to `DifficultyConfig`:

| Difficulty | `evalFeatureScale` | Effect |
|------------|-------------------|--------|
| Easy | 0.0 | Material-only evaluation (like current `quickEvaluate`) |
| Medium | 0.5 | Material + 50% positional weight |
| Hard | 1.0 | Full positional evaluation (all features at 100%) |

**Acceptance criteria:**
- `DifficultyConfig` interface includes `evalFeatureScale: number` (range 0.0–1.0).
- The search function passes `evalFeatureScale` to the evaluation function at each
  leaf node.
- Easy genuinely cannot "see" positional concepts; it only optimizes for material.
- Medium has partial awareness of positional factors, producing subtle positional
  misjudgments.

### FR-3: Leaf-Node Evaluation Noise

**Source files:**  
- `shared/draughts-engine/src/ai/search.ts`
- `shared/draughts-engine/src/ai/difficulty.ts`

Redesign the noise mechanism to apply during search rather than only after:

- **Current behavior:** `noiseAmplitude` is added to the final score after the search
  completes. This only affects score reporting, not move selection (when blunder roll
  fails).
- **New behavior:** `noiseAmplitude` is added to every leaf-node evaluation during the
  alpha-beta search. Each leaf node receives a random perturbation drawn from a uniform
  distribution in the range `[-noiseAmplitude, +noiseAmplitude]`.

**Acceptance criteria:**
- Every call to `evaluate()` within `alphaBeta()` at depth 0 adds a random noise term
  of `(Math.random() - 0.5) * 2 * config.noiseAmplitude`.
- Noise is applied **before** alpha-beta comparisons, so it genuinely affects move
  selection.
- The noise is stateless — no seed or determinism required (randomness is desirable).
- At `noiseAmplitude = 0`, behavior is identical to no noise (Expert-compatible).
- High noise (Easy: 200 eu) causes the AI to frequently misjudge positions by the
  equivalent of ~2 regular pieces, producing beginner-level errors organically.
- Low noise (Hard: 15 eu) causes occasional minor misjudgments (~0.15 regular pieces) without
  producing obviously bad moves.

### FR-4: Search Enhancements for Hard

**Source files:** `shared/draughts-engine/src/ai/search.ts`

Add two search enhancements, enabled only for Hard difficulty:

#### FR-4.1: Transposition Table

- Implement a hash-map-based transposition table with a configurable maximum size.
- Size: 2–4 MB (~65,536 to ~131,072 entries at 32–64 bytes per entry).
- Store: board hash, search depth, score, score type (exact/alpha/beta), best move.
- Use Zobrist hashing for board positions.
- The table is cleared between moves (stateless API design).
- Enabled via `useTranspositionTable: boolean` in `DifficultyConfig`.

**Acceptance criteria:**
- When enabled, the transposition table reduces the number of nodes evaluated by ≥30%
  on average for depth-6 searches.
- When disabled (`false` for Easy/Medium), there is zero performance overhead — no
  hash computation, no table lookups.
- Table entries do not persist between `findBestMove()` calls.
- No correctness regressions: the same position must never return an illegal move.

#### FR-4.2: Killer Move Tracking

- Track the two most recent moves that caused beta cutoffs at each depth (killer
  moves).
- Use killer moves to improve move ordering: after captures and before other quiet
  moves.
- Enabled via `useKillerMoves: boolean` in `DifficultyConfig`.

**Acceptance criteria:**
- When enabled, killer move ordering reduces the number of nodes evaluated by ≥15%
  on average for depth-6 searches.
- When disabled, there is zero overhead.
- Killer moves are reset between top-level `findBestMove()` calls.

### FR-5: Updated Difficulty Parameters

**Source files:** `shared/draughts-engine/src/ai/difficulty.ts`

Replace the current `DIFFICULTY_CONFIGS` with updated values that incorporate all new
parameters:

| Parameter | Easy | Medium | Hard |
|-----------|------|--------|------|
| `maxDepth` | 2 | 4 | 6 |
| `timeLimitMs` | 1000 | 2000 | 3000 |
| `noiseAmplitude` (leaf eval) | 200 | 60 | 15 |
| `blunderProbability` | 0.30 | 0.08 | 0.02 |
| `blunderMargin` | 250 | 120 | 50 |
| `evalFeatureScale` | 0.0 | 0.5 | 1.0 |
| `useTranspositionTable` | `false` | `false` | `true` |
| `useKillerMoves` | `false` | `false` | `true` |

**Key changes from v1:**
- `maxDepth` increased across all levels (+1 each) because leaf noise and reduced
  eval features now provide the primary weakening.
- `blunderProbability` significantly reduced (Easy: 0.50 → 0.30, Medium: 0.20 → 0.08,
  Hard: 0.05 → 0.02) because continuous noise handles most of the natural weakening.
- `noiseAmplitude` values redesigned for leaf-node application instead of post-search.

**Acceptance criteria:**
- All existing difficulty-related tests are updated to reflect new parameter values.
- New parameters (`evalFeatureScale`, `useTranspositionTable`, `useKillerMoves`) are
  included in the `DifficultyConfig` interface and all config objects.
- `getDifficultyConfig()` continues to work unchanged.

### FR-6: DifficultyConfig Interface Changes

**Source files:** `shared/draughts-engine/src/ai/difficulty.ts`

Update the `DifficultyConfig` interface:

```typescript
export interface DifficultyConfig {
  /** Display name */
  readonly name: string;
  /** Maximum search depth (ply) */
  readonly maxDepth: number;
  /** Time limit per move in milliseconds */
  readonly timeLimitMs: number;
  /** Evaluation noise amplitude applied to every leaf-node evaluation (evaluation units) */
  readonly noiseAmplitude: number;
  /** Probability of making a deliberate blunder (0-1) */
  readonly blunderProbability: number;
  /** Score margin for blunder selection (evaluation units) */
  readonly blunderMargin: number;
  /** Positional evaluation feature scale (0.0 = material only, 1.0 = full) */
  readonly evalFeatureScale: number;
  /** Enable transposition table for search */
  readonly useTranspositionTable: boolean;
  /** Enable killer move tracking for search */
  readonly useKillerMoves: boolean;
}
```

**Acceptance criteria:**
- New fields are `readonly`.
- JSDoc comments describe the semantics clearly.
- The change is fully backward-compatible: any code that constructs a
  `DifficultyConfig` manually must be updated, but the runtime API (`getDifficultyConfig`)
  is unchanged.

---

## 4. Non-Functional Requirements

### NFR-1: Performance

| Constraint | Requirement |
|------------|-------------|
| Easy move time | < 500 ms on mid-range mobile device |
| Medium move time | < 1.5 s on mid-range mobile device |
| Hard move time | < 3 s on mid-range mobile device |
| Transposition table memory | ≤ 4 MB |
| No main-thread blocking | AI runs in the existing Web Worker; no change to architecture |

### NFR-2: Bundle Size

- The additional evaluation features and search enhancements must add no more than
  **5 KB** (gzip) to the shared engine bundle.
- No new runtime dependencies (shared engine remains zero-dependency).

### NFR-3: Correctness

- Zero illegal moves at any difficulty level under any circumstances.
- All game outcome detection (win, draw, threefold repetition, 25-move rule, 16-move
  rule) remains unaffected.
- Noise and reduced evaluation must never cause the AI to attempt an illegal move.

### NFR-4: Testability

- Evaluation noise must be injectable (accept an optional random function parameter)
  to enable deterministic testing.
- Transposition table and killer move tracking must be independently testable.
- All new evaluation features must be unit-testable in isolation.

### NFR-5: Compatibility

- Expert difficulty (server-side) is completely unaffected.
- The `findBestMove()` API signature remains backward-compatible.
- Frontend game components require no changes other than potentially updated
  difficulty labels/descriptions.

---

## 5. Acceptance Criteria

### AC-1: Elo Band Validation

- Run 200-game engine-vs-engine tournament (Stockfish or self-play at calibrated
  strength) for each difficulty level.
- **Easy** must score within the 0–500 Elo band (target ~250).
- **Medium** must score within the 500–1000 Elo band (target ~750).
- **Hard** must score within the 1000–1500 Elo band (target ~1250).

### AC-2: Natural Play Behavior

- Over a 50-game sample at each difficulty level:
  - The AI never plays more than 5 consecutive "perfect" moves followed by a gross
    blunder (binary behavior eliminated).
  - Easy makes positional misjudgments on ≥60% of moves (due to material-only eval +
    high noise).
  - Hard makes subtle misjudgments on ~10–20% of moves (due to low noise + full eval).

### AC-3: Performance

- Hard difficulty with transposition table and killer moves completes a depth-6 search
  in < 3 seconds on a device with ≥2 GHz CPU (measured as 95th percentile over 100
  test positions).
- Easy completes a depth-2 search in < 500 ms.

### AC-4: Evaluation Feature Parity

- For 20 test positions, the TypeScript `evaluate()` with `featureScale = 1.0`
  produces scores within ±5 eu of the C# Expert `Evaluator.Evaluate()` (accounting
  for rounding differences).

### AC-5: Search Enhancement Effectiveness

- Transposition table reduces node count by ≥30% on average for depth-6 search over
  50 test positions.
- Killer move ordering reduces node count by ≥15% over the same test set.

### AC-6: Regression

- All 190 existing shared engine tests pass without modification (except
  difficulty-config tests that check specific parameter values).
- All 162 existing frontend tests pass.
- All 192 existing backend tests pass (backend is unmodified).
- Zero TypeScript type errors, zero ESLint errors.

---

## 6. Dependencies

### 6.1 Internal Dependencies

| Dependency | Description | Status |
|------------|-------------|--------|
| `difficulty-calibration` | Current parameter-only tuning; this feature supersedes it | Implemented |
| Expert AI evaluation (C#) | Source of truth for evaluation features being ported | Implemented |
| Shared engine test suite | Must be extended for new features | Existing |
| Glicko-2 rating system | AI anchor ratings may need updating after Elo validation | Implemented |

### 6.2 Technical Dependencies

| Dependency | Description |
|------------|-------------|
| Zobrist hashing | Required for transposition table; must be implemented for the 10×10 board |
| `move-generator.ts` | Used by mobility evaluation features; already exists |
| Web Worker | AI already runs in a worker; no changes needed |

### 6.3 Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Evaluation porting introduces bugs | Medium | High | Unit test each feature against C# output for known positions |
| Transposition table causes memory issues on low-end devices | Low | Medium | Cap table at 4 MB; use LRU or replace-by-depth policy |
| Noise + reduced eval makes levels too weak | Medium | Medium | Tune parameters via engine-vs-engine testing before release |
| Performance regression from richer evaluation | Low | Medium | Profile before/after; evaluation is O(50) per call (one pass over squares) |

---

## 7. Out of Scope

| Item | Rationale |
|------|-----------|
| Expert difficulty changes | Expert is server-side, already calibrated at ~2200 Elo, uses its own C# engine |
| Adaptive difficulty | Undermines Glicko-2 rating anchors; rejected in ADR-005 |
| Opening book for client-side | Adds complexity and bundle size; not needed for target Elo bands |
| Endgame tablebases for client-side | Too large for browser; Expert handles endgames server-side |
| New difficulty levels (e.g., "Advanced" at ~1750) | Future consideration if player demand warrants it |
| UI changes beyond difficulty descriptions | Components work with existing `DifficultyConfig`; no new UI needed |
| Deterministic/seeded randomness | Noise is intentionally random; test determinism handled via injectable RNG |

---

## 8. Implementation Notes

### 8.1 Suggested Implementation Order

1. **FR-1 (Evaluation enrichment)** — Port features, add `featureScale` parameter,
   write unit tests against C# reference values.
2. **FR-3 (Leaf-node noise)** — Modify `alphaBeta()` to accept noise config and apply
   at depth 0. This is a small, isolated change.
3. **FR-6 + FR-5 (Interface + parameters)** — Update `DifficultyConfig` and
   `DIFFICULTY_CONFIGS`. Update tests.
4. **FR-2 (Feature scaling)** — Wire `evalFeatureScale` through from config to
   evaluation. Verify Easy is material-only, Hard is full eval.
5. **FR-4 (Search enhancements)** — Implement Zobrist hashing, transposition table,
   killer moves. These are independent of evaluation changes.
6. **Elo validation** — Run engine-vs-engine tournaments to validate bands and tune
   parameters if needed.

### 8.2 Files Modified

| File | Changes |
|------|---------|
| `shared/draughts-engine/src/ai/evaluation.ts` | Add 8 evaluation features; add `featureScale` parameter |
| `shared/draughts-engine/src/ai/search.ts` | Apply leaf noise; integrate TT and killer moves; pass config through |
| `shared/draughts-engine/src/ai/difficulty.ts` | Extend `DifficultyConfig` interface; update `DIFFICULTY_CONFIGS` |
| `shared/draughts-engine/src/ai/zobrist.ts` | **New file** — Zobrist hash initialization and incremental update |
| `shared/draughts-engine/src/ai/transposition-table.ts` | **New file** — TT implementation |
| `shared/draughts-engine/src/ai/killer-moves.ts` | **New file** — Killer move tracker |
| `shared/draughts-engine/src/index.ts` | Export new types |
| `shared/draughts-engine/tests/ai/evaluation.test.ts` | Tests for new features and feature scaling |
| `shared/draughts-engine/tests/ai/search.test.ts` | Tests for leaf noise, TT, killer moves |
| `shared/draughts-engine/tests/ai/transposition-table.test.ts` | **New file** — TT unit tests |
| `shared/draughts-engine/tests/ai/killer-moves.test.ts` | **New file** — Killer move unit tests |

### 8.3 ADR Reference

This feature implements the approach decided in [ADR-005: AI Difficulty Scaling Model](../adr/adr-005-difficulty-scaling.md),
extending it with evaluation enrichment and noise redesign to address the behavioral
quality issues identified during playtesting.
