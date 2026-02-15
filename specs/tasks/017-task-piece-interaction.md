# Task 017: Piece Interaction (Drag-and-Drop, Tap-to-Move)

**Feature:** UI & Board Experience  
**Dependencies:** 016-task-board-rendering, 006-task-regular-piece-movement-capture, 007-task-king-movement-capture  
**FRD Reference:** [ui-board-experience.md](../features/ui-board-experience.md)

---

## Description

Implement player input for moving pieces: drag-and-drop (mouse and touch) and tap-to-move. When a piece is selected, legal move destinations are highlighted. Multi-capture sequences are stepped through interactively. The "Confirm Move" setting adds a confirmation step before committing a move. Moves animate smoothly according to the animation speed setting.

---

## Technical Requirements

### Drag-and-Drop
- Click/touch a piece to initiate drag
- While dragging, legal destination squares are highlighted (when "Show Legal Moves" is enabled)
- Drop on a valid square: execute the move with animation
- Drop on an invalid square or release without moving: return piece to origin with animation
- Works with both mouse and touch input

### Tap-to-Move
- Tap a piece to select it (visual highlight on the selected piece)
- Legal destinations are highlighted (when "Show Legal Moves" is enabled)
- Tap a highlighted destination to execute the move
- Tap the same piece again to deselect
- Tap a different friendly piece to switch selection
- Tap an invalid square to deselect

### Legal Move Highlights
- When "Show Legal Moves" is enabled: destination squares for the selected piece are visually highlighted (e.g., semi-transparent overlay, dot indicator, or border)
- Capturing pieces: when captures are mandatory, pieces that CAN capture are visually indicated (e.g., pulsing border) even before selection (REQ-51)
- When "Show Legal Moves" is disabled: no highlights shown; the player must know valid moves

### Multi-Capture Interaction
- When a capture sequence has multiple jumps: after the first jump, the piece lands on the intermediate square and the next set of valid continuation squares is highlighted
- If only one continuation exists, auto-complete the sequence (animate the piece through all jumps)
- If multiple continuations exist, pause for player selection at each junction

### Move Animation
- Piece movement from origin to destination is animated
- Animation speed follows the setting: Instant (0ms), Fast (~100ms), Normal (~250ms), Slow (~500ms)
- Capture animation: captured piece fades out or is removed after the sequence completes
- Promotion animation: visual celebration when a regular piece promotes (when Promotion Animation setting is enabled)

### Confirm Move
- When "Confirm Move" is enabled: after the player selects their move, show a confirmation UI element (e.g., "Confirm" / "Cancel" buttons near the board)
- On confirm: execute the move
- On cancel: return to piece selection state

### Last-Move Indicator (REQ-52)
- After each move, highlight the origin and destination squares with a distinct visual (e.g., colored overlay)
- For captures: highlight all squares in the capture sequence
- Indicator remains until the next move

### Audio Feedback
- Play sound effects on: piece placement, capture (distinct sound), king promotion, game end
- Sounds respect the Sound Effects toggle and Volume setting
- Mandatory capture visual/audio cue (REQ-51): when a player tries to make a non-capture move when captures are available, show/play a feedback cue

---

## Acceptance Criteria

1. A player can drag a piece to a valid square and the move is executed with animation
2. Dragging to an invalid square returns the piece to origin
3. A player can tap a piece, see legal moves, and tap a destination to execute the move
4. When captures are mandatory, only capture moves are accepted; attempting a non-capture move shows feedback
5. Multi-capture: the player steps through each jump (or the sequence auto-completes if only one path exists)
6. The last move is highlighted on the board after each turn
7. "Confirm Move" enabled: a confirmation step appears before move execution
8. "Confirm Move" disabled: moves execute immediately
9. Animation speed matches the setting for all piece movements
10. Sound effects play at correct moments and respect the toggle/volume
11. Both mouse and touch input work for drag-and-drop
12. Promotion animation plays when a regular piece reaches the back row (when enabled)

---

## Testing Requirements

- **Component tests:**
  - Drag start/end events produce correct move intent
  - Tap selection and deselection state management
  - Legal move highlights appear for selected piece
  - Last-move indicator updates after each move
  - Confirm move dialog appears and cancels/confirms correctly
- **Integration tests:**
  - Full move flow: select piece → see highlights → execute move → animation → board updates → turn switches
  - Multi-capture: step through each jump, board state correct at each step
  - Mandatory capture enforcement: non-capture attempt blocked with feedback
- **Accessibility tests:**
  - Keyboard: tab to select piece, arrow/tab to destination, enter to confirm
  - Screen reader: selected piece and available moves announced
- **Minimum coverage:** ≥ 85%
