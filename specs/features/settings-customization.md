# Feature: Settings & Customization

**Feature ID:** `settings-customization`  
**PRD Version:** 1.0  
**Last Updated:** 2026-02-07  
**Status:** Draft

---

## 1. Purpose

Give players control over the visual, audio, and gameplay experience through a comprehensive settings panel. Settings allow players to personalize the board appearance, adjust gameplay assists (legal move highlights, move confirmation), and configure timed mode — making the app enjoyable for both beginners and experienced players. Settings persist across sessions for registered users.

---

## 2. PRD Traceability

| Requirement | Description | Coverage |
|-------------|-------------|----------|
| REQ-34 | Board theme: choice of color schemes | Visual setting |
| REQ-35 | Piece style: choice of piece visuals | Visual setting |
| REQ-36 | Sound effects: toggle, volume, specific sounds | Audio setting |
| REQ-37 | Move animation speed: instant to slow | Visual setting |
| REQ-38 | Show legal moves: toggle highlights | Gameplay assist |
| REQ-39 | Show board notation: toggle square numbers | Gameplay assist |
| REQ-40 | Show move history: toggle move list panel | Gameplay assist |
| REQ-41 | Timed mode: enable/disable, configure format and duration | Gameplay setting |
| REQ-42 | Confirm move: toggle confirmation step | Gameplay assist |
| REQ-43 | Promotion animation: toggle celebration animation | Visual setting |
| REQ-62 | Settings persist across sessions (registered) or within browser session (guest) | Persistence |

---

## 3. Inputs

- User changes to any setting value
- User identity: registered or guest (determines persistence strategy)

---

## 4. Outputs

- Current settings state (consumed by all features that render UI or control gameplay behaviour)
- Persisted settings (server-side for registered users, browser session/localStorage for guests)

---

## 5. Dependencies

| Direction | Feature | Relationship |
|-----------|---------|-------------|
| Upstream | Authentication | Determines persistence strategy (registered vs. guest) |
| Downstream | UI & Board Experience | Board theme, piece style, animation speed, notation display |
| Downstream | Game Modes & Lifecycle | Confirm move, show legal moves |
| Downstream | Timed Mode | Timed mode toggle and configuration |
| Downstream | Backend API & Deployment | Settings storage for registered users |

---

## 6. Feature Detail

### Visual Settings

| Setting | Options | Default |
|---------|---------|---------|
| Board Theme | Classic wood, Dark, Ocean, Tournament green (and potentially more) | Classic wood |
| Piece Style | Flat, 3D, Classic, Modern minimalist | Classic |
| Move Animation Speed | Instant, Fast, Normal, Slow | Normal |
| Promotion Animation | On / Off | On |

### Audio Settings

| Setting | Options | Default |
|---------|---------|---------|
| Sound Effects | On / Off | On |
| Volume | Slider (0–100%) | 70% |

Sound effects apply to: piece placement, capture, king promotion, game end, clock warning (when timed mode is active).

### Gameplay Assists

| Setting | Options | Default |
|---------|---------|---------|
| Show Legal Moves | On / Off | On |
| Show Board Notation | On / Off | Off |
| Show Move History | On / Off | On |
| Confirm Move | On / Off | Off |

### Timed Mode Configuration

| Setting | Options | Default |
|---------|---------|---------|
| Timed Mode | Enabled / Disabled | Disabled |
| Time Control Format | Fischer increment, Simple countdown, Rapid/Blitz presets | — |
| Time Parameters | Base time, increment (format-dependent) | — |

### Persistence

- **Registered users:** Settings are saved to the backend and loaded on login from any device.
- **Guests:** Settings are stored in the browser (localStorage or sessionStorage). They persist within the current browsing session but are lost when the browser is closed or storage is cleared.

---

## 7. Acceptance Criteria

1. **Settings panel accessible:** The settings panel is accessible from the main menu and during a game (without ending the game).
2. **Board theme applies immediately:** Changing the board theme updates the board appearance in real time without restarting the game.
3. **Piece style applies immediately:** Changing the piece style updates all pieces on the board in real time.
4. **Sound toggle works:** Toggling sound off silences all game sounds; toggling on restores them. Volume slider adjusts the loudness.
5. **Animation speed visible:** Changing animation speed is perceivable — "Instant" shows no animation, "Slow" shows deliberate movement.
6. **Legal move highlights:** When enabled, selecting a piece highlights all legal destination squares. When disabled, no highlights appear.
7. **Board notation:** When enabled, FMJD square numbers (1–50) are displayed on the board. When disabled, the board is clean.
8. **Move history panel:** When enabled, a move list panel shows the game's moves in standard notation. When disabled, the panel is hidden.
9. **Confirm move:** When enabled, after the player selects a move, a confirmation prompt appears before the move is committed. When disabled, moves are applied immediately.
10. **Promotion animation:** When enabled, a visual celebration plays when a regular piece is promoted. When disabled, promotion happens without fanfare.
11. **Persistence (registered):** A registered user changes settings, logs out, logs back in — settings are restored.
12. **Persistence (guest):** A guest changes settings, navigates away and back within the same session — settings are retained. Closing the browser resets settings to defaults.
13. **Defaults:** A new user (registered or guest) starts with sensible defaults as listed in the table above.

---

## 8. Technical Constraints

- Settings must be lightweight to load — they are needed before the first render.
- Settings changes must be reflected immediately in the UI (no page reload required).
- The settings data model must be extensible for future settings additions without breaking existing saved settings.

---

## 9. Open Questions

- Should additional board themes and piece styles be added over time, and if so, how are they delivered (bundled in updates, or downloadable)?
- Should there be a "Reset to Defaults" button in the settings panel?
