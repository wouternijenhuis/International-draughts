# International Draughts

A Progressive Web Application for playing International Draughts (10×10) against AI opponents of varying difficulty.

## Quick Start

```bash
# Prerequisites: .NET 9 SDK, Node.js 22+, Docker Desktop
docker compose up
```

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:5000](http://localhost:5000)
- **Swagger**: [http://localhost:5000/swagger](http://localhost:5000/swagger)

## Features

- **FMJD-compliant** 10×10 draughts with all official rules
- **Four AI difficulty levels**: Easy, Medium, Hard, Expert
- **Player vs Computer** and **local Player vs Player** (pass-and-play)
- **Timed mode** with Fischer increment and countdown formats
- **Player profiles** with Glicko-2 rating, game history, and statistics
- **Customizable settings**: board themes, piece styles, sounds, move hints
- **PWA support** for installable web app experience
- **Responsive design** with full accessibility (WCAG 2.1 AA)

## Project Structure

| Directory | Description |
|-----------|-------------|
| `backend/` | ASP.NET Core 9 REST API |
| `frontend/` | Next.js 16 / React 19 client |
| `shared/draughts-engine/` | Pure TypeScript game engine library |
| `infra/` | Azure Bicep infrastructure-as-code |
| `e2e/` | Playwright end-to-end tests |
| `specs/` | PRD, feature specs, and task specifications |
| `docs/` | This documentation site (MkDocs) |

## Documentation Sections

- [Architecture Overview](architecture/overview.md) — System design and patterns
- [API Reference](api/reference.md) — Backend REST API endpoints
- [Game Rules](game-rules.md) — FMJD International Draughts rules
- [AI Engine](ai-engine.md) — AI difficulty levels and search algorithms
- [Deployment](deployment.md) — Azure infrastructure and CI/CD
