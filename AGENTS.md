# AGENTS.md — Development Standards & Guidelines

> This document synthesizes coding standards, architectural patterns, and quality gates
> for the International Draughts project. All contributors and AI agents must follow
> these guidelines when working on the codebase.

---

## 1. Project Overview

International Draughts is a Progressive Web Application for playing 10×10 draughts
(FMJD rules) against AI opponents at four difficulty levels. The system comprises:

| Layer | Technology | Location |
|-------|-----------|----------|
| **Backend API** | ASP.NET Core 9 (Minimal API) | `backend/` |
| **Frontend** | Next.js 16, React 19, TypeScript 5.9 | `frontend/` |
| **Shared Engine** | Pure TypeScript (no deps) | `shared/draughts-engine/` |
| **Infrastructure** | Azure Bicep, GitHub Actions | `infra/`, `.github/workflows/` |

---

## 2. Architecture Principles

### 2.1 Layered Architecture (Backend)

```
API Layer → Application Layer → Domain Layer
                ↓
         Infrastructure Layer
```

- **API** (`InternationalDraughts.Api`): Minimal API endpoints, middleware, DTOs, OpenAPI.
- **Application** (`InternationalDraughts.Application`): Business logic, services, interfaces, Expert AI engine.
- **Domain** (`InternationalDraughts.Domain`): Entities, value objects, enums, domain interfaces. No external dependencies.
- **Infrastructure** (`InternationalDraughts.Infrastructure`): EF Core, repositories, database configurations.

**Dependency rule**: Inner layers never reference outer layers. Domain has zero NuGet packages.

### 2.2 Frontend Architecture

- **App Router** (Next.js): File-based routing under `src/app/`.
- **State Management**: Zustand stores in `src/stores/`.
- **Components**: Reusable UI in `src/components/`, organized by feature (board, game, settings, profile, clock, replay, pwa).
- **Hooks**: Custom hooks in `src/hooks/`.
- **Lib**: Utilities, API client, game persistence in `src/lib/`.

### 2.3 Shared Engine

- Pure TypeScript library with **zero runtime dependencies**.
- Contains: game rules engine, move generator, AI (alpha-beta search), clock logic, Glicko-2 rating.
- Must work in both browser and Node.js environments.
- Imported by the frontend; the backend has its own C# implementation of the same rules.

---

## 3. Coding Standards

### 3.1 TypeScript (Frontend & Shared)

- **Strict mode** enabled (`strict: true` in tsconfig).
- **No unused locals/parameters** (`noUnusedLocals`, `noUnusedParameters`).
- **No implicit returns** (`noImplicitReturns`).
- Use `readonly` for immutable properties.
- Prefer `interface` over `type` for object shapes; use `type` for unions/intersections.
- Use barrel exports (`index.ts`) for module public APIs.
- All public functions and types must have JSDoc comments.

### 3.2 C# (.NET Backend)

- Target `.NET 9.0` (global.json: `9.0.0` with `latestMinor` roll-forward).
- **Nullable reference types** enabled project-wide.
- **Implicit usings** enabled.
- Use **records** for DTOs and value objects.
- Use **Minimal API** pattern with endpoint group extension methods.
- Follow standard C# naming: `PascalCase` for public members, `_camelCase` for private fields.
- All endpoint methods should return `IResult` types (`Results.Ok()`, `Results.NotFound()`, etc.).

### 3.3 General

- No secrets in code — use configuration/environment variables.
- All API responses use structured JSON with consistent error format.
- CORS restricted to the configured frontend origin.
- HTTPS enforced with HSTS headers.

---

## 4. Testing Standards

### 4.1 Coverage Thresholds

| Layer | Minimum Coverage |
|-------|-----------------|
| **Shared Engine** | ≥85% (statements, branches, functions, lines) |
| **Frontend** | ≥40% statements, ≥50% branches, ≥30% functions, ≥40% lines |
| **Backend** | Covered by CI test run; aim for ≥85% on domain/application |

### 4.2 Test Frameworks

| Layer | Framework | Runner |
|-------|-----------|--------|
| Backend | xUnit + FluentAssertions + Moq | `dotnet test` |
| Frontend | Vitest + React Testing Library | `npm test` |
| Shared Engine | Vitest | `npm test` |
| E2E | Playwright | `npx playwright test` |

### 4.3 Test Organization

- **Backend**: Test projects mirror source structure (`InternationalDraughts.Domain.Tests`, `.Application.Tests`, `.Api.Tests`).
- **Frontend**: Tests colocated with components in `__tests__/` directories, or alongside source files as `*.test.ts(x)`.
- **Shared**: Tests in `tests/` directory, one test file per module.

### 4.4 Test Requirements

- Test all public methods/functions.
- Test edge cases and error conditions.
- Use descriptive test names following the pattern: `MethodName_Condition_ExpectedResult`.
- No test should depend on external services (mock API calls, database).

---

## 5. Linting & Formatting

### 5.1 Frontend

- **ESLint** 9 with `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`.
- Zero warnings policy (`--max-warnings 0`).
- Respect React 19 lint rules: no setState in effects, no ref access during render.

### 5.2 Shared Engine

- **ESLint** 9 with `@eslint/js` recommended + `typescript-eslint` recommended.
- TypeScript-aware linting via `projectService`.

### 5.3 Backend

- Standard .NET analyzers enabled via SDK.

---

## 6. API Design

### 6.1 Route Conventions

```
/api/auth/*          — Authentication (register, login, delete account)
/api/settings/*      — User settings CRUD
/api/player/*        — Player profiles, stats, rating history, game history
/api/v1/ai/*         — AI move computation (Expert mode)
/api/v1/games/*      — In-progress game state persistence
/health              — Health check
```

### 6.2 Request/Response Patterns

- Use DTOs for all request/response bodies (never expose domain entities directly).
- Validate all inputs at the API layer.
- Return appropriate HTTP status codes (200, 201, 204, 400, 404, 500).
- Include correlation IDs in all responses via middleware.

---

## 7. State Management (Frontend)

- **Zustand** for global state (game store, auth store).
- Game store manages full game lifecycle: setup → in-progress → finished.
- Auth store manages JWT tokens, login/logout, user session.
- Use `persist` middleware for state that should survive page reloads.
- Game persistence: session storage (guests), local storage (registered users), backend sync.

---

## 8. AI Architecture

### 8.1 Client-Side (Easy/Medium/Hard)

- Runs in the browser via the shared engine.
- Alpha-beta search with iterative deepening.
- Difficulty controlled by: search depth, evaluation noise, blunder probability.
- Must never make illegal moves regardless of difficulty.

### 8.2 Server-Side (Expert)

- Runs on the backend via `Application/ExpertAi/`.
- Uses: iterative deepening, PVS, LMR, aspiration windows, transposition table, killer moves, history heuristic.
- Stateless API: each request includes the full board position.
- Falls back to Hard difficulty if server unreachable.

---

## 9. CI/CD Pipeline

### 9.1 CI (`ci.yml`)

Triggered on push/PR to `main` and `develop`. Two parallel jobs:

1. **Backend**: restore → build (Release) → test with coverage → upload artifacts.
2. **Frontend & Shared**: lint → typecheck → build → test with coverage → upload artifacts.

### 9.2 Deploy (`deploy.yml`)

- **Dev**: auto-deploy on merge to `main`.
- **Staging/Prod**: manual dispatch.

### 9.3 Quality Gates

All must pass before merge:
- ✅ Backend builds with zero errors and zero warnings.
- ✅ All backend tests pass (192 tests).
- ✅ Shared engine: zero type errors, zero lint errors, all 190 tests pass.
- ✅ Frontend: zero type errors, zero lint errors, all 162 tests pass.
- ✅ Code coverage meets thresholds.

---

## 10. Documentation

- **Specs**: Feature and task specifications in `specs/`.
- **Docs**: Project documentation in `docs/` (MkDocs format).
- **API**: OpenAPI/Swagger auto-generated at `/swagger` (dev only).
- **Code**: JSDoc/XML doc comments on all public APIs.

When updating documentation:
- Use MkDocs Markdown format.
- Update existing docs rather than creating separate summaries.
- Keep docs in sync with code changes.

---

## 11. Game Rules Reference

The game implements FMJD International Draughts rules:
- 10×10 board, 50 playable dark squares (numbered 1–50).
- 20 pieces per player on first four rows.
- Mandatory captures; maximum capture rule.
- Flying kings (move/capture any distance diagonally).
- Man promotes only when stopping on the back row at end of turn.
- Draw rules: threefold repetition, 25-move king-only rule, 16-move endgame rule.

All move generation and game outcome detection must be 100% FMJD-compliant.

---

## 12. Security

- Authentication via email/password (future: OAuth with Microsoft, Apple, Google).
- JWT tokens for API authentication.
- Password hashing (SHA-256 for MVP; upgrade to bcrypt/Argon2id for production).
- All communication over HTTPS/TLS.
- CORS restricted to frontend origin.
- No secrets in source code.
- GDPR-compliant data handling (account deletion supported).
