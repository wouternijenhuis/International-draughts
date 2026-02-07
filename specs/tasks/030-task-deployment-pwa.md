# Task 030: Deployment & PWA Configuration

**Feature:** Backend API & Deployment  
**Dependencies:** 004-task-infrastructure-scaffolding, 028-task-database-setup, 029-task-e2e-testing  
**FRD Reference:** [backend-api-deployment.md](../features/backend-api-deployment.md)

---

## Description

Configure the full deployment pipeline for both frontend (PWA) and backend (API), targeting Azure. This includes production Azure resource provisioning, Docker containerization for the backend, Static Web Apps hosting for the frontend, production environment configuration, service worker for offline PWA capabilities, monitoring/alerting, and deployment automation for staging and production environments.

---

## Technical Requirements

### Azure Resources (Production)
- **Frontend hosting:** Azure Static Web Apps — deploy the built frontend as a static site with global CDN
- **Backend hosting:** Azure App Service or Azure Container Apps — deploy the backend API as a Docker container
- **Database:** Azure Database for PostgreSQL (Flexible Server) or Azure Cosmos DB — production-grade managed database
- **Key Vault:** Store secrets (OAuth client secrets, JWT signing keys, database connection strings)
- **Application Insights:** Connected to the backend for telemetry, logging, and performance monitoring
- **Custom domain:** Configure custom domain with SSL certificates

### Docker Configuration
- Backend Dockerfile: multi-stage build (build → runtime)
- Image size optimized (alpine base or equivalent)
- Health check endpoint in the container
- Environment variables for configuration (no secrets baked into images)

### PWA Finalization
- **Service worker:** cache-first strategy for static assets, network-first for API calls
- **Web app manifest:** name, short_name, description, icons (192×192, 512×512), theme color, background color, display = "standalone", start_url, scope
- **Offline support:** cached game board and AI engine (Easy–Hard) work offline; features requiring the backend (Expert AI, auth, sync) show a graceful offline message
- **Install prompt:** show a custom install banner for supported browsers
- **Lighthouse PWA audit:** passes all PWA checks

### Environment Configuration
- **Staging environment:** mirrors production with separate database
- **Production environment:** hardened settings (HTTPS-only, HSTS, CSP headers, rate limiting)
- **Environment variables:** managed via Azure App Configuration or Key Vault references
- **CORS:** configured to allow only the frontend origin

### CI/CD Pipeline
- Build triggers: push to main (production), push to develop (staging)
- Pipeline steps: lint → build → unit tests → integration tests → E2E tests → deploy
- Deployment gates: E2E tests must pass before promotion to production
- Rollback: automated rollback if health check fails post-deployment
- Database migrations: run as a deployment step before the new app version starts

### Monitoring & Alerting
- Application Insights dashboards: response times, error rates, active users
- Alerts: 5xx error rate > 1%, response time p95 > 5s, health check failure
- Log retention: 30 days in Application Insights
- Uptime monitoring: configured health check ping

### Security Hardening
- HTTPS enforced (redirect HTTP → HTTPS)
- HSTS header with max-age ≥ 1 year
- Content Security Policy (CSP) header
- Rate limiting: 100 requests/minute per IP for auth endpoints, 1000 requests/minute for other endpoints
- OWASP top-10 headers configured

---

## Acceptance Criteria

1. Frontend deploys to Azure Static Web Apps and is accessible via custom domain
2. Backend deploys to Azure App Service/Container Apps and is accessible via custom domain
3. Database is provisioned with the correct schema (migrations applied automatically)
4. Secrets are stored in Key Vault and injected at runtime
5. The PWA passes Lighthouse audit (Performance > 90, PWA checks pass)
6. Service worker caches static assets; app loads offline with cached content
7. Install prompt displays on supported browsers
8. CI/CD pipeline runs all steps and gates deployment on E2E test results
9. Health check endpoint returns 200 and is monitored
10. Alerts fire on error rate spikes and health check failures
11. HTTPS is enforced with HSTS
12. Rate limiting is active on auth endpoints
13. Staging environment is independently deployable and testable
14. Rollback triggers automatically on health check failure post-deployment

---

## Testing Requirements

- **Deployment verification tests:**
  - Health check endpoint returns 200 after deployment
  - Frontend loads and renders in a browser
  - Backend API responds to authenticated requests
  - Database connectivity verified
- **PWA tests:**
  - Service worker registers and activates
  - Offline mode: cached assets load, API-dependent features show offline message
  - Manifest is valid and install prompt triggers
  - Lighthouse PWA audit passes
- **Security tests:**
  - HTTPS redirect works
  - HSTS header present
  - CSP header present
  - Rate limiting triggers on excessive requests
  - Auth endpoints reject invalid tokens
- **Rollback tests:**
  - Simulate failed health check → verify rollback to previous version
- **Minimum coverage:** N/A (infrastructure task — measured by scenario coverage)
