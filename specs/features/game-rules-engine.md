# Feature: Game Rules Engine

**Feature ID:** `game-rules-engine`  
**PRD Version:** 1.0  
**Last Updated:** 2026-02-07  
**Status:** Draft

---

## 1. Purpose

Implement the complete, FMJD-compliant international draughts rules engine. This is the core logic layer that represents the board, generates legal moves, enforces captures, promotes pieces, and detects game outcomes (wins, losses, draws). Every other feature — AI, game modes, UI — depends on this engine being correct and complete.

---

## 2. PRD Traceability

| Requirement | Description | Coverage |
|-------------|-------------|----------|
| REQ-1 | 10×10 board, 50 dark squares, dark lower-left corner | Board representation |
| REQ-2 | 20 pieces per player, first four rows | Initial position setup |
| REQ-3 | White moves first, turns alternate | Turn management |
| REQ-4 | Regular pieces move one square diagonally forward | Regular piece movement rules |
| REQ-5 | Mandatory captures, regular pieces capture forward and backward | Capture generation |
| REQ-6 | Maximum capture rule — must take the most pieces | Capture validation |
| REQ-7 | Jumped pieces removed after complete sequence; no re-jumping | Multi-capture logic |
| REQ-8 | Promotion to king on opponent's back row | Promotion logic |
| REQ-9 | Flying kings — move any distance diagonally | King movement rules |
| REQ-10 | Kings capture at any distance, maximum capture applies | King capture rules |
| REQ-11 | Loss when no valid moves remain | Win/loss detection |
| REQ-12 | Draw rules: threefold repetition, 25-move king rule, 16-move endgame rule | Draw detection |
| REQ-13 | FMJD notation system (squares 1–50) | Move notation |
| REQ-14 | Visual highlight of all legal moves (data output for UI) | Legal move output |
| REQ-58 | Complete game state: position, current player, captured pieces, move history, game phase | State management |
| REQ-59 | Draw-rule tracking: position history, king-move counter, piece counts | State tracking |

---

## 3. Inputs

- A game action from the player or AI: piece selection, move/capture destination
- Current board state (position of all pieces, types, current player to move)

---

## 4. Outputs

- Updated board state after a valid move is applied
- List of all legal moves for the current player (including mandatory captures)
- Capture sequences with maximum-capture enforcement
- Game outcome determination: in-progress, win (by elimination or blocking), or draw (by rule)
- Move notation in FMJD standard format (squares numbered 1–50)

---

## 5. Dependencies

| Direction | Feature | Relationship |
|-----------|---------|-------------|
| **None (upstream)** | — | This is the foundational feature with no upstream dependencies |
| Downstream | AI Computer Opponent | Needs legal move generation and position state |
| Downstream | Game Modes & Lifecycle | Needs to apply moves and check outcomes |
| Downstream | UI & Board Experience | Needs legal move highlights and board state |
| Downstream | Timed Mode | Needs move completion events |
| Downstream | Player Profile & Statistics | Needs game results |

---

## 6. Acceptance Criteria

1. **Board initialisation:** A new game creates a 10×10 board with 20 white pieces on squares 1–20 and 20 black pieces on squares 31–50 (FMJD numbering), with squares 21–30 empty.
2. **Regular piece movement:** A regular piece can only move to one diagonally adjacent forward square that is unoccupied. No backward non-capture moves.
3. **Regular piece capture:** A regular piece can capture forward or backward by jumping over an adjacent enemy piece to the empty square beyond. Captures are mandatory when available.
4. **Maximum capture enforcement:** When multiple capture sequences exist, only those capturing the maximum number of pieces are legal. The player must choose from among these.
5. **Multi-jump removal:** During a multi-capture sequence, jumped pieces remain on the board until the entire sequence completes. A piece cannot be jumped twice in the same sequence.
6. **Promotion:** A regular piece that ends its turn on the opponent's back row is promoted to a king. A regular piece passing through the back row mid-capture sequence is NOT promoted during that sequence (FMJD rule).
7. **Flying king movement:** A king can move any number of unoccupied squares along any diagonal.
8. **Flying king capture:** A king can capture an enemy piece at any diagonal distance, landing on any unoccupied square beyond it, and must continue capturing if more captures are available.
9. **Win detection:** The engine correctly identifies a win when a player has no legal moves (no pieces left, or all pieces blocked).
10. **Threefold repetition:** The engine detects when the same position (same piece layout + same player to move) occurs for the third time and declares a draw.
11. **25-move king rule:** The engine tracks consecutive moves where only kings move and no captures occur, and declares a draw after 25 such moves.
12. **16-move endgame rule:** In endgames matching the specified material configurations (e.g., 3 kings vs. 1 king), the engine declares a draw after 16 moves per player without resolution.
13. **Notation output:** All moves are recorded and outputtable in FMJD notation (e.g., `32-28`, `19x30`).
14. **Legal move generation:** Given any valid board position, the engine returns the complete list of legal moves, correctly distinguishing between regular moves and mandatory captures.
15. **State completeness:** The game state object at all times contains: board position, current player, move history, game phase, and all counters needed for draw-rule enforcement.
16. **No illegal states:** Applying a legal move to a valid state always produces another valid state. The engine must reject attempts to apply illegal moves.

---

## 7. Technical Constraints

- Must be implemented in a way that can run both client-side (for Easy–Hard AI and local PvP) and potentially server-side (for Expert AI). This implies pure logic with no UI or browser dependencies.
- Performance: legal move generation must be fast enough to support AI search (thousands of calls per second).
- The engine must be deterministic — the same position must always produce the same set of legal moves.

---

## 8. Open Questions

- None — the FMJD rules are well-defined and unambiguous.
