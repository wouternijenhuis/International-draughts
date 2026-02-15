# Task 003: Shared Game Library Scaffolding

**Feature:** Scaffolding  
**Dependencies:** None — this is a foundation task  
**FRD Reference:** [game-rules-engine.md](../features/game-rules-engine.md)

---

## Description

Set up a shared, platform-agnostic game logic library that can be consumed by both the frontend (browser) and the backend (server). This library will contain the game rules engine, board representation, and core game types. It must have zero UI dependencies and zero server-framework dependencies.

The library must be written in a language/format that supports both execution environments — either as a shared TypeScript/JavaScript package, or as a language that compiles to both (e.g., Rust → WebAssembly + native). The choice of approach is an architectural decision, but the scaffolding must establish the project structure, build pipeline, and cross-environment test harness.

---

## Technical Requirements

### Project Structure
- Standalone library project (separate from both frontend and backend projects)
- Clear public API surface with exported types and functions
- Internal modules hidden from consumers
- Package configuration for consumption by both frontend and backend projects

### Type Definitions
- Board representation types (10×10 grid, 50 playable squares, FMJD numbering 1–50)
- Piece types (regular piece, King) and color types (White, Black)
- Game state type (board position, current player, move history, game phase, draw-rule counters)
- Move types (regular move, capture sequence, multi-jump)
- Game result types (InProgress, WhiteWins, BlackWins, Draw with reason)
- FMJD notation types

### Build Pipeline
- Build produces artifacts consumable by both frontend and backend
- Source maps for debugging in both environments
- Minified production build for browser consumption
- Development watch mode for rapid iteration

### Cross-Environment Compatibility
- No dependencies on browser APIs (DOM, window, navigator)
- No dependencies on server APIs (filesystem, network)
- Pure functions where possible for testability and determinism

---

## Acceptance Criteria

1. The library project builds successfully and produces artifacts for both frontend and backend consumption
2. The frontend project can import and use types from the shared library
3. The backend project can import and use types from the shared library
4. The library has zero runtime dependencies on browser or server APIs
5. Type definitions compile without errors and provide full IntelliSense in consuming projects
6. A development watch mode rebuilds the library on source changes

---

## Testing Requirements

- **Unit tests:** Type construction tests (valid states compile, invalid states don't)
- **Cross-environment tests:** Library loads and functions identically in a browser test runner and a server test runner
- **Minimum coverage:** ≥ 85% on all library code
