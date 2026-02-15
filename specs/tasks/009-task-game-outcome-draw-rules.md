# Task 009: Game Outcome Detection & Draw Rules

**Feature:** Game Rules Engine  
**Dependencies:** 008-task-multi-jump-maximum-capture  
**FRD Reference:** [game-rules-engine.md](../features/game-rules-engine.md)

---

## Description

Implement win/loss detection and all three draw rules specified by FMJD: threefold repetition, the 25-move king-only rule, and the 16-move endgame rule. After each move, the engine must check for game termination conditions and update the game phase accordingly.

---

## Technical Requirements

### Win/Loss Detection (REQ-11)
- A player loses when it is their turn and they have no legal moves (no pieces remaining, or all pieces are blocked)
- After each move, check if the opponent has any legal moves; if not, the current player wins

### Draw: Threefold Repetition (REQ-12)
- Track every board position that has occurred during the game (pieces + types + colors on all squares, plus whose turn it is)
- Position hashing: use an efficient hash (e.g., Zobrist hashing) for fast comparison
- If the same position occurs for the third time, the game is automatically drawn
- The position history must be part of the game state

### Draw: 25-Move King-Only Rule (REQ-12)
- Track consecutive moves where both sides have only kings (no regular pieces) and no captures occur
- If 25 such consecutive moves pass (25 by each side = 50 half-moves) without a capture, the game is drawn
- The counter resets when a capture is made or when a regular piece is still on the board
- This counter must be part of the game state

### Draw: 16-Move Endgame Rule (REQ-12)
- In specific endgame material configurations, if the game lasts 16 moves per player (32 half-moves) without resolution, the game is drawn
- Material configurations triggering this rule:
  - 3 kings vs. 1 king
  - 2 kings + 1 regular piece vs. 1 king
  - 1 king + 2 regular pieces vs. 1 king
  - (Other standard FMJD endgame configurations as defined in the rules)
- The 16-move counter resets if a capture occurs or if the material configuration changes
- This counter must be part of the game state

### Game Phase Updates
- After each move: check win/loss, check threefold, check 25-move, check 16-move
- Update game phase to the appropriate terminal state (WhiteWins, BlackWins, Draw) with a reason

---

## Acceptance Criteria

1. A player with no legal moves loses; the game phase updates to the opponent's win
2. A player with no remaining pieces loses
3. Threefold repetition: when the same position occurs three times, the game is drawn
4. 25-move king rule: after 25 consecutive king-only moves without captures (per side), the game is drawn
5. 16-move endgame rule: in qualifying endgame material, the game is drawn after 16 moves per player without resolution
6. Draw reasons are recorded (threefold, 25-move, 16-move)
7. Position hashing: two identical positions produce the same hash; different positions produce different hashes (within practical collision bounds)
8. All counters reset correctly when their reset conditions are met
9. Game phase transitions are irreversible: once a game is drawn or won, no further moves can be applied

---

## Testing Requirements

- **Unit tests:**
  - Win detection: position with no legal moves for one side
  - Loss by elimination: all pieces captured
  - Threefold repetition with exact 3-occurrence detection (not 2 or 4)
  - 25-move rule counter increments, resets on capture, resets when regular pieces exist
  - 16-move rule for each qualifying material configuration
  - Counter reset on capture during endgame
  - Game phase becomes terminal and rejects further moves
- **Position tests:** Known endgame positions that trigger each draw rule
- **Hash tests:** Position hashing collision tests on diverse boards
- **Regression tests:** Verify that adding draw detection does not break existing move generation
- **Minimum coverage:** ≥ 85%
