# Task 007: King Movement & Capture Generation (Flying Kings)

**Feature:** Game Rules Engine  
**Dependencies:** 006-task-man-movement-capture  
**FRD Reference:** [game-rules-engine.md](../features/game-rules-engine.md)

---

## Description

Implement legal move generation for kings ("flying kings"). Kings can move any number of squares along a diagonal (in any direction) when not capturing. Kings can capture at any distance: jumping over an enemy piece and landing on any unoccupied square beyond it. This task extends the move generator built in task 006 to handle king-specific rules.

---

## Technical Requirements

### Non-Capture Moves (Kings)
- A king can move any number of unoccupied squares along any of the four diagonals
- Movement stops at the edge of the board or when encountering any piece (friendly or enemy)
- Each unoccupied square along the diagonal is a separate legal move

### Capture Moves (Kings)
- A king can capture an enemy piece at any diagonal distance
- The king jumps over the enemy piece and can land on ANY unoccupied square beyond it (not just the immediately adjacent one)
- Between the king and the captured piece, all squares must be unoccupied
- After the captured piece, there must be at least one unoccupied landing square
- Each possible landing square is a separate legal capture move (they may lead to different multi-jump continuations)

### Integration with Existing Move Generator
- The legal move generator from task 006 must be extended, not replaced
- For a given position, the generator produces moves for all pieces of the current player (both men and kings)
- Mandatory capture still applies: if any piece (man or king) can capture, all non-capture moves are excluded

---

## Acceptance Criteria

1. A king on an open diagonal generates moves to all unoccupied squares along that diagonal (up to the board edge)
2. A king's diagonal movement stops when it encounters any piece
3. A king can capture an enemy piece two or more squares away (flying capture)
4. After a king capture, all empty squares beyond the captured piece (until the next piece or board edge) are valid landing squares
5. A king capture where there is no empty square beyond the captured piece is not a valid capture
6. King captures and man captures coexist correctly in the legal move list
7. Mandatory capture applies to kings: if a king can capture, non-capture king moves are excluded
8. Mixed situations: if a man can capture but a king cannot, the king's non-capture moves are still excluded (mandatory capture is global)

---

## Testing Requirements

- **Unit tests:**
  - King quiet moves along all four diagonals from center and edge positions
  - King movement blocked by friendly and enemy pieces
  - King capture at distance 1, 2, 3+ squares
  - King capture with multiple possible landing squares
  - Mixed board: man and king moves combined
  - Mandatory capture with kings and men
- **Position tests:** Known king positions from draughts puzzles with expected move counts
- **Minimum coverage:** ≥ 85%
