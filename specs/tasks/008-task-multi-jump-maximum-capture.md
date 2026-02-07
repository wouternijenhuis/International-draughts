# Task 008: Multi-Jump Sequences & Maximum Capture Rule

**Feature:** Game Rules Engine  
**Dependencies:** 007-task-king-movement-capture  
**FRD Reference:** [game-rules-engine.md](../features/game-rules-engine.md)

---

## Description

Implement multi-jump (multi-capture) sequences and the maximum capture rule. When a piece captures an enemy piece, if further captures are available from the landing square, the capturing piece must continue capturing. Among all possible capture sequences, the player must execute the one that captures the maximum number of opponent pieces. Jumped pieces are removed only after the entire sequence completes, and no piece can be jumped twice in a single sequence.

This is the most complex rules task and must handle all edge cases of the FMJD capture rules.

---

## Technical Requirements

### Multi-Jump Logic
- After a capture, check if the capturing piece can make another capture from its new position
- If further captures are possible, they must be taken (the player cannot stop mid-sequence)
- Build a tree of all possible capture continuations from each initial capture
- A jumped piece remains on the board during the sequence (it blocks further movement through its square) but cannot be jumped a second time

### Maximum Capture Rule (REQ-6, REQ-10)
- When multiple capture sequences exist, only the sequence(s) capturing the MOST pieces are legal
- This applies globally: if one piece can capture 3 and another can capture 2, only the piece capturing 3 is legal
- If multiple sequences capture the same maximum count, the player can choose among them

### Piece Removal
- Jumped pieces are removed from the board only after the entire capture sequence is complete
- During the sequence, jumped pieces remain on the board (they occupy their squares and block movement) but are marked as "to be removed"

### Promotion During Capture
- A man passing through the opponent's back row mid-capture is NOT promoted during that sequence (FMJD rule — REQ-8)
- Promotion only occurs if the man ends its turn (after the complete sequence) on the back row

### Move Output
- Complete capture sequences are output in FMJD notation (e.g., `19x10x3` for a double capture via squares 10 and 3)
- Each legal move in the move list is a complete sequence, not individual jumps

---

## Acceptance Criteria

1. A piece that captures and has further captures from the landing square must continue capturing — single-jump-and-stop is not a legal option
2. When multiple capture sequences are possible, only those capturing the maximum number of pieces are legal
3. A sequence capturing 3 pieces is legal; a sequence capturing 2 from a different piece is not legal (maximum rule is global)
4. If two sequences both capture 3 pieces, both are legal options
5. Jumped pieces remain on the board during the sequence and block movement through their squares
6. A piece cannot jump the same enemy piece twice in one sequence
7. Jumped pieces are removed from the board only after the complete sequence
8. A man passing through the back row mid-capture is NOT promoted; it continues as a man
9. A man ending its complete capture sequence on the back row IS promoted to king
10. Multi-jump notation is correctly formatted (e.g., `19x10x3`)
11. King multi-jumps with flying captures: the king can change direction between captures, each landing any distance beyond the captured piece

---

## Testing Requirements

- **Unit tests:**
  - Simple double and triple captures (man and king)
  - Maximum capture: multiple pieces have capture options, only the maximum-count sequence is legal
  - Jumped piece blocking: piece cannot pass through a jumped-but-not-yet-removed piece
  - No double-jumping the same piece
  - Piece removal timing: verify board state mid-sequence vs. post-sequence
  - Promotion mid-capture: man passes through back row but does not promote
  - Promotion end-of-capture: man ends on back row and promotes
  - King multi-directional captures (flying king changes diagonal between jumps)
- **Position tests:** Classic draughts problems with known maximum-capture solutions
- **Edge case tests:** All pieces can capture resulting in complex trees; cycles that would violate the no-double-jump rule
- **Minimum coverage:** ≥ 85%
