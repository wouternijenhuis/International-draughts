# Task 002: Frontend Scaffolding

**Feature:** Scaffolding  
**Dependencies:** None — this is a foundation task  
**FRD Reference:** [ui-board-experience.md](../features/ui-board-experience.md), [backend-api-deployment.md](../features/backend-api-deployment.md)

---

## Description

Set up the frontend web application project structure using a modern React-based framework (Next.js or similar) with TypeScript. Configure routing, state management, component architecture, styling system, PWA support, linting, formatting, and the API client generation pipeline. This is the foundation that all frontend feature tasks build upon.

The frontend must be delivered as a Progressive Web App (PWA) with installability, offline shell loading, and a Lighthouse score > 90 (REQ-54).

---

## Technical Requirements

### Project Structure
- TypeScript-first React application
- Page-based routing with layout components
- Component organization: pages, features (feature-scoped components), shared (reusable UI components), hooks, utils, types
- Barrel exports per feature folder

### State Management
- Client-side state management solution for game state, settings, and UI state
- Clear separation between server state (API data) and client state (game logic, UI)
- Server state managed via a data-fetching library with caching, re-fetching, and optimistic updates

### API Client
- Auto-generated TypeScript API client from the backend's OpenAPI specification
- Type-safe request/response interfaces matching the backend contract
- Centralized API error handling with user-friendly error display

### Styling
- Component-scoped styling system (CSS Modules, Tailwind CSS, or CSS-in-JS)
- Design token system for colors, typography, spacing, shadows — aligned with the premium visual design language (REQ-44)
- Responsive breakpoints: mobile (< 768px), tablet (768px–1024px), desktop (> 1024px)
- Dark/light theme support infrastructure (for board theme customization)

### PWA Configuration
- Web app manifest with app name, icons (multiple sizes), theme color, background color, display mode (standalone)
- Service worker for offline shell caching (HTML, CSS, JS, static assets)
- Offline fallback page with clear messaging

### Developer Tooling
- Linting (ESLint) with strict TypeScript rules
- Formatting (Prettier) with consistent config
- Pre-commit hooks for lint + format checks
- Component development environment (Storybook or similar — optional but recommended)

### Accessibility Foundation
- Semantic HTML baseline (landmarks, headings, lists)
- Skip-to-content link
- Focus management utilities
- ARIA utility components (live regions for announcements)

---

## Acceptance Criteria

1. The frontend application starts in development mode and renders a placeholder home page
2. TypeScript strict mode is enabled with no type errors
3. The API client can be regenerated from the backend's OpenAPI spec with a single command
4. The PWA manifest is correctly configured and the app is installable in Chrome/Edge
5. The service worker caches the app shell and serves a fallback page when offline
6. ESLint and Prettier run without errors on the codebase
7. Responsive layout renders correctly at mobile (375px), tablet (768px), and desktop (1440px) widths
8. A Lighthouse audit on the scaffolded app scores > 90 for Performance, Accessibility, and Best Practices
9. Accessibility: skip-to-content link is present, semantic landmarks are used, focus management utility works

---

## Testing Requirements

- **Unit tests:** Utility functions, hooks, API client error handling
- **Component tests:** Placeholder page renders, responsive layout switches at breakpoints
- **Integration tests:** Service worker caches assets; offline fallback displays
- **Accessibility tests:** Automated a11y audit (axe-core or similar) passes with 0 violations
- **Minimum coverage:** ≥ 85% on all scaffolding code
