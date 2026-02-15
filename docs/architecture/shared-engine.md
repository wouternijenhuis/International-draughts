# Shared Engine

## Overview

The `@international-draughts/engine` package is a **pure TypeScript library** with zero runtime dependencies. It provides the complete game logic for International Draughts, usable in both browser and Node.js environments.

**Package**: `shared/draughts-engine/`  
**Target**: ES2024  
**Module**: ES2022  

## Modules

### Types (`types/`)

Core type definitions:

- **`board.ts`**: `Board` interface, `createInitialBoard()`, square indexing
- **`piece.ts`**: `Piece` type, `PieceColor`, `PieceType` enums
- **`move.ts`**: `Move` interface with source, destination, captures
- **`game-state.ts`**: `GameState`, `GamePhase`, `GameOutcome`, draw reason types
- **`notation.ts`**: Standard FMJD notation formatting

### Board (`board/`)

- **`topology.ts`**: 10×10 board topology — square-to-coordinate mapping, adjacency, rays (diagonal lines), promotion squares, center squares

### Engine (`engine/`)

- **`move-generator.ts`**: Legal move generation with mandatory/maximum capture enforcement, flying king moves, multi-jump sequences
- **`game-engine.ts`**: Full game state management — turn processing, draw detection (threefold repetition, 25-move king-only rule, 16-move endgame rule), position hashing
- **`board-utils.ts`**: Board manipulation utilities

### AI (`ai/`)

- **`search.ts`**: Iterative deepening alpha-beta search with move ordering
- **`evaluation.ts`**: Position evaluation — material, center control, advancement, back row defense, king centralization
- **`difficulty.ts`**: Difficulty presets (Easy/Medium/Hard) with configurable depth, noise, and blunder parameters

### Clock (`clock/`)

- **`clock.ts`**: Game clock with Fischer increment and simple countdown formats, 6 presets (1min, 3min, 5min, 10min, 15min, 30min), tick/switch/pause/resume

### Rating (`rating/`)

- **`glicko2.ts`**: Complete Glicko-2 implementation — rating updates, RD decay, volatility iteration, confidence range formatting, AI opponent ratings

## Testing

190 tests across 8 test files:

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `types.test.ts` | 37 | Type factories, enums, notation |
| `clock.test.ts` | 27 | Clock formats, presets, edge cases |
| `move-generator.test.ts` | 25 | Man/king moves, captures, edge cases |
| `glicko2.test.ts` | 25 | Rating calculations, convergence |
| `game-engine.test.ts` | 23 | Game flow, outcomes, draw rules |
| `topology.test.ts` | 20 | Board geometry, coordinates |
| `ai.test.ts` | 19 | Search, difficulty, move selection |
| `board-utils.test.ts` | 14 | Board manipulation |

Coverage threshold: ≥85% across all metrics.
