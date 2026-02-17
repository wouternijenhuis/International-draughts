# Feature: Draw Rules — FMJD Compliance

**Feature ID:** `draw-rules-compliance`  
**PRD Version:** 1.0  
**Last Updated:** 2026-02-17  
**Status:** Draft  
**Priority:** Critical — Rule compliance (C5) requires 100% FMJD correctness

---

## 1. Purpose

Bring the application's draw detection and handling into full compliance with FMJD International Draughts rules. The current implementation has critical defects: incorrect move-count thresholds for the 25-move and 16-move rules, wrong activation criteria for the 16-move endgame rule, no automatic draw detection in the frontend game loop, no draw awareness in AI search, missing initial position in repetition history, no UI communication of approaching draws, no draw sub-reason tracking in the backend, and broken draw-rule state on undo/redo.

### Business Justification

| Concern | Impact |
|---------|--------|
| **Rule compliance (C5, REQ-12)** | The PRD mandates 100% FMJD rule compliance. Current bugs violate this requirement. Games that should end in a draw continue indefinitely, producing incorrect outcomes. |
| **AI credibility (G1)** | An Expert-level engine that cannot detect or reason about draws is fundamentally broken. AI games loop endlessly in drawn endgames, harming the app's competitive credibility. |
| **Player trust & retention (G3)** | Incorrect outcomes erode trust. Players familiar with draughts rules will notice that draws are not enforced and may abandon the app. |
| **Rating accuracy (REQ-74–80)** | Draws that never fire produce wins/losses where draws should occur, corrupting Glicko-2 rating calculations. |
| **Competitive positioning** | Any serious draughts app must enforce FMJD draws correctly. This is table-stakes functionality, not a nice-to-have. |

---

## 2. User Personas Affected

| Persona | How They Are Affected |
|---------|----------------------|
| **Competitive / club-level player** | Expects draws to be enforced automatically per FMJD rules. Games that play past draw conditions feel broken and untrustworthy. These players are the most likely to notice incorrect behaviour and the most likely to leave. |
| **Casual player** | May not know the draw rules, but still suffers when games drag on indefinitely in king-vs-king endgames with no way to end except resignation. Needs clear UI communication explaining _why_ a draw was declared. |
| **Beginner / learning player** | Needs educational context: warnings that a draw is approaching, and an explanation of the rule when a draw is declared, so they learn FMJD rules naturally through play. |
| **AI opponent (system actor)** | Must be aware of draw conditions during search to avoid loops, to pursue wins before draw thresholds, and to force draws when losing. Without draw awareness, the AI plays aimlessly in drawn endgames. |
| **Registered user tracking stats** | Draw outcomes must be accurately recorded with the specific draw reason so that game history, win/loss/draw statistics, and Glicko-2 ratings are all correct. |

---

## 3. PRD Traceability

| Requirement | Description | Coverage |
|-------------|-------------|----------|
| REQ-12 | Draw rules: threefold repetition, 25-move king rule, 16-move endgame rule | All three draw rules — detection, thresholds, activation criteria |
| REQ-58 | Complete game state at all times | Draw-rule state must be part of game state, including across undo/redo |
| REQ-59 | Draw-rule tracking: position history, king-move counter, piece counts | Counters, history, and endgame configuration tracking |
| REQ-11 | Win detection | Must not conflict with draw detection; draws take priority when both no-moves and draw condition arise simultaneously |
| REQ-18 | AI never makes illegal moves; enforces all rules | AI must respect draw outcomes and reason about draw proximity |
| REQ-27 | Draw offer | Mutual-agreement draw is separate from automatic draws but must coexist in the UI |
| REQ-61 | Completed game records include result | Draw reason sub-type must be persisted |
| C5 | 100% FMJD compliance — no shortcuts | The core constraint driving this feature |

---

## 4. Scope

### In Scope

- Correcting all three automatic draw rules in the shared engine (thresholds, activation criteria)
- Integrating automatic draw detection into the frontend game loop
- Adding draw awareness to client-side AI search (Easy/Medium/Hard)
- Adding draw awareness to server-side AI search (Expert)
- Including the initial board position in threefold-repetition history
- Implementing UI warnings for approaching draw conditions
- Displaying clear draw-reason explanations when a draw is declared
- Persisting draw sub-reasons in the backend game records
- Preserving draw-rule state across undo/redo operations
- Updating all affected tests to validate correct behaviour

### Out of Scope

- Draw-by-agreement negotiation flow changes (existing mutual-agreement draw is unaffected)
- Draw-by-insufficient-material rules beyond those specified in FMJD (e.g., bare kings with no forced win — FMJD handles this via the 25-move rule, not a separate insufficient-material rule)
- Changes to the timed-mode timeout draw (opponent has insufficient material to win and the player's clock expires) — that is a separate feature concern

---

## 5. Dependencies

| Direction | Feature / Component | Relationship |
|-----------|-------------------|--------------|
| Upstream | Game Rules Engine (`game-rules-engine`) | This feature corrects the engine's draw detection logic |
| Upstream | Task 009 (`009-task-game-outcome-draw-rules`) | Existing task spec describes the original implementation; this feature supersedes its draw-rule requirements with corrected specifications |
| Downstream | AI Computer Opponent (`ai-computer-opponent`) | AI search must integrate draw awareness |
| Downstream | Game Modes & Lifecycle (`game-modes-lifecycle`) | Frontend game loop must call draw detection after every move |
| Downstream | UI & Board Experience (`ui-board-experience`) | Draw warnings and draw-reason display in the UI |
| Downstream | Player Profile & Statistics (`player-profile-statistics`) | Draw sub-reasons must propagate to game history records |
| Downstream | Backend API (`backend-api-deployment`) | Backend must store and return draw sub-reasons |

---

## 6. Functional Requirements

### 6.1 Threefold Repetition (FR-DRAW-01)

**Rule:** A draw is declared automatically when the same position occurs for the third time with the same player to move.

**"Same position" definition:** Identical piece placement (same squares occupied by the same piece types and colours) AND the same player to move.

| ID | Requirement |
|----|-------------|
| FR-DRAW-01.1 | The position history must include the **initial board position** (before any moves are made) as the first entry. |
| FR-DRAW-01.2 | After each move, the resulting position (board + player to move) must be added to the position history. |
| FR-DRAW-01.3 | After each move, the engine must check whether the new position has now occurred three or more times in the position history. If so, the game is immediately and automatically drawn. |
| FR-DRAW-01.4 | Position comparison must use an efficient hashing mechanism (e.g., Zobrist hashing). The hash must incorporate all piece positions, piece types, piece colours, and the player to move. |
| FR-DRAW-01.5 | The position history must be preserved as part of the serializable game state, surviving page reloads and game persistence. |
| FR-DRAW-01.6 | On undo, the most recent position must be removed from the history. On redo, it must be re-added. The history must always reflect exactly the positions that have occurred on the board in the current move sequence. |

### 6.2 25-Move King-Only Rule (FR-DRAW-02)

**Rule:** When both players have only kings on the board (no men), and 25 consecutive moves pass for each side (50 half-moves total) without any capture, the game is automatically drawn.

| ID | Requirement |
|----|-------------|
| FR-DRAW-02.1 | The king-only move counter must count **half-moves** (individual player turns). A draw is declared when this counter reaches **50** (representing 25 moves per side). |
| FR-DRAW-02.2 | The counter increments by 1 after each half-move in which: (a) only kings remain on the board for both sides AND (b) the move is not a capture. |
| FR-DRAW-02.3 | The counter resets to 0 when any capture occurs. |
| FR-DRAW-02.4 | The counter resets to 0 when any man (regular piece) is present on the board. |
| FR-DRAW-02.5 | The counter must be part of the serializable game state. |
| FR-DRAW-02.6 | On undo, the counter must be restored to its previous value. On redo, it must be re-advanced. |

### 6.3 16-Move Endgame Rule (FR-DRAW-03)

**Rule:** In specific endgame material configurations, if 16 moves per player (32 half-moves) pass without a capture or a change in material, the game is automatically drawn.

**Qualifying configurations (and their symmetric equivalents):**

| Configuration | Description |
|---------------|-------------|
| 3 kings vs. 1 king | One side has exactly 3 kings, the other has exactly 1 king; no men on the board. |
| 2 kings + 1 man vs. 1 king | One side has 2 kings and 1 man, the other has exactly 1 king; no other pieces. |
| 1 king + 2 men vs. 1 king | One side has 1 king and 2 men, the other has exactly 1 king; no other pieces. |

> **Note:** "Symmetric equivalent" means the rule applies regardless of which colour has the advantage. For example, both "White 3K vs. Black 1K" and "Black 3K vs. White 1K" qualify.

| ID | Requirement |
|----|-------------|
| FR-DRAW-03.1 | The 16-move endgame rule must activate **only** when the material on the board exactly matches one of the qualifying configurations listed above. |
| FR-DRAW-03.2 | The rule must **not** activate based solely on total piece count (e.g., "≤4 pieces, all kings" is not a valid trigger). The specific piece-type and colour distribution must match a qualifying configuration. |
| FR-DRAW-03.3 | The endgame move counter must count **half-moves**. A draw is declared when this counter reaches **32** (representing 16 moves per side). |
| FR-DRAW-03.4 | The counter increments by 1 after each half-move where no capture occurs and the material configuration remains qualifying. |
| FR-DRAW-03.5 | The counter resets to 0 if a capture occurs. |
| FR-DRAW-03.6 | The counter resets to 0 if the material configuration changes to a non-qualifying configuration (e.g., a promotion occurs or a capture changes the piece distribution). |
| FR-DRAW-03.7 | If the material transitions from one qualifying configuration to another (e.g., a capture changes 3K vs. 1K to 2K vs. 1K — which is not qualifying), the counter resets and the rule re-evaluates. |
| FR-DRAW-03.8 | The active/inactive endgame-rule state and its counter must be part of the serializable game state. |
| FR-DRAW-03.9 | On undo, the endgame rule state (active flag + counter) must be restored to its previous value. On redo, it must be re-advanced. |

### 6.4 Frontend Draw Detection Integration (FR-DRAW-04)

**Problem:** The frontend game store currently checks only for wins (no legal moves) after each move. It never invokes draw detection. Games play indefinitely past draw conditions.

| ID | Requirement |
|----|-------------|
| FR-DRAW-04.1 | After every move (human or AI), the frontend game loop must check for all three automatic draw conditions (threefold repetition, 25-move rule, 16-move rule). |
| FR-DRAW-04.2 | If a draw condition is detected, the game must immediately transition to the `draw` phase. No further moves may be made. |
| FR-DRAW-04.3 | The specific draw reason (threefold repetition, 25-move rule, or 16-move rule) must be stored in the game state and displayed to the user. |
| FR-DRAW-04.4 | Draw detection must occur for all game modes: Player vs. Computer (all difficulty levels) and Player vs. Player (local). |
| FR-DRAW-04.5 | The frontend must delegate draw detection to the shared engine's `checkDrawCondition` function (or its corrected equivalent) rather than implementing its own logic. |

### 6.5 AI Draw Awareness (FR-DRAW-05)

**Problem:** Both client-side and server-side AI search engines have no awareness of draw conditions. They can loop indefinitely in drawn endgames and cannot strategically play toward or avoid draws.

| ID | Requirement |
|----|-------------|
| FR-DRAW-05.1 | Client-side AI (Easy, Medium, Hard): The alpha-beta search must evaluate draw conditions at each node. A position where a draw rule is met must be scored as a draw (0 or equivalent neutral score). |
| FR-DRAW-05.2 | Client-side AI: When the AI is losing, it should prefer moves that approach draw conditions (defensive draw-seeking). When winning, it should prefer moves that avoid draw thresholds (e.g., capturing to reset counters). |
| FR-DRAW-05.3 | Server-side AI (Expert): The search engine must incorporate draw detection into its evaluation. Transposition table entries must account for draw-rule state where relevant. |
| FR-DRAW-05.4 | AI must never continue searching past a position where a draw has been declared. A drawn position is a terminal node in the search tree. |
| FR-DRAW-05.5 | The AI's draw awareness must not violate performance requirements: Easy–Hard AI must still respond within 2 seconds; Expert AI within its configured time limit. |

### 6.6 UI Draw Communication (FR-DRAW-06)

**Problem:** Players receive no warning that a draw is approaching and no explanation when a draw is declared.

| ID | Requirement |
|----|-------------|
| FR-DRAW-06.1 | When an automatic draw is declared, the game-over screen must display the specific draw reason in clear, non-technical language (e.g., "Draw — the same position occurred three times", "Draw — 25 moves without a capture (kings only)", "Draw — 16-move endgame limit reached"). |
| FR-DRAW-06.2 | A **draw-approaching warning** must be displayed when a draw threshold is within a configurable proximity (default: 5 moves). For the 25-move rule: warn at 20 moves per side remaining. For the 16-move rule: warn at 11 moves per side remaining. For threefold repetition: warn when a position has occurred twice (a third occurrence will trigger the draw). |
| FR-DRAW-06.3 | The warning must be non-intrusive (e.g., a subtle banner, indicator, or counter on the game screen) and must not block gameplay. |
| FR-DRAW-06.4 | The warning must be visible to both players in PvP mode. |
| FR-DRAW-06.5 | Players unfamiliar with draw rules should be able to understand the warning. A brief explanatory tooltip or info icon must accompany each warning type. |
| FR-DRAW-06.6 | Draw-reason display on the game-over screen must be distinct from the "Draw by mutual agreement" result (which is initiated by the draw-offer action, REQ-27). |

### 6.7 Backend Draw Reason Tracking (FR-DRAW-07)

**Problem:** The backend stores game outcomes as "Draw" with no sub-reason, making it impossible to distinguish between the four draw types (threefold repetition, 25-move rule, 16-move rule, mutual agreement) in game history and statistics.

| ID | Requirement |
|----|-------------|
| FR-DRAW-07.1 | The backend game record must store a **draw reason sub-type** when the outcome is a draw. Valid sub-types: `ThreefoldRepetition`, `TwentyFiveMoveRule`, `SixteenMoveRule`, `MutualAgreement`. |
| FR-DRAW-07.2 | The draw sub-type must be included in game history API responses so the frontend replay viewer and statistics pages can display it. |
| FR-DRAW-07.3 | Player statistics must be able to break down draws by reason (e.g., "14 draws: 8 by threefold repetition, 3 by 25-move rule, 2 by 16-move rule, 1 by agreement"). |
| FR-DRAW-07.4 | Existing game records with a "Draw" outcome and no sub-type must remain valid; the sub-type field should be nullable for backward compatibility. |

### 6.8 Undo/Redo Draw-Rule State Preservation (FR-DRAW-08)

**Problem:** Undo and redo operations do not restore draw-rule state (position history, king-only move counter, endgame move counter, endgame rule active flag). After undoing moves, the draw-rule counters are incorrect, leading to premature or missed draws.

| ID | Requirement |
|----|-------------|
| FR-DRAW-08.1 | On undo, the draw-rule state must revert to its exact value from before the undone move. This includes: position history, king-only move counter, endgame move counter, and endgame rule active flag. |
| FR-DRAW-08.2 | On redo, the draw-rule state must advance to its exact value from after the redone move. |
| FR-DRAW-08.3 | The implementation must store draw-rule state snapshots (or sufficient information to reconstruct them) for each move in the move history stack. |
| FR-DRAW-08.4 | If a game was in a drawn state and the draw-causing move is undone, the game must revert to `in-progress` and allow play to continue. |

---

## 7. Acceptance Criteria

Each criterion is testable and maps to one or more functional requirements above.

### Threefold Repetition

| ID | Criterion | Traces To |
|----|-----------|-----------|
| AC-01 | Given a new game, the initial board position is present in the position history before any move is made. | FR-DRAW-01.1 |
| AC-02 | Given a game where the same position (board + player to move) occurs exactly twice, the game remains in progress. | FR-DRAW-01.3 |
| AC-03 | Given a game where the same position occurs for the third time, the game immediately ends in a draw with reason "ThreefoldRepetition". | FR-DRAW-01.3 |
| AC-04 | Given a game where a position occurs three times but with different players to move, no draw is declared. | FR-DRAW-01.4 |
| AC-05 | Given a game where a move is undone after the third occurrence, the game reverts to in-progress. | FR-DRAW-01.6 |

### 25-Move King-Only Rule

| ID | Criterion | Traces To |
|----|-----------|-----------|
| AC-06 | Given a kings-only position, after 49 half-moves without capture the game remains in progress. | FR-DRAW-02.1 |
| AC-07 | Given a kings-only position, after 50 half-moves without capture the game ends in a draw with reason "TwentyFiveMoveRule". | FR-DRAW-02.1 |
| AC-08 | Given a kings-only position, if a capture occurs at half-move 45, the counter resets and 50 new half-moves without capture are required before a draw. | FR-DRAW-02.3 |
| AC-09 | Given a position with one man remaining, the king-only counter does not increment, even if the man is not involved in the move. | FR-DRAW-02.4 |
| AC-10 | Given a game where the last man is captured at half-move 30, the king-only counter begins from 0 at the next move (not from 30). | FR-DRAW-02.3, FR-DRAW-02.4 |

### 16-Move Endgame Rule

| ID | Criterion | Traces To |
|----|-----------|-----------|
| AC-11 | Given a 3K-vs-1K position (all kings, no men), the 16-move endgame rule is active. | FR-DRAW-03.1 |
| AC-12 | Given a 2K+1M-vs-1K position, the 16-move endgame rule is active. | FR-DRAW-03.1 |
| AC-13 | Given a 1K+2M-vs-1K position, the 16-move endgame rule is active. | FR-DRAW-03.1 |
| AC-14 | Given a 2K-vs-2K position (all kings, 4 pieces), the 16-move endgame rule is **not** active (this configuration is not in the qualifying list). | FR-DRAW-03.2 |
| AC-15 | Given a 4K-vs-1K position, the 16-move endgame rule is **not** active. | FR-DRAW-03.2 |
| AC-16 | Given an active 16-move endgame rule, after 31 half-moves without capture the game remains in progress. | FR-DRAW-03.3 |
| AC-17 | Given an active 16-move endgame rule, after 32 half-moves without capture the game ends in a draw with reason "SixteenMoveRule". | FR-DRAW-03.3 |
| AC-18 | Given an active 16-move rule, if a capture at half-move 20 changes the configuration from 3K-vs-1K to 2K-vs-1K (non-qualifying), the endgame rule deactivates and the counter resets. | FR-DRAW-03.6, FR-DRAW-03.7 |
| AC-19 | The 16-move rule activates regardless of which colour has the stronger side (symmetry). | FR-DRAW-03.1 |

### Frontend Integration

| ID | Criterion | Traces To |
|----|-----------|-----------|
| AC-20 | Given a PvC game where a threefold repetition occurs, the frontend automatically ends the game as a draw without requiring player action. | FR-DRAW-04.1, FR-DRAW-04.2 |
| AC-21 | Given a PvP game where the 25-move rule is triggered, the frontend automatically ends the game as a draw. | FR-DRAW-04.1, FR-DRAW-04.4 |
| AC-22 | The game-over display shows the specific draw reason (not just "Draw"). | FR-DRAW-04.3 |

### AI Draw Awareness

| ID | Criterion | Traces To |
|----|-----------|-----------|
| AC-23 | Given a position where the 25-move rule will trigger in 1 move and the AI is losing, the AI does not avoid the draw (it allows or seeks the draw). | FR-DRAW-05.2 |
| AC-24 | Given a position where the AI is winning and the 25-move counter is at 40 half-moves, the AI prefers a capture (resetting the counter) over a quiet king move if possible. | FR-DRAW-05.2 |
| AC-25 | Given a position where a draw condition is met, the AI does not attempt to continue play. | FR-DRAW-05.4 |
| AC-26 | AI move response times remain within specified limits (Easy–Hard: < 2s, Expert: within configured limit) after draw awareness is added. | FR-DRAW-05.5 |

### UI Communication

| ID | Criterion | Traces To |
|----|-----------|-----------|
| AC-27 | When the 25-move counter reaches 40 half-moves (5 moves per side remaining), a non-blocking warning is displayed. | FR-DRAW-06.2 |
| AC-28 | When a position has occurred twice, a warning indicates that one more occurrence will trigger a draw. | FR-DRAW-06.2 |
| AC-29 | The game-over screen for an automatic draw shows a distinct message from "Draw by mutual agreement". | FR-DRAW-06.6 |
| AC-30 | Each draw warning includes a tooltip or info icon explaining the rule. | FR-DRAW-06.5 |

### Backend

| ID | Criterion | Traces To |
|----|-----------|-----------|
| AC-31 | A completed game record with a draw outcome includes the draw sub-type in the API response. | FR-DRAW-07.1, FR-DRAW-07.2 |
| AC-32 | Existing draw records without a sub-type are returned with a null sub-type (no migration failure). | FR-DRAW-07.4 |

### Undo/Redo

| ID | Criterion | Traces To |
|----|-----------|-----------|
| AC-33 | After undoing 3 moves and redoing 2, all draw-rule counters match the values they had at the corresponding point in the original move sequence. | FR-DRAW-08.1, FR-DRAW-08.2 |
| AC-34 | After undoing the move that caused a draw, the game reverts to in-progress. | FR-DRAW-08.4 |

---

## 8. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| FMJD draw-rule compliance | 100% — all three draw rules trigger at correct thresholds with correct activation criteria | Automated test suite covering all acceptance criteria |
| False-positive draw rate | 0% — no draws declared when FMJD rules do not require one | Regression tests + manual QA with known positions |
| False-negative draw rate | 0% — no games continue past a legitimate draw condition | Regression tests with positions that trigger each draw type |
| AI endgame loop elimination | 0 occurrences of AI playing >50 half-moves in a drawn kings-only endgame | Automated AI self-play testing in endgame positions |
| Draw detection performance impact | <5ms per move added latency in the game loop | Performance benchmarking |
| AI response time regression | <10% increase in average AI move time after draw awareness is added | Performance benchmarking (Easy–Hard < 2s, Expert within configured limit) |
| Test coverage on draw logic | ≥90% statement + branch coverage on all draw-related functions | CI coverage reports |
| User comprehension of draw outcomes | ≥80% of surveyed users correctly identify why a draw occurred (post-launch survey) | User research |

---

## 9. Edge Cases & Error Handling

### 9.1 Edge Cases

| ID | Edge Case | Expected Behaviour |
|----|-----------|-------------------|
| EC-01 | Threefold repetition occurs on the very first possible occurrence (move 5 or earlier via back-and-forth moves). | Draw is correctly declared, even very early in the game. |
| EC-02 | The same position occurs 4+ times (position was repeated without being caught due to a bug, then the fix is deployed mid-game). | Draw is declared on the third occurrence; subsequent occurrences are irrelevant because the game already ended at the third. |
| EC-03 | A capture move simultaneously creates a qualifying 16-move endgame configuration. | The capture resets the endgame counter to 0. The counter starts incrementing from the _next_ non-capture move. |
| EC-04 | The 25-move rule and 16-move rule could both apply simultaneously (e.g., 3K-vs-1K with no captures for 50+ half-moves). | The rule whose threshold is reached first triggers the draw. If both trigger on the same move, either reason is acceptable (but one must be reported). |
| EC-05 | A position that occurred twice is reached again, but through a different sequence of moves. | It is still threefold repetition — only the position matters, not the path to reach it. |
| EC-06 | The game starts with a custom/loaded position that is already a qualifying endgame configuration. | The 16-move rule immediately activates. The counter starts at 0 for the first move from that position. The initial position must still be added to position history for threefold-repetition tracking. |
| EC-07 | A player has no legal moves AND a draw condition is also met on the same position. | No legal moves takes precedence: the opponent wins. A player cannot be "saved" by a draw if they have already lost the ability to move. |
| EC-08 | The 25-move counter is at 49 and a capture occurs. | The counter resets to 0. The draw is not declared. |
| EC-09 | Undo is performed in a PvC game where the AI made the draw-triggering move. | Both the AI's move and the preceding human move are undone (standard undo behaviour in PvC). Draw-rule state reverts accordingly. |
| EC-10 | A man is promoted to a king during a kings-only endgame tracking period. | This is not possible (if it's kings-only, there are no men to promote). No action needed, but the engine must correctly handle the case where a man appears on the board after undo — the king-only counter must reset. |
| EC-11 | Game is saved to persistence (session/local storage or backend) mid-game with active draw-rule counters, then resumed later. | All draw-rule state must serialize and deserialize correctly. Counters resume from their saved values. |
| EC-12 | The endgame material is 2K-vs-1K (not a qualifying configuration per FMJD). | The 16-move rule does NOT activate. Only the 25-move king-only rule applies in this case. |

### 9.2 Error Handling

| Scenario | Response |
|----------|----------|
| Position hash collision (two different positions produce the same hash) | Use a high-quality hash (≥64-bit Zobrist) to make collisions astronomically unlikely. If detected in testing, increase hash size. No runtime error is raised — this is a probabilistic correctness concern addressed through hash quality. |
| Draw-rule state is missing or corrupted in a saved game | Treat missing draw-rule state as a fresh initial state (all counters at 0, position history containing only the current position). Log a warning. Do not crash or prevent game resumption. |
| Backend receives a game result with an unrecognised draw sub-type | Reject the request with a 400 error and a clear message. The set of valid draw sub-types is a closed enum. |
| Expert AI server is unreachable during a game that is near a draw threshold | The frontend falls back to Hard difficulty (per REQ-63). The Hard AI must also have draw awareness, so draw detection remains functional. |

---

## 10. Constraints

| Constraint | Description |
|------------|-------------|
| FMJD rules are authoritative | All draw-rule thresholds, activation criteria, and semantics must match the FMJD official rules. When in doubt, consult the FMJD rulebook — no simplifications or deviations. |
| Shared engine is the single source of truth | Draw detection logic must live in the shared TypeScript engine (`shared/draughts-engine/`). The frontend and client-side AI consume this logic. The backend C# engine must implement equivalent logic independently. Both must produce identical outcomes for identical positions. |
| No runtime dependencies in the shared engine | The shared engine must remain a pure TypeScript library with zero runtime dependencies (per project architecture). |
| Performance budget | Draw detection must not meaningfully impact game-loop responsiveness or AI search performance (see success metrics). |
| Backward compatibility | Existing saved games (in session/local storage) must remain loadable. Missing draw-rule state fields should be initialised to safe defaults. Existing backend game records with no draw sub-type must not break. |
| Test coverage | All draw-rule logic must meet ≥85% coverage (shared engine threshold). Frontend draw integration must meet ≥40% statement coverage (frontend threshold). |

---

## 11. Open Questions

| ID | Question | Impact | Owner |
|----|----------|--------|-------|
| OQ-01 | Should the player have the option to _claim_ a draw (e.g., on the second repetition) rather than only receiving an automatic draw on the third? FMJD rules support both modes depending on the competition format. | Would add a draw-claim UI flow. Current spec assumes automatic draw on third occurrence, which is the standard for computer play. | PM |
| OQ-02 | Should the 16-move endgame rule cover additional FMJD configurations beyond the three listed (3K-vs-1K, 2K+1M-vs-1K, 1K+2M-vs-1K)? Some FMJD rule variants include additional configurations. | Affects activation criteria logic complexity. | PM + Rules Expert |
| OQ-03 | What is the desired proximity threshold for draw-approaching warnings? The spec proposes 5 moves per side, but this is configurable. | Affects UI warning triggers. Not blocking. | UX Designer |
| OQ-04 | Should draw-rule state be included in the position hash for threefold-repetition purposes? (Strictly, FMJD considers the position and the player to move, not the draw counters.) | Affects hash implementation. Current spec follows FMJD: only position + player to move. | Engineering |
