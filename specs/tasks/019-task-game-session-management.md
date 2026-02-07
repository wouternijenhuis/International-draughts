# Task 019: Game Session Management (PvC & Local PvP)

**Feature:** Game Modes & Lifecycle  
**Dependencies:** 009-task-game-outcome-draw-rules, 012-task-client-ai-engine, 011-task-frontend-auth, 017-task-piece-interaction  
**FRD Reference:** [game-modes-lifecycle.md](../features/game-modes-lifecycle.md)

---

## Description

Implement the game session orchestrator that manages the full lifecycle of a game: starting a new game (PvC or local PvP), managing turns, integrating AI move requests (PvC), handling in-game actions (undo, resign, draw offer), detecting game completion, and recording game results. This is the "glue" that connects the rules engine, AI, UI, and authentication into a coherent gameplay experience.

---

## Technical Requirements

### Game Setup
- **New PvC Game:** Player selects difficulty (Easy/Medium/Hard/Expert), color (White or Black). A new game state is created with the initial position. If Expert, AI moves are requested via the backend API; otherwise, the client-side AI worker is used.
- **New Local PvP Game:** Two players share one device. No difficulty selection. Board orientation: configurable (neutral or rotating — see Open Questions in FRD).

### Turn Management
- **PvC:** After the human player's move, the system sends the current position to the AI (client worker or Expert endpoint). A "thinking" indicator is shown during AI computation. The AI's returned move is validated against the rules engine and applied to the game state.
- **Local PvP:** Turns alternate between Player 1 (White) and Player 2 (Black). A visual "pass the device" cue may be shown between turns.

### In-Game Actions
- **Undo (PvC):** Reverts the player's last move and the AI's response (2 half-moves). Unlimited undos. Updates the game state to the previous position.
- **Undo (PvP):** Reverts the last move. Requires the other player's confirmation via a UI dialog.
- **Resign:** Immediately ends the game. The resigning player loses. Game result is recorded.
- **Draw Offer (PvP only):** One player offers a draw. The other player accepts (game drawn) or declines (play continues). Not applicable in PvC — draws are automatic.

### Game Completion
- After each move, check the rules engine for game-over conditions (win, loss, draw)
- Display a game-over dialog showing the result, key statistics (move count, time elapsed), and options (new game, replay, home)
- For registered users: save the completed game record (move history, result, opponent info, date, time control)

### Expert AI Error Handling (REQ-63, REQ-64)
- If the Expert AI endpoint is unreachable: show notification with options (retry, switch to Hard, save and exit)
- If the Expert AI times out: same notification with same options
- If the player switches to Hard: seamlessly continue the game using the client-side AI from the current position

### State Architecture (REQ-60)
- All game state is managed client-side
- The server is contacted only for: Expert AI move computation, saving completed games (registered users)

---

## Acceptance Criteria

1. A player can start a new PvC game with a chosen difficulty and color; the game begins at the initial position
2. In PvC, the AI's move is requested and applied automatically after the player's move. A thinking indicator is visible during computation.
3. In local PvP, turns alternate between players on the same device
4. Undo in PvC reverts 2 half-moves (player + AI) and the board state is correct
5. Undo in PvP shows a confirmation dialog; confirmed undo reverts the last half-move
6. Resign immediately ends the game with the correct result
7. Draw offer in PvP is presented to the opponent, who can accept or decline
8. Game-over is detected correctly for wins, losses, and all draw types
9. A game-over dialog displays with the result and next-step options
10. For registered users, completed game records are saved
11. Expert AI unreachable: notification shown with retry, switch to Hard, and save-and-exit options
12. Expert AI timeout: same fallback behavior
13. Switching from Expert to Hard mid-game continues seamlessly from the current position

---

## Testing Requirements

- **Unit tests:**
  - Game setup creates correct initial state for PvC and PvP
  - Turn management alternates correctly
  - Undo produces the correct previous state (PvC: 2 half-moves, PvP: 1 half-move)
  - Resign records correct result
  - Draw offer state machine (offer → accept/decline)
  - Game-over detection triggers on correct conditions
- **Integration tests:**
  - Full PvC game: player moves → AI responds → game completes → result displayed
  - Full PvP game: alternating moves → game completes
  - Expert AI fallback: simulate timeout → verify notification and Hard AI switchover
  - Game record saved for registered user; not saved for guest
- **E2E tests:**
  - Play a complete PvC game from start to finish (Easy difficulty for speed)
  - Play a PvP game with undo and resign
- **Minimum coverage:** ≥ 85%
