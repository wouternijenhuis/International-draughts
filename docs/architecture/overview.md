# Architecture Overview

## System Architecture

The International Draughts application follows a three-tier architecture:

```
┌─────────────────────────────────────────────────┐
│                  Frontend (Next.js 16)          │
│  React 19 · Zustand · Tailwind CSS · PWA       │
│  Client-side AI (Easy/Medium/Hard)              │
└───────────────────┬─────────────────────────────┘
                    │ REST API (HTTPS)
┌───────────────────┴─────────────────────────────┐
│               Backend (ASP.NET Core 9)          │
│  Expert AI · Auth · Player Data · Settings      │
│  EF Core 9 · PostgreSQL                         │
└─────────────────────────────────────────────────┘
```

## Shared Engine

The `@international-draughts/engine` TypeScript library is a **zero-dependency** package containing:

- **Game rules**: Move generation, capture validation, promotion, draw detection
- **AI**: Alpha-beta search with iterative deepening and evaluation
- **Clock**: Fischer increment and countdown time controls
- **Rating**: Glicko-2 player rating system

This library is used directly by the frontend for client-side AI (Easy/Medium/Hard). The backend has an equivalent C# implementation for the Expert AI.

## Key Design Decisions

### Client-Side vs. Server-Side AI

- **Easy/Medium/Hard**: Run entirely in the browser for instant responsiveness
- **Expert**: Runs on the backend server with deep search, transposition tables, and advanced pruning

### State Management

- Game state managed client-side via Zustand stores
- Server communication only for: Expert AI moves, authentication, player data persistence
- Stateless AI API: each request includes the full board position

### Data Persistence

| User Type | Settings | Game State | History |
|-----------|----------|------------|---------|
| Guest | Session storage | Session storage | Not persisted |
| Registered | Backend + local | Local + backend sync | Backend |

## Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Backend | ASP.NET Core (Minimal API) | 9.0 |
| Frontend | Next.js | 16.x |
| UI Library | React | 19.x |
| State | Zustand | 5.x |
| Styling | Tailwind CSS | 3.x |
| Database | PostgreSQL (via EF Core) | 9.x |
| Testing | xUnit, Vitest, Playwright | Latest |
| CI/CD | GitHub Actions | — |
| Cloud | Azure (Static Web Apps, App Service) | — |
