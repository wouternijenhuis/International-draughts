# Feature: UI & Board Experience

**Feature ID:** `ui-board-experience`  
**PRD Version:** 1.0  
**Last Updated:** 2026-02-07  
**Status:** Draft

---

## 1. Purpose

Deliver a visually elegant, responsive, and accessible game interface that makes playing international draughts feel premium and intuitive. The board and pieces must be beautiful and clear at all screen sizes, interactions must feel smooth and satisfying, and the app must be fully accessible. This feature is directly tied to business goal G2 (Fun & classy user experience).

---

## 2. PRD Traceability

| Requirement | Description | Coverage |
|-------------|-------------|----------|
| REQ-44 | Elegant, classy, modern design — premium chess-app feel | Visual design |
| REQ-45 | Board and pieces legible at all screen sizes | Responsive board |
| REQ-46 | Responsive design: portrait (mobile) and landscape (desktop) | Layout adaptation |
| REQ-47 | Drag-and-drop and tap-to-move interaction | Piece interaction |
| REQ-48 | Full accessibility: keyboard nav, screen reader, WCAG 2.1 AA contrast | Accessibility |
| REQ-49 | All UI text in English | Language |
| REQ-50 | Onboarding flow for first-time users (optional, skippable) | Onboarding |
| REQ-51 | Visual/audio feedback for mandatory captures | Capture feedback |
| REQ-52 | Last-move indicator on the board | Move indicator |

---

## 3. Inputs

- Current game state (from Game Rules Engine via Game Modes & Lifecycle)
- Legal moves for the selected piece (from Game Rules Engine)
- Current settings (board theme, piece style, animation speed, notation, sound — from Settings & Customization)
- Player actions: piece selection, drag, drop, tap
- Clock state (from Timed Mode, when enabled)

---

## 4. Outputs

- Rendered game board with pieces in current positions
- Interactive piece movement (drag-and-drop, tap-to-move)
- Visual highlights: legal moves, mandatory captures, last move
- Audio feedback: placement, capture, promotion, game end, clock warning
- Responsive layout adapted to screen size and orientation
- Accessible markup: keyboard navigation, ARIA labels, screen reader announcements

---

## 5. Dependencies

| Direction | Feature | Relationship |
|-----------|---------|-------------|
| Upstream | Game Rules Engine | Provides board state, legal moves, game outcome |
| Upstream | Game Modes & Lifecycle | Provides active game session and turn state |
| Upstream | Settings & Customization | Provides visual/audio/gameplay preferences |
| Upstream | Timed Mode | Provides clock state for display |
| Integration | Authentication | Onboarding flow shown to first-time visitors |

---

## 6. Feature Detail

### Visual Design Language

- **Premium, classy aesthetic:** The app must look and feel like a premium chess application. Clean sans-serif typography, subtle shadows and gradients, muted earth-tone color palette with rich accent colors (gold, deep green, burgundy).
- **No cartoon style:** Avoid bright primary colors, oversized UI elements, or playful/childish aesthetics.
- **Smooth animations:** Piece movements, captures, and promotions are animated smoothly. Animation speed is controlled by the user's setting.

### Board Rendering

- The board displays as a 10×10 grid with alternating light and dark squares.
- Only the 50 dark squares are playable; light squares are visually distinct but non-interactive.
- Board theme (colors, textures) is controlled by the Board Theme setting.
- When Show Board Notation is enabled, FMJD square numbers (1–50) are displayed on each dark square.

### Piece Rendering

- Pieces are rendered according to the selected Piece Style.
- Men and kings must be visually distinct (kings have a crown or marking).
- White and black pieces must be clearly distinguishable.
- Pieces must be clearly legible at all board sizes, from small mobile screens to large desktop monitors.

### Piece Interaction

- **Drag-and-drop:** The player can click/touch a piece and drag it to the destination square. Legal destinations are highlighted during the drag.
- **Tap-to-move:** The player can tap a piece to select it (showing legal moves), then tap the destination square to complete the move.
- **Multi-capture:** During a multi-jump sequence, intermediate landings are shown and the player completes each jump in sequence (or the sequence auto-completes if there is only one legal path).
- **Confirm move (optional):** When the Confirm Move setting is enabled, a confirmation step appears before the move is committed.

### Visual Feedback

- **Legal move highlights:** When a piece is selected, all legal destination squares are highlighted (when Show Legal Moves is enabled).
- **Mandatory capture indicator:** When captures are mandatory, the UI provides a visual cue (e.g., pulsing highlight on pieces that must capture) and optionally audio feedback.
- **Last-move indicator:** The squares involved in the most recent move are highlighted with a distinct color/opacity.
- **Promotion animation:** When a man reaches the back row and is promoted to king, a celebration animation plays (when Promotion Animation setting is enabled).

### Audio Feedback

- Sound effects for: piece placement, capture (distinct from placement), king promotion, game end (win/loss/draw), clock warning.
- All sounds respect the Sound Effects toggle and Volume setting.

### Responsive Design

- **Mobile (portrait):** The board fills the screen width. Controls and move history are positioned below or in collapsible panels.
- **Desktop (landscape):** The board is centred with side panels for move history, player info, and controls.
- **Breakpoints:** The layout adapts smoothly across phone, tablet, and desktop screen sizes.
- **Touch and mouse:** Both input methods are fully supported.

### Accessibility

- **Keyboard navigation:** All game actions (select piece, choose destination, undo, resign, settings) are operable via keyboard.
- **Screen reader support:** Board state, available moves, and game events are announced via ARIA live regions and labels.
- **Color contrast:** All text and interactive elements meet WCAG 2.1 AA contrast requirements.
- **Focus indicators:** Clearly visible focus indicators for keyboard navigation.

### Onboarding

- **First-time flow:** New users see a brief, skippable onboarding that explains: how pieces move, captures are mandatory, what flying kings are, and basic controls.
- **Non-intrusive:** The onboarding is optional, can be dismissed, and does not reappear once dismissed.

---

## 7. Acceptance Criteria

1. **Visual quality:** The app looks premium and polished — comparable to top chess apps (e.g., Chess.com, Lichess). No placeholder graphics or unfinished elements.
2. **Board legibility:** Board and pieces are clearly readable on a 5-inch mobile screen at standard viewing distance and on a 27-inch desktop monitor.
3. **Drag-and-drop:** A player can pick up a piece, see legal move highlights, drag it to a valid square, and drop it to complete the move. Invalid drops return the piece to its origin.
4. **Tap-to-move:** A player can tap a piece to select it, see legal move highlights, and tap a destination to move. Tapping an invalid square deselects the piece.
5. **Mandatory capture feedback:** When a player has mandatory captures, the capturable pieces or capturing pieces are visually indicated. Attempting a non-capture move when captures are available is blocked with clear feedback.
6. **Last-move indicator:** After every move, the origin and destination squares of the last move are visually highlighted.
7. **Responsive layout:** The app renders correctly and is fully usable in both portrait (mobile) and landscape (desktop) orientations across the specified breakpoints.
8. **Keyboard accessible:** A user can play an entire game using only a keyboard (tab to select piece, arrow keys or tab to choose destination, enter to confirm).
9. **Screen reader:** A screen reader user can understand the board state, whose turn it is, and what moves are available.
10. **WCAG 2.1 AA:** All text, icons, and interactive elements pass WCAG 2.1 AA contrast checks.
11. **Lighthouse score:** The app achieves > 90 for Performance, Accessibility, and Best Practices in a Lighthouse audit.
12. **Onboarding:** First-time users see the onboarding flow. It can be skipped. It does not appear again after dismissal.
13. **Sound effects:** All specified sounds play at the correct time and respect the sound toggle/volume settings.

---

## 8. Technical Constraints

- The board must render performantly on low-end mobile devices (no jank during animations).
- The app must be a PWA (REQ-54) — all assets must be cacheable for offline shell loading.
- All UI text is in English (REQ-49) — but the component structure should not make future internationalisation impossible.

---

## 9. Open Questions

- What specific board themes and piece styles should be available at launch? (Requires design assets.)
- Should the onboarding be a step-by-step tutorial overlay, a modal carousel, or an interactive mini-game?
- In local PvP, should the board physically rotate 180° between turns, or display in a fixed neutral orientation (e.g., from the side)?
