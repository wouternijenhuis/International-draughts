# ADR-013: Flutter Web Strategy

## Status

Proposed

## Date

2026-02-21

## Context

The Flutter migration must decide whether Flutter Web replaces the existing Next.js frontend, coexists alongside it, or is dropped entirely as a target. This decision has major implications for maintenance cost, user experience, and deployment architecture.

### Current Web App

The existing frontend is a Next.js 16 application deployed as a **static export** (`output: 'export'`) to Azure Static Web Apps. Key characteristics:

- **No SSR/ISR.** Despite using Next.js, the app is a purely client-side SPA. All rendering happens in the browser.
- **Small bundle.** Static export produces a compact JavaScript bundle (estimated < 500 KB compressed).
- **Good SEO potential.** While currently a SPA, Next.js can be reconfigured for SSR if SEO becomes a priority (e.g., for the landing page).
- **Mature accessibility.** React + HTML produces native DOM elements. Screen readers, keyboard navigation, and ARIA attributes work reliably.
- **27 components, ~8,000 LoC** — well-tested (162 tests) and stable.

### Flutter Web Characteristics

| Attribute | Flutter Web (CanvasKit) | Flutter Web (HTML) | Next.js (Current) |
|-----------|------------------------|--------------------|--------------------|
| **Bundle size** | ~5–8 MB (CanvasKit WASM ~2 MB + app code) | ~2–3 MB (lighter but less consistent) | < 500 KB |
| **Rendering** | Canvas/WebGL — pixel-perfect across browsers | Mix of DOM + Canvas — some inconsistencies | Native DOM elements |
| **SEO** | None — renders to `<canvas>`, invisible to crawlers | Limited — some DOM elements for text | Full (if SSR enabled) |
| **Accessibility** | Via `SemanticsBinding` — overlays an invisible DOM tree. Less mature than native HTML a11y. | Better than CanvasKit but still not native | Native HTML + ARIA — gold standard |
| **Text rendering** | Custom text engine — may differ from native browser feel | Uses browser text rendering | Native browser text |
| **Initial load** | 3–5 seconds (WASM download + initialization) | 1–2 seconds | < 1 second |
| **Performance (steady state)** | 60fps for canvas animations | Variable — DOM manipulation can be slower | 60fps with optimized CSS transitions |
| **Browser support** | WebAssembly + WebGL2 required (no IE, limited old Safari) | Broader support | Universal |
| **URL routing** | Hash-based by default (`/#/play`); path strategy requires config | Same | Clean paths (`/play`) |

### The DevLead's Position

The DevLead review (§6.3) **strongly recommends** keeping Next.js for web:

> "Given the significant web regression risks, strongly favor Option A (Q2): iOS + Android first, keeping the Next.js web app. Flutter Web should only be evaluated after native apps are stable."

The review identifies specific regressions:
- Bundle size: 10–16× larger than current
- SEO: Lost entirely with CanvasKit
- Accessibility: Less mature than native HTML
- Initial load: 3–5× slower
- Browser compatibility: Narrower

### Decision Criteria

- **User experience**: Does Flutter Web provide a better or equal experience to Next.js?
- **Maintenance cost**: What is the ongoing cost of maintaining two frontends?
- **Development velocity**: Can features be shipped faster with a single codebase?
- **Performance**: Is Flutter Web fast enough for a board game?
- **SEO**: Does the landing page need search engine visibility?
- **Accessibility**: Can Flutter Web meet WCAG AA requirements?

## Decision

### Keep Next.js for web. Flutter targets iOS and Android only. Flutter Web is not a build target.

The current Next.js web app continues to serve web users. Flutter builds are produced for iOS and Android only. Flutter Web is explicitly excluded from the build matrix and CI pipeline.

### Rationale

The decision is based on a clear cost-benefit analysis where the costs of Flutter Web significantly outweigh the benefits for this project:

**The "single codebase" benefit is an illusion for this project.** The backend API is shared. The game rules engine has parity (TypeScript and Dart implementations, with test parity). The actual frontend code that would be "shared" by Flutter Web is UI layout, styling, and platform integration — exactly the areas where Flutter Web performs worst compared to native web technologies.

**The specific regressions are unacceptable:**

1. **Bundle size (10–16× increase).** A board game has casual, mobile-data users (persona: Aisha, commuting on cellular data). Loading 5–8 MB vs. 500 KB is the difference between "instant" and "will they wait?" First-time web visitors who encounter a 5-second load will bounce.

2. **Accessibility regression.** The current app has `role="dialog"`, `aria-live="polite"`, `aria-modal`, screen reader labels on every square (`"Square 23, White king"`), and native focus management. Flutter Web's `SemanticsBinding` overlay provides less reliable screen reader support and loses native HTML semantics. For a game marketed as accessible (WCAG AA target), this is a regression.

3. **SEO elimination.** While the current app doesn't use SSR, it *could*. The landing page (`/`) is a server component that could be indexed by search engines. Flutter Web's canvas rendering is invisible to crawlers. If the project ever needs organic web traffic (e.g., for "international draughts online" searches), Flutter Web forecloses this.

4. **No performance improvement.** The current web app runs at 60fps with CSS transitions. Flutter Web would also target 60fps — but with higher initial load, higher memory usage, and CanvasKit WASM overhead. There is no performance gain to justify the regressions.

### What Stays the Same

- The Next.js web app continues to be maintained and deployed to Azure Static Web Apps
- New features are implemented in both Next.js and Flutter where applicable
- The backend API serves both clients without changes (once the auth overhaul from ADR-012 is complete)
- The shared engine TypeScript version continues to serve the web app

### What Changes

- New mobile-specific features (haptic feedback, biometric auth, push notifications) are Flutter-only
- The Flutter CI/CD pipeline (ADR-010) produces iOS and Android artifacts only — no web build
- Feature development prioritizes mobile-first for new features, with web implementation following

### Maintenance Strategy for Two Frontends

| Concern | Approach |
|---------|----------|
| **Feature drift** | Maintain a shared feature parity checklist. Web gets new features within 2 sprints of mobile launch. |
| **Shared logic** | Game rules, AI, clock, rating are in shared packages (TypeScript engine for web, Dart engine for mobile). Logic changes are made in both. |
| **API changes** | Backend API is the single source of truth. Both clients consume the same endpoints. |
| **Testing** | Each frontend has its own test suite. Engine test parity is enforced via cross-validation. |
| **Deprecation path** | If Flutter Web matures significantly (bundle size < 2 MB, native-quality a11y), revisit this decision. Target: re-evaluate after 12 months. |

### Re-Evaluation Triggers

This decision should be revisited if any of the following occur:

1. **Flutter Web ships Wasm GC support** that reduces bundle size below 2 MB
2. **Flutter Web accessibility** reaches parity with native HTML (verified via real screen reader testing)
3. **The Next.js web app requires a major rewrite** (e.g., framework migration) — Flutter Web could be the replacement if it's mature enough
4. **Team resources constrain dual maintenance** — if maintaining two frontends is unsustainable, consolidation to Flutter Web (with its regressions) may be the lesser evil

## Consequences

### Positive

- **No web regression.** Existing web users see zero change. Bundle size, load time, accessibility, and SEO remain at current levels.
- **Faster mobile launch.** Eliminating Flutter Web from scope removes a testing surface (web browsers × OS versions), reduces CI/CD complexity, and eliminates Flutter Web-specific bugs. Estimated 2–3 weeks saved across the migration.
- **Focused optimization.** Flutter code can use native mobile APIs (haptics, secure storage, biometrics) without `kIsWeb` conditionals and platform-specific fallbacks.
- **Accessibility confidence.** The web app continues to use native HTML + ARIA — the most reliable accessibility foundation. WCAG AA compliance is maintained without the uncertainty of Flutter Web's SemanticsBinding.
- **SEO option preserved.** If organic web traffic becomes a business priority, the Next.js app can be reconfigured for SSR without rearchitecting.

### Negative

- **Dual maintenance cost.** Two frontend codebases means every feature is implemented twice. For UI-only features (e.g., a new settings option), this is roughly 2× development time. For logic changes that live in the shared engine, the overhead is lower (change engine + update UI in both).
  - **Mitigation:** The shared engine (TypeScript + Dart) contains the highest-complexity logic (game rules, AI, rating). UI code is lower-complexity (forms, layouts, animations) and changes less frequently post-migration.
  - **Estimated ongoing cost:** 20–30% additional development time for feature work. This is significant but manageable for a team of this size.
- **Two state management paradigms.** Web uses Zustand; mobile uses Riverpod (ADR-009). Developers must context-switch between paradigms.
  - **Mitigation:** The state management *patterns* (immutable state, actions, selectors) are similar across Zustand and Riverpod. The APIs differ but the mental model is the same.
- **Potential feature drift.** Without discipline, one frontend may get features the other doesn't. This creates a fragmented user experience.
  - **Mitigation:** Feature parity checklist maintained in project management. Web features blocked on mobile parity and vice versa (unless explicitly mobile/web-only features like haptics or SSR).
- **No desktop app.** Flutter's desktop targets (macOS, Windows, Linux) are excluded because they require Flutter Web's infrastructure or native desktop builds. The PRD marks these as P2/P3 priority.
  - **Mitigation:** Desktop users access the web app. The board game genre doesn't strongly demand desktop native apps — web access is sufficient.

## Alternatives Considered

### Alternative 1: Flutter Web Replaces Next.js

Build Flutter for web, deploy Flutter Web to Azure Static Web Apps, and deprecate the Next.js app.

**Rejected because:**
- All five regressions (bundle size, SEO, accessibility, load time, browser compatibility) apply. The current web app is superior on every web-specific metric.
- "Single codebase" saves development time but at the cost of user experience. A 5 MB bundle with degraded accessibility is not a good trade for a casual board game that needs to convert first-time web visitors.
- Flutter Web is excellent for web apps that prioritize visual fidelity over web-native behavior (e.g., data dashboards, design tools). A board game with text content, forms, and accessibility requirements is not the ideal Flutter Web use case.

### Alternative 2: Flutter Web Coexists During Transition, Then Replaces

Launch Flutter for mobile first. After 6 months, evaluate Flutter Web quality and potentially replace Next.js.

**Rejected as the default plan because:**
- "Evaluate later" creates ambiguity. The team would need to maintain Flutter Web compatibility throughout development (adding `kIsWeb` checks, testing on browsers, handling web-specific edge cases) even if the web target is never shipped. This is wasted effort if Flutter Web is ultimately not adopted.
- Better to explicitly exclude Flutter Web now and re-evaluate with concrete triggers (see Re-Evaluation Triggers above). If the triggers fire, a focused Flutter Web effort can be undertaken.

### Alternative 3: Flutter Mobile + Flutter Web (Full Multiplatform)

Build Flutter for all platforms from day one. Accept the web regressions.

**Rejected because:**
- The PRD prioritizes iOS and Android as P0 targets. Web is P1. Adding web to the Flutter build matrix adds 20–30% to testing scope (Chrome, Safari, Firefox × desktop/mobile) and delays the mobile launch.
- The web regressions are real and measurable. Accepting them is a conscious user experience degradation that benefits the development team (single codebase) at the expense of web users.
- This option is reconsidered if the team lacks bandwidth for dual maintenance — at that point, the trade-off may flip.

## Related

- [Flutter Migration PRD — §2.3 Platform Targets](../migration/flutter-migration-prd.md) — Platform priority matrix (iOS P0, Android P0, Web P1)
- [Flutter Migration PRD — §10 Q1](../migration/flutter-migration-prd.md) — Open question on Flutter Web vs. Next.js coexistence
- [Flutter Migration PRD — §10 Q2](../migration/flutter-migration-prd.md) — Platform priority decision
- [Flutter Migration PRD Review — §6.3 Web (Flutter Web)](../migration/flutter-migration-prd-review.md) — DevLead analysis of Flutter Web regressions
- [Flutter Migration Analysis — §1 Architecture Overview](../migration/flutter-migration-analysis.md) — Current Next.js architecture (static export, no SSR)
- [ADR-010: Mobile CI/CD Pipeline](adr-010-mobile-cicd-pipeline.md) — CI produces iOS and Android builds only (no web)
