# Task 022: Frontend Clock Display

**Feature:** Timed Mode  
**Dependencies:** 021-task-timed-mode-logic, 016-task-board-rendering  
**FRD Reference:** [timed-mode.md](../features/timed-mode.md)

---

## Description

Implement the visual clock display component that shows each player's remaining time during timed games. The display updates in real time (at least once per second), visually indicates which clock is active, shows low-time warnings, and integrates with the game layout.

---

## Technical Requirements

### Clock Display
- Two clock elements: one for each player (White and Black)
- Position: adjacent to the board — above the board for the top player, below for the bottom player
- Time format: `MM:SS` for times ≥ 1 minute, `SS.s` (with tenths of seconds) for times < 1 minute
- Active clock visually distinguished from the inactive clock (e.g., brighter background, highlighted border, or bold text)
- Update frequency: at least once per second; when < 10 seconds remaining, update every 100ms

### Low-Time Warning
- When remaining time < 30 seconds: visual indicator (e.g., clock background turns red/orange, clock text pulses)
- Audio warning: play clock warning sound (if sound enabled) when crossing the 30-second threshold
- Warning persists until the clock stops (move made or time expires)

### Time Expiry Display
- When a player's time reaches 0:00: clock shows "0:00" in a distinctive style (e.g., red background)
- Game-over overlay displayed with appropriate result

### Hidden When Disabled
- When timed mode is disabled: no clocks are rendered (clean board-only layout)
- Clocks appear/disappear based on the timed mode setting without page reload

---

## Acceptance Criteria

1. Both players' clocks are visible during a timed game
2. Clocks update at least once per second
3. The active player's clock is visually distinguished from the inactive clock
4. Time format is `MM:SS` for ≥ 1 minute, `SS.s` for < 1 minute
5. Low-time visual warning appears when < 30 seconds remaining
6. Low-time audio plays once when crossing the 30-second threshold
7. Time expiry shows "0:00" with distinctive styling
8. Clocks are hidden when timed mode is disabled
9. Clock display is responsive — scales appropriately at all breakpoints
10. Screen readers can access the remaining time for each player

---

## Testing Requirements

- **Component tests:**
  - Clock renders correct time from state
  - Active clock styling differs from inactive
  - Low-time warning appears at < 30 seconds
  - Time format switches at 1-minute boundary
  - Clock hidden when timed mode disabled
- **Integration tests:**
  - Clock updates in sync with the timed mode logic module
  - Low-time audio plays at the correct threshold
- **Accessibility tests:**
  - Screen reader can read remaining times
  - Clock has appropriate ARIA labels
- **Minimum coverage:** ≥ 85%
