# Task 006: Regular Piece Movement & Capture Generation

**Feature:** Game Rules Engine  
**Dependencies:** 005-task-board-representation  
**FRD Reference:** [game-rules-engine.md](../features/game-rules-engine.md)

---

## Description

Implement legal move generation for regular pieces (non-king pieces). This includes non-capture moves (one square diagonally forward) and capture moves (jumping over an adjacent enemy piece forward or backward). Implement the mandatory capture rule: when captures are available, non-capture moves are illegal.

This task does NOT include: king movement, maximum capture selection, or multi-jump logic. Those are handled in subsequent tasks.

---

## Technical Requirements

### Non-Capture Moves (Regular pieces)
- A regular piece can move one square diagonally forward (toward the opponent's side) to an unoccupied square
- Regular pieces cannot move backward (except for captures)
- "Forward" depends on the piece's color: forward for White is toward higher row numbers; forward for Black is toward lower row numbers

### Capture Moves (Regular pieces)
- A regular piece can capture by jumping over an adjacent enemy piece (diagonally, forward OR backward) to the empty square immediately beyond it
- The jumped square must contain an enemy piece
- The landing square must be empty
- Single-capture generation only in this task (multi-jump chaining is a separate task)

### Mandatory Capture
- When any capture is available for the current player, all non-capture moves are excluded from the legal move list
- The legal move generator must distinguish between "capture moves available" and "only quiet moves available"

### Move Application
- Applying a non-capture move: piece moves from origin to destination, turn switches
- Applying a single capture: piece moves to landing square, captured piece is marked (but not removed yet — removal happens after sequence completion in the multi-jump task)

---

## Acceptance Criteria

1. A regular piece on a non-edge square with two open forward diagonals generates exactly two non-capture moves
2. A regular piece on an edge square generates only valid forward diagonal moves (1 or 0 depending on position)
3. A regular piece blocked by friendly pieces on both forward diagonals generates zero moves
4. A regular piece adjacent to an enemy piece with an empty square beyond generates a capture move
5. A regular piece can capture backward (toward its own side)
6. When captures are available for any piece, the legal move list contains only capture moves (mandatory capture)
7. When no captures are available, the legal move list contains all valid non-capture moves
8. Applying a non-capture move updates the board and switches the current player
9. Applying a capture marks the jumped piece and moves the capturing piece to the landing square

---

## Testing Requirements

- **Unit tests:**
  - Regular piece forward moves from various board positions (center, edge, corner-adjacent)
  - Regular piece blocked by friendly and enemy pieces
  - Regular piece captures forward and backward
  - Mandatory capture: verify non-capture moves excluded when captures exist
  - Move application produces correct resulting board state
  - Edge cases: regular piece at the edge of the board, regular piece surrounded
- **Position tests:** Set up known positions from draughts puzzles and verify correct move generation
- **Minimum coverage:** ≥ 85%
