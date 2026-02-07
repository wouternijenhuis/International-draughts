# Task 010: Backend Authentication Endpoints

**Feature:** Authentication & Player Management  
**Dependencies:** 001-task-backend-scaffolding  
**FRD Reference:** [authentication.md](../features/authentication.md)

---

## Description

Implement the backend API endpoints for user authentication: registration (email/password), login (email/password), OAuth login/callback for all four providers (Google, Microsoft, Apple), token management (issue, refresh, revoke), account linking, account deletion with GDPR-compliant data cascade, and guest session issuance.

---

## Technical Requirements

### Endpoints

#### Email/Password
- `POST /api/v1/auth/register` — Register with email + password. Validate email format, enforce password policy (≥ 8 chars), send verification email. Return 201 on success.
- `POST /api/v1/auth/login` — Login with email + password. Return access token + refresh token on success. Return 401 on invalid credentials.
- `POST /api/v1/auth/verify-email` — Verify email via token from verification email.

#### OAuth
- `GET /api/v1/auth/oauth/{provider}/login` — Redirect to OAuth provider (google, microsoft, apple). Provider-specific configuration.
- `GET /api/v1/auth/oauth/{provider}/callback` — Handle OAuth callback. Create user on first login or match to existing user. Return tokens.

#### Token Management
- `POST /api/v1/auth/refresh` — Exchange a valid refresh token for a new access token.
- `POST /api/v1/auth/logout` — Revoke the current session's tokens.

#### Account Management
- `POST /api/v1/auth/link/{provider}` — Link an additional OAuth provider to the authenticated user's account.
- `DELETE /api/v1/auth/account` — Delete the authenticated user's account and cascade-delete all associated data (profile, games, stats, ratings, settings). Requires explicit confirmation token.

#### Guest
- `POST /api/v1/auth/guest` — Issue a short-lived guest session token. No user record is created. Guest tokens are not refreshable.

### Security
- Passwords hashed with a modern algorithm (bcrypt, Argon2, or PBKDF2) with salt
- Access tokens: JWT with short expiry (e.g., 1 hour)
- Refresh tokens: opaque, stored server-side, longer expiry (e.g., 30 days)
- Rate limiting on login and registration endpoints (e.g., 10 attempts per minute per IP)
- All endpoints over HTTPS only

### Data Model
- User entity: ID, email, password hash (nullable for OAuth-only), display name, avatar, created date, auth providers (list)
- Auth provider link: user ID, provider name, provider user ID
- Refresh token store: token hash, user ID, expiry, revoked flag

### GDPR Account Deletion
- `DELETE /api/v1/auth/account` must remove: user record, all game records, all statistics, rating history, settings, linked auth providers, refresh tokens
- Must be a hard delete, not a soft delete
- Endpoint requires a confirmation step (e.g., request a deletion token via `POST /api/v1/auth/account/deletion-request`, then confirm via `DELETE` with that token)

---

## Acceptance Criteria

1. A new user can register with email/password and receives a verification email
2. A verified user can log in and receive a valid access token + refresh token
3. OAuth login via Google, Microsoft, and Apple creates a new user on first login and returns tokens
4. OAuth login for a returning user matches the existing account and returns tokens
5. A refresh token can be exchanged for a new access token
6. Logout revokes the session tokens
7. An authenticated user can link an additional OAuth provider to their account
8. Account deletion removes ALL user data from the database — a subsequent login attempt returns 401
9. Guest session returns a short-lived token that grants access to gameplay endpoints but not data persistence endpoints
10. Rate limiting blocks excessive login attempts (> threshold per minute)
11. Passwords are stored as salted hashes; plaintext passwords are never persisted or logged
12. All endpoints return structured error responses with user-friendly messages

---

## Testing Requirements

- **Unit tests:**
  - Password hashing and verification
  - JWT token generation, validation, and expiry
  - Refresh token generation and rotation
  - Rate limiter logic
  - Account deletion cascade logic (mock database)
- **Integration tests:**
  - Full registration → verification → login → token refresh flow
  - OAuth callback handling with mock provider responses
  - Account linking (add second provider, login with either)
  - Account deletion: verify all related records are removed
  - Guest session: token issued, limited access enforced
  - Invalid credentials return 401
  - Rate limiting triggers 429 response
- **Contract tests:** OpenAPI specification matches actual endpoint behavior
- **Minimum coverage:** ≥ 85%
