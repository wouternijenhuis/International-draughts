# ADR-010: Mobile CI/CD Pipeline

## Status

Proposed

## Date

2026-02-21

## Context

The Flutter migration requires building, testing, signing, and distributing native iOS and Android applications — a fundamentally different CI/CD challenge than the current Next.js static export deployed to Azure Static Web Apps. The existing CI pipeline (`ci.yml`) runs two parallel jobs on Linux runners:

1. **Backend**: restore → build (Release) → test with coverage
2. **Frontend & Shared**: lint → typecheck → build → test with coverage

Neither job uses macOS runners, produces signed mobile binaries, or interacts with app stores. The DevLead review (§2.8) flagged this as a **critical gap**, noting "zero detail" in the PRD on what is "a notoriously complex topic."

### Key Challenges

**iOS Code Signing:**
- Requires a macOS runner (GitHub Actions `macos-latest` or `macos-14`)
- macOS runners cost $0.08/min vs $0.008/min for Linux — **10× more expensive**
- Needs an Apple Distribution Certificate (`.p12`) and Provisioning Profile (`.mobileprovision`) stored as GitHub secrets
- CI must create a temporary Keychain, import the certificate, build, and clean up
- Xcode version must be pinned (different Xcode versions produce different Swift runtimes)
- App Store submission via `xcrun altool`, `xcrun notarytool`, or Fastlane's `deliver`
- TestFlight distribution for beta testing requires App Store Connect API key

**Android Code Signing:**
- Requires a keystore file (`.jks`) stored as a GitHub secret (Base64-encoded)
- `key.properties` must be generated at build time from secrets
- Java/Gradle version pinning for reproducible builds
- App Bundle (`.aab`) format required for Play Store (APK for direct distribution)
- Play Store upload via Fastlane's `supply` or `gradle-play-publisher`

**Integration with Existing CI:**
- Must not break existing backend and frontend CI jobs
- Should reuse the same PR/push trigger conventions (on push/PR to `main` and `develop`)
- Artifact upload patterns should be consistent

**Cost Considerations:**
- GitHub Actions free tier: 2,000 minutes/month (Linux), but macOS minutes are billed at 10× rate
- A single iOS build + test cycle takes ~15–20 minutes on macOS = ~$1.20–$1.60 per run
- With 10 PRs/week, iOS CI alone costs ~$50–$65/month
- Budget-conscious approach: minimize macOS runner usage

### Options Evaluated

| Option | Description |
|--------|-------------|
| **A. GitHub Actions + Fastlane** | Use existing CI platform; Fastlane automates code signing, building, and store uploads |
| **B. Codemagic** | Purpose-built Flutter CI/CD; managed macOS runners; built-in code signing |
| **C. Bitrise** | Mobile-focused CI/CD; visual workflow editor; pre-built Flutter steps |
| **D. Azure Pipelines** | Consistent with existing Azure infrastructure; macOS agents available |

## Decision

### Use GitHub Actions with Fastlane for all mobile CI/CD.

This keeps the entire CI/CD pipeline in a single platform (GitHub Actions), consistent with the existing `ci.yml` and `deploy.yml` workflows. Fastlane handles the complex code signing and store distribution tasks that would otherwise require hundreds of lines of shell scripting.

### Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  ci-flutter.yml  (on push/PR to main, develop)                  │
│                                                                 │
│  job-1 (Linux) ─── flutter analyze + flutter test               │
│                    dart engine tests                             │
│                    coverage check (≥85% engine, widget tests ≥50% statements / ≥40% branches) │
│                                                                 │
│  job-2 (Linux) ─── flutter build apk --debug                    │
│                    (verify Android compiles)                     │
│                                                                 │
│  job-3 (macOS) ─── flutter build ios --no-codesign              │
│                    (verify iOS compiles, NO signing)             │
│                    (golden tests run on Linux baseline runner)   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  deploy-flutter.yml  (manual dispatch or tag push v*)           │
│                                                                 │
│  job-1 (macOS) ─── fastlane ios beta                            │
│                    ├── match (fetch signing certs from repo)     │
│                    ├── flutter build ipa                         │
│                    ├── sign with distribution cert               │
│                    └── upload_to_testflight                      │
│                                                                 │
│  job-2 (Linux) ─── fastlane android beta                        │
│                    ├── generate key.properties from secrets      │
│                    ├── flutter build appbundle                   │
│                    ├── sign with release keystore                │
│                    └── upload_to_play_store (internal track)     │
│                                                                 │
│  job-3 (manual) ── fastlane ios release / android release       │
│                    (promote beta → production)                   │
└─────────────────────────────────────────────────────────────────┘
```

### CI Job Details

**Job 1 — Lint, Test, Coverage (Linux, ~5 min):**
```yaml
- uses: subosito/flutter-action@v2
  with:
    flutter-version: '3.x'
    channel: 'stable'
- run: flutter analyze --fatal-infos
- run: flutter test --coverage
- run: |
    # Check coverage thresholds
    lcov --summary coverage/lcov.info
```
This runs on every PR and push. Linux runner = cheapest option. No signing, no device builds.

**Job 2 — Android Compile Check (Linux, ~8 min):**
```yaml
- uses: actions/setup-java@v4
  with:
    distribution: 'temurin'
    java-version: '17'
- run: flutter build apk --debug
```
Verifies Android compilation without signing. Debug mode is faster and doesn't require keystore.

**Job 3 — iOS Compile Check (macOS, ~12 min):**
```yaml
runs-on: macos-14  # Apple Silicon runner
- run: flutter build ios --no-codesign
```
Verifies iOS compilation without signing certificates. This is the expensive job (~$0.96/run). Runs only on pushes to `main`/`develop` and PRs that modify `lib/`, `pubspec.yaml`, or iOS-specific files — **not** on documentation-only or test-only PRs.

**Cost optimization:** Use path filters to skip the macOS job when only Dart/test files change:
```yaml
jobs:
  ios-compile:
    if: |
      contains(github.event.head_commit.modified, 'ios/') ||
      contains(github.event.head_commit.modified, 'lib/') ||
      contains(github.event.head_commit.modified, 'pubspec')
```

### Fastlane Configuration

**iOS (`ios/fastlane/Fastfile`):**
```ruby
default_platform(:ios)

platform :ios do
  desc "Push a new beta build to TestFlight"
  lane :beta do
    setup_ci  # Create temporary keychain for CI
    match(type: "appstore", readonly: true)  # Fetch certs
    build_flutter_app(  # Custom action or shell
      build_args: "--release --no-tree-shake-icons"
    )
    upload_to_testflight(
      api_key_path: "fastlane/api_key.json",
      skip_waiting_for_build_processing: true
    )
  end

  desc "Promote TestFlight build to App Store"
  lane :release do
    upload_to_app_store(
      api_key_path: "fastlane/api_key.json",
      skip_binary_upload: true,  # Already uploaded via beta
      submit_for_review: true,
      automatic_release: false
    )
  end
end
```

**Android (`android/fastlane/Fastfile`):**
```ruby
default_platform(:android)

platform :android do
  desc "Push a new beta build to Play Store internal track"
  lane :beta do
    build_flutter_app(build_args: "--release")
    upload_to_play_store(
      track: "internal",
      aab: "../build/app/outputs/bundle/release/app-release.aab",
      json_key: "fastlane/play_store_key.json"
    )
  end

  desc "Promote internal track to production"
  lane :release do
    upload_to_play_store(
      track: "internal",
      track_promote_to: "production",
      json_key: "fastlane/play_store_key.json"
    )
  end
end
```

### Code Signing Strategy

**iOS — Fastlane Match:**
- Certificates and provisioning profiles stored in a **private GitHub repository** (encrypted)
- `match` fetches and installs them automatically in CI
- Avoids storing raw certificates as GitHub secrets (more secure, easier rotation)
- Single source of truth for signing identities across all developers and CI

**Android — GitHub Secrets:**
- Keystore file stored as Base64-encoded GitHub secret (`ANDROID_KEYSTORE_BASE64`)
- Key alias and passwords stored as separate secrets (`ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, `ANDROID_STORE_PASSWORD`)
- `key.properties` generated at build time:
  ```yaml
  - run: |
      echo "storeFile=$(pwd)/release.jks" > android/key.properties
      echo "storePassword=${{ secrets.ANDROID_STORE_PASSWORD }}" >> android/key.properties
      echo "keyAlias=${{ secrets.ANDROID_KEY_ALIAS }}" >> android/key.properties
      echo "keyPassword=${{ secrets.ANDROID_KEY_PASSWORD }}" >> android/key.properties
      echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 -d > release.jks
  ```

### Version Bumping

App version (`pubspec.yaml` version + build number) is managed via Fastlane or a pre-build script:

- **Version string** (`1.2.3`): Bumped manually in `pubspec.yaml` for semantic releases
- **Build number** (`+42`): Auto-incremented in CI using the GitHub Actions run number:
  ```yaml
  - run: flutter build ipa --build-number=${{ github.run_number }}
  ```
  This ensures monotonically increasing build numbers without manual tracking.

## Consequences

### Positive

- **Single CI platform.** All pipelines (backend .NET, frontend Next.js, Flutter mobile) live in GitHub Actions. One place to monitor, one set of credentials, one billing account.
- **Fastlane handles complexity.** Code signing, certificate management, and store uploads are Fastlane's core competency. The project benefits from a decade of community solutions for common signing issues.
- **Cost-controlled.** The macOS runner is only used for iOS compilation checks and release builds. Lint/test/Android-compile run on Linux at 1/10th the cost. Path filtering further reduces unnecessary macOS runs.
- **Existing team knowledge.** The team already uses GitHub Actions for CI. No new platform to learn or onboard to.
- **Incremental adoption.** Fastlane can be introduced lane by lane — start with `beta`, add `release` later. No big-bang migration.
- **Match for iOS signing.** A shared signing repository eliminates "works on my machine" signing issues and makes onboarding new developers trivial.

### Negative

- **macOS runner cost.** Even with path filtering, expect $50–$100/month in GitHub Actions usage for iOS CI. This is acceptable for a production app but non-trivial.
  - **Mitigation:** Consider self-hosted macOS runners (Mac Mini) if volume grows. Alternatively, run iOS compile checks only on `main` (not PRs) to halve costs.
- **Fastlane maintenance.** Fastlane is a Ruby gem. Ruby version management, Bundler, and gem conflicts can cause CI flakiness. Fastlane itself releases frequently and occasionally has breaking changes.
  - **Mitigation:** Pin Fastlane version in `Gemfile.lock`. Use `setup_ci` action for consistent Ruby environment. Budget 1–2 hours/month for Fastlane maintenance.
- **First-time setup effort.** Setting up Match (Git repo, encryption key), App Store Connect API key, Play Store service account, and all GitHub secrets takes 1–2 days of concentrated DevOps work.
  - **Mitigation:** This is one-time cost. Document the setup thoroughly in a `docs/ci-cd-setup.md` runbook.
- **Apple ecosystem friction.** Apple frequently changes code signing workflows, Xcode versions, and notarization requirements. CI breakage due to Apple changes is a recurring reality.
  - **Mitigation:** Pin Xcode version explicitly. Subscribe to Apple developer news. Budget time for post-WWDC CI fixes.

## Alternatives Considered

### Alternative 1: Codemagic

Purpose-built Flutter CI/CD platform with managed macOS infrastructure, built-in code signing, and native Flutter integration.

| Criterion | Codemagic | GitHub Actions + Fastlane (chosen) |
|-----------|-----------|-------------------------------------|
| **Setup effort** | Lower — built-in code signing UI, automatic provisioning profile management | Higher — manual Fastlane config, Match setup, secret management |
| **macOS cost** | Included in plan ($49/month for 500 build minutes) | $0.08/min, pay-as-you-go (~$50–100/month) |
| **Flutter integration** | Native — auto-detects Flutter projects, pre-configured build steps | Manual — `subosito/flutter-action` for SDK setup |
| **Platform fragmentation** | Splits CI across two platforms (GitHub for backend, Codemagic for Flutter) | All in one platform |
| **Flexibility** | Limited to Codemagic's workflow model | Full GitHub Actions flexibility (custom scripts, matrix builds, reusable workflows) |
| **Vendor lock-in** | Codemagic-specific `codemagic.yaml` format | Fastlane is platform-agnostic; GitHub Actions is widely portable |

**Rejected because:** Splitting CI across two platforms creates operational overhead (two dashboards, two sets of credentials, two billing accounts, two notification configurations). The cost savings of Codemagic's managed macOS don't justify the fragmentation for a project that already has well-established GitHub Actions workflows.

### Alternative 2: Bitrise

Mobile-focused CI/CD with visual workflow editor and pre-built steps.

**Rejected because:** Same platform fragmentation concern as Codemagic. Bitrise's visual editor is useful for teams without CI expertise, but this project already has functional GitHub Actions workflows. Bitrise's free tier (300 credits/month) is insufficient for regular builds. Pricing is less predictable than GitHub Actions pay-as-you-go.

### Alternative 3: Azure Pipelines

Consistent with the project's Azure infrastructure (Azure Static Web Apps, Azure App Service).

**Rejected because:** While Azure Pipelines has macOS agents, the Flutter ecosystem tooling (actions, community steps) is significantly weaker than GitHub Actions. The `flutter-action` GitHub Action has 4K+ stars and is actively maintained; Azure Pipelines has no equivalent first-party Flutter task. Additionally, migrating existing CI from GitHub Actions to Azure Pipelines would be additional work with no clear benefit — the backend is deployed via GitHub Actions, not Azure Pipelines.

### Alternative 4: Raw GitHub Actions (No Fastlane)

Implement all code signing and store uploads directly in GitHub Actions YAML with shell commands.

**Rejected because:** iOS code signing in raw shell commands requires ~80–100 lines of YAML for keychain management, certificate import, profile installation, and cleanup. This is fragile, hard to debug, and duplicates what Fastlane's `match` + `gym` + `deliver` handle in 10 lines of Ruby. The maintenance cost of raw scripts exceeds the cost of the Fastlane dependency.

## Related

- [Flutter Migration PRD Review — §2.8 CI/CD for Mobile](../migration/flutter-migration-prd-review.md) — DevLead identification of CI/CD as a critical gap
- [Flutter Migration PRD — §2.1 In Scope](../migration/flutter-migration-prd.md) — "CI/CD updates: GitHub Actions workflows for Flutter build, test, and deployment"
- [AGENTS.md — §9 CI/CD Pipeline](../../AGENTS.md) — Existing CI/CD structure and quality gates
- Existing workflow: `.github/workflows/ci.yml` — Current CI pipeline to extend (not replace)
- Existing workflow: `.github/workflows/deploy.yml` — Current deployment pipeline pattern
