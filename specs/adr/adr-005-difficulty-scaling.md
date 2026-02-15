# ADR-005: AI Difficulty Scaling Model

## Status

Accepted

## Date

2026-02-15

## Context

The International Draughts application provides four AI difficulty levels: Easy, Medium, Hard, and Expert. The first three run client-side in the browser using the shared TypeScript engine (alpha-beta search with iterative deepening). Expert runs server-side with advanced search techniques (PVS, LMR, transposition tables, killer moves, history heuristic).

Each client-side difficulty is controlled by four parameters:

| Parameter | Purpose |
|-----------|---------|
| `maxDepth` | Maximum search depth in ply — controls tactical horizon |
| `noiseAmplitude` | Random perturbation added to evaluation scores (evaluation units) — degrades positional judgment |
| `blunderProbability` | Probability (0–1) of deliberately choosing a suboptimal move — simulates human mistakes |
| `blunderMargin` | Maximum score deficit (evaluation units) allowed when selecting a blunder candidate — controls mistake severity |

### Problem

The original difficulty calibration produced uneven Elo gaps between levels:

| Transition | Original Gap |
|------------|-------------|
| Easy (800) → Medium (1200) | 400 |
| Medium (1200) → Hard (1800) | 600 |
| Hard (1800) → Expert (2200) | 400 |

This created two concrete problems:

1. **The Medium → Hard jump (600 Elo) was too large.** Casual players who outgrew Medium were immediately overwhelmed by Hard, with no available intermediate challenge. This contributed to player churn at the critical mid-skill range.
2. **Easy (800 Elo) was not easy enough.** First-time players were routinely defeated by the Easy AI, undermining the onboarding goal that "an adult who has learned the rules should be able to beat Easy within their first few games" (PRD §4.12, REQ-72).

Additionally, Hard was configured with zero blunder parameters (`noiseAmplitude: 0`, `blunderProbability: 0`, `blunderMargin: 0`), meaning it played perfectly within its search depth. This made it disproportionately strong for a level intended to bridge the gap between casual and competitive play.

### Forces

- **Glicko-2 rating accuracy** depends on well-separated AI anchor ratings to produce meaningful player ratings.
- **Player retention** requires each difficulty transition to feel like a comparable, surmountable step up.
- **Implementation simplicity** favors a model that does not require runtime adaptation or player performance tracking.
- **Move legality** must never be compromised regardless of difficulty settings (REQ-73).
- **Client-side performance** constrains search depth — deeper searches on mobile devices cause unacceptable latency.
- **Expert is qualitatively different** — server-side deep search represents a fundamentally different architecture, not a linear extension of client-side scaling.

## Decision

**Use a linear parameter scaling model with uniform 500-Elo bands for client-side difficulties, with Expert as a separately-architected server-side tier.**

### Target Ratings and Bands

| Level | Rating | Elo Band | Environment |
|-------|--------|----------|-------------|
| Easy | 250 | 0–500 | Client-side |
| Medium | 750 | 500–1000 | Client-side |
| Hard | 1250 | 1000–1500 | Client-side |
| Expert | 2200 | *(separate tier)* | Server-side |

### Target Parameters

| Parameter | Easy | Medium | Hard |
|-----------|------|--------|------|
| `maxDepth` | 1 | 3 | 5 |
| `noiseAmplitude` | 300 | 120 | 30 |
| `blunderProbability` | 0.50 | 0.20 | 0.05 |
| `blunderMargin` | 350 | 200 | 75 |

### Key Design Choices

**1. Uniform 500-Elo bands for client-side levels.** Each client-side transition represents the same magnitude of strength increase (~500 Elo). This ensures that a player who has mastered one level faces a proportionate challenge at the next, and that the Glicko-2 rating system anchors are evenly distributed across the beginner-to-intermediate skill spectrum.

**2. Static parameters per level, not dynamic/adaptive.** Each difficulty level has fixed parameter values compiled into the shared engine. There is no runtime adjustment based on player performance, win rate, or rating. This was chosen because: (a) the Glicko-2 rating system already provides the feedback loop — players are directed to appropriate levels by their rating; (b) adaptive difficulty would make AI ratings meaningless as Glicko-2 anchors; (c) deterministic behavior simplifies testing, debugging, and player expectations.

**3. The 950-point gap between Hard (1250) and Expert (2200) is intentional.** Expert represents a qualitative leap in architecture (server-side deep search with PVS, LMR, transposition tables) rather than a quantitative increase in the same parameter space. The gap acknowledges that: (a) there is no client-side parameter combination that can produce 2200-level play within browser performance constraints; (b) Expert targets competitive/club-level players, a distinct audience from the casual-to-intermediate players served by Easy–Hard; (c) the gap leaves room for future intermediate levels (e.g., an "Advanced" tier at ~1750) if the player base demands it.

**4. Hard now has non-zero blunder parameters.** The previous Hard configuration (`blunderProbability: 0`, `noiseAmplitude: 0`) played perfectly within its search depth, producing play that was too strong for its intended 1000–1500 band. Introducing slight imprecision (`blunderProbability: 0.05`, `noiseAmplitude: 30`, `blunderMargin: 75`) brings Hard's effective strength down from ~1800 to ~1250 while maintaining strong, satisfying play. The blunders are subtle — a slightly inferior positional choice roughly once per 20 moves — rather than the obvious mistakes made by Easy and Medium.

**5. The existing blunder logic (static evaluation for candidate scoring) is sufficient.** When a blunder is triggered, the engine evaluates all legal moves using the static evaluation function (not a deep search) and selects a suboptimal move within the `blunderMargin`. This approach was retained because: (a) static eval closely approximates what a human "sees" at a glance, producing natural-looking mistakes; (b) deep-searching all moves for blunder selection would negate the performance benefit of reduced `maxDepth`; (c) the combination of `blunderMargin` (controlling which moves are eligible) and `blunderProbability` (controlling frequency) provides sufficient tuning granularity.

## Alternatives Considered

### Alternative 1: Adaptive Difficulty

Dynamically adjust AI parameters based on the player's recent win/loss record or in-game position assessment (e.g., increase blunder probability when the AI is winning, decrease it when losing).

**Rejected because:**
- Undermines the Glicko-2 rating system. If the AI's effective strength varies per player, its anchor rating becomes meaningless for rating calculations.
- Makes testing non-deterministic — the same position could produce different moves depending on player history.
- Adds complexity to the shared engine, which must remain a zero-dependency pure library.
- Players who notice adaptive difficulty often feel patronized ("the AI let me win"), which is worse for retention than honest difficulty levels.

### Alternative 2: Logarithmic Scaling

Use smaller Elo bands at lower levels and larger bands at higher levels (e.g., Easy: 0–300, Medium: 300–800, Hard: 800–1600).

**Rejected because:**
- The rationale for logarithmic scaling is that beginners perceive smaller skill differences more acutely. However, in draughts (unlike chess), the tactical complexity at lower levels is already constrained by the mandatory capture rule, which limits how subtly the AI can be weakened. Logarithmic scaling would compress the Easy and Medium bands to the point where they feel indistinguishable.
- Uniform bands are simpler to reason about, communicate to players, and use as Glicko-2 anchors.
- The 500-Elo band width was validated against the parameter space: each band can be achieved by a distinct, meaningful combination of depth, noise, and blunder settings.

### Alternative 3: More Granular Levels

Add one or more intermediate levels (e.g., "Intermediate" at ~1000 between Medium and Hard, or "Advanced" at ~1750 between Hard and Expert).

**Rejected for now because:**
- The current four-level structure is well-established in the UI, game setup flow, and rating system. Adding levels would require changes across the full stack (frontend components, backend API, Glicko-2 anchors, persistence).
- Three client-side levels with 500-Elo bands already cover the beginner-to-intermediate spectrum without gaps.
- The 950-point Hard → Expert gap is acknowledged and accepted (see Decision §3). If player feedback indicates demand, an "Advanced" level can be added as a future enhancement without restructuring the existing levels.

### Alternative 4: Elo-Based Parameter Interpolation

Define a mathematical function that computes `maxDepth`, `noiseAmplitude`, `blunderProbability`, and `blunderMargin` from a target Elo rating, enabling arbitrary difficulty selection (e.g., a slider from 0 to 2200).

**Rejected because:**
- The relationship between parameters and effective Elo is non-linear and context-dependent. A formula that works for one evaluation function or set of game positions may be inaccurate for others. Calibration would require extensive empirical testing that is equivalent to hand-tuning.
- A continuous slider would make the Glicko-2 anchor system impractical — the AI's rating would need to match the slider position exactly, and players could game the system by sliding to advantageous ratings.
- Discrete levels are simpler for players to understand, select, and discuss ("I can beat Medium but not Hard" vs. "I set the slider to 742").
- The four discrete levels can be tuned individually by playtesting, which is more reliable than a formula for achieving target play styles.

## Consequences

### Positive

- **Smoother difficulty progression.** The uniform 500-Elo gaps eliminate the felt spike at Medium → Hard and make Easy genuinely accessible to beginners.
- **Better Glicko-2 convergence.** Evenly-spaced AI anchors (250, 750, 1250) provide cleaner rating signal across the full beginner-to-intermediate range, helping player ratings converge faster and more accurately.
- **Preserves architectural simplicity.** No new interfaces, runtime configuration, or adaptive logic. The change is values-only in two configuration objects (`DIFFICULTY_CONFIGS` and `AI_RATINGS`).
- **Improved response times.** Lower `maxDepth` values for Easy (1) and Medium (3) reduce computation time, especially on mobile devices.
- **Tuning flexibility preserved.** If playtesting reveals a level is miscalibrated, individual parameters can be adjusted independently following the tuning priority order: `blunderProbability` → `noiseAmplitude` → `blunderMargin` → `maxDepth`.

### Negative

- **Existing player ratings are invalidated.** Players whose Glicko-2 ratings were calibrated against the old AI anchors (800/1200/1800) will have inflated ratings relative to the new scale. Mitigation: reset all player ratings to defaults (1500 ± 350 RD) on deployment, or accept temporary inaccuracy and let ratings self-correct over 10–20 games.
- **950-point gap between Hard and Expert.** There is no client-side level serving the 1500–2200 range. Players who master Hard but are not ready for Expert have no intermediate step. Mitigation: this is a known and accepted trade-off (see Decision §3); an intermediate level can be added later.
- **Hard behavior change.** Players accustomed to Hard playing "perfectly within its depth" will notice occasional suboptimal moves. Mitigation: the blunder frequency is very low (5%) and the margin is small (75 eu), so the behavior change is subtle and produces more realistic-feeling play.
- **Blunder logic uses static eval, not search eval.** Blunder candidate scoring uses the static evaluation function rather than the result of the deep search. In positions where the static eval significantly disagrees with the search eval, the blunder selection may not accurately reflect the true quality hierarchy of moves. Mitigation: this inaccuracy is acceptable for lower difficulties and actually contributes to the "human-like mistakes" goal (REQ-72), since human blunders are often based on superficial position assessment.

## Related

- [Feature Spec: AI Difficulty Level Recalibration](../features/difficulty-calibration.md)
- [Feature Spec: AI Computer Opponent](../features/ai-computer-opponent.md)
- [PRD §4.12: AI Difficulty Scaling Strategy](../prd.md) — REQ-71, REQ-72, REQ-73
- [PRD §4.13: Player Rating System](../prd.md) — REQ-74, REQ-76
- [Task 012: Client AI Engine](../tasks/012-task-client-ai-engine.md)
- Source: [shared/draughts-engine/src/ai/difficulty.ts](../../shared/draughts-engine/src/ai/difficulty.ts) — `DIFFICULTY_CONFIGS`
- Source: [shared/draughts-engine/src/ai/search.ts](../../shared/draughts-engine/src/ai/search.ts) — `applyBlunderLogic()`
- Source: [shared/draughts-engine/src/rating/glicko2.ts](../../shared/draughts-engine/src/rating/glicko2.ts) — `AI_RATINGS`
