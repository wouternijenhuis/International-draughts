# Deployment

## Architecture

```
                    ┌──────────────────┐
                    │   Azure CDN /    │
                    │  Static Web Apps │ ← Frontend (Next.js)
                    └────────┬─────────┘
                             │
                    ┌────────┴─────────┐
                    │   Azure App      │
                    │   Service        │ ← Backend API (.NET 9)
                    └────────┬─────────┘
                             │
                    ┌────────┴─────────┐
                    │   Azure Database │
                    │   for PostgreSQL │ ← Flexible Server
                    └──────────────────┘
```

## Environments

| Environment | Trigger | Purpose |
|------------|---------|---------|
| **Dev** | Auto on merge to `main` | Development testing |
| **Staging** | Manual dispatch | Pre-production validation |
| **Production** | Manual dispatch | Live application |

## Infrastructure as Code

Azure resources are defined in `infra/main.bicep` with environment-specific parameters:

- `infra/parameters/dev.bicepparam`
- `infra/parameters/staging.bicepparam`
- `infra/parameters/prod.bicepparam`

### Resources Provisioned

- **Azure Static Web Apps**: Frontend hosting with built-in CDN
- **Azure App Service**: Backend API with auto-scaling (production)
- **Azure Database for PostgreSQL**: Flexible Server for data storage
- **Application Insights**: Monitoring and telemetry
- **Resource Group**: `rg-draughts-{environment}`

## CI/CD Pipeline

### Continuous Integration (`ci.yml`)

Triggered on push/PR to `main` and `develop`:

1. **Backend Job** (parallel):
   - Restore NuGet packages
   - Build in Release mode
   - Run tests with code coverage
   - Upload coverage artifacts

2. **Frontend & Shared Job** (parallel):
   - Shared engine: install → lint → typecheck → build → test with coverage
   - Frontend: install → lint → typecheck → build → test with coverage
   - Upload coverage artifacts

### Continuous Deployment (`deploy.yml`)

- Builds Docker images for backend and frontend
- Deploys to the target Azure environment
- Environment-specific configuration via parameter files

## Docker

### Backend (`backend/Dockerfile`)

Multi-stage build:
1. Restore and publish .NET app
2. Copy to runtime image (`mcr.microsoft.com/dotnet/aspnet:9.0`)

### Frontend (`frontend/Dockerfile`)

Multi-stage build:
1. Install dependencies and build Next.js
2. Copy to Node.js runtime image

### Local Development

```bash
docker compose up
```

Services:
- Frontend: `localhost:3000`
- Backend: `localhost:5000`
- PostgreSQL: `localhost:5432`

## PWA Configuration

- **Manifest**: `frontend/public/manifest.json` — app name, icons, theme color
- **Service Worker**: `frontend/public/sw.js` — caching strategies for offline support
- **Offline Page**: `frontend/src/app/offline/page.tsx` — fallback when offline
- **Install Prompt**: `frontend/src/components/pwa/InstallPrompt.tsx`
- **Offline Banner**: `frontend/src/components/pwa/OfflineBanner.tsx`

## Configuration

### Backend (`appsettings.json`)

Key configuration sections:

- `ConnectionStrings:DefaultConnection` — PostgreSQL connection string
- `Cors:AllowedOrigins` — Frontend URL(s)
- `ExpertAi` — AI engine settings (time limit, depth, features)
- `Serilog` — Structured logging configuration

### Frontend

- `NEXT_PUBLIC_API_URL` — Backend API base URL (defaults to `http://localhost:5000`)
