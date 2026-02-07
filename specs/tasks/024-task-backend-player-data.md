# Task 024: Backend Player Data API

**Feature:** Player Profile, Statistics & Rating  
**Dependencies:** 010-task-backend-auth, 023-task-glicko2-engine  
**FRD Reference:** [player-profile-statistics.md](../features/player-profile-statistics.md)

---

## Description

Implement the backend API endpoints for player profiles, game history, statistics, and Glicko-2 rating management. This includes CRUD operations for player profiles, saving completed game records, computing and storing rating updates, retrieving statistics and rating history, and paginated game history with filtering.

---

## Technical Requirements

### Endpoints

#### Player Profile
- `GET /api/v1/players/me` — Return the authenticated user's profile (display name, avatar, rating, RD, confidence range, member since)
- `PATCH /api/v1/players/me` — Update display name and/or avatar
- Avatar: select from a predefined set of avatar IDs (no file upload in v1)

#### Game Records
- `POST /api/v1/games` — Save a completed game record. Body includes: move history (array of FMJD notation strings), result (win/loss/draw), opponent type (AI difficulty or "local-pvp"), date, time control used (if any), move count.
- `GET /api/v1/games` — List the user's game history with pagination and filtering
  - Filters: game mode (pvc, pvp), difficulty (easy, medium, hard, expert), result (win, loss, draw), date range
  - Pagination: cursor-based or offset-based, default page size 20
- `GET /api/v1/games/{id}` — Get a single game record with full move history (for replay viewer)

#### Statistics
- `GET /api/v1/players/me/stats` — Return computed statistics:
  - Total games, wins, losses, draws, win percentage
  - Per-difficulty breakdown (Easy, Medium, Hard, Expert)
  - Current streak (type + count), best win streak
  - Only PvC games contribute (local PvP excluded from stats)

#### Rating
- `GET /api/v1/players/me/rating` — Return current rating, RD, volatility, and confidence range
- `GET /api/v1/players/me/rating/history` — Return rating history entries (date, rating, RD, game result) for the progression chart. Paginated.
- Rating updates are computed server-side when a game record is saved (triggered by `POST /api/v1/games` for Medium/Hard/Expert PvC games)

### Rating Calculation Flow
- On `POST /api/v1/games`:
  1. Validate the game record
  2. Save the game record
  3. If PvC game against Medium, Hard, or Expert:
     a. Apply RD decay based on time since last rated game
     b. Compute Glicko-2 update using the game result and AI opponent rating
     c. Save the updated rating, RD, volatility
     d. Save a rating history entry
  4. Update statistics counters

### Data Model
- Player profile: user ID → display name, avatar ID, created date
- Game record: ID, user ID, move history (JSON), result, opponent type, difficulty, date, time control, move count
- Rating: user ID → rating, RD, volatility, last game date
- Rating history: user ID, date, rating, RD, game result, opponent
- Statistics: computed from game records (can be materialized or calculated on-demand)

---

## Acceptance Criteria

1. `GET /api/v1/players/me` returns the correct profile with rating and confidence range
2. `PATCH /api/v1/players/me` updates display name and avatar
3. `POST /api/v1/games` saves a game record and triggers a rating update for Medium/Hard/Expert PvC games
4. `POST /api/v1/games` for Easy AI or local PvP does NOT trigger a rating update
5. `GET /api/v1/games` returns paginated results with correct filtering
6. `GET /api/v1/games/{id}` returns full move history for replay
7. `GET /api/v1/players/me/stats` returns correct totals and per-difficulty breakdowns
8. `GET /api/v1/players/me/rating/history` returns chronological rating entries
9. Rating updates match the Glicko-2 engine's calculations
10. RD decay is applied based on days since last rated game
11. All endpoints require authentication; guest tokens return 403
12. Data isolation: users can only access their own data

---

## Testing Requirements

- **Unit tests:**
  - Rating update flow: game saved → decay applied → Glicko-2 calculated → rating stored
  - Statistics computation from game records
  - Filtering logic for game history
  - RD decay calculation based on time elapsed
- **Integration tests:**
  - Full flow: register → play rated game (POST /games) → GET rating (verify update) → GET stats (verify counts) → GET history (verify entry)
  - Easy AI game: POST /games → GET rating (verify NO change)
  - Pagination: create 50+ games, verify pages return correct subsets
  - Filtering: filter by difficulty, result, date range
  - Data isolation: user A cannot access user B's data
- **Contract tests:** OpenAPI spec matches endpoint behavior
- **Minimum coverage:** ≥ 85%
