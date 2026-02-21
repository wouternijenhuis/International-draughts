# ADR-018: Global Display Settings Architecture

## Status

Accepted

## Date

2026-02-21

## Context

The display-preferences settings button (gear icon) and `SettingsPanel` component are currently embedded exclusively in the `/play` page. The four display settings — `boardTheme`, `showNotation`, `showLegalMoves`, and `animationSpeed` — live inside `GameConfig` in the Zustand game store (`game-store.ts`), which has no `persist` middleware. This creates three problems:

1. **No global access.** Users on `/learn` (interactive board), `/tutorial` (static boards), or any other page cannot change display preferences without navigating to `/play`.
2. **No persistence.** Display preferences reset to defaults (`classic-wood`, notation off, legal moves on, `normal` speed) on every page load — there is no `localStorage` persistence.
3. **Tight coupling.** Display preferences are entangled with game-session state (`opponent`, `aiDifficulty`, `playerColor`, `timedMode`, `clockPreset`) inside `GameConfig`. The `SettingsPanel` directly imports `useGameStore()`, making it impossible to render outside `/play` without also depending on the game lifecycle store.

The [Global Settings Button FRD](../features/global-settings-button.md) requires the settings button to be visible on all 8 pages, settings to persist to `localStorage`, and changes to apply immediately to any visible board. The [Game Setup Dialog ADR (ADR-008)](adr-008-game-setup-dialog.md) has already separated game-critical config from display preferences conceptually — this ADR completes that separation at the implementation level.

### Current Architecture

- **`GameConfig` interface** ([game-store.ts](../../frontend/src/stores/game-store.ts#L63-L75)): Contains both session fields (`opponent`, `aiDifficulty`, `playerColor`, `timedMode`, `clockPreset`, `gameMode`, `confirmMoves`) and display fields (`boardTheme`, `showNotation`, `showLegalMoves`, `animationSpeed`).
- **`SettingsPanel`** ([SettingsPanel.tsx](../../frontend/src/components/settings/SettingsPanel.tsx)): Renders the four display preferences. Reads and writes via `useGameStore()` — calls `setConfig()`, `setBoardTheme()`, and `toggleNotation()`.
- **`GameBoard`** ([GameBoard.tsx](../../frontend/src/components/game/GameBoard.tsx)): Reads `config.boardTheme`, `config.showNotation`, `config.showLegalMoves`, `config.animationSpeed` from `useGameStore()`.
- **`/play` page** ([play/page.tsx](../../frontend/src/app/play/page.tsx)): Manages `showSettings` via local `useState`. Renders `<SettingsPanel />` conditionally in the sidebar. Has a gear icon in the header that toggles `showSettings`.
- **Root layout** ([layout.tsx](../../frontend/src/app/layout.tsx)): Server Component. Renders `<OfflineBanner />`, `<InstallPrompt />`, and `<ServiceWorkerRegistration />` globally.
- **Auth store** ([auth-store.ts](../../frontend/src/stores/auth-store.ts)): Uses Zustand `persist` middleware with key `draughts-auth` and `partialize` — the established pattern for persisted stores in this codebase.

### Forces

- The game store is 1,087 lines and manages the full game lifecycle. Adding `persist` middleware to it would require careful `partialize` configuration to avoid persisting ephemeral state (board position, selected square, AI thinking flag, clock ticks).
- The `serializeGameState()` function currently includes display settings in saved games. Extracting them must not break deserialization of existing saved games.
- SSR hydration: the root layout is a Server Component with no access to `localStorage`. Client-side stores loading persisted values after hydration will cause a brief flash of default → persisted values.
- Existing overlays (`OfflineBanner`, `InstallPrompt`, `PauseOverlay`, `ResumePrompt`, `AvatarSelector`) all use `z-50`. A new settings drawer must layer correctly relative to these.
- 162 frontend tests must continue passing. Changes to `useGameStore` selectors used by `GameBoard` and `SettingsPanel` are high-risk for regressions.

---

## Decision

### Decision 1: Settings State Management — Separate Zustand Store with `persist`

**Create a new `frontend/src/stores/settings-store.ts` with its own Zustand store using `persist` middleware. Extract the four display preferences out of the game store.**

#### Store Interface

```typescript
// frontend/src/stores/settings-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Display preferences managed globally and persisted to localStorage. */
export interface DisplaySettings {
  readonly boardTheme: 'classic-wood' | 'dark' | 'ocean' | 'tournament-green';
  readonly showNotation: boolean;
  readonly showLegalMoves: boolean;
  readonly animationSpeed: 'instant' | 'fast' | 'normal' | 'slow';
}

interface SettingsState extends DisplaySettings {
  /** Whether the global settings drawer is open. */
  isSettingsOpen: boolean;

  /** Update one or more display settings. */
  setDisplaySetting: (updates: Partial<DisplaySettings>) => void;
  /** Toggle notation visibility. */
  toggleNotation: () => void;
  /** Toggle legal move highlights. */
  toggleLegalMoves: () => void;
  /** Open the settings drawer. */
  openSettings: () => void;
  /** Close the settings drawer. */
  closeSettings: () => void;
  /** Toggle the settings drawer. */
  toggleSettings: () => void;
}

const DISPLAY_DEFAULTS: DisplaySettings = {
  boardTheme: 'classic-wood',
  showNotation: false,
  showLegalMoves: true,
  animationSpeed: 'normal',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DISPLAY_DEFAULTS,
      isSettingsOpen: false,

      setDisplaySetting: (updates) => set((state) => ({ ...state, ...updates })),
      toggleNotation: () => set((state) => ({ showNotation: !state.showNotation })),
      toggleLegalMoves: () => set((state) => ({ showLegalMoves: !state.showLegalMoves })),
      openSettings: () => set({ isSettingsOpen: true }),
      closeSettings: () => set({ isSettingsOpen: false }),
      toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
    }),
    {
      name: 'draughts-display-settings',
      partialize: (state) => ({
        boardTheme: state.boardTheme,
        showNotation: state.showNotation,
        showLegalMoves: state.showLegalMoves,
        animationSpeed: state.animationSpeed,
      }),
    }
  )
);
```

#### Key Design Choices

- **`partialize` excludes `isSettingsOpen`**: The drawer open/close state is transient UI state — it must not persist across page reloads (the drawer should always start closed).
- **`localStorage` key `draughts-display-settings`**: Consistent with existing keys (`draughts-auth`, `draughts-last-game-config`, `draughts-in-progress-game`).
- **Immediate persistence**: Zustand `persist` middleware writes to `localStorage` on every state change. Unlike the game config persistence (which uses a utility with explicit save), display settings benefit from automatic sync since users expect immediate persistence.
- **No `version` field initially**: The four settings are stable. If the schema evolves, add Zustand persist's `version` + `migrate` options at that point.

#### Migration of `GameConfig`

`GameConfig` retains `showNotation`, `boardTheme`, `showLegalMoves`, and `animationSpeed` fields for backward compatibility with serialized saved games, but the **authoritative source** for display preferences becomes `useSettingsStore`. The fields in `GameConfig` become write-only (set during `serializeGameState()` for save compatibility) and are ignored on `resumeGame()` — global display preferences take precedence (per FRD FR-14).

#### Rationale

| Criterion | Separate store (chosen) | `persist` on game store | Utility functions |
|-----------|------------------------|------------------------|-------------------|
| **Separation of concerns** | Display prefs are a distinct domain from game lifecycle. Separate store makes this explicit. | Mixes display persistence with game state. `partialize` must be maintained as an allowlist — any new game store field must be explicitly excluded. | Same separation, but no reactive binding — consumers must manually reload. |
| **Reactive updates** | Components subscribe to `useSettingsStore` selectors. Changing theme in the drawer instantly re-renders all boards on the current page. | Same reactivity (Zustand), but every display-setting consumer also subscribes to the game store, increasing unnecessary re-renders. | No automatic re-renders. Would require a custom event system or `useSyncExternalStore` wrapper — reinventing Zustand. |
| **Persistence scope** | Only the 4 display fields are persisted. No risk of accidentally persisting board position or clock state. | Must carefully configure `partialize` to exclude ~30 ephemeral fields. A new field added to the store without updating `partialize` could be accidentally persisted. | Manual control — correct but no middleware safety net. |
| **Existing pattern** | Mirrors `auth-store.ts`: separate store, `persist` middleware, `partialize`. Consistent codebase pattern. | Game store is already 1,087 lines. Adding persist middleware increases complexity of the largest store. | Different pattern from auth store — inconsistent. |
| **Impact on tests** | New store is isolated. `SettingsPanel` tests mock `useSettingsStore` instead of `useGameStore`. GameBoard tests are updated to mock both stores. | All existing tests that mock `useGameStore` must now handle persist middleware. | Minimal test impact, but no reactive testing possible. |

### Decision 2: Global UI Placement — Fixed Floating Button + Slide-Over Drawer in Root Layout

**Add a `<SettingsButton />` and `<SettingsDrawer />` to the root layout (`layout.tsx`) as Client Components. The button is a fixed-position floating gear icon in the top-right corner. Clicking it opens a slide-over drawer from the right containing the `SettingsPanel`.**

#### Component Structure

```
frontend/src/app/layout.tsx                          ← adds <GlobalSettings />
frontend/src/components/settings/
├── GlobalSettings.tsx                               ← Client Component wrapper (button + drawer)
├── SettingsButton.tsx                               ← Fixed floating gear icon
├── SettingsDrawer.tsx                               ← Slide-over drawer with backdrop
├── SettingsPanel.tsx                                ← Existing component (refactored to use settingsStore)
├── index.ts                                         ← Barrel export
└── __tests__/
    ├── GlobalSettings.test.tsx
    ├── SettingsButton.test.tsx
    ├── SettingsDrawer.test.tsx
    └── SettingsPanel.test.tsx                       ← Updated
```

#### Layout Integration

```tsx
// layout.tsx (Server Component — unchanged except for the new import)
import { GlobalSettings } from '@/components/settings/GlobalSettings';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="min-h-screen bg-surface text-slate-900 dark:text-slate-100 antialiased">
        <OfflineBanner />
        <a href="#main-content" className="skip-to-content">Skip to content</a>
        <main id="main-content" role="main">
          {children}
        </main>
        <GlobalSettings />   {/* ← New: Client Component */}
        <InstallPrompt />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
```

`<GlobalSettings />` is a `'use client'` component that renders `<SettingsButton />` and conditionally renders `<SettingsDrawer />` based on `useSettingsStore().isSettingsOpen`.

#### Settings Button Spec

- **Position**: `fixed top-4 right-4` (16px inset from viewport edges).
- **Size**: `w-11 h-11` (44×44px) — meets WCAG 2.5.5 minimum target size.
- **Appearance**: Semi-transparent background (`bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm`) with a rounded-full shape. A gear/cog SVG icon (`w-6 h-6`). Hover: `bg-white dark:bg-gray-800` (fully opaque). Focus: `ring-2 ring-blue-500 ring-offset-2`.
- **z-index**: `z-40` — above page content, below all overlays.
- **Aria**: `aria-label="Display settings"`, `aria-expanded` bound to `isSettingsOpen`.
- **Lazy-loaded drawer**: The `SettingsDrawer` component (and `SettingsPanel` inside it) should be dynamically imported via `next/dynamic` to avoid adding to initial bundle of every page (FRD NFR-2).

#### Settings Drawer Spec

- **Pattern**: Right-side slide-over drawer.
- **Width**: `w-80` (320px) on desktop; `w-full` on mobile (`max-sm:w-full`).
- **Height**: Full viewport height (`h-screen`).
- **Backdrop**: `fixed inset-0 bg-black/50` — clicking dismisses.
- **Entry animation**: `translate-x-full → translate-x-0`, 200ms ease-out.
- **Exit animation**: `translate-x-0 → translate-x-full`, 150ms ease-in.
- **Header**: "Display Settings" title + close (×) button.
- **Body**: Renders `<SettingsPanel />` with internal scroll if content overflows.
- **Focus trap**: Implement via `useEffect` that traps Tab/Shift+Tab within the drawer while open.
- **Escape**: Close on Escape keydown.
- **Route change close**: A `useEffect` watching `usePathname()` calls `closeSettings()` on route changes.
- **z-index**: `z-[60]` (see z-index strategy below).
- **ARIA**: `role="dialog"`, `aria-modal="true"`, `aria-label="Display settings"`.

#### Rationale

| Criterion | Floating button + drawer (chosen) | Shared header component |
|-----------|----------------------------------|------------------------|
| **Invasiveness** | Add 2 lines to `layout.tsx`. No changes to any page's layout structure. | Requires adding `<AppHeader />` to every page or to `layout.tsx`, changing how pages render their headers. `/play` already has a custom header with back button, game status, etc. |
| **Position consistency** | Fixed position is viewport-relative — always top-right regardless of scroll or page layout. | Header position depends on page structure. Some pages may not have headers. |
| **Mobile UX** | Floating button is a well-established mobile pattern (FAB). Drawer is the expected mobile settings pattern. | Header on mobile takes vertical space on every page. |
| **Conflict with `/play`** | The existing `/play` header gear icon is simply removed. The floating button replaces it. | Would need to reconcile `/play`'s existing header with the shared header. |

### Decision 3: `/play` Page Conflict Resolution — Remove Local Settings

**Remove the local gear icon from the `/play` page header, remove the inline `<SettingsPanel>` from the sidebar, and remove the `showSettings` `useState`. The global floating button becomes the sole entry point for display settings on all pages, including `/play`.**

#### Specific Removals from `/play`

1. **Delete** the gear icon `<button>` in the header (the `onClick={() => setShowSettings(...)}` button).
2. **Delete** `const [showSettings, setShowSettings] = useState(false);`.
3. **Delete** `{showSettings && <SettingsPanel />}` from the sidebar `<aside>`.
4. **Delete** the `import { SettingsPanel }` from `@/components/settings/SettingsPanel` (it's now rendered globally via `<GlobalSettings />`).

#### Rationale

| Criterion | Remove local settings (chosen) | Keep both buttons |
|-----------|-------------------------------|-------------------|
| **UX clarity** | One gear icon → one settings panel. No user confusion about which button to press. | Two gear icons on `/play` — floating button (top-right) and header button. Users may not realize they do the same thing, or may expect them to do different things. |
| **Implementation complexity** | Subtract code from `/play`. Net reduction in complexity. | Must wire both buttons to the same `isSettingsOpen` state. Must visually distinguish or hide one on certain screen sizes. More code, more edge cases. |
| **Consistency** | Settings work identically on every page. | `/play` is a special case with two entry points. |
| **Sidebar space** | Sidebar gains space for move history (currently shared with collapsible settings panel). | Sidebar retains the collapsible panel, reducing space for moves on small screens. |

---

## Z-Index Strategy

A consistent z-index layering strategy is established for the settings feature and existing overlays:

| Layer | Element | z-index | Notes |
|-------|---------|---------|-------|
| **Page content** | Board, controls, text | `z-0` (default) | |
| **Board overlays** | Selected square ring, notation labels | `z-10` – `z-20` | Existing, within board stacking context |
| **Animated pieces** | Drag ghost, move animation | `z-30` | Existing `z-30` on `AnimatedPieceOverlay` |
| **Settings button** | `<SettingsButton />` | `z-40` | Above page content, below all overlays |
| **Existing overlays** | `OfflineBanner`, `InstallPrompt`, `PauseOverlay`, `ResumePrompt`, `AvatarSelector` | `z-50` | Unchanged |
| **Settings drawer** | Backdrop + drawer panel | `z-[60]` | Above all existing overlays so the drawer is always accessible, even when other overlays are showing |

**Rationale for `z-[60]` on the drawer**: The settings drawer must be openable even when `PauseOverlay` or `OfflineBanner` is visible (e.g., a user may want to change the theme while the game is paused). Setting it above `z-50` ensures this. The only element that should conceptually override the settings drawer is a future critical system-level modal (e.g., "tab about to close") — these would use `z-[70]+`.

---

## SSR Hydration Strategy

The root layout is a Server Component. On the server, `localStorage` is unavailable, so the settings store initializes with defaults (`classic-wood`, notation off, etc.). On the client, Zustand `persist` middleware rehydrates from `localStorage`, which may cause a brief flash of default → persisted values.

### Approach: Synchronous Theme Script + Graceful Transition

1. **Board theme (visual flash)**: Add a small inline `<script>` in `<head>` (via `layout.tsx`) that reads `draughts-display-settings` from `localStorage` synchronously and sets a `data-board-theme` attribute on `<html>`. Board CSS variables can key off this attribute, so the correct theme colors are applied before React hydrates. This eliminates the most visually jarring flash (background color change on board squares).

   ```tsx
   // In layout.tsx <head>
   <script
     dangerouslySetInnerHTML={{
       __html: `
         try {
           const s = JSON.parse(localStorage.getItem('draughts-display-settings') || '{}');
           if (s.state?.boardTheme) document.documentElement.dataset.boardTheme = s.state.boardTheme;
         } catch {}
       `,
     }}
   />
   ```

   Note: Zustand persist wraps the state in `{ state: {...}, version: 0 }`, so the script reads `s.state.boardTheme`.

2. **Other settings (notation, legal moves, animation speed)**: These are React-state-driven and cannot be applied before hydration. Accept a brief flash (one frame) as the store rehydrates. This is visually minimal because:
   - Notation overlay is transparent text — appearance/disappearance in one frame is imperceptible.
   - Legal move dots only appear during active interaction (piece selected) — not visible on initial load.
   - Animation speed has no visual representation until a move is made.

3. **Settings button**: Rendered as a Client Component. It will mount after hydration. Use a `suppressHydrationWarning` or render-after-mount pattern if needed to avoid mismatches, though since the button renders the same regardless of persisted state, no mismatch is expected.

---

## Consequences

### Positive

- **Global access**: Display settings are accessible from every page via the floating gear button — fulfilling the primary user need.
- **Persistence**: Settings survive page reloads and navigation via `localStorage`, solving the "settings reset" pain point.
- **Clean separation**: Display preferences (`settings-store.ts`) are fully decoupled from game session state (`game-store.ts`). Each store has a single responsibility.
- **Pattern consistency**: The new store follows the established `auth-store.ts` pattern — Zustand + `persist` + `partialize`. Developers familiar with one store can immediately understand the other.
- **Reduced `/play` complexity**: The play page loses the `showSettings` state, the conditional `SettingsPanel` render, and the header gear icon. Net reduction in code.
- **Sidebar space**: The `/play` sidebar gains ~200px of vertical space previously occupied by the collapsible settings panel, giving more room for move history.
- **Immediate reactivity**: All boards on the current page re-render instantly when a setting changes, because they subscribe to `useSettingsStore` selectors.
- **Lazy loading**: The drawer is dynamically imported, so pages that never open settings pay no bundle cost.
- **Accessible**: The drawer uses `role="dialog"`, focus trapping, Escape-to-close, and screen reader labels.

### Negative

- **Two stores for board rendering**: `GameBoard` now reads from both `useGameStore` (position, selected square, game logic) and `useSettingsStore` (theme, notation, legal moves, animation). This is a mild increase in coupling at the component level. **Mitigation:** Create a `useDisplaySettings()` convenience hook that reads the four display values from `useSettingsStore`, keeping the import surface minimal.
- **Backward compatibility overhead**: `GameConfig` retains display fields for serialization compatibility. This creates a period where the same data exists in two places (settings store as source of truth, game config as serialized artifact). **Mitigation:** Document clearly which is authoritative. Remove display fields from `GameConfig` in a future major version once saved-game migration is implemented.
- **Test updates**: All tests that assert on display settings via `useGameStore` must be updated to mock/use `useSettingsStore` instead. Estimated ~15-20 test files affected. **Mitigation:** This is a one-time migration cost with clear, mechanical changes.
- **SSR theme flash for non-theme settings**: Notation and legal-move settings may flash briefly on hydration. **Mitigation:** Visually imperceptible as documented above.
- **Z-index custom value**: `z-[60]` breaks out of Tailwind's default scale. **Mitigation:** Document in this ADR and consider extending `tailwind.config.ts` with a `60` key in the `zIndex` theme if more custom layers are needed in the future.

### Breaking Changes

- `SettingsPanel` will import `useSettingsStore` instead of `useGameStore`. Any code that renders `<SettingsPanel />` outside the existing `/play` context (none currently) benefits from this change.
- `GameBoard` will read display settings from `useSettingsStore`. The `/learn` page's `<GameBoard />` will automatically pick up persisted settings.
- The `/play` page header loses the gear icon. Users must use the floating button instead.

---

## Implementation Notes

### File Changes Summary

| File | Action | Details |
|------|--------|---------|
| `frontend/src/stores/settings-store.ts` | **Create** | New Zustand store with persist middleware (see interface above) |
| `frontend/src/stores/settings-store.test.ts` | **Create** | Unit tests for store actions and persistence |
| `frontend/src/components/settings/GlobalSettings.tsx` | **Create** | `'use client'` wrapper: renders `<SettingsButton />` + lazy `<SettingsDrawer />` |
| `frontend/src/components/settings/SettingsButton.tsx` | **Create** | Fixed floating gear button, reads `isSettingsOpen` from settings store |
| `frontend/src/components/settings/SettingsDrawer.tsx` | **Create** | Slide-over drawer with backdrop, focus trap, route-change close |
| `frontend/src/components/settings/SettingsPanel.tsx` | **Modify** | Change imports from `useGameStore` → `useSettingsStore` |
| `frontend/src/components/settings/index.ts` | **Modify** | Add barrel exports for new components |
| `frontend/src/components/game/GameBoard.tsx` | **Modify** | Read display settings from `useSettingsStore` instead of `useGameStore().config` |
| `frontend/src/app/layout.tsx` | **Modify** | Add `<GlobalSettings />` and the synchronous theme `<script>` |
| `frontend/src/app/play/page.tsx` | **Modify** | Remove `showSettings` state, gear icon button, and inline `<SettingsPanel />` |
| `frontend/src/stores/game-store.ts` | **Modify** | Keep display fields in `GameConfig` for serialization; `resumeGame()` ignores display fields from saved state |
| `frontend/src/hooks/useDisplaySettings.ts` | **Create** | Convenience hook: `{ boardTheme, showNotation, showLegalMoves, animationSpeed }` from settings store |
| Test files (~15-20) | **Modify** | Update mocks from `useGameStore` to `useSettingsStore` for display-related assertions |

### Migration of `SettingsPanel` Imports

Before:
```tsx
import { useGameStore } from '@/stores/game-store';
const { config, setConfig, setBoardTheme, toggleNotation } = useGameStore();
```

After:
```tsx
import { useSettingsStore } from '@/stores/settings-store';
const { boardTheme, showNotation, showLegalMoves, animationSpeed,
        setDisplaySetting, toggleNotation } = useSettingsStore();
```

### Migration of `GameBoard` Display Reads

Before:
```tsx
const { config, ... } = useGameStore();
// later:
showNotation={config.showNotation}
theme={config.boardTheme}
legalMoveSquares={config.showLegalMoves ? legalMoveSquares : []}
config.animationSpeed as AnimationSpeed
```

After:
```tsx
import { useSettingsStore } from '@/stores/settings-store';
const { boardTheme, showNotation, showLegalMoves, animationSpeed } = useSettingsStore();
// later:
showNotation={showNotation}
theme={boardTheme}
legalMoveSquares={showLegalMoves ? legalMoveSquares : []}
animationSpeed as AnimationSpeed
```

### `resumeGame()` Change

In `game-store.ts`, the `resumeGame()` function currently restores display settings from the saved game. After this change, it must **ignore** display fields from the saved state and let the global settings store be authoritative:

```typescript
resumeGame: (saved) => {
  const deserialized = deserializeGameState(saved);
  set({
    ...deserialized,
    config: {
      ...get().config,
      // Restore session fields from saved game
      gameMode: deserialized.config?.gameMode ?? get().config.gameMode,
      opponent: deserialized.config?.opponent ?? get().config.opponent,
      aiDifficulty: deserialized.config?.aiDifficulty ?? get().config.aiDifficulty,
      playerColor: deserialized.config?.playerColor ?? get().config.playerColor,
      timedMode: deserialized.config?.timedMode ?? get().config.timedMode,
      clockPreset: deserialized.config?.clockPreset ?? get().config.clockPreset,
      // Display fields: keep current values (from settings store), do NOT restore from saved game
    },
    phase: 'in-progress',
  });
};
```

### Tailwind Config Extension (Optional)

If the team prefers named z-index values over arbitrary `z-[60]`:

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      zIndex: {
        '60': '60',
      },
    },
  },
};
```

### Testing Strategy

1. **`settings-store.test.ts`**: Test all actions, persistence round-trip (mock `localStorage`), `partialize` excludes `isSettingsOpen`, default values.
2. **`SettingsButton.test.tsx`**: Renders, click opens drawer, aria attributes.
3. **`SettingsDrawer.test.tsx`**: Renders when open, closes on Escape, closes on backdrop click, focus trap, route change close.
4. **`SettingsPanel.test.tsx`**: Update existing 8 tests to mock `useSettingsStore` instead of `useGameStore`.
5. **`GameBoard.test.tsx`**: Verify display settings are read from `useSettingsStore`.
6. **`play/page.test.tsx`**: Verify gear icon and inline settings panel are removed; global button handles settings.

---

## Alternatives Considered

### Alternative A: Add `persist` to the Existing Game Store

Add Zustand `persist` middleware to `useGameStore` with `partialize` to persist only the four display fields.

**Rejected because:**
- The game store has ~30 ephemeral fields (position, selected square, AI thinking, clock state, move history, etc.) that must be excluded. The `partialize` allowlist would be fragile — any new field added without updating `partialize` risks accidental persistence.
- Persist middleware fires `onRehydrateStorage` on every page load, which would attempt to merge display preferences into the game store even on pages that don't use the game store — unnecessary overhead.
- Maintains the coupling between display preferences and game session state. The `SettingsPanel` would still depend on `useGameStore`, preventing it from being rendered outside of a "game context."
- Clock tick updates (10/sec during timed games) would trigger persist middleware's subscription check on every tick. Even with `partialize`, the middleware runs its comparison logic on each state change.

### Alternative B: Shared Header Component with Settings Button

Create an `<AppHeader />` component with navigation, title, and the gear icon. Add it to `layout.tsx` or every page.

**Rejected because:**
- Every page currently manages its own header. `/play` has a back button + game status; `/learn` has a progress indicator; `/tutorial` has step navigation. A shared header would either be too generic (missing page-specific elements) or too complex (accepting page-specific slots/children).
- Adding a header to pages that don't currently have one (e.g., `/login`, `/register`) changes their layout significantly — a much larger scope than the settings feature requires.
- A fixed floating button achieves the same result (always-visible settings access) with zero changes to existing page layouts.

### Alternative C: Keep `/play` Settings + Wire to Global Store

Keep the gear icon in the `/play` header and the inline `SettingsPanel` in the sidebar, but wire them to the global `isSettingsOpen` state.

**Rejected because:**
- Two gear icons visible on `/play` (header + floating) creates UX confusion.
- The inline panel and the drawer would be two rendering contexts for the same component, requiring coordination to prevent both from being visible simultaneously.
- The inline panel in the sidebar takes space from move history on smaller screens.
- More code to maintain (keep local wiring + add global wiring) vs. simply removing the local implementation.

---

## Related

- [Feature Spec: Global Settings Button](../features/global-settings-button.md) — FRD specifying the full requirements
- [ADR-008: Game Setup Dialog](adr-008-game-setup-dialog.md) — Separates game-critical setup options from display preferences (complementary decision)
- Source: [frontend/src/stores/game-store.ts](../../frontend/src/stores/game-store.ts) — Game store to be modified
- Source: [frontend/src/stores/auth-store.ts](../../frontend/src/stores/auth-store.ts) — Auth store (pattern reference for Zustand persist)
- Source: [frontend/src/components/settings/SettingsPanel.tsx](../../frontend/src/components/settings/SettingsPanel.tsx) — Settings panel to be refactored
- Source: [frontend/src/components/game/GameBoard.tsx](../../frontend/src/components/game/GameBoard.tsx) — Board component to read from settings store
- Source: [frontend/src/app/layout.tsx](../../frontend/src/app/layout.tsx) — Root layout to add global settings
- Source: [frontend/src/app/play/page.tsx](../../frontend/src/app/play/page.tsx) — Play page to remove local settings
