# Feature: Global Settings Button

**Feature ID:** `global-settings-button`  
**PRD Version:** 1.0  
**Last Updated:** 2026-02-21  
**Status:** Draft  
**Related Features:** `settings-customization`, `ui-board-experience`

---

## 1. Overview

The display-preferences settings button (gear icon) is currently hardcoded exclusively within the `/play` page. Users on any other page — including `/learn`, which has an interactive board — have no way to access display settings such as board theme, notation visibility, legal move indicators, or animation speed. This feature makes the settings button globally accessible from every page in the application and ensures that display preferences persist across page navigations and browser reloads.

---

## 2. User Personas

| Persona | Description | Pain Point |
|---------|-------------|------------|
| **Learner** | A new player using the `/learn` tutorial to understand draughts | Cannot change board theme or toggle notation while learning; stuck with defaults |
| **Casual Player** | Plays games on `/play`, browses `/tutorial` and `/profile` between sessions | Settings chosen during a game are lost when navigating away or reloading |
| **Power User** | Experienced player who customizes every visual detail | Must navigate to `/play` just to change a preference, then navigate back |
| **Accessibility-focused User** | Relies on high-contrast themes or notation for orientation | Cannot enable accessibility-friendly settings from most pages |

---

## 3. User Stories

| ID | Story | Priority |
|----|-------|----------|
| US-1 | As a user, I want a settings button visible on every page so I can change display preferences without navigating to `/play`. | P0 |
| US-2 | As a user, I want the settings panel to open as an overlay/drawer so it doesn't disrupt the current page content. | P0 |
| US-3 | As a user, I want my display preferences to persist across page navigations and browser reloads so I don't have to reconfigure every time. | P0 |
| US-4 | As a learner on `/learn`, I want to toggle board notation and legal move highlights while following the tutorial. | P0 |
| US-5 | As a user, I want to close the settings panel by clicking outside it, pressing Escape, or clicking a close button. | P1 |
| US-6 | As a user, I want settings changes to take effect immediately on the current page without a reload. | P0 |
| US-7 | As a keyboard-only user, I want to open and close the settings panel and navigate its controls entirely via keyboard. | P1 |
| US-8 | As a user on `/tutorial`, I want to change the board theme so the static board visualizations match my preferred appearance. | P1 |
| US-9 | As a registered user, I want my display preferences to sync to the backend so they follow me across devices. | P2 (future) |

---

## 4. Requirements

### 4.1 Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | A settings button (gear icon) must be rendered on every page of the application. | P0 |
| FR-2 | The settings button must open the existing `SettingsPanel` component in an overlay/drawer. | P0 |
| FR-3 | The settings button must be positioned consistently across all pages (fixed position, top-right area). | P0 |
| FR-4 | The `SettingsPanel` must be decoupled from the `/play` page's local `useState` and managed at a global level. | P0 |
| FR-5 | Display preferences (`boardTheme`, `showNotation`, `showLegalMoves`, `animationSpeed`) must be persisted to `localStorage`. | P0 |
| FR-6 | Persisted preferences must be loaded and applied before the first meaningful render (no flash of default settings). | P0 |
| FR-7 | The overlay must include a semi-transparent backdrop that dismisses the panel on click. | P1 |
| FR-8 | Pressing the Escape key must close the settings panel. | P1 |
| FR-9 | The `/play` page must continue to work as before — the existing inline settings toggle on `/play` may be retained or replaced by the global button. | P0 |
| FR-10 | Focus must be trapped inside the settings panel while it is open (modal focus trap). | P1 |
| FR-11 | The settings panel must include a visible close button (×). | P1 |

### 4.2 Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-1 | The global settings button and overlay must not increase Largest Contentful Paint (LCP) by more than 50ms. |
| NFR-2 | The `SettingsPanel` component should be lazy-loaded (dynamic import) to avoid adding to the initial bundle of every page. |
| NFR-3 | The settings overlay must meet WCAG 2.1 AA contrast and interaction requirements. |
| NFR-4 | The settings button must be visible and functional on viewports from 320px to 2560px wide. |
| NFR-5 | All new components must have ≥85% test coverage (consistent with shared engine threshold). |

---

## 5. Acceptance Criteria

| AC | Criterion | Verification |
|----|-----------|--------------|
| AC-1 | A gear icon button is visible on `/`, `/play`, `/learn`, `/tutorial`, `/profile`, `/login`, `/register`, and `/offline`. | Manual / E2E test |
| AC-2 | Clicking the gear icon opens the `SettingsPanel` in a slide-over drawer or modal overlay. | Manual / E2E test |
| AC-3 | Clicking outside the panel, pressing Escape, or clicking the close (×) button closes the panel. | Unit test + E2E test |
| AC-4 | Changing the board theme in the settings panel immediately updates any visible board on the current page. | Manual / E2E test |
| AC-5 | Toggling "Show Notation" immediately shows/hides notation on any visible board. | Manual test |
| AC-6 | Toggling "Show Legal Moves" immediately affects legal-move highlights during gameplay or tutorial. | Manual test |
| AC-7 | Changing "Animation Speed" immediately affects the next piece animation. | Manual test |
| AC-8 | After changing settings and reloading the browser, the previously chosen settings are restored. | Unit test (localStorage mock) |
| AC-9 | After changing settings on `/learn` and navigating to `/play`, settings carry over. | E2E test |
| AC-10 | On `/play`, the existing game flow is unaffected — opening global settings does not pause, reset, or interfere with an active game. | Manual / E2E test |
| AC-11 | The settings button and panel are fully operable via keyboard (Tab, Enter, Escape). | Manual / accessibility audit |
| AC-12 | Screen readers announce the button as "Display settings" or equivalent, and the panel as a dialog. | Accessibility audit |
| AC-13 | The settings button does not overlap with or obscure page-specific headers or navigation elements on any page. | Manual test (all pages, mobile + desktop) |
| AC-14 | ESLint and TypeScript checks pass with zero errors and zero warnings. | CI |
| AC-15 | All new and modified components have passing unit tests. | CI (Vitest) |

---

## 6. Pages Affected

| Page | Route | Has Board? | Current Settings Access | Required Change |
|------|-------|-----------|------------------------|-----------------|
| Home | `/` | No | None | Add global settings button |
| Play | `/play` | Yes | Local `useState` toggle + inline `SettingsPanel` | Replace local toggle with global mechanism; remove duplicated state |
| Learn | `/learn` | Yes (interactive) | None | Add global settings button (highest-impact page) |
| Tutorial | `/tutorial` | Yes (static visualizations) | None | Add global settings button |
| Profile | `/profile` | No | None | Add global settings button |
| Login | `/login` | No | None | Add global settings button |
| Register | `/register` | No | None | Add global settings button |
| Offline | `/offline` | No | None | Add global settings button |

---

## 7. Settings Covered

The global settings button controls **display preferences** only. These are the four settings surfaced by the existing `SettingsPanel` component:

| Setting | Type | Options | Default | Current Store Path |
|---------|------|---------|---------|-------------------|
| Board Theme | Selection (radio-style) | `classic-wood`, `dark`, `ocean`, `tournament-green` | `classic-wood` | `gameStore.config.boardTheme` |
| Show Notation | Toggle (boolean) | On / Off | Off | `gameStore.config.showNotation` |
| Show Legal Moves | Toggle (boolean) | On / Off | On | `gameStore.config.showLegalMoves` |
| Animation Speed | Selection (radio-style) | `instant`, `fast`, `normal`, `slow` | `normal` | `gameStore.config.animationSpeed` |

> **Note:** These four display settings are currently embedded in the `GameConfig` interface within `game-store.ts`. The architectural decision of whether to extract them into a separate dedicated Zustand store (e.g., `display-settings-store.ts`) or keep them in the game store with added persistence is deferred to the architect. Either approach must satisfy the persistence and global-access requirements above.

---

## 8. UX Requirements

### 8.1 Settings Button

- **Icon:** Gear/cog SVG icon (reuse the existing icon from `/play` page header).
- **Position:** Fixed position, top-right corner of the viewport. Exact offset: `top: 16px; right: 16px` (adjustable by design).
- **Size:** 40×40px touch target (meets WCAG minimum of 44×44px with padding).
- **Appearance:** Semi-transparent background circle that becomes opaque on hover. Adapts to light/dark mode.
- **Z-index:** Above page content but below the settings overlay backdrop.

### 8.2 Settings Overlay / Drawer

- **Pattern:** Right-side slide-over drawer (preferred) or centered modal. The drawer pattern is preferred because it doesn't obscure the board on desktop layouts.
- **Width:** 320px on desktop; full-width on mobile (≤640px viewport).
- **Height:** Full viewport height (drawer) or auto-sized with max-height and scroll (modal).
- **Backdrop:** Semi-transparent dark overlay (`bg-black/50`) covering the rest of the viewport.
- **Entry animation:** Slide in from the right (200ms ease-out).
- **Exit animation:** Slide out to the right (150ms ease-in).
- **Content:** Renders the existing `SettingsPanel` component inside the drawer body.
- **Header:** "Display Settings" title + close (×) button.
- **Scroll:** If content exceeds viewport height, the drawer body scrolls internally.
- **Focus trap:** While open, Tab/Shift+Tab cycles only through controls inside the drawer.

### 8.3 Interaction States

| Trigger | Action |
|---------|--------|
| Click gear icon | Open drawer |
| Click × button | Close drawer |
| Click backdrop | Close drawer |
| Press Escape | Close drawer |
| Change any setting | Apply immediately; do not close drawer |
| Navigate to another page (SPA) | Close drawer if open |

### 8.4 Responsive Behavior

| Breakpoint | Behavior |
|-----------|----------|
| Mobile (< 640px) | Full-width drawer from right; gear icon at top-right, may overlap with page header — ensure no conflict via z-index layering |
| Tablet (640–1024px) | 320px-wide drawer from right |
| Desktop (> 1024px) | 320px-wide drawer from right |

### 8.5 Conflict Resolution with `/play` Header

The `/play` page currently has its own gear icon in the page header. Two options:

- **Option A (recommended):** Remove the local gear icon from `/play` page header. The global floating button serves as the sole entry point. This avoids having two gear icons on screen.
- **Option B:** Keep both, but ensure the `/play` header gear icon also opens the global drawer (instead of toggling local state). Remove the inline `SettingsPanel` render from `/play`.

The chosen option is deferred to the architect/dev lead.

---

## 9. Persistence

### 9.1 Storage Mechanism

| User Type | Storage | Scope |
|-----------|---------|-------|
| Guest | `localStorage` | Survives reloads and tab closures; cleared only on explicit browser data clear |
| Registered (future) | Backend API (`/api/settings`) + `localStorage` cache | Syncs across devices; local cache for offline/fast-load |

### 9.2 Persistence Key

- **Key:** `draughts-display-settings` (or similar namespaced key)
- **Format:** JSON object with the four setting values
- **Example:**
  ```json
  {
    "boardTheme": "dark",
    "showNotation": true,
    "showLegalMoves": true,
    "animationSpeed": "fast"
  }
  ```

### 9.3 Load Sequence

1. On app initialization (before first render), read `localStorage` for persisted settings.
2. Merge persisted values with defaults (handles newly added settings gracefully).
3. Apply merged settings to the Zustand store.
4. If a registered user is authenticated, fetch settings from backend and reconcile (future scope).

### 9.4 Save Sequence

1. On any settings change, immediately update the Zustand store (for instant UI reactivity).
2. Debounce (300ms) and write updated settings to `localStorage`.
3. If registered user, also push to backend API (future scope).

### 9.5 Migration

- If the `localStorage` key doesn't exist, use defaults (no error).
- If the stored JSON contains unknown keys, ignore them.
- If the stored JSON is missing keys (e.g., a new setting was added), fall back to the default for that setting.

---

## 10. Out of Scope

The following items are explicitly **not** part of this feature:

| Item | Reason |
|------|--------|
| Audio settings (sound effects, volume) | Not yet implemented; tracked by `settings-customization` |
| Piece style selection | Not yet implemented; tracked by `settings-customization` |
| Game configuration settings (difficulty, player color, timed mode) | These are game-session-specific, not display preferences |
| Backend settings sync for registered users | Future enhancement (US-9 / P2); this feature covers `localStorage` only |
| Shared navigation header/toolbar component | May be a side effect of implementation but is not a requirement of this feature |
| Dark mode / light mode toggle | Controlled by system preference; separate concern |
| Redesign of the `SettingsPanel` component internals | Reuse the existing component as-is |
| Mobile app (Flutter) settings | Separate codebase (`mobile/`); not in scope |

---

## 11. Dependencies

| Direction | Dependency | Notes |
|-----------|-----------|-------|
| Upstream | `SettingsPanel` component (`frontend/src/components/settings/SettingsPanel.tsx`) | Reuse existing component |
| Upstream | Game store (`frontend/src/stores/game-store.ts`) | Currently holds display settings in `GameConfig` |
| Upstream | Root layout (`frontend/src/app/layout.tsx`) | Likely insertion point for global button/drawer |
| Downstream | `/learn` page board rendering | Must respect `boardTheme` and `showNotation` from persisted settings |
| Downstream | `/tutorial` page board rendering | Must respect `boardTheme` from persisted settings |
| Downstream | `/play` page | Remove local settings toggle; consume global mechanism |

---

## 12. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Global floating button conflicts with page-specific UI (e.g., overlaps back button) | Medium | Medium | Use adaptive positioning; test all pages at all breakpoints |
| Extracting display settings from `GameConfig` could introduce regressions in `/play` | Medium | High | Comprehensive unit tests; ensure backward compatibility with existing game store consumers |
| `localStorage` unavailable (private browsing in some browsers) | Low | Low | Wrap in try/catch; fall back to in-memory defaults |
| Hydration mismatch (server renders defaults, client loads persisted values) | Medium | Medium | Use `useEffect` for client-side hydration or Zustand's `onRehydrateStorage` to avoid SSR mismatch |

---

## 13. Success Metrics

| Metric | Target |
|--------|--------|
| Settings accessible from all 8 pages | 100% of listed pages |
| Settings survive browser reload | 100% of the time (when localStorage is available) |
| Zero regressions in existing `/play` game flow | All 162 frontend tests pass |
| No increase in lint or type errors | `0` errors, `0` warnings |
| E2E test coverage for global settings | ≥ 1 E2E test per page with a board (`/play`, `/learn`, `/tutorial`) |
---

## 14. Dev Lead Review

**Reviewer:** Dev Lead (AI)  
**Date:** 2026-02-21  
**FRD Version Reviewed:** 1.0

### 14.1 Overall Assessment

The FRD is well-structured and covers the problem space thoroughly. The feature is technically feasible with the current stack. However, several gaps in requirements and non-trivial implementation risks need to be addressed before handing off to the architect and planner.

### 14.2 Findings

#### 14.2.1 Critical: SSR Hydration Mismatch (FR-6)

FR-6 requires "no flash of default settings," but the root layout (`layout.tsx`) is a **Server Component**. The server has no access to `localStorage`, so it will always render with default values. When React hydrates on the client and Zustand `persist` middleware loads stored settings, there will be a visible flash (default theme → user theme).

**The mitigation in Section 12 is insufficient.** `useEffect` runs *after* paint, so it doesn't prevent flash. Zustand's `onRehydrateStorage` fires after hydration, not before first paint.

**Recommendation:** Either:
- (a) Downgrade FR-6 to "minimize flash" rather than "no flash," and use CSS `opacity: 0` → `opacity: 1` transition on first hydration.
- (b) Add a synchronous `<script>` in `<head>` (similar to the existing SW registration pattern in `layout.tsx`) that reads `localStorage` and sets a `data-theme` attribute on `<html>` before React renders. This only works for `boardTheme`; the other settings are React-state-driven and will inherently flash briefly.
- (c) Accept the flash for non-theme settings and document it as a known limitation.

Approach (b) + (c) is recommended.

#### 14.2.2 Critical: `/learn` and `/tutorial` Pages Hardcode Display Settings

The FRD lists `/learn` and `/tutorial` as downstream dependencies (Section 11) but does not capture as explicit requirements the code changes needed:

- **`/learn` page** (`learn/page.tsx` lines 622, 655): Hardcodes `showNotation={true}` on `<Board>` for tutorial steps. Does not pass a `theme` prop (falls back to `'classic-wood'`). The practice section uses `<GameBoard />` which *does* read from the game store — so it will pick up settings if they're in the store. But tutorial-step boards will not.
- **`/tutorial` page** (`tutorial/page.tsx` line 111): Renders `<Board>` with `showNotation={true}` and no `theme` prop.

**Recommendation:** Add explicit requirements:
- FR-12: All `<Board>` instances on `/learn` and `/tutorial` must consume `boardTheme` from the persisted display settings store.
- FR-13: The `/tutorial` page's static boards should respect `boardTheme` but may keep `showNotation={true}` hardcoded (notation is pedagogically important on tutorial pages).
- The `/learn` page's tutorial-step boards (not the practice `<GameBoard>`) should respect `boardTheme` but treat `showNotation` as an overridable default (hardcoded `true` is acceptable for learning context).

#### 14.2.3 Important: Z-Index Strategy Undefined

The codebase uses `z-50` extensively for overlays: `OfflineBanner`, `InstallPrompt`, `PauseOverlay`, `ResumePrompt`, `AvatarSelector`, and the drag ghost in `GameBoard`. The FRD says the settings button should be "above page content but below the settings overlay backdrop" but specifies no concrete z-index values.

**Risk:** The settings gear button at `z-40` could still appear above mobile `InstallPrompt` or conflict with `PauseOverlay`. The settings drawer backdrop at `z-50` would stack-fight with existing `z-50` overlays.

**Recommendation:** Add an explicit z-index layering table:
| Element | z-index |
|---------|---------|
| Settings gear button | `z-40` |
| Settings drawer backdrop + panel | `z-[60]` (above all existing z-50 overlays) |
| OfflineBanner (existing) | `z-50` (unchanged) |

Or establish a z-index scale in the design system (e.g., a Tailwind `zIndex` config extension).

#### 14.2.4 Important: Game State Serialization Backward Compatibility

`serializeGameState()` in `game-store.ts` (line ~170) currently serializes display settings (`boardTheme`, `showNotation`, etc.) as part of the saved game JSON. If display settings are extracted to a separate store:

1. Existing serialized games in `localStorage`/`sessionStorage` still contain display settings — deserialization must not break.
2. The `resumeGame()` flow should *not* override user's global display preferences with the saved game's display settings (a user may have changed their preferences since saving).

**Recommendation:** Add requirement:
- FR-14: When resuming a saved game, global display preferences take precedence over display settings stored in the serialized game state. Saved game display settings must be ignored on load (or used only as fallback if no global preferences exist).

#### 14.2.5 Important: `/play` Page Conflict Resolution Incomplete

Section 8.5 describes Options A and B for the gear icon but does not address the **inline `<SettingsPanel>` rendering** in the `/play` sidebar (line ~252 of `play/page.tsx`). Currently, `SettingsPanel` renders as a sidebar section — not a drawer. The FRD should explicitly state:

**Recommendation:** Add to FR-9: "The inline `<SettingsPanel>` render in the `/play` page's right sidebar must be removed. The global drawer becomes the sole rendering context for `SettingsPanel`." (This matches Option A in Section 8.5.)

#### 14.2.6 Minor: SPA Navigation Drawer Close Mechanism

Section 8.3 states "Navigate to another page (SPA) → Close drawer if open" but doesn't specify the mechanism. In Next.js App Router, route changes are detected via `usePathname()`.

**Recommendation:** Note in Section 8.3 that the implementation should use a `useEffect` watching `usePathname()` (or equivalent router event) to close the drawer.

#### 14.2.7 Minor: Touch Target Size Ambiguity

Section 8.1 specifies 40×40px size but claims WCAG compliance "with padding." WCAG 2.5.8 (Level AAA) requires 44×44px minimum **target size**. WCAG 2.5.5 (Level AA, the stated target in NFR-3) requires 44×44px for pointer input. The "with padding" qualification is ambiguous.

**Recommendation:** Change to "44×44px minimum touch/click target (the visible icon may be smaller if the clickable area meets 44×44px)."

#### 14.2.8 Minor: NFR-5 Test Coverage Mismatch

NFR-5 requires ≥85% coverage for new components, but AGENTS.md specifies ≥40% statements / ≥50% branches for the frontend. The 85% threshold is the **shared engine** requirement, not frontend.

**Recommendation:** Either align with AGENTS.md frontend thresholds (≥40% statements) or explicitly justify the elevated requirement. Recommendation: keep the elevated 85% target since these are small, focused utility components — but state it as a project-specific override of the baseline.

#### 14.2.9 Minor: Missing Page Route `/` (Home Page)

The home page (`/`) is a Server Component (no `'use client'` directive). Adding a client-side interactive settings button to a server-rendered page requires either:
- Making the global settings button a Client Component rendered from `layout.tsx` (which is already a Server Component boundary — this works since Client Components can be children of Server Components).
- Or wrapping it appropriately.

This is standard Next.js — not a problem, but worth noting that the settings button rendered from `layout.tsx` must be a `'use client'` component.

#### 14.2.10 Observation: `confirmMoves` Setting

`GameConfig` includes `confirmMoves: boolean` which is not surfaced in the current `SettingsPanel` and not mentioned in the FRD. This is correct — `confirmMoves` is not currently user-facing. No action needed, but the architect should be aware it exists in the config interface.

### 14.3 Missing Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-12 | All `<Board>` instances on `/learn` and `/tutorial` must consume `boardTheme` from the display settings store (not hardcoded defaults). | P0 |
| FR-13 | The `/learn` and `/tutorial` pages may hardcode `showNotation={true}` for pedagogical reasons, overriding the global setting. This must be documented as intentional. | P1 |
| FR-14 | When resuming a saved game, global display preferences must take precedence over display settings stored in the serialized game state. | P1 |
| FR-15 | The inline `<SettingsPanel>` render in the `/play` sidebar must be removed; the global drawer is the sole settings UI. | P0 |
| FR-16 | The settings drawer must close automatically on SPA route changes. | P1 |
| FR-17 | The global settings button component must be a Client Component (`'use client'`) since it requires interactivity and store access. | P0 |
| NFR-6 | A z-index layering strategy must be defined for the settings button and drawer relative to existing overlays (`z-50` elements: OfflineBanner, InstallPrompt, PauseOverlay, ResumePrompt, AvatarSelector). | P1 |

### 14.4 Recommendations Summary

1. **Revise FR-6** to acknowledge the SSR limitation and specify the synchronous `<script>` approach for theme, with graceful flash handling for other settings.
2. **Add FR-12 through FR-17** as listed above.
3. **Add NFR-6** for z-index strategy.
4. **Fix touch target spec** (Section 8.1) to require 44×44px clickable area explicitly.
5. **Clarify NFR-5** test coverage target as an intentional elevation above the frontend baseline.
6. **Prefer Option A** (Section 8.5): remove the local gear icon and inline panel from `/play`. This avoids UX confusion and reduces implementation complexity.
7. **Architect note:** The cleanest approach is a dedicated `display-settings-store.ts` with Zustand `persist` middleware (mirroring the `auth-store.ts` pattern). This avoids polluting the game store with persistence middleware and keeps display preferences decoupled from game session state. Use `partialize` if staying in the game store.

### 14.5 Approval Status

**Approved with Changes**

The FRD is solid and the feature is feasible. The changes listed in Sections 14.3 and 14.4 must be incorporated before architecture and planning begin. The most critical items are:
- Revising FR-6 (hydration flash)
- Adding FR-12 (board theme propagation to `/learn` and `/tutorial`)
- Adding FR-15 (removing inline settings from `/play`)
- Adding NFR-6 (z-index strategy)