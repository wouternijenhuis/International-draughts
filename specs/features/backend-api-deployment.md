# Feature: Backend API & Deployment

**Feature ID:** `backend-api-deployment`  
**PRD Version:** 1.0  
**Last Updated:** 2026-02-07  
**Status:** Draft

---

## 1. Purpose

Provide the server-side infrastructure that powers authentication, Expert AI computation, player data persistence, and application hosting. This feature defines the backend API surface, the deployment target (Azure), and the Progressive Web App delivery. It is the integration backbone that connects client-side features to server-side resources.

---

## 2. PRD Traceability

| Requirement | Description | Coverage |
|-------------|-------------|----------|
| REQ-53 | Deploy to Azure (App Service, Static Web Apps, or Container Apps) | Hosting |
| REQ-54 | Deliver as a Progressive Web App (PWA) | PWA delivery |
| REQ-55 | Expert AI may run server-side | AI compute infrastructure |
| REQ-56 | Support 500+ concurrent users at launch, horizontally scalable | Scalability |
| REQ-57 | Secure auth: HTTPS/TLS, token-based sessions | Security |
| REQ-63 | Server connection loss during Expert AI: notify + fallback options | Error handling |
| REQ-64 | Expert AI timeout: notify + fallback options | Error handling |
| REQ-67 | User-facing errors: clear, non-technical, actionable | Error UX |
| REQ-68 | Backend endpoints: auth, AI moves, player data (profiles, history, stats, ratings) | API surface |
| REQ-70 | Stateless AI requests: full board position in, computed move out | AI API contract |

---

## 3. Inputs

- Client requests: authentication, AI move computation, player data CRUD, settings CRUD
- Game positions (for Expert AI move computation)
- Player credentials and OAuth tokens

---

## 4. Outputs

- Authenticated sessions (tokens)
- Computed AI moves (Expert mode)
- Player data (profiles, game history, statistics, ratings, settings)
- Error responses with clear, actionable messages
- PWA manifest, service worker, and cached assets

---

## 5. Dependencies

| Direction | Feature | Relationship |
|-----------|---------|-------------|
| Upstream | All client-side features | This feature serves all features that need server interaction |
| Integration | Authentication | Auth endpoints are defined and hosted here |
| Integration | AI Computer Opponent | Expert AI compute runs on backend infrastructure |
| Integration | Player Profile & Statistics | Profile, stats, rating, and game history data is stored and served here |
| Integration | Settings & Customization | Settings persistence for registered users |
| Integration | Game Modes & Lifecycle | Paused game state persistence for registered users |

---

## 6. Feature Detail

### API Surface

The backend must expose endpoints for the following domains:

#### Authentication
- Register (email/password)
- Login (email/password)
- OAuth login/callback (Microsoft, Apple, Google)
- Link additional auth provider to existing account
- Delete account (cascade-deletes all user data)
- Token refresh
- Logout

#### Expert AI Move Computation
- **Request:** Full board position (piece positions, types, current player to move), difficulty confirmation (Expert)
- **Response:** The computed best move in FMJD notation
- **Contract:** Stateless — each request is self-contained; the server does not maintain game session state between requests
- **Timeout:** If the AI does not respond within a configurable timeout (e.g., 30 seconds), the client receives an error and can retry or fall back

#### Player Data
- Get player profile (display name, avatar, rating, member-since)
- Update player profile (display name, avatar)
- Get game history (with pagination and filtering)
- Save completed game record (move history, result, opponent, date, time control)
- Get statistics (win/loss/draw totals, per-difficulty breakdowns, streaks)
- Get rating history (for progression chart)
- Update rating (after Glicko-2 calculation)

#### Settings
- Get settings (all preferences)
- Update settings (partial update)

#### Game State (Pause/Resume)
- Save in-progress game state
- Get in-progress game state (on reconnect/resume)
- Delete in-progress game state (on game completion)

### Error Handling

- **Server connection loss (REQ-63):** If the client cannot reach the server during an Expert AI game, the UI notifies the player and offers: retry, switch to Hard (client-side), or save and exit.
- **AI timeout (REQ-64):** If the Expert AI endpoint does not respond within the configured timeout, the client notifies the player with the same options.
- **General errors (REQ-67):** All error responses include a user-friendly message (no stack traces, no technical jargon). The client displays these messages with clear next steps.
- **HTTP error codes:** Standard HTTP status codes (400, 401, 403, 404, 500) with structured error response bodies.

### Progressive Web App (PWA)

- **Service worker:** Caches the app shell (HTML, CSS, JS, static assets) for fast loading and offline shell display.
- **Web app manifest:** Provides install metadata (name, icons, theme color, display mode) so the app can be installed on home screens.
- **Offline capability:** The app shell loads offline. Gameplay without server (Easy–Hard PvC, local PvP) works offline. Expert AI and data sync require connectivity.
- **Lighthouse target:** > 90 for Performance, Accessibility, Best Practices.

### Deployment & Hosting

- **Platform:** Azure (C4)
- **Options:** Azure App Service, Azure Static Web Apps (for the frontend), Azure Container Apps (for the AI engine), or a combination.
- **Frontend:** Static assets (HTML/CSS/JS) served via Azure Static Web Apps or equivalent CDN-backed hosting.
- **Backend API:** Hosted on Azure App Service or Container Apps. Exposes RESTful endpoints over HTTPS.
- **Expert AI compute:** May run as a separate service/container due to its high memory and CPU requirements (endgame databases up to 2 GB per instance). Must be horizontally scalable.
- **Scalability (REQ-56):** Must support 500+ concurrent users at launch. Auto-scaling policies should handle growth.
- **HTTPS/TLS (REQ-57):** All traffic encrypted. No HTTP fallback.

### Security

- All endpoints require authentication except: login, register, OAuth callback, and public health check.
- Token-based sessions (e.g., JWTs) with appropriate expiry.
- CORS configured to allow only the app's frontend origin.
- Rate limiting on authentication endpoints to prevent brute-force attacks.
- Input validation on all endpoints.
- GDPR compliance: account deletion cascade-deletes all associated data.

---

## 7. Acceptance Criteria

### API
1. **Auth endpoints work:** Users can register, log in (all four providers), refresh tokens, link accounts, and delete accounts via the API.
2. **AI move endpoint works:** Sending a valid board position to the Expert AI endpoint returns a legal move within the configured timeout.
3. **AI stateless:** Two consecutive AI requests with different positions return independent, correct moves — no session leakage.
4. **Player data CRUD:** Profile, game history, statistics, rating, and settings can be created, read, updated, and deleted via the API.
5. **Pagination:** Game history endpoint supports pagination for users with many games.

### Error Handling
6. **AI timeout handled:** If the AI endpoint takes longer than the timeout, the client receives a timeout error and can present fallback options.
7. **Connection loss handled:** If the server is unreachable, the client detects this and shows the appropriate notification with fallback options.
8. **User-friendly errors:** All error responses contain a human-readable message. No raw stack traces or technical identifiers are shown to the user.

### PWA
9. **Installable:** The app passes PWA install criteria — manifest, service worker, HTTPS. It can be installed on a phone's home screen.
10. **Offline shell:** The app shell loads and displays when offline. A clear message indicates that some features require connectivity.
11. **Lighthouse:** The app scores > 90 on Performance, Accessibility, and Best Practices.

### Deployment
12. **Azure deployment:** The app is deployed and running on Azure infrastructure.
13. **HTTPS enforced:** All endpoints are accessible only via HTTPS. HTTP requests are redirected.
14. **500 concurrent users:** The system handles 500 concurrent users (simulated via load test) without degradation below the specified performance targets.
15. **Auto-scaling:** The system scales horizontally when load increases beyond a single instance's capacity.

### Security
16. **Auth required:** Protected endpoints reject unauthenticated requests with 401.
17. **Data isolation:** A user can only access their own data. Attempting to access another user's profile, history, or settings returns 403.
18. **Account deletion complete:** After account deletion, all associated data (profile, games, stats, ratings, settings) is irretrievable.

---

## 8. Technical Constraints

- Expert AI compute is memory-intensive (up to 2 GB per instance for endgame databases in v1.1+). Deployment must use shared, read-only data loaded once per instance, not per request.
- Azure is the required platform (C4). All hosting, compute, and storage must use Azure services.
- The app must support future native wrapping (C7) — the PWA structure and API design should not prevent Capacitor or similar tools from wrapping the app.

---

## 9. Open Questions

- Should the backend API use REST or GraphQL? (REST is simpler and sufficient for this use case.)
- What Azure services should be used for data storage — Azure SQL, Cosmos DB, or Azure Table Storage?
- Should the Expert AI engine run as a sidecar container within the same App Service, or as a separate microservice?
- What is the token expiry policy? (e.g., access token = 1 hour, refresh token = 30 days)
