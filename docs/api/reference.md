# API Reference

## Base URL

- **Development**: `http://localhost:5000`
- **Production**: Configured via environment

All endpoints require HTTPS in production. Responses include a `X-Correlation-Id` header.

## Authentication

### POST `/api/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "displayName": "Player1"
}
```

**Response:** `201 Created`
```json
{
  "userId": "guid",
  "email": "user@example.com",
  "displayName": "Player1",
  "token": "jwt-token"
}
```

### POST `/api/auth/login`

Authenticate an existing user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:** `200 OK` — Same as register response.

### DELETE `/api/auth/account/{userId}`

Delete a user account and all associated data (GDPR).

**Response:** `204 No Content`

---

## Settings

### GET `/api/settings/{userId}`

Retrieve user settings.

**Response:** `200 OK`
```json
{
  "boardTheme": "Classic",
  "pieceStyle": "Flat",
  "soundEnabled": true,
  "soundVolume": 0.7,
  "moveAnimationSpeed": "Normal",
  "showLegalMoves": true,
  "showBoardNotation": false,
  "showMoveHistory": true,
  "timedModeEnabled": false,
  "confirmMove": false,
  "autoPromotionAnimation": true
}
```

### PUT `/api/settings/{userId}`

Update user settings. Accepts the same JSON body as the GET response.

**Response:** `204 No Content`

---

## Player

### GET `/api/player/{userId}/profile`

Get player profile including display name, avatar, and registration date.

### GET `/api/player/{userId}/stats`

Get player statistics (wins/losses/draws per difficulty, total games).

### PATCH `/api/player/{userId}/display-name`

Update display name.

**Request Body:**
```json
{
  "displayName": "NewName"
}
```

### PATCH `/api/player/{userId}/avatar`

Update avatar selection.

**Request Body:**
```json
{
  "avatarUrl": "avatar-3"
}
```

### GET `/api/player/{userId}/rating-history`

Get Glicko-2 rating history for chart display.

### GET `/api/player/{userId}/games`

Get paginated game history.

**Query Parameters:**
- `page` (int, default: 1)
- `pageSize` (int, default: 10)
- `difficulty` (string, optional): Filter by AI difficulty

---

## AI

### POST `/api/v1/ai/move`

Request an Expert AI move computation.

**Request Body:**
```json
{
  "board": [1, 1, 1, 0, ...],
  "currentPlayer": "white",
  "difficulty": "expert",
  "timeLimitMs": 5000
}
```

Board is a 50-element array where: `0` = empty, `1` = white regular piece, `2` = white king, `3` = black regular piece, `4` = black king.

**Response:** `200 OK`
```json
{
  "from": 32,
  "to": 28,
  "captures": [],
  "searchDepth": 12,
  "evaluationScore": 0.35
}
```

---

## Games

### GET `/api/v1/games/in-progress/{userId}`

Get a saved in-progress game for resumption.

### POST `/api/v1/games/in-progress/{userId}`

Save the current in-progress game state.

### DELETE `/api/v1/games/in-progress/{userId}`

Delete a saved in-progress game.

---

## Health

### GET `/health`

Health check endpoint.

**Response:** `200 OK`
```json
{
  "status": "Healthy"
}
```

---

## Error Responses

All errors follow a consistent format:

```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Bad Request",
  "status": 400,
  "detail": "Validation failed",
  "correlationId": "guid"
}
```
