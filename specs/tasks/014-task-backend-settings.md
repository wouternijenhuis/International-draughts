# Task 014: Backend Settings API

**Feature:** Settings & Customization  
**Dependencies:** 010-task-backend-auth  
**FRD Reference:** [settings-customization.md](../features/settings-customization.md)

---

## Description

Implement the backend API endpoints for storing and retrieving user settings (preferences). Registered users' settings are persisted server-side and synchronized across sessions and devices. The settings data model must be extensible for future additions without breaking existing data.

---

## Technical Requirements

### Endpoints
- `GET /api/v1/settings` — Return the authenticated user's current settings. If no settings exist (new user), return default values.
- `PATCH /api/v1/settings` — Partially update the authenticated user's settings. Only the provided fields are updated; unmentioned fields remain unchanged.

### Data Model
- Settings entity linked to user ID (one-to-one)
- Fields:
  - `boardTheme`: string (enum: "classic-wood", "dark", "ocean", "tournament-green")
  - `pieceStyle`: string (enum: "flat", "3d", "classic", "modern")
  - `soundEnabled`: boolean
  - `soundVolume`: integer (0–100)
  - `animationSpeed`: string (enum: "instant", "fast", "normal", "slow")
  - `showLegalMoves`: boolean
  - `showBoardNotation`: boolean
  - `showMoveHistory`: boolean
  - `confirmMove`: boolean
  - `promotionAnimation`: boolean
  - `timedModeEnabled`: boolean
  - `timedModeFormat`: string (nullable, enum: "fischer", "countdown", "preset")
  - `timedModeBaseTime`: integer (nullable, seconds)
  - `timedModeIncrement`: integer (nullable, seconds)
  - `timedModePreset`: string (nullable, preset name)
- Default values matching the FRD specification

### Extensibility
- Use a schema that supports adding new settings fields without requiring migration of existing records
- New fields should fall back to defaults if not present in a user's stored settings

### Authorization
- Both endpoints require authentication
- A user can only read/update their own settings
- Guest tokens are rejected (guests use client-side storage only)

---

## Acceptance Criteria

1. `GET /api/v1/settings` returns default settings for a newly registered user
2. `PATCH /api/v1/settings` with `{ "boardTheme": "dark" }` updates only the board theme; all other settings remain unchanged
3. After updating settings, a subsequent `GET` returns the updated values
4. Unauthenticated requests return 401
5. Guest tokens return 403 (guests don't use server-side settings)
6. Invalid setting values (e.g., `boardTheme: "invalid"`) return 400 with a descriptive error
7. Unknown fields in a PATCH request are ignored (forward compatibility)
8. Settings with missing fields in the database return defaults for those fields

---

## Testing Requirements

- **Unit tests:**
  - Default settings generation
  - Partial update merges correctly (updated fields + unchanged fields)
  - Validation rejects invalid enum values
  - Unknown fields are ignored
- **Integration tests:**
  - Full flow: register → GET defaults → PATCH → GET updated
  - Auth enforcement: unauthenticated request → 401, guest token → 403
  - Concurrent updates from different sessions for the same user
- **Contract tests:** OpenAPI spec matches endpoint behavior
- **Minimum coverage:** ≥ 85%
