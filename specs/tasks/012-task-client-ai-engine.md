# Task 012: Client-Side AI Engine (Easy, Medium, Hard)

**Feature:** AI Computer Opponent  
**Dependencies:** 005-task-board-representation, 006-task-regular-piece-movement-capture, 007-task-king-movement-capture, 008-task-multi-jump-maximum-capture, 009-task-game-outcome-draw-rules  
**FRD Reference:** [ai-computer-opponent.md](../features/ai-computer-opponent.md)

---

## Description

Implement the client-side AI engine that powers the Easy, Medium, and Hard difficulty levels. The engine uses the shared Game Rules Engine for move generation and implements a minimax/alpha-beta search algorithm with a configurable evaluation function. Each difficulty level is differentiated by search depth, evaluation noise, and move selection strategy — all controlled by externalized configuration parameters.

This AI runs entirely in the browser and must respond within 2 seconds per move on a modern device.

---

## Technical Requirements

### Search Algorithm
- Alpha-beta pruning minimax search
- Iterative deepening: search at increasing depths within a time budget
- Move ordering: prioritize captures, then historically good moves, to maximize pruning efficiency
- Transposition table for avoiding redundant searches on the same position

### Evaluation Function
- Evaluate non-terminal positions based on positional concepts:
  - Material count (regular pieces and kings, with kings worth more)
  - Centre control (pieces on central squares are better)
  - Piece mobility (number of available moves)
  - Advancement (regular pieces closer to promotion are better)
  - King safety (kings in favorable positions)
  - Piece structure (connected pieces, avoiding isolated pieces)
- Terminal positions: return extreme scores for wins/losses, 0 for draws

### Difficulty Configuration (REQ-71, REQ-73)
- Configuration structure per difficulty level with at minimum:
  - Maximum search depth
  - Time limit per move
  - Evaluation noise amplitude (random perturbation added to evaluation scores)
  - Blunder probability (chance of selecting a suboptimal move — for Easy/Medium)
  - Blunder depth (how far from optimal the blunder can be)
- All parameters externalized in a configuration file, not hardcoded

### Difficulty Behaviour (REQ-72)
- **Easy:** Shallow depth (1–2 ply), high noise, moderate blunder rate. Should occasionally miss captures, prefer simple moves. Human-like mistakes, not random.
- **Medium:** Moderate depth (3–5 ply), moderate noise, low blunder rate. Plays solidly, misses deep tactics.
- **Hard:** Deep search (6+ ply), minimal noise, no deliberate blunders. Strong positional and tactical play.

### Human-Like Mistakes (Easy/Medium)
- Blunders are implemented by: evaluating all moves, then with a configured probability, selecting a move that is within a configured score margin of the best move (but not the best)
- Never select an illegal move, even as a blunder
- Blunders should look like plausible human errors (e.g., missing a multi-capture, choosing a slightly inferior positional move)

### Performance
- AI runs in a Web Worker to avoid blocking the main UI thread
- Communication between the main thread and AI worker via message passing
- Response time for Easy–Hard: < 2 seconds on a modern device (e.g., 2020+ smartphone or mid-range laptop)

### Development Diagnostics
- Add structured debug logs for AI lifecycle events in development mode only (`NODE_ENV=development`), including:
  - AI move scheduling/start/completion
  - Selected difficulty and search diagnostics (e.g., depth reached, nodes evaluated, score)
  - Cancellation/failure paths (no legal move, missing config, interrupted game state)
- Logging must not be emitted in production builds unless explicitly enabled via environment configuration.

---

## Acceptance Criteria

1. Easy AI responds with a legal move within 2 seconds
2. Medium AI responds with a legal move within 2 seconds
3. Hard AI responds with a legal move within 2 seconds
4. Easy AI loses to a player who has learned the basic rules within a few games
5. Hard AI plays noticeably stronger than Medium, which plays noticeably stronger than Easy
6. AI never makes an illegal move at any difficulty level
7. AI always respects mandatory capture and maximum-capture rules
8. Easy and Medium occasionally make suboptimal moves that look like human mistakes (not random)
9. Difficulty parameters (depth, noise, blunder rate) are loaded from configuration and can be changed without code modifications
10. AI computation runs in a Web Worker; the UI thread remains responsive during AI thinking
11. The evaluation function considers material, position, mobility, and advancement

---

## Testing Requirements

- **Unit tests:**
  - Alpha-beta search finds the best move in simple tactical positions (e.g., forced win in 2)
  - Evaluation function scores material advantage correctly
  - Evaluation function scores positional advantages (centre control, advancement)
  - Move ordering improves pruning efficiency (measure node count)
  - Difficulty configuration loads correctly
  - Blunder logic: with high blunder rate, suboptimal moves are selected; with zero blunder rate, best move is always selected
- **Integration tests:**
  - AI plays a complete game without crashing or making illegal moves (at each difficulty level)
  - AI response time is < 2 seconds in a browser environment
  - Web Worker communication works correctly (request position, receive move)
- **Benchmark tests:**
  - AI at each difficulty solves a set of tactical puzzles (Easy solves few, Hard solves most)
  - Self-play: Hard consistently beats Easy and Medium
- **Minimum coverage:** ≥ 85%
