# Task 025: Frontend Player Profile & Statistics Pages

**Feature:** Player Profile, Statistics & Rating  
**Dependencies:** 002-task-frontend-scaffolding, 024-task-backend-player-data  
**FRD Reference:** [player-profile-statistics.md](../features/player-profile-statistics.md)

---

## Description

Implement the frontend pages for the player profile, statistics dashboard, game history list, and rating progression chart. These pages consume the backend player data API and display personalized data for registered users.

---

## Technical Requirements

### Profile Page
- Display: avatar, display name (editable), member-since date
- Rating display: current rating with confidence range (e.g., "1620 ± 85") and an explanatory tooltip
- Edit display name: inline edit with save/cancel
- Avatar selection: grid of pre-made avatars; clicking one updates the avatar

### Statistics Dashboard
- Overall stats card: total games, wins, losses, draws, win percentage
- Per-difficulty breakdown table/cards: Easy, Medium, Hard, Expert — each showing W/L/D and win %
- Streak display: current streak (type + count), best win streak
- Scope: only PvC games count. A note explains local PvP is excluded.

### Rating Progression Chart
- Line chart showing rating over time (x-axis: date, y-axis: rating)
- Data points correspond to rated games (Medium/Hard/Expert PvC only)
- Optional confidence band (±1.96 × RD as shaded area around the line)
- Interactive: hover/touch a point to see the date, result, and rating at that point
- Handles gracefully: new users with few data points (show a "play more games to see your trend" message)

### Game History
- List view with columns: date, opponent (AI difficulty or "Local PvP"), result (W/L/D icon), moves, time control
- Filtering: dropdowns/toggles for mode, difficulty, result, date range
- Pagination: load more button or infinite scroll
- Tap/click a game → opens the replay viewer (task 026)

### Empty States
- New user with no games: friendly message with a call-to-action to play their first game
- No filtered results: "No games match your filters" message

---

## Acceptance Criteria

1. Profile page shows correct avatar, name, rating with confidence range, and member-since date
2. Display name can be edited and saved (change reflected immediately)
3. Avatar can be changed by selecting from the pre-made set
4. Statistics show correct totals and per-difficulty breakdowns matching backend data
5. Streak displays update after new games
6. Rating chart renders a line showing the player's rating progression
7. Hovering/tapping a chart point shows details (date, result, rating)
8. A new user with no rated games sees an appropriate empty state on the chart
9. Game history lists games with correct metadata
10. Filtering narrows the game list correctly
11. Pagination loads additional games without losing filter state
12. All pages are responsive (mobile, tablet, desktop)
13. All pages are accessible (keyboard-navigable, screen-reader-compatible)

---

## Testing Requirements

- **Component tests:**
  - Profile renders correct data from API response
  - Stats card computes win percentage correctly
  - Chart renders data points at correct positions
  - Game history list renders rows with correct metadata
  - Filters update the displayed list
  - Empty states render when no data
- **Integration tests:**
  - Profile page loads data from backend API
  - Edit display name triggers PATCH and updates UI
  - Game history pagination loads additional pages
  - Filter combinations produce correct results
- **Accessibility tests:**
  - Profile and stats pages pass axe-core audit
  - Chart is accessible (data table alternative or ARIA description)
  - Game history table is navigable via keyboard
- **Minimum coverage:** ≥ 85%
