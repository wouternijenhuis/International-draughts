# ADR-012: Backend Authentication Overhaul for Mobile

## Status

Proposed

## Date

2026-02-21

## Context

The Flutter migration exposes a **critical authentication gap** in the backend API. The DevLead review (§2.1) identified this as a severity 🔴 Blocker:

### Current State (Verified from Source)

1. **No JWT validation middleware.** `Program.cs` calls `app.UseAuthorization()` but has **no `AddAuthentication()` or `AddJwtBearer()` configured**. There is no authentication scheme registered.

2. **No authorization guards.** API endpoints (`/api/player/{userId}/*`, `/api/v1/games/*`, `/api/settings/*`) have **no `[Authorize]` attributes** or `.RequireAuthorization()` calls. Any client can call any endpoint with any userId.

3. **Cookie-based auth pattern.** The frontend API client sends `credentials: 'include'` on every request, implying cookie-based authentication. However, no cookies are actually set — the JWT token is stored in `localStorage` and used only for client-side `isAuthenticated()` checks.

4. **No `Authorization` header.** The frontend never sends an `Authorization: Bearer <token>` header. The backend never reads one.

5. **No token refresh.** Tokens expire and users must re-login. The auth store's `isAuthenticated()` checks `expiresAt` client-side, but there is no mechanism to refresh an expired token.

**In summary:** Authentication is currently a client-side honor system. The server issues JWT tokens but never validates them. Any API client can access any user's data by knowing (or guessing) their userId.

### Why This Must Be Fixed Before Flutter Launch

- **Native apps are easier to reverse-engineer** than web apps. An attacker with a rooted device can inspect API calls and discover the unprotected endpoints.
- **App Store review** may test the API surface. Unprotected user data endpoints are a review rejection risk.
- **Mobile sessions are expected to persist for weeks.** Without refresh tokens, users would need to re-login whenever their JWT expires (currently 24 hours). This is unacceptable for a mobile game.
- **Multiple clients.** With both a web app and mobile apps hitting the same API, proper server-side auth is table stakes. The web app's client-side auth was a shortcut; the Flutter migration is the forcing function to fix it.

### Decision Criteria

- **Security**: Must properly validate tokens server-side. Must not break existing web frontend.
- **User experience**: Mobile users expect persistent sessions (weeks to months).
- **Implementation scope**: Must be achievable in 2–3 weeks of backend work.
- **Migration compatibility**: Must support both cookie-based (web during transition) and Bearer token (mobile) auth.
- **Token storage security**: JWT and refresh tokens on mobile must use platform-secure storage.

## Decision

### Implement a complete authentication overhaul spanning backend middleware, token refresh, and Flutter secure storage.

### Part 1: Backend JWT Validation Middleware

Add proper JWT Bearer authentication to the ASP.NET Core backend:

```csharp
// Program.cs
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)),
            ClockSkew = TimeSpan.FromMinutes(1) // Reduced from default 5 min
        };
    });

// Middleware order (critical):
app.UseAuthentication(); // ADD THIS — currently missing
app.UseAuthorization();
```

### Part 2: Authorization Guards on Endpoints

Add `.RequireAuthorization()` to all protected endpoints. Extract userId from JWT claims instead of trusting the URL parameter:

```csharp
// Endpoints/PlayerEndpoints.cs
group.MapGet("/profile", async (ClaimsPrincipal user, IPlayerService service) =>
{
    var userId = user.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? throw new UnauthorizedException();
    return Results.Ok(await service.GetProfile(userId));
})
.RequireAuthorization();
```

**Protected endpoints** (require valid JWT):
- `GET/PATCH /api/player/{userId}/*` — Profile, stats, rating history, game history
- `GET/POST/DELETE /api/v1/games/in-progress/{userId}` — Game persistence
- `GET/PUT /api/settings/{userId}` — User settings
- `DELETE /api/auth/account/{userId}` — Account deletion
- `POST /api/v1/ai/move` — Expert AI (authenticated-only policy)

**Public endpoints** (no auth required):
- `POST /api/auth/register` — Registration
- `POST /api/auth/login` — Login
- `POST /api/auth/refresh` — Token refresh (new)
- `GET /health` — Health check

**userId from claims, not URL:** Protected endpoints MUST extract the userId from the JWT `sub` / `NameIdentifier` claim and verify it matches the URL parameter (or remove the URL parameter entirely). This prevents user A from accessing user B's data with a valid token.

### Part 3: Token Refresh Flow

Implement a refresh token mechanism with short-lived access tokens and long-lived refresh tokens:

| Token | Lifetime | Storage (Mobile) | Storage (Web) |
|-------|----------|-------------------|---------------|
| Access token (JWT) | 15 minutes | In-memory (Riverpod state) | In-memory (Zustand state) |
| Refresh token | 30 days | `flutter_secure_storage` | `localStorage` (existing) |

**New backend endpoint:**

```
POST /api/auth/refresh
Request:  { "refreshToken": "..." }
Response: { "token": "...", "expiresAt": "...", "refreshToken": "..." }
Status:   200 OK | 401 Unauthorized (invalid/expired/revoked)
```

**Refresh token rotation:** Each successful refresh invalidates the old refresh token and issues a new one. This prevents replay attacks — if a refresh token is stolen, it can only be used once before the legitimate client's next refresh fails (detecting the compromise).

**Database schema addition:**

```sql
CREATE TABLE RefreshTokens (
    Id UNIQUEIDENTIFIER PRIMARY KEY,
    UserId UNIQUEIDENTIFIER NOT NULL REFERENCES Players(Id),
    TokenHash NVARCHAR(128) NOT NULL,  -- SHA-256 hash, not plain text
    ExpiresAt DATETIME2 NOT NULL,
    CreatedAt DATETIME2 NOT NULL,
    RevokedAt DATETIME2 NULL,
    ReplacedByTokenId UNIQUEIDENTIFIER NULL,
    DeviceInfo NVARCHAR(256) NULL,      -- "iPhone 14, iOS 17.2" or "Chrome 121, Windows"
    CONSTRAINT FK_RefreshTokens_Players FOREIGN KEY (UserId) REFERENCES Players(Id) ON DELETE CASCADE
);
```

**Token family tracking:** Each refresh token knows which token replaced it (`ReplacedByTokenId`). If a revoked token is used for refresh (indicating theft), revoke the **entire token family** for that user/device — force re-login.

### Part 4: Dual Auth Support (Transition Period)

During the transition period where both the Next.js web app and Flutter apps coexist, the backend must accept auth from both patterns:

```csharp
// Custom auth handler that checks Bearer token first, falls back to cookie
options.Events = new JwtBearerEvents
{
    OnMessageReceived = context =>
    {
        // Check Authorization header first (mobile/new web)
        if (context.Request.Headers.ContainsKey("Authorization"))
            return Task.CompletedTask; // Default JWT bearer handles it

        // Fall back to token from cookie (legacy web during transition)
        var token = context.Request.Cookies["draughts-auth-token"];
        if (!string.IsNullOrEmpty(token))
            context.Token = token;

        return Task.CompletedTask;
    }
};
```

**Note:** The current web app doesn't actually use cookies — it stores the JWT in `localStorage` and sends `credentials: 'include'`. The web app must be updated to send `Authorization: Bearer <token>` headers. This is a minor change to the API client (`api-client.ts`) and should be done as part of the backend auth overhaul, not deferred to the Flutter migration.

### Part 5: Flutter HTTP Client with Auto-Refresh

Use `dio` with an interceptor for automatic token refresh:

```dart
class AuthInterceptor extends Interceptor {
  final Ref _ref;

  AuthInterceptor(this._ref);

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final auth = _ref.read(authProvider);
    if (auth.accessToken != null) {
      options.headers['Authorization'] = 'Bearer ${auth.accessToken}';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      // Attempt token refresh
      final refreshed = await _ref.read(authProvider.notifier).refreshToken();
      if (refreshed) {
        // Retry the original request with the new token
        final options = err.requestOptions;
        options.headers['Authorization'] =
            'Bearer ${_ref.read(authProvider).accessToken}';
        final response = await Dio().fetch(options);
        handler.resolve(response);
        return;
      }
      // Refresh failed — force logout
      _ref.read(authProvider.notifier).logout();
    }
    handler.next(err);
  }
}
```

### Part 6: Secure Token Storage (Mobile)

```dart
class SecureTokenStorage {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
      // Tokens available after first device unlock (survives restart)
    ),
  );

  static const _accessTokenKey = 'draughts_access_token';
  static const _refreshTokenKey = 'draughts_refresh_token';

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await Future.wait([
      _storage.write(key: _accessTokenKey, value: accessToken),
      _storage.write(key: _refreshTokenKey, value: refreshToken),
    ]);
  }

  Future<({String? accessToken, String? refreshToken})> loadTokens() async {
    final results = await Future.wait([
      _storage.read(key: _accessTokenKey),
      _storage.read(key: _refreshTokenKey),
    ]);
    return (accessToken: results[0], refreshToken: results[1]);
  }

  Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}
```

**iOS Keychain Accessibility:** `KeychainAccessibility.first_unlock_this_device` ensures tokens are available after first unlock while remaining device-bound, which is preferred for auth tokens.

**Android EncryptedSharedPreferences:** Uses AES-256-GCM encryption with a master key stored in Android Keystore. Data survives app restarts but is deleted on app uninstall.

### Part 7: Backend CORS Update

Update CORS to support native mobile apps (which don't send `Origin` headers):

```csharp
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
            builder.Configuration["Frontend:Origin"]!  // Web frontend
        )
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials();
    });
});

// Additionally, ensure the CORS middleware doesn't block requests
// without an Origin header (native mobile apps)
// The default ASP.NET Core CORS middleware passes through requests
// without an Origin header — verify this behavior in integration tests.
```

### Auth Flow Summary

```
┌─────────────────────────────────────────────────────────────┐
│  LOGIN FLOW                                                  │
│                                                              │
│  User enters email + password                                │
│       ↓                                                      │
│  POST /api/auth/login                                        │
│       ↓                                                      │
│  Backend validates credentials                               │
│  Backend creates: access token (15 min) + refresh token (30d)│
│  Backend stores refresh token hash in RefreshTokens table    │
│       ↓                                                      │
│  Response: { token, expiresAt, refreshToken }                │
│       ↓                                                      │
│  Flutter: store access token in memory (Riverpod)            │
│  Flutter: store refresh token in flutter_secure_storage      │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  API CALL FLOW                                                │
│                                                               │
│  AuthInterceptor adds: Authorization: Bearer <access_token>   │
│       ↓                                                       │
│  Backend validates JWT (signature, expiry, issuer, audience)  │
│       ↓ (if valid)                                            │
│  Extract userId from JWT claims                               │
│  Process request, return response                             │
│                                                               │
│       ↓ (if 401 — expired)                                    │
│  AuthInterceptor catches 401                                  │
│  POST /api/auth/refresh with stored refresh token             │
│       ↓                                                       │
│  Backend validates refresh token (not expired, not revoked)   │
│  Issues new access + refresh tokens                           │
│  Rotates: old refresh token revoked, new one stored           │
│       ↓                                                       │
│  AuthInterceptor retries original request with new token      │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│  APP LAUNCH FLOW                                               │
│                                                                │
│  Read refresh token from flutter_secure_storage                │
│       ↓ (if present)                                           │
│  POST /api/auth/refresh                                        │
│       ↓ (if success)                                           │
│  Store new access token in memory, new refresh token securely  │
│  User is logged in — proceed to app                            │
│       ↓ (if failure — expired or revoked)                      │
│  Clear secure storage                                          │
│  Show login screen                                             │
└────────────────────────────────────────────────────────────────┘
```

## Consequences

### Positive

- **Server-side auth enforcement.** Every protected endpoint validates the JWT server-side. No more client-side honor system. User A cannot access user B's data.
- **Persistent mobile sessions.** 30-day refresh tokens allow users to stay logged in for weeks without re-entering credentials — matching mobile user expectations.
- **Transparent refresh.** The `dio` interceptor handles token refresh automatically. From the UI's perspective, API calls either succeed or redirect to login. No manual refresh triggering.
- **Secure token storage.** iOS Keychain and Android EncryptedSharedPreferences provide hardware-backed encryption. Tokens are not accessible to other apps or extractable from device backups.
- **Token rotation detects compromise.** If an attacker steals a refresh token and uses it, the legitimate client's next refresh fails (token already rotated). This triggers family revocation — the attacker's stolen token is also invalidated.
- **Existing web app benefits.** The JWT validation middleware protects the web app too. Updating the web API client to send Bearer headers is a small change with a large security improvement.
- **GDPR compliance.** Account deletion (`DELETE /api/auth/account/{userId}`) now properly authenticates the request, preventing unauthorized account deletion.

### Negative

- **2–3 weeks of backend work.** This is significant pre-migration effort. JWT middleware, refresh token table, token rotation logic, endpoint authorization guards, and comprehensive testing.
  - **Mitigation:** This work benefits both the existing web app and the Flutter app. It's not throwaway migration prep — it's a critical security fix that was already overdue.
- **Breaking change for web app.** The web API client must be updated to send `Authorization: Bearer <token>` headers. If not coordinated, existing web users lose authentication.
  - **Mitigation:** Deploy backend changes with dual auth support (Bearer + cookie/header fallback). Update web client in the same release. Test both paths in staging.
- **Refresh token storage schema.** New `RefreshTokens` database table and EF Core migration. Adds complexity to the data layer.
  - **Mitigation:** The table is simple (7 columns) and relationships are straightforward. Standard EF Core migration.
- **Token family revocation complexity.** Tracking and revoking token families on suspected theft requires careful implementation to avoid false positives (e.g., network retry causing duplicate refresh requests).
  - **Mitigation:** Use a short grace period (~10 seconds) where the old refresh token is still valid after rotation. This handles network retries without compromising security.
- **15-minute access token lifetime requires reliable refresh.** If the refresh mechanism fails, users are force-logged-out every 15 minutes.
  - **Mitigation:** The `dio` interceptor retries refresh on failure. If refresh truly fails (revoked token, server error), a graceful "session expired" dialog directs users to re-login — not a silent failure.

## Alternatives Considered

### Alternative 1: Keep Cookie-Based Auth

Continue using `credentials: 'include'` with HTTP-only cookies. Set cookies in the auth response.

**Rejected because:**
- Native iOS/Android HTTP clients (dart `http`, `dio`) do not have a browser-style cookie jar with automatic `SameSite`, `Secure`, and `HttpOnly` enforcement. While `dio_cookie_manager` exists, it stores cookies in a platform-specific jar without the security guarantees of browser cookies.
- HTTP-only cookies are a browser security feature — they prevent JavaScript access to the token. On native mobile, there is no JavaScript to protect against. The equivalent security measure is `flutter_secure_storage`.
- The current implementation doesn't actually use cookies — it stores JWTs in `localStorage` and sends `credentials: 'include'` (which does nothing because no cookies are set). Investing in proper cookie infrastructure is wasted effort when Bearer tokens are the industry standard for mobile APIs.

### Alternative 2: Short-Lived Tokens Only (No Refresh)

Issue longer-lived access tokens (7 days) without refresh tokens. Users re-login when the token expires.

**Rejected because:**
- 7-day JWT lifetime is a security risk. If a token is compromised, the attacker has 7 days of access. Short-lived access tokens (15 min) limit the blast radius.
- Mobile users expect sessions to persist for weeks to months. A 7-day expiry means weekly re-login — unacceptable for a casual game where users may not play for days.
- Longer token lifetimes also mean the backend can't revoke access quickly. With refresh tokens, revoking the refresh token effectively logs the user out within 15 minutes (when the access token expires).

### Alternative 3: Device Tokens / API Keys

Issue a persistent device-specific API key on first login. The key never expires but can be revoked.

**Rejected because:**
- API keys don't carry user claims (userId, roles). Each request would need a database lookup to resolve the API key to a user — adding latency and database load to every request.
- No standard middleware support in ASP.NET Core. Would require custom authentication handler.
- Revocation requires maintaining an active key registry and checking every request against it. This is essentially reimplementing refresh tokens with worse ergonomics.
- API keys are appropriate for service-to-service auth, not user-to-service auth.

### Alternative 4: OAuth 2.0 with External Provider (Auth0, Firebase Auth)

Offload authentication to a managed identity provider.

**Rejected because:**
- The existing auth system (email/password with in-house JWT issuance) works correctly. The gap is server-side validation, not the auth mechanism itself.
- Introducing an external auth provider requires migrating existing user accounts, updating the registration flow, and adding a new dependency. This is a larger change than fixing the validation gap.
- The PRD explicitly puts OAuth providers (Microsoft, Apple, Google) out of scope for the migration. Adding Auth0/Firebase is scope creep.
- Future OAuth support can layer on top of the JWT middleware being added here — the `AddAuthentication().AddJwtBearer()` pipeline supports multiple token issuers.

### Alternative 5: Sliding Expiration (Single Token)

Issue a single JWT with 30-day lifetime; on each API call, if the token is within 7 days of expiry, return a new token in the response header.

**Rejected because:**
- Every API response must be checked for a new token — adds complexity to every API call handler in the Flutter client.
- Tokens can't be revoked. A compromised 30-day token provides 30 days of access with no way to invalidate it (JWTs are self-contained).
- If the user doesn't use the app for 30 days, they're forced to re-login. With refresh tokens, the refresh token can have a 90-day or longer lifetime separate from the access token.
- Non-standard pattern that complicates the authentication flow without clear benefits over the industry-standard access + refresh token approach.

## Related

- [Flutter Migration PRD Review — §2.1 Authentication Architecture](../migration/flutter-migration-prd-review.md) — DevLead identification of auth as a critical gap
- [Flutter Migration PRD — §5.2 Authentication & Token Management](../migration/flutter-migration-prd.md) — JWT storage requirements
- [Flutter Migration PRD — §5.4 Token Refresh Gap](../migration/flutter-migration-prd.md) — Token refresh requirement
- [Flutter Migration PRD — §10 Q6](../migration/flutter-migration-prd.md) — Open question on refresh token timing
- [Flutter Migration Analysis — §6.3 Authentication Pattern](../migration/flutter-migration-analysis.md) — Current frontend auth implementation details
- [AGENTS.md — §12 Security](../../AGENTS.md) — JWT authentication, password hashing, GDPR compliance
- Source: [backend/src/InternationalDraughts.Api/Program.cs](../../backend/src/InternationalDraughts.Api/Program.cs) — Missing `AddAuthentication()`
- Source: [frontend/src/lib/api-client.ts](../../frontend/src/lib/api-client.ts) — `credentials: 'include'` pattern to be replaced
- Source: [frontend/src/stores/auth-store.ts](../../frontend/src/stores/auth-store.ts) — Client-side token management
