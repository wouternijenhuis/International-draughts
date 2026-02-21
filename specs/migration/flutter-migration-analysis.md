# Flutter Migration Analysis — International Draughts Frontend

> **Generated:** 2026-02-21
> **Source:** Next.js 16 / React 19 / TypeScript 5.9 frontend codebase
> **Purpose:** Complete technical inventory for Flutter migration planning

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Route Map](#2-route-map)
3. [Component Inventory](#3-component-inventory)
4. [State Management](#4-state-management)
5. [Custom Hooks](#5-custom-hooks)
6. [API Communication](#6-api-communication)
7. [Shared Engine Integration](#7-shared-engine-integration)
8. [PWA Configuration](#8-pwa-configuration)
9. [Styling & Theming](#9-styling--theming)
10. [Testing Inventory](#10-testing-inventory)
11. [Backend API Surface](#11-backend-api-surface)
12. [E2E Test Scenarios](#12-e2e-test-scenarios)
13. [Dependency Mapping](#13-dependency-mapping)
14. [Complexity Assessment](#14-complexity-assessment)
15. [Risk Areas](#15-risk-areas)

---

## 1. Architecture Overview

### Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router, static export) | ^16.1.0 |
| UI Library | React | ^19.2.0 |
| Language | TypeScript (strict mode) | ^5.9.0 |
| State Management | Zustand | ^5.0.11 |
| Styling | Tailwind CSS | ^3.4.19 |
| Testing | Vitest + React Testing Library | ^3.2.0 / ^16.3.0 |
| Linting | ESLint 9 (next/core-web-vitals, next/typescript) | ^9.39.0 |
| Shared Engine | `@international-draughts/engine` (local package) | file:../shared/draughts-engine |
| Build Output | Static export (`output: 'export'`) | — |

### Key Architectural Decisions

- **Static export** (`output: 'export'` in next.config.ts) — no SSR/ISR; purely client-side SPA deployed to Azure Static Web Apps.
- **Strict TypeScript**: `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`.
- **Path alias**: `@/*` → `./src/*`.
- **Shared engine** consumed as a local npm workspace package (`file:../shared/draughts-engine`), re-exported through `src/lib/engine/index.ts`.
- **Zero runtime dependencies** beyond React, Next.js, and Zustand.
- **PWA** with service worker, manifest, offline page.
- **Security headers** configured in `next.config.ts` (CSP, HSTS, X-Frame-Options, etc.).

### Directory Structure

```
frontend/src/
├── app/              # Next.js App Router pages
│   ├── layout.tsx    # Root layout (metadata, SW registration, PWA components)
│   ├── page.tsx      # Home page
│   ├── globals.css   # Tailwind + CSS custom properties
│   ├── play/         # Main game page
│   ├── learn/        # Interactive learning mode
│   ├── tutorial/     # Static rules tutorial
│   ├── login/        # Auth: sign in
│   ├── register/     # Auth: sign up
│   ├── profile/      # Player profile, stats, history
│   └── offline/      # Offline fallback
├── components/       # Reusable UI components (by feature)
│   ├── board/        # Board rendering
│   ├── clock/        # Chess clock
│   ├── game/         # Game UI (controls, status, setup, etc.)
│   │   └── setup/    # Game setup dialog sub-components
│   ├── profile/      # Profile page sub-components
│   ├── pwa/          # PWA install prompt, offline banner
│   ├── replay/       # Game replay viewer
│   └── settings/     # Display preferences panel
├── hooks/            # Custom React hooks
├── lib/              # Utilities, API client, engine re-exports
│   └── engine/       # Re-exports from shared engine
├── stores/           # Zustand state stores
└── test/             # Test setup (vitest)
```

---

## 2. Route Map

| Route | File | Rendering | Description | Auth Required |
|-------|------|-----------|-------------|---------------|
| `/` | `app/page.tsx` | Static (server component) | Landing page with nav to Play, Learn, Rules, Sign In | No |
| `/play` | `app/play/page.tsx` | Client (`'use client'`) | Main game page: board, controls, clock, settings, setup dialog | No |
| `/play?setup=true` | Same | Client | Auto-opens game setup dialog | No |
| `/learn` | `app/learn/page.tsx` | Client | Interactive learning mode with tutorial steps, hints, feedback | No |
| `/tutorial` | `app/tutorial/page.tsx` | Client | Static rules tutorial (6 steps with board illustrations) | No |
| `/login` | `app/login/page.tsx` | Client | Email/password sign-in form | No |
| `/register` | `app/register/page.tsx` | Client | Account registration (username, email, password) | No |
| `/profile` | `app/profile/page.tsx` | Client | Player profile, stats, rating chart, game history | Yes (redirects) |
| `/offline` | `app/offline/page.tsx` | Client | Offline fallback page | No |

**Note:** The app uses Next.js `Link` components for client-side navigation. Only `/play` uses `useSearchParams` (wrapped in `Suspense`).

---

## 3. Component Inventory

### 3.1 Board Components (`components/board/`)

| Component | File | Props | Purpose | Complexity |
|-----------|------|-------|---------|------------|
| `Board` | `Board.tsx` | `position`, `showNotation`, `theme`, `selectedSquare`, `legalMoveSquares`, `lastMoveSquares`, `onSquareClick`, `onSquareDragStart`, `orientation` | Renders the 10×10 grid with pieces, highlighting, and notation. Uses a pre-computed static grid flipped based on orientation. | **High** |
| `BoardSquare` | `BoardSquare.tsx` | `isDark`, `squareNumber`, `showNotation`, `isSelected`, `isLegalMove`, `isLastMove`, `onClick`, `onDragStart`, `piece` | Individual square with ARIA labels, legal move indicators, notation display, piece rendering. | Medium |
| `BoardPiece` | `BoardPiece.tsx` | `piece`, `isDragging` | Renders a piece with CSS gradients (amber/gray), 3D inner ring effect, and SVG king crown icon. | Medium |
| `AnimatedPieceOverlay` | `AnimatedPieceOverlay.tsx` | `overlay`, `orientation`, `onTransitionEnd` | Absolutely positioned overlay that renders CSS transition-based piece sliding animation and captured piece ghost fade-outs. | **High** |

**Barrel export:** `components/board/index.ts` exports all four components.

**Board theme system:** 4 themes defined via CSS variables:
- `classic-wood` (#f0d9b5 / #b58863)
- `dark` (#6b7280 / #374151)
- `ocean` (#93c5fd / #1d4ed8)
- `tournament-green` (#d4edda / #2d6a4f)

### 3.2 Game Components (`components/game/`)

| Component | File | Props | Purpose | Complexity |
|-----------|------|-------|---------|------------|
| `GameBoard` | `GameBoard.tsx` | (none — reads from game store) | Interactive board wrapper: piece selection, drag-and-drop (mouse + touch), move animation via `useMoveAnimation` hook, AI thinking overlay. | **Very High** |
| `GameControls` | `GameControls.tsx` | `onNewGame` | Toolbar: New Game, Rematch, Pause/Resume, Undo, Redo (learning only), Hint (learning only), Draw, Resign. Conditionally renders buttons based on game phase and mode. | High |
| `GameStatus` | `GameStatus.tsx` | (none — reads from game store) | Live status line with turn indicator dot, status text, move count. Uses ARIA `role="status"` with `aria-live="polite"`. | Low |
| `MoveHistory` | `MoveHistory.tsx` | (none — reads from game store) | Scrollable table of paired moves (White/Black) with FMJD notation conversion, current-move highlighting, auto-scroll. | Medium |
| `PauseOverlay` | `PauseOverlay.tsx` | (none — reads from game store) | Full-screen modal overlay hiding the board during pause. Uses `role="dialog"` with `aria-modal`. | Low |
| `VictoryAnimation` | `VictoryAnimation.tsx` | (none — reads from game store) | Canvas-based physics animation: bouncing piece cascades with gravity, bouncing, trail effects. 8-second duration with fade-out. Uses `requestAnimationFrame`. | **Very High** |
| `GameConfigSummary` | `GameConfigSummary.tsx` | (none — reads from game store) | Single-line compact summary: opponent type, difficulty, player color, time control. | Low |
| `MoveFeedback` | `MoveFeedback.tsx` | (none — reads from game store) | Toast notification for learning mode: good/neutral/bad move feedback. Auto-dismisses after 3 seconds. | Low |
| `ResumePrompt` | `ResumePrompt.tsx` | `savedAt`, `gameDescription`, `moveCount`, `onResume`, `onDiscard` | Modal dialog offering to resume or discard a saved in-progress game. | Low |

**Barrel export:** `components/game/index.ts` exports GameBoard, GameControls, GameStatus, MoveHistory, PauseOverlay, VictoryAnimation, GameConfigSummary.

### 3.3 Game Setup Sub-Components (`components/game/setup/`)

| Component | File | Props | Purpose | Complexity |
|-----------|------|-------|---------|------------|
| `GameSetupDialog` | `GameSetupDialog.tsx` | `open`, `onClose`, `onStartGame` | Native `<dialog>` modal with form: opponent, difficulty, color, timed mode. Manages local form state, persists last config to localStorage, supports Quick Start. | **High** |
| `OpponentSelector` | `OpponentSelector.tsx` | `value`, `onChange` | Two-card toggle: vs AI / vs Human (Local). | Low |
| `DifficultySelector` | `DifficultySelector.tsx` | `value`, `onChange`, `disabled` | 4-button segmented control (Easy/Medium/Hard/Expert). Expert has "Server" badge. | Low |
| `ColorPicker` | `ColorPicker.tsx` | `value`, `onChange` | 3-button selector: White/Black/Random with emoji icons. | Low |
| `TimedModeToggle` | `TimedModeToggle.tsx` | `enabled`, `onToggle`, `preset`, `onPresetChange` | Toggle switch + expandable clock preset grid (5 presets). Animates expand/collapse. | Medium |

**Barrel export:** `components/game/setup/index.ts`.

### 3.4 Clock Components (`components/clock/`)

| Component | File | Props | Purpose | Complexity |
|-----------|------|-------|---------|------------|
| `ChessClock` | `ChessClock.tsx` | `whiteTime`, `blackTime`, `activePlayer`, `isPaused`, `lowTimeThreshold` | Dual clock faces. Active clock scales up with green ring. Low time triggers CSS pulse animation and red text. Shows tenths of seconds below 10s. | Medium |

### 3.5 Settings Components (`components/settings/`)

| Component | File | Props | Purpose | Complexity |
|-----------|------|-------|---------|------------|
| `SettingsPanel` | `SettingsPanel.tsx` | (none — reads from game store) | Display preferences form: board theme (4-button grid), show notation (toggle switch), show legal moves (toggle switch), animation speed (4-button segmented). | Medium |

### 3.6 Profile Components (`components/profile/`)

| Component | File | Props | Purpose | Complexity |
|-----------|------|-------|---------|------------|
| `AvatarSelector` | `AvatarSelector.tsx` | `currentAvatarId`, `onSelect`, `onClose` | Modal with 4×3 grid of emoji avatars (12 options). Highlights current selection. | Low |
| `StatsOverview` | `StatsOverview.tsx` | `stats` (PlayerStats object) | Statistics dashboard: Games/Wins/Losses/Draws cards, win rate progress bar (stacked W/D/L), current/best streak. | Medium |
| `RatingChart` | `RatingChart.tsx` | `data` (RatingHistoryEntry[]) | Pure SVG line chart with Glicko-2 confidence band, hover tooltip, axis labels. Responsive via viewBox. No charting library. | **Very High** |
| `GameHistory` | `GameHistory.tsx` | `userId` | Paginated game history list with filters (result, difficulty, mode). Infinite scroll via "Load More". Each game links to replay. | High |

### 3.7 Replay Components (`components/replay/`)

| Component | File | Props | Purpose | Complexity |
|-----------|------|-------|---------|------------|
| `ReplayViewer` | `ReplayViewer.tsx` | `moves`, `whitePlayer`, `blackPlayer`, `result`, `date` | Full game replay with animated board, playback controls (⏮◀▶⏭), clickable move list, game info sidebar. Uses `useMoveAnimation` hook. | **High** |

### 3.8 PWA Components (`components/pwa/`)

| Component | File | Props | Purpose | Complexity |
|-----------|------|-------|---------|------------|
| `InstallPrompt` | `InstallPrompt.tsx` | (none) | Bottom banner prompting PWA install. Intercepts `beforeinstallprompt` event. 7-day dismiss cooldown via localStorage. | Medium |
| `OfflineBanner` | `OfflineBanner.tsx` | (none) | Fixed top banner shown when offline. Uses `useSyncExternalStore` with `navigator.onLine`. | Low |

### 3.9 Total Component Count

| Category | Components |
|----------|-----------|
| Board | 4 |
| Game | 9 |
| Game Setup | 5 |
| Clock | 1 |
| Settings | 1 |
| Profile | 4 |
| Replay | 1 |
| PWA | 2 |
| **Total** | **27** |

---

## 4. State Management

### 4.1 Game Store (`stores/game-store.ts`)

**Size:** 1,087 lines — the core of the application.

**Creation:** `create<GameState>()` (no persist middleware — game persistence is manual).

#### State Shape

```typescript
interface GameState {
  // Phase & config
  phase: 'not-started' | 'in-progress' | 'white-wins' | 'black-wins' | 'draw';
  config: GameConfig;

  // Board state
  position: BoardPosition;          // Square[51] (index 0 unused, 1-50)
  currentTurn: PlayerColor;

  // Interaction
  selectedSquare: number | null;
  legalMoveSquares: number[];
  legalMovesForSelection: readonly GeneratedMove[];
  lastMoveSquares: number[];

  // History
  moveHistory: MoveRecord[];
  moveIndex: number;

  // Timing
  isPaused: boolean;
  clockState: ClockState | null;

  // AI
  isAiThinking: boolean;

  // Game result
  gameOverReason: string | null;

  // Learning mode
  hintSquares: number[];
  moveFeedback: 'good' | 'neutral' | 'bad' | null;
  moveFeedbackMessage: string | null;
}
```

#### GameConfig Shape

```typescript
interface GameConfig {
  gameMode: 'standard' | 'learning';
  opponent: 'human' | 'ai';
  aiDifficulty: 'easy' | 'medium' | 'hard' | 'expert';
  playerColor: PlayerColor;
  timedMode: boolean;
  clockPreset: string;
  showNotation: boolean;
  boardTheme: 'classic-wood' | 'dark' | 'ocean' | 'tournament-green';
  confirmMoves: boolean;
  showLegalMoves: boolean;
  animationSpeed: 'instant' | 'fast' | 'normal' | 'slow';
}
```

#### Actions (17 total)

| Action | Purpose |
|--------|---------|
| `startGame(config?)` | Initialize new game, set up clock, trigger AI first move if player is Black |
| `selectSquare(square)` | Piece selection + move execution via click. Generates legal moves. |
| `makeMove(from, to, notation, capturedSquares)` | Apply move, update position, handle promotion, check game over, switch clock, evaluate learning feedback, auto-save, trigger AI |
| `undoMove()` | Undo 1 move (PvP) or 2 moves (vs AI). Cancels pending AI. |
| `redoMove()` | Redo 1 move (PvP) or 2 moves (vs AI). Checks game-over on redo'd position. |
| `resign()` | End game with opponent winning. Cleans up AI timer + clock. |
| `offerDraw()` | Auto-accept draw in AI games. |
| `togglePause()` | Pause/resume with clock state management. |
| `resetGame()` | Full reset to `not-started` state. |
| `setConfig(overrides)` | Merge config overrides. |
| `setBoardTheme(theme)` | Update board theme. |
| `toggleNotation()` | Toggle notation display. |
| `resumeGame(saved)` | Deserialize and restore a saved game. Resumes clock and AI. |
| `tickClockAction()` | Called every 100ms by interval. Ticks clock, checks time expiry. |
| `showHint()` | Learning mode: compute best move via engine, highlight squares. |
| `clearHint()` | Clear hint highlights. |

#### Key Internal Functions

| Function | Purpose |
|----------|---------|
| `serializeGameState()` | Converts live state → `SerializedGameState` for persistence |
| `deserializeGameState()` | Converts `SerializedGameState` → partial `GameState` |
| `autoSaveGame()` | After each move: guest→sessionStorage, user→localStorage+backend |
| `clearSavedGame()` | Removes all persisted state |
| `checkGameOver()` | Checks if opponent has legal moves |
| `triggerAiMove()` | Schedules AI (local or expert backend); handles generation-based cancellation |
| `boardToApiFormat()` | Converts frontend board with 180° rotation for backend API |
| `rotateSquare()` | Square number rotation: `s → 51 - s` |
| `convertEngineMove()` | Adapts shared engine `Move` type to frontend format |

#### Persistence Strategy

- **Guests:** `sessionStorage` (survives page reload, not tab close)
- **Registered users:** `localStorage` + async backend sync (fire-and-forget)
- **Clock timer:** `setInterval` at 100ms stored in module-level `clockIntervalRef`
- **AI timer:** `setTimeout` at 150ms stored in module-level `aiTimerRef`
- **AI cancellation:** Module-level `aiMoveGeneration` counter

### 4.2 Auth Store (`stores/auth-store.ts`)

**Size:** 70 lines.

**Creation:** `create<AuthState>()(persist(...))` — persisted to `localStorage` under key `draughts-auth`.

#### State Shape

```typescript
interface AuthState {
  user: {
    userId: string;
    username: string;
    token: string;
    expiresAt: string;
  } | null;
  isLoading: boolean;
  error: string | null;
}
```

#### Actions

| Action | Purpose |
|--------|---------|
| `login(email, password)` | POST `/api/auth/login`, stores JWT response |
| `register(username, email, password)` | POST `/api/auth/register`, stores JWT response |
| `logout()` | Clears user data |
| `clearError()` | Resets error state |
| `isAuthenticated()` | Checks `user` exists and `expiresAt` is future |

#### Persistence Config

```typescript
persist(store, {
  name: 'draughts-auth',
  partialize: (state) => ({ user: state.user }),
})
```

### 4.3 State Management Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    ZUSTAND STORES                           │
│                                                             │
│  ┌─────────────────┐      ┌──────────────────────────────┐ │
│  │   Auth Store     │      │        Game Store             │ │
│  │  (persisted)     │      │      (manual persist)         │ │
│  │                  │      │                                │ │
│  │  user            │◄─────│  reads auth for save target   │ │
│  │  isLoading       │      │                                │ │
│  │  error           │      │  phase, config, position       │ │
│  │                  │      │  currentTurn, moveHistory      │ │
│  │  login()         │      │  clockState, isAiThinking      │ │
│  │  register()      │      │  hintSquares, moveFeedback     │ │
│  │  logout()        │      │                                │ │
│  └────────┬─────────┘      │  startGame(), selectSquare()   │ │
│           │                │  makeMove(), undoMove()         │ │
│           │                │  resign(), togglePause()        │ │
│           │                │  showHint(), resumeGame()       │ │
│           │                └──────┬──────────┬──────────────┘ │
│           │                       │          │                │
└───────────┼───────────────────────┼──────────┼────────────────┘
            │                       │          │
      ┌─────▼──────┐     ┌─────────▼──┐  ┌────▼────────────┐
      │ localStorage│     │ Shared     │  │ API Client      │
      │ draughts-   │     │ Engine     │  │ (fetch)         │
      │ auth        │     │ (local AI, │  │                 │
      └─────────────┘     │ moves,     │  │ Expert AI POST  │
                          │ clock,     │  │ Game persist    │
      ┌─────────────┐    │ rating)    │  │ Auth endpoints  │
      │ sessionStore│     └────────────┘  │ Player profile  │
      │ (guest game)│                     └─────────────────┘
      └─────────────┘
      ┌─────────────┐
      │ localStorage│
      │ (user game, │
      │  game config)│
      └─────────────┘
```

---

## 5. Custom Hooks

| Hook | File | Dependencies | Purpose |
|------|------|-------------|---------|
| `useMoveAnimation` | `hooks/useMoveAnimation.ts` (307 lines) | `BoardPosition`, `MoveRecord`, `AnimationSpeed`, `PlayerColor` | Detects board position changes by diffing consecutive positions, computes CSS transition keyframes for sliding pieces and captured piece ghost fades. Supports multi-leg capture animations. Returns `displayPosition`, `overlay`, `onTransitionEnd`, `isAnimating`. | 
| `useAnnouncer` | `hooks/use-announcer.ts` | (none) | Creates a visually hidden ARIA live region for screen reader announcements. Returns `announce(message)` callback. |
| `useMediaQuery` | `hooks/use-media-query.ts` | (none) | Tracks CSS media query match state. Also exports `useIsMobile`, `useIsTablet`, `useIsDesktop` convenience hooks. |

**Complexity notes:**
- `useMoveAnimation` is the most complex hook (307 lines). It handles: position diffing, diagonal distance calculation, multi-step capture sequencing, CSS transform/transition computation, captured piece ghost overlay management, and a state machine for animation phases.

---

## 6. API Communication

### 6.1 API Client (`lib/api-client.ts`)

**Base URL:** `process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1'`

**HTTP Methods:**

| Function | Method | Features |
|----------|--------|----------|
| `apiGet<T>(path)` | GET | Content-Type JSON, credentials: include |
| `apiPost<T>(path, body?)` | POST | Content-Type JSON, credentials: include |
| `apiPatch<T>(path, body)` | PATCH | Content-Type JSON, credentials: include |
| `apiDelete(path)` | DELETE | Content-Type JSON, credentials: include |

**Error Handling:** Custom `ApiError` class with `status`, `statusText`, `body`.

**Special Endpoints:**

| Function | Endpoint | Purpose |
|----------|----------|---------|
| `checkHealth()` | GET `/health` | Health check |
| `requestAiMove(board, player, difficulty, timeLimitMs?)` | POST `/api/v1/ai/move` | Expert AI move request |

**Convenience Object:** `apiClient` wraps `{ get, post, patch, delete }`.

### 6.2 API Calls from Frontend

| Caller | Endpoint | Method | Purpose |
|--------|----------|--------|---------|
| Auth Store: `login` | `/api/auth/login` | POST | User login |
| Auth Store: `register` | `/api/auth/register` | POST | User registration |
| Profile Page | `/player/{userId}/profile` | GET | Fetch player profile |
| Profile Page | `/player/{userId}/rating-history` | GET | Fetch rating history |
| Profile Page | `/player/{userId}/display-name` | PATCH | Update display name |
| Profile Page | `/player/{userId}/avatar` | PATCH | Update avatar |
| GameHistory component | `/player/{userId}/games?page&pageSize&result&difficulty&mode` | GET | Paginated game history |
| Game Store (Expert AI) | `/api/v1/ai/move` | POST | Request Expert AI move |
| Game Persistence | `/games/in-progress/{userId}` | GET | Load saved game |
| Game Persistence | `/games/in-progress/{userId}` | POST | Save in-progress game |
| Game Persistence | `/games/in-progress/{userId}` | DELETE | Clear saved game |

### 6.3 Authentication Pattern

- JWT token stored in Zustand auth store (persisted to `localStorage` under `draughts-auth`).
- Token expiry checked client-side via `isAuthenticated()` (compares `expiresAt` to current time).
- **No token refresh mechanism** currently implemented.
- **No Authorization header** sent in API calls — credentials are included via `credentials: 'include'` (cookie-based).
- Auth store's `apiClient.post` is used for login/register calls.

### 6.4 Game Persistence Flow

```
Guest User:
  Each move → serializeGameState() → sessionStorage

Registered User:
  Each move → serializeGameState() → localStorage
           → fire-and-forget POST to backend /games/in-progress/{userId}

Load on page open:
  Registered → Promise.all(backend, localStorage) → pick most recent
  Guest → sessionStorage

Game over or resign → clearGuestGame() + clearUserGameLocal() + clearUserGameBackend()
```

---

## 7. Shared Engine Integration

### 7.1 Package Details

| Field | Value |
|-------|-------|
| Name | `@international-draughts/engine` |
| Type | Pure TypeScript (ESM) |
| Runtime dependencies | **Zero** |
| Dev dependencies | TypeScript 5.9, Vitest, ESLint |
| Build | `tsc -p tsconfig.build.json` → `dist/` |
| Exports | `./dist/index.js` + `./dist/index.d.ts` |
| Tests | 8 test files, ~201 test cases |

### 7.2 Module Structure

```
shared/draughts-engine/src/
├── index.ts          # Re-exports all modules
├── types/            # Core types: Piece, Board, Move, Notation, GameState
│   ├── piece.ts      # PieceType (Man/King), PlayerColor (White/Black), Piece
│   ├── board.ts      # Square, BoardPosition, BoardCoordinate, squareToCoordinate, coordinateToSquare, createEmptyBoard
│   ├── move.ts       # QuietMove, CaptureMove, CaptureStep, Move (union), getMoveOrigin/Destination, getCapturedSquares
│   ├── notation.ts   # formatMoveNotation
│   └── game-state.ts # GameState type
├── board/            # Board topology
│   └── topology.ts   # adjacency tables, diagonal ray generation
├── engine/           # Rules engine
│   ├── move-generator.ts  # generateLegalMoves (FMJD-compliant)
│   ├── board-utils.ts     # applyMoveToBoard, etc.
│   └── game-engine.ts     # oppositeColor, full game logic
├── ai/               # Alpha-beta search AI
│   ├── search.ts     # findBestMove (iterative deepening NegaMax alpha-beta)
│   ├── evaluation.ts # evaluate, quickEvaluate (material + positional)
│   ├── difficulty.ts # DifficultyConfig, DIFFICULTY_CONFIGS (easy/medium/hard)
│   ├── zobrist.ts    # Zobrist hashing for transposition table
│   ├── transposition-table.ts # TranspositionTable
│   └── killer-moves.ts      # KillerMoves heuristic
├── clock/            # Game clock
│   └── clock.ts      # ClockState, ClockConfig, CLOCK_PRESETS, tick/switch/pause/resume/start
└── rating/           # Rating system
    └── glicko2.ts    # Glicko-2 implementation, AI_RATINGS, default config
```

### 7.3 Public API Surface (Exports)

#### Types
- `PieceType` (enum: Man, King)
- `PlayerColor` (enum: White, Black)
- `Piece` (interface: type + color)
- `Square` (Piece | null)
- `BoardPosition` (readonly Square[])
- `BoardCoordinate` (row, col)
- `SquareNumber` (number alias, 1-50)
- `QuietMove`, `CaptureMove`, `CaptureStep`, `Move` (union)
- `ClockState`, `ClockConfig`, `PlayerClockState`, `ClockFormat` (enum)
- `DifficultyConfig`
- `Glicko2Rating`, `GameResult`, `Glicko2Config`
- `SearchResult`

#### Board Functions
- `squareToCoordinate(square)` → BoardCoordinate
- `coordinateToSquare(coord)` → SquareNumber | null
- `createEmptyBoard()` → Square[]
- `isValidSquareNumber(n)` → boolean
- `createPiece, createWhiteMan, createBlackMan, createWhiteKing, createBlackKing`

#### Engine Functions
- `generateLegalMoves(board, player)` → Move[]
- `applyMoveToBoard(board, move)` → BoardPosition
- `oppositeColor(color)` → PlayerColor
- `formatMoveNotation(move)` → string

#### AI Functions
- `findBestMove(board, player, config?)` → SearchResult | null
- `evaluate(board, player, featureScale)` → number
- `quickEvaluate(board, player)` → number
- `DIFFICULTY_CONFIGS` — Record<string, DifficultyConfig>
- `getDifficultyConfig(name)` → DifficultyConfig | null

#### Clock Functions
- `createClockState(config)` → ClockState
- `createClockFromPreset(presetName)` → ClockState | null
- `startClock(state, player, timestamp)` → ClockState
- `tickClock(state, timestamp)` → ClockState
- `switchClock(state, timestamp)` → ClockState
- `pauseClock(state, timestamp)` → ClockState
- `resumeClock(state, player, timestamp)` → ClockState
- `isTimeExpired(state, player)` → boolean
- `CLOCK_PRESETS` — 6 presets (blitz/rapid/classical)

#### Rating Functions
- Glicko-2 `updateRating(rating, results, config?)` → Glicko2Rating
- `AI_RATINGS` — Record<string, { rating, rd }>
- `DEFAULT_CONFIG` — default Glicko-2 parameters

### 7.4 Frontend Consumption Pattern

The frontend **re-exports** the shared engine through `src/lib/engine/index.ts`:

```typescript
export * from './types';
export * from './board';
export * from './engine';
export * from './ai';
export * from './rating';
export * from './clock';
```

This mirrors the shared engine directory structure identically. The frontend also has:

- `src/lib/draughts-types.ts` — Thin re-export layer for types/board functions
- `src/lib/move-generation.ts` — Frontend-specific move generation wrapper (256 lines) with its own `GeneratedMove` interface that flattens the engine's `QuietMove`/`CaptureMove` union into a simpler `{ from, to, capturedSquares, notation }` shape.
- `src/lib/notation-display.ts` — `toFmjdSquare()` and `toFmjdNotation()` for display orientation conversion (51 - square).

### 7.5 Flutter Migration Impact

The shared engine is **pure TypeScript with zero dependencies**. For Flutter migration, options are:

1. **Port to Dart** — Rewrite the engine in Dart. Engine is ~2,500 LoC across all modules. Well-structured with clear interfaces.
2. **Dart FFI to JS** — Run the TypeScript engine via a JS runtime (heavy, not recommended for mobile).
3. **Dual maintenance** — Keep the TypeScript version for web, Dart for Flutter native.

**Recommendation:** Port to Dart. The engine uses no DOM APIs or Node.js APIs. All algorithms (alpha-beta search, move generation, Glicko-2) are pure computation.

---

## 8. PWA Configuration

### 8.1 Web App Manifest (`public/manifest.json`)

```json
{
  "name": "International Draughts",
  "short_name": "Draughts",
  "display": "standalone",
  "orientation": "any",
  "categories": ["games", "entertainment"],
  "theme_color": "#4a90d9",
  "background_color": "#1a1a2e",
  "icons": ["192x192", "512x512"]
}
```

### 8.2 Service Worker (`public/sw.js`)

| Strategy | Scope | Behavior |
|----------|-------|----------|
| **Cache-first** | Static assets (/, /play, /tutorial, /manifest.json) | Pre-cached on install; serve from cache, fallback to network |
| **Network-first** | API calls (`/api/*`) | Try network; on failure return `{ error: "You are offline" }` (503) |
| **Dynamic cache** | All other GET requests | Fetch from network, cache successful responses |

Cache name: `draughts-v1`. Old caches cleaned on activate.

### 8.3 Service Worker Registration

Inline `<script>` in `layout.tsx` registers `/sw.js` on window load.

### 8.4 Flutter PWA Equivalent

Flutter web builds automatically generate a service worker. For native mobile (iOS/Android), PWA concepts map to:
- Manifest → Native app configuration
- Service worker → Background services / WorkManager
- Offline caching → SQLite / Hive / SharedPreferences
- Install prompt → App store distribution

---

## 9. Styling & Theming

### 9.1 Tailwind CSS Configuration

- **Content paths:** `./src/pages/**`, `./src/components/**`, `./src/app/**`, `./src/features/**`
- **Custom colors:** `board.light/dark` (CSS vars), `primary.*` (blue scale), `surface.*` (CSS vars)
- **Custom fonts:** `--font-sans`, `--font-mono`
- **Custom spacing:** `board` (var), `square` (var)
- **Custom shadows:** `board`, `piece`, `piece-hover`
- **Custom border-radius:** `board`

### 9.2 CSS Custom Properties (`globals.css`)

```css
:root {
  --color-board-light: #f0d9b5;
  --color-board-dark: #b58863;
  --color-surface: #ffffff;
  --color-surface-elevated: #f8fafc;
  --color-surface-overlay: rgba(0, 0, 0, 0.5);
  --font-sans: system-ui, -apple-system, sans-serif;
  --font-mono: 'Courier New', monospace;
  --board-size: min(90vw, 90vh, 600px);
  --square-size: calc(var(--board-size) / 10);
  --board-radius: 0.5rem;
}

/* Dark mode via prefers-color-scheme */
@media (prefers-color-scheme: dark) {
  --color-surface: #0f172a;
  --color-surface-elevated: #1e293b;
  --color-surface-overlay: rgba(0, 0, 0, 0.7);
}
```

### 9.3 Animation Keyframes

```css
@keyframes capturedFade {
  0% { opacity: 1; }
  40% { opacity: 0.7; }
  100% { opacity: 0; }
}
```

### 9.4 Accessibility Styles

- `.skip-to-content` — absolute positioned skip link for keyboard navigation
- `:focus-visible` — outline with primary color
- Screen reader utilities (Tailwind's `sr-only`)

### 9.5 Flutter Theme Equivalent

- Tailwind utility classes → Flutter `ThemeData`, `ColorScheme`, `TextTheme`
- CSS custom properties → Dart theme constants / `InheritedWidget`
- Dark mode media query → Flutter `ThemeMode.system` with light/dark `ThemeData`
- Board themes → Custom `BoardTheme` class with configurable colors

---

## 10. Testing Inventory

### 10.1 Frontend Tests (Vitest + React Testing Library)

**Framework Config:** Vitest with jsdom environment, `@vitejs/plugin-react`, setup file at `src/test/setup.ts`.

**Coverage Thresholds:**
| Metric | Minimum |
|--------|---------|
| Statements | 40% |
| Branches | 50% |
| Functions | 30% |
| Lines | 40% |

**Test Files (25 total):**

| Category | File | Approx. Test Count |
|----------|------|--------------------|
| Pages | `app/page.test.tsx` | ~5 |
| Pages | `app/play/__tests__/page.test.tsx` | ~10 |
| Pages | `app/learn/__tests__/page.test.tsx` | ~10 |
| Pages | `app/tutorial/__tests__/page.test.tsx` | ~8 |
| Board | `components/board/__tests__/Board.test.tsx` | ~15 |
| Clock | `components/clock/__tests__/ChessClock.test.tsx` | ~8 |
| Game | `components/game/__tests__/GameControls.test.tsx` | ~12 |
| Game | `components/game/__tests__/GameStatus.test.tsx` | ~8 |
| Game | `components/game/__tests__/MoveFeedback.test.tsx` | ~6 |
| Game | `components/game/__tests__/PauseOverlay.test.tsx` | ~5 |
| Game | `components/game/__tests__/ResumePrompt.test.tsx` | ~6 |
| Profile | `components/profile/__tests__/AvatarSelector.test.tsx` | ~5 |
| Profile | `components/profile/__tests__/GameHistory.test.tsx` | ~10 |
| Profile | `components/profile/__tests__/RatingChart.test.tsx` | ~8 |
| Profile | `components/profile/__tests__/StatsOverview.test.tsx` | ~6 |
| PWA | `components/pwa/__tests__/InstallPrompt.test.tsx` | ~5 |
| PWA | `components/pwa/__tests__/OfflineBanner.test.tsx` | ~4 |
| Replay | `components/replay/__tests__/ReplayViewer.test.tsx` | ~8 |
| Settings | `components/settings/__tests__/SettingsPanel.test.tsx` | ~8 |
| Hooks | `hooks/use-media-query.test.ts` | ~6 |
| Lib | `lib/__tests__/game-persistence.test.ts` | ~12 |
| Lib | `lib/__tests__/notation-display.test.ts` | ~5 |
| Lib | `lib/api-client.test.ts` | ~10 |
| Lib | `lib/move-generation.test.ts` | ~15 |
| Stores | `stores/__tests__/auth-store.test.ts` | ~8 |
| Stores | `stores/__tests__/game-store.test.ts` | ~20 |

**Total:** ~233 test statement lines (describe/it/test calls). Per AGENTS.md, 162 tests pass in CI.

### 10.2 Shared Engine Tests

**Framework:** Vitest.

**Test Files (8):** `ai.test.ts`, `board-utils.test.ts`, `clock.test.ts`, `game-engine.test.ts`, `glicko2.test.ts`, `move-generator.test.ts`, `topology.test.ts`, `types.test.ts`.

**Total:** ~201 test cases. Per AGENTS.md, 190 pass in CI.

**Coverage Threshold:** ≥85% (statements, branches, functions, lines).

### 10.3 E2E Tests (Playwright)

**Framework:** Playwright.

**Test Files (9):**

| File | Approximate Tests | Scenarios |
|------|-------------------|-----------|
| `accessibility.spec.ts` | ~5 | ARIA roles, labels, keyboard nav |
| `auth.spec.ts` | ~5 | Login/register flows |
| `gameplay.spec.ts` | ~8 | Board rendering, game controls, piece interaction |
| `home.spec.ts` | ~4 | Home page content, navigation |
| `play-vs-ai.spec.ts` | ~5 | AI game setup and play |
| `profile.spec.ts` | ~4 | Profile page content |
| `responsive.spec.ts` | ~4 | Mobile/tablet layouts |
| `settings.spec.ts` | ~5 | Settings panel interaction |
| `tutorial.spec.ts` | ~5 | Tutorial navigation, board display |

**Total:** ~45 E2E test cases.

---

## 11. Backend API Surface

### 11.1 Endpoint Catalog

#### Authentication (`/api/auth`)

| Method | Route | Request Body | Response | Status Codes |
|--------|-------|-------------|----------|-------------|
| POST | `/api/auth/register` | `{ username, email, password }` | `AuthResponse { userId, username, token, expiresAt }` | 201, 409 |
| POST | `/api/auth/login` | `{ email, password }` | `AuthResponse` | 200, 401 |
| DELETE | `/api/auth/account/{userId}` | — | — | 204 |

#### Player (`/api/player`)

| Method | Route | Request Body | Response | Status Codes |
|--------|-------|-------------|----------|-------------|
| GET | `/api/player/{userId}/profile` | — | `PlayerProfileDto` | 200, 404 |
| GET | `/api/player/{userId}/stats` | — | `PlayerStatsDto` | 200, 404 |
| PATCH | `/api/player/{userId}/display-name` | `{ displayName }` | `PlayerProfileDto` | 200, 404 |
| PATCH | `/api/player/{userId}/avatar` | `{ avatarId }` | `PlayerProfileDto` | 200, 404 |
| GET | `/api/player/{userId}/rating-history` | — | `RatingHistoryDto[]` | 200, 404 |
| GET | `/api/player/{userId}/games` | Query: `page`, `pageSize`, `difficulty`, `result`, `mode` | `GameHistoryResponse { items, totalCount, page, pageSize }` | 200, 404 |

#### AI (`/api/v1/ai`)

| Method | Route | Request Body | Response | Status Codes |
|--------|-------|-------------|----------|-------------|
| POST | `/api/v1/ai/move` | `{ board: int[], currentPlayer, difficulty, timeLimitMs? }` | `{ notation, from, to, capturedSquares, score, depthReached, timeConsumedMs }` | 200, 400, 408, 500 |

#### Games (`/api/v1/games`)

| Method | Route | Request Body | Response | Status Codes |
|--------|-------|-------------|----------|-------------|
| GET | `/api/v1/games/in-progress/{userId}` | — | `InProgressGameDto` or 204 | 200, 204 |
| POST | `/api/v1/games/in-progress/{userId}` | `{ gameState: string }` | `InProgressGameDto` | 200, 400 |
| DELETE | `/api/v1/games/in-progress/{userId}` | — | — | 204 |

#### Settings (`/api/settings`)

| Method | Route | Request Body | Response | Status Codes |
|--------|-------|-------------|----------|-------------|
| GET | `/api/settings/{userId}` | — | `UserSettingsDto` | 200 |
| PUT | `/api/settings/{userId}` | `UpdateSettingsRequest` | `UserSettingsDto` | 200 |

#### Infrastructure

| Method | Route | Response |
|--------|-------|---------|
| GET | `/health` | `{ status: "Healthy" }` |

### 11.2 Backend Middleware

| Middleware | Purpose |
|-----------|---------|
| `CorrelationIdMiddleware` | Adds correlation ID to all responses |
| `GlobalExceptionHandlerMiddleware` | Catches unhandled exceptions, returns structured error JSON |
| CORS | Restricted to configured frontend origins (`AllowCredentials`) |
| Serilog | Structured logging |

### 11.3 Backend Architecture

```
Program.cs → Minimal API endpoints (5 endpoint groups)
           → Application layer (services, interfaces, DTOs, Expert AI engine)
           → Domain layer (entities, value objects, enums)
           → Infrastructure layer (EF Core, repositories)
```

---

## 12. E2E Test Scenarios

| Spec File | Key Scenarios |
|-----------|--------------|
| `home.spec.ts` | Page loads, title present, nav links work, Play Now button |
| `gameplay.spec.ts` | Board renders 50 squares, controls present, can start/click piece, undo/resign/draw buttons exist |
| `play-vs-ai.spec.ts` | Setup dialog opens, can select difficulty, start game against AI |
| `tutorial.spec.ts` | Tutorial loads, steps navigate, boards display correctly |
| `auth.spec.ts` | Login form renders, register form renders, validation works |
| `profile.spec.ts` | Profile page loads, shows stats when authenticated |
| `settings.spec.ts` | Settings panel opens, theme/notation/legal moves toggles work |
| `accessibility.spec.ts` | ARIA roles present, keyboard navigation works, skip link functional |
| `responsive.spec.ts` | Layout adapts at mobile/tablet/desktop breakpoints |

---

## 13. Dependency Mapping

### 13.1 Production Dependencies → Flutter Equivalents

| Current (npm) | Purpose | Flutter Equivalent |
|--------------|---------|-------------------|
| `next` (^16.1.0) | Framework, routing, SSR/SSG | `flutter` SDK + `go_router` or `auto_route` |
| `react` (^19.2.0) | UI rendering | Flutter widget system (built-in) |
| `react-dom` (^19.2.0) | DOM rendering | Flutter rendering engine (built-in) |
| `zustand` (^5.0.11) | State management | `riverpod`, `bloc`, `provider`, or `get_it` + `flutter_hooks` |
| `@international-draughts/engine` | Game engine | **Port to Dart** (recommended) or use `flutter_js` |
| Tailwind CSS (dev) | Utility styling | Flutter `ThemeData` + custom design tokens |
| `@testing-library/react` (dev) | Component testing | `flutter_test` + `golden_toolkit` |
| `vitest` (dev) | Test runner | `flutter_test` (built-in) |
| `playwright` (E2E) | E2E testing | `integration_test` or `patrol` |

### 13.2 Browser APIs Used → Flutter Equivalents

| Browser API | Usage | Flutter Equivalent |
|------------|-------|-------------------|
| `sessionStorage` | Guest game persistence | `shared_preferences` or `hive` |
| `localStorage` | Auth token, user game, config persistence | `shared_preferences`, `flutter_secure_storage` |
| `fetch` | API calls | `http`, `dio`, or `chopper` |
| `navigator.onLine` | Offline detection | `connectivity_plus` |
| `navigator.serviceWorker` | PWA registration | N/A (native app) or `workmanager` |
| `window.matchMedia` | Responsive breakpoints | `MediaQuery`, `LayoutBuilder` |
| `<dialog>.showModal()` | Native modal dialogs | `showDialog()`, `showModalBottomSheet()` |
| `<canvas>` + `requestAnimationFrame` | Victory animation | `CustomPainter` + `AnimationController` |
| `beforeinstallprompt` | PWA install prompt | N/A (app store) |
| `CSS transitions/transforms` | Move animations | `AnimatedPositioned`, `TweenAnimationBuilder`, `CustomPainter` |
| `setInterval` | Clock ticking | `Timer.periodic` or `Ticker` |
| `setTimeout` | AI delay | `Future.delayed` |

### 13.3 Features Requiring No External Dependencies in Flutter

- Board rendering → CustomPainter or Stack + Positioned
- Piece rendering → CustomPainter with gradients
- Drag and drop → `Draggable` + `DragTarget` or `GestureDetector`
- Dark mode → `ThemeMode.system` with `Brightness.dark`
- Responsive layout → `LayoutBuilder`, `MediaQuery`
- ARIA/Accessibility → Flutter `Semantics` widget

---

## 14. Complexity Assessment

### 14.1 Per-Feature Complexity

| Feature | Current Complexity | Migration Difficulty | Notes |
|---------|-------------------|---------------------|-------|
| **Board Rendering** | High | Medium | CustomPainter or grid layout. 10×10 grid with themes, orientation flip. |
| **Piece Rendering** | Medium | Low | CSS gradients → Dart gradient + SVG crown. |
| **Move Animation** | Very High | **High** | 307-line hook with multi-step capture sequencing, position diffing, CSS transitions. Needs `AnimationController` chain in Flutter. |
| **Victory Animation** | Very High | **High** | Canvas physics simulation (gravity, bouncing, trails). Maps to `CustomPainter` + `Ticker`. |
| **Drag & Drop** | High | Medium | Mouse + touch handling. Flutter `GestureDetector` is simpler than raw DOM events. |
| **Game Store** | Very High (1087 LOC) | **High** | Complex state machine with AI scheduling, clock intervals, persistence, board rotation. Core migration challenge. |
| **Auth Store** | Low | Low | Simple JWT management. Direct port. |
| **Game Setup Dialog** | High | Medium | Native `<dialog>` → `showDialog`. Multiple sub-components. |
| **Clock System** | Medium | Low | Clean shared engine module. Timer.periodic equivalent. |
| **Chess Clock UI** | Medium | Low | Two clock faces with animations. `AnimatedContainer` in Flutter. |
| **Move History** | Medium | Low | Scrollable table with paired moves and FMJD notation. ListView in Flutter. |
| **Settings Panel** | Medium | Low | Toggle switches and button grids. Standard Flutter widgets. |
| **Profile Page** | High | Medium | Multiple tabs, API calls, avatar selector modal. |
| **Rating Chart** | Very High | **High** | Pure SVG chart with hover interaction. Needs `CustomPainter` or `fl_chart` package. |
| **Game History** | High | Medium | Paginated list with filters, infinite scroll. |
| **Replay Viewer** | High | Medium | Reuses Board + animation system + playback controls. |
| **Learning Mode** | Very High (838 LOC) | **High** | Full interactive tutorial with 30+ steps, custom board states, goal validation, feedback system. |
| **PWA** | Medium | **Low** | Mostly N/A for native Flutter app. |
| **Shared Engine** | N/A (separate) | **High** | ~2,500 LoC pure TypeScript to port to Dart. Algorithmic accuracy is critical. |
| **API Client** | Low | Low | Simple fetch wrapper → `http`/`dio` client. |
| **Offline Support** | Low | Low | Online/offline detection → `connectivity_plus`. |

### 14.2 Lines of Code Summary

| Area | Approximate LoC |
|------|-----------------|
| Pages (app/) | ~2,200 |
| Components | ~3,500 |
| Stores | ~1,160 |
| Hooks | ~420 |
| Lib/utilities | ~750 |
| **Frontend total** | **~8,030** |
| Shared engine | ~2,500 |
| Tests (frontend) | ~4,000 |
| Tests (shared engine) | ~2,000 |
| E2E tests | ~500 |

---

## 15. Risk Areas

### 15.1 High-Risk Items

| Risk | Description | Mitigation |
|------|------------|------------|
| **Game Engine Accuracy** | Porting 2,500 LoC of FMJD-compliant move generation, alpha-beta AI, and Glicko-2 rating to Dart. Any bug breaks gameplay. | Port module-by-module with comprehensive test parity. Shared engine already has 190 tests — port those first as a validation harness. |
| **Board Orientation / Rotation** | Frontend uses inverted board numbering (White on 1-20); backend uses FMJD standard (White on 31-50). `rotateSquare(s) = 51 - s` is applied at API boundary. | Document the coordinate system clearly. Test rotation logic exhaustively. |
| **Move Animation Fidelity** | The `useMoveAnimation` hook (307 lines) handles multi-leg capture animations, position diffing, and captured piece ghosts. CSS transitions → Flutter `AnimationController` chains. | Build a dedicated `MoveAnimationController` class in Dart. Test with multi-capture scenarios. |
| **Game Store State Machine** | 1,087-line state manager with complex interactions: AI scheduling with generation-based cancellation, clock intervals, auto-persistence, learning mode feedback. | Extract into a well-structured BLoC or Riverpod notifier with clear state transitions. Write exhaustive unit tests. |
| **Expert AI Backend Integration** | Board position encoding uses 180° rotation and integer piece encoding. Expert moves must be de-rotated. | Keep the encoding/decoding logic isolated and thoroughly tested. |

### 15.2 Medium-Risk Items

| Risk | Description | Mitigation |
|------|------------|------------|
| **Drag and Drop** | Current implementation uses raw mousedown/mousemove/mouseup and touchstart/touchmove/touchend events with coordinate-to-square mapping. | Flutter's `GestureDetector` + `Draggable` should simplify this. Test on physical devices. |
| **Victory Canvas Animation** | Canvas-based physics simulation with requestAnimationFrame. | Port to `CustomPainter` + `Ticker`. Lower priority — can be simplified initially. |
| **SVG Rating Chart** | Pure SVG rendering in React. | Use `fl_chart` package or port to `CustomPainter`. |
| **Learning Mode Tutorial Data** | 30+ hardcoded tutorial steps with custom board positions, goal actions, and validation logic (838 lines in learn/page.tsx). | Port as data + logic, not UI-coupled. |
| **Game Persistence Schema** | Serialization format versions and validation. Must be backward-compatible. | Define Dart models with JSON serialization. Use Freezed/json_serializable. |

### 15.3 Low-Risk Items

| Risk | Description |
|------|------------|
| **PWA → Native App** | PWA features (install prompt, service worker) are not needed for native Flutter. |
| **Tailwind → Flutter Theme** | Styling port is mechanical. Flutter theming is more structured. |
| **Next.js Routing → Flutter Routing** | 8 routes with simple navigation. `go_router` handles this easily. |
| **Auth Flow** | Simple JWT storage + login/register forms. Direct port. |
| **Settings Panel** | Standard form controls. Flutter has native equivalents. |
| **Accessibility** | Flutter has built-in `Semantics`. ARIA attributes map directly. |

### 15.4 Migration Order Recommendation

```
Phase 1: Foundation
  ├── Port shared engine to Dart (with all 190 tests)
  ├── Set up Flutter project structure, routing, theme system
  └── Implement API client + auth store

Phase 2: Core Gameplay
  ├── Board rendering (CustomPainter or grid)
  ├── Piece rendering
  ├── Game state management (BLoC/Riverpod)
  ├── Move selection (tap + drag)
  ├── Local AI integration (easy/medium/hard)
  └── Basic game controls (new game, undo, resign)

Phase 3: Full Game Experience
  ├── Move animation system
  ├── Game setup dialog
  ├── Clock system
  ├── Game persistence (local + backend sync)
  ├── Expert AI backend integration
  └── Learning mode

Phase 4: Profile & Polish
  ├── Auth pages (login, register)
  ├── Profile page (stats, rating chart, game history)
  ├── Replay viewer
  ├── Settings panel
  ├── Victory animation
  ├── Offline detection
  └── Dark mode

Phase 5: Testing & QA
  ├── Unit tests (engine, stores, utilities)
  ├── Widget tests (components)
  ├── Integration tests
  └── Accessibility audit
```

---

## Appendix A: File-Level Reference

### Frontend Source Files

```
src/app/globals.css                          (55 lines)
src/app/layout.tsx                           (64 lines)
src/app/page.tsx                             (93 lines)
src/app/page.test.tsx
src/app/play/page.tsx                        (277 lines)
src/app/learn/page.tsx                       (838 lines)
src/app/tutorial/page.tsx                    (152 lines)
src/app/login/page.tsx                       (87 lines)
src/app/register/page.tsx                    (133 lines)
src/app/profile/page.tsx                     (277 lines)
src/app/offline/page.tsx                     (23 lines)
src/components/board/Board.tsx               (115 lines)
src/components/board/BoardSquare.tsx         (76 lines)
src/components/board/BoardPiece.tsx          (59 lines)
src/components/board/AnimatedPieceOverlay.tsx (97 lines)
src/components/board/index.ts                (5 lines)
src/components/clock/ChessClock.tsx          (89 lines)
src/components/clock/index.ts
src/components/game/GameBoard.tsx            (165 lines)
src/components/game/GameControls.tsx         (156 lines)
src/components/game/GameStatus.tsx           (65 lines)
src/components/game/MoveHistory.tsx          (72 lines)
src/components/game/PauseOverlay.tsx         (40 lines)
src/components/game/VictoryAnimation.tsx     (346 lines)
src/components/game/GameConfigSummary.tsx    (65 lines)
src/components/game/MoveFeedback.tsx         (60 lines)
src/components/game/ResumePrompt.tsx         (92 lines)
src/components/game/index.ts
src/components/game/setup/GameSetupDialog.tsx  (230 lines)
src/components/game/setup/OpponentSelector.tsx (58 lines)
src/components/game/setup/DifficultySelector.tsx (75 lines)
src/components/game/setup/ColorPicker.tsx    (62 lines)
src/components/game/setup/TimedModeToggle.tsx  (100 lines)
src/components/game/setup/index.ts
src/components/profile/AvatarSelector.tsx    (65 lines)
src/components/profile/StatsOverview.tsx     (111 lines)
src/components/profile/RatingChart.tsx       (269 lines)
src/components/profile/GameHistory.tsx       (239 lines)
src/components/pwa/InstallPrompt.tsx         (105 lines)
src/components/pwa/OfflineBanner.tsx         (38 lines)
src/components/replay/ReplayViewer.tsx       (163 lines)
src/components/replay/index.ts
src/components/settings/SettingsPanel.tsx    (112 lines)
src/components/settings/index.ts
src/hooks/useMoveAnimation.ts               (307 lines)
src/hooks/use-announcer.ts                   (42 lines)
src/hooks/use-media-query.ts                 (27 lines)
src/stores/game-store.ts                     (1087 lines)
src/stores/auth-store.ts                     (70 lines)
src/lib/api-client.ts                        (118 lines)
src/lib/game-persistence.ts                  (197 lines)
src/lib/game-config-persistence.ts           (90 lines)
src/lib/draughts-types.ts                    (18 lines)
src/lib/move-generation.ts                   (256 lines)
src/lib/notation-display.ts                  (14 lines)
src/lib/dev-logger.ts                        (30 lines)
src/lib/engine/index.ts                      (7 lines)
```

### Shared Engine Source Files

```
src/index.ts
src/types/index.ts, piece.ts, board.ts, move.ts, notation.ts, game-state.ts
src/board/index.ts, topology.ts
src/engine/index.ts, move-generator.ts, board-utils.ts, game-engine.ts
src/ai/index.ts, search.ts, evaluation.ts, difficulty.ts, zobrist.ts, transposition-table.ts, killer-moves.ts
src/clock/index.ts, clock.ts
src/rating/index.ts, glicko2.ts
```
