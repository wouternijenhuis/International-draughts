# Feature: AI Difficulty Level Recalibration

**Feature ID:** `difficulty-calibration`  
**PRD Version:** 1.0  
**Last Updated:** 2026-02-15  
**Status:** Draft  
**Parent Feature:** `ai-computer-opponent`

---

## 1. Feature Overview

### 1.1 Summary

Recalibrate the four AI difficulty levels (Easy, Medium, Hard, Expert) so that each
client-side level occupies a well-defined 500-Elo band, producing a smooth and
predictable difficulty progression from absolute beginner to advanced player. Expert
remains unchanged at 2200 Elo (server-side).

### 1.2 Business Justification

The current difficulty curve has uneven Elo gaps between levels (Easy → Medium: 400,
Medium → Hard: 600, Hard → Expert: 400). This creates two problems:

1. **Player frustration at the Medium → Hard jump.** The 600-point gap means many
   casual players who have outgrown Medium are immediately crushed by Hard, with no
   intermediate challenge available. This leads to player churn.
2. **Easy is not easy enough.** At 800 Elo, the Easy AI still defeats most first-time
   players, undermining the onboarding experience described in the PRD ("an adult who
   has learned the rules should be able to beat Easy within their first few games").

By rebalancing all three client-side levels to uniform 500-point bands and lowering
their anchor ratings, we:

- Make Easy genuinely accessible to complete beginners (target ~250 Elo).
- Give casual players a comfortable home at Medium (~750 Elo).
- Position Hard as a meaningful stepping stone (~1250 Elo) before Expert (2200 Elo).
- Ensure the Glicko-2 rating system produces accurate, well-separated player ratings
  because the AI anchors are evenly distributed across the skill spectrum.

### 1.3 Goals

| # | Goal | Success Metric |
|---|------|---------------|
| G1 | Smooth difficulty progression | Elo bands are equidistant (500 pts each) for client-side levels |
| G2 | Beginner accessibility | ≥80% of first-time players beat Easy within 3 games |
| G3 | Accurate rating anchoring | Player Glicko-2 ratings converge faster due to better-spaced AI anchors |
| G4 | Zero regression in correctness | No illegal moves at any difficulty level |

---

## 2. PRD Traceability

| PRD Req | Description | How This Feature Addresses It |
|---------|-------------|-------------------------------|
| **REQ-15** | Four difficulty levels with clearly differentiated playing strength | Redefines each level to occupy a distinct 500-Elo band, ensuring clear differentiation |
| **REQ-71** | Configurable difficulty tuning (depth, noise, randomness) without code changes | All tuning parameters remain in the `DIFFICULTY_CONFIGS` configuration object; only values change |
| **REQ-72** | Easy/Medium make human-like mistakes, not random moves | Blunder logic is preserved and refined — blunders select suboptimal-but-legal moves within a score margin, never random moves |
| **REQ-73** | Difficulty controlled by search depth, eval quality, imprecision — never by breaking rules | Parameters adjusted are exclusively `maxDepth`, `noiseAmplitude`, `blunderProbability`, and `blunderMargin`; move legality enforcement is untouched |

---

## 3. User Personas

### 3.1 Absolute Beginner (Easy — 0–500 Elo band)

- Has just learned the rules of International Draughts.
- May not yet understand mandatory capture or the maximum-capture rule.
- Expects to win some games early on to build confidence.
- Typical profile: a child, a casual board-game player trying draughts for the first time, or someone using the tutorial/learning mode.

### 3.2 Casual Player (Medium — 500–1000 Elo band)

- Knows the rules and basic tactics (simple captures, piece advancement).
- Does not study openings or positional theory.
- Plays for fun in short sessions; expects roughly even games.
- Typical profile: an adult who plays board games occasionally, a returning player who hasn't played draughts in years.

### 3.3 Experienced Player (Hard — 1000–1500 Elo band)

- Understands positional concepts (centre control, king mobility, piece structure).
- Can execute multi-move tactical combinations.
- Seeks a genuine challenge but is not at club-tournament level.
- Typical profile: a regular player who has beaten Medium consistently and wants to improve, an ex-club player.

### 3.4 Competitive Player (Expert — 2200 Elo)

- Plays at club or tournament level.
- Studies openings, endgames, and advanced positional theory.
- Wants near-championship-level opposition.
- Typical profile: an active competitive player, a draughts coach testing lines.

---

## 4. Current vs Target State

### 4.1 Glicko-2 Ratings

| Level | Current Rating | Target Rating | Band | Change |
|-------|---------------|--------------|------|--------|
| Easy | 800 | **250** | 0–500 | −550 |
| Medium | 1200 | **750** | 500–1000 | −450 |
| Hard | 1800 | **1250** | 1000–1500 | −550 |
| Expert | 2200 | **2200** | *(unchanged)* | 0 |

**Rating gaps (current → target):**

| Transition | Current Gap | Target Gap |
|------------|------------|------------|
| Easy → Medium | 400 | **500** |
| Medium → Hard | 600 | **500** |
| Hard → Expert | 400 | **950** |

> The Hard → Expert gap (950 points) is intentionally larger. Expert represents
> near-championship-level play and is a qualitative leap (server-side deep search)
> rather than a linear continuation of the client-side difficulty curve.

### 4.2 Search & Imprecision Parameters

| Parameter | Easy (current → target) | Medium (current → target) | Hard (current → target) | Expert |
|-----------|------------------------|--------------------------|------------------------|--------|
| `maxDepth` | 2 → **1** | 5 → **3** | 8 → **5** | Server-side (unchanged) |
| `timeLimitMs` | 1000 → **1000** | 1500 → **1500** | 2000 → **2000** | Server-side (unchanged) |
| `noiseAmplitude` | 150 → **300** | 50 → **120** | 0 → **30** | 0 (unchanged) |
| `blunderProbability` | 0.35 → **0.50** | 0.10 → **0.20** | 0 → **0.05** | 0 (unchanged) |
| `blunderMargin` | 200 → **350** | 100 → **200** | 0 → **75** | 0 (unchanged) |

---

## 5. Functional Requirements

### FR-1: Update AI Rating Anchors

**Source:** `shared/draughts-engine/src/rating/glicko2.ts` — `AI_RATINGS`

Update the `AI_RATINGS` constant:

```typescript
export const AI_RATINGS: Record<string, { rating: number; rd: number }> = {
  easy:   { rating: 250,  rd: 0 },
  medium: { rating: 750,  rd: 0 },
  hard:   { rating: 1250, rd: 0 },
  expert: { rating: 2200, rd: 0 },
};
```

**Rationale:** These values serve as the anchors for the Glicko-2 rating system. When
a player beats or loses to an AI level, the rating adjustment depends on the AI's
rating. Correct anchors ensure player ratings are meaningful.

### FR-2: Update Difficulty Configurations

**Source:** `shared/draughts-engine/src/ai/difficulty.ts` — `DIFFICULTY_CONFIGS`

Update the `DIFFICULTY_CONFIGS` constant with the new parameter values:

```typescript
export const DIFFICULTY_CONFIGS: Record<string, DifficultyConfig> = {
  easy: {
    name: 'Easy',
    maxDepth: 1,
    timeLimitMs: 1000,
    noiseAmplitude: 300,
    blunderProbability: 0.50,
    blunderMargin: 350,
  },
  medium: {
    name: 'Medium',
    maxDepth: 3,
    timeLimitMs: 1500,
    noiseAmplitude: 120,
    blunderProbability: 0.20,
    blunderMargin: 200,
  },
  hard: {
    name: 'Hard',
    maxDepth: 5,
    timeLimitMs: 2000,
    noiseAmplitude: 30,
    blunderProbability: 0.05,
    blunderMargin: 75,
  },
};
```

#### FR-2.1: Easy (~250 Elo) Parameter Rationale

| Parameter | Value | Effect |
|-----------|-------|--------|
| `maxDepth: 1` | Single-ply search | AI sees only immediate captures and moves; cannot plan ahead |
| `noiseAmplitude: 300` | ±300 centipawn score noise | Heavily distorts position evaluation, making move selection nearly random among close alternatives |
| `blunderProbability: 0.50` | 50% chance per move | Half the time, AI deliberately picks a suboptimal move from the candidate list |
| `blunderMargin: 350` | Up to 350cp worse move | When blundering, AI may select moves that are significantly inferior, simulating a beginner missing key captures |

#### FR-2.2: Medium (~750 Elo) Parameter Rationale

| Parameter | Value | Effect |
|-----------|-------|--------|
| `maxDepth: 3` | Three-ply search | AI sees simple two-move tactics but misses deeper combinations |
| `noiseAmplitude: 120` | ±120 centipawn score noise | Moderate evaluation imprecision; AI sometimes misjudges positions |
| `blunderProbability: 0.20` | 20% chance per move | One in five moves is deliberately suboptimal, simulating a casual player's occasional oversight |
| `blunderMargin: 200` | Up to 200cp worse move | Blunders are noticeable but not catastrophic, mimicking a player who overlooks a tactic |

#### FR-2.3: Hard (~1250 Elo) Parameter Rationale

| Parameter | Value | Effect |
|-----------|-------|--------|
| `maxDepth: 5` | Five-ply search | AI calculates short tactical sequences; strong but not exhaustive |
| `noiseAmplitude: 30` | ±30 centipawn score noise | Slight positional imprecision; AI occasionally misjudges close positions |
| `blunderProbability: 0.05` | 5% chance per move | Rare blunders (~1 per 20 moves), simulating an experienced player's occasional lapse |
| `blunderMargin: 75` | Up to 75cp worse move | Blunders are subtle — a slightly inferior positional choice rather than a tactical miss |

#### FR-2.4: Expert (~2200 Elo) — No Changes

Expert difficulty runs server-side with deep search (iterative deepening, PVS, LMR,
transposition tables, killer moves, history heuristic). No parameter changes are
required. The Expert AI configuration is managed in the backend
(`InternationalDraughts.Application/ExpertAi/`).

### FR-3: Preserve Existing `DifficultyConfig` Interface

The `DifficultyConfig` interface (fields: `name`, `maxDepth`, `timeLimitMs`,
`noiseAmplitude`, `blunderProbability`, `blunderMargin`) must not be modified. This
change is values-only; no structural changes to the configuration system are needed.

### FR-4: Preserve Rated-Game Logic

The function `isRatedGame()` in `glicko2.ts` determines which difficulties count
toward player ratings. Its behaviour must remain unchanged — only Medium, Hard, and
Expert games affect player ratings. Easy games remain unrated.

### FR-5: Update Any UI or Documentation Referencing Old Ratings

If any UI component, tooltip, or documentation displays difficulty-specific Elo values
(e.g., "~800 Elo"), those references must be updated to reflect the new ratings.

---

## 6. Non-Functional Requirements

### NFR-1: Response Time

All client-side AI levels (Easy, Medium, Hard) must return a move within **2 seconds**
on a modern device (2020+ smartphone or equivalent). The reduced search depths make
this easier to achieve than the current configuration.

| Level | `maxDepth` | `timeLimitMs` | Expected Response |
|-------|-----------|--------------|-------------------|
| Easy | 1 | 1000 | < 100ms |
| Medium | 3 | 1500 | < 500ms |
| Hard | 5 | 2000 | < 1500ms |

### NFR-2: Move Legality

The AI must never produce an illegal move at any difficulty level. Blunder logic
selects from the set of legal moves only; it never bypasses move validation. All
mandatory-capture and maximum-capture rules remain enforced regardless of difficulty
parameters.

### NFR-3: Deterministic Configuration

Difficulty parameters are defined as compile-time constants in the shared engine's
`DIFFICULTY_CONFIGS` object. No runtime configuration file or environment variable is
needed for this change. Future work (REQ-71) may externalize these values, but that is
out of scope for this feature.

### NFR-4: Cross-Platform Consistency

Because the shared engine runs in both browser and Node.js environments, the
recalibrated parameters must produce consistent playing strength across all supported
platforms (desktop browser, mobile browser, PWA).

### NFR-5: No Impact on Expert AI

The Expert AI (server-side) is not affected by this change. Its rating anchor (2200),
search algorithm, and evaluation function remain entirely unchanged.

---

## 7. Acceptance Criteria

### AC-1: Parameter Values Match Specification

**Given** the shared engine source code  
**When** inspecting `DIFFICULTY_CONFIGS` in `shared/draughts-engine/src/ai/difficulty.ts`  
**Then** the values match the target parameters defined in §5 (FR-2)

### AC-2: Rating Anchors Match Specification

**Given** the shared engine source code  
**When** inspecting `AI_RATINGS` in `shared/draughts-engine/src/rating/glicko2.ts`  
**Then** the values are: Easy=250, Medium=750, Hard=1250, Expert=2200

### AC-3: Easy AI Is Beatable by Beginners

**Given** a player with no draughts experience beyond knowing the rules  
**When** they play 5 games against Easy  
**Then** they win at least 3 of those games

### AC-4: Medium AI Provides Balanced Games for Casual Players

**Given** a casual player (knows rules, basic tactics)  
**When** they play 10 games against Medium  
**Then** they win between 4 and 7 games (40–70% win rate)

### AC-5: Hard AI Challenges Experienced Players

**Given** an experienced player (understands positional play, can execute combinations)  
**When** they play 10 games against Hard  
**Then** they win between 3 and 7 games (30–70% win rate)

### AC-6: No Illegal Moves

**Given** any difficulty level (Easy, Medium, Hard)  
**When** the AI computes a move for any valid board position  
**Then** the returned move is always legal per FMJD rules

### AC-7: Response Time Within Limits

**Given** any difficulty level (Easy, Medium, Hard)  
**When** the AI computes a move on a modern device  
**Then** the move is returned within 2 seconds

### AC-8: All Existing Tests Pass

**Given** the updated parameter values  
**When** running the full shared engine test suite (`npm test` in `shared/draughts-engine/`)  
**Then** all existing tests pass (190+ tests, ≥85% coverage)

### AC-9: Glicko-2 Rating Calculation Correctness

**Given** a player beats Medium AI  
**When** the Glicko-2 rating update is calculated  
**Then** the AI's rating of 750 (not 1200) is used as the opponent rating

### AC-10: Smooth Perceived Difficulty Curve

**Given** a tester plays a series of games stepping up from Easy → Medium → Hard  
**When** comparing the subjective difficulty of each transition  
**Then** both transitions (Easy→Medium, Medium→Hard) feel like comparable increases in challenge

---

## 8. Dependencies

### 8.1 Upstream Dependencies

| Dependency | Description | Impact if Unavailable |
|------------|-------------|----------------------|
| Game Rules Engine | Legal move generation, mandatory capture enforcement | AI cannot function; this feature cannot be tested |
| Blunder selection logic (`search.ts`) | Existing blunder logic must support the new parameter ranges | If blunder logic has hardcoded thresholds, they may need adjustment |

### 8.2 Downstream Dependencies

| Dependency | Description | Impact |
|------------|-------------|--------|
| Glicko-2 rating system | Player ratings are calculated against AI anchor ratings | Player ratings will shift after recalibration; existing ratings may need a reset or grace period |
| Frontend difficulty selection UI | If the UI displays Elo values or difficulty descriptions | UI text may need updating to reflect new rating bands |
| Backend Expert AI | Must remain unaffected | Verify no shared configuration is accidentally modified |

### 8.3 Test Dependencies

| Dependency | Description |
|------------|-------------|
| Shared engine test suite | Must be updated if any tests assert specific parameter values |
| Frontend test suite | Must be updated if any tests reference old AI ratings |

---

## Appendix A: Parameter Tuning Guidelines

If playtesting reveals that a level is too strong or too weak for its target band,
adjust parameters in the following priority order:

1. **`blunderProbability`** — Most direct impact on perceived strength. Increase to
   weaken, decrease to strengthen.
2. **`noiseAmplitude`** — Affects positional understanding. Increase to weaken
   positional play, decrease to improve it.
3. **`blunderMargin`** — Controls severity of blunders. Increase for more dramatic
   mistakes, decrease for subtler errors.
4. **`maxDepth`** — Largest impact on tactical ability. Only adjust as a last resort,
   as it also affects response time.

## Appendix B: Migration Considerations

### B.1 Existing Player Ratings

Players who earned their current Glicko-2 rating by playing against the old AI anchors
(Easy=800, Medium=1200, Hard=1800) may see rating discrepancies after the change. Two
options:

- **Option A (recommended):** Reset all player ratings to defaults (1500 ± 350 RD).
  Ratings will converge quickly against the new anchors.
- **Option B:** Accept temporary inaccuracy. Ratings will self-correct over 10–20 games
  against the recalibrated AI.

### B.2 Backward Compatibility

This change is not backward-compatible for player ratings. If a player's rating was
calibrated against old anchors, their rating will be inflated relative to the new scale.
This should be communicated to users if Option B is chosen.
