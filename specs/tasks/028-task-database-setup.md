# Task 028: Database Setup & Migrations

**Feature:** Backend API & Deployment  
**Dependencies:** 001-task-backend-scaffolding  
**FRD Reference:** [backend-api-deployment.md](../features/backend-api-deployment.md)

---

## Description

Set up the database for the application: schema design, migration tooling, seed data, and data access layer. The database stores user accounts, player profiles, game records, ratings, rating history, settings, and in-progress game state. The schema must support the data models defined across all backend tasks.

---

## Technical Requirements

### Schema Design
- **Users table:** ID (PK), email (unique, nullable for OAuth-only), password hash (nullable), display name, avatar ID, created date, updated date
- **Auth providers table:** ID (PK), user ID (FK), provider name (google/microsoft/apple/email), provider user ID, linked date
- **Refresh tokens table:** token hash (PK), user ID (FK), expiry date, revoked flag
- **Settings table:** user ID (PK/FK), all settings fields (see task 014), updated date
- **Game records table:** ID (PK), user ID (FK), move history (JSON/text), result (enum), opponent type (enum), difficulty (nullable enum), date, time control (nullable JSON), move count, created date
- **Player ratings table:** user ID (PK/FK), rating (float), RD (float), volatility (float), last rated game date
- **Rating history table:** ID (PK), user ID (FK), date, rating (float), RD (float), game result (enum), opponent (string)
- **In-progress games table:** user ID (PK/FK), game state (JSON), saved date

### Migration Tooling
- Database migration framework configured and integrated into the project
- Initial migration creates all tables with proper constraints, indexes, and foreign keys
- Migrations are version-controlled and applied in order
- Migration commands available in the development workflow (up, down, status)

### Indexes
- Users: email (unique), created date
- Game records: user ID + date (for paginated history), user ID + difficulty + result (for filtered queries)
- Rating history: user ID + date (for chronological retrieval)
- Auth providers: user ID + provider name (unique composite)

### Data Access Layer
- Repository pattern: one repository per aggregate (Users, Games, Ratings, Settings)
- Repositories expose typed interfaces (not raw SQL)
- Support for transactions (e.g., saving a game + updating rating atomically)

### Seed Data
- Development seed: a test user with sample game records, rating history, and settings for testing

---

## Acceptance Criteria

1. Running migrations creates all tables with correct schemas
2. Rolling back migrations drops tables cleanly
3. Foreign key constraints prevent orphaned records
4. Indexes exist on all frequently queried columns
5. Repository interfaces correctly abstract database operations
6. Transactions: saving a game + updating rating either both succeed or both roll back
7. Development seed populates test data
8. Migration commands work in local development and CI environments

---

## Testing Requirements

- **Unit tests:**
  - Repository methods return expected data for given inputs (with in-memory or test database)
  - Transaction rollback on failure
- **Integration tests:**
  - Full migration up/down cycle
  - CRUD operations for each table via repositories
  - Cascade deletion: deleting a user removes all associated records
  - Unique constraint enforcement (duplicate email, duplicate provider link)
- **Performance tests:**
  - Query for paginated game history with 1000+ records returns within acceptable time
- **Minimum coverage:** ≥ 85%
