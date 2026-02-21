# Flutter Deployment Plan — Azure Infrastructure & CI/CD

> Deployment plan for adding Flutter mobile apps (iOS + Android) to the
> existing International Draughts Azure infrastructure. Covers infrastructure
> changes, CI/CD updates, backend modifications, security, monitoring, and cost.
>
> **Status:** Planning (DO NOT IMPLEMENT)
> **Date:** 2026-02-21
> **Related ADRs:** [ADR-010](../adr/adr-010-mobile-cicd-pipeline.md), [ADR-012](../adr/adr-012-backend-auth-overhaul.md), [ADR-013](../adr/adr-013-flutter-web-strategy.md), [ADR-014](../adr/adr-014-app-versioning-forced-updates.md), [ADR-015](../adr/adr-015-shared-engine-dart-package.md)

---

## Contents

1. [Executive Summary](#1-executive-summary)
2. [Infrastructure Changes (Bicep)](#2-infrastructure-changes-bicep)
3. [CI/CD Pipeline Changes](#3-cicd-pipeline-changes)
4. [Backend Changes for Mobile Support](#4-backend-changes-for-mobile-support)
5. [Security Considerations for Mobile](#5-security-considerations-for-mobile)
6. [Monitoring & Observability](#6-monitoring--observability)
7. [Environment Strategy](#7-environment-strategy)
8. [Cost Impact Assessment](#8-cost-impact-assessment)
9. [Migration Sequence & Dependencies](#9-migration-sequence--dependencies)
10. [Risk Register](#10-risk-register)

---

## 1. Executive Summary

The Flutter migration adds iOS and Android clients to an existing web+backend architecture. The guiding principle is **minimal infrastructure change**: the same Azure App Service backend serves web and mobile clients. No new Azure compute resources are required for MVP. Changes are concentrated in:

- **Bicep (infra/main.bicep):** New Key Vault secrets, CORS documentation (no policy change needed), app settings for JWT and app-config.
- **CI/CD (.github/workflows/):** New `ci-flutter.yml` job in CI, new `mobile-deploy.yml` workflow for store distribution.
- **Backend:** Auth overhaul (ADR-012), app-config endpoint (ADR-014), rate limiting middleware, `clientPlatform` telemetry header.
- **External services:** Apple Developer Program, Google Play Console, Firebase project (Crashlytics + Analytics).

No additional Azure resources (for example, API Management or Notification Hubs) are required for MVP.

---

## 2. Infrastructure Changes (Bicep)

### 2.1 Current State

The existing `infra/main.bicep` provisions:

| Resource | Name Pattern | Purpose |
|----------|-------------|---------|
| Log Analytics Workspace | `{baseName}-logs` | Centralized logging |
| Application Insights | `{baseName}-insights` | APM and monitoring |
| Key Vault | `{namePrefix}-{env}-kv-{suffix}` (max 24 chars) | Secrets management |
| PostgreSQL Flexible Server | `{baseName}-db` | Application database |
| App Service Plan | `{baseName}-plan` | Backend compute (B1 dev / P1v3 prod) |
| App Service | `{baseName}-api` | Backend API (.NET 9) |
| Static Web App | `{baseName}-web` | Next.js frontend |
| Auto-scale Settings | `{baseName}-autoscale` | Prod only (2–10 instances, CPU) |
| Metric Alerts | `{baseName}-error-rate`, `-response-time`, `-health-check` | Alerting |

### 2.2 New Key Vault Secrets

Add the following secrets to Key Vault. The App Service consumes them through app settings that reference Key Vault.

| Secret Name | Purpose | Rotation Policy | Source |
|-------------|---------|----------------|--------|
| `jwt-signing-key` | HMAC-SHA256 key for JWT access token signing | Every 90 days | Generated, ≥256-bit |
| `jwt-refresh-encryption-key` | AES-256 key for encrypting refresh token hashes at rest | Every 90 days | Generated, 256-bit |
| `firebase-service-account-json` | Firebase Admin SDK service account key (for server-side Crashlytics symbol upload, if needed) | Per Firebase project rotation | Firebase Console |

**Bicep additions to `infra/main.bicep`:**

```bicep
// JWT signing key — value provided via parameter (generated externally)
@secure()
@description('JWT signing key for access token generation (min 256-bit)')
param jwtSigningKey string

resource jwtSigningKeySecret 'Microsoft.KeyVault/vaults/secrets@2024-04-01-preview' = {
  parent: keyVault
  name: 'jwt-signing-key'
  properties: {
    value: jwtSigningKey
    contentType: 'text/plain'
  }
}

@secure()
@description('Encryption key for refresh token storage')
param refreshTokenEncryptionKey string

resource refreshTokenKeySecret 'Microsoft.KeyVault/vaults/secrets@2024-04-01-preview' = {
  parent: keyVault
  name: 'jwt-refresh-encryption-key'
  properties: {
    value: refreshTokenEncryptionKey
    contentType: 'text/plain'
  }
}
```

> **Note:** The Firebase service account JSON is stored as a GitHub Actions secret (`FIREBASE_SERVICE_ACCOUNT_JSON`) for CI/CD use only. It is *not* needed by the App Service at runtime — the backend does not call Firebase APIs. Only add it to Key Vault if a future requirement (e.g., server-side push notifications) demands it.

### 2.3 App Settings Updates

Add new app settings to the backend App Service resource for JWT configuration and app-config:

```bicep
// Add to backendApp.properties.siteConfig.appSettings union:
{
  name: 'Jwt__Key'
  value: '@Microsoft.KeyVault(SecretUri=${jwtSigningKeySecret.properties.secretUri})'
}
{
  name: 'Jwt__Issuer'
  value: 'https://${backendApp.properties.defaultHostName}'
}
{
  name: 'Jwt__Audience'
  value: 'international-draughts'
}
{
  name: 'Jwt__AccessTokenLifetimeMinutes'
  value: '15'
}
{
  name: 'Jwt__RefreshTokenLifetimeDays'
  value: '30'
}
{
  name: 'AppConfig__MinimumVersion'
  value: '1.0.0'
}
{
  name: 'AppConfig__LatestVersion'
  value: '1.0.0'
}
{
  name: 'AppConfig__MaintenanceMode'
  value: 'false'
}
```

**Key Vault access:** The App Service's system-assigned managed identity must have the `Key Vault Secrets User` RBAC role on the Key Vault. Add a role assignment resource:

```bicep
// Key Vault role assignment for App Service managed identity
resource kvRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, backendApp.id, '4633458b-17de-408a-b874-0445c86b69e6')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      '4633458b-17de-408a-b874-0445c86b69e6' // Key Vault Secrets User
    )
    principalId: backendApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}
```

### 2.4 CORS Strategy for Native Mobile Clients

**Current CORS configuration** (from `infra/main.bicep`):

```bicep
cors: {
  allowedOrigins: corsOrigins  // SWA default hostname + optional custom domain
  supportCredentials: true
}
```

Plus ASP.NET Core-level CORS via `Cors__AllowedOrigins__*` app settings.

**Impact of mobile clients on CORS: None.**

Native mobile HTTP clients (Dart `dio`, `http`) do **not** send an `Origin` header. CORS is a browser-enforced security mechanism — it does not apply to native app traffic. The ASP.NET Core CORS middleware behaves as follows:

| Request Origin Header | Middleware Behavior |
|----------------------|---------------------|
| Present, matches allowed origin | Adds `Access-Control-Allow-Origin` response header |
| Present, does NOT match | Blocks the request (403) |
| **Absent** (native mobile, curl, Postman) | **Passes through — no CORS headers added, request is NOT blocked** |

This is the default behavior of the ASP.NET Core CORS middleware and has been verified in the ADR-012 analysis.

**Recommendation:**

- **No CORS configuration changes needed.** The existing CORS policy correctly restricts browser-based cross-origin requests (protecting the web app) while allowing native mobile requests to pass through unimpeded.
- **Do NOT add wildcard (`*`) to CORS origins.** This would weaken security for the web app without benefiting mobile clients (which already bypass CORS).
- **Add integration tests** to verify that requests without an `Origin` header are processed normally. This protects against accidental middleware ordering changes that might reject origin-less requests.

### 2.5 Rate Limiting Considerations

**Assessment: App-level rate limiting, not Azure API Management.**

| Option | Monthly Cost | Complexity | Recommendation |
|--------|-------------|-----------|----------------|
| Azure API Management (Consumption) | ~$3.50/million calls | High — new resource, policy config, routing | **Not for MVP** |
| Azure API Management (Developer) | ~$49/month | High | Overkill for this scale |
| App-level (.NET 9 built-in rate limiter) | $0 (runs in App Service) | Low — middleware config | **Recommended for MVP** |
| AspNetCoreRateLimit NuGet package | $0 | Medium — more features than built-in | Consider if built-in is insufficient |

**.NET 9 built-in rate limiter** (recommended):

```csharp
// Program.cs
builder.Services.AddRateLimiter(options =>
{
    // Global rate limit: 100 requests/minute per IP
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 100,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));

    // Stricter limit for auth endpoints: 10 requests/minute per IP
    options.AddFixedWindowLimiter("auth", limiterOptions =>
    {
        limiterOptions.PermitLimit = 10;
        limiterOptions.Window = TimeSpan.FromMinutes(1);
        limiterOptions.QueueLimit = 0;
    });

    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});
```

**Rate limiting tiers by endpoint category:**

| Endpoint Category | Rate Limit | Rationale |
|-------------------|-----------|-----------|
| `POST /api/auth/login` | 10/min per IP | Brute-force protection |
| `POST /api/auth/register` | 5/min per IP | Spam account prevention |
| `POST /api/auth/refresh` | 20/min per IP | Token refresh retries |
| `GET /api/v1/app-config` | 30/min per IP | App launch + periodic checks |
| `POST /api/v1/ai/move` | 30/min per authenticated user | Compute-intensive endpoint |
| All other endpoints | 100/min per IP | General protection |

**Expert AI auth policy (Option A):** `POST /api/v1/ai/move` is authenticated-only. Guest users do not call this endpoint; they use local Hard AI fallback.

**No Bicep changes required** — rate limiting is configured in application code, not infrastructure.

### 2.6 New Azure Resources Assessment

| Potential Resource | Needed for MVP? | Justification |
|-------------------|----------------|---------------|
| Azure Notification Hubs | **No** | Push notifications are not in the Flutter MVP scope. The app is a local/AI game — no multiplayer notifications needed. Reassess when multiplayer or social features are planned. |
| Azure API Management | **No** | App-level rate limiting is sufficient for current scale. APIM adds cost and complexity without proportional benefit. Reassess at >1M monthly API calls. |
| Azure CDN / Front Door | **No** | Backend API serves dynamic content — CDN won't help. Static assets are served by the app bundle (Flutter) or SWA (Next.js). |
| Azure Cache for Redis | **No** | Rate limiter state is in-memory (per instance). If scaling to >5 instances, consider distributed rate limiting with Redis. Not needed at current scale. |
| Firebase Project | **External** | Not an Azure resource. Firebase Crashlytics + Analytics are configured in the Flutter app and Firebase Console. No Azure-side infra needed. |

**Summary: No new Azure resources for MVP.** The existing App Service, PostgreSQL, Key Vault, App Insights, and SWA are sufficient.

### 2.7 App-Config Endpoint Contract

No new infrastructure needed — this is a backend API endpoint. Documented here for completeness:

```
GET /api/v1/app-config
Authorization: None (public endpoint)
Rate Limit: 30/min per IP

Response 200 OK:
{
  "minimumVersion": "1.0.0",
  "latestVersion": "1.2.0",
  "updateUrl": {
    "ios": "https://apps.apple.com/app/international-draughts/id{APP_ID}",
    "android": "https://play.google.com/store/apps/details?id=com.draughts.international"
  },
  "maintenanceMode": false,
  "maintenanceMessage": null
}
```

Version values are sourced from `appsettings.json` (configured via App Service app settings). No database table for MVP — version bumps require a redeployment or app setting update in the Azure Portal / Bicep parameters.

---

## 3. CI/CD Pipeline Changes

### 3.1 Overview of Pipeline Changes

| Workflow | Change Type | Description |
|----------|------------|-------------|
| `ci.yml` | **Modify** | Add `flutter-and-dart-engine` job |
| `deploy.yml` | **No change** | Existing backend + frontend deploy unchanged |
| `mobile-deploy.yml` | **New** | Flutter build + Fastlane store upload |

### 3.2 CI Pipeline Additions (`ci.yml`)

Add a third parallel job to the existing CI workflow. The existing `backend` and `shared-and-frontend` jobs remain unchanged.

```yaml
# .github/workflows/ci.yml — new job (added alongside existing jobs)

  flutter-and-dart-engine:
    name: Flutter & Dart Engine
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: mobile
    steps:
      - uses: actions/checkout@v4

      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.x'
          channel: 'stable'
          cache: true

      - name: Setup Java (for Android SDK)
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      # --- Dart Engine ---
      - name: Dart Engine — Install Dependencies
        working-directory: shared/draughts-engine-dart
        run: dart pub get

      - name: Dart Engine — Analyze
        working-directory: shared/draughts-engine-dart
        run: dart analyze --fatal-infos

      - name: Dart Engine — Format Check
        working-directory: shared/draughts-engine-dart
        run: dart format --set-exit-if-changed .

      - name: Dart Engine — Run Tests with Coverage
        working-directory: shared/draughts-engine-dart
        run: |
          dart test --coverage=coverage
          dart pub global activate coverage
          dart pub global run coverage:format_coverage \
            --lcov --in=coverage --out=coverage/lcov.info \
            --report-on=lib

      - name: Upload Dart Engine Coverage
        uses: actions/upload-artifact@v4
        with:
          name: dart-engine-coverage
          path: shared/draughts-engine-dart/coverage/

      # --- Flutter App ---
      - name: Flutter — Install Dependencies
        run: flutter pub get

      - name: Flutter — Analyze
        run: flutter analyze --fatal-infos

      - name: Flutter — Format Check
        run: dart format --set-exit-if-changed lib/ test/

      - name: Flutter — Run Tests with Coverage
        run: flutter test --coverage

      - name: Upload Flutter Coverage
        uses: actions/upload-artifact@v4
        with:
          name: flutter-coverage
          path: mobile/coverage/

      - name: Flutter — Build Android (debug, compile check)
        run: flutter build apk --debug

  # Optional: iOS compile check on macOS (expensive — run only on main/develop pushes)
  ios-compile-check:
    name: iOS Compile Check
    runs-on: macos-14
    if: github.event_name == 'push' && (github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop')
    defaults:
      run:
        working-directory: mobile
    steps:
      - uses: actions/checkout@v4

      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.x'
          channel: 'stable'
          cache: true

      - name: Install Dependencies
        run: flutter pub get

      - name: Build iOS (no codesign)
        run: flutter build ios --no-codesign
```

**Cost optimization notes (per ADR-010):**
- The `flutter-and-dart-engine` job runs on Linux (~$0.008/min, ~5 min = ~$0.04/run).
- The `ios-compile-check` job runs on macOS-14 (~$0.08/min, ~12 min = ~$0.96/run).
- iOS compile check runs only on pushes to `main`/`develop` — not on every PR. Path filters can further reduce runs.

### 3.3 New Mobile Deploy Workflow (`mobile-deploy.yml`)

```yaml
# .github/workflows/mobile-deploy.yml
name: Mobile Deploy

on:
  workflow_dispatch:
    inputs:
      track:
        description: 'Distribution track'
        required: true
        default: 'internal'
        type: choice
        options:
          - internal    # TestFlight internal / Play Store internal
          - beta        # TestFlight external / Play Store closed testing
          - production  # App Store / Play Store production
  push:
    tags:
      - 'v*.*.*'

concurrency:
  group: mobile-deploy-${{ github.ref }}
  cancel-in-progress: false  # Never cancel a deploy in progress

env:
  FLUTTER_VERSION: '3.x'
  JAVA_VERSION: '17'

jobs:
  # ──────────────────────────────────────────────
  # Job 1: Test Dart Engine + Flutter
  # ──────────────────────────────────────────────
  test:
    name: Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: ${{ env.FLUTTER_VERSION }}
          channel: 'stable'
          cache: true

      - name: Dart Engine Tests
        working-directory: shared/draughts-engine-dart
        run: |
          dart pub get
          dart analyze --fatal-infos
          dart test

      - name: Flutter Tests
        working-directory: mobile
        run: |
          flutter pub get
          flutter analyze --fatal-infos
          flutter test

  # ──────────────────────────────────────────────
  # Job 2: Build & Deploy iOS
  # ──────────────────────────────────────────────
  ios:
    name: iOS Build & Deploy
    needs: test
    runs-on: macos-14
    defaults:
      run:
        working-directory: mobile
    steps:
      - uses: actions/checkout@v4

      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: ${{ env.FLUTTER_VERSION }}
          channel: 'stable'
          cache: true

      - name: Install Dependencies
        run: flutter pub get

      - name: Setup Ruby (for Fastlane)
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
          bundler-cache: true
          working-directory: mobile/ios

      - name: Install Fastlane
        working-directory: mobile/ios
        run: bundle install

      - name: Build iOS Release
        run: |
          flutter build ipa \
            --release \
            --obfuscate \
            --split-debug-info=build/debug-info/ios \
            --build-number=${{ github.run_number }} \
            --export-options-plist=ios/ExportOptions.plist

      - name: Deploy to TestFlight (internal/beta)
        if: inputs.track != 'production'
        working-directory: mobile/ios
        env:
          MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
          MATCH_GIT_BASIC_AUTHORIZATION: ${{ secrets.MATCH_GIT_BASIC_AUTHORIZATION }}
          APP_STORE_CONNECT_API_KEY_ID: ${{ secrets.APPLE_API_KEY_ID }}
          APP_STORE_CONNECT_API_ISSUER_ID: ${{ secrets.APPLE_API_ISSUER_ID }}
          APP_STORE_CONNECT_API_KEY: ${{ secrets.APPLE_API_KEY }}
        run: bundle exec fastlane beta

      - name: Promote to App Store (production)
        if: inputs.track == 'production'
        working-directory: mobile/ios
        env:
          APP_STORE_CONNECT_API_KEY_ID: ${{ secrets.APPLE_API_KEY_ID }}
          APP_STORE_CONNECT_API_ISSUER_ID: ${{ secrets.APPLE_API_ISSUER_ID }}
          APP_STORE_CONNECT_API_KEY: ${{ secrets.APPLE_API_KEY }}
        run: bundle exec fastlane release

      - name: Upload dSYM to Firebase Crashlytics
        if: inputs.track != 'production'
        env:
          FIREBASE_APP_ID: ${{ secrets.FIREBASE_APP_ID_IOS }}
          GOOGLE_APPLICATION_CREDENTIALS: ${{ runner.temp }}/firebase-sa.json
        run: |
          echo '${{ secrets.FIREBASE_SERVICE_ACCOUNT_JSON }}' > "$GOOGLE_APPLICATION_CREDENTIALS"
          dart pub global activate firebase_crashlytics_cli
          firebase crashlytics:symbols:upload \
            --app=$FIREBASE_APP_ID \
            build/debug-info/ios/
          rm -f "$GOOGLE_APPLICATION_CREDENTIALS"

      - name: Upload iOS Build Artifact
        uses: actions/upload-artifact@v4
        with:
          name: ios-release
          path: |
            mobile/build/ios/ipa/*.ipa
            mobile/build/debug-info/ios/

  # ──────────────────────────────────────────────
  # Job 3: Build & Deploy Android
  # ──────────────────────────────────────────────
  android:
    name: Android Build & Deploy
    needs: test
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: mobile
    steps:
      - uses: actions/checkout@v4

      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: ${{ env.FLUTTER_VERSION }}
          channel: 'stable'
          cache: true

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: ${{ env.JAVA_VERSION }}

      - name: Install Dependencies
        run: flutter pub get

      - name: Decode Keystore
        env:
          ANDROID_KEYSTORE_BASE64: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}
        run: echo "$ANDROID_KEYSTORE_BASE64" | base64 -d > android/release.jks

      - name: Create key.properties
        env:
          ANDROID_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
          ANDROID_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
          ANDROID_STORE_PASSWORD: ${{ secrets.ANDROID_STORE_PASSWORD }}
        run: |
          cat > android/key.properties <<EOF
          storeFile=release.jks
          storePassword=$ANDROID_STORE_PASSWORD
          keyAlias=$ANDROID_KEY_ALIAS
          keyPassword=$ANDROID_KEY_PASSWORD
          EOF

      - name: Build Android Release (App Bundle)
        run: |
          flutter build appbundle \
            --release \
            --obfuscate \
            --split-debug-info=build/debug-info/android \
            --build-number=${{ github.run_number }}

      - name: Setup Ruby (for Fastlane)
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
          bundler-cache: true
          working-directory: mobile/android

      - name: Install Fastlane
        working-directory: mobile/android
        run: bundle install

      - name: Deploy to Play Store (internal track)
        if: inputs.track == 'internal' || inputs.track == 'beta'
        working-directory: mobile/android
        env:
          GOOGLE_PLAY_JSON_KEY: ${{ secrets.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON }}
        run: |
          echo "$GOOGLE_PLAY_JSON_KEY" > play_store_key.json
          bundle exec fastlane ${{ inputs.track || 'internal' }}
          rm -f play_store_key.json

      - name: Promote to Production
        if: inputs.track == 'production'
        working-directory: mobile/android
        env:
          GOOGLE_PLAY_JSON_KEY: ${{ secrets.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON }}
        run: |
          echo "$GOOGLE_PLAY_JSON_KEY" > play_store_key.json
          bundle exec fastlane release
          rm -f play_store_key.json

      - name: Upload ProGuard Mapping to Firebase Crashlytics
        if: inputs.track != 'production'
        env:
          FIREBASE_APP_ID: ${{ secrets.FIREBASE_APP_ID_ANDROID }}
          GOOGLE_APPLICATION_CREDENTIALS: ${{ runner.temp }}/firebase-sa.json
        run: |
          echo '${{ secrets.FIREBASE_SERVICE_ACCOUNT_JSON }}' > "$GOOGLE_APPLICATION_CREDENTIALS"
          firebase crashlytics:symbols:upload \
            --app=$FIREBASE_APP_ID \
            build/debug-info/android/
          rm -f "$GOOGLE_APPLICATION_CREDENTIALS"

      - name: Cleanup Secrets
        if: always()
        run: |
          rm -f android/release.jks
          rm -f android/key.properties
          rm -f android/play_store_key.json

      - name: Upload Android Build Artifact
        uses: actions/upload-artifact@v4
        with:
          name: android-release
          path: |
            mobile/build/app/outputs/bundle/release/*.aab
            mobile/build/debug-info/android/
```

### 3.4 GitHub Secrets Inventory

All secrets required for mobile CI/CD:

| Secret Name | Used By | Description |
|-------------|---------|-------------|
| **Apple / iOS** | | |
| `APPLE_API_KEY_ID` | `mobile-deploy.yml` | App Store Connect API Key ID |
| `APPLE_API_ISSUER_ID` | `mobile-deploy.yml` | App Store Connect API Issuer ID |
| `APPLE_API_KEY` | `mobile-deploy.yml` | App Store Connect API Key (`.p8` contents) |
| `MATCH_PASSWORD` | `mobile-deploy.yml` | Encryption password for Fastlane Match cert repo |
| `MATCH_GIT_BASIC_AUTHORIZATION` | `mobile-deploy.yml` | Base64-encoded `user:token` for Match Git repo access |
| **Android** | | |
| `ANDROID_KEYSTORE_BASE64` | `mobile-deploy.yml` | Base64-encoded release keystore (`.jks`) |
| `ANDROID_KEY_ALIAS` | `mobile-deploy.yml` | Key alias within the keystore |
| `ANDROID_KEY_PASSWORD` | `mobile-deploy.yml` | Password for the key |
| `ANDROID_STORE_PASSWORD` | `mobile-deploy.yml` | Password for the keystore |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | `mobile-deploy.yml` | Google Play Console service account JSON |
| **Firebase** | | |
| `FIREBASE_APP_ID_IOS` | `mobile-deploy.yml` | Firebase App ID for iOS (`1:xxx:ios:xxx`) |
| `FIREBASE_APP_ID_ANDROID` | `mobile-deploy.yml` | Firebase App ID for Android (`1:xxx:android:xxx`) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | `mobile-deploy.yml` | Firebase service account for Crashlytics symbol upload |
| **Existing (no change)** | | |
| `AZURE_CREDENTIALS` | `deploy.yml` | Azure service principal (unchanged) |
| `AZURE_WEBAPP_NAME` | `deploy.yml` | App Service name (unchanged) |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | `deploy.yml` | SWA deploy token (unchanged) |

**Total new secrets: 13** (5 Apple, 4 Android, 3 Firebase, 1 Match).

### 3.5 Workflow Triggers Summary

| Workflow | Trigger | Runs |
|----------|---------|------|
| `ci.yml` (existing + new job) | Push/PR to `main`, `develop` | Backend, Shared+Frontend, **Flutter+Dart Engine** |
| `deploy.yml` (unchanged) | Push to `main`, manual dispatch | Backend → App Service, Frontend → SWA |
| `mobile-deploy.yml` (new) | Manual dispatch, tag push `v*.*.*` | Flutter iOS → TestFlight/App Store, Flutter Android → Play Store |

---

## 4. Backend Changes for Mobile Support

### 4.1 CORS Policy — No Change Needed

As detailed in §2.4, native mobile HTTP clients do not send `Origin` headers. The ASP.NET Core CORS middleware passes through requests without an `Origin` header — it only enforces CORS for browser requests that include one.

**Current CORS configuration is sufficient:**

- **Web (Next.js):** Sends `Origin` header → CORS middleware validates against `corsOrigins` → allowed.
- **Mobile (Flutter/Dart `dio`):** No `Origin` header → CORS middleware is a no-op → request passes through.
- **No wildcard `*` needed.** Adding `*` would weaken browser-side CORS without benefiting mobile.

**Action items:**

1. Add integration tests verifying requests without `Origin` are processed (protect against regression).
2. Document in the backend README that mobile clients bypass CORS by design.

### 4.2 JWT Signing Key Management

Per ADR-012, the backend must validate JWTs server-side. The signing key lifecycle:

1. **Key generation:** Generate a cryptographically random 256-bit key externally (e.g., `openssl rand -base64 32`).
2. **Key storage:** Store in Key Vault as `jwt-signing-key` secret (§2.2).
3. **Key loading:** App Service references Key Vault secret via `@Microsoft.KeyVault(...)` syntax in app settings.
4. **Key rotation:** Update Key Vault secret → restart App Service → new tokens signed with new key. Old tokens remain valid until they expire (15 min access token lifetime limits exposure).

**Key rotation procedure:**

```
1. Generate new key: openssl rand -base64 32
2. Update Key Vault secret (Azure Portal or az keyvault secret set)
3. Restart App Service: az webapp restart --name {app-name} --resource-group {rg}
4. Old access tokens expire within 15 minutes
5. Refresh tokens continue to work (validated by hash, not JWT signature)
```

### 4.3 Rate Limiting

**Implementation:** .NET 9 built-in `System.Threading.RateLimiting` middleware (see §2.5 for configuration).

**Per-platform rate limiting** (future enhancement):
- Add `X-Client-Platform` header to requests from mobile (value: `ios` or `android`) and web (value: `web`).
- Rate limiter keys can incorporate platform: `$"{ip}:{platform}"`.
- Not required for MVP — current baseline already uses per-authenticated-user limits for protected compute endpoints and per-IP limits for anonymous endpoints.

**No infrastructure changes needed.** Rate limiting is in-memory per App Service instance. For multi-instance production deployments, each instance maintains its own rate limit counters. This means the effective rate limit is `N × limit` where N is the instance count. This is acceptable — rate limiting is a safety net, not a precise throttle.

> **When to upgrade to distributed rate limiting:** If scaling beyond 5 instances, consider Azure Cache for Redis as a distributed rate limit store. This requires a new Azure resource (~$13/month for C0 Basic tier).

### 4.4 Health Check Endpoint

**No change needed.** The existing `/health` endpoint serves both web and mobile health checks. The Flutter app calls `/api/v1/app-config` for version checking (not `/health`).

### 4.5 App-Config Endpoint

New endpoint as specified in ADR-014. Backend implementation details:

- **Route:** `GET /api/v1/app-config`
- **Authentication:** None (public)
- **Rate limit:** `30/min per IP` (dedicated limiter policy)
- **Response caching:** 5-minute `Cache-Control: max-age=300` header (reduces load for frequent app launches)
- **Configuration source:** `appsettings.json` via `IOptions<AppConfigOptions>` pattern

```csharp
// Endpoint registration
app.MapGet("/api/v1/app-config", (IOptions<AppConfigOptions> options) =>
{
    var config = options.Value;
    return Results.Ok(new
    {
        minimumVersion = config.MinimumVersion,
        latestVersion = config.LatestVersion,
        updateUrl = new
        {
            ios = config.UpdateUrls.Ios,
            android = config.UpdateUrls.Android
        },
        maintenanceMode = config.MaintenanceMode,
        maintenanceMessage = config.MaintenanceMessage
    });
})
.WithName("GetAppConfig")
.WithTags("App Config")
.RequireRateLimiting("app-config")
.CacheOutput(policy => policy.Expire(TimeSpan.FromMinutes(5)));
```

---

## 5. Security Considerations for Mobile

### 5.1 Certificate Pinning

Certificate pinning is a **post-launch enhancement** (not MVP). MVP relies on standard TLS validation with HTTPS enforcement.

**Implementation options:**

| Approach | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| Pin leaf certificate | Strongest protection | Breaks on cert renewal (Let's Encrypt = every 90 days for App Service managed certs) | **Not recommended** |
| Pin intermediate CA cert | Survives leaf cert renewal | Breaks if CA changes (rare) | **Post-launch option** |
| Pin public key (SPKI hash) | Survives cert renewal if key is reused | Requires careful key management | **Preferred post-launch** |

**Reference implementation for post-launch rollout** (using `dio` with `SecurityContext`):

```dart
// Pin the intermediate CA certificate
final securityContext = SecurityContext(withTrustedRoots: true);
securityContext.setTrustedCertificatesBytes(intermediateCaCertBytes);

final dio = Dio(BaseOptions(baseUrl: apiBaseUrl))
  ..httpClientAdapter = IOHttpClientAdapter(
    createHttpClient: () {
      final client = HttpClient(context: securityContext);
      client.badCertificateCallback = (cert, host, port) => false;
      return client;
    },
  );
```

**Certificate rotation plan (post-launch):**
- Azure App Service managed certificates auto-renew. Pinning the intermediate CA (e.g., Microsoft Azure RSA TLS Issuing CA) avoids breakage on leaf rotation.
- Bundle the pinned certificate hash in the app. If the CA changes, a forced app update (`minimumVersion` bump) can deliver new pins.
- Implement a certificate pin bypass for development/staging environments.

### 5.2 API Key for Mobile Clients

**Assessment: Not required for MVP, recommended for post-MVP.**

An API key header (`X-Api-Key`) could distinguish mobile from web traffic and enable:
- Per-platform rate limiting
- Abuse detection (revoke a compromised API key)
- Analytics segmentation

**Why not MVP:** The API key would be embedded in the app binary. Even with obfuscation, a determined attacker can extract it. It provides identification (not authentication) — JWT already handles authentication. The added complexity isn't justified for MVP.

**Post-MVP implementation:**
- Generate unique API keys per platform (`ios-prod-xxx`, `android-prod-xxx`)
- Store in Key Vault, inject via app build configuration
- Backend middleware validates the key and adds `clientPlatform` to the request context
- Rotate keys by deploying a new app version with a new key

### 5.3 Device Attestation (Post-MVP)

**Not for MVP.** Document as future security enhancements:

| Platform | API | Purpose |
|----------|-----|---------|
| Android | Play Integrity API | Verify the app is genuine (not repackaged), running on a real device (not emulator), and the device is not rooted |
| iOS | App Attest (DeviceCheck framework) | Verify the app is a legitimate copy from the App Store, running on genuine Apple hardware |

**Implementation timeline:** After MVP launch, when/if API abuse from fake clients is detected. Both APIs require:
- Server-side verification endpoint (backend calls Google/Apple to validate attestation tokens)
- ~2 weeks of implementation work per platform
- Possible Key Vault secrets for Google/Apple API credentials

### 5.4 Token Storage

Handled entirely on the client side — no Azure infrastructure changes:

| Platform | Storage Mechanism | Encryption | Backed Up? |
|----------|------------------|-----------|------------|
| iOS | Keychain Services | Hardware-backed (Secure Enclave on devices with it) | Depends on Keychain accessibility level |
| Android | EncryptedSharedPreferences | AES-256-GCM, master key in Android Keystore | No (encrypted prefs not included in backups) |

Implementation via `flutter_secure_storage` (see ADR-012, Part 6).

**Keychain accessibility:** `KeychainAccessibility.first_unlock_this_device` — tokens are available after first unlock and remain device-bound (no cross-device restore), which is preferred for auth tokens.

### 5.5 Obfuscation & Debug Symbols

Flutter `--obfuscate` flag strips symbol names from the release binary. The `--split-debug-info=<dir>` flag outputs debug symbols separately.

**Symbol upload flow (in `mobile-deploy.yml`):**

```
Flutter build --obfuscate --split-debug-info=build/debug-info/
    ↓
iOS: dSYM files in build/debug-info/ios/
Android: symbol files in build/debug-info/android/
    ↓
Upload to Firebase Crashlytics via firebase crashlytics:symbols:upload
    ↓
Crashlytics can now symbolicate crash reports
```

**Important:** Debug symbol artifacts are also uploaded to GitHub Actions artifacts (retained for 90 days) as a backup in case Crashlytics symbol upload fails.

---

## 6. Monitoring & Observability

### 6.1 Monitoring Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Mobile Clients (Flutter)                                    │
│  ┌───────────────┐  ┌──────────────────┐                    │
│  │ Firebase       │  │ Firebase         │                    │
│  │ Crashlytics    │  │ Analytics        │                    │
│  │ (crashes)      │  │ (user analytics) │                    │
│  └───────┬───────┘  └────────┬─────────┘                    │
│          │                    │                               │
│          ▼                    ▼                               │
│    Firebase Console    Firebase Console                      │
└──────────────────────┬───────────────────────────────────────┘
                       │ API calls with
                       │ X-Client-Platform header
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  Backend API (App Service)                                    │
│  ┌────────────────────────┐                                   │
│  │ Application Insights   │                                   │
│  │ (APM, logs, metrics)   │                                   │
│  │ + clientPlatform dim.  │                                   │
│  └───────────┬────────────┘                                   │
│              ▼                                                │
│    Log Analytics Workspace                                    │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│  Web Client (Next.js)                                          │
│  ┌────────────────────────┐                                    │
│  │ Application Insights   │  (if browser SDK added, optional) │
│  │ (client-side telemetry)│                                    │
│  └────────────────────────┘                                    │
└────────────────────────────────────────────────────────────────┘
```

### 6.2 Firebase Crashlytics

**Purpose:** Crash reporting for iOS and Android native code and Dart exceptions.

**Configuration:**
- Firebase project created in Firebase Console (one project, two apps: iOS + Android)
- `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) bundled in the app
- `firebase_crashlytics` Flutter package initialized in `main.dart`
- Non-fatal Dart exceptions captured via `FlutterError.onError` and `PlatformDispatcher.instance.onError`
- Obfuscated crash stacks symbolicated using uploaded dSYM/debug symbols

**No Azure infrastructure needed.** Firebase is a standalone Google service.

**Cost:** Free tier covers up to 10 billion events/month — effectively unlimited for this project.

### 6.3 Firebase Analytics

**Purpose:** User analytics for mobile apps (session counts, screen views, custom events like game completions, difficulty selection, AI move latency).

**Key events to track:**

| Event | Parameters | Purpose |
|-------|-----------|---------|
| `game_started` | `difficulty`, `color`, `time_control` | Feature usage |
| `game_completed` | `result`, `difficulty`, `move_count`, `duration_seconds` | Engagement |
| `ai_move_latency` | `difficulty`, `latency_ms` | Performance |
| `app_update_prompted` | `current_version`, `latest_version`, `action` (updated/dismissed) | Update adoption |
| `auth_login` | `method` (email) | Auth funnel |
| `auth_registration` | `method` (email) | Growth |

**Cost:** Free tier is generous (500 events/user/day, unlimited users). No charges expected.

### 6.4 Application Insights — `clientPlatform` Custom Dimension

The backend continues to use Application Insights for APM. To segment metrics by client platform, add a custom `clientPlatform` dimension.

**Implementation:**

1. **Flutter app** adds `X-Client-Platform: ios` or `X-Client-Platform: android` header to all API requests (via `dio` interceptor).
2. **Next.js app** adds `X-Client-Platform: web` header to all API requests (via fetch wrapper).
3. **Backend middleware** reads the header and adds it as a custom dimension to the Application Insights telemetry:

```csharp
// Middleware to capture client platform
app.Use(async (context, next) =>
{
    var platform = context.Request.Headers["X-Client-Platform"].FirstOrDefault() ?? "unknown";
    var telemetry = context.Features.Get<RequestTelemetry>();
    if (telemetry != null)
    {
        telemetry.Properties["clientPlatform"] = platform;
    }
    await next();
});
```

**Kusto queries for per-platform monitoring:**

```kusto
// Error rate by platform (last 24h)
requests
| where timestamp > ago(24h)
| extend platform = tostring(customDimensions["clientPlatform"])
| summarize errorRate = countif(resultCode >= 500) * 100.0 / count() by platform
| order by errorRate desc

// P95 response time by platform
requests
| where timestamp > ago(1h)
| extend platform = tostring(customDimensions["clientPlatform"])
| summarize p95 = percentile(duration, 95) by platform, name
| order by p95 desc
```

### 6.5 Alert Updates

**Current alerts** (from `infra/main.bicep`):

| Alert | Threshold | Scope |
|-------|----------|-------|
| Error rate | >10 HTTP 5xx in 15 min | Backend App Service |
| Response time | >5s average in 15 min | Backend App Service |
| Health check | <100% in 5 min | Backend App Service |

**Recommended additions for mobile support:**

No new Azure alert resources needed for MVP. The existing alerts cover the backend API, which serves both web and mobile. Per-platform alerting can be achieved with Application Insights custom alerts (configured via Azure Portal, not Bicep for now):

| Alert | Condition | Priority |
|-------|----------|----------|
| Mobile error spike | `customDimensions.clientPlatform in ("ios","android")` error rate >5% | Post-MVP |
| App-config endpoint latency | P95 response time for `/api/v1/app-config` >2s | Post-MVP |

**Firebase alerts** (configured in Firebase Console):
- Crashlytics: Alert on crash-free rate drop below 99%
- Crashlytics: Alert on new crash cluster (regression detection)
- These are Firebase-native alerts — no Azure infrastructure needed

---

## 7. Environment Strategy

### 7.1 Environment Matrix

| Component | Dev | Staging | Prod |
|-----------|-----|---------|------|
| **Backend App Service** | B1 (Basic) | B1 (Basic) | P1v3 (Premium) |
| **PostgreSQL** | Burstable B1ms | Burstable B1ms | General Purpose D2ds_v4 |
| **Static Web App** | Free | Free | Standard |
| **Auto-scaling** | Disabled | Disabled | 2–10 instances |
| **Flutter build mode** | Debug | Release | Release |
| **iOS distribution** | TestFlight (internal) | TestFlight (external testers) | App Store (public) |
| **Android distribution** | Play Store (internal testing) | Play Store (closed testing) | Play Store (production) |
| **Backend URL** | `draughts-dev-xxx-api.azurewebsites.net` | `draughts-staging-xxx-api.azurewebsites.net` | `draughts-prod-xxx-api.azurewebsites.net` (or custom domain) |
| **Firebase project** | `international-draughts-dev` | `international-draughts-staging` | `international-draughts-prod` |

### 7.2 Flutter Environment Configuration

The Flutter app must target different backend URLs per environment. Use dart compile-time defines:

```bash
# Dev
flutter run --dart-define=API_BASE_URL=https://draughts-dev-xxx-api.azurewebsites.net

# Staging
flutter build ipa --dart-define=API_BASE_URL=https://draughts-staging-xxx-api.azurewebsites.net

# Prod
flutter build ipa --dart-define=API_BASE_URL=https://api.internationaldraughts.com
```

The `mobile-deploy.yml` workflow passes the appropriate `--dart-define` based on the deployment environment (selected via `workflow_dispatch` input or derived from the tag/branch).

### 7.3 Deployment Flow

```
Developer pushes code
    ↓
CI (ci.yml) runs tests on all platforms
    ↓                              ↓                              ↓
Backend + Web (deploy.yml)    Flutter Dev     (mobile-deploy.yml, manual dispatch, track=internal)
Auto-deploy on merge to       Internal testers only
main to Dev environment
    ↓                              ↓
Manual promote to staging     manual dispatch, track=beta
    ↓                              ↓
Manual promote to prod        manual dispatch, track=production
```

**Key principle:** Backend and Flutter deployments are independent. The backend is deployed via `deploy.yml`, Flutter via `mobile-deploy.yml`. They share no deployment dependency, but backend breaking changes must be deployed first (before the Flutter version that requires them).

---

## 8. Cost Impact Assessment

### 8.1 New Recurring Costs

| Item | Cost | Frequency | Notes |
|------|------|-----------|-------|
| **Apple Developer Program** | $99 | Annual | Required for App Store + TestFlight |
| **Google Play Developer** | $25 | One-time | Required for Play Store |
| **GitHub Actions — macOS runners** | ~$50–100 | Monthly | iOS compile checks + release builds. See calculation below. |
| **GitHub Actions — Linux runners** | ~$5–10 | Monthly | Flutter/Dart CI jobs |
| **Firebase Crashlytics** | $0 | — | Free tier (effectively unlimited) |
| **Firebase Analytics** | $0 | — | Free tier (500 events/user/day) |
| **Firebase project hosting** | $0 | — | No Firebase Hosting used (Blaze plan = pay-as-you-go, but with no usage = $0) |

### 8.2 GitHub Actions Cost Calculation

**CI runs (`ci.yml` — per PR + merge):**

| Job | Runner | Duration | Cost/Run | Runs/Month* | Monthly Cost |
|-----|--------|----------|----------|-------------|------------|
| `flutter-and-dart-engine` (Linux) | ubuntu-latest | ~5 min | ~$0.04 | 80 | ~$3.20 |
| `ios-compile-check` (macOS) | macos-14 | ~12 min | ~$0.96 | 20** | ~$19.20 |

*Assumes ~10 PRs/week + merges to main/develop.
**macOS job only runs on pushes to main/develop (not every PR).

**Deploy runs (`mobile-deploy.yml` — per release):**

| Job | Runner | Duration | Cost/Run | Runs/Month | Monthly Cost |
|-----|--------|----------|----------|-------------|------------|
| iOS build + deploy (macOS) | macos-14 | ~20 min | ~$1.60 | 4 | ~$6.40 |
| Android build + deploy (Linux) | ubuntu-latest | ~15 min | ~$0.12 | 4 | ~$0.48 |
| Test job (Linux) | ubuntu-latest | ~5 min | ~$0.04 | 4 | ~$0.16 |

**Estimated total CI/CD cost: ~$30–50/month** (dominated by macOS runner time).

### 8.3 No New Azure Resource Costs

| Azure Resource | Change | Cost Impact |
|----------------|--------|-------------|
| App Service | Same plan (B1 dev / P1v3 prod) — serves mobile + web | $0 incremental |
| PostgreSQL | Same SKU — RefreshTokens table adds negligible storage | $0 incremental |
| Key Vault | 2 new secrets — well within free tier (10K operations/month) | $0 incremental |
| Application Insights | More telemetry from mobile requests — within free 5 GB/month ingestion | ~$0 (monitor usage) |
| Static Web App | Unchanged | $0 |

### 8.4 Total Incremental Cost

| Category | Monthly | Annual |
|----------|---------|--------|
| CI/CD (GitHub Actions) | ~$30–50 | ~$360–600 |
| Apple Developer Program | ~$8.25 | $99 |
| Google Play Developer | — | $25 (one-time) |
| Firebase | $0 | $0 |
| Azure infrastructure | $0 | $0 |
| **Total** | **~$40–60** | **~$484–724** |

---

## 9. Migration Sequence & Dependencies

### 9.1 Dependency Graph

```
Phase 1 (Prerequisites — No mobile CI/CD yet)
├── Backend auth overhaul (ADR-012)          ← BLOCKER for mobile launch
│   ├── JWT validation middleware
│   ├── Refresh token endpoint + DB table
│   ├── Authorization guards on endpoints
│   └── Key Vault secrets (jwt-signing-key, refresh-encryption-key)
├── App-config endpoint (ADR-014)            ← BLOCKER for mobile launch
└── Bicep updates (§2.2, §2.3)              ← Deploy infra changes

Phase 2 (CI/CD Setup — Parallel with Flutter development)
├── Apple Developer account setup
├── Google Play Developer account setup
├── Firebase project creation (dev + prod)
├── Fastlane configuration (ios/ and android/)
├── GitHub secrets provisioning (13 new secrets)
├── ci.yml — add flutter-and-dart-engine job
└── mobile-deploy.yml — create new workflow

Phase 3 (Flutter Development — ADR-015, ADR-010)
├── Dart engine package (shared/draughts-engine-dart/)
├── Flutter app (mobile/)
├── Integration with auth (ADR-012)
├── Integration with app-config (ADR-014)
└── Firebase Crashlytics + Analytics integration

Phase 4 (Launch)
├── Internal testing (TestFlight internal + Play Store internal)
├── Beta testing (TestFlight external + Play Store closed testing)
├── App Store review submission
├── Play Store review submission
└── Production release
```

### 9.2 Critical Path

```
Bicep updates → Backend auth overhaul → App-config endpoint → Flutter app connects to backend
                                                                  ↓
Firebase setup → Crashlytics integration ─────────────────────→ Beta testing
                                                                  ↓
Apple/Google account setup → Fastlane config → mobile-deploy.yml → Store submissions
```

**Estimated timeline:** 8–12 weeks from start to first public App Store / Play Store release (assuming dedicated full-time developer).

---

## 10. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| 1 | **Apple code signing breaks in CI** — Xcode version mismatch, expired certificates, WWDC changes | High | Medium | Pin Xcode version in workflow. Use Fastlane Match for cert management. Budget 1–2 hours/month for maintenance. |
| 2 | **App Store rejection** — metadata issues, missing privacy policy, missing data deletion flow | Medium | High | Submit early with minimal build. GDPR account deletion (already implemented) satisfies Apple's data deletion requirement. |
| 3 | **macOS runner cost escalation** — more PRs → more iOS compile checks | Medium | Low | Path filters limit macOS runs. Consider self-hosted Mac Mini if >$150/month. |
| 4 | **JWT key rotation outage** — new key deployed to some instances but not others during rolling restart | Low | High | Use Key Vault versioned secrets. App Service slot swaps for zero-downtime key rotation. Short access token lifetime (15 min) limits blast radius. |
| 5 | **Firebase Crashlytics symbol mismatch** — debug symbols not uploaded, crash reports unsymbolicated | Medium | Medium | CI uploads symbols in same job as build. Retain symbols as GitHub Actions artifacts (90 days) for manual re-upload. |
| 6 | **Rate limiter false positives** — corporate NAT puts many users behind one IP | Low | Medium | Use generous limits (100/min per IP). Add `X-Forwarded-For` handling for App Service's reverse proxy. Consider authenticated user ID as partition key for logged-in users. |
| 7 | **Backend DB migration failure** — RefreshTokens table migration breaks existing schema | Low | High | Test migration in dev/staging first. Use EF Core migration rollback scripts. |
| 8 | **Play Store internal testing delays** — first-time app setup in Play Console takes 7+ days | Medium | Low | Start Play Console setup early in Phase 2. Submit a placeholder AAB to initiate review. |

---

## Appendix A: Bicep Changes Summary

| File | Change | Lines Affected |
|------|--------|---------------|
| `infra/main.bicep` | Add `jwtSigningKey` and `refreshTokenEncryptionKey` parameters | +8 lines (params) |
| `infra/main.bicep` | Add Key Vault secret resources for JWT keys | +20 lines (2 resources) |
| `infra/main.bicep` | Add Key Vault role assignment for App Service managed identity | +14 lines (1 resource) |
| `infra/main.bicep` | Add JWT and AppConfig app settings to backendApp | +30 lines (app settings) |
| `infra/parameters/dev.bicepparam` | Add `jwtSigningKey` and `refreshTokenEncryptionKey` parameter values | +2 lines |
| `infra/parameters/staging.bicepparam` | Same as dev | +2 lines |
| `infra/parameters/prod.bicepparam` | Same as dev | +2 lines |

**Total estimated Bicep changes: ~78 lines across 4 files.**

## Appendix B: Workflow Files Summary

| File | Status | Purpose |
|------|--------|---------|
| `.github/workflows/ci.yml` | Modified | Add `flutter-and-dart-engine` + `ios-compile-check` jobs |
| `.github/workflows/deploy.yml` | Unchanged | Backend + frontend deployment |
| `.github/workflows/mobile-deploy.yml` | New | Flutter build + Fastlane store deployment |

## Appendix C: References

- [ADR-010: Mobile CI/CD Pipeline](../adr/adr-010-mobile-cicd-pipeline.md) — GitHub Actions + Fastlane decision
- [ADR-012: Backend Authentication Overhaul](../adr/adr-012-backend-auth-overhaul.md) — JWT validation, refresh tokens
- [ADR-013: Flutter Web Strategy](../adr/adr-013-flutter-web-strategy.md) — Flutter = iOS + Android only
- [ADR-014: App Versioning and Forced Updates](../adr/adr-014-app-versioning-forced-updates.md) — `/api/v1/app-config` endpoint
- [ADR-015: Shared Engine as Dart Package](../adr/adr-015-shared-engine-dart-package.md) — Dart engine at `shared/draughts-engine-dart/`
- [Current infra/main.bicep](../../infra/main.bicep) — Existing Azure infrastructure
- [Current .github/workflows/ci.yml](../../.github/workflows/ci.yml) — Existing CI pipeline
- [Current .github/workflows/deploy.yml](../../.github/workflows/deploy.yml) — Existing deploy pipeline
