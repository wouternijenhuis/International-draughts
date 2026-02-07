# Task 023: Glicko-2 Rating Engine

**Feature:** Player Profile, Statistics & Rating  
**Dependencies:** 003-task-shared-library-scaffolding  
**FRD Reference:** [player-profile-statistics.md](../features/player-profile-statistics.md)

---

## Description

Implement the Glicko-2 rating algorithm as a shared library module. The algorithm takes a player's current rating, RD, and volatility, along with game results against opponents with known ratings, and computes the updated rating, RD, and volatility. It also handles RD decay over periods of inactivity.

The implementation must follow Mark Glickman's Glicko-2 specification precisely.

---

## Technical Requirements

### Glicko-2 Algorithm
- Full implementation of the Glicko-2 algorithm as described in Mark Glickman's paper
- Input: player's current rating (μ), RD (φ), volatility (σ), and a list of game results (opponent rating, opponent RD, score)
- Output: updated rating (μ'), RD (φ'), and volatility (σ')
- The algorithm operates in the Glicko-2 scale internally and converts to/from the Glicko-1 scale (rating, RD) for display

### Rating Defaults (REQ-75)
- New player: rating = 1500, RD = 350, volatility = 0.06
- System constant τ (tau) = 0.5 (configurable)

### Score Mapping (REQ-80)
- Win = 1.0, Draw = 0.5, Loss = 0.0

### AI Opponent Ratings (REQ-76)
- Medium AI: rating = 1200, RD = 0 (fully known)
- Hard AI: rating = 1800, RD = 0
- Expert AI: rating = 2200, RD = 0
- Easy AI: no rating update (games not counted)
- AI ratings are configurable

### RD Decay (REQ-77)
- One rating period = one day
- Function to compute RD increase over N inactive periods
- RD cannot exceed 350 (initial value / cap)

### Confidence Range Display (REQ-78)
- Function to compute the display string: "rating ± (1.96 × RD)" rounded to nearest integer
- Example: rating 1620, RD 43.5 → "1620 ± 85"

---

## Acceptance Criteria

1. A new player starts at rating 1500, RD 350, volatility 0.06
2. After a win against Medium AI (1200): rating increases, RD decreases
3. After a loss against Expert AI (2200): rating decreases, RD decreases
4. After a draw: rating adjusts proportionally (toward 0.5 expected score)
5. Games against Easy AI do not change the rating
6. After 30 days of inactivity, RD increases (reflecting growing uncertainty)
7. RD never exceeds 350
8. The confidence range display formats correctly (e.g., "1620 ± 85")
9. The algorithm matches known Glicko-2 test vectors (from Glickman's paper)
10. All inputs and outputs use sensible numeric precision (no floating-point drift causing incorrect results)

---

## Testing Requirements

- **Unit tests:**
  - Glicko-2 calculation against the official test vectors from Glickman's paper
  - Rating increase on win, decrease on loss, proportional adjustment on draw
  - RD decreases with more games played
  - RD increases with inactivity periods
  - RD capped at 350
  - Easy AI games excluded
  - Volatility adjusts based on result consistency
  - Confidence range formatting
- **Property-based tests:**
  - Rating always increases on a win against a lower-rated opponent
  - RD always decreases after any game result
  - Rating change magnitude depends on RD (higher RD → bigger swings)
- **Edge case tests:**
  - Very high RD player beats very low RD opponent
  - Multiple games in a single rating period
  - Zero games in many consecutive periods
- **Minimum coverage:** ≥ 85%
