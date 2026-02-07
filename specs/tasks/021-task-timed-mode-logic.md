# Task 021: Timed Mode Logic

**Feature:** Timed Mode  
**Dependencies:** 009-task-game-outcome-draw-rules  
**FRD Reference:** [timed-mode.md](../features/timed-mode.md)

---

## Description

Implement the chess clock logic for timed games: Fischer increment, simple countdown, and rapid/blitz presets. The clock module manages per-player remaining time, starts/stops on turn transitions, adds increment in Fischer mode, detects time expiry (loss or draw depending on opponent material), and exposes state for the UI clock display. The clock must continue accurately even when the browser tab is in the background.

---

## Technical Requirements

### Clock Model
- Per-player time state: remaining time (milliseconds), running/paused flag
- Clock configuration: format (Fischer, countdown, preset), base time, increment
- Pre-configured presets: Blitz 3+2, Blitz 5+5, Rapid 10+0, Rapid 15+10, Classical 30+0, Classical 60+30

### Clock Operations
- **Start:** Begin the current player's clock countdown
- **Stop:** Stop the current player's clock (on move completion)
- **Switch:** Stop current player's clock, start opponent's clock, add increment (if Fischer) to the player who just moved
- **Pause:** Stop both clocks (game pause)
- **Resume:** Restart the current player's clock

### Time Expiry
- When a player's remaining time reaches 0: fire a time-expiry event
- The game session manager determines the result:
  - If the opponent has sufficient material to theoretically win → the timed-out player loses
  - If the opponent does NOT have sufficient material → draw
- "Sufficient material" check delegates to the rules engine

### Low-Time Warning
- When remaining time drops below 30 seconds: fire a low-time event (consumed by UI for visual/audio cue)

### Background Tab Accuracy
- Use a Web Worker or the Page Visibility API + drift correction to maintain clock accuracy when the browser tab is in the background
- On tab refocus: correct the displayed time based on elapsed real time

### Serialization
- Clock state (remaining time per player, active player, running flag) must be serializable for pause/resume and crash recovery
- On resume: recalculate remaining time based on the timestamp when the game was saved

### AI Time Management Integration Point
- Expose the current player's remaining time so the AI engine can read it for time management decisions (REQ-17)
- The AI is responsible for its own time budgeting; the clock module just provides the remaining time

---

## Acceptance Criteria

1. Fischer mode: each player starts with base time; after each move, the increment is added to the moving player's clock
2. Countdown mode: each player starts with total time; no time is added
3. Presets set the correct format and parameters automatically
4. The active player's clock counts down in real time; the inactive player's clock is paused
5. On move completion, clocks switch correctly
6. When a player's time reaches 0, a time-expiry event fires
7. Low-time warning fires when remaining time drops below 30 seconds
8. Pausing stops both clocks; resuming restarts the current player's clock
9. Clock remains accurate after the browser tab is in the background for 30+ seconds
10. Clock state serializes and deserializes correctly for pause/resume
11. AI can read the current remaining time for time management

---

## Testing Requirements

- **Unit tests:**
  - Fischer: verify increment added correctly after each move
  - Countdown: verify no increment, time decreases monotonically
  - Preset configuration produces correct format and parameters
  - Clock switch: correct player running after switch
  - Time expiry: event fires at 0
  - Low-time warning: event fires at 30s
  - Serialization roundtrip preserves state
- **Integration tests:**
  - Full timed game: start → play moves → clocks update → time expires → result determined
  - Pause/resume: clocks pause and resume at correct times
  - Background tab: simulate background for 10 seconds, verify drift < 100ms on refocus
- **Minimum coverage:** ≥ 85%
