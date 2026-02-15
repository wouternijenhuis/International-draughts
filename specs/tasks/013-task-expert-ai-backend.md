# Task 013: Expert AI Backend Service

**Feature:** AI Computer Opponent  
**Dependencies:** 001-task-backend-scaffolding, 009-task-game-outcome-draw-rules  
**FRD Reference:** [ai-computer-opponent.md](../features/ai-computer-opponent.md), [backend-api-deployment.md](../features/backend-api-deployment.md)

---

## Description

Implement the server-side Expert AI as a backend service endpoint. The Expert AI uses the same core rules engine but with a deeper search, stronger evaluation function, and no artificial weakening. The endpoint receives a complete board position and returns the computed best move. The contract is stateless — no game session is maintained server-side between requests (REQ-70).

This is the v1 Expert AI: deep alpha-beta search with a hand-tuned evaluation function. Post-launch enhancements (endgame databases, opening book, ML eval) are separate future tasks.

---

## Technical Requirements

### API Endpoint
- `POST /api/v1/ai/move` — Accepts a board position (serialized game state), returns the best move in FMJD notation
- Request body: full board position (all piece positions, types, colors, current player to move)
- Response body: computed move (FMJD notation), time consumed (ms), search depth reached
- Timeout: configurable (default 30 seconds). If the search has not completed by the timeout, return the best move found so far (from iterative deepening)
- HTTP 408 if no move is found within timeout (should be rare with iterative deepening)

### Search Engine (v1)
- Alpha-beta with iterative deepening and aspiration windows
- Principal Variation Search (PVS) for tighter bounds
- Late Move Reductions (LMR) for less promising moves
- Transposition table (in-memory, sized per instance)
- Killer moves and history heuristic for move ordering
- No artificial weakening — Expert plays at maximum strength

### Evaluation Function (v1 — Hand-Tuned)
- All factors from the client-side evaluation, plus:
  - Left/right balance (pieces distributed across the board)
  - Locked positions (chains that restrict opponent mobility)
  - Runaway regular pieces (regular pieces that cannot be stopped from promoting)
  - King centralization
  - Tempo advantage
- Evaluation weights tuned by hand, stored in configuration

### Performance
- The engine should reach significant search depth (10+ ply) within the timeout on a modern server CPU
- Memory: transposition table size configurable (default 256 MB)
- Concurrent requests: the endpoint must handle multiple simultaneous requests. Each request gets its own search instance.

### Stateless Contract (REQ-70)
- No session state is maintained between requests
- Each request contains the full board position needed to compute a move
- The server does not store or recall previous positions from a game

---

## Acceptance Criteria

1. `POST /api/v1/ai/move` with a valid board position returns a legal move in FMJD notation
2. The returned move is the strongest move found within the configured time limit
3. If the timeout is reached, the best move from the deepest completed iteration is returned (not an error)
4. The endpoint is stateless: two consecutive requests with different positions return independently correct moves
5. The Expert AI never returns an illegal move
6. The AI respects mandatory capture and maximum-capture rules
7. The endpoint returns structured error responses for malformed requests (400) and internal errors (500)
8. Multiple concurrent requests are handled without interference
9. Search depth and evaluation weights are configurable without code changes
10. Response includes search depth reached and time consumed

---

## Testing Requirements

- **Unit tests:**
  - Search finds forced wins in known tactical positions
  - Evaluation function scores positions correctly (material, positional features)
  - Iterative deepening returns the best move from the deepest completed iteration on timeout
  - Stateless: same position always returns the same move (deterministic search)
- **Integration tests:**
  - Full endpoint test: POST valid position → receive legal move → verify move is legal
  - Malformed request returns 400 with structured error
  - Concurrent requests return correct independent results
  - Timeout behavior: artificially restrict timeout and verify a move is still returned
- **Benchmark tests:**
  - Measure search depth reached at various time limits (5s, 15s, 30s)
  - Solve a suite of tactical puzzles — Expert should solve > 90%
- **Minimum coverage:** ≥ 85%
