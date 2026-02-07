# Task 005: Board Representation & Initial Position

**Feature:** Game Rules Engine  
**Dependencies:** 003-task-shared-library-scaffolding  
**FRD Reference:** [game-rules-engine.md](../features/game-rules-engine.md)

---

## Description

Implement the board data structure representing a 10×10 international draughts board using only the 50 dark (playable) squares, with FMJD standard numbering (1–50). Implement the initial position setup with 20 white pieces on squares 1–20 and 20 black pieces on squares 31–50. Define all core game types: piece (Man/King × White/Black), square (Empty/Occupied), board position, and game state container.

This is the foundational data model that all other rules engine work builds upon.

---

## Technical Requirements

### Board Model
- 10×10 board where only the 50 dark squares are addressable
- FMJD numbering: squares numbered 1–50, with square 1 at the top-right of the board (from White's perspective) and square 50 at the bottom-left
- Efficient internal representation (e.g., bitboard, flat array, or map — the choice must support fast legal move generation)
- Coordinate conversion between FMJD square numbers and internal (row, column) positions

### Piece Model
- Two piece types: Man and King
- Two colors: White and Black
- A square can be: Empty, or occupied by one piece of a specific type and color

### Game State
- Complete state container holding: board position, current player to move, move history (list of moves in FMJD notation), game phase (InProgress, WhiteWins, BlackWins, Draw), captured piece counts
- Draw-rule state: position history (for threefold repetition), king-only-move counter (for 25-move rule), piece counts per side (for 16-move endgame rule)
- Factory function to create a new game in the standard initial position

### FMJD Notation
- Functions to convert between internal move representation and FMJD notation strings (e.g., `32-28` for a quiet move, `19x30` for a capture)

---

## Acceptance Criteria

1. A new game creates a board with 20 white men on squares 1–20, 20 black men on squares 31–50, and squares 21–30 empty
2. Every FMJD square number (1–50) maps to a unique (row, column) position and back
3. The game state includes all required fields: board position, current player (White moves first), empty move history, game phase (InProgress), zero captured counts
4. The draw-rule state is initialized correctly: empty position history, king-move counter at 0, starting piece counts (20 per side)
5. The FMJD notation formatter produces correct strings for quiet moves and captures
6. Board representation rejects invalid square numbers (< 1 or > 50)
7. Position equality comparison works correctly (same pieces on same squares = same position)

---

## Testing Requirements

- **Unit tests:**
  - Initial position has correct piece placement on all 50 squares
  - FMJD square number ↔ (row, col) conversion for all 50 squares
  - FMJD notation formatting for quiet moves and captures
  - Game state factory produces correct initial state
  - Position equality: identical positions are equal, different positions are not
  - Invalid square numbers throw/return errors
- **Property-based tests:** Random valid square numbers always map to valid board coordinates and back
- **Minimum coverage:** ≥ 85%
