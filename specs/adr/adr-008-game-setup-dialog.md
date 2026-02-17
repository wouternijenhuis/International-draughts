# ADR-008: Game Setup Dialog — UI Pattern, Component Architecture, State Management, and Config Persistence

## Status

Proposed

## Date

2026-02-17

## Context

The current game setup experience requires users to discover and configure game-critical options (AI Difficulty, Play As, Opponent, Timed Mode) through a gear-icon settings panel (`SettingsPanel.tsx`, 281 lines) that is hidden by default and mixes game-critical options with cosmetic display preferences. Users who click "New Game" without opening the settings panel receive opaque defaults (Medium AI, White, untimed) with no confirmation or summary. The [Game Setup Flow FRD](../features/game-setup-flow.md) specifies replacing this with a dedicated **Game Setup Dialog** that appears when the user initiates a new game.

This ADR addresses four architectural decisions required to implement the setup dialog:

1. **UI pattern** for presenting the setup dialog
2. **Component architecture** for structuring the dialog internals
3. **State management** for dialog open/close state and interim selections
4. **Config persistence** for remembering the user's preferred game settings across sessions

### Current Architecture

- **Play page** ([`frontend/src/app/play/page.tsx`](../../frontend/src/app/play/page.tsx)): Renders the game board, controls, move history, and a collapsible `SettingsPanel`. Settings visibility is managed via local React state (`showSettings`).
- **Settings panel** ([`frontend/src/components/settings/SettingsPanel.tsx`](../../frontend/src/components/settings/SettingsPanel.tsx)): A single component containing both game-critical options (AI Difficulty, Opponent, Player Color, Timed Mode, Clock Preset) and cosmetic options (Board Theme, Notation, Legal Moves, Animation Speed). All options mutate the Zustand game store directly via `setConfig()`.
- **Game store** ([`frontend/src/stores/game-store.ts`](../../frontend/src/stores/game-store.ts)): Zustand store managing the full game lifecycle. `GameConfig` contains all configuration (game-critical + cosmetic). `startGame(config?)` accepts a partial config override. `resetGame()` returns to `'not-started'` phase while preserving the current config.
- **Resume prompt**: When a saved game is detected, a `ResumePrompt` overlay appears. This must interact correctly with any new setup dialog — they must be mutually exclusive.
- **Home page**: The "Play Now" link navigates to `/play` with a plain `<Link href="/play">`. There is no mechanism to signal that the setup dialog should open on arrival.

### Forces

- **Discoverability**: Game-critical options must be visible before every new game without requiring users to hunt for them.
- **Quick start**: The one-click experience must be preserved for users who want to play immediately with their last-used settings.
- **Mobile responsiveness**: The solution must work well on narrow screens (≤ 375px width) without jank on open/close animations.
- **Accessibility**: The dialog must be fully keyboard-navigable with proper focus management, ARIA semantics, and WCAG 2.1 AA contrast (FRD AC #25–#28).
- **Implementation simplicity**: No new libraries. The project uses hand-rolled Tailwind CSS components — no UI component library.
- **Consistency**: The solution must align with existing patterns in the codebase (Zustand for global state, local state for UI concerns, Tailwind for styling).
- **Separation of concerns**: Game-critical setup options must be cleanly separated from cosmetic display preferences.
- **Persistence scope**: Config preferences should survive browser tab/session closes for both guests and registered users, unlike in-progress game state which uses `sessionStorage` for guests.
- **Interaction with saved games**: The setup dialog and `ResumePrompt` must be mutually exclusive: resume prompt takes priority when a saved game exists.

---

## Decision

### Decision 1: UI Pattern — Modal Dialog

**Use a centered modal dialog overlay for the Game Setup Dialog.**

The dialog appears as a modal overlay (`role="dialog"`, `aria-modal="true"`) when the user initiates a new game. It uses the native HTML `<dialog>` element with `showModal()` for built-in focus trapping, backdrop rendering, and Escape-to-close behavior.

**Rationale:**

| Criterion | Modal Dialog (chosen) | Inline Panel | Full Page (`/play/setup`) |
|-----------|----------------------|--------------|--------------------------|
| **UX flow** | Natural interrupt pattern — user clicks "New Game", reviews options, confirms. Preserves the board as visual context behind the overlay. | Replaces the board area, losing visual context. Awkward when a completed game is on screen (board disappears). | Full navigation away from the play page. Feels heavy for a 5-option form. Requires a route transition and separate layout. |
| **Mobile responsiveness** | Full-width sheet on mobile (max-width ~480px centered card on desktop). Well-established mobile UX pattern. | Requires the board area to resize/collapse. Layout instability on small screens. | Works but feels like a separate "page" for what is conceptually a pre-game step. |
| **Implementation effort** | Moderate. Native `<dialog>` provides focus trap, backdrop, and Escape handling for free. Custom styling via Tailwind. | Low — just conditionally render a form instead of the board. But requires managing the board show/hide state. | Higher — new route, new page component, navigation guards to prevent direct access without intent, back-button handling. |
| **Accessibility** | Native `<dialog>` with `showModal()` provides automatic focus trapping, backdrop click handling, and screen reader announcement. Best-in-class a11y with minimal custom code. | No focus trap needed (inline), but no modal semantics either. Screen readers don't announce it as a dialog. | Standard page navigation — accessible but loses the modal semantics that communicate "you need to make a choice before proceeding." |
| **Animation/transitions** | Smooth fade-in/scale-up on open, fade-out on close. CSS transitions on the `<dialog>` element. 150–200ms duration, consistent with existing UI transitions. | Section expand/collapse animation. Risk of layout shifts. | Route transition. Next.js page transitions can be animated but add complexity. |
| **Saved game interaction** | Easy to gate: don't open the dialog if `ResumePrompt` is active. Both are overlays with clear priority. | Harder to manage — inline panel and resume prompt compete for the same screen area. | Resume prompt would need to appear on the setup page or redirect back to `/play`. |

**The native `<dialog>` element** is chosen over a custom modal `<div>` because:
- `showModal()` provides automatic focus trapping — no custom focus-trap library needed.
- The `::backdrop` pseudo-element provides a styled overlay with no additional DOM nodes.
- `Escape` key closes the dialog natively (with a `cancel` event for custom handling).
- Screen readers announce the dialog as a modal automatically when `aria-modal="true"` is set.
- Browser support is universal (baseline since 2022).

**Trigger points and dialog opening logic:**

| Trigger | Implementation |
|---------|---------------|
| "New Game" button (no active game) | Play page opens the dialog |
| "Play Now" from Home page | Home page links to `/play?setup=true`; Play page reads the query param and auto-opens the dialog |
| "New Game" after a completed game | Post-game "New Game" button calls `resetGame()` then opens the dialog |
| Direct navigation to `/play` (no saved game, `phase === 'not-started'`) | Auto-open the dialog |
| Direct navigation to `/play` (saved game exists) | Show `ResumePrompt` first; if user discards, then open the dialog |

The `?setup=true` query param for the Home → Play flow is consumed once and removed from the URL (via `router.replace('/play', { scroll: false })`) to prevent the dialog from re-opening on page refresh.

### Decision 2: Component Architecture — Composable Sub-Components

**Structure the `GameSetupDialog` as a thin container that composes focused sub-components for each option group.**

```
GameSetupDialog (container — dialog element, layout, actions)
├── OpponentSelector        — "vs AI" / "vs Human (Local)" toggle
├── DifficultySelector      — Easy / Medium / Hard / Expert segmented control
├── ColorPicker             — White / Black / Random selector
├── TimedModeToggle         — On/Off switch
└── ClockPresetSelector     — Preset chip grid
```

**Rationale:**

| Criterion | Composable (chosen) | Monolithic |
|-----------|-------------------|------------|
| **Testability** | Each sub-component can be unit-tested in isolation with minimal props. `DifficultySelector` tests don't need to render the full dialog. | Testing requires rendering the entire dialog for every test case. Harder to isolate specific option behaviors. |
| **Reusability** | Sub-components like `DifficultySelector` or `ClockPresetSelector` could be reused elsewhere (e.g., tournament setup, quick-settings). | No reuse — all logic is locked inside one component. |
| **Readability** | `GameSetupDialog.tsx` is ~80–100 lines of layout and composition. Each sub-component is ~30–60 lines. Total LOC is similar but distributed across focused files. | Single file of ~250–300 lines mixing layout, state, and five distinct UI sections. Hard to navigate. |
| **Conditional rendering** | `DifficultySelector` is rendered conditionally based on opponent type. `ClockPresetSelector` is rendered conditionally based on timed mode. Each conditional block is a single component with clear props. | Conditional rendering is inline with `{config.opponent === 'ai' && (...)}` blocks that span 30+ lines. Deeply nested JSX. |
| **Maintenance** | Adding a new option (e.g., Game Mode selector) means adding one new sub-component and one line in the container. | Adding a new option means inserting 30+ lines into an already large component. |

**Sub-component API design:**

Each sub-component receives its current value and an `onChange` callback. They do not access the Zustand store directly — all state is managed by the `GameSetupDialog` container and passed down as props. This keeps sub-components pure and testable.

```typescript
// Example: DifficultySelector
interface DifficultySelectorProps {
  value: AIDifficulty;
  onChange: (difficulty: AIDifficulty) => void;
}
```

The container (`GameSetupDialog`) manages interim form state (see Decision 3) and only commits to the store when the user clicks "Start Game."

**File organization:**

```
frontend/src/components/game/
├── GameSetupDialog.tsx          — container: dialog, layout, form state, actions
├── GameSetupDialog.test.tsx     — integration tests for dialog behavior
├── setup/                       — sub-components directory
│   ├── OpponentSelector.tsx
│   ├── DifficultySelector.tsx
│   ├── ColorPicker.tsx
│   ├── TimedModeToggle.tsx
│   └── ClockPresetSelector.tsx
```

### Decision 3: State Management — Local React State in the Dialog Component

**Manage the setup dialog's interim selections as local React state within the `GameSetupDialog` component. Manage the dialog's open/close state as local React state in the Play page.**

The dialog maintains its own `formState` (a copy of the game config options) using `useState`. When the dialog opens, it initializes `formState` from the persisted last-used config (see Decision 4). The user's selections update `formState` only. When the user clicks "Start Game," the dialog commits `formState` to the Zustand game store via `startGame(formState)` and persists it to `localStorage`. Clicking "Cancel" discards `formState` with no side effects.

The dialog's open/close visibility is managed via a `showSetupDialog` boolean in the Play page's local React state, alongside the existing `showSettings` and `showResumePrompt` states.

**Rationale:**

| Criterion | Local React state (chosen) | Zustand store extension | URL-based (`?setup=true`) |
|-----------|--------------------------|------------------------|--------------------------|
| **Scope** | Dialog state is inherently UI-local. It exists only while the dialog is mounted and has no meaning outside the Play page. Local state correctly scopes it. | Adds `showSetupDialog` and interim config fields to global state. Pollutes the game store with transient UI concerns that are irrelevant to game logic. | URL state is global and bookmarkable. A user bookmarking `/play?setup=true` would see the dialog on every visit — undesirable. |
| **Simplicity** | `useState` — zero configuration, zero middleware, zero selectors. The simplest possible approach. | Requires adding new fields to the store interface, new actions, and potentially `persist` middleware configuration to exclude transient fields from persistence. | Requires reading `searchParams`, syncing URL state with dialog visibility, and cleaning up the URL after consumption. More complex than local state. |
| **Interim selections** | `formState` lives in the dialog. Closing the dialog discards uncommitted changes automatically (component unmounts → state is garbage collected). No cleanup logic needed. | Interim selections in the store would need explicit cleanup on cancel. Risk of stale interim state if the component unmounts unexpectedly. | URL cannot represent interim form selections (opponent, difficulty, color, timed mode). Would still need local or store state for form fields. |
| **SSR/hydration** | No SSR concerns — the dialog is client-side only and renders conditionally. | Zustand stores with persist middleware can cause hydration mismatches if `showSetupDialog` is persisted. Requires careful `skipHydration` handling. | `searchParams` are available during SSR, which could cause the dialog to render server-side in an incomplete state. |
| **Testing** | Test the Play page's dialog trigger logic and the dialog's form behavior independently. No store mocking needed for dialog open/close. | Every test that renders the Play page must configure the store's dialog-related fields. | Tests must set up URL search params via mocked `useSearchParams`. |
| **Pattern consistency** | Consistent with existing Play page state management: `showSettings` and `showResumePrompt` are already local `useState` booleans. | Inconsistent — the existing settings panel visibility (`showSettings`) uses local state. Mixing patterns for similar concerns creates confusion. | Novel pattern not used elsewhere in the codebase. |

**The `?setup=true` query param is still used**, but only as a one-time signal from the Home page's "Play Now" link, not as the primary state management mechanism. The Play page reads the param on mount, opens the dialog, and immediately removes the param from the URL. After that, dialog visibility is entirely managed by local state.

**Flow diagram:**

```
User clicks "New Game" or arrives at /play
  ↓
Play page sets showSetupDialog = true
  ↓
GameSetupDialog mounts, initializes formState from loadLastGameConfig()
  ↓
User adjusts options → formState updates (local useState)
  ↓
User clicks "Start Game"
  ├── saveLastGameConfig(formState) → localStorage
  ├── startGame(formState) → Zustand game store
  └── onClose() → Play page sets showSetupDialog = false
         ↓
      Dialog unmounts, formState is discarded

User clicks "Cancel"
  └── onClose() → Play page sets showSetupDialog = false
         ↓
      Dialog unmounts, formState is discarded (no side effects)

User clicks "Quick Start"
  ├── config = loadLastGameConfig() ?? DEFAULT_CONFIG
  ├── startGame(config) → Zustand game store
  └── onClose() → Play page sets showSetupDialog = false
```

### Decision 4: Config Persistence Strategy — Separate localStorage Utility

**Create a dedicated `localStorage` utility for game config persistence, separate from both the Zustand game store and the existing game persistence module.**

A new utility provides two functions:

```typescript
// frontend/src/lib/game-config-persistence.ts

const STORAGE_KEY = 'draughts-last-game-config';

interface LastGameConfig {
  opponent: 'ai' | 'human';
  difficulty: AIDifficulty;
  playAs: 'white' | 'black' | 'random';
  timedMode: boolean;
  clockPreset: string;
}

function loadLastGameConfig(): LastGameConfig | null;
function saveLastGameConfig(config: LastGameConfig): void;
```

**Rationale:**

| Criterion | Separate utility (chosen) | Zustand persist middleware | Zustand separate store |
|-----------|--------------------------|--------------------------|----------------------|
| **Access pattern** | Load once on dialog open; save once on "Start Game." This is a simple read-on-mount / write-on-commit pattern — no reactive binding needed. | Persist middleware continuously syncs store state to storage on every change. Overkill for a value that only needs to persist at game start. Also persists all other store fields unless explicitly excluded. | Persist middleware on a separate store. Cleaner than extending the game store, but introduces a new Zustand store for what is essentially two functions. |
| **Separation from game state** | Config persistence is a *different concern* from game state persistence. The existing `game-persistence.ts` handles saving/loading in-progress game state (position, moves, clock). Config persistence (preferred setup options) is independent — a user's preferred difficulty persists even when no game is in progress. A separate utility makes this distinction explicit. | Config preferences become entangled with game state in the same store. Difficult to persist config independently of game phase, position, etc. | Clean separation, but the store would contain only `lastGameConfig` with no actions beyond load/save — a store with no behavior, which is just a glorified wrapper around `localStorage`. |
| **Guest vs. registered user handling** | Both use `localStorage`. The existing game persistence uses `sessionStorage` for guests and `localStorage` for registered users — but the FRD specifies that config preferences should persist across sessions for *all* users, including guests. A separate utility avoids confusion with the different storage scopes used by `game-persistence.ts`. | Zustand persist defaults to `localStorage`, which is correct for this use case. But the game store's persist middleware (if added) would need to be configured to only persist config fields, not ephemeral game state. | Same as Zustand persist — correct storage target, unnecessary complexity. |
| **Complexity** | ~20 lines of code. Two pure functions. No middleware, no store creation, no selector patterns. Trivially testable with `localStorage` mocking. | Requires understanding Zustand's persist middleware API: `partialize` (to select which fields to persist), `merge` (to handle partial state loading), `version` (for migrations). Non-trivial configuration for a simple use case. | Less complex than extending the game store's persist, but still more machinery than a utility module. |
| **Default fallback** | `loadLastGameConfig()` returns `null` when no saved config exists. The dialog applies `?? DEFAULT_SETUP_CONFIG` at the call site. Clear, explicit fallback logic. | Persist middleware handles defaults via the store's initial state. But this conflates "no saved config" with "store initialized with defaults" — indistinguishable states. | Same default handling as persist middleware. |
| **Storage key naming** | Uses `draughts-last-game-config` (hyphenated, consistent with existing keys like `draughts-in-progress-game` and `draughts-auth`). | Key is determined by persist middleware's `name` option. Consistent naming is possible but requires explicit configuration. | Same as persist middleware. |

**Data model alignment:**

The persisted `LastGameConfig` is intentionally separate from and smaller than the full `GameConfig` in the Zustand store. It persists only game-critical setup options, not cosmetic preferences (board theme, notation, animation speed). This avoids the fragile coupling of persisting the entire `GameConfig` — cosmetic preferences are managed by the settings panel and have their own persistence lifecycle.

The `playAs` field stores `'white' | 'black' | 'random'` — the user's *preference*, not the resolved `PlayerColor`. The resolution of `'random'` to a concrete `PlayerColor` happens in `startGame()`, not in persistence. This matches the FRD's requirement that "Random" persists as `"random"` (FRD §6.5).

**`GameConfig` interface extension:**

The `GameConfig` interface gains a `playAs: 'white' | 'black' | 'random'` field. The existing `playerColor: PlayerColor` field is retained as the *resolved* color — it is set to the concrete color at game start and used throughout the game engine. The relationship is:

- Before game start: `playAs` is the user's preference (from the dialog), `playerColor` is the default (White).
- At `startGame()`: if `playAs === 'random'`, `playerColor` is randomly assigned; otherwise, `playerColor = playAs`.
- During gameplay: `playerColor` is the source of truth for the player's color.

---

## Consequences

### Positive

- **Discoverability solved.** Every new game starts with a clear dialog showing all game-critical options. Users can no longer unknowingly play with default settings.
- **Quick start preserved.** The "Quick Start" button maintains the one-click experience for users who don't want to configure every game. Config is still saved on Quick Start for consistency.
- **Clean separation of concerns.** Game-critical setup options live in the modal dialog; cosmetic/display preferences remain in the settings panel. Each has a clear scope and purpose.
- **Accessible by default.** Using the native `<dialog>` element with `showModal()` provides focus trapping, backdrop, Escape-to-close, and screen reader announcement with minimal custom code, satisfying FRD AC #25–#28.
- **Testable architecture.** Composable sub-components can be unit-tested in isolation. The dialog's local state means tests don't need to configure global state for form behavior. The persistence utility is two pure functions that are trivially testable.
- **No new dependencies.** No UI library, no focus-trap library, no persistence library. Everything is built with React, native `<dialog>`, Tailwind, and `localStorage` — all already in the project.
- **Config persistence across sessions.** Both guests and registered users retain their preferred game settings across browser sessions, eliminating the "config resets on reload" pain point.
- **Minimal store pollution.** Dialog visibility and interim form state stay in local React state. The Zustand game store gains only the `playAs` field — no transient UI state leaks into global state.
- **Consistent patterns.** Dialog open/close via local `useState` matches the existing `showSettings` and `showResumePrompt` patterns in the Play page. Persistence via a utility module matches the existing `game-persistence.ts` pattern.

### Negative

- **Multiple overlays to coordinate.** The Play page now manages three overlay states: `showSettings`, `showSetupDialog`, and `showResumePrompt`. These must be mutually exclusive (resume prompt takes priority, then setup dialog, then settings panel). The coordination logic adds complexity to the Play page's state management. **Mitigation:** Add explicit guards: setup dialog is suppressed when `showResumePrompt` is true; resume prompt takes priority on mount. Consider extracting overlay coordination into a custom hook (`usePlayPageOverlays`) if the logic grows.
- **No reactive persistence.** The separate utility doesn't automatically sync with the store. If config is changed outside the dialog (edge case, not currently possible), the persisted value may drift from the store. **Mitigation:** Config is only committed through the dialog's "Start Game" action, which always saves. There is no other write path, so drift is structurally impossible.
- **Sub-component overhead.** Five sub-components for a relatively small dialog may feel over-engineered. Each file has boilerplate (imports, interface, export). **Mitigation:** The sub-components are small (30–60 lines), focused, and independently testable. The overhead is justified by improved testability and readability of the container component.
- **`playAs` adds a new field to `GameConfig`.** Existing code that reads `playerColor` is unaffected, but the new `playAs` field creates a subtle distinction between "preference" and "resolved value" that developers must understand. **Mitigation:** Clear JSDoc comments on both fields. `playAs` is only read by the setup dialog and `startGame()`. All other code uses `playerColor`.
- **Persistence utility is not reactive.** Unlike Zustand persist middleware, changes to `localStorage` from another tab won't be reflected in the dialog. **Mitigation:** Config persistence is a single-tab concern. The dialog loads config on open and saves on commit. Cross-tab sync is not a requirement (FRD does not mention it) and would add unnecessary complexity.

---

## Alternatives Considered

### Alternative 1 (Decision 1): Inline Panel

Replace the board area with a setup form when no game is active (phase `'not-started'`). The board only appears once a game starts.

**Rejected because:**
- Loses the board as visual context. The empty board behind a dialog provides spatial context ("this is where the game will happen"). An inline panel replaces it entirely.
- Competes with the `ResumePrompt` for screen real estate. Both would render in the board area, requiring layout arbitration that is simpler with overlays (stack order).
- Post-game flow is awkward: after a game ends, the board (showing the final position) would be replaced by the setup form when the user clicks "New Game." Users may want to review the final position while configuring the next game — the modal allows this.
- No modal semantics for accessibility. Screen readers don't announce an inline panel as a dialog, making it less clear that the user needs to make a selection before proceeding.

### Alternative 2 (Decision 1): Full Page Route (`/play/setup`)

Create a dedicated `/play/setup` route with a full-page setup form. Navigation to `/play` happens after configuration is confirmed.

**Rejected because:**
- Over-engineered for a 5-option form. The setup flow is a brief configuration step, not a complex multi-step wizard. A full page implies more content and complexity than exists.
- Introduces route management complexity: preventing direct access to `/play/setup` without intent, handling browser back-button (should it go to Home or to `/play`?), managing the URL when the dialog is cancelled.
- Breaks the mental model of "/play is where I play." The setup is a pre-game step *within* the play experience, not a separate destination.
- Next.js App Router would require a new `setup/page.tsx` file, potentially a layout change, and navigation guards — more infrastructure than the modal approach.

### Alternative 3 (Decision 2): Monolithic Component

Build a single `GameSetupDialog.tsx` component containing all option sections inline, without sub-components.

**Rejected because:**
- A ~250–300 line component with five distinct UI sections, conditional rendering blocks, and mixed layout/logic concerns is harder to navigate and maintain than a composed hierarchy.
- Testing requires rendering the entire dialog for every test case. A test verifying that "Expert shows a server badge" must mount the full dialog with all sections. With composable sub-components, this is a focused `DifficultySelector` test.
- Adding new options (e.g., a future Game Mode selector or a tournament integration toggle) requires modifying the monolithic component, increasing its already-large size. Composable architecture makes additions a new file plus one line in the container.
- The project has no precedent for monolithic form components — existing components are focused and composable (e.g., `GameBoard`, `GameStatus`, `GameControls` are separate components, not one large `GamePage` component).

### Alternative 4 (Decision 3): Zustand Store Extension

Add `showSetupDialog`, `setupDialogFormState`, and related actions to the `useGameStore`.

**Rejected because:**
- Pollutes the game store with transient UI state. The game store manages game lifecycle, position, moves, clock, and AI state — all domain-relevant. Dialog visibility and uncommitted form selections are UI concerns with no domain meaning.
- Inconsistent with existing patterns. `showSettings` (settings panel visibility) and `showResumePrompt` (resume prompt visibility) are already local `useState` in the Play page. Adding `showSetupDialog` to the store while leaving the others as local state creates an inconsistency.
- Requires explicit cleanup. If the dialog is dismissed by pressing Escape or clicking the backdrop, the store needs an action to reset interim form state. With local state, component unmounting handles cleanup automatically.
- Increases store complexity. The game store is already 1087 lines. Adding dialog-related fields and actions increases its surface area without adding domain value.

### Alternative 5 (Decision 3): URL-Based State (`?setup=true`)

Use a query parameter as the primary mechanism for dialog open/close state.

**Rejected because:**
- URL state is bookmarkable and shareable. A user bookmarking `/play?setup=true` would see the setup dialog on every visit, even when they want to resume a game or view the board.
- URL state survives page refresh. The dialog would re-open on refresh, which conflicts with the expected behavior (dialog should not re-open after being dismissed).
- Cannot represent interim form selections. The URL would encode open/close state, but the dialog still needs local or store state for form fields (opponent, difficulty, color, etc.). This creates a split state management approach — URL for visibility, local for form — that is harder to reason about than pure local state.
- The `?setup=true` param is still used as a one-time navigation signal from the Home page, but is consumed and removed on mount, not used as persistent state.

### Alternative 6 (Decision 4): Zustand Persist Middleware on Game Store

Add Zustand's `persist` middleware to the `useGameStore` to automatically persist game config fields.

**Rejected because:**
- The game store contains highly ephemeral state (board position, selected square, AI thinking flag, clock ticks) that must not be persisted alongside config preferences. Zustand's `partialize` option can filter fields, but this requires maintaining an explicit allowlist/blocklist that must be updated whenever new store fields are added — a maintenance burden and source of bugs.
- The persist middleware syncs on every state change. Config only needs to be saved when the user starts a game (not on every interim selection in the dialog). Continuous syncing is wasteful and could cause performance issues with frequent store updates (e.g., clock ticks writing to localStorage 10 times per second).
- Hydration mismatches: Zustand persist loads from `localStorage` asynchronously (or synchronously, depending on configuration), which can cause the store's initial state to change after the first render. This creates a flash of default values → persisted values on page load. The separate utility avoids this by loading config only when the dialog opens, not on store initialization.
- The access pattern is simple: load once, save once. Two functions totaling ~20 lines of code are simpler and more predictable than persist middleware configuration.

### Alternative 7 (Decision 4): Separate Zustand Store (`useSettingsStore`)

Create a new `useSettingsStore` with persist middleware dedicated to user preferences (game config + display settings).

**Rejected because:**
- Introduces a new Zustand store for what amounts to two functions (`load` and `save`). A store implies reactive state, selectors, and subscriptions — none of which are needed for config persistence. The dialog reads config once on open and writes once on close.
- Creates a question of where display preferences (board theme, animation speed) should live. If they move to `useSettingsStore`, the game store loses fields that are currently read by many components (`config.boardTheme`, `config.showLegalMoves`). If they stay in the game store, the new store only holds the `lastGameConfig` — a store containing a single object with no actions beyond load/save.
- Adds indirection: components need to know which store to read for which config field. Currently, all config is in `useGameStore.config`. Splitting it across two stores introduces confusion and increases import counts.
- The problem is simpler than a store can solve. A utility module with two functions is the right level of abstraction for "read a JSON blob from localStorage on demand."

---

## Related

- [Feature Spec: Game Setup Flow](../features/game-setup-flow.md) — FRD specifying the full game setup dialog requirements, acceptance criteria, and Dev Lead review
- [ADR-005: AI Difficulty Scaling Model](adr-005-difficulty-scaling.md) — establishes the four difficulty levels (Easy, Medium, Hard, Expert) that appear in the setup dialog
- [ADR-006: Enhanced Client-Side AI Architecture](adr-006-enhanced-client-ai.md) — Expert AI architecture; informs the "Requires server connection" badge on Expert difficulty
- Source: [frontend/src/app/play/page.tsx](../../frontend/src/app/play/page.tsx) — Play page to be modified with dialog trigger logic
- Source: [frontend/src/components/settings/SettingsPanel.tsx](../../frontend/src/components/settings/SettingsPanel.tsx) — Settings panel to be refactored (remove game-critical options)
- Source: [frontend/src/stores/game-store.ts](../../frontend/src/stores/game-store.ts) — Game store; `GameConfig` interface to gain `playAs` field
- Source: [frontend/src/lib/game-persistence.ts](../../frontend/src/lib/game-persistence.ts) — Existing game state persistence (separate concern from config persistence)
