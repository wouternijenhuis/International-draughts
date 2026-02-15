# Backend Architecture

## Layered Structure

```
InternationalDraughts.Api/           → Endpoints, Middleware, Program.cs
InternationalDraughts.Application/   → Services, Interfaces, DTOs, Expert AI
InternationalDraughts.Domain/        → Entities, Value Objects, Enums
InternationalDraughts.Infrastructure/ → EF Core, Repositories, DB Config
```

### Dependency Direction

Inner layers never reference outer layers:

- **Domain**: Zero NuGet dependencies. Pure C# types and interfaces.
- **Application**: References Domain only. Contains business logic and service interfaces.
- **Infrastructure**: References Application + Domain. Implements data access.
- **API**: References Application + Infrastructure. Wires everything together.

## Middleware Pipeline

1. **HTTPS Redirection** + HSTS
2. **Correlation ID Middleware** — generates/propagates request correlation IDs
3. **Global Exception Handler** — catches unhandled exceptions, returns structured JSON errors
4. **CORS** — restricted to configured frontend origin
5. **Routing** + Endpoint mapping

## Endpoint Groups

All endpoints use the Minimal API pattern with extension methods:

| Group | Prefix | Responsibility |
|-------|--------|---------------|
| `AuthEndpoints` | `/api/auth` | Register, login, delete account |
| `SettingsEndpoints` | `/api/settings` | User settings CRUD |
| `PlayerEndpoints` | `/api/player` | Profiles, stats, rating history, game history |
| `AiEndpoints` | `/api/v1/ai` | Expert AI move computation |
| `GameEndpoints` | `/api/v1/games` | In-progress game save/load/delete |

## Expert AI Engine

Located in `Application/ExpertAi/`:

- **SearchEngine**: Iterative deepening with alpha-beta, PVS, LMR, aspiration windows
- **Evaluator**: Material, center control, mobility, king centralization, structure
- **TranspositionTable**: Hash-based position caching for search efficiency
- **EvaluationWeights**: Configurable weight parameters

## Database

PostgreSQL via EF Core with 8 entity configurations:

- `Users`, `AuthProviders`, `RefreshTokens`
- `UserSettings`
- `PlayerStats`, `RatingHistory`
- `GameRecords`, `InProgressGames`

## Testing

- **Domain.Tests**: 115 tests (board, topology, moves, pieces)
- **Application.Tests**: 63 tests (AI, services, configuration)
- **Api.Tests**: 12 integration tests (health, CORS, middleware)
