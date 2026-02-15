# Game Rules — International Draughts (FMJD)

## Board Setup

- **Board**: 10×10 with alternating light/dark squares
- **Playable squares**: 50 dark squares, numbered 1–50
- **Pieces**: Each player starts with 20 men on their first four rows
- **Empty rows**: Rows 5 and 6 (squares 21–30) are initially empty
- **First move**: White (light pieces) moves first

## Piece Movement

### Men (Regular Pieces)

- Move **one square diagonally forward** to an unoccupied square
- Cannot move backward (except when capturing)

### Kings (Flying Kings)

- Move **any number of squares diagonally** in any direction
- Created when a man reaches the opponent's back row and stops there

## Capturing

### Mandatory Capture Rule

Captures are **mandatory**. If a capture is available, the player must take it.

### Maximum Capture Rule

When multiple capture sequences are possible, the player must execute the sequence that captures the **maximum number** of opponent pieces.

### Man Captures

- Jump over an adjacent enemy piece (forward or backward) to land on the empty square beyond
- Multi-jump: continue capturing in the same turn if more captures are available

### King Captures (Flying)

- Can jump over an enemy piece at **any distance** diagonally
- Can land on **any empty square** beyond the captured piece
- Must still follow the maximum capture rule

### Multi-Jump Rules

- Jumped pieces are removed **only after the entire sequence is complete**
- A piece cannot be jumped more than once in a single sequence
- A man passing through the promotion row mid-capture does **not** promote

## Promotion

A man is promoted to a king when it **stops on the opponent's back row** at the end of its turn. Passing through the back row during a capture sequence does not trigger promotion.

## Game Outcome

### Win Conditions

A player **wins** when the opponent:
- Has no remaining pieces, OR
- Has no legal moves (all pieces blocked)

### Draw Conditions

The game is **drawn** when:

1. **Threefold repetition**: The same position with the same player to move occurs for the third time
2. **25-move rule**: 25 consecutive moves by each player with only king moves and no captures
3. **Endgame draw (16-move rule)**: In endgames with 3 pieces vs. 1 king (3 kings, 2 kings + 1 man, or 1 king + 2 men vs. 1 king), if 16 moves pass without resolution

### Time Forfeit

In timed mode, a player whose clock runs out **loses**, unless the opponent has insufficient material to win (in which case, the game is drawn).

## Notation

Standard FMJD notation uses square numbers 1–50:

- **Quiet move**: `32-28` (piece moves from square 32 to 28)
- **Capture**: `23x14` (piece on 23 captures, landing on 14)
- **Multi-capture**: `23x14x5` (sequential multi-capture)
