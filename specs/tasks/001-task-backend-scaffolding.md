# Task 001: Backend API Scaffolding

**Feature:** Scaffolding  
**Dependencies:** None — this is a foundation task  
**FRD Reference:** [backend-api-deployment.md](../features/backend-api-deployment.md)

---

## Description

Set up the backend API project structure, including the web API framework, middleware pipeline, dependency injection configuration, OpenAPI/Swagger documentation, health check endpoint, structured logging, and global error handling. This is the foundation that all backend feature tasks build upon.

The backend must expose a RESTful API over HTTPS, produce OpenAPI specifications for SDK client generation, and follow a clean layered architecture (Controllers → Services → Repositories).

---

## Technical Requirements

### Project Structure
- Web API project with a controller-based routing pattern
- Layered architecture: API layer (controllers/DTOs), Application layer (services/interfaces), Domain layer (entities/value objects), Infrastructure layer (data access/external integrations)
- Separate projects/modules per layer to enforce dependency direction (inner layers do not reference outer layers)

### Middleware & Cross-Cutting
- Global exception handler middleware that catches unhandled exceptions and returns structured error responses (REQ-67)
- Request/response logging middleware with correlation IDs
- CORS configuration restricted to the frontend origin
- HTTPS redirection and HSTS headers
- Request validation pipeline

### API Documentation
- OpenAPI/Swagger specification auto-generated from controllers
- Swagger UI available in development environments
- Versioned API (v1 prefix) to support future evolution

### Health Check
- A `/health` endpoint that returns HTTP 200 when the service is running
- Readiness and liveness probes for container orchestration

### Configuration
- Environment-based configuration (Development, Staging, Production)
- Secrets management pattern (no hardcoded secrets)
- Structured settings classes for application configuration

### Structured Logging
- Structured logging framework configured with correlation ID propagation
- Log levels: Debug, Information, Warning, Error, Critical
- Console sink for development; pluggable sinks for production (Azure Application Insights)

---

## Acceptance Criteria

1. The API project starts successfully and serves a Swagger UI page in development mode
2. The `/health` endpoint returns HTTP 200 with a JSON body `{ "status": "healthy" }`
3. An unhandled exception in any controller returns a structured error response (HTTP 500) with a user-friendly message and no stack trace
4. CORS is configured to reject requests from origins other than the configured frontend URL
5. All HTTP requests are redirected to HTTPS
6. The OpenAPI specification is accessible at a documented URL and can be used to generate client SDKs
7. Application configuration can be overridden via environment variables without code changes
8. Correlation IDs are present in all log entries for a given request

---

## Testing Requirements

- **Unit tests:** Middleware pipeline tests (error handler returns correct structure, CORS rejects wrong origin)
- **Integration tests:** Health endpoint returns 200; Swagger endpoint returns valid OpenAPI JSON; HTTPS redirect works
- **Minimum coverage:** ≥ 85% on all scaffolding code
