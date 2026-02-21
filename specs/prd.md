# 📝 Product Requirements Document (PRD)

## International Draughts Game App

**Version:** 1.0  
**Last Updated:** 2026-02-07  
**Status:** Draft

---

## 1. Purpose

There is no modern, polished international draughts (10×10) game app that combines a fun, classy user experience with a genuinely world-class computer opponent. Existing apps suffer from weak AI that experienced players can easily beat, driving them away. This product solves that problem by delivering a beautifully designed, web-first international draughts app with four distinct difficulty levels — culminating in an Expert mode that rivals the strength of championship-winning engines like **Scan** and **KingsRow**. The app serves both casual players looking for fun and competitive players seeking a true challenge.

**Target Users:**

- Casual board game enthusiasts who want a quick, accessible draughts experience
- Competitive draughts players seeking a strong computer opponent to train against
- Social gamers who want to play against friends locally (pass-and-play on the same device)
- Players on the go who want a responsive web app that feels native

---

## 2. Scope

### In Scope

- Fully rule-compliant international draughts (10×10 board, FMJD rules)
- Four AI difficulty levels: Easy, Medium, Hard, Expert
- Expert AI that employs advanced techniques on par with engines like Scan and KingsRow (endgame databases, opening books, learned evaluation, deep search with advanced pruning)
- Player registration and authentication (Microsoft, Apple, Google, Email)
- Guest mode (no account required, no progress saved)
- Player vs. Computer mode
- Player vs. Player mode (local pass-and-play on the same device)
- Glicko-2 player rating system for registered users (PvC games only)
- Customizable settings (board theme, piece style, sound, move hints, notation display, timed mode)
- Timed mode following FMJD competition time control conventions
- English language UI
- Web application deployable to Azure with progressive web app (PWA) capabilities for future native app conversion
- Player profiles, statistics, and game history (for registered users)

### Out of Scope

- Native mobile apps (iOS/Android) — the web app will be built as a PWA to enable future wrapping into native apps
- Other draughts variants (English/American checkers, Turkish draughts, Frisian draughts, etc.) — international rules only for v1
- Tournament/league organization features
- In-app purchases or monetization
- Real-money wagering
- Offline computer opponent at Expert level (Expert requires server-side compute)
- Online PvP via network — v1 PvP is local pass-and-play only; online play is a post-v1 consideration
- Chat or messaging between players beyond game context
- Spectator mode
- Public leaderboard or competitive ranking — ratings are private/self-improvement only for v1

---

## 3. Goals & Success Criteria

### Business Goals

| Goal | Description |
|------|-------------|
| G1 – Deliver a best-in-class AI | The Expert computer opponent must be strong enough that an experienced club-level player cannot consistently beat it. This is the #1 priority. |
| G2 – Fun & classy user experience | The app must feel polished and premium — elegant board visuals, smooth animations, satisfying interactions — while remaining intuitive for newcomers. |
| G3 – Player retention | Registered users should return regularly, tracked via profiles, statistics, and progression. |
| G4 – Cross-platform readiness | Build on a stack that enables future conversion to native mobile apps with minimal rework. |
| G5 – Scalable deployment | Deploy to Azure with the ability to scale compute for the AI engine as the player base grows. |

### Success Criteria

| Metric | Target |
|--------|--------|
| Expert AI win rate vs. casual players | > 95% |
| Expert AI draw/win rate vs. experienced club players | > 80% (draws count as success) |
| Rule compliance | 100% — all FMJD international draughts rules correctly implemented and verified |
| Page load time | < 3 seconds on a typical broadband connection |
| AI response time (Easy–Hard) | < 2 seconds per move |
| AI response time (Expert) | Configurable, up to 30 seconds per move |
| Authentication success rate | > 99% across all login methods |
| Monthly active returning users (6 months post-launch) | > 1,000 |
| App Lighthouse score (PWA) | > 90 for Performance, Accessibility, Best Practices |

---

## 4. High-Level Requirements

### 4.1 Game Rules — International Draughts (FMJD)

- **[REQ-1]** The game is played on a 10×10 board using only the 50 dark squares, with the lower-left corner being a dark square.
- **[REQ-2]** Each player starts with 20 pieces placed on the first four rows closest to them, leaving two central rows empty.
- **[REQ-3]** The player with the light (white) pieces moves first; turns alternate.
- **[REQ-4]** Ordinary pieces (regular pieces) move one square diagonally forward to an unoccupied square when not capturing.
- **[REQ-5]** Captures are mandatory. Regular pieces can capture forward or backward by jumping over an enemy piece to an unoccupied square immediately beyond.
- **[REQ-6]** When multiple captures are possible, the player must execute the capture sequence that takes the maximum number of opponent pieces.
- **[REQ-7]** In a multi-jump sequence, jumped pieces are removed only after the entire sequence is complete. The same piece cannot be jumped more than once in a single sequence.
- **[REQ-8]** A regular piece is promoted to a king when it stops on the opponent's back row at the end of its turn.
- **[REQ-9]** Kings ("flying kings") can move any number of squares diagonally in any direction to an unoccupied square when not capturing.
- **[REQ-10]** Kings can capture by jumping over an opponent's piece at any distance, landing on any unoccupied square beyond it, and must still capture the maximum number of pieces possible.
- **[REQ-11]** A player loses when they have no valid moves (no pieces remaining, or all pieces blocked).
- **[REQ-12]** A draw occurs when: the same position with the same player to move occurs for the third time; OR only kings remain for both sides; OR 25 consecutive moves pass with only king moves and no captures; OR three kings (or two kings + one regular piece, or one king + two regular pieces) vs. one king endgame lasts 16 moves per player without resolution.
- **[REQ-13]** The game must use the standard FMJD board notation system (squares numbered 1–50).
- **[REQ-14]** All legal moves must be visually highlighted when a player selects a piece to move, including mandatory capture paths.

### 4.1.1 FMJD Rules Compliance

> **Quality Gate:** All FMJD International Draughts rules must be 100% accurately implemented across every platform (web frontend, shared engine, Flutter mobile app, backend C# engine). Rule-compliance verification is a mandatory CI gate — no release may ship with a known rule violation.

#### Confirmed Correct Implementations

The following FMJD rules have been audited and confirmed correct in the shared TypeScript engine and the Flutter mobile Dart engine:

| Rule | Status |
|------|--------|
| 10×10 board, 50 dark squares numbered 1–50 | ✅ Correct |
| 20 pieces per player on first four rows | ✅ Correct |
| Regular piece forward-only non-capture movement | ✅ Correct |
| Flying kings (any distance, any diagonal direction) | ✅ Correct |
| Mandatory captures with maximum capture rule | ✅ Correct |
| Forward and backward captures for men | ✅ Correct |
| Pieces removed only after entire capture sequence completes | ✅ Correct |
| No jumping the same piece twice in one sequence | ✅ Correct |
| King flying captures (any distance) | ✅ Correct |
| Promotion only when stopping on back row at end of turn (not mid-capture) | ✅ Correct |
| Threefold repetition detection (logic correct; see BUG-002 for hash issue) | ✅ Logic correct |
| 25-move king-only draw rule | ✅ Correct |
| 16-move endgame draw rule (3K v 1K, 2K+1M v 1K, 1K+2M v 1K) | ✅ Correct |
| No pieces / no legal moves = loss | ✅ Correct |

#### Critical Known Issues (Flutter Mobile App)

The following bugs were identified during a compliance audit of the Flutter mobile app (`mobile/`) and must be resolved before the mobile app ships:

| Bug ID | Title | Severity | Description |
|--------|-------|----------|-------------|
| **BUG-001** | Board widget crash on multi-step captures | **P0 — Crash** | `board_widget.dart` uses a display-format parser to read internal serialization format, causing `FormatException` on any capture sequence with 2+ steps. Multi-step captures are core FMJD gameplay — this makes many legal positions unplayable. |
| **BUG-002** | Position hash collisions cause false threefold-repetition draws | **P0 — Rule violation** | The Zobrist-style hash function uses base 67 but coefficients go up to 254, causing hash collisions between distinct positions. Games are incorrectly declared drawn when no threefold repetition has occurred. This violates REQ-12 and C5. |
| **BUG-003** | Game config lost on game over → undo falls back to wrong config | **P1 — Data corruption** | After a game ends, calling `undoMove` falls back to a hardcoded default config (`vsAi`, `medium`, `white`) instead of preserving the actual `GameConfig` from the running game. This corrupts the game state for any post-game undo/review. |
| **BUG-004** | King capture path ambiguity — wrong captured pieces | **P1 — Rule violation** | When multiple capture paths share the same origin and destination squares but capture different intermediate pieces, the UI silently picks the first match. The player has no way to choose which path to take, potentially resulting in the wrong pieces being captured. This violates FMJD's maximum-capture rules and player agency. |

#### Acceptance Criteria for Rule Compliance

- **[AC-FMJD-1]** Every FMJD rule listed in REQ-1 through REQ-14 must have at least one automated test in every engine implementation (shared TypeScript, Flutter Dart, backend C#).
- **[AC-FMJD-2]** All four bugs (BUG-001 through BUG-004) must be resolved and verified by automated regression tests before the Flutter mobile app is released.
- **[AC-FMJD-3]** Multi-step capture sequences of any length (2, 3, 4+ steps) must render correctly and not crash on any platform.
- **[AC-FMJD-4]** Position hashing must be collision-free for all positions reachable in a standard game (verified by automated test with ≥10,000 distinct positions).
- **[AC-FMJD-5]** Game configuration must be preserved across all game lifecycle transitions (setup → in-progress → game-over → undo/review).
- **[AC-FMJD-6]** When multiple capture paths exist with the same origin/destination but different captured pieces, the UI must present an unambiguous disambiguation mechanism allowing the player to choose the intended path.
- **[AC-FMJD-7]** Cross-platform parity: the shared engine (TypeScript), Dart engine (Flutter), and C# engine (backend) must produce identical legal-move sets and game outcomes for any given board position.

#### Mobile UI/UX Issues (Flutter Mobile App)

A comprehensive UI/UX audit of the Flutter mobile app identified 26 issues (6 High, 9 Medium, 11 Low) covering layout overflow, broken navigation, missing accessibility labels, Material 3 non-compliance, and board theme propagation failures. These must be resolved to meet REQ-44 (elegant design), REQ-45 (legibility), REQ-46 (responsive design), and REQ-48 (accessibility).

> **Full specification:** See [Mobile UI/UX Improvements FRD](features/mobile-ui-improvements.md) for the complete issue catalog, acceptance criteria, and implementation plan.

### 4.2 AI / Computer Opponent

- **[REQ-15]** Four difficulty levels with clearly differentiated playing strength:
  - **Easy:** Suitable for beginners; makes occasional suboptimal moves on purpose; limited look-ahead.
  - **Medium:** Suitable for casual players; plays solidly but misses complex tactics; moderate look-ahead.
  - **Hard:** Suitable for experienced players; plays strong positional and tactical draughts; deep look-ahead with advanced evaluation.
  - **Expert:** Near-engine-championship level; must employ techniques used by world-class engines.
- **[REQ-16]** The Expert AI must aspire to championship-engine-level play (inspired by Scan and KingsRow), delivered in phases:
  - **v1 (launch):** The Expert AI must play at a level that consistently beats casual and intermediate players and challenges experienced club players. It must use deep search with a strong evaluation function covering key positional concepts (centre control, piece mobility, king safety, left/right balance, locked positions, runaway threats).
  - **v1.1+ (post-launch enhancements):**
    - **Endgame databases:** Perfect play in endgame positions with up to 6 pieces, yielding guaranteed win/loss/draw outcomes.
    - **Opening book:** A curated library of strong opening lines covering mainstream theory.
    - **Learned/trained evaluation:** Position evaluation refined through machine learning techniques (pattern-based or neural network) rather than purely hand-tuned weights.
    - **Advanced search enhancements:** Aspiration windows, singular extensions, and deeper pruning strategies to reach championship-level depth.
  - **Ongoing:** The AI strength must be measurably improving across releases.
- **[REQ-17]** The AI must play correctly under time control when timed mode is enabled, managing its allocated time intelligently across the game.
- **[REQ-18]** The AI must never make an illegal move and must enforce all capture obligations and maximum-capture rules.

### 4.3 Authentication & Player Management

- **[REQ-19]** User registration and login via four methods: Microsoft Account, Apple ID, Google Account, and Email/Password.
- **[REQ-20]** First-time users are prompted to register or continue as a guest on the app's landing screen.
- **[REQ-21]** Guest mode allows full gameplay (all modes and difficulties) but no data (game history, statistics, rating) is persisted across sessions. There is no guest-to-registered data conversion — if a guest later creates an account, they start fresh.
- **[REQ-22]** Registered users have a persistent player profile that stores their display name, avatar, game history, win/loss/draw statistics, and Glicko-2 rating (see Section 4.13).
- **[REQ-23]** Users must be able to link additional login methods to their existing account.
- **[REQ-24]** Users must be able to delete their account and all associated data.

### 4.4 Game Modes

- **[REQ-25]** **Player vs. Computer (PvC):** The player selects a difficulty level and plays against the AI. The player can choose to play as white or black.
- **[REQ-26]** **Player vs. Player (PvP — Local):** Two players play on the same device using pass-and-play (players take turns on a shared screen). The board automatically rotates or presents a neutral orientation between turns. Online PvP via invite links or matchmaking is a potential post-v1 enhancement.
- **[REQ-27]** Players can resign, offer a draw, or request to undo a move (with opponent approval in PvP).
- **[REQ-28]** A game can be paused and resumed later (both PvC and local PvP). For registered users, paused game state is saved. For guests, the game is recoverable only within the current browser session.
- **[REQ-29]** Completed games can be reviewed move-by-move in a replay viewer (for registered users).

### 4.5 Timed Mode

- **[REQ-30]** An optional timed mode can be enabled in settings, applying to both PvC and PvP games.
- **[REQ-31]** Time controls must follow FMJD conventions. Supported time control formats:
  - **Fischer increment:** A base time plus a per-move increment (e.g., 60 minutes + 30 seconds per move).
  - **Simple countdown:** A total time per player for the entire game (e.g., 5 minutes, 10 minutes, 30 minutes).
  - **Rapid/Blitz presets:** Pre-configured quick time control options.
- **[REQ-32]** A visible, prominent clock display for each player's remaining time during timed games.
- **[REQ-33]** A player whose time runs out loses the game (if the opponent has sufficient material to theoretically win; otherwise the game is drawn).

### 4.6 Settings & Customization

- **[REQ-34]** **Board Theme:** Choice of board color schemes (e.g., Classic wood, Dark, Ocean, Tournament green).
- **[REQ-35]** **Piece Style:** Choice of piece visuals (e.g., Flat, 3D, Classic, Modern minimalist).
- **[REQ-36]** **Sound Effects:** Toggle on/off; volume control. Sounds for: piece placement, capture, king promotion, game end, clock warning.
- **[REQ-37]** **Move Animation Speed:** Adjustable from instant to slow.
- **[REQ-38]** **Show Legal Moves:** Toggle highlight of legal moves when a piece is selected.
- **[REQ-39]** **Show Board Notation:** Toggle display of square numbers (1–50) on the board.
- **[REQ-40]** **Show Move History:** Toggle display of the move list panel using standard notation.
- **[REQ-41]** **Timed Mode:** Enable/disable; configure time control format and duration.
- **[REQ-42]** **Confirm Move:** Toggle a confirmation step before committing a move (helpful for beginners).
- **[REQ-43]** **Promotion Animation:** Toggle a visual celebration animation when a regular piece is promoted to king.

### 4.7 User Interface & Experience

- **[REQ-44]** The visual design must be elegant, classy, and modern — think premium chess apps, not cartoon-style games. Clean typography, subtle animations, muted color palette with rich accent colors.
- **[REQ-45]** The board and pieces must be clearly legible at all screen sizes, from mobile phones to desktop monitors.
- **[REQ-46]** Responsive design: the app adapts to portrait (mobile) and landscape (desktop) orientations.
- **[REQ-47]** Smooth drag-and-drop and tap-to-move piece interaction.
- **[REQ-48]** The app must be fully accessible: keyboard navigation, screen reader support, sufficient color contrast (WCAG 2.1 AA).
- **[REQ-49]** All UI text is in English.
- **[REQ-50]** A clear and unobtrusive onboarding flow for first-time users that explains the game basics (optional, skippable).
- **[REQ-51]** Visual and/or audio feedback for mandatory captures to help players understand the rules.
- **[REQ-52]** Last-move indicator: visually highlight the most recent move on the board.

### 4.8 Deployment & Infrastructure

- **[REQ-53]** The application must be deployed to **Azure** (Azure App Service, Azure Static Web Apps, or Azure Container Apps as appropriate).
- **[REQ-54]** The app must be delivered as a **Progressive Web App (PWA)** so that users can install it on their devices and, in the future, it can be wrapped into native apps.
- **[REQ-55]** The AI engine (especially Expert mode) may run server-side to ensure strength and protect the engine's evaluation data.
- **[REQ-56]** The system must support at least 500 concurrent users at launch (primarily for authentication, player data, and Expert AI compute) with the ability to scale horizontally.
- **[REQ-57]** All player data and authentication must be handled securely, with encrypted communication (HTTPS/TLS) and secure token-based sessions.

### 4.9 Game State & Data Flow

- **[REQ-58]** The system must maintain a complete game state at all times, including: board position (which pieces are where and their type), current player to move, captured pieces, move history in standard notation, and game phase (in-progress, completed, drawn, resigned).
- **[REQ-59]** For draw-rule enforcement, the system must track: a full position history for threefold-repetition detection, a counter for consecutive king-only moves (for the 25-move rule), and piece counts per side for endgame draw rules (REQ-12).
- **[REQ-60]** All game state (PvC and local PvP) is managed client-side, with server-side communication only required for Expert AI move computation.
- **[REQ-61]** For registered users, completed game records (move history, result, opponent, date, time control used) must be stored and retrievable for the replay viewer and statistics features.
- **[REQ-62]** Player settings and preferences (REQ-34 through REQ-43) must persist across sessions for registered users. For guests, settings persist only within the current browser session.

### 4.10 Error Handling & Edge Cases

- **[REQ-63]** If the connection to the server is lost during an Expert AI game, the player must be notified and given the option to retry, switch to Hard difficulty (client-side), or save and exit.
- **[REQ-64]** If the server-side AI (Expert mode) fails to return a move within a reasonable timeout, the system must notify the player and offer options (retry, switch to Hard difficulty, or end the game).
- **[REQ-65]** _(Removed — PvP is local; no network disconnect or inactivity abandonment applies.)_
- **[REQ-66]** The system must gracefully handle browser/tab closure during a PvC game — the game state should be recoverable when the user returns (for registered users).
- **[REQ-67]** All user-facing errors must display clear, non-technical messages with actionable next steps.

### 4.11 API & Communication

- **[REQ-68]** The system must expose backend endpoints for: authenticating users, computing AI moves (Expert mode), and storing/retrieving player data (profiles, game history, statistics, ratings).
- **[REQ-69]** _(Removed — PvP is local pass-and-play; no real-time server communication is needed for PvP.)_
- **[REQ-70]** AI move requests must include the full board position and return the computed move. The client must not depend on the server maintaining session state between moves (stateless AI requests).

### 4.12 AI Difficulty Scaling Strategy

- **[REQ-71]** Each difficulty level must be clearly differentiated in perceived strength. The system must provide a mechanism to tune difficulty without code changes (e.g., configurable search depth limits, evaluation noise, and move selection randomness per level).
- **[REQ-72]** Easy and Medium AI must feel fair and fun, not just "stupid." Lower difficulties should make human-like mistakes (e.g., occasionally missing a multi-capture, or preferring simpler moves) rather than playing random moves.
- **[REQ-73]** The AI must never make an illegal move at any difficulty level. Difficulty is controlled by search depth, evaluation quality, and deliberate imprecision — never by breaking the rules.

### 4.13 Player Rating System

- **[REQ-74]** The system must implement a Glicko-2-based rating system for registered players. Glicko-2 is preferred over classic Elo because it tracks rating confidence (Ratings Deviation / RD) and rating volatility, enabling faster convergence for new players and graceful handling of returning inactive players.
- **[REQ-75]** New registered players start with a default rating of **1500**, a Ratings Deviation (RD) of **350** (indicating high uncertainty), and a default volatility of **0.06**.
- **[REQ-76]** Player ratings are updated after each completed PvC game against Medium, Hard, and Expert AI. Games against Easy AI do not affect ratings (to prevent farming). Each AI difficulty level has a fixed rating used for calculation:
  - **Medium AI:** Rating 1200 (RD 0, fully known strength)
  - **Hard AI:** Rating 1800 (RD 0)
  - **Expert AI:** Rating 2200 (RD 0)
  - These AI ratings are configurable and should be calibrated based on observed win rates after launch.
- **[REQ-77]** A player's RD increases over time during periods of inactivity (one rating period = one day). After extended inactivity, the RD gradually returns toward the initial value of 350, reflecting growing uncertainty about the player's current skill.
- **[REQ-78]** The player's rating, RD, and a human-readable confidence range (e.g., "1620 ± 85") must be displayed on the player's profile.
- **[REQ-79]** The system must maintain a game-by-game rating history so that players can see their rating progression over time (e.g., as a line chart on their profile page).
- **[REQ-80]** A win counts as score 1.0, a draw as 0.5, and a loss as 0.0 for the Glicko-2 calculation. Draws in draughts are common and must be properly handled by the rating algorithm.
- **[REQ-81]** Ratings are for informational and self-improvement purposes only. There is no public leaderboard in v1. A leaderboard may be added in future versions if the player base grows.
- **[REQ-82]** Guest players do not have ratings. Ratings are only tracked for registered users.

---

## 5. User Stories

### Authentication & Onboarding

```gherkin
As a new user, I want to sign up using my Google account, so that I can start playing quickly without creating a new password.
```

```gherkin
As a returning user, I want to log in with my Microsoft account, so that I can access my game history and statistics.
```

```gherkin
As a casual user, I want to play as a guest without registering, so that I can try the game before committing to an account.
```

```gherkin
As a guest user, I want to be prompted to create an account after my first game, so that I can save my progress if I enjoyed the experience.
```

```gherkin
As a registered user, I want to link my Apple ID to my existing email account, so that I can log in using either method.
```

### Player vs. Computer

```gherkin
As a beginner, I want to play against the Easy AI, so that I can learn the rules and build confidence without being overwhelmed.
```

```gherkin
As a casual player, I want to select Medium difficulty, so that I get a fair challenge without needing to think 10 moves ahead.
```

```gherkin
As an experienced player, I want to play against the Expert AI, so that I can test my skills against a near-championship-level opponent.
```

```gherkin
As a player, I want to choose whether I play as white or black, so that I can practice both sides of the board.
```

```gherkin
As a player, I want to undo my last move in a game against the computer, so that I can learn from mistakes without restarting the whole game.
```

### Player vs. Player (Local)

```gherkin
As a player, I want to start a local PvP game on my device, so that I can play draughts face-to-face with a friend using pass-and-play.
```

```gherkin
As a player in a local PvP game, I want the board to display in a neutral orientation (or rotate between turns), so that both players can see the board from their perspective.
```

```gherkin
As a player in a local PvP game, I want to offer a draw to my opponent, so that we can agree to end a drawn-out game.
```

### Timed Mode

```gherkin
As a competitive player, I want to enable a Fischer-increment clock (e.g., 5min + 5sec/move), so that I can practice under tournament-like time pressure.
```

```gherkin
As a player, I want to see both clocks prominently during a timed game, so that I can manage my time effectively.
```

```gherkin
As a player, I want to hear a warning sound when my clock falls below 30 seconds, so that I know I need to move faster.
```

### Settings & Customization

```gherkin
As a player, I want to change the board theme to dark wood, so that the game looks the way I like it.
```

```gherkin
As a player, I want to toggle the display of square numbers, so that I can learn the standard notation system.
```

```gherkin
As a player, I want to adjust move animation speed, so that fast animations don't distract me or slow animations don't bore me.
```

```gherkin
As a beginner, I want to enable "show legal moves" and "confirm move", so that I avoid making mistakes while learning.
```

### Error & Connection Handling

```gherkin
As a player using Expert AI, I want to be informed if the AI is taking longer than expected, so that I don't think the app is frozen.
```

```gherkin
As a registered user, I want my in-progress game to be saved if I accidentally close the browser, so that I can resume where I left off.
```

### Statistics & Progress

```gherkin
As a registered user, I want to see my win/loss/draw record per difficulty level, so that I can track my improvement over time.
```

```gherkin
As a registered user, I want to replay completed games move-by-move, so that I can analyze my performance.
```

```gherkin
As a registered user, I want to see my Glicko-2 rating and its confidence range, so that I understand my current skill level.
```

```gherkin
As a registered user, I want to see a chart of my rating progression over time, so that I can see whether I am improving.
```

---

## 6. Assumptions & Constraints

### Assumptions

- **[A1]** Users have a modern web browser (Chrome, Firefox, Safari, Edge — latest two major versions) with JavaScript enabled.
- **[A2]** Users have a stable internet connection for Expert AI (which computes server-side). PvP is local and does not require an internet connection. Easy–Hard AI also run client-side without needing internet.
- **[A3]** The Expert AI engine will run server-side due to the computational demands of deep search with endgame databases. Easy–Hard AI can run client-side for responsiveness.
- **[A4]** The app will initially target English-speaking markets; internationalization can be added in future versions.
- **[A5]** A PWA approach is sufficient for v1; native app wrappers (Capacitor, etc.) can be pursued post-launch if needed.
- **[A6]** Endgame databases for up to 6 pieces are feasible to bundle/serve; larger databases (8–10 pieces) would be aspirational for future versions.
- **[A7]** The initial opening book will cover mainstream opening theory. The exact size will depend on available curated data; a minimal viable book of the most common opening lines is acceptable for v1, with expansion over time.

- **[A8]** All four authentication providers (Microsoft, Apple, Google, Email) are required at launch per user request. Integration timelines for each provider's approval process must be accounted for in the project plan.

### Constraints

- **[C1]** The Expert AI engine size (endgame databases, opening book, evaluation weights) may require significant server-side storage (potentially 2+ GB in RAM per engine instance). Deployment architecture must account for this.
- **[C2]** The app must comply with GDPR and applicable privacy regulations for player data handling.
- **[C3]** Authentication providers (Microsoft, Apple, Google) each have their own integration requirements and approval processes that must be followed.
- **[C4]** Azure is the required hosting platform.
- **[C5]** The game rules must be 100% FMJD-compliant — no shortcuts or simplifications that deviate from the official rules.
- **[C6]** All content must be in English for v1.
- **[C7]** The application must be built with a stack that supports future native mobile app creation (e.g., React/Next.js with Capacitor, or similar PWA-to-native pathways).

### Technical Feasibility Notes

> These notes are added by the Dev Lead review to flag areas where the PRD has feasibility risks or needs clarification.

- **[TF-1] Expert AI is a multi-month effort.** Building a genuinely championship-level engine from scratch (REQ-16) is one of the hardest problems in game AI. Scan took years of development by a world-class programmer. The PRD should acknowledge a **phased approach**: launch with a strong (but not championship-level) Expert AI, then iteratively strengthen it. An MVP Expert can use deep alpha-beta search with a hand-tuned evaluation; learned evaluation, endgame databases, and opening books can be layered on in subsequent releases.
- **[TF-2] Endgame databases are large.** 6-piece endgame bitbases for 10×10 draughts are ~700 MB–2 GB. Serving these per-user server-side is expensive. The deployment architecture must account for shared, read-only endgame data loaded once per engine instance, not per session.
- **[TF-3] Client-side AI (Easy–Hard) is feasible.** Modern browsers running WebAssembly or optimized JavaScript can comfortably handle alpha-beta search at limited depths. This is well-proven and low risk.
- **[TF-4] REQ-12 draw rules require careful state tracking.** Threefold repetition requires a full position history. The 25-move king-only rule and the 16-move endgame rule require dedicated move counters. These are not trivial and must be specified as explicit game-state tracking requirements.
- **[TF-5] PvP is local pass-and-play (REQ-26).** This is the simplest possible PvP implementation — no networking, no matchmaking, no real-time sync. This dramatically reduces infrastructure complexity. Online PvP can be added as a future enhancement if demand warrants it.
- **[TF-6] Four OAuth providers (REQ-19) is high integration overhead for launch.** Consider launching with Google + Email, then adding Microsoft and Apple in a fast-follow. The PRD currently requires all four at launch.
