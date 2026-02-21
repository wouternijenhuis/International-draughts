# ADR-015: Shared Engine as Dart Package

## Status

Proposed

## Date

2026-02-21

## Context

The Flutter migration requires porting the shared draughts engine (`@international-draughts/engine`) from TypeScript to Dart. The engine is ~2,500 lines of code across 15 source files with zero runtime dependencies, implementing:

- **Types**: Piece, Board, Move (union), Notation, GameState
- **Board**: Adjacency topology for 10×10 draughts
- **Engine**: FMJD-compliant move generator, board utilities, game logic
- **AI**: Alpha-beta search with iterative deepening, evaluation, Zobrist hashing, transposition table, killer moves
- **Clock**: Pure-function chess clock (6 presets, tick/switch/pause/resume)
- **Rating**: Glicko-2 rating system

The engine has 190+ tests and ≥85% coverage. All algorithms must produce identical results in Dart.

### TypeScript Patterns Requiring Dart Mapping

| TypeScript Pattern | Usage | Dart Equivalent | Complexity |
|-------------------|-------|-----------------|------------|
| Discriminated union (`type Move = QuietMove \| CaptureMove`) | `Move`, `GamePhase`, `DrawReason` | Sealed classes + exhaustive switch | Medium — pervasive, touches every file |
| `readonly` arrays (`readonly Square[]`) | `BoardPosition`, capture steps | `List.unmodifiable()` or documentation-enforced immutability | Low — compile-time only in TS |
| `ArrayBuffer`/`DataView` | Transposition table (4 MB) | `Uint8List` + `ByteData` | Medium — byte-level access |
| Template literal types | `SquareNumber` (1–50) | `int` with runtime validation | Low |
| Barrel exports (`index.ts`) | Every module directory | `export` directives in library file | Low |
| Named exports | All public API | `library` + `export` + `show`/`hide` | Low |
| `BigInt` | Position hashing (threefold repetition) | `BigInt` (native Dart) | Low — direct mapping |
| Enum union (`'easy' \| 'medium' \| 'hard'`) | `AIDifficulty`, `AnimationSpeed` | Dart `enum` | Low |

### Package Structure Decision

The PRD (§7.4, Q5) considers two options:
- **Standalone Dart package** (publishable to pub.dev)
- **In-project monorepo package** (local path dependency)

The PRD recommends Option B (in-project). This ADR formalizes and details that decision.

## Decision

### Create a single monorepo Dart package at `shared/draughts-engine-dart/` with a modular internal structure.

### Package Structure

```
shared/draughts-engine-dart/
├── pubspec.yaml
├── analysis_options.yaml
├── CHANGELOG.md
├── README.md
├── lib/
│   ├── draughts_engine.dart          # Public API barrel export
│   └── src/
│       ├── types/
│       │   ├── piece.dart            # PieceType enum, PlayerColor enum, Piece class
│       │   ├── board.dart            # Square, BoardPosition, BoardCoordinate, helpers
│       │   ├── move.dart             # Move sealed class, QuietMove, CaptureMove, CaptureStep
│       │   ├── notation.dart         # formatMoveNotation
│       │   └── game_state.dart       # GameState, position hashing
│       ├── board/
│       │   └── topology.dart         # Adjacency tables, diagonal ray generation
│       ├── engine/
│       │   ├── move_generator.dart   # generateLegalMoves (FMJD-compliant)
│       │   ├── board_utils.dart      # applyMoveToBoard, helpers
│       │   └── game_engine.dart      # oppositeColor, game logic
│       ├── ai/
│       │   ├── search.dart           # findBestMove (iterative deepening alpha-beta)
│       │   ├── evaluation.dart       # evaluate, quickEvaluate
│       │   ├── difficulty.dart       # DifficultyConfig, DIFFICULTY_CONFIGS
│       │   ├── zobrist.dart          # Zobrist hashing (32-bit)
│       │   ├── transposition_table.dart  # TranspositionTable (ByteData-backed)
│       │   └── killer_moves.dart     # KillerMoves heuristic
│       ├── clock/
│       │   └── clock.dart            # ClockState, presets, tick/switch/pause/resume
│       └── rating/
│           └── glicko2.dart          # Glicko-2 implementation, AI_RATINGS
└── test/
    ├── types_test.dart
    ├── topology_test.dart
    ├── move_generator_test.dart
    ├── board_utils_test.dart
    ├── game_engine_test.dart
    ├── ai_test.dart
    ├── clock_test.dart
    └── glicko2_test.dart
```

### Why a Single Package (Not Multi-Package)

| Criterion | Single package (chosen) | Multi-package (engine-core, engine-ai, engine-clock, engine-rating) |
|-----------|------------------------|----------------------------------------------------------------------|
| **Interdependency** | AI imports types + engine + board. Clock imports types. Rating imports types. Tight coupling between most modules. | Cross-package imports require explicit dependencies in each pubspec.yaml. Creating cycles requires careful layering. |
| **Version management** | One version number. One pubspec.yaml. One changelog. | 4 packages with independent versions. Must coordinate releases when types change (which affects all downstream packages). |
| **Consumer simplicity** | Flutter app has one dependency: `draughts_engine`. | Flutter app needs: `draughts_engine_core`, `draughts_engine_ai`, `draughts_engine_clock`, `draughts_engine_rating`. |
| **Test setup** | One `flutter test` command runs all 190+ tests. | Tests need to run across 4 packages. CI complexity increases. |
| **Total LoC** | ~2,500 | Same total, but distributed across 4 packages with 4× the pubspec/analysis_options boilerplate. |
| **Internal modularity** | Achieved via `src/` directory structure + selective exports. Internal modules are still organized by concern. | Enforced by package boundaries. Stronger isolation but unnecessary for a single-consumer package. |

**The engine has exactly one consumer** (the Flutter app). Multi-package architecture is beneficial when packages have independent consumers or release cycles. For a monorepo with a single consumer, single-package with internal directory structure provides the same code organization without the overhead.

### Barrel Export Design

The public API is exported through a single library file:

```dart
// lib/draughts_engine.dart
library draughts_engine;

// Types
export 'src/types/piece.dart';
export 'src/types/board.dart';
export 'src/types/move.dart';
export 'src/types/notation.dart';
export 'src/types/game_state.dart';

// Board
export 'src/board/topology.dart' show getAdjacentSquares, getDiagonalRay;

// Engine
export 'src/engine/move_generator.dart' show generateLegalMoves;
export 'src/engine/board_utils.dart' show applyMoveToBoard;
export 'src/engine/game_engine.dart' show oppositeColor;

// AI
export 'src/ai/search.dart' show findBestMove, SearchResult;
export 'src/ai/evaluation.dart' show evaluate, quickEvaluate;
export 'src/ai/difficulty.dart' show DifficultyConfig, difficultyConfigs, getDifficultyConfig;
export 'src/ai/transposition_table.dart' show TranspositionTable;

// Clock
export 'src/clock/clock.dart';

// Rating
export 'src/rating/glicko2.dart';
```

Using `show` clauses on engine/AI exports keeps the public API surface intentional. Internal helpers (e.g., `_generateManMoves`, `_computeMaterialScore`) remain private via underscore convention and `src/` path protection.

### TypeScript → Dart Type Mapping

#### Move Union Type (Most Impactful)

TypeScript:
```typescript
type Move = QuietMove | CaptureMove;
interface QuietMove { type: 'quiet'; from: number; to: number; }
interface CaptureMove { type: 'capture'; steps: CaptureStep[]; }
```

Dart:
```dart
sealed class Move {
  const Move();

  /// Origin square of the move.
  int get origin;
  /// Destination square of the move.
  int get destination;
}

final class QuietMove extends Move {
  @override
  final int origin;
  @override
  final int destination;

  const QuietMove({required this.origin, required this.destination});
}

final class CaptureMove extends Move {
  final List<CaptureStep> steps;

  const CaptureMove({required this.steps});

  @override
  int get origin => steps.first.from;
  @override
  int get destination => steps.last.to;

  /// All squares of captured pieces.
  List<int> get capturedSquares => steps.map((s) => s.captured).toList();
}

final class CaptureStep {
  final int from;
  final int to;
  final int captured;

  const CaptureStep({required this.from, required this.to, required this.captured});
}
```

Consumer pattern:
```dart
final notation = switch (move) {
  QuietMove(:final origin, :final destination) => '$origin-$destination',
  CaptureMove(:final steps) => steps.map((s) => '${s.from}x${s.to}').join(', '),
};
```

#### Piece Types

TypeScript:
```typescript
enum PieceType { Man = 'man', King = 'king' }
enum PlayerColor { White = 'white', Black = 'black' }
interface Piece { type: PieceType; color: PlayerColor; }
```

Dart:
```dart
enum PieceType { man, king }
enum PlayerColor { white, black }

class Piece {
  final PieceType type;
  final PlayerColor color;

  const Piece({required this.type, required this.color});

  bool get isKing => type == PieceType.king;
  Piece promote() => Piece(type: PieceType.king, color: color);

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Piece && type == other.type && color == other.color;

  @override
  int get hashCode => Object.hash(type, color);
}

// Convenience constructors
const whiteMan = Piece(type: PieceType.man, color: PlayerColor.white);
const blackMan = Piece(type: PieceType.man, color: PlayerColor.black);
const whiteKing = Piece(type: PieceType.king, color: PlayerColor.white);
const blackKing = Piece(type: PieceType.king, color: PlayerColor.black);
```

#### BoardPosition

TypeScript:
```typescript
type BoardPosition = readonly (Piece | null)[];  // Index 0 unused, 1–50
```

Dart:
```dart
/// Board position: 51-element list (index 0 unused, squares 1–50).
/// Use plain List<Piece?> (not UnmodifiableListView) for performance
/// in hot paths (move generation, AI search).
typedef BoardPosition = List<Piece?>;

BoardPosition createInitialPosition() {
  final board = List<Piece?>.filled(51, null);
  // Black pieces on squares 1-20
  for (var i = 1; i <= 20; i++) {
    board[i] = blackMan;
  }
  // White pieces on squares 31-50
  for (var i = 31; i <= 50; i++) {
    board[i] = whiteMan;
  }
  return board;
}
```

**Performance note:** The TypeScript `readonly` modifier is compile-time only (zero runtime cost). Dart's `List.unmodifiable()` wraps the list at runtime, allocating an extra object. Since `BoardPosition` is accessed millions of times during AI search, we use plain `List<Piece?>` and enforce immutability by convention and documentation (as recommended in DevLead review §3.2).

#### Clock Types

Direct mapping — clock types are simple value types:

```dart
enum ClockFormat { sudden, increment, delay }

class ClockConfig {
  final int initialTimeMs;
  final ClockFormat format;
  final int incrementMs;
  final String name;

  const ClockConfig({
    required this.initialTimeMs,
    required this.format,
    this.incrementMs = 0,
    required this.name,
  });
}

class PlayerClockState {
  final int remainingMs;
  final bool isActive;

  const PlayerClockState({required this.remainingMs, this.isActive = false});
}

class ClockState {
  final PlayerClockState white;
  final PlayerClockState black;
  final ClockConfig config;
  final PlayerColor? activePlayer;
  final int lastTickTimestamp;

  const ClockState({...});
}
```

### Testing Strategy

**Port tests first, then code.** Tests serve as the specification for the Dart engine:

1. **Phase 1a**: Port all 8 test files to Dart (using `flutter_test`). Tests will fail (no implementation yet).
2. **Phase 1b**: Port engine modules one by one. After each module, run its tests. Fail fast on regressions.
3. **Phase 1c**: Cross-validation — feed 10,000+ random positions to both TypeScript and Dart engines, compare:
   - `generateLegalMoves()` output (same moves, same order not required)
  - `evaluate()` output (divergence ≤ ε < 0.001)
   - `findBestMove()` output (same move at same depth, or same score if move ordering differs)

**Test naming convention** (following AGENTS.md §4.4):
```dart
group('generateLegalMoves', () {
  test('InitialPosition_White_Returns9Moves', () { ... });
  test('KingPiece_EmptyBoard_GeneratesFlyingMoves', () { ... });
  test('MandatoryCapture_MultipleOptions_ReturnsMaxCapture', () { ... });
});
```

**Coverage target**: ≥85% (statements, branches, functions, lines) — matching the TypeScript engine threshold from AGENTS.md §4.1.

### pubspec.yaml

```yaml
name: draughts_engine
description: International draughts (10×10) game engine — FMJD-compliant rules, AI, clock, and rating.
version: 1.0.0
publish_to: none  # In-project package, not published to pub.dev

environment:
  sdk: '>=3.0.0 <4.0.0'

# Zero runtime dependencies (matching TypeScript engine)

dev_dependencies:
  test: ^1.24.0
  lints: ^3.0.0
```

**Zero runtime dependencies.** The Dart engine mirrors the TypeScript engine's zero-dependency philosophy. No `freezed`, no `json_serializable`, no external packages. The engine is pure Dart computation.

### Flutter App Integration

The Flutter app consumes the engine as a path dependency:

```yaml
# mobile/pubspec.yaml
dependencies:
  draughts_engine:
    path: ../shared/draughts-engine-dart
```

The Flutter app may add a thin adapter layer (similar to the TypeScript frontend's `src/lib/move-generation.ts`) that flattens engine types for UI consumption:

```dart
// lib/engine/engine_adapter.dart
import 'package:draughts_engine/draughts_engine.dart';

class UiMove {
  final int from;
  final int to;
  final List<int> capturedSquares;
  final String notation;

  UiMove.fromEngineMove(Move move)
      : from = move.origin,
        to = move.destination,
        capturedSquares = switch (move) {
          QuietMove() => const [],
          CaptureMove(:final steps) => steps.map((s) => s.captured).toList(),
        },
        notation = formatMoveNotation(move);
}
```

### Open-Source Consideration

The package is structured to be publishable to pub.dev if desired in the future:

- `README.md` with usage examples
- `CHANGELOG.md` for version history
- `analysis_options.yaml` with strict lints
- `publish_to: none` in pubspec (remove to publish)
- Public API documented with `///` doc comments

However, publishing is explicitly deferred. The engine is tightly coupled to FMJD rules and the game's specific AI configuration. It's not a general-purpose draughts library. Publishing would create maintenance obligations (issues, feature requests, semver guarantees) that distract from the core product.

## Consequences

### Positive

- **Clean boundary.** The Dart engine is a separate package with its own pubspec, tests, and analysis options. Changes to the Flutter app don't affect the engine and vice versa.
- **Test isolation.** Engine tests run independently of the Flutter app (`cd shared/draughts-engine-dart && dart test`). No widget test infrastructure needed for pure computation tests.
- **Zero dependencies maintained.** The engine remains dependency-free, just like the TypeScript version. No transitive dependency conflicts with the Flutter app.
- **Familiar structure.** The directory layout mirrors the TypeScript engine exactly, making it easy for developers to cross-reference during porting and for future maintenance.
- **Type safety improved.** Dart's sealed classes provide compile-time exhaustive checking that TypeScript's discriminated unions only provide with strict TypeScript analyzer settings. Pattern matching with destructuring is more ergonomic in Dart 3.0+.
- **Performance potential.** Dart AOT compilation produces native ARM code, which is expected to be faster than V8 JIT for sustained computation (AI search). The engine should perform at least as well as the TypeScript version.

### Negative

- **2,500 LoC to port.** This is the single largest porting effort in the migration. Estimated 2–3 weeks for a careful, test-driven port.
  - **Mitigation:** Port tests first, then code module by module. The move generator (500 LoC, High complexity) and AI search (400 LoC, High complexity) are the risk areas — allocate 60% of porting time to these two modules.
- **Dual engine maintenance.** The TypeScript engine continues to serve the Next.js web app (ADR-013). Bug fixes and rule changes must be made in both versions.
  - **Mitigation:** 190+ tests in each language serve as the cross-validation harness. A bug found in one version can be reproduced and fixed in the other using the same test case. Both engines are pure computation with no framework dependencies — porting a fix is straightforward.
- **Floating-point divergence risk.** Dart and JavaScript have different floating-point behavior in edge cases (e.g., rounding modes, denormalized numbers). The Glicko-2 rating calculation and AI evaluation use floating-point arithmetic. Minor divergences could cause different AI moves at the same search depth.
  - **Mitigation:** Cross-validate evaluation scores across 10,000+ positions. Accept divergences below ε = 0.001 (insignificant for move selection). If critical divergences are found, align the implementations.
- **No code generation.** Without `freezed` or `json_serializable`, `==`, `hashCode`, `copyWith`, and JSON serialization must be hand-written. This adds ~5 lines per value class.
  - **Mitigation:** The engine has ~10 value classes. 50 lines of boilerplate is acceptable to maintain zero dependencies. The Flutter app (which *does* use packages) handles its own serialization at the adapter boundary.

## Alternatives Considered

### Alternative 1: Multi-Package Architecture

Split the engine into 4 packages:
- `draughts_types` — Types, board topology
- `draughts_engine` — Move generator, game logic
- `draughts_ai` — Search, evaluation, TT, Zobrist
- `draughts_clock` — Clock logic
- `draughts_rating` — Glicko-2

**Rejected because:**
- The engine has one consumer. Multi-package overhead (5 pubspec.yaml files, 5 analysis_options.yaml, 5 changelogs, cross-package version coordination) provides no benefit for a single-consumer internal package.
- The AI module imports types, board topology, move generator, and evaluation. The dependency chain is deep: `draughts_ai` → `draughts_engine` → `draughts_types`. Multi-package only makes sense when packages have independent consumers or release cycles.
- Adds CI complexity: `dart test` must run in 4–5 directories. Coverage aggregation across packages requires additional tooling.

### Alternative 2: Single Package Published to pub.dev

Same single-package structure but published as a public package.

**Rejected for now because:**
- Publishing creates maintenance obligations: responding to issues, accepting PRs, maintaining semver guarantees, supporting use cases beyond International Draughts.
- The engine encodes specific FMJD rule interpretations and AI configurations. Other draughts implementations may interpret rules differently.
- `publish_to: none` in pubspec.yaml. Can be changed later if there's demonstrated demand.

### Alternative 3: Use `freezed` and `json_serializable`

Add code generation packages for value classes and JSON serialization.

**Rejected because:**
- Adds `build_runner`, `freezed_annotation`, `freezed`, `json_annotation`, and `json_serializable` as dependencies. This violates the zero-dependency principle carried over from the TypeScript engine.
- Code generation requires `build_runner` in CI, adding build time and complexity.
- The engine has ~10 value classes. Hand-writing `==`, `hashCode`, and `copyWith` for 10 classes is ~50 lines — far less than the setup overhead for code generation.
- `freezed` generates large `.freezed.dart` files that can obscure the actual logic. For a port from TypeScript where readability and cross-reference ease are priorities, generated code is a hindrance.

### Alternative 4: JS Interop (Run TypeScript Engine via JavaScript Runtime)

Use `flutter_js` or `dart:js_interop` to run the existing TypeScript engine in a JavaScript runtime embedded in the Flutter app.

**Rejected because:**
- Adds a JavaScript runtime dependency (~2 MB), increasing app size.
- JS interop across isolate boundaries is complex. The AI must run off the main isolate (ADR-011), but JS runtimes are main-thread-bound on mobile.
- Performance overhead: Dart → JS serialization → V8 execution → JS → Dart deserialization for every engine call. The AI makes millions of calls to `evaluate()` and `generateLegalMoves()` during search.
- Defeats the purpose of using Dart/Flutter — if the JS engine is good enough, why not keep the web app?
- The PRD correctly recommends a full Dart port.

## Related

- [Flutter Migration Analysis — §7 Shared Engine Integration](../migration/flutter-migration-analysis.md) — Complete TypeScript engine module inventory, public API surface, and consumption pattern
- [Flutter Migration PRD — §7 Shared Engine Strategy](../migration/flutter-migration-prd.md) — Port recommendation and module difficulty assessment
- [Flutter Migration PRD — §10 Q5](../migration/flutter-migration-prd.md) — Open question on standalone vs. in-project package
- [Flutter Migration PRD Review — §3 Shared Engine Port Risks](../migration/flutter-migration-prd-review.md) — Union types, readonly arrays, ArrayBuffer, BigInt, and performance analysis
- [ADR-011: Flutter Isolate Strategy](adr-011-flutter-isolate-strategy.md) — How the AI module runs on background isolates (TranspositionTable transfer)
- [AGENTS.md — §2.3 Shared Engine](../../AGENTS.md) — Zero runtime dependencies, browser + Node.js compatibility
- [AGENTS.md — §4 Testing Standards](../../AGENTS.md) — ≥85% coverage for shared engine
- Source: [shared/draughts-engine/](../../shared/draughts-engine/) — TypeScript engine to be ported
