# Feature: Game Modes & Lifecycle

**Feature ID:** `game-modes-lifecycle`  
**PRD Version:** 1.0  
**Last Updated:** 2026-02-07  
**Status:** Draft

---

## 1. Purpose

Orchestrate the full game lifecycle — from starting a new game, through play, to completion — for both Player vs. Computer (PvC) and local Player vs. Player (PvP pass-and-play) modes. This feature is the "glue" that connects the rules engine, AI, UI, and player data into a coherent gameplay experience. It manages game setup, turn flow, pause/resume, undo, resignation, draw offers, and game completion.

---

## 2. PRD Traceability

| Requirement | Description | Coverage |
|-------------|-------------|----------|
| REQ-25 | PvC: player selects difficulty, chooses white or black | PvC game setup |
| REQ-26 | PvP (Local): pass-and-play on same device, board rotates/neutral orientation | Local PvP mode |
| REQ-27 | Resign, offer draw, undo (with opponent approval in PvP) | In-game actions |
| REQ-28 | Pause and resume (PvC and local PvP). Registered = saved; guest = browser session only | Pause/resume |
| REQ-29 | Replay viewer for completed games (registered users) | Replay feature |
| REQ-60 | All game state managed client-side; server only for Expert AI compute | State architecture |
| REQ-66 | Browser closure recovery: game state recoverable for registered users | Crash recovery |

---

## 3. Inputs

- User selection: game mode (PvC or PvP), difficulty level (PvC only), color choice (PvC only)
- Player actions during a game: move a piece, resign, offer draw, request undo, pause
- AI move response (from AI Computer Opponent feature, in PvC mode)
- Game state on return (for pause/resume and crash recovery)

---

## 4. Outputs

- Active game session with real-time board state updates
- Turn transitions (player → AI → player in PvC; player → player in PvP)
- Game result (win, loss, draw, resignation) at completion
- Saved game state (for pause/resume and crash recovery)
- Completed game record (for replay viewer and statistics)

---

## 5. Dependencies

| Direction | Feature | Relationship |
|-----------|---------|-------------|
| Upstream | Game Rules Engine | Provides legal moves, move application, outcome detection |
| Upstream | AI Computer Opponent | Provides AI moves during PvC games |
| Upstream | Authentication | Determines if game data is persisted (registered) or ephemeral (guest) |
| Integration | Timed Mode | Integrates clock management into the turn flow when timed mode is enabled |
| Integration | Settings & Customization | Game mode respects current settings (confirm move, animation speed, etc.) |
| Downstream | UI & Board Experience | Provides game state for rendering |
| Downstream | Player Profile & Statistics | Provides completed game records for stats and replay |

---

## 6. Feature Detail

### Player vs. Computer (PvC)

- **Game setup:** Player chooses difficulty level (Easy, Medium, Hard, Expert) and color (white or black). A new game initialises with the standard starting position.
- **Turn flow:** The human player and AI alternate turns. When it is the AI's turn, the system requests a move from the AI Computer Opponent feature. The human sees a "thinking" indicator while the AI computes (especially for Expert).
- **Undo:** The player can undo their last move (and the AI's subsequent reply). There is no limit on undo in PvC.
- **Resign:** The player can resign at any time, ending the game as a loss.
- **Draw offer:** Not applicable in PvC — draws are determined automatically by the rules engine.

### Player vs. Player — Local (Pass-and-Play)

- **Game setup:** Two players share one device. No difficulty selection. The board presents in a neutral orientation or rotates between turns so each player sees it from their perspective.
- **Turn flow:** Players alternate turns on the same device. After each move, the turn passes to the other player. An interstitial "pass the device" prompt or visual cue may be shown between turns.
- **Undo:** A player can request undo; the other player must approve (since they are sitting together, this is a verbal/UI confirmation).
- **Resign:** Either player can resign.
- **Draw offer:** Either player can offer a draw; the other player accepts or declines.

### Pause & Resume

- **Pause:** The player can pause a game at any time. The game state is frozen.
- **Resume — registered users:** The paused game state is saved server-side (or in persistent local storage). The user can resume the game across browser sessions, devices (if applicable), and after browser closure.
- **Resume — guests:** The paused game state is stored in the browser session only. If the browser is closed, the game is lost.
- **Crash recovery (REQ-66):** For registered users, the system periodically auto-saves the current game state so that a browser crash or accidental tab closure does not lose the game. On return, the user is offered to resume the in-progress game.

### Replay Viewer

- **Access:** Registered users can open any completed game from their game history and step through it move-by-move (forward and backward).
- **Data:** The replay viewer uses the saved move history from the completed game record. No live game engine is needed — it replays recorded moves.

---

## 7. Acceptance Criteria

### PvC
1. **Game start:** The player can select PvC mode, choose a difficulty, and choose white or black. The game starts with the correct initial position.
2. **AI turn:** When it is the AI's turn, the system requests and applies the AI's move without user intervention. A visual indicator shows the AI is thinking.
3. **Undo works:** The player can undo their last move (and the AI's response) and the board reverts to the prior state. Multiple undos are supported.
4. **Resign:** Resigning immediately ends the game and records a loss for the player.
5. **Game completion:** When the rules engine detects a win, loss, or draw, the game ends and the result is displayed to the player.

### Local PvP
6. **Pass-and-play:** Two players can play on the same device, alternating turns. The board orientation accommodates both players.
7. **Undo with approval:** An undo request in PvP requires the other player's confirmation before the board reverts.
8. **Draw offer:** A draw offer in PvP is presented to the other player, who can accept (game ends as draw) or decline (play continues).
9. **Resign in PvP:** Either player can resign, ending the game.

### Pause & Resume
10. **Pause/resume (registered):** A registered user can pause a game, close the browser, return later, and resume from where they left off.
11. **Pause/resume (guest):** A guest can pause and resume within the same browser session. Closing the browser loses the game.
12. **Crash recovery:** If a registered user's browser crashes during a game, the game state is recoverable on next visit.

### Replay
13. **Replay viewer:** A registered user can open a completed game and step forward/backward through the move history. The board displays each position correctly.

### General
14. **State consistency:** The game state is always consistent with the rules engine. No desync between displayed position and internal state.
15. **Expert AI fallback (REQ-63, REQ-64):** If the Expert AI server is unreachable or times out, the player is notified and offered options (retry, switch to Hard, save and exit).

---

## 8. Technical Constraints

- All game state is managed client-side (REQ-60). The server is only involved for Expert AI move computation and for persisting completed game records / paused state for registered users.
- Auto-save for crash recovery should be lightweight — saving the game state to local storage or a backend endpoint periodically (e.g., after each move) without impacting performance.
- The replay viewer is read-only — it replays saved move data and does not need a live rules engine instance.

---

## 9. Open Questions

- Should the local PvP board rotate 180° between turns, or use a fixed neutral (side-on) orientation? This is a UX decision.
- How often should the auto-save for crash recovery trigger? After every move, or on a timer?
