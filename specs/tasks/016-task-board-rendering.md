# Task 016: Board Rendering & Piece Visuals

**Feature:** UI & Board Experience  
**Dependencies:** 002-task-frontend-scaffolding, 005-task-board-representation  
**FRD Reference:** [ui-board-experience.md](../features/ui-board-experience.md)

---

## Description

Implement the visual board component: a 10×10 grid with themed squares, piece rendering (regular pieces and kings for both colors), board notation overlay, and responsive sizing. The board component consumes a board state from the game rules engine and renders it visually. This is the core visual component that all gameplay features build upon.

---

## Technical Requirements

### Board Grid
- Render a 10×10 grid with alternating light and dark squares
- Only the 50 dark squares are interactive (playable)
- Light squares are visually distinct and non-interactive
- Board orientation: square 1 at top-right (White's perspective by default)

### Theming
- Support multiple board themes via CSS variables or theme tokens:
  - Classic Wood: warm brown tones
  - Dark: dark gray / charcoal
  - Ocean: blue tones
  - Tournament Green: green/cream
- Theme applied dynamically based on the current setting (from Settings state)

### Piece Rendering
- Render regular pieces and kings for White and Black
- Kings must be visually distinct from regular pieces (crown marking or elevation)
- White and black pieces must be clearly distinguishable across all themes
- Support multiple piece styles (Flat, 3D, Classic, Modern) — either SVG-based or image-based
- Pieces scale proportionally with board size

### Board Notation
- When "Show Board Notation" setting is enabled, display FMJD square numbers (1–50) on each dark square
- Numbers must not interfere with piece legibility
- Numbers hidden when the setting is disabled

### Responsive Sizing
- Board fills available width on mobile (portrait), maintaining 1:1 aspect ratio
- Board is centered with side panels on desktop (landscape)
- Board renders clearly from 320px to 2560px viewport widths
- Minimum legible board size: all pieces distinguishable on a 5-inch mobile screen

### Performance
- Board renders and updates without jank (60fps) on low-end mobile devices
- Use efficient rendering (canvas, SVG, or optimized DOM — choose based on performance requirements)
- Board state changes (piece moves) should trigger minimal re-renders

---

## Acceptance Criteria

1. The board displays a 10×10 grid with correct light/dark square alternation
2. All four board themes render correctly and can be switched in real time
3. All four piece styles render correctly for both colors (regular pieces and kings)
4. Kings are visually distinguishable from regular pieces at all board sizes
5. Board notation (1–50) displays on dark squares when the setting is enabled and hides when disabled
6. The board maintains 1:1 aspect ratio at all viewport sizes
7. On a 5-inch mobile screen, all pieces are clearly legible
8. On a 27-inch desktop monitor, the board looks crisp and premium
9. Theme switching does not require a page reload
10. No rendering jank during board state updates

---

## Testing Requirements

- **Component tests:**
  - Board renders 100 squares (50 dark + 50 light)
  - Correct piece placement for initial position (20 white, 20 black)
  - Theme switching updates visual appearance
  - Notation toggle shows/hides numbers
  - King rendering differs from regular piece rendering
- **Visual regression tests:** Screenshot tests at mobile, tablet, and desktop breakpoints for each theme
- **Performance tests:** Measure render time for full board with all pieces — must be < 16ms (60fps budget)
- **Accessibility tests:** Board grid has appropriate ARIA roles and labels
- **Minimum coverage:** ≥ 85%
