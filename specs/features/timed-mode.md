# Feature: Timed Mode

**Feature ID:** `timed-mode`  
**PRD Version:** 1.0  
**Last Updated:** 2026-02-07  
**Status:** Draft

---

## 1. Purpose

Provide an optional chess-clock-style time control system that applies to both PvC and local PvP games, following FMJD conventions. Timed mode adds competitive pressure, enables tournament-like practice, and supports multiple time control formats (Fischer increment, simple countdown, rapid/blitz presets).

---

## 2. PRD Traceability

| Requirement | Description | Coverage |
|-------------|-------------|----------|
| REQ-30 | Optional timed mode, applies to PvC and PvP | Feature toggle |
| REQ-31 | FMJD time controls: Fischer increment, simple countdown, rapid/blitz presets | Time control formats |
| REQ-32 | Visible, prominent clock display for each player | Clock UI |
| REQ-33 | Time expiry = loss (unless opponent lacks sufficient material → draw) | Time-out rules |
| REQ-17 | AI manages time intelligently under timed mode | AI time management (integration point) |

---

## 3. Inputs

- Timed mode enabled/disabled (from Settings)
- Time control configuration: format (Fischer, countdown, preset) and parameters (base time, increment)
- Move completion events (from Game Modes & Lifecycle)
- Current player indicator (whose clock is running)

---

## 4. Outputs

- Remaining time for each player (continuously updated)
- Clock state: running, paused, expired
- Time-expiry event (triggers game-over when a player's time runs out)
- Low-time warning event (when a player's clock falls below a threshold, e.g., 30 seconds)
- Time consumed per move (for AI time management)

---

## 5. Dependencies

| Direction | Feature | Relationship |
|-----------|---------|-------------|
| Upstream | Settings & Customization | Provides timed mode enable/disable and configuration |
| Integration | Game Modes & Lifecycle | Clock starts/stops on turn transitions, pauses with game |
| Integration | AI Computer Opponent | AI reads remaining time to manage thinking time (REQ-17) |
| Downstream | UI & Board Experience | Clock display rendered by the UI layer |

---

## 6. Feature Detail

### Supported Time Control Formats

| Format | Description | Example |
|--------|-------------|---------|
| **Fischer increment** | Each player starts with a base time. After each move, a fixed increment is added to their clock. | 60 min + 30 sec/move |
| **Simple countdown** | Each player has a fixed total time for the entire game. No time is added. | 5 min, 10 min, 30 min |
| **Rapid/Blitz presets** | Pre-configured quick options combining base time and optional increment. | Blitz 3+2, Rapid 15+10 |

### Clock Behaviour

- The clock for the current player counts down while it is their turn.
- When a player completes their move, their clock stops and the opponent's clock starts.
- In Fischer mode, the increment is added to the moving player's clock after their move.
- When a game is paused, both clocks stop.
- When a game is resumed, the current player's clock resumes.

### Time Expiry

- When a player's clock reaches 0:00, the game ends.
- The player whose time expired loses — **unless** the opponent does not have sufficient material to theoretically win, in which case the game is drawn.
- "Sufficient material" determination uses the Game Rules Engine's position analysis.

### Low-Time Warning

- When a player's remaining time falls below 30 seconds, a visual and/or audio warning is triggered (subject to sound settings being enabled).

---

## 7. Acceptance Criteria

1. **Toggle on/off:** Timed mode can be enabled or disabled before starting a game. When disabled, no clocks are shown and there is no time pressure.
2. **Fischer increment:** When Fischer mode is selected (e.g., 5 min + 5 sec/move), each player starts with the base time and gains the increment after each completed move.
3. **Simple countdown:** When countdown mode is selected (e.g., 10 min), each player's clock counts down from 10 minutes with no time added.
4. **Rapid/Blitz presets:** Pre-configured options are available for quick selection (e.g., "Blitz 3+2", "Rapid 15+10"). These set the format and parameters automatically.
5. **Clock display:** Both players' remaining times are prominently displayed during a timed game, updating in real-time (at least once per second).
6. **Turn-based switching:** The active player's clock counts down; the inactive player's clock is paused. Clocks switch when a move is completed.
7. **Time expiry → loss:** When a player's clock reaches zero, the game ends and they lose (provided the opponent has sufficient material).
8. **Time expiry → draw:** When a player's clock reaches zero but the opponent cannot theoretically win (e.g., only a bare king remains), the game is drawn.
9. **Low-time warning:** A visual and/or audio cue is triggered when a player's clock falls below 30 seconds.
10. **Pause respects clocks:** Pausing the game stops both clocks. Resuming restarts the current player's clock.
11. **AI time management:** When playing against the AI in timed mode, the AI respects its clock — it does not spend more time than it has remaining and distributes time intelligently across the game.

---

## 8. Technical Constraints

- Clock precision must be at least 100ms for display purposes and accurate to within ~50ms for fairness.
- The clock must continue running accurately even if the browser tab is in the background (visibility API / Web Workers).
- Time state must be included in the game state for pause/resume and crash recovery.

---

## 9. Open Questions

- Should custom time controls (user-defined base time and increment) be supported in addition to presets, or are presets sufficient for v1?
- What specific rapid/blitz presets should be included? (e.g., 1+0, 3+2, 5+5, 10+0, 15+10, 30+0, 60+30)
