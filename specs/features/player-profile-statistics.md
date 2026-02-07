# Feature: Player Profile, Statistics & Rating

**Feature ID:** `player-profile-statistics`  
**PRD Version:** 1.0  
**Last Updated:** 2026-02-07  
**Status:** Draft

---

## 1. Purpose

Give registered players a persistent profile with meaningful statistics, game history, a Glicko-2 skill rating, and a replay viewer — so that they can track their improvement over time, review past games, and understand their current skill level. This feature directly supports business goal G3 (Player retention) by giving players reasons to return.

---

## 2. PRD Traceability

| Requirement | Description | Coverage |
|-------------|-------------|----------|
| REQ-22 | Persistent profile: display name, avatar, history, stats, Glicko-2 rating | Player profile |
| REQ-29 | Replay viewer: step through completed games move-by-move | Game replay |
| REQ-61 | Completed game records: move history, result, opponent, date, time control | Game records |
| REQ-74 | Glicko-2 rating system for registered players | Rating algorithm |
| REQ-75 | Initial rating: 1500, RD: 350, volatility: 0.06 | Rating defaults |
| REQ-76 | Ratings updated after PvC games vs. Medium/Hard/Expert (not Easy). AI fixed ratings: Medium=1200, Hard=1800, Expert=2200 | Rating triggers |
| REQ-77 | RD increases over inactivity (rating period = 1 day) | Rating decay |
| REQ-78 | Profile displays rating, RD, and confidence range (e.g., "1620 ± 85") | Rating display |
| REQ-79 | Game-by-game rating history and progression chart | Rating history |
| REQ-80 | Scoring: win=1.0, draw=0.5, loss=0.0 for Glicko-2 | Score mapping |
| REQ-81 | Ratings are private/self-improvement only — no public leaderboard in v1 | Privacy |
| REQ-82 | Guest players do not have ratings | Guest exclusion |

---

## 3. Inputs

- Completed game results (from Game Modes & Lifecycle): winner, game mode, difficulty, move count, time control, date
- Completed game move history (from Game Modes & Lifecycle)
- User profile data (from Authentication)
- Time since last game (for RD decay calculation)

---

## 4. Outputs

- Player profile page: display name, avatar, rating with confidence range, stats breakdown
- Statistics dashboard: win/loss/draw per difficulty level, total games played, streaks
- Rating progression chart (line chart over time)
- Game history list with filtering
- Replay viewer: step-through of any completed game

---

## 5. Dependencies

| Direction | Feature | Relationship |
|-----------|---------|-------------|
| Upstream | Authentication | Provides user identity; only registered users have profiles |
| Upstream | Game Modes & Lifecycle | Provides completed game records and results |
| Upstream | Game Rules Engine | Replay viewer replays recorded moves on the board |
| Downstream | Backend API & Deployment | Profile, stats, rating, and game history stored server-side |

---

## 6. Feature Detail

### Player Profile

- **Display name:** User-chosen name, editable. Shown on the profile page and during games.
- **Avatar:** User-selected or auto-generated avatar image. Does not need to support photo upload in v1 — a set of pre-made avatar options is sufficient.
- **Rating display:** Current Glicko-2 rating with RD expressed as a confidence range (e.g., "1620 ± 85"). Explanation text: "Your skill rating. The range narrows as you play more games."
- **Member since:** Date the account was created.

### Statistics Dashboard

- **Overall stats:** Total games played, total wins, losses, draws, win percentage.
- **Per-difficulty stats:** Win/loss/draw record broken down by Easy, Medium, Hard, Expert.
- **Current streak:** Current win/loss streak.
- **Best streak:** Longest win streak ever.
- **Stats scope:** Only PvC games contribute to statistics. Local PvP games are recorded in history but do not affect stats or rating.

### Glicko-2 Rating System

- **Algorithm:** Glicko-2 as defined by Mark Glickman. Public domain algorithm.
- **Initial values:** Rating = 1500, RD = 350, Volatility (σ) = 0.06.
- **Rating triggers:** Rating is updated after each completed PvC game against Medium, Hard, or Expert AI. Easy AI games do not affect the rating (to prevent farming).
- **AI opponent ratings (fixed):**
  - Medium AI: 1200 (RD = 0)
  - Hard AI: 1800 (RD = 0)
  - Expert AI: 2200 (RD = 0)
  - These values are configurable and should be calibrated post-launch based on observed win rates.
- **Scoring:** Win = 1.0, Draw = 0.5, Loss = 0.0.
- **RD decay:** One rating period = one day. RD increases during inactivity, gradually returning toward the initial RD of 350. This means a player who returns after a long absence has higher uncertainty in their rating, allowing for faster convergence.
- **Volatility:** Measures how erratic a player's results are. Consistent performers have low volatility; players with streaky results have higher volatility.
- **No leaderboard:** Ratings are private. Each player sees only their own rating. No public ranking in v1.
- **Guest exclusion:** Guests do not have ratings. Rating calculations only apply to registered users.

### Rating History & Progression

- **Game-by-game history:** Each rating update (new rating, RD, date, game result) is recorded.
- **Progression chart:** A line chart on the profile page showing rating over time (x-axis: date, y-axis: rating). The confidence range (±1.96 × RD) can optionally be shown as a shaded band around the line.

### Game History

- **List view:** All completed games listed with: date, opponent (AI difficulty or "Local PvP"), result (win/loss/draw), move count, time control used (if any).
- **Filtering:** Users can filter by game mode (PvC / PvP), difficulty level, result, and date range.
- **Detail view / Replay:** Tapping a game opens the replay viewer.

### Replay Viewer

- **Step-through:** Forward and backward buttons to step through the game move by move.
- **Board display:** The board renders each position using the game rules engine's state representation.
- **Move list:** The full move list is displayed alongside the board, with the current move highlighted.
- **Read-only:** The replay viewer does not allow modifying the game.

---

## 7. Acceptance Criteria

### Profile
1. **Profile displays correctly:** A registered user's profile page shows their display name, avatar, Glicko-2 rating with confidence range, and member-since date.
2. **Edit display name:** A user can change their display name and the change is reflected immediately.
3. **Avatar selection:** A user can select from a set of pre-made avatars.

### Statistics
4. **Overall stats:** Total games, wins, losses, draws, and win percentage are displayed accurately.
5. **Per-difficulty stats:** Win/loss/draw counts are correctly broken down by Easy, Medium, Hard, Expert.
6. **Streak tracking:** Current and best win streaks are displayed and update correctly after each game.
7. **PvC only:** Only PvC game results contribute to statistics. Local PvP results appear in game history but not in stats.

### Rating
8. **Initial rating:** A newly registered player has a rating of 1500, RD of 350, and volatility of 0.06.
9. **Rating updates after Medium/Hard/Expert:** Completing a game against Medium, Hard, or Expert AI updates the player's Glicko-2 rating.
10. **No rating change for Easy:** Completing a game against Easy AI does not change the player's rating.
11. **Rating display:** The profile shows the rating and confidence range (e.g., "1620 ± 85").
12. **RD increases with inactivity:** After a period of no games, the player's RD increases, and the confidence range widens.
13. **Rating convergence:** A player who plays many games sees their RD decrease (confidence range narrows), reflecting increasing certainty about their skill level.
14. **Draws handled correctly:** A draw against the AI results in a score of 0.5 in the Glicko-2 calculation, and the rating adjusts accordingly.

### Rating History
15. **Progression chart:** The profile page shows a rating history chart. Rating changes over time are plotted correctly.
16. **Game-by-game history:** Each rating update includes the date, result, and new rating.

### Game History & Replay
17. **Game list:** All completed games appear in the history list with correct metadata.
18. **Filtering:** The user can filter games by mode, difficulty, result, and date range, and the list updates accordingly.
19. **Replay viewer:** Opening a completed game from the history shows the replay viewer. Forward/backward buttons step through moves correctly. The board displays the correct position at each step.

---

## 8. Technical Constraints

- Glicko-2 calculation can run server-side (during game result processing) or client-side (with server validation). The result must be stored server-side.
- Game history storage must be efficient — potentially thousands of games per user over time. Pagination/lazy loading may be needed.
- The rating progression chart should render performantly with up to several hundred data points.

---

## 9. Open Questions

- Should the pre-made avatar set be illustrated characters, abstract icons, or draughts-themed images?
- Should the rating progression chart show the RD confidence band, or just the rating line?
- Should game history be exportable (e.g., as PDN — Portable Draughts Notation)?
