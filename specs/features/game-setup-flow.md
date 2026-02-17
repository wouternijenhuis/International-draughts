# Feature: Game Setup Flow

**Feature ID:** `game-setup-flow`  
**PRD Version:** 1.0  
**Last Updated:** 2026-02-17  
**Status:** Draft

---

## 1. Purpose

Replace the current hidden-settings approach — where game-critical options (AI Difficulty, Play As, Opponent, Timed Mode) are buried behind a gear icon — with a dedicated **Game Setup Dialog** that appears when the user initiates a new game. This eliminates the problem of users unknowingly starting games with unintended default settings, makes configuration discoverable and frictionless, and separates game-critical setup from cosmetic display preferences.

### Problem Statement

Today, a user navigating to the Play page sees a board and a "New Game" button. All game configuration lives in a settings panel hidden behind a small ⚙ icon in the header. Users naturally click "New Game" immediately and receive opaque defaults (Medium AI, White, untimed) without ever knowing they can customize their experience. Specific pain points:

1. **Hidden game options** — The SettingsPanel is invisible by default, tucked behind a gear icon.
2. **No pre-game setup** — There is no dedicated configuration step before a game begins.
3. **Silent defaults** — "New Game" uses whatever settings are currently configured, with no confirmation or summary.
4. **Config not visible at a glance** — During gameplay, there is no indication of the active game configuration.
5. **Mixed settings** — Pre-game options (difficulty, opponent, timed mode) and cosmetic preferences (board theme, notation) are intermixed in one panel.
6. **Config resets on reload** — Game configuration preferences are not persisted across sessions.

### User Personas

| Persona | Need | How This Feature Helps |
|---------|------|------------------------|
| **Casual Player** | Start quickly with good defaults | Quick Start button preserves one-click experience |
| **Competitive Player** | Fine-tune difficulty, time controls, color choice | Setup dialog surfaces all options clearly before every game |
| **New Player** | Discover what options exist without hunting | Modal layout makes all choices visible and self-explanatory |

---

## 2. PRD Traceability

| Requirement | Description | Coverage |
|-------------|-------------|----------|
| REQ-25 | PvC: player selects difficulty, chooses white or black | Setup dialog: difficulty selector, Play As selector |
| REQ-26 | PvP (Local): pass-and-play on same device | Setup dialog: Opponent toggle (vs AI / vs Human) |
| REQ-30 | Optional timed mode, applies to PvC and PvP | Setup dialog: Timed Mode toggle + preset selector |
| REQ-41 | Timed mode: enable/disable, configure format and duration | Timed mode section in setup dialog |
| REQ-62 | Settings persist across sessions (registered) or within browser session (guest) | Config persistence via localStorage |
| REQ-15 | Four difficulty levels | Difficulty selector: Easy, Medium, Hard, Expert |

---

## 3. Inputs

- User action: click "New Game", "Play Now" (from home page), or "New Game" (post-game)
- User action: click "Rematch" (post-game, uses previous config)
- Previously saved game configuration (from localStorage)
- User identity: registered or guest (determines persistence strategy)

---

## 4. Outputs

- A confirmed game configuration object: `{ opponent, difficulty, playAs, timedMode, clockPreset }`
- New game session initialized with the confirmed configuration
- Persisted last-used configuration in localStorage
- Visible in-game config summary during active gameplay

---

## 5. Dependencies

| Direction | Feature | Relationship |
|-----------|---------|-------------|
| Upstream | Authentication | Determines persistence scope (registered → localStorage + backend sync; guest → localStorage only) |
| Upstream | Settings & Customization | Cosmetic/display settings remain in the gear-icon settings panel; game-critical settings move to the setup dialog |
| Downstream | Game Modes & Lifecycle | Receives the confirmed game configuration to initialize a new game session |
| Downstream | Timed Mode | Receives timed mode toggle and clock preset from the setup dialog |
| Downstream | AI Computer Opponent | Receives selected difficulty level from the setup dialog |
| Downstream | UI & Board Experience | Renders the setup dialog, in-game config summary, and post-game actions |

---

## 6. Feature Detail

### 6.1 Game Setup Dialog

A modal dialog that appears whenever the user starts a new game. It presents all game-critical configuration in a clear, scannable layout.

#### Trigger Points

| Action | Behaviour |
|--------|-----------|
| Click "New Game" on the Play page (no active game) | Open setup dialog |
| Click "Play Now" from the Home page | Navigate to `/play`, then open setup dialog |
| Click "New Game" after a completed game | Open setup dialog |
| Click "Rematch" after a completed game | Skip dialog; start new game with same config |

#### Dialog Layout & Options

| Section | Control | Options | Default | Visibility |
|---------|---------|---------|---------|------------|
| **Opponent** | Toggle cards or segmented control | vs AI / vs Human (Local) | vs AI | Always visible |
| **AI Difficulty** | Segmented control or radio group | Easy / Medium / Hard / Expert | Medium | Only when Opponent = vs AI |
| **Play As** | Three-option selector (icons + labels) | White / Black / Random | White | Always visible |
| **Timed Mode** | Toggle switch | On / Off | Off | Always visible |
| **Clock Preset** | Dropdown or chip selector | Blitz 3+2, Blitz 5+5, Rapid 10+0, Rapid 15+10, Classical 30+0, Classical 60+30 | Rapid 10+0 | Only when Timed Mode = On |

#### Dialog Actions

| Button | Behaviour |
|--------|-----------|
| **Start Game** | Saves config to localStorage, initializes new game with selected settings, closes dialog |
| **Quick Start** | Starts a new game immediately using the last-used (or default) settings without requiring the user to review options; config is still saved |
| **Close / Cancel** | Dismisses the dialog without starting a game; returns to the previous view |

#### Interaction Details

- When the user toggles Opponent from "vs AI" to "vs Human (Local)", the AI Difficulty section hides with a smooth transition.
- When the user toggles Timed Mode on, the Clock Preset section expands below with a smooth transition.
- "Random" for Play As resolves at game start (not in the dialog) — the player sees which color they received once the game begins.
- Expert difficulty shows a subtle info badge: "Requires server connection" to set expectations.
- The dialog remembers and pre-fills the user's last-used settings on subsequent opens.

### 6.2 Settings Panel Separation

The existing gear-icon (⚙) settings panel is retained but scoped to **cosmetic and display preferences only**. All game-critical options are removed from it.

#### Settings Panel (Gear Icon) — Retained Options

| Setting | Options | Default |
|---------|---------|---------|
| Board Theme | Classic Wood, Dark, Ocean, Tournament Green | Classic Wood |
| Piece Style | Flat, 3D, Classic, Modern Minimalist | Classic |
| Show Board Notation | On / Off | Off |
| Show Legal Moves | On / Off | On |
| Show Move History | On / Off | On |
| Move Animation Speed | Instant / Fast / Normal / Slow | Normal |
| Sound Effects | On / Off | On |
| Volume | Slider (0–100%) | 70% |
| Confirm Move | On / Off | Off |
| Promotion Animation | On / Off | On |

#### Settings Panel — Removed Options (Moved to Setup Dialog)

- ~~AI Difficulty~~ → Setup Dialog
- ~~Timed Mode toggle~~ → Setup Dialog
- ~~Time Control Format / Parameters~~ → Setup Dialog

The settings panel heading should be updated to "Display & Preferences" or similar to reflect its narrowed scope.

### 6.3 In-Game Config Summary

During an active game, a compact summary of the current game configuration is displayed so players can see at a glance what they are playing.

#### Placement

- Positioned below the game status area (e.g., below "Your Turn" / "AI Thinking…") or as a subtle info bar between the board and the controls.
- Must not obscure the board or distract from gameplay.

#### Content

| Game Mode | Summary Content |
|-----------|----------------|
| PvC, untimed | `vs AI · Medium · Playing as White` |
| PvC, timed | `vs AI · Hard · White · Rapid 15+10` |
| PvP, untimed | `vs Human · Local` |
| PvP, timed | `vs Human · Local · Blitz 3+2` |

#### Styling

- Small, muted text (secondary color, smaller font size).
- Single line on desktop; may wrap to two lines on narrow mobile screens.
- Non-interactive — purely informational. No click action.

### 6.4 Post-Game Actions ("Play Again" Enhancement)

After a game ends (win, loss, draw, resignation), the game-over display offers two distinct "play again" options instead of a single "New Game" button.

| Button | Label | Behaviour |
|--------|-------|-----------|
| **Rematch** | "Rematch" | Immediately starts a new game with the **same configuration** as the just-completed game. No dialog. |
| **New Game** | "New Game" | Opens the **Game Setup Dialog** with the last-used settings pre-filled, allowing the user to change configuration before starting. |

#### Layout

- Both buttons are displayed side-by-side (desktop) or stacked (mobile) in the game-over panel.
- "Rematch" is the primary/emphasized button (since quick replay is the most common desire).
- "New Game" is the secondary button.

### 6.5 Config Persistence

Game configuration is persisted across sessions so the user's preferences carry over.

#### Storage Strategy

| User Type | Storage | Scope |
|-----------|---------|-------|
| Registered | localStorage (primary) + backend sync (future) | Survives browser sessions and page reloads |
| Guest | localStorage | Survives browser sessions and page reloads; cleared if browser storage is cleared |

#### Persisted Data

```json
{
  "lastGameConfig": {
    "opponent": "ai",
    "difficulty": "medium",
    "playAs": "white",
    "timedMode": false,
    "clockPreset": "rapid-10-0"
  }
}
```

#### Behaviour

- On first visit (no saved config), defaults are used: vs AI, Medium, White, Untimed.
- On subsequent visits, the last-used config is loaded and pre-filled in the setup dialog.
- Quick Start always uses the last-used (or default) config.
- If "Random" was selected for Play As, the persisted value stores `"random"` (not the resolved color).

---

## 7. Acceptance Criteria

### Setup Dialog

1. **Dialog appears on New Game:** Clicking "New Game" when no game is in progress opens the Game Setup Dialog as a modal overlay.
2. **Dialog appears from Home:** Clicking "Play Now" on the Home page navigates to `/play` and opens the Game Setup Dialog.
3. **Opponent toggle:** The user can switch between "vs AI" and "vs Human (Local)". Selecting "vs Human" hides the AI Difficulty section; selecting "vs AI" shows it.
4. **Difficulty selection:** When "vs AI" is selected, the user can choose Easy, Medium, Hard, or Expert. The selected difficulty is visually highlighted.
5. **Play As selection:** The user can choose White, Black, or Random. The selection is visually highlighted.
6. **Timed Mode toggle:** The user can enable or disable Timed Mode. Enabling it reveals the Clock Preset selector; disabling it hides it.
7. **Clock preset selection:** When Timed Mode is on, the user can select a clock preset from the available options.
8. **Start Game:** Clicking "Start Game" closes the dialog and begins a new game with the selected configuration.
9. **Quick Start:** Clicking "Quick Start" closes the dialog and begins a new game using the last-used (or default) settings without requiring manual selection.
10. **Cancel:** Clicking close/cancel dismisses the dialog without starting a game or modifying saved config.
11. **Pre-fill:** The dialog pre-fills with the user's last-used settings (or defaults on first visit).
12. **Random color resolution:** When "Random" is selected for Play As, the assigned color is resolved at game start, not during setup. The player is informed of their assigned color once the game begins.
13. **Expert badge:** The Expert difficulty option displays a subtle indicator that it requires a server connection.

### Settings Panel Separation

14. **Cosmetic only:** The gear-icon settings panel contains only display and preference options (Board Theme, Piece Style, Notation, Legal Moves, Animation Speed, Sound, Confirm Move, Promotion Animation, Move History). No game-critical options (difficulty, timed mode) appear in it.
15. **Panel still accessible during game:** The settings panel remains accessible via the gear icon during an active game, and changes apply in real time.

### In-Game Config Summary

16. **Summary visible:** During an active game, a compact text summary of the current game configuration is visible on screen.
17. **Summary content accurate:** The summary correctly reflects the opponent type, difficulty (if PvC), player color, and time control (if timed).
18. **Summary non-intrusive:** The summary does not obscure the board, game controls, or other important UI elements.

### Post-Game Actions

19. **Rematch button:** After a game ends, a "Rematch" button is available. Clicking it starts a new game with the same configuration as the completed game, without opening the setup dialog.
20. **New Game button:** After a game ends, a "New Game" button is available. Clicking it opens the Game Setup Dialog with the last-used configuration pre-filled.
21. **Both buttons visible:** Both "Rematch" and "New Game" are displayed in the game-over panel.

### Config Persistence

22. **Persistence across sessions:** A user configures a game (e.g., Hard, Black, Timed Blitz 3+2), plays, closes the browser, returns later, and clicks "New Game" — the dialog pre-fills with Hard, Black, Timed, Blitz 3+2.
23. **Persistence on reload:** Refreshing the page does not reset the user's last-used game configuration.
24. **Default fallback:** A first-time user (no saved config) sees defaults: vs AI, Medium, White, Untimed.

### Accessibility

25. **Keyboard navigable:** The setup dialog is fully operable via keyboard — Tab to move between controls, Enter/Space to select, Escape to close.
26. **Screen reader support:** All dialog controls have appropriate ARIA labels. The dialog is announced as a modal to screen readers.
27. **Focus trap:** When the dialog is open, focus is trapped within it. Closing the dialog returns focus to the trigger element.
28. **Contrast:** All text and controls in the dialog meet WCAG 2.1 AA contrast requirements.

---

## 8. Technical Constraints

- The setup dialog must render performantly on low-end mobile devices — no jank on open/close animations.
- Config persistence uses `localStorage` with a namespaced key (e.g., `draughts_lastGameConfig`) to avoid collisions with other stored data.
- The dialog must be responsive: full-width on mobile, centered card on desktop (max-width ~480px).
- The dialog should use the app's existing design system (Tailwind CSS classes, consistent with the premium visual language defined in the UI & Board Experience feature).
- "Random" color assignment must use a cryptographically acceptable random source (`Math.random()` is acceptable for this non-security use case).
- The setup dialog must not block the main thread or cause layout shifts on the underlying page.

---

## 9. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Non-default difficulty usage** | ≥ 40% of games use a difficulty other than Medium | Analytics: game start events with difficulty field |
| **Timed mode adoption** | ≥ 15% of games use timed mode | Analytics: game start events with timed mode field |
| **Time-to-first-game (new users)** | ≤ 15 seconds from landing on `/play` to game start | Analytics: timestamp between page load and first move |
| **Setup dialog engagement** | ≥ 60% of game starts go through the dialog (vs. Quick Start) within the first month | Analytics: dialog open vs. Quick Start events |
| **Unintended default games** | ≤ 10% of returning users start 5+ consecutive games with unchanged defaults | Analytics: consecutive default-config game starts |

---

## 10. Non-Goals

- **Online multiplayer / matchmaking:** Network-based opponent matching is out of scope (local pass-and-play only).
- **Learning mode changes:** The learning/tutorial mode is a separate feature and is not affected by this work.
- **Board theme redesign:** Visual theme additions or redesigns are cosmetic work handled by the UI & Board Experience feature.
- **Custom time controls:** User-defined base time and increment input fields are out of scope for this feature; only presets are offered in the setup dialog. Custom controls may be added later.
- **Backend settings sync:** While localStorage persistence is in scope, backend sync of game configuration for registered users is a future enhancement.

---

## 11. Open Questions

1. Should the "Quick Start" button be inside the dialog (visible after the dialog opens) or outside it (a separate button alongside "New Game" that bypasses the dialog entirely)?
2. Should the setup dialog support a "Favourite configs" or "Presets" feature in a future iteration (e.g., "My Blitz Setup", "Training Config")?
3. When a user clicks "Play Now" from the Home page for the very first time, should the dialog open, or should they get an immediate Quick Start experience to reduce friction?
4. Should the in-game config summary be clickable to open settings, or strictly non-interactive?
5. For PvP local mode, should the Play As selector be hidden (since both colors are played by local users) or shown with a label like "You start as"?

---

## Dev Lead Review

**Reviewer:** Dev Lead  
**Date:** 2026-02-17  
**FRD Version Reviewed:** 1.0

### 1. Feasibility Assessment

✅ **Feasible** — All proposed features can be implemented with the current tech stack (Next.js 16, React 19, Zustand, Tailwind CSS). No new dependencies are required. The existing architecture cleanly supports the changes.

### 2. Technical Notes

#### 2.1 GameConfig Interface — Needs Extension

The current `GameConfig` interface in [`game-store.ts`](frontend/src/stores/game-store.ts#L70) uses `playerColor: PlayerColor` (an enum with values `White` and `Black`). The FRD introduces a **"Random"** option for Play As, which has no representation in the existing `PlayerColor` enum (defined in [draughts-types.ts](frontend/src/lib/draughts-types.ts)).

**Recommended approach:** Add a `playAs: 'white' | 'black' | 'random'` field to `GameConfig` rather than modifying the `PlayerColor` enum. The existing `playerColor` field can remain as the *resolved* color (set at game start time), while `playAs` stores the user's *preference* (including `'random'`). This preserves type safety throughout the game engine, which relies on `PlayerColor` being binary.

#### 2.2 Config Persistence — New Concern Separate from Game Persistence

The FRD specifies persisting `lastGameConfig` to `localStorage`. The existing game persistence system ([game-persistence.ts](frontend/src/lib/game-persistence.ts)) handles **in-progress game state** (via `sessionStorage` for guests, `localStorage` for registered users). This is a *different* concern — the `lastGameConfig` should persist independently of any active game:

- A new `localStorage` key (`draughts_lastGameConfig`) is needed, as the FRD correctly states.
- This must persist for **both** guests and registered users (the FRD's assertion that guests use `localStorage` differs from the current guest persistence which uses `sessionStorage`). The FRD's choice of `localStorage` for config is the right call — config preferences should survive tab closes even for guests.
- A simple utility module or extension to `game-persistence.ts` can handle this. No Zustand `persist` middleware is needed since this is a simple load-on-open / save-on-start pattern.

#### 2.3 SettingsPanel Refactoring

The current [`SettingsPanel.tsx`](frontend/src/components/settings/SettingsPanel.tsx) (281 lines) mixes game-critical options (AI Difficulty at line 113, Player Color at line 147, Opponent Type at line 173, Timed Mode at line 203) with cosmetic settings. The FRD correctly identifies this.

**Impact:** The SettingsPanel must have **AI Difficulty**, **Opponent**, **Player Color**, and **Timed Mode** sections removed. The existing `SettingsPanel.test.tsx` has 7 tests, several of which test difficulty and opponent options — these will need updating or removal. The panel heading should change from "Settings" to "Display & Preferences".

Cosmetic settings that remain in the panel but are **not yet implemented** according to the FRD's retained-options table: **Piece Style**, **Sound Effects**, **Volume**, **Confirm Move**, **Promotion Animation**, **Show Move History**. These are either not yet built or partially implemented. This is not a regression — just noting the delta. The FRD's table lists them for completeness, which is fine as a target state, but the implementation scope of *this* feature should only cover removing game-critical options from the panel, not adding missing cosmetic options.

#### 2.4 GameControls — Post-Game Actions

The current [`GameControls.tsx`](frontend/src/components/game/GameControls.tsx#L116) renders a single "New Game" button after game completion (via `resetGame()`). The FRD requires two buttons: **Rematch** and **New Game**.

- **Rematch** → needs to call `startGame()` with the *same config* as the completed game (config is already in the store).
- **New Game** → needs to call `resetGame()` (return to `'not-started'` phase) and then open the setup dialog.

The `resetGame()` function ([game-store.ts line 750](frontend/src/stores/game-store.ts#L750)) currently resets the phase to `'not-started'` but does **not** clear the config — it preserves it. This is actually the desired behavior for the "Rematch" flow and for pre-filling the dialog.

A new store action (or flag) may be needed to signal the setup dialog should open. Alternatively, the dialog can be managed via local React state in the Play page component, which is simpler and avoids polluting global state.

#### 2.5 Setup Dialog Component — New Component Needed

No setup dialog component exists today. A new `GameSetupDialog.tsx` component should be created under `frontend/src/components/game/`. It should:

- Be a modal overlay with focus trap and Escape-to-close (ARIA `role="dialog"`, `aria-modal="true"`).
- Use Tailwind for styling (consistent with existing components).
- Use the existing `useGameStore` to read current config and call `startGame()`.
- Manage its own internal form state and only commit to the store on "Start Game".

React 19's `<dialog>` element support or a custom modal approach are both viable. Given the project doesn't use a UI component library (everything is hand-rolled with Tailwind), a custom modal is consistent. Consider using the native `<dialog>` element with `showModal()` for free focus trapping and backdrop — it has excellent browser support and reduces custom accessibility code.

#### 2.6 Home Page → Play Flow

The "Play Now" link on the [home page](frontend/src/app/page.tsx#L33) is currently a simple `<Link href="/play">`. To trigger the setup dialog on arrival, the Play page needs to detect that navigation came from the home page CTA. Options:

1. **URL search param:** `<Link href="/play?setup=true">` — the Play page reads the param and auto-opens the dialog. Clean, bookmarkable. **Recommended.**
2. **Store flag:** Set a flag in Zustand before navigation. Fragile across SSR/hydration boundaries.
3. **Always-open:** Always show the dialog when `phase === 'not-started'` and no saved game prompt is active. This is the simplest but might feel aggressive on direct `/play` navigation.

**Recommendation:** Option 1 (`?setup=true` query param) combined with Option 3 as the default behavior when `phase === 'not-started'` and no saved game exists.

#### 2.7 In-Game Config Summary — New Component

A small `GameConfigSummary` component is needed. This is trivial — it reads `config` from `useGameStore` and renders a one-liner. Should be placed in the Play page between `<GameStatus />` and `<GameBoard />`.

#### 2.8 Interaction with Saved Game Resume Flow

The Play page currently shows a `ResumePrompt` when a saved game is detected ([page.tsx line 170](frontend/src/app/play/page.tsx#L170)). The FRD doesn't address the interaction between the resume prompt and the setup dialog. These should be mutually exclusive:

- If a saved game exists → show `ResumePrompt` (as today).
- If user discards saved game → then show setup dialog, not go straight to `'not-started'`.
- If no saved game → show setup dialog.

This ordering needs to be explicitly defined in the FRD.

#### 2.9 Clock Preset Mismatch

The FRD lists 6 clock presets including `Classical 60+30`. The current codebase's `CLOCK_PRESETS` in [`SettingsPanel.tsx`](frontend/src/components/settings/SettingsPanel.tsx#L25) has only 5 presets and does not include `Classical 60+30`. The `CLOCK_PRESETS` from the shared engine (imported in `game-store.ts`) would need to be verified for support of this additional preset. This is a minor addition if not already present.

### 3. Missing Requirements

1. **Saved game ↔ setup dialog interaction:** The FRD does not specify what happens when a saved game exists and the user clicks "New Game." Should it warn about losing the saved game before opening the setup dialog? Currently, `startGame()` calls `clearSavedGame()` — a confirmation step may be needed.

2. **Learning mode integration:** The FRD does not mention `gameMode` (`'standard'` | `'learning'`). The current `GameConfig` has a `gameMode` field. The setup dialog should either include a Game Mode selector or document that Learning Mode is always launched from the `/learn` page and not from the setup dialog. This needs clarification to avoid a regression where users can no longer select Learning Mode from the Play page.

3. **"Random" color feedback UX:** The FRD says "the player is informed of their assigned color once the game begins" but doesn't specify *how*. A brief toast notification, an animation, or a highlighted status message? This needs a UX specification.

4. **Keyboard shortcuts:** The FRD specifies keyboard navigation within the dialog but doesn't mention keyboard shortcuts to *open* the dialog (e.g., pressing `N` for New Game when no game is active).

5. **Responsive breakpoints:** The FRD says "full-width on mobile, centered card on desktop (max-width ~480px)" but doesn't specify the breakpoint. The codebase uses Tailwind's `lg:` prefix (1024px) as the primary responsive breakpoint. The dialog should follow this convention.

6. **Animation specifications:** The FRD mentions "smooth transition" for section show/hide but doesn't specify duration or easing. Should align with the existing animation speed setting or use a fixed subtle transition (e.g., 200ms ease-out). Recommend 150–200ms for UI transitions, independent of the board animation speed setting.

7. **Expert AI availability check:** The FRD mentions an info badge "Requires server connection" but doesn't specify whether the dialog should actually *check* server availability and disable Expert if unreachable. The current Expert AI implementation falls back to Hard difficulty silently. A real-time health check would add complexity; recommend keeping the badge as informational only.

8. **Config persistence storage key naming:** The FRD specifies `draughts_lastGameConfig` (underscore), while existing keys use hyphens (e.g., `draughts-in-progress-game`, `draughts-auth`). Should standardize — recommend `draughts-last-game-config` for consistency.

### 4. Recommended Approach

**Phase 1: Setup Dialog & Config Persistence (Core)**
1. Create a `lastGameConfig` persistence utility (load/save to `localStorage` under key `draughts-last-game-config`).
2. Add `playAs: 'white' | 'black' | 'random'` to `GameConfig` interface; update `startGame()` to resolve `'random'` to a concrete `playerColor` at start time.
3. Build `GameSetupDialog.tsx` as a modal component using the native `<dialog>` element for built-in focus trapping and backdrop. Internal form state; commits to store on Start Game.
4. Wire dialog triggers: "New Game" button in `GameControls.tsx`, "Play Now" from home page (via `?setup=true` query param), and post-game "New Game" button.

**Phase 2: Settings Panel Separation**
5. Remove game-critical options (AI Difficulty, Opponent, Timed Mode, Clock Preset, Player Color) from `SettingsPanel.tsx`. Update heading to "Display & Preferences".
6. Update `SettingsPanel.test.tsx` to reflect the reduced scope.

**Phase 3: Post-Game & In-Game UX**
7. Split the post-game "New Game" button in `GameControls.tsx` into "Rematch" (primary) + "New Game" (secondary).
8. Create `GameConfigSummary.tsx` component and add it to the Play page layout.
9. Update `GameStatus.tsx` if needed for revised status messaging.

**Phase 4: Testing & Polish**
10. Add unit tests for: `GameSetupDialog`, config persistence utility, updated `GameControls` post-game buttons, `GameConfigSummary`, updated `SettingsPanel`.
11. Update integration test in `page.test.tsx` for new dialog flow.
12. Ensure accessibility: keyboard navigation, focus trap, ARIA labels, contrast.

### 5. Effort Estimate

**Size: M (Medium)** — Estimated 3–5 dev days

| Work Item | Estimate |
|-----------|----------|
| `GameSetupDialog.tsx` (component + styling + accessibility) | 1.5 days |
| Config persistence utility + `playAs: 'random'` support | 0.5 days |
| `SettingsPanel.tsx` refactoring (remove game-critical options) | 0.25 days |
| `GameControls.tsx` post-game Rematch/New Game split | 0.25 days |
| `GameConfigSummary.tsx` component | 0.25 days |
| Play page integration (dialog triggers, resume prompt interaction, home page flow) | 0.5 days |
| Unit tests for all new/modified components | 1 day |
| Accessibility testing & polish (focus trap, ARIA, keyboard) | 0.25 days |
| **Total** | **~4.5 days** |

**Justification:** No new libraries needed. ~1 new component of moderate complexity (dialog), ~4 smaller modifications to existing components, plus test updates. All within established patterns.

### 6. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Saved game resume vs. setup dialog race condition** — user arrives at `/play`, both resume prompt and setup dialog try to open | Medium | Medium | Define clear priority: resume prompt first; setup dialog only after discard or if no saved game. Add explicit guard in Play page state logic. |
| **Config persistence migration** — existing users have no `lastGameConfig` in localStorage; first load after deploy must gracefully default | Low | Low | Already handled by the FRD's "default fallback" behavior (AC #24). Implement with `?? DEFAULT_CONFIG` pattern. |
| **Breaking existing test expectations** — `SettingsPanel.test.tsx`, `GameControls.test.tsx`, and `page.test.tsx` all test current behaviors that will change | Medium | Low | Update tests in the same PR as component changes. No separate migration needed. |
| **Learning mode regression** — removing game mode from settings panel without adding it to setup dialog may leave learning mode inaccessible from `/play` | Medium | High | Clarify with Product: is learning mode launched exclusively from `/learn`? If yes, document it. If no, add a game mode toggle to the setup dialog. |
| **Expert AI badge misleading users** — badge says "requires server" but no live check; user selects Expert while offline and gets silent fallback to Hard | Low | Medium | Acceptable for MVP per FRD. Consider adding a visual indicator during game if Expert falls back to Hard (future enhancement). |
