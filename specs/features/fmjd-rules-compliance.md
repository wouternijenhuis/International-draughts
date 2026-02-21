# Feature: FMJD Rules Compliance — Flutter Mobile App

**Feature ID:** `fmjd-rules-compliance`  
**PRD Version:** 1.0  
**Last Updated:** 2026-02-21  
**Status:** Draft  
**Priority:** P0 — Release-blocking for Flutter mobile app

---

## 1. Purpose

Ensure the Flutter mobile app (`mobile/`) fully and correctly implements all FMJD International Draughts rules. A compliance audit identified four critical bugs that cause crashes, incorrect game outcomes, and broken user interaction. This FRD specifies the complete set of FMJD rules, the bugs to fix, the acceptance criteria for each rule, and the edge-case test scenarios required before the mobile app can ship.

### Business Justification

| Concern | Impact |
|---------|--------|
| **Rule compliance (C5, REQ-1–14)** | The PRD mandates 100% FMJD compliance. BUG-001 through BUG-004 violate this. The mobile app cannot launch with known rule violations. |
| **App stability (BUG-001)** | A crash on any multi-step capture makes the app unusable for normal gameplay. Multi-step captures are routine in international draughts. |
| **Game integrity (BUG-002)** | False-positive threefold-repetition draws corrupt game outcomes, Glicko-2 ratings, and player trust. |
| **User experience (BUG-003, BUG-004)** | Lost game config on undo and silent wrong-path capture selection directly harm the player experience and violate the principle of least surprise. |
| **Cross-platform parity** | The web (shared engine) and mobile (Dart engine) must produce identical results for identical positions. Divergence is a critical defect. |

---

## 2. User Personas Affected

| Persona | How They Are Affected |
|---------|----------------------|
| **Any mobile player** | BUG-001 crashes the app on multi-step captures — affects all users. |
| **Competitive / club-level player** | Notices false draws (BUG-002), wrong captures (BUG-004), and broken undo (BUG-003). Will abandon the app. |
| **Casual player** | Confused by unexplained crashes and incorrect outcomes. May not understand why, but will lose trust. |
| **AI opponent (system actor)** | If the engine produces incorrect legal moves or outcomes, AI play is also incorrect. |

---

## 3. PRD Traceability

| Requirement | Description | Coverage |
|-------------|-------------|----------|
| REQ-1 | 10×10 board, 50 dark squares | Board representation |
| REQ-2 | 20 pieces per player, first four rows | Initial position |
| REQ-3 | White moves first, turns alternate | Turn management |
| REQ-4 | Regular pieces move one square diagonally forward | Man movement |
| REQ-5 | Mandatory captures, forward and backward | Capture enforcement |
| REQ-6 | Maximum capture rule | Capture validation |
| REQ-7 | Jumped pieces removed after sequence; no re-jumping | Multi-capture logic |
| REQ-8 | Promotion on opponent's back row at end of turn | Promotion |
| REQ-9 | Flying kings move any distance diagonally | King movement |
| REQ-10 | Kings capture at any distance, maximum capture applies | King capture |
| REQ-11 | Loss when no valid moves | Win/loss detection |
| REQ-12 | Draw rules: threefold repetition, 25-move, 16-move | Draw detection |
| REQ-13 | FMJD notation (1–50) | Notation |
| REQ-14 | Highlight legal moves including captures | Move display |
| REQ-58 | Complete game state at all times | State management |
| REQ-59 | Draw-rule state tracking | Counter management |
| C5 | 100% FMJD compliance | Zero tolerance for rule violations |
| AC-FMJD-1–7 | PRD acceptance criteria for rule compliance | See PRD §4.1.1 |

---

## 4. Scope

### In Scope

- Fix all four identified bugs (BUG-001 through BUG-004) in the Flutter mobile Dart engine and UI
- Verify all FMJD rules are correctly implemented in the Dart engine
- Add regression tests for every bug fix
- Add comprehensive rule-compliance test suite for the Dart engine
- Ensure cross-platform parity with the shared TypeScript engine
- Implement capture-path disambiguation UI for BUG-004

### Out of Scope

- Changes to the shared TypeScript engine (already confirmed correct for all rules except the items covered by draw-rules-compliance FRD)
- Changes to the C# backend engine
- New features or rule extensions beyond official FMJD rules
- Performance optimisation of the Dart engine (separate concern)
- UI polish beyond the disambiguation mechanism for BUG-004

---

## 5. Dependencies

| Direction | Feature / Component | Relationship |
|-----------|-------------------|--------------|
| Upstream | Game Rules Engine (`game-rules-engine`) | The Dart engine is a port of this specification |
| Upstream | Draw Rules Compliance (`draw-rules-compliance`) | Draw rules must be correct before this feature is complete |
| Downstream | AI Computer Opponent (mobile) | AI relies on correct legal-move generation |
| Downstream | Game Modes & Lifecycle (mobile) | Game loop relies on correct state transitions |
| Downstream | UI & Board Experience (mobile) | Board widget must render all move types correctly |

---

## 6. Complete FMJD International Draughts Rules

This section is the authoritative rules reference for the project. All engine implementations must conform to every rule listed here.

### 6.1 Board & Setup

| ID | Rule | Detail |
|----|------|--------|
| FMJD-01 | Board dimensions | 10×10 board with alternating light and dark squares. The lower-left corner (from White's perspective) is a dark square. |
| FMJD-02 | Playable squares | Only the 50 dark squares are used. They are numbered 1–50 using FMJD standard notation: square 1 is the top-right dark square (from White's perspective), numbering proceeds left-to-right, top-to-bottom across each row of dark squares. |
| FMJD-03 | Starting position | White places 20 pieces on squares 31–50. Black places 20 pieces on squares 1–20. Squares 21–30 are empty. |
| FMJD-04 | First move | White (the player on the side with squares 31–50) moves first. Turns alternate thereafter. |

### 6.2 Piece Types

| ID | Rule | Detail |
|----|------|--------|
| FMJD-05 | Man (regular piece) | A standard piece. Starts on the board at game setup. Can be promoted to a king. |
| FMJD-06 | King | A promoted piece, visually distinct (crowned). Has enhanced movement and capture abilities. |

### 6.3 Non-Capture Movement

| ID | Rule | Detail |
|----|------|--------|
| FMJD-07 | Man movement | A man moves exactly one square diagonally forward (toward the opponent's side) to an unoccupied square. Backward non-capture movement is not allowed. |
| FMJD-08 | King movement (flying king) | A king moves any number of squares along any of the four diagonals, stopping on any unoccupied square. The king may not jump over any piece during a non-capture move. |

### 6.4 Capture Rules

| ID | Rule | Detail |
|----|------|--------|
| FMJD-09 | Mandatory capture | If one or more captures are available, the player **must** capture. Non-capture moves are not legal when a capture exists. |
| FMJD-10 | Man capture direction | A man may capture both forward and backward. |
| FMJD-11 | Man capture mechanics | A man captures by jumping diagonally over an adjacent enemy piece to the unoccupied square immediately beyond it. |
| FMJD-12 | King capture mechanics (flying capture) | A king captures by moving along a diagonal toward an enemy piece, jumping over it, and landing on any unoccupied square beyond the captured piece on the same diagonal. There may be empty squares before and after the captured piece. |
| FMJD-13 | Maximum capture rule | When multiple capture sequences are available, the player **must** execute the sequence that captures the **maximum number** of enemy pieces. If multiple sequences capture the same maximum number, the player may choose freely among them. |
| FMJD-14 | Multi-step (chain) captures | A capture sequence may consist of multiple jumps. After each jump, if additional captures are available from the landing square, the player must continue capturing. The sequence ends when no further captures are possible from the current square. |
| FMJD-15 | Deferred removal | Captured pieces are **not** removed from the board during the capture sequence. They are all removed simultaneously after the entire sequence is complete. This means the capturing piece's path may be affected by pieces that have been jumped but not yet removed. |
| FMJD-16 | No double-jumping | A piece that has been jumped (marked for capture) cannot be jumped again in the same capture sequence. |
| FMJD-17 | King capture continuation | During a multi-step king capture, the king may change direction at each landing square. It may land on any unoccupied square beyond the captured piece before continuing to the next capture. |

### 6.5 Promotion

| ID | Rule | Detail |
|----|------|--------|
| FMJD-18 | Promotion condition | A man is promoted to a king when it **ends its turn** on the opponent's back row (the row farthest from the player's starting side). |
| FMJD-19 | No mid-capture promotion | If a man reaches the opponent's back row during a multi-step capture sequence but must continue capturing, it is **not** promoted during the sequence. It continues capturing as a man. It is promoted only if the back row is the final square of the sequence. |
| FMJD-20 | Promotion is immediate at end of turn | When a man stops on the back row at the end of its turn (whether a non-capture move or the final step of a capture), it is immediately promoted. The promoted piece acts as a king starting from the player's next turn. |

### 6.6 Game Outcome — Win/Loss

| ID | Rule | Detail |
|----|------|--------|
| FMJD-21 | Loss by elimination | A player who has no pieces remaining on the board loses. |
| FMJD-22 | Loss by blocking | A player who has pieces but no legal moves (all pieces are blocked) loses. |
| FMJD-23 | Resignation | A player may resign at any time, resulting in a loss. |

### 6.7 Game Outcome — Draw

| ID | Rule | Detail |
|----|------|--------|
| FMJD-24 | Threefold repetition | A game is drawn when the same board position (identical piece placement, types, and colours) with the same player to move occurs for the **third time** during the game. The three occurrences need not be consecutive. |
| FMJD-25 | 25-move king-only rule | When both players have **only kings** (no men) on the board, the game is drawn after **25 consecutive moves per side** (50 half-moves total) without any capture. |
| FMJD-26 | 16-move endgame rule | In specific endgame material configurations, the game is drawn after **16 moves per side** (32 half-moves) without a capture. Qualifying configurations (and their colour-symmetric equivalents): (a) 3 kings vs. 1 king; (b) 2 kings + 1 man vs. 1 king; (c) 1 king + 2 men vs. 1 king. |
| FMJD-27 | Draw by mutual agreement | Both players may agree to a draw at any time. |

### 6.8 Notation

| ID | Rule | Detail |
|----|------|--------|
| FMJD-28 | Move notation | Non-capture moves are written as `origin-destination` (e.g., `32-28`). Capture moves are written as `origin×destination` (e.g., `19×30`). Multi-step captures are written with only origin and final destination (e.g., `19×30`, not `19×28×30`). |

---

## 7. Bug Fixes Required

### 7.1 BUG-001: Board Widget Crash on Multi-Step Captures

**Severity:** P0 — Crash  
**Component:** `mobile/lib/` — `board_widget.dart` (and related move/state parsing)  
**Symptoms:** `FormatException` thrown when any capture with 2+ steps is made. The app crashes and the game is lost.

**Root Cause:** The board widget uses a display-format parser (designed for human-readable notation like `19×30`) to parse the internal serialization format of moves (which includes intermediate squares for multi-step captures, e.g., `19,28,30`). The parser does not expect the comma-delimited internal format, causing a `FormatException`.

**Fix Requirements:**

| ID | Requirement |
|----|-------------|
| FIX-001.1 | Identify all code paths in the board widget and related state management that parse move serialization. |
| FIX-001.2 | Ensure the internal serialization format and the display notation format use separate parsers. The internal format must support multi-step captures with all intermediate squares. |
| FIX-001.3 | The board widget must correctly animate multi-step captures, showing the piece moving through each intermediate square in sequence. |
| FIX-001.4 | Add regression tests: a 2-step capture, a 3-step capture, a 4-step capture, and a maximum-length capture (7+ steps, which is theoretically possible in international draughts). |

### 7.2 BUG-002: Position Hash Collisions

**Severity:** P0 — Rule violation (false threefold-repetition draws)  
**Component:** `mobile/lib/` — position hashing / Zobrist hash implementation  
**Symptoms:** Games are declared drawn by threefold repetition when the positions are actually distinct.

**Root Cause:** The hash function uses a base-67 encoding scheme, but the hash coefficients (piece-type + square combinations) go up to 254. This means different positions can produce identical hash values, leading to false positives when checking the position history for threefold repetition.

**Fix Requirements:**

| ID | Requirement |
|----|-------------|
| FIX-002.1 | Replace the current hash function with a proper Zobrist hashing implementation using ≥64-bit random values for each (square, piece-type, colour) combination. |
| FIX-002.2 | The hash must incorporate: all piece positions, all piece types (man/king), all piece colours, and the current player to move. |
| FIX-002.3 | Verify collision resistance by computing hashes for ≥10,000 distinct positions reachable from the starting position and confirming zero collisions. |
| FIX-002.4 | Ensure the hash implementation matches the design of the shared TypeScript engine's Zobrist hash (if applicable) for cross-platform consistency. |
| FIX-002.5 | Add regression tests with specific position pairs that collided under the old hash function. |

### 7.3 BUG-003: Game Config Lost on Game Over

**Severity:** P1 — Data corruption  
**Component:** `mobile/lib/` — game state management  
**Symptoms:** After a game ends, calling `undoMove` restores a game state with hardcoded default config (`vsAi`, `medium`, `white`) instead of the actual game config (which may have been `pvp`, `hard`, `black`, etc.).

**Root Cause:** The game-over handler does not preserve the `GameConfig` object when transitioning to the `gameOver` state. When `undoMove` is called, it cannot find the config and falls back to a hardcoded default.

**Fix Requirements:**

| ID | Requirement |
|----|-------------|
| FIX-003.1 | The `GameConfig` must be preserved immutably throughout the entire game lifecycle: setup → in-progress → game-over → undo/review. |
| FIX-003.2 | `undoMove` must restore both the board state and the original game config. |
| FIX-003.3 | The game config must be included in the serializable game state (for persistence across app restarts). |
| FIX-003.4 | Add regression tests: start a game with non-default config (e.g., `pvp`, `hard`, `black`), play to game over, undo a move, and verify the config is correct. |

### 7.4 BUG-004: King Capture Path Ambiguity

**Severity:** P1 — Rule violation  
**Component:** `mobile/lib/` — move selection / UI interaction  
**Symptoms:** When multiple capture paths share the same origin and destination squares but capture different intermediate pieces, the UI silently selects the first matching path. The player cannot choose which path to take.

**Root Cause:** The move-matching logic in the UI uses only origin and destination squares to identify a capture. When flying kings are involved, it is possible for two capture sequences to start and end on the same squares but traverse different diagonals and capture different pieces. The UI does not detect this ambiguity.

**Example:** A king on square 5 can capture via path A (5→19, capturing piece on 10) or path B (5→19, capturing piece on 14). Both paths start at 5 and end at 19, but they capture different opponent pieces. The UI must let the player choose.

**Fix Requirements:**

| ID | Requirement |
|----|-------------|
| FIX-004.1 | The move-matching logic must compare the **full capture path** (all intermediate squares and all captured pieces), not just origin and destination. |
| FIX-004.2 | When the origin and destination are the same for two or more capture sequences but the captured pieces differ, the UI must present a **disambiguation mechanism** (e.g., highlight the different paths and let the player choose). |
| FIX-004.3 | The disambiguation UI must be clear and accessible — the player must understand that they are choosing between different capture paths. |
| FIX-004.4 | If there is only one capture path for a given origin/destination pair, no disambiguation is needed — the move is applied directly. |
| FIX-004.5 | Add regression tests with specific board positions that produce ambiguous capture paths for flying kings. |

---

## 8. Acceptance Criteria

### 8.1 Board & Setup

| ID | Criterion | Rule Ref |
|----|-----------|----------|
| AC-01 | A new game initializes with a 10×10 board, 50 dark playable squares numbered 1–50 per FMJD notation. | FMJD-01, FMJD-02 |
| AC-02 | White pieces occupy squares 31–50; Black pieces occupy squares 1–20; squares 21–30 are empty. | FMJD-03 |
| AC-03 | White moves first. | FMJD-04 |

### 8.2 Movement

| ID | Criterion | Rule Ref |
|----|-----------|----------|
| AC-04 | A man can move exactly one square diagonally forward to an unoccupied square. | FMJD-07 |
| AC-05 | A man cannot move backward (non-capture). | FMJD-07 |
| AC-06 | A king can move any number of squares along any diagonal, stopping on any unoccupied square. | FMJD-08 |
| AC-07 | A king cannot jump over any piece during a non-capture move. | FMJD-08 |

### 8.3 Captures

| ID | Criterion | Rule Ref |
|----|-----------|----------|
| AC-08 | When a capture is available, the player must capture — non-capture moves are not offered. | FMJD-09 |
| AC-09 | A man can capture both forward and backward. | FMJD-10 |
| AC-10 | A man captures by jumping over an adjacent enemy piece to the empty square immediately beyond. | FMJD-11 |
| AC-11 | A king captures by jumping over an enemy piece at any diagonal distance, landing on any empty square beyond it. | FMJD-12 |
| AC-12 | When multiple capture sequences exist, only those with the maximum number of captured pieces are legal. | FMJD-13 |
| AC-13 | Multi-step captures complete automatically — the player continues jumping until no further captures are available. | FMJD-14 |
| AC-14 | Captured pieces remain on the board until the full capture sequence is complete, then all are removed simultaneously. | FMJD-15 |
| AC-15 | A piece cannot be jumped twice in the same capture sequence. | FMJD-16 |
| AC-16 | During a multi-step king capture, the king may change direction and land on any unoccupied square beyond each captured piece. | FMJD-17 |

### 8.4 Promotion

| ID | Criterion | Rule Ref |
|----|-----------|----------|
| AC-17 | A man ending its turn on the opponent's back row is promoted to a king. | FMJD-18 |
| AC-18 | A man passing through the back row during a multi-step capture is NOT promoted — it continues capturing as a man. | FMJD-19 |
| AC-19 | Promotion takes effect immediately when the man stops on the back row at the end of its turn. | FMJD-20 |

### 8.5 Win/Loss

| ID | Criterion | Rule Ref |
|----|-----------|----------|
| AC-20 | A player with no pieces on the board loses. | FMJD-21 |
| AC-21 | A player with pieces but no legal moves loses. | FMJD-22 |

### 8.6 Draw Rules

| ID | Criterion | Rule Ref |
|----|-----------|----------|
| AC-22 | The game is drawn when the same position + same player to move occurs for the third time. | FMJD-24 |
| AC-23 | The position history includes the initial position (before any moves). | FMJD-24 |
| AC-24 | In a kings-only position, the game is drawn after 50 half-moves (25 per side) without capture. | FMJD-25 |
| AC-25 | The king-only counter resets on any capture and does not increment when men are present. | FMJD-25 |
| AC-26 | In qualifying endgame configurations (3K v 1K, 2K+1M v 1K, 1K+2M v 1K), the game is drawn after 32 half-moves (16 per side) without capture. | FMJD-26 |
| AC-27 | The 16-move rule does NOT activate for non-qualifying configurations (e.g., 2K v 2K, 4K v 1K, 2K v 1K). | FMJD-26 |

### 8.7 Bug-Fix Acceptance Criteria

| ID | Criterion | Bug Ref |
|----|-----------|---------|
| AC-28 | A 2-step capture renders correctly and does not crash the board widget. | BUG-001 |
| AC-29 | A 3-step capture renders correctly and does not crash the board widget. | BUG-001 |
| AC-30 | A maximum-length capture (7+ steps) renders correctly. | BUG-001 |
| AC-31 | 10,000 distinct positions produce zero hash collisions. | BUG-002 |
| AC-32 | A game that was previously declared drawn due to a hash collision now continues correctly. | BUG-002 |
| AC-33 | After game-over, undoMove preserves the original game config (mode, difficulty, colour). | BUG-003 |
| AC-34 | A game started as PvP/Hard/Black retains that config through game-over and undo. | BUG-003 |
| AC-35 | When two king capture paths share origin/destination but differ in captured pieces, a disambiguation UI appears. | BUG-004 |
| AC-36 | Selecting a disambiguated path captures the correct pieces. | BUG-004 |
| AC-37 | When only one capture path exists for an origin/destination pair, no disambiguation is shown. | BUG-004 |

### 8.8 Notation

| ID | Criterion | Rule Ref |
|----|-----------|----------|
| AC-38 | Non-capture moves display as `origin-destination` (e.g., `32-28`). | FMJD-28 |
| AC-39 | Capture moves display as `origin×destination` (e.g., `19×30`). | FMJD-28 |

---

## 9. Edge Case Test Scenarios

### 9.1 Multi-Step Capture Edge Cases (BUG-001 related)

| ID | Scenario | Expected Behaviour |
|----|----------|-------------------|
| EC-01 | A man performs a 2-step backward-then-forward capture. | The capture completes; the board widget renders both jumps; no crash. |
| EC-02 | A king performs a 5-step capture changing direction at each step. | All 5 jumps animate correctly; all 5 captured pieces are removed after the sequence. |
| EC-03 | A multi-step capture sequence where the only legal continuation passes through the starting square. | The engine allows the piece to pass through its starting square (legal per FMJD deferred removal). UI renders this correctly. |
| EC-04 | A capture sequence where a jumped (but not yet removed) piece blocks a potential diagonal. | The capturing piece cannot jump the same piece twice, but the unremoved piece does occupy its square for path purposes per FMJD-15. Handled correctly. |

### 9.2 Hash Collision Edge Cases (BUG-002 related)

| ID | Scenario | Expected Behaviour |
|----|----------|-------------------|
| EC-05 | Two positions that are mirror images of each other (colour-swapped). | Distinct hashes; no false repetition. |
| EC-06 | A position with a man on square X vs. the same position with a king on square X. | Distinct hashes; different piece types must hash differently. |
| EC-07 | The same board configuration but different player to move. | Distinct hashes; player-to-move must be part of the hash. |
| EC-08 | Positions that differ only in a single piece on adjacent squares. | Distinct hashes; minimally different positions must not collide. |

### 9.3 Game Config Preservation Edge Cases (BUG-003 related)

| ID | Scenario | Expected Behaviour |
|----|----------|-------------------|
| EC-09 | Start a PvP game, play to checkmate, undo — config should be PvP (not vsAi). | Config preserved as PvP. |
| EC-10 | Start a vsAi/Expert/Black game, AI wins, undo two moves — config should remain vsAi/Expert/Black. | Config preserved correctly. |
| EC-11 | Game over by draw (threefold repetition), undo the draw-causing move — config preserved and game returns to in-progress. | Config preserved; game state correct. |
| EC-12 | Game is serialized to persistence after game-over, then restored — config is correct on restore. | Serialization includes config. |

### 9.4 Capture Path Disambiguation Edge Cases (BUG-004 related)

| ID | Scenario | Expected Behaviour |
|----|----------|-------------------|
| EC-13 | A king has 3 different capture paths with the same origin and destination but capturing 3 different sets of pieces. | Disambiguation UI shows all 3 options; player selects one; correct pieces are captured. |
| EC-14 | Two capture paths share the same origin and destination and capture the same pieces (truly identical paths). | No disambiguation needed; either path is applied (they produce identical outcomes). |
| EC-15 | A disambiguation selection combined with the maximum-capture rule — only maximum-capture paths are offered. | Non-maximum paths are filtered before disambiguation. |
| EC-16 | Disambiguation during a timed game — the player's clock continues while choosing. | Clock runs normally; disambiguation does not pause time. |

### 9.5 General FMJD Rule Edge Cases

| ID | Scenario | Expected Behaviour |
|----|----------|-------------------|
| EC-17 | A man reaches the back row mid-capture and must continue — does NOT promote. | Man continues as a man; promoted only if back row is the final square. |
| EC-18 | All 20 pieces of one side are captured in a single turn (theoretically possible with a long chain capture). | The game immediately ends as a win for the capturing player. |
| EC-19 | Both players have 1 king each, shuffling back and forth — should trigger 25-move rule. | After 50 half-moves without capture, the game is drawn. |
| EC-20 | A capture creates a qualifying 16-move configuration (e.g., captures leave 3K vs 1K). | The capture resets the counter; the 16-move rule starts counting from the next non-capture move. |
| EC-21 | A position occurs twice (not three times) — no draw. On the third occurrence, an immediate draw. | Game remains in progress after 2 occurrences; draw declared on the 3rd. |
| EC-22 | No legal moves AND a draw condition is met simultaneously. | Loss takes precedence — the player with no moves loses. |
| EC-23 | A king move that traverses 9 empty squares (maximum diagonal length on a 10×10 board). | Legal move; king stops on any of the 9 squares. |
| EC-24 | Maximum capture rule: two sequences capture the same number, but one involves a king and the other a man — both are legal choices. | Player may choose either (FMJD does not prefer king captures over man captures when the count is equal). |

---

## 10. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Crash rate on multi-step captures | 0% — zero crashes regardless of capture length | Automated tests + QA regression suite |
| Hash collision rate | 0 collisions across 10,000+ distinct positions | Automated collision test in CI |
| Game config preservation | 100% — config correct across all lifecycle transitions | Automated state-transition tests |
| Capture path correctness | 100% — correct pieces captured in all disambiguation scenarios | Automated tests with known ambiguous positions |
| FMJD rule compliance | 100% — all 28 rules passing automated verification | Test suite covering AC-01 through AC-39 |
| Cross-platform parity | 100% — Dart engine produces identical legal-move sets and outcomes as TypeScript engine for 1,000+ test positions | Cross-engine comparison test suite |
| Test coverage on mobile engine rules | ≥85% statement + branch coverage | CI coverage reports |
| Bug regression rate | 0% — none of the four bugs reoccur after fix | CI regression suite |

---

## 11. Technical Constraints

| Constraint | Description |
|------------|-------------|
| Dart engine must be self-contained | The Flutter mobile Dart engine in `mobile/lib/` must have no dependency on the shared TypeScript engine at runtime. It is a separate implementation that must conform to the same rules. |
| Cross-platform consistency | The Dart engine and the TypeScript shared engine must produce identical results for any given board position. Discrepancies are treated as bugs. |
| Performance | Legal-move generation must be fast enough for AI search (thousands of calls per second on mobile hardware). Bug fixes must not degrade performance beyond 10%. |
| Backward compatibility | Saved games in the mobile app must remain loadable after bug fixes. Hash changes (BUG-002) may require migration of stored position histories — handle gracefully (re-compute hashes or treat stored games as having no repetition history). |
| No FMJD rule simplifications | All rules must be implemented exactly per FMJD. No shortcuts or approximations (C5). |

---

## 12. Open Questions

| ID | Question | Impact | Owner |
|----|----------|--------|-------|
| OQ-01 | What disambiguation UI pattern should be used for BUG-004? Options: (a) highlight intermediate squares of each path on the board; (b) show a selection dialog listing captured pieces; (c) animate each option for the player to choose. | UX design for capture disambiguation. Must be resolved before implementation. | UX Designer |
| OQ-02 | Should the Zobrist hash random values (BUG-002 fix) be shared constants across TypeScript and Dart engines, or independently generated? Shared constants ensure identical hashes for cross-platform testing. | Cross-platform test strategy. | Engineering Lead |
| OQ-03 | For BUG-002, do we need to migrate position histories of saved in-progress games after the hash function changes? | Backward compatibility of saved games. | Engineering Lead |
| OQ-04 | Should the disambiguation mechanism (BUG-004) pause the clock in timed games? Current spec says no, but this may be a UX concern. | Timed mode fairness. | PM |
