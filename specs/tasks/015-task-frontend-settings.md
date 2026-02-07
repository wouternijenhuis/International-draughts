# Task 015: Frontend Settings Panel

**Feature:** Settings & Customization  
**Dependencies:** 002-task-frontend-scaffolding, 014-task-backend-settings  
**FRD Reference:** [settings-customization.md](../features/settings-customization.md)

---

## Description

Implement the frontend settings panel UI that allows players to customize board theme, piece style, sound, animation speed, gameplay assists, and timed mode configuration. Settings changes apply immediately (no page reload). For registered users, changes sync with the backend. For guests, changes persist in browser localStorage for the current session.

---

## Technical Requirements

### Settings Panel
- Accessible from the main menu AND during an active game (via a settings icon/gear button)
- Opens as a slide-out panel or modal overlay — does not navigate away from the game
- Organized in sections: Visual, Audio, Gameplay, Timed Mode

### Visual Settings
- Board Theme: dropdown or visual selector showing swatches/previews for each theme (Classic Wood, Dark, Ocean, Tournament Green)
- Piece Style: dropdown or visual selector with piece previews (Flat, 3D, Classic, Modern)
- Animation Speed: dropdown or slider (Instant, Fast, Normal, Slow)
- Promotion Animation: toggle switch

### Audio Settings
- Sound Effects: toggle switch
- Volume: slider (0–100%)
- Preview: plays a short sample sound on volume change

### Gameplay Assists
- Show Legal Moves: toggle switch
- Show Board Notation: toggle switch
- Show Move History: toggle switch
- Confirm Move: toggle switch

### Timed Mode
- Enabled/Disabled toggle
- When enabled, reveal format selector (Fischer, Countdown, Preset)
- Format-specific inputs:
  - Fischer: base time (minutes) + increment (seconds)
  - Countdown: total time (minutes)
  - Preset: list of preset buttons (e.g., "Blitz 3+2", "Rapid 15+10")

### State Management
- Settings stored in a global client-side state
- On change:
  - Update client state immediately (for instant UI feedback)
  - If registered user: debounced PATCH to backend (avoid excessive API calls during rapid toggles)
  - If guest: save to localStorage
- On app load:
  - If registered user: GET from backend, merge with defaults for missing fields
  - If guest: load from localStorage, fall back to defaults

### Instant Feedback
- Board theme and piece style changes must update the board appearance in real time (if a game is visible behind the settings panel)
- Sound toggle must take effect immediately
- Animation speed change is reflected on the next piece movement

---

## Acceptance Criteria

1. Settings panel opens from the main menu and from within an active game
2. Changing board theme updates the board immediately (no reload)
3. Changing piece style updates pieces immediately
4. Sound toggle silences/restores all game sounds instantly
5. Volume slider adjusts audio level in real time
6. Animation speed change is visible on the next piece move
7. All gameplay assist toggles work and are reflected in the game view
8. Timed mode configuration shows/hides format-specific inputs based on the toggle and format selection
9. Registered user: settings persist after logout and re-login (synced to backend)
10. Guest: settings persist within the session (localStorage); lost on browser close
11. Settings panel is keyboard-navigable and screen-reader-accessible
12. Settings load quickly on app start (no visible delay before first render)

---

## Testing Requirements

- **Component tests:**
  - Each setting control renders with correct initial value
  - Changing a toggle updates client state
  - Timed mode shows correct inputs per format
  - Volume slider emits correct values
- **Integration tests:**
  - Registered user: change settings → close panel → reopen → values persisted → logout → login → values persisted
  - Guest: change settings → refresh page → values from localStorage
  - Backend sync: verify PATCH is called with debouncing (not on every toggle)
- **Accessibility tests:**
  - All controls reachable via keyboard
  - Toggle state announced to screen readers
  - Section headings provide structure
- **Minimum coverage:** ≥ 85%
