# Feature: Learning Mode

**Feature ID:** `learning-mode`  
**PRD Version:** 1.0  
**Last Updated:** 2026-02-15  
**Status:** Draft

---

## 1. Purpose

Provide a dedicated "Learning" game mode that helps new and intermediate players learn International (10×10) Draughts through guided, interactive play. Learning mode combines a real game against the AI (at easy difficulty by default) with educational scaffolding: a redo button for experimentation, a hint system showing the best available move, move feedback indicating the quality of each move, and a comprehensive step-by-step tutorial covering all rules, mechanics, and basic strategy of International Draughts.

This mode is distinct from the standard Player vs. Computer mode. Standard/normal mode does **not** have a Redo button; only Learning mode provides Redo functionality. The goal is to give players a safe, low-pressure environment where mistakes are encouraged and immediately educational.

---

## 2. PRD Traceability

| Requirement | Description | Coverage |
|-------------|-------------|----------|
| REQ-25 | PvC: player selects difficulty, chooses white or black | Learning mode is a PvC variant; uses easy difficulty by default |
| REQ-60 | All game state managed client-side | Learning mode game state is client-side |
| NEW | Learning mode with redo, hints, feedback, and tutorial | This feature document |

---

## 3. Inputs

- User navigates to `/learn` or selects "Learning Mode" from the home page / main navigation
- Player actions during a game: move a piece, undo, redo, request hint, resign
- Tutorial progression state (which tutorial step the user is on)
- AI move response (from AI Computer Opponent feature at easy difficulty)

---

## 4. Outputs

- Active Learning mode game session with real-time board state updates
- Redo stack: undone moves are preserved and can be reapplied via the Redo button
- Hint overlay: highlights the best available move on the board
- Move feedback: visual indicator (good / neutral / bad) shown after each player move
- Tutorial progression: step-by-step interactive lessons rendered alongside or above the board
- Completed game record (for statistics, if the user is registered)

---

## 5. Dependencies

| Direction | Feature | Relationship |
|-----------|---------|-------------|
| Upstream | Game Rules Engine | Provides legal moves, move application, outcome detection |
| Upstream | AI Computer Opponent | Provides AI moves (easy difficulty) and move evaluation for hints/feedback |
| Upstream | Authentication | Determines if tutorial progress and game data are persisted (registered) or ephemeral (guest) |
| Integration | Settings & Customization | Respects current settings (confirm move, animation speed, board theme, etc.) |
| Integration | Game Modes & Lifecycle | Shares core game lifecycle logic (start, turn flow, pause/resume, completion) |
| Downstream | UI & Board Experience | Provides game state, hint overlays, and feedback indicators for rendering |
| Downstream | Player Profile & Statistics | Provides completed game records for stats |

---

## 6. Feature Detail

### 6.1 Learning Mode Overview

Learning mode is a Player vs. Computer game with additional educational features enabled. It is accessible via:

- **Route:** `/learn` (separate from `/play`)
- **Home page:** A prominent "Learn" or "Learning Mode" card/button on the home page
- **Main navigation:** A "Learn" entry in the primary navigation menu

When starting Learning mode, the player is presented with two options:

1. **Start Tutorial** — Begin the interactive step-by-step tutorial (recommended for beginners)
2. **Free Play** — Jump straight into a learning game against the AI with hints, redo, and feedback enabled but without guided tutorial steps

### 6.2 Redo Button (Learning Mode Only)

- **Scope:** The Redo button is available **only** in Learning mode. Standard/normal PvC and PvP modes do **not** have a Redo button.
- **Behaviour:** When the player undoes one or more moves, those moves are pushed onto a redo stack. The Redo button reapplies the most recently undone move (and the AI's subsequent reply, if applicable).
- **Stack clearing:** The redo stack is cleared when the player makes a new move that differs from the undone move. This follows standard undo/redo semantics.
- **UI:** The Redo button is displayed next to the existing Undo button in the game controls. It is disabled (greyed out) when the redo stack is empty.
- **Purpose:** Allows players to experiment freely — undo a move, consider alternatives, then redo to restore the original line of play.

### 6.3 Hint System

- **Activation:** The player can press a "Hint" button at any time during their turn.
- **Display:** The best available move is highlighted on the board (e.g., the source square is marked and an arrow or glow indicates the destination square, including any intermediate captures for multi-jump sequences).
- **Source:** The hint is computed by the AI engine at a level sufficient to suggest a strong (not necessarily perfect) move. The easy-difficulty AI evaluation may be used, or a slightly higher depth search for hint quality.
- **Dismissal:** The hint overlay disappears when the player makes a move or taps/clicks elsewhere.
- **Usage tracking:** Optionally track how many hints the player uses per game for statistics (registered users).

### 6.4 Move Feedback

- **Trigger:** After the player completes a move, the system evaluates the move and shows feedback.
- **Evaluation method:** Compare the player's chosen move against the AI's top-ranked move(s). Classify the move as:
  - **Good** (green indicator) — The player's move matches or is close to the engine's best move.
  - **Neutral** (yellow/grey indicator) — The move is acceptable but not optimal.
  - **Bad** (red indicator) — The move is significantly worse than the best option (e.g., blunders a piece or misses a winning capture).
- **Display:** A brief, non-intrusive indicator appears on or near the board (e.g., a coloured icon, a short text like "Great move!" or "There was a better option"). The indicator fades after a few seconds or on the next interaction.
- **Optional detail:** Tapping the feedback indicator can reveal a short explanation (e.g., "You missed a double capture on squares 23→14→5").

### 6.5 Interactive Tutorial

The tutorial is a structured, step-by-step introduction to International (10×10) Draughts. It goes beyond the existing static tutorial page by being interactive — the player performs actions on the board at each step and cannot proceed until the step's goal is met.

#### Tutorial Structure

Each tutorial step consists of:
- A **title** and **instruction text** displayed in a panel alongside the board
- A **board setup** (a specific position loaded onto the board, not necessarily the starting position)
- A **goal action** the player must perform (e.g., "Capture the black piece by jumping over it")
- **Validation** that checks whether the player performed the correct action
- A **success message** and automatic advancement to the next step (or a "Next" button)

#### Tutorial Steps

The tutorial covers the following topics in order:

##### a. Board Setup
- **Title:** "The Board"
- **Content:** International Draughts is played on a 10×10 board. Only the dark squares are used. Each side starts with 20 pieces (men) placed on the dark squares of the first four rows.
- **Board state:** Standard starting position is shown.
- **Goal:** Informational — player reads and clicks "Next" to continue.

##### b. How Men Move
- **Title:** "Moving Your Pieces"
- **Content:** Men move diagonally forward by one square onto an empty dark square. White moves first.
- **Board state:** A simplified position with a few white men and no immediate captures.
- **Goal:** The player makes a valid forward diagonal move with a man.

##### c. How Men Capture
- **Title:** "Capturing"
- **Content:** Men capture by jumping diagonally over an adjacent enemy piece, landing on the empty square beyond it. Unlike some other variants, men in International Draughts can capture both **forward and backward**.
- **Board state:** A position where a white man has one available capture (forward or backward).
- **Goal:** The player performs the capture.

##### d. Mandatory Capture Rule
- **Title:** "You Must Capture"
- **Content:** If a capture is available, you **must** take it. You cannot make a non-capturing move when a capture exists. This is called the mandatory capture rule.
- **Board state:** A position where the player has one piece that can capture and another piece that could move — but the capture is forced.
- **Goal:** The player performs the mandatory capture (attempting a non-capturing move shows an error/hint).

##### e. Maximum Capture Rule
- **Title:** "Capture the Most"
- **Content:** When multiple capturing sequences are available, you must choose the sequence that captures the **most pieces**. This is the maximum capture rule — unique to International Draughts.
- **Board state:** A position with two capture options: one capturing 1 piece and one capturing 2 pieces.
- **Goal:** The player selects the sequence that captures the most pieces.

##### f. Multiple/Chain Captures
- **Title:** "Chain Captures"
- **Content:** A capture can continue in a single turn if, after landing, another capture is available from the new position. You must keep jumping until no more captures are possible.
- **Board state:** A position where a white man can chain-capture 2 or 3 enemy pieces in a single turn.
- **Goal:** The player completes the full chain capture sequence.

##### g. Promotion to King
- **Title:** "Becoming a King"
- **Content:** When a man reaches the opposite back row (row 10 for white, row 1 for black), it is promoted to a **king**. Kings are visually distinguished (e.g., a crown symbol or double-stacked piece).
- **Board state:** A position where a white man is one square away from the promotion row.
- **Goal:** The player moves the man to the back row and observes the promotion.

##### h. How Kings Move
- **Title:** "The Flying King"
- **Content:** Kings are much more powerful than men. A king can move **any number of squares** along a diagonal. This is called the "flying king" rule and is specific to International Draughts.
- **Board state:** A position with a white king in the centre and several open diagonals.
- **Goal:** The player makes a long-range king move (more than one square).

##### i. How Kings Capture
- **Title:** "King Captures"
- **Content:** A king captures by moving along a diagonal, jumping over an enemy piece, and landing on **any empty square** beyond the captured piece (not just the square immediately after). The king can then continue capturing in another direction if possible.
- **Board state:** A position where a white king can capture an enemy piece with multiple possible landing squares.
- **Goal:** The player performs a king capture.

##### j. Winning Conditions
- **Title:** "How to Win"
- **Content:** You win by capturing all of your opponent's pieces, or by blocking all of your opponent's pieces so they cannot make a legal move. If both players cannot win, the game is a draw.
- **Board state:** A near-endgame position where the player can capture the last enemy piece.
- **Goal:** The player captures the last piece and sees the "You win!" screen.

##### k. Draw Rules
- **Title:** "Draws"
- **Content:** A game is drawn when: (1) the same position occurs three times (threefold repetition), (2) 25 consecutive moves are made by both sides without a capture or a man moving (25-move rule), or (3) neither player can theoretically win. In casual play, both players can also agree to a draw.
- **Board state:** Informational — no board interaction needed.
- **Goal:** Player reads and clicks "Next."

##### l. Basic Strategy Tips
- **Title:** "Tips for Beginners"
- **Content:** A few key strategic principles:
  - **Control the centre:** Pieces in the centre of the board have more mobility and influence.
  - **Advance together:** Don't rush a single piece forward — support your men with nearby pieces.
  - **Race to king:** Getting a king early can be decisive, but don't sacrifice too many pieces for it.
  - **Piece safety:** Keep your pieces protected from capture. Avoid leaving pieces where they can be taken without compensation.
  - **Forced exchanges:** Sometimes trading pieces is good if it leads to a king or a positional advantage.
- **Board state:** Informational — no board interaction needed.
- **Goal:** Player reads and clicks "Finish Tutorial." The tutorial is complete, and the player is offered to start a free-play Learning mode game.

#### Tutorial Progress Persistence

- **Registered users:** Tutorial progress (current step) is saved so the user can return and continue where they left off.
- **Guests:** Tutorial progress is stored in browser session storage. Closing the browser resets progress.

### 6.6 AI Difficulty in Learning Mode

- **Default difficulty:** Easy. The AI plays at the lowest difficulty level to let learners win and build confidence.
- **Optional override:** An advanced learner may switch difficulty to Medium within Learning mode settings. Hard and Expert are not available in Learning mode to keep the experience approachable.
- **AI behaviour:** The AI engine used is the same as in standard PvC mode; only the difficulty parameter differs.

### 6.7 Learning Mode vs. Standard Mode — Key Differences

| Feature | Standard PvC / PvP | Learning Mode |
|---------|---------------------|---------------|
| Redo button | **No** | **Yes** |
| Hint system | No | Yes |
| Move feedback | No | Yes |
| Interactive tutorial | No | Yes |
| Default difficulty | Player's choice | Easy |
| Difficulty options | Easy / Medium / Hard / Expert | Easy / Medium |
| Route | `/play` | `/learn` |
| Navigation | "Play" menu entry | "Learn" menu entry |

---

## 7. Acceptance Criteria

### Learning Mode Access
1. **Route:** The `/learn` route loads the Learning mode page.
2. **Home page:** A "Learn" card or button is visible on the home page and links to `/learn`.
3. **Navigation:** A "Learn" entry exists in the main navigation and links to `/learn`.

### Redo
4. **Redo in Learning mode:** After undoing a move, the Redo button is enabled. Pressing Redo reapplies the undone move (and the AI's reply, if applicable).
5. **Redo stack cleared on new move:** If the player makes a new (different) move after undoing, the redo stack is cleared and Redo becomes disabled.
6. **No Redo in standard mode:** The standard PvC and PvP modes do **not** display or enable a Redo button.

### Hint System
7. **Hint display:** Pressing the Hint button highlights the best available move on the board.
8. **Hint accuracy:** The suggested move is a strong legal move as evaluated by the AI engine.
9. **Hint dismissal:** The hint overlay disappears when the player makes a move or interacts with the board elsewhere.

### Move Feedback
10. **Feedback shown:** After the player makes a move, a visual indicator (good / neutral / bad) is displayed.
11. **Feedback accuracy:** The feedback classification reflects the relative quality of the player's move compared to the engine's evaluation.
12. **Non-intrusive:** The feedback indicator does not block gameplay and fades or can be dismissed.

### Interactive Tutorial
13. **Tutorial start:** Selecting "Start Tutorial" from the Learning mode landing page begins the tutorial at step (a).
14. **Step progression:** Each interactive step validates the player's action before allowing advancement. Informational steps advance on "Next" click.
15. **Board setup per step:** Each tutorial step loads the correct board position for that lesson.
16. **Error handling:** If the player attempts an invalid or incorrect action during a tutorial step, a helpful message is shown (e.g., "That's not a capture — try jumping over the enemy piece").
17. **Tutorial completion:** After completing all steps (a–l), the player sees a completion message and is offered to start a free-play Learning mode game.
18. **Tutorial resume (registered):** A registered user who leaves mid-tutorial can return and continue from their last completed step.

### AI & Gameplay
19. **Default easy difficulty:** A new Learning mode game starts with the AI at easy difficulty unless the player has changed this setting.
20. **Game lifecycle:** Learning mode games follow the same lifecycle as standard PvC games (start, turn flow, completion, pause/resume) with the addition of redo, hints, and feedback.
21. **Undo:** Undo is available in Learning mode (same as standard PvC — unlimited undo).

### General
22. **State consistency:** The game state, redo stack, and tutorial state remain consistent at all times. No desync between the board display and internal state.
23. **Settings respected:** Learning mode respects the user's current settings (board theme, confirm move, animation speed, etc.).

---

## 8. Technical Constraints

- All Learning mode game state (including redo stack, hint state, and tutorial progress) is managed client-side (consistent with REQ-60).
- The hint computation reuses the existing AI engine. No separate hint engine is required — the AI's move evaluation at an appropriate depth is sufficient.
- Move feedback evaluation should be lightweight. Comparing the player's move against the AI's top 2–3 candidate moves is sufficient; a full deep analysis is not required.
- Tutorial board positions are predefined static configurations stored as data (e.g., JSON or constants). They do not require a live game session to set up.
- The tutorial UI should be responsive and work on both desktop and mobile layouts, with the instruction panel adapting position (side panel on desktop, top/bottom panel on mobile).

---

## 9. Open Questions

- Should the tutorial allow skipping individual steps, or must it be completed sequentially?
- Should move feedback intensity be configurable (e.g., "always show," "show only for bad moves," "off")?
- Should Learning mode games count toward the player's win/loss statistics, or be tracked separately?
- Should the hint button have a cooldown or usage limit per game, or be unlimited?
- Should the tutorial include an animated demonstration before each interactive step, or is text instruction sufficient?
