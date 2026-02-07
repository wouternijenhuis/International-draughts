# Task 020: Pause, Resume & Crash Recovery

**Feature:** Game Modes & Lifecycle  
**Dependencies:** 019-task-game-session-management, 010-task-backend-auth  
**FRD Reference:** [game-modes-lifecycle.md](../features/game-modes-lifecycle.md)

---

## Description

Implement pause/resume functionality and crash recovery for in-progress games. Registered users' game state is persisted (to backend or local storage) so that games survive browser closure. Guest users' game state is stored in browser sessionStorage and lost on browser close. Auto-save ensures recovery from crashes or accidental tab closures.

---

## Technical Requirements

### Pause/Resume
- A "Pause" button is available during any active game
- Pausing freezes the game state (including timers if timed mode is active)
- Paused games show a "Resume" option on the home screen or game list
- Resuming restores the exact game state (board position, move history, draw counters, timers)

### Persistence Strategy
- **Registered users:** Game state saved via backend API endpoint (`POST /api/v1/games/in-progress`) or in browser localStorage with backend sync
- **Guests:** Game state saved in browser sessionStorage. Lost on browser/tab closure. Available within the same session.

### Backend Endpoints for In-Progress Games
- `POST /api/v1/games/in-progress` — Save the current game state (serialized JSON) for the authenticated user
- `GET /api/v1/games/in-progress` — Retrieve the saved in-progress game state (if any)
- `DELETE /api/v1/games/in-progress` — Remove the saved state (called on game completion or explicit discard)
- One in-progress game per user (saving a new one overwrites the previous)

### Auto-Save / Crash Recovery (REQ-66)
- After each move, auto-save the game state (to backend for registered users, to sessionStorage for guests)
- On app load: check for a saved in-progress game. If found, show a "Resume Game?" prompt.
- If the user resumes: restore the game state and continue play
- If the user declines: discard the saved state

### Serialization
- Complete game state must be serializable to JSON: board position, current player, move history, game phase, draw counters, timer state (if timed), game mode, difficulty, color choice
- Deserialized state must be validated against the rules engine to detect corruption

---

## Acceptance Criteria

1. A registered user can pause a game, close the browser, return later, and resume from where they left off
2. A guest user can pause and resume within the same browser session
3. A guest user who closes the browser loses their in-progress game (sessionStorage cleared)
4. Auto-save occurs after each move (registered users)
5. On app load with a saved game: a "Resume Game?" prompt is displayed
6. Resuming restores the correct board position, move history, current player, and all counters
7. If timed mode was active, the remaining times are restored correctly
8. Declining to resume deletes the saved state
9. Starting a new game discards any existing saved in-progress game
10. Corrupted saved state is detected and discarded with a user-friendly message

---

## Testing Requirements

- **Unit tests:**
  - Game state serialization/deserialization roundtrip produces identical state
  - Corrupted state detection rejects invalid data
  - Auto-save triggers after each move
- **Integration tests:**
  - Full flow: start game → make moves → close browser → reopen → resume prompt → resume → correct state
  - Guest flow: pause → resume within session → works; close browser → state gone
  - Backend endpoints: save → retrieve → delete cycle
  - Timer state restored correctly on resume
- **E2E tests:**
  - Registered user crash recovery: play → simulate tab close → reopen → resume
- **Minimum coverage:** ≥ 85%
