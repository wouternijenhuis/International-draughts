# Feature: AI Computer Opponent

**Feature ID:** `ai-computer-opponent`  
**PRD Version:** 1.0  
**Last Updated:** 2026-02-07  
**Status:** Draft

---

## 1. Purpose

Deliver four clearly differentiated AI difficulty levels — Easy, Medium, Hard, and Expert — so that players of all skill levels face an appropriately challenging and enjoyable computer opponent. The Expert AI is the app's #1 business priority (G1) and must aspire to championship-engine strength, delivered in a phased roadmap. Lower difficulty levels must feel human-like and fun, not random or broken.

---

## 2. PRD Traceability

| Requirement | Description | Coverage |
|-------------|-------------|----------|
| REQ-15 | Four difficulty levels with differentiated playing strength | Difficulty tiers |
| REQ-16 | Expert AI phased roadmap: v1 deep search + hand-tuned eval; v1.1+ endgame DBs, opening book, learned eval | Expert engine roadmap |
| REQ-17 | AI manages time intelligently under timed mode | Time management |
| REQ-18 | AI never makes an illegal move; enforces all capture rules | Correctness |
| REQ-71 | Configurable difficulty tuning (depth, noise, randomness) without code changes | Difficulty tuning |
| REQ-72 | Easy/Medium make human-like mistakes, not random moves | Natural play feel |
| REQ-73 | Difficulty controlled by search depth, eval quality, imprecision — never by breaking rules | Difficulty mechanism |

---

## 3. Inputs

- Current board position (from the Game Rules Engine)
- Selected difficulty level (Easy, Medium, Hard, Expert)
- Time remaining (when timed mode is active)
- Difficulty configuration parameters (search depth, evaluation noise, move randomness)

---

## 4. Outputs

- A single legal move to play, chosen according to the difficulty level's strategy
- Time consumed for the move (for time management)

---

## 5. Dependencies

| Direction | Feature | Relationship |
|-----------|---------|-------------|
| Upstream | Game Rules Engine | Requires legal move generation, position state, move application |
| Upstream | Timed Mode | Requires remaining time info when timed mode is active |
| Upstream | Backend API & Deployment | Expert AI runs server-side; needs API endpoint |
| Downstream | Game Modes & Lifecycle | Provides the AI's move response during PvC games |

---

## 6. Feature Detail by Difficulty Level

### Easy
- **Target audience:** Beginners learning the game
- **Behaviour:** Limited look-ahead (shallow search). Makes occasional suboptimal moves on purpose — e.g., sometimes misses a multi-capture, prefers simpler moves over complex tactical sequences. The mistakes should feel human-like, not random.
- **Runs:** Client-side

### Medium
- **Target audience:** Casual players who know the rules
- **Behaviour:** Moderate look-ahead. Plays solidly and captures correctly in most situations, but misses deeper tactical combinations (3+ move sequences). Occasional positional inaccuracies.
- **Runs:** Client-side

### Hard
- **Target audience:** Experienced players seeking a challenge
- **Behaviour:** Deep look-ahead with a strong evaluation function covering positional concepts (centre control, mobility, king safety, piece structure). Plays strong tactical and positional draughts. Rarely makes mistakes.
- **Runs:** Client-side

### Expert
- **Target audience:** Competitive players wanting near-championship-level play
- **Behaviour — v1 (launch):** Deep search with a strong evaluation function covering key positional concepts (centre control, piece mobility, king safety, left/right balance, locked positions, runaway threats). Consistently beats casual/intermediate players and challenges experienced club players.
- **Behaviour — v1.1+ (post-launch):**
  - Endgame databases: perfect play in positions with ≤ 6 pieces
  - Opening book: curated mainstream opening theory
  - Learned/trained evaluation: ML-refined position assessment
  - Advanced search: aspiration windows, singular extensions, deeper pruning
- **Runs:** Server-side (via Backend API)

---

## 7. Acceptance Criteria

1. **Four distinct levels:** A human tester can perceive a clear difference in difficulty between Easy, Medium, Hard, and Expert across a set of test games.
2. **Easy loses to beginners:** An adult who has learned the rules should be able to beat Easy within their first few games.
3. **Medium is competitive with casual players:** A casual player (knows rules, limited strategy) should win roughly 40–60% of games against Medium.
4. **Hard challenges experienced players:** An experienced club player should find Hard a genuine challenge, winning less than 70% of games.
5. **Expert v1 beats intermediates:** Expert must win > 95% of games against casual players and achieve > 80% win+draw rate against experienced club players.
6. **No illegal moves:** The AI never selects or attempts to play an illegal move at any difficulty level.
7. **Maximum capture enforcement:** The AI always respects mandatory capture and maximum-capture rules.
8. **Human-like mistakes at Easy/Medium:** Lower difficulties make plausible errors (missing a multi-capture opportunity, playing a slightly inferior positional move) rather than selecting random legal moves.
9. **Configurable tuning:** Search depth limits, evaluation noise amplitude, and move-selection randomness per difficulty level are configurable without code changes (e.g., via configuration file or parameters).
10. **Time management:** When timed mode is enabled, the AI distributes its thinking time intelligently across the game — spending more time in complex middle-game positions and less in simple or forced positions — and never exceeds its time allocation.
11. **Response time — Easy to Hard:** < 2 seconds per move on a modern device.
12. **Response time — Expert:** Configurable, up to 30 seconds per move.
13. **Expert strength improves over releases:** The Expert AI's measured strength (e.g., win rate against a fixed benchmark) increases across v1 → v1.1 → v1.2+.

---

## 8. Technical Constraints

- Easy, Medium, and Hard AI must run client-side (browser). Expert AI runs server-side.
- The AI must consume the Game Rules Engine's move generation interface — it does not implement its own move validation.
- Expert AI server-side deployment must account for potentially large memory footprint (endgame databases up to 2 GB per engine instance in v1.1+).
- Difficulty parameters must be externalized (not hardcoded) so that difficulty can be tuned by configuration.

---

## 9. Open Questions

- What is the exact benchmark for measuring Expert AI strength improvements across releases? (Could be win rate vs. a fixed lower-difficulty engine, or vs. a set of recorded master-level games.)
