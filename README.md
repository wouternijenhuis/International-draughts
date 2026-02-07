# International Draughts

A progressive web application for playing international draughts (10×10) against AI opponents.

## Prerequisites

- [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- [Node.js 22+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Quick Start

### Using Docker Compose (recommended)

```bash
# Start all services
docker compose up

# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
# Swagger UI: http://localhost:5000/swagger
```

### Manual Development

```bash
# Backend
cd backend
dotnet restore
dotnet run --project src/InternationalDraughts.Api

# Frontend (in another terminal)
cd frontend
npm install
npm run dev

# Shared library
cd shared/draughts-engine
npm install
npm run build
npm test
```

## Project Structure

```
├── backend/                    # ASP.NET Core 9 Web API
│   ├── src/
│   │   ├── InternationalDraughts.Api/         # Controllers, middleware
│   │   ├── InternationalDraughts.Application/  # Services, interfaces
│   │   ├── InternationalDraughts.Domain/       # Entities, value objects
│   │   └── InternationalDraughts.Infrastructure/ # Data access
│   └── tests/
├── frontend/                   # Next.js 15 TypeScript
│   └── src/
│       ├── app/               # App router pages
│       ├── features/          # Feature modules
│       ├── hooks/             # Custom hooks
│       └── lib/               # Utilities
├── shared/
│   └── draughts-engine/       # Game rules engine (TypeScript)
│       └── src/types/         # Board, piece, move types
├── infra/                     # Azure Bicep IaC
└── .github/workflows/         # CI/CD pipelines
```

## Testing

```bash
# Backend tests
cd backend && dotnet test

# Frontend tests
cd frontend && npm test

# Shared library tests
cd shared/draughts-engine && npm test
```

## CI/CD

- **Pull Requests**: Lint → Build → Test (all projects in parallel)
- **Main branch**: Lint → Build → Test → Deploy to Development
- **Manual deployment**: Staging and Production via workflow dispatch

## Infrastructure

Azure resources provisioned via Bicep:
- Static Web Apps (frontend)
- App Service (backend API)
- PostgreSQL Flexible Server
- Application Insights + Log Analytics
- Auto-scaling (production)
