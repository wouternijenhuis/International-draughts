# Frontend Architecture

## App Router Structure

```
src/app/
  page.tsx          → Home page
  play/page.tsx     → Game play (PvC / PvP)
  learn/page.tsx    → Learning mode
  tutorial/page.tsx → Rules reference
  login/page.tsx    → Authentication
  register/page.tsx → Registration
  profile/page.tsx  → Player profile & stats
  offline/page.tsx  → Offline fallback (PWA)
  layout.tsx        → Root layout
```

## Component Organization

```
src/components/
  board/        → Board, BoardSquare, BoardPiece
  game/         → GameBoard, GameControls, GameStatus, MoveHistory,
                  PauseOverlay, ResumePrompt, MoveFeedback
  settings/     → SettingsPanel
  clock/        → ChessClock
  profile/      → AvatarSelector, GameHistory, RatingChart, StatsOverview
  replay/       → ReplayViewer
  pwa/          → InstallPrompt, OfflineBanner
```

## State Management

### Game Store (`stores/game-store.ts`)

Central store managing the full game lifecycle:

- **Setup phase**: Game mode, AI difficulty, player color, time controls
- **In-progress**: Board state, move history, current player, clock, AI turn processing
- **Finished**: Game outcome, statistics recording

Key actions: `startGame()`, `makeMove()`, `undoMove()`, `redoMove()`, `togglePause()`, `resign()`, `offerDraw()`

### Auth Store (`stores/auth-store.ts`)

Manages user authentication:

- JWT token persistence
- Login, register, logout flows
- User session state

## Game Persistence

Three-tier persistence strategy in `lib/game-persistence.ts`:

1. **Session Storage**: Guest users (current browser session only)
2. **Local Storage**: Registered users (immediate, offline-capable)
3. **Backend Sync**: Registered users (cross-device, authoritative)

Conflict resolution: latest timestamp wins.

## Board Rendering

- **10×10 grid** with CSS Grid layout
- **Four themes**: Classic, Dark, Ocean, Tournament
- **Notation overlay**: Optional square numbers (1–50)
- **Orientation**: Flip support for board rotation
- **Interaction**: Click-to-move and drag-and-drop
- **Accessibility**: ARIA grid roles, keyboard navigation, screen reader announcements

## Testing

162 tests across 23 test files covering:

- Components (board, game, settings, clock, profile, replay, PWA)
- Stores (game-store, auth-store)
- Libraries (API client, game persistence, move generation)
- Pages (home, play, tutorial)
