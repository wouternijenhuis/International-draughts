# Task 018: Responsive Layout & Accessibility

**Feature:** UI & Board Experience  
**Dependencies:** 016-task-board-rendering, 017-task-piece-interaction  
**FRD Reference:** [ui-board-experience.md](../features/ui-board-experience.md)

---

## Description

Implement the responsive application layout that adapts between mobile (portrait) and desktop (landscape) orientations, and ensure full accessibility compliance (WCAG 2.1 AA). This includes the page layout structure (board area, side panels, controls), keyboard navigation for all game actions, screen reader support with ARIA labels and live regions, color contrast compliance, and the overall premium visual design language.

---

## Technical Requirements

### Responsive Layout
- **Mobile (< 768px, portrait):** Board fills screen width with 1:1 aspect ratio. Game controls (undo, resign, draw, settings) below the board. Move history in a collapsible panel below controls. Player info (names, clocks) above and below the board.
- **Tablet (768px–1024px):** Board centred, slightly smaller than full width. Controls beside or below the board.
- **Desktop (> 1024px, landscape):** Board centred in the middle section. Left panel: player info. Right panel: move history, controls. Comfortable spacing and padding.
- Smooth transitions between breakpoints (no layout jumps)

### Premium Visual Design (REQ-44)
- Clean sans-serif typography with a typographic scale
- Muted earth-tone palette with rich accent colors (gold, deep green, burgundy)
- Subtle shadows, borders, and gradients — no harsh outlines
- Consistent spacing using an 8px grid system
- Dark/light surface hierarchy for visual depth
- No cartoon or playful aesthetics

### Keyboard Navigation (REQ-48)
- All interactive elements are reachable via Tab/Shift+Tab
- Board navigation: arrow keys to move between squares, Enter/Space to select/confirm
- Game actions (undo, resign, draw offer, settings) all keyboard-accessible
- Visible focus indicators on all interactive elements
- Skip-to-content link for bypassing navigation

### Screen Reader Support (REQ-48)
- Board: each square has an ARIA label (e.g., "Square 32, White regular piece", "Square 28, empty")
- Game events announced via ARIA live regions: "White's turn", "Black captures on square 19", "Game over, White wins"
- Selected piece and legal moves announced
- Move history readable by screen reader
- All buttons and controls have accessible labels

### Color Contrast (REQ-48)
- All text meets WCAG 2.1 AA contrast ratio (≥ 4.5:1 for normal text, ≥ 3:1 for large text)
- Interactive controls meet ≥ 3:1 contrast against their background
- Board squares and pieces are distinguishable (not relying on color alone — shape and labeling provide additional differentiation)

---

## Acceptance Criteria

1. On a 375px wide screen (iPhone SE), the board fills the width and all controls are accessible below it
2. On a 1440px wide screen (desktop), the board is centered with side panels for move history and player info
3. Layout transitions smoothly when resizing the browser window
4. All game actions (select piece, move, undo, resign, settings) are performable using only a keyboard
5. A screen reader user can determine: which square is focused, what piece is on it, whose turn it is, and what legal moves are available
6. All text and interactive elements pass WCAG 2.1 AA contrast checks
7. Focus indicators are clearly visible on all interactive elements
8. The overall visual design feels premium and polished (qualitative review)
9. Lighthouse Accessibility score > 90
10. No layout overflow or clipping at any supported viewport size

---

## Testing Requirements

- **Component tests:**
  - Layout renders correctly at mobile, tablet, and desktop breakpoints
  - Keyboard navigation reaches all interactive elements
  - Focus order is logical (left-to-right, top-to-bottom)
- **Accessibility tests:**
  - Automated a11y audit (axe-core) passes with 0 critical or serious violations
  - Screen reader announces board state, moves, and game events correctly
  - All WCAG 2.1 AA contrast requirements met (automated check)
  - Keyboard-only game playthrough (manual test scenario documented)
- **Visual regression tests:** Screenshots at each breakpoint
- **Minimum coverage:** ≥ 85%
