# Task 026: Replay Viewer

**Feature:** Player Profile, Statistics & Rating / Game Modes & Lifecycle  
**Dependencies:** 016-task-board-rendering, 024-task-backend-player-data, 005-task-board-representation  
**FRD Reference:** [player-profile-statistics.md](../features/player-profile-statistics.md), [game-modes-lifecycle.md](../features/game-modes-lifecycle.md)

---

## Description

Implement the replay viewer that allows registered users to step through completed games move-by-move. The viewer loads a saved game record (move history), replays the moves on the board component, and provides forward/backward navigation with a synchronized move list.

---

## Technical Requirements

### Replay Engine
- Load a completed game's move history (array of FMJD notation moves) from the backend
- Reconstruct the board state at any point by replaying moves sequentially from the initial position
- Support stepping forward (apply next move) and backward (revert to previous state)
- Support jumping to any move in the history directly (click on move list)

### Replay Controls
- **Forward button (→):** Advance one move
- **Backward button (←):** Revert one move
- **First move (⏮):** Jump to the initial position
- **Last move (⏭):** Jump to the final position
- **Auto-play (▶):** Animate through the game at configurable speed
- Keyboard shortcuts: arrow keys for forward/backward

### Move List Panel
- Display the full move list in standard notation (e.g., "1. 32-28 19-23 2. 37-32 ...")
- Current move is highlighted in the list
- Clicking a move in the list jumps to that position

### Board Integration
- Use the same board rendering component (task 016) to display positions
- Piece placement updates smoothly (animated or instant based on animation speed setting)
- Last-move indicator shows the move that produced the current position
- Read-only: no drag-and-drop or tap-to-move interaction

### Game Metadata Display
- Header showing: date, opponent (AI difficulty or "Local PvP"), result, move count, time control

---

## Acceptance Criteria

1. Opening a completed game from game history loads the replay viewer
2. The initial position is displayed by default
3. Forward button advances one move and the board updates correctly
4. Backward button reverts one move and the board shows the previous position
5. First/last buttons jump to the start/end of the game
6. Auto-play animates through the game at a reasonable speed
7. Clicking a move in the move list jumps to that position
8. The current move is highlighted in the move list
9. The last-move indicator shows the most recent move at each position
10. Game metadata (date, opponent, result) is displayed
11. The viewer is read-only — no moves can be made or modified
12. Keyboard arrow keys work for navigation

---

## Testing Requirements

- **Unit tests:**
  - Move replay: applying moves in sequence produces correct board states
  - Forward/backward navigation state management
  - Jump-to-move positions correctly
- **Component tests:**
  - Replay controls render and respond to clicks
  - Move list highlights the current move
  - Board displays the correct position at each step
- **Integration tests:**
  - Load a game record from the API → display in replay viewer → step through all moves → verify final position matches the game result
- **Accessibility tests:**
  - Replay controls are keyboard-accessible
  - Screen reader announces the current move and position
- **Minimum coverage:** ≥ 85%
