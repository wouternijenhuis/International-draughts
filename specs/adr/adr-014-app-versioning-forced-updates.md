# ADR-014: App Versioning and Forced Updates

## Status

Proposed

## Date

2026-02-21

## Context

Mobile apps persist on user devices indefinitely. Unlike the web app (where deploying a new version of the Next.js static export instantly updates all users), a Flutter app on a user's phone continues running the old version until they manually update from the App Store or Google Play.

This creates critical risks:

1. **API breaking changes.** If the backend changes an endpoint contract (e.g., renames a field, changes a response shape), old app versions will break.
2. **Security vulnerabilities.** A critical security fix (e.g., patching a token storage vulnerability) cannot be forced onto installed apps.
3. **Game rule fixes.** If a FMJD compliance bug is found in the Dart engine, users running old versions continue playing with incorrect rules.
4. **Backend compatibility matrix.** Without version enforcement, the backend must maintain backward compatibility with every app version ever released — an unsustainable burden.

The DevLead review (§2.6) flagged this as missing from the PRD with severity 🟡 Medium, noting:

> "Critical for mobile apps but entirely missing from the PRD. Without forced updates, you cannot deprecate old API versions or fix critical security issues in deployed apps."

### Requirements

- **Version check on app start** — before any API calls, verify the app version is supported
- **Minimum version enforcement** — block usage of dangerously outdated versions
- **Update prompts** — encourage (but don't force) updates for versions that are outdated but not critical
- **Graceful degradation** — if the version check endpoint is unreachable, the app should still function
- **No third-party dependency** — avoid Firebase dependency for a single config endpoint

## Decision

### Implement a custom backend endpoint for version checking with a lightweight client-side enforcement layer.

### Backend Endpoint

Add a new public (unauthenticated) endpoint:

```
GET /api/v1/app-config
Response:
{
  "minimumVersion": "1.2.0",
  "latestVersion": "1.5.0",
  "updateUrl": {
    "ios": "https://apps.apple.com/app/international-draughts/id123456",
    "android": "https://play.google.com/store/apps/details?id=com.draughts.international"
  },
  "maintenanceMode": false,
  "maintenanceMessage": null
}
```

| Field | Purpose |
|-------|---------|
| `minimumVersion` | Versions below this are **blocked** — app shows "Update Required" screen with no bypass |
| `latestVersion` | Versions below this but above minimum get a **dismissible** "Update Available" prompt |
| `updateUrl` | Platform-specific store links for the update button |
| `maintenanceMode` | If `true`, app shows maintenance screen. Useful for backend migrations. |
| `maintenanceMessage` | Custom message displayed during maintenance |

**Version comparison** uses semantic versioning (`Major.Minor.Patch`). Comparison logic:

```dart
bool isVersionBelow(String current, String minimum) {
  final currentParts = current.split('.').map(int.parse).toList();
  final minimumParts = minimum.split('.').map(int.parse).toList();
  for (var i = 0; i < 3; i++) {
    if (currentParts[i] < minimumParts[i]) return true;
    if (currentParts[i] > minimumParts[i]) return false;
  }
  return false; // Equal
}
```

### Client-Side Implementation

```dart
class AppVersionService {
  final Dio _dio;

  /// Checks app version against backend config.
  /// Returns the action the app should take.
  Future<VersionCheckResult> checkVersion() async {
    try {
      final response = await _dio.get('/api/v1/app-config');
      final config = AppConfig.fromJson(response.data);

      if (config.maintenanceMode) {
        return VersionCheckResult.maintenance(config.maintenanceMessage);
      }

      final currentVersion = await _getCurrentVersion();

      if (isVersionBelow(currentVersion, config.minimumVersion)) {
        return VersionCheckResult.forceUpdate(
          storeUrl: Platform.isIOS
              ? config.updateUrl.ios
              : config.updateUrl.android,
        );
      }

      if (isVersionBelow(currentVersion, config.latestVersion)) {
        return VersionCheckResult.suggestUpdate(
          storeUrl: Platform.isIOS
              ? config.updateUrl.ios
              : config.updateUrl.android,
        );
      }

      return VersionCheckResult.upToDate();
    } on DioException {
      // Network error — allow app to function
      return VersionCheckResult.upToDate();
    }
  }

  Future<String> _getCurrentVersion() async {
    final info = await PackageInfo.fromPlatform();
    return info.version; // e.g., "1.5.0"
  }
}

sealed class VersionCheckResult {
  const VersionCheckResult();
  const factory VersionCheckResult.upToDate() = UpToDate;
  const factory VersionCheckResult.suggestUpdate({required String storeUrl}) = SuggestUpdate;
  const factory VersionCheckResult.forceUpdate({required String storeUrl}) = ForceUpdate;
  const factory VersionCheckResult.maintenance(String? message) = Maintenance;
}
```

### App Startup Flow

```
App Launch
    ↓
Splash Screen (show app icon + loading indicator)
    ↓
AppVersionService.checkVersion()
    ↓
┌────────────────────────────────────────────────────────────┐
│ UpToDate          → Proceed to normal app startup          │
│ SuggestUpdate     → Show dismissible dialog, then proceed  │
│ ForceUpdate       → Show blocking "Update Required" screen │
│ Maintenance       → Show "Under Maintenance" screen        │
│ NetworkError      → Proceed (graceful degradation)         │
└────────────────────────────────────────────────────────────┘
```

### Version Check Behavior

| Scenario | Behavior | Bypass Allowed |
|----------|----------|----------------|
| `currentVersion >= latestVersion` | No prompt. Normal app flow. | N/A |
| `minimumVersion <= currentVersion < latestVersion` | Dismissible dialog: "A new version is available. Update now?" with "Update" and "Later" buttons. | Yes — "Later" dismisses for this session |
| `currentVersion < minimumVersion` | Blocking screen: "This version is no longer supported. Please update to continue." with "Update" button and no dismiss option. | **No** — app is unusable |
| `maintenanceMode == true` | Blocking screen: "We're performing maintenance. Please try again later." Custom message if provided. | **No** — app is unusable |
| Version check API unreachable | No prompt. Normal app flow. Assume up-to-date. | N/A |

### Soft Update Prompt Throttling

The "suggest update" dialog should not annoy users who choose to defer:

- Show the dialog **once per app launch session** (not on every foreground event)
- If the user taps "Later", don't show again for **3 days** (store dismissal timestamp in `SharedPreferences`)
- If a **new** `latestVersion` is detected (higher than the previously dismissed version), reset the throttle and show the dialog again

```dart
class UpdatePromptThrottle {
  static const _key = 'update_dismissed_at';
  static const _versionKey = 'update_dismissed_version';
  static const _cooldownDays = 3;

  Future<bool> shouldShowPrompt(String latestVersion) async {
    final prefs = await SharedPreferences.getInstance();
    final dismissedVersion = prefs.getString(_versionKey);

    // New version available — always show
    if (dismissedVersion != latestVersion) return true;

    // Same version — check cooldown
    final dismissedAt = prefs.getInt(_key) ?? 0;
    final elapsed = DateTime.now().millisecondsSinceEpoch - dismissedAt;
    return elapsed > _cooldownDays * 24 * 60 * 60 * 1000;
  }

  Future<void> recordDismissal(String version) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_key, DateTime.now().millisecondsSinceEpoch);
    await prefs.setString(_versionKey, version);
  }
}
```

### Version Numbering Strategy

| Component | Managed By | Example |
|-----------|-----------|---------|
| **Version string** (`pubspec.yaml`) | Developer, bumped on release | `1.2.0` |
| **Build number** (`pubspec.yaml +N`) | CI, auto-incremented (ADR-010) | `+47` (GitHub Actions run number) |
| **iOS CFBundleShortVersionString** | From version string | `1.2.0` |
| **iOS CFBundleVersion** | From build number | `47` |
| **Android versionName** | From version string | `1.2.0` |
| **Android versionCode** | From build number | `47` |

**Semantic versioning rules:**
- **Major** (`2.0.0`): Breaking API changes, major UI redesign. `minimumVersion` bumps to this.
- **Minor** (`1.3.0`): New features, non-breaking API additions. `latestVersion` bumps.
- **Patch** (`1.2.1`): Bug fixes, security patches. `latestVersion` bumps; `minimumVersion` bumps only for security-critical patches.

### Backend Administration

The `minimumVersion` and `latestVersion` values are stored in the backend configuration (appsettings.json or database). For MVP, use appsettings.json:

```json
{
  "AppConfig": {
    "MinimumVersion": "1.0.0",
    "LatestVersion": "1.0.0",
    "MaintenanceMode": false,
    "MaintenanceMessage": null,
    "UpdateUrls": {
      "Ios": "https://apps.apple.com/app/international-draughts/id123456",
      "Android": "https://play.google.com/store/apps/details?id=com.draughts.international"
    }
  }
}
```

Updating requires a backend redeployment. For more dynamic control, migrate to a database table in a future iteration.

## Consequences

### Positive

- **API evolution is safe.** When a breaking backend change is needed, bump `minimumVersion` to the version that supports the new API. Old clients are blocked before they hit broken endpoints.
- **Security patches are enforceable.** Critical security fixes can be forced by setting `minimumVersion` to the patched version. Users on vulnerable versions are blocked immediately.
- **No third-party dependency.** No Firebase Remote Config, no third-party SDK. A single lightweight GET endpoint returning 6 fields. Zero cost, zero vendor lock-in.
- **Maintenance mode for free.** Backend migrations or emergency downtime can gracefully inform users instead of showing cryptic network errors.
- **Graceful degradation.** If the version check endpoint is unreachable (network error, backend down), the app functions normally. Offline users (playing against local AI) are never blocked.
- **Platform-native update flow.** The "Update" button opens the App Store / Play Store page. Users update through the channel they already know.

### Negative

- **Requires backend deployment for version bumps.** Changing `minimumVersion` requires updating appsettings.json and redeploying the backend. For urgent security patches, this is additional deployment friction.
  - **Mitigation:** Backend deployments are automated via `deploy.yml` (GitHub Actions). The delay is the deployment pipeline time (~5 minutes), not manual work. Database-backed config can be added later for instant updates.
- **Race condition on app launch.** The version check runs on app start. If the user is already using the app when `minimumVersion` is bumped, they won't see the block until the next app launch.
  - **Mitigation:** For critical security patches, also return `403 Forbidden` with a custom body from protected API endpoints for old versions. The HTTP client interceptor can detect this and show the update screen mid-session.
- **Version check adds ~200ms to cold start.** A network request on every app launch adds latency before the user sees the main screen.
  - **Mitigation:** Run the version check **in parallel** with other startup tasks (loading saved game, reading settings, initializing theme). The splash screen absorbs this latency. If the check takes > 3 seconds (slow network), proceed without waiting.
- **Build number management.** Auto-incrementing build numbers from GitHub Actions run number works until the workflow is recreated (resetting the counter). Edge case but could cause Play Store rejection (build number must be strictly increasing).
  - **Mitigation:** Use a floor value: `buildNumber = max(github.run_number, 1000)` to ensure the number always exceeds any previously submitted build.

## Alternatives Considered

### Alternative 1: Firebase Remote Config

Use Firebase Remote Config to store `minimumVersion` and `latestVersion`. The app fetches config on launch.

**Rejected because:**
- Adds Firebase SDK dependency (~2–3 MB to binary size) for a single config endpoint.
- Requires Firebase project setup, google-services.json (Android) and GoogleService-Info.plist (iOS).
- Firebase Remote Config has propagation delays (up to 12 hours for non-real-time fetches). A critical security patch needs faster enforcement.
- The project doesn't use Firebase for anything else (Crashlytics was recommended as optional in the PRD, but is not confirmed).
- A custom endpoint is 20 lines of backend code. Firebase Remote Config is a sledgehammer for a thumbtack.

### Alternative 2: in_app_update (Android) + App Store API (iOS)

Use Android's Play Core `in_app_update` library for flexible/immediate updates and check the App Store version via the iTunes lookup API.

**Rejected because:**
- Platform-specific implementation: `in_app_update` is Android-only. iOS has no equivalent in-app update mechanism (Apple requires users to update via the App Store).
- `in_app_update` requires Google Play Core library and only works for apps distributed via Play Store (not sideloaded APKs or alternative stores).
- The App Store lookup API (`https://itunes.apple.com/lookup?bundleId=...`) returns the published version but has caching delays (up to 24 hours after an app update is approved).
- Two different implementations for two platforms, each with its own quirks, vs. one backend endpoint that works for both.

### Alternative 3: No Version Check (Rely on Natural Updates)

Trust that users will update and accept some version fragmentation.

**Rejected because:**
- App Store data shows ~30% of users don't update within 30 days of a new release, even with auto-update enabled (auto-update may be disabled, WiFi-only update settings, insufficient storage).
- Backend breaking changes become impossible. The backend must maintain backward compatibility with all released versions forever.
- Security vulnerabilities in old versions cannot be remediated. The project handles authentication tokens — leaving known-vulnerable versions in circulation is irresponsible.
- This approach works for apps with stable APIs and no server dependency. International Draughts has an active backend (Expert AI, game persistence, authentication, player profiles) that will evolve.

## Related

- [Flutter Migration PRD Review — §2.6 App Versioning & Forced Updates](../migration/flutter-migration-prd-review.md) — DevLead identification of missing requirement
- [Flutter Migration PRD — §12.5 Pre-Migration Work](../migration/flutter-migration-prd.md) — Pre-migration tasks (version check not listed — gap)
- [ADR-010: Mobile CI/CD Pipeline](adr-010-mobile-cicd-pipeline.md) — Build number management strategy (GitHub Actions run number)
- [ADR-012: Backend Authentication Overhaul](adr-012-backend-auth-overhaul.md) — Protected endpoints; version check must be public (unauthenticated)
- [AGENTS.md — §6 API Design](../../AGENTS.md) — API route conventions (`/api/v1/` prefix)
