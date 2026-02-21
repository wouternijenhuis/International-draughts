# Flutter Development Standards & Guidelines

> Coding standards, architecture patterns, and quality gates for the
> International Draughts Flutter mobile application (iOS + Android).
> All contributors and AI agents must follow these guidelines when working on the
> Flutter codebase.

**Version:** 1.0
**Created:** 2026-02-21
**Status:** Active
**Inputs:** AGENTS.md, ADR-009 (Riverpod), ADR-010 (CI/CD), ADR-011 (Isolates), ADR-012 (Auth), ADR-013 (Flutter Web excluded), ADR-014 (Versioning), ADR-015 (Dart Engine Package)

---

## Contents

1. [Dart/Flutter Coding Standards](#1-dartflutter-coding-standards)
2. [Architecture Standards](#2-architecture-standards)
3. [State Management (Riverpod)](#3-state-management-riverpod)
4. [Testing Standards](#4-testing-standards)
5. [Performance Standards](#5-performance-standards)
6. [Security Standards](#6-security-standards)
7. [Dependency Management](#7-dependency-management)
8. [Error Handling](#8-error-handling)
9. [CI/CD Standards](#9-cicd-standards)
10. [Documentation Standards](#10-documentation-standards)

---

## 1. Dart/Flutter Coding Standards

### 1.1 Effective Dart Compliance

All Dart code must comply with [Effective Dart](https://dart.dev/effective-dart). Enforce this in `analysis_options.yaml`:

```yaml
include: package:flutter_lints/flutter.yaml

analyzer:
  language:
    strict-casts: true
    strict-inference: true
    strict-raw-types: true
  errors:
    missing_return: error
    dead_code: warning
    unused_local_variable: warning
    unused_import: error

linter:
  rules:
    # Style
    - always_declare_return_types
    - always_put_required_named_parameters_first
    - annotate_overrides
    - avoid_empty_else
    - avoid_init_to_null
    - avoid_redundant_argument_values
    - avoid_return_types_on_setters
    - avoid_types_on_closure_parameters
    - avoid_unnecessary_containers
    - avoid_unused_constructor_parameters
    - avoid_void_async
    - camel_case_extensions
    - camel_case_types
    - cancel_subscriptions
    - close_sinks
    - constant_identifier_names
    - curly_braces_in_flow_control_structures
    - directives_ordering
    - empty_catches
    - file_names
    - library_names
    - no_duplicate_case_values
    - no_leading_underscores_for_local_identifiers
    - non_constant_identifier_names
    - null_closures
    - prefer_const_constructors
    - prefer_const_constructors_in_immutables
    - prefer_const_declarations
    - prefer_const_literals_to_create_immutables
    - prefer_final_fields
    - prefer_final_locals
    - prefer_if_null_operators
    - prefer_is_empty
    - prefer_is_not_empty
    - prefer_single_quotes
    - prefer_spread_collections
    - require_trailing_commas
    - sized_box_for_whitespace
    - sort_child_properties_last
    - sort_constructors_first
    - type_annotate_public_apis
    - unawaited_futures
    - unnecessary_brace_in_string_interps
    - unnecessary_const
    - unnecessary_lambdas
    - unnecessary_new
    - unnecessary_null_aware_assignments
    - unnecessary_null_checks
    - unnecessary_overrides
    - unnecessary_parenthesis
    - unnecessary_string_escapes
    - unnecessary_this
    - use_key_in_widget_constructors
    - use_string_buffers
```

### 1.2 Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| **Classes, enums, typedefs, sealed classes** | `PascalCase` | `GamePhase`, `BoardPosition`, `PlayerColor` |
| **Libraries, packages, file names, directories** | `snake_case` | `game_provider.dart`, `move_generator.dart` |
| **Variables, parameters, functions, methods** | `camelCase` | `findBestMove()`, `currentTurn`, `isThinking` |
| **Constants (top-level & static)** | `camelCase` | `defaultBoardTheme`, `maxSearchDepth` |
| **Private members** | `_camelCase` | `_aiGeneration`, `_ttBuffer` |
| **Named parameters** | `camelCase` (always use `required` or provide default) | `required this.position` |
| **Boolean variables/getters** | Affirmative phrasing | `isThinking`, `hasLegalMoves`, `canUndo` (NOT `notStarted`) |
| **Riverpod providers** | `camelCase` + `Provider` suffix | `gameProvider`, `clockProvider`, `authProvider` |

### 1.3 File Organization

**One public class per file.** Private helper classes may colocate with their public class. File name must match the primary class name in `snake_case`:

```
game_phase.dart       → sealed class GamePhase
game_provider.dart    → class GameNotifier + gameProvider
board_widget.dart     → class BoardWidget
```

**Import ordering** — enforce with `directives_ordering` lint rule:

```dart
// 1. Dart SDK imports
import 'dart:async';
import 'dart:typed_data';

// 2. Flutter SDK imports
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

// 3. Third-party package imports (alphabetical)
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

// 4. Project package imports
import 'package:draughts_engine/draughts_engine.dart';
import 'package:international_draughts/features/game/domain/game_phase.dart';

// 5. Relative imports (only within the same feature module)
import '../domain/game_state.dart';
import 'game_board.dart';
```

**Rules:**
- Use `package:` imports for cross-feature references.
- Use relative imports only within the same feature module (same `features/{name}/` subtree).
- Never use relative imports to reach outside your feature module.

### 1.4 Const Constructors & Final Fields

```dart
// ✅ CORRECT: const constructor, final fields
class BoardTheme {
  final Color lightSquare;
  final Color darkSquare;
  final Color highlightColor;

  const BoardTheme({
    required this.lightSquare,
    required this.darkSquare,
    required this.highlightColor,
  });
}

// ✅ CORRECT: const widget constructor with Key
class SquareWidget extends StatelessWidget {
  final int squareNumber;
  final Piece? piece;

  const SquareWidget({
    super.key,
    required this.squareNumber,
    this.piece,
  });

  @override
  Widget build(BuildContext context) { ... }
}

// ❌ WRONG: missing const, missing final
class BadExample {
  Color lightSquare;       // Should be final
  BadExample(this.lightSquare);  // Should be const if all fields are final
}
```

**Rules:**
- All widget constructors must be `const` unless they accept mutable parameters.
- All class fields must be `final` unless mutation is explicitly required and documented.
- Use `const` for compile-time constant values (colors, strings, widget instances).
- Prefer `const` widget constructors in widget trees to enable Flutter's const optimization.

### 1.5 Sealed Classes for State

Use sealed classes for state types with distinct variants. This enables exhaustive `switch` handling and makes illegal states unrepresentable:

```dart
// ✅ CORRECT: sealed class with exhaustive matching
sealed class GamePhase {
  const GamePhase();
}

final class NotStarted extends GamePhase {
  const NotStarted();
}

final class InProgress extends GamePhase {
  final BoardPosition position;
  final PlayerColor currentTurn;
  const InProgress({required this.position, required this.currentTurn});
}

final class GameOver extends GamePhase {
  final GameResult result;
  final String reason;
  const GameOver({required this.result, required this.reason});
}

// ✅ Usage — compiler enforces exhaustive handling
Widget buildPhase(GamePhase phase) {
  return switch (phase) {
    NotStarted()   => const GameSetupPrompt(),
    InProgress()   => GameBoard(position: phase.position),
    GameOver()     => GameOverScreen(result: phase.result),
  };
}
```

**Rules:**
- Use `sealed class` for all types with distinct variants (game phase, move type, result type, error type).
- Mark all subclasses as `final class` to prevent further extension outside the library.
- Always use exhaustive `switch` expressions — never add a default case on sealed types.

### 1.6 Null Safety

The project uses Dart's sound null safety. The `!` (null assertion) operator is prohibited except in documented, justified cases.

```dart
// ✅ CORRECT: pattern matching / null check
final userId = claims.userId;
if (userId == null) {
  throw AuthException('Missing userId in claims');
}
await fetchProfile(userId);

// ✅ CORRECT: null-aware operators
final theme = settings?.boardTheme ?? BoardTheme.classicWood;

// ✅ CORRECT: late final for lifecycle-initialized fields (e.g., in State<T>)
late final AnimationController _controller;

@override
void initState() {
  super.initState();
  _controller = AnimationController(vsync: this);
}

// ❌ WRONG: null assertion without justification
final userId = claims.userId!;  // Will crash if null

// ⚠️ ACCEPTABLE: documented justification
// The ! operator is acceptable ONLY when:
// 1. A framework guarantee makes null impossible (e.g., initState already called)
// 2. The assertion is in test code
// 3. A comment explains why null is impossible
final renderBox = context.findRenderObject()! as RenderBox; // Framework guarantees non-null after build
```

**Rules:**
- Prefer `?`, `??`, `?.`, null-check patterns, and early returns over `!`.
- Every use of `!` in production code must have a comment explaining why null is impossible.
- Use `late final` only for fields initialized in `initState()` or `didChangeDependencies()`.
- Never use `late` for fields that might be accessed before initialization.

### 1.7 Dart Language Feature Preferences

| Prefer | Over | Rationale |
|--------|------|-----------|
| `switch` expression | `if-else if` chain | Exhaustive, more concise |
| Pattern matching (`case InProgress(:final position)`) | `is` checks + casts | Combines check and destructuring |
| `final` local variables | `var` | Immutability by default |
| Named parameters | Positional parameters (>2 params) | Readability at call site |
| `records` for ad-hoc return types | custom classes | Less boilerplate for internal plumbing |
| `extension type` for newtypes | raw primitives | Type safety for SquareNumber, etc. |
| `sealed class` hierarchies | enum + data | Variants can carry different data |
| `typedef` for function types | inline function types | Reusability, readability |
| String interpolation `'$var'` | Concatenation `'a' + b` | Readability |
| Collection `if`/`for` | `addAll`/`map` + `toList` | Declarative, idiomatic |

### 1.8 Widget Rules

- **No business logic in widgets.** Widgets may only: read providers, call provider methods, and render UI.
- **Extract widgets at ~80 lines.** If a `build()` method exceeds ~80 lines, extract sub-widgets.
- **Use `ConsumerWidget` or `ConsumerStatefulWidget`** for widgets that read Riverpod providers.
- **Use `StatelessWidget` with `const` constructor** for pure UI components with no provider dependency.
- **Avoid `setState`** in `StatefulWidget` when Riverpod state is available. Use `StatefulWidget` only for animation controllers, focus nodes, and text editing controllers.
- **Always provide a `Key`** via `super.key` in constructors.
- **Use `Widget` as return type**, not `Container`, `Column`, etc.

---

## 2. Architecture Standards

### 2.1 Feature-Module Structure

The Flutter app uses a feature-module architecture. Each feature is a self-contained vertical slice:

```
lib/
├── app/
│   ├── app.dart                    # MaterialApp + ProviderScope
│   ├── router.dart                 # GoRouter configuration
│   └── theme.dart                  # ThemeData definitions
├── core/
│   ├── constants/
│   │   └── api_constants.dart      # Base URLs, timeouts
│   ├── error/
│   │   ├── failures.dart           # Failure sealed class
│   │   └── exceptions.dart         # Exception types
│   ├── network/
│   │   ├── api_client.dart         # Dio HTTP client
│   │   └── auth_interceptor.dart   # JWT refresh interceptor
│   ├── result/
│   │   └── result.dart             # Result<T> type
│   └── utils/
│       └── logger.dart             # Logging wrapper
├── features/
│   ├── auth/
│   │   ├── data/
│   │   │   ├── auth_repository_impl.dart
│   │   │   └── auth_remote_data_source.dart
│   │   ├── domain/
│   │   │   ├── auth_repository.dart     # Abstract interface
│   │   │   ├── auth_state.dart
│   │   │   └── user.dart
│   │   └── presentation/
│   │       ├── providers/
│   │       │   └── auth_provider.dart
│   │       ├── screens/
│   │       │   ├── login_screen.dart
│   │       │   └── register_screen.dart
│   │       └── widgets/
│   │           └── auth_form.dart
│   ├── game/
│   │   ├── data/
│   │   │   ├── game_repository_impl.dart
│   │   │   └── game_remote_data_source.dart
│   │   ├── domain/
│   │   │   ├── game_phase.dart          # Sealed class hierarchy
│   │   │   ├── game_config.dart
│   │   │   ├── game_repository.dart     # Abstract interface
│   │   │   └── move_record.dart
│   │   └── presentation/
│   │       ├── providers/
│   │       │   ├── game_provider.dart
│   │       │   ├── ai_provider.dart
│   │       │   ├── clock_provider.dart
│   │       │   └── game_persistence_provider.dart
│   │       ├── screens/
│   │       │   ├── game_screen.dart
│   │       │   └── game_setup_screen.dart
│   │       └── widgets/
│   │           ├── board_widget.dart
│   │           ├── piece_widget.dart
│   │           ├── square_widget.dart
│   │           ├── move_history_panel.dart
│   │           └── game_controls.dart
│   ├── settings/
│   │   ├── data/
│   │   │   └── settings_repository_impl.dart
│   │   ├── domain/
│   │   │   ├── settings_state.dart
│   │   │   └── settings_repository.dart
│   │   └── presentation/
│   │       ├── providers/
│   │       │   └── settings_provider.dart
│   │       ├── screens/
│   │       │   └── settings_screen.dart
│   │       └── widgets/
│   │           └── theme_selector.dart
│   ├── profile/
│   │   └── ...                     # Same data/domain/presentation structure
│   ├── replay/
│   │   └── ...
│   └── tutorial/
│       └── ...
└── shared/
    ├── widgets/
    │   ├── loading_indicator.dart
    │   ├── error_display.dart
    │   └── responsive_layout.dart
    └── extensions/
        ├── context_extensions.dart
        └── string_extensions.dart
```

### 2.2 Clean Architecture Layers

Each feature module follows clean architecture with three layers:

```
┌──────────────────────────────────────────────────┐
│  Presentation Layer (presentation/)              │
│  - Widgets, Screens, Providers                   │
│  - Depends on: Domain                            │
│  - Contains: UI logic only                       │
├──────────────────────────────────────────────────┤
│  Domain Layer (domain/)                          │
│  - Entities, Repository interfaces, Value objects│
│  - Depends on: Nothing (in-feature)              │
│  - Contains: Business rules, contracts           │
├──────────────────────────────────────────────────┤
│  Data Layer (data/)                              │
│  - Repository implementations, Data sources      │
│  - Depends on: Domain (implements interfaces)    │
│  - Contains: API calls, local storage, mapping   │
└──────────────────────────────────────────────────┘
```

**Dependency rules:**
- **Domain** has zero dependencies on Presentation or Data. It defines abstract repository interfaces.
- **Data** implements Domain interfaces. It depends on Domain but never on Presentation.
- **Presentation** depends on Domain (entities, repository interfaces via providers). It never imports Data directly — repository implementations are injected via Riverpod.
- **Cross-feature communication** goes through providers, never through direct imports of another feature's internal classes.

### 2.3 Repository Pattern

Every external data interaction (API, local storage, platform services) goes through a repository:

```dart
// domain/game_repository.dart — Abstract interface in Domain layer
abstract interface class GameRepository {
  Future<Result<GameState>> loadSavedGame(String userId);
  Future<Result<void>> saveGame(String userId, GameState state);
  Future<Result<void>> deleteSavedGame(String userId);
}

// data/game_repository_impl.dart — Implementation in Data layer
class GameRepositoryImpl implements GameRepository {
  final GameRemoteDataSource _remoteDataSource;
  final GameLocalDataSource _localDataSource;

  const GameRepositoryImpl({
    required GameRemoteDataSource remoteDataSource,
    required GameLocalDataSource localDataSource,
  }) : _remoteDataSource = remoteDataSource,
       _localDataSource = localDataSource;

  @override
  Future<Result<GameState>> loadSavedGame(String userId) async {
    try {
      final dto = await _remoteDataSource.fetchGame(userId);
      return Result.success(dto.toDomain());
    } on NetworkException catch (e) {
      // Fallback to local cache
      final local = await _localDataSource.loadGame(userId);
      if (local != null) return Result.success(local.toDomain());
      return Result.failure(Failure.network(e.message));
    }
  }
}
```

**Rules:**
- One repository per bounded context (game, auth, settings, profile).
- Repository interfaces live in `domain/`. Implementations live in `data/`.
- Repositories return `Result<T>`, never throw exceptions (see §8 Error Handling).
- Data-layer DTOs are mapped to domain entities at the repository boundary.
- Never expose DTOs or JSON structures to the presentation layer.

### 2.4 No Business Logic in Widgets

Widgets are pure rendering functions. They read state from providers and dispatch actions to providers. They do not:

- Compute move legality
- Evaluate game outcomes
- Format complex data
- Make API calls
- Run AI computations
- Manage timers

```dart
// ✅ CORRECT: widget reads state and dispatches action
class GameBoard extends ConsumerWidget {
  const GameBoard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final phase = ref.watch(gameProvider);
    return switch (phase) {
      NotStarted() => const GameSetupPrompt(),
      InProgress(:final position, :final selectedSquare) => BoardGrid(
        position: position,
        selectedSquare: selectedSquare,
        onSquareTap: (square) => ref.read(gameProvider.notifier).onSquareTap(square),
      ),
      GameOver(:final result) => GameOverOverlay(result: result),
    };
  }
}

// ❌ WRONG: business logic in widget
class BadGameBoard extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final position = ref.watch(positionProvider);
    // ❌ Computing legal moves in a widget
    final legalMoves = generateLegalMoves(position, PlayerColor.white);
    // ❌ Evaluating game outcome in a widget
    if (legalMoves.isEmpty) { /* determine winner */ }
  }
}
```

---

## 3. State Management (Riverpod)

Per [ADR-009](../adr/adr-009-flutter-state-management.md), Riverpod is the sole state management solution.

### 3.1 Provider Types & When to Use

| Provider Type | Use Case | State Lifecycle |
|--------------|----------|-----------------|
| `StateNotifierProvider<T, S>` | Mutable state with actions (game, auth, settings) | Lives while watched |
| `Provider<T>` | Computed/derived values, dependency injection | Recomputed on dependency change |
| `FutureProvider<T>` | One-shot async data (load profile, fetch config) | Caches result until invalidated |
| `StreamProvider<T>` | Reactive streams (WebSocket, real-time updates) | Active while watched |
| `StateProvider<T>` | Simple primitive state (selected tab index, toggle) | Lives while watched |

### 3.2 Provider Decomposition

The Zustand monolith is decomposed into 8 units (6 core providers + learning + orchestration) per ADR-009:

| Provider | Responsibility | State Type |
|----------|---------------|------------|
| `gameProvider` | Game phase machine, board state, move execution, undo/redo | `GamePhase` (sealed) |
| `authProvider` | User session, JWT tokens, login/logout | `AuthState` |
| `clockProvider` | Clock ticking (`Timer.periodic` + `WidgetsBindingObserver` + `Stopwatch`), time tracking, pause/resume | `ClockState?` |
| `aiProvider` | AI computation trigger, cancellation, generation counter | `AiState` |
| `settingsProvider` | Board theme, notation, legal moves visibility, animation speed | `SettingsState` |
| `gamePersistenceProvider` | Auto-save, load, clear — routes to local/remote by auth status | Service (not state) |
| `learningModeProvider` | Tutorial step tracking, hint computation, move feedback | `LearningModeState` |
| `gameOrchestrationProvider` | Cross-provider side effects via `ref.listen` (AI trigger, clock switch, persistence sync) | Coordinator/service |

### 3.3 StateNotifier Pattern

```dart
/// Manages the full game lifecycle from setup through completion.
class GameNotifier extends StateNotifier<GamePhase> {
  final Ref _ref;

  GameNotifier(this._ref) : super(const NotStarted());

  /// Starts a new game with the given configuration.
  void startGame(GameConfig config) {
    final position = createInitialPosition();
    state = InProgress(
      position: position,
      currentTurn: PlayerColor.white,
      moveHistory: const [],
      moveIndex: 0,
    );
    _ref.read(clockProvider.notifier).startClock(config.timeControl);
  }

  /// Executes a validated move. Caller must ensure legality.
  void executeMove(Move move) {
    final current = state;
    if (current is! InProgress) return;

    final newPosition = applyMoveToBoard(current.position, move);
    final newTurn = oppositeColor(current.currentTurn);

    // Check for game end
    final legalMoves = generateLegalMoves(newPosition, newTurn);
    if (legalMoves.isEmpty) {
      state = GameOver(
        result: current.currentTurn == PlayerColor.white
            ? GameResult.whiteWins
            : GameResult.blackWins,
        reason: 'No legal moves',
        finalPosition: newPosition,
        moveHistory: [...current.moveHistory, MoveRecord(move, newPosition)],
      );
      _ref.read(clockProvider.notifier).stopClock();
      return;
    }

    state = current.copyWith(
      position: newPosition,
      currentTurn: newTurn,
      moveHistory: [...current.moveHistory, MoveRecord(move, newPosition)],
      moveIndex: current.moveHistory.length + 1,
      selectedSquare: null,
      legalMoveSquares: const [],
    );

    _ref.read(clockProvider.notifier).switchTurn();
  }
}

final gameProvider = StateNotifierProvider<GameNotifier, GamePhase>((ref) {
  return GameNotifier(ref);
});
```

### 3.4 ref.watch vs ref.read vs ref.listen

| Method | Use In | Behavior | Example |
|--------|--------|----------|---------|
| `ref.watch(provider)` | `build()` methods, computed providers | Rebuilds when value changes | `final phase = ref.watch(gameProvider);` |
| `ref.read(provider)` | Event handlers, callbacks, notifier methods | One-time read, no subscription | `ref.read(gameProvider.notifier).resign();` |
| `ref.listen(provider, callback)` | Inside `StateNotifier`, for side effects | Runs callback on change without rebuild | Game-over triggers persistence save |

**Rules:**
- **Never** use `ref.watch` in event handlers or callbacks — it would subscribe to changes in a non-rebuild context.
- **Never** use `ref.read` in `build()` for state that should trigger rebuilds.
- Use `ref.listen` for cross-provider side effects (e.g., game notifier listens to clock for time expiry).

### 3.5 AI Cancellation with Generation Counter

Per ADR-009 and ADR-011, use a generation counter for AI cancellation:

```dart
class AiNotifier extends StateNotifier<AiState> {
  final Ref _ref;
  int _aiGeneration = 0;

  AiNotifier(this._ref) : super(const AiState(isThinking: false));

  Future<void> triggerAiMove(
    BoardPosition position,
    PlayerColor player,
    DifficultyConfig config,
  ) async {
    state = state.copyWith(isThinking: true);
    final gen = ++_aiGeneration;

    try {
      final result = await _ref.read(aiServiceProvider).findBestMove(
        position: position,
        player: player,
        config: config,
      );

      // Discard stale results
      if (gen != _aiGeneration) return;

      if (result != null) {
        _ref.read(gameProvider.notifier).executeMove(result);
      }
    } catch (e, stackTrace) {
      if (gen != _aiGeneration) return;
      _ref.read(loggerProvider).error('AI move failed', e, stackTrace);
    } finally {
      if (gen == _aiGeneration) {
        state = state.copyWith(isThinking: false);
      }
    }
  }

  /// Cancels any pending AI computation. Stale results will be discarded.
  void cancel() {
    _aiGeneration++;
    state = state.copyWith(isThinking: false);
  }
}
```

**Rules:**
- Increment generation before starting computation.
- Check generation after every `await` point.
- In `finally`, only update state if generation still matches.
- The isolate runs to completion — do not attempt to kill isolates mid-computation (TT buffer would be lost).

### 3.6 Provider Organization

Providers are declared in `providers/` directories within each feature's `presentation/` layer:

```
features/game/presentation/providers/
├── game_provider.dart           # gameProvider + GameNotifier
├── ai_provider.dart             # aiProvider + AiNotifier
├── clock_provider.dart          # clockProvider + ClockNotifier
└── game_persistence_provider.dart  # gamePersistenceServiceProvider
```

**Rules:**
- One provider + its notifier per file.
- Provider variables are top-level `final` declarations.
- Provider dependencies are explicit via `ref.watch` / `ref.read`.
- No circular provider dependencies — if A watches B, B must not watch A.
- Document the provider dependency graph in a comment at the top of each provider file.

---

## 4. Testing Standards

### 4.1 Coverage Thresholds

| Layer | Statements | Branches | Functions | Lines |
|-------|-----------|----------|-----------|-------|
| **Dart Engine** (`shared/draughts-engine-dart/`) | ≥ 85% | ≥ 85% | ≥ 85% | ≥ 85% |
| **Riverpod Providers** | ≥ 70% | ≥ 60% | ≥ 70% | ≥ 70% |
| **Widget Tests** | ≥ 50% | ≥ 40% | ≥ 50% | ≥ 50% |
| **Repository/Data Layer** | ≥ 70% | ≥ 60% | ≥ 70% | ≥ 70% |
| **Overall Flutter App** | ≥ 60% | ≥ 50% | ≥ 50% | ≥ 60% |

Coverage is measured by `flutter test --coverage` and enforced in CI via `lcov`.

### 4.2 Test Frameworks

| Framework | Purpose | Package |
|-----------|---------|---------|
| `flutter_test` | Widget tests, unit tests | SDK built-in |
| `mocktail` | Mocking (no code generation) | `package:mocktail` |
| `riverpod` test utilities | Provider testing with `ProviderContainer` | `package:flutter_riverpod` |
| Golden tests | Pixel-perfect board rendering verification | `flutter_test` (built-in `matchesGoldenFile`) |
| Integration tests | Full app flow tests | `package:integration_test` |

**Do NOT use:** `mockito` (requires code generation), `bloc_test` (not using BLoC).

### 4.3 Test Naming Convention

Follow the pattern: `MethodName_Condition_ExpectedResult`

```dart
group('GameNotifier', () {
  test('startGame_withValidConfig_transitionsToInProgress', () { ... });
  test('executeMove_whenNotInProgress_doesNothing', () { ... });
  test('executeMove_withLastLegalMove_transitionsToGameOver', () { ... });
  test('resign_whileInProgress_declaresOpponentWinner', () { ... });
  test('resign_whenNotStarted_throwsStateError', () { ... });
});

group('MoveGenerator', () {
  test('generateLegalMoves_initialPosition_returns9MovesForWhite', () { ... });
  test('generateLegalMoves_withMandatoryCapture_returnsOnlyCapturesWithMaximumPieces', () { ... });
  test('generateLegalMoves_kingOnEmptyDiagonal_returnsAllFlyingKingMoves', () { ... });
});
```

### 4.4 Unit Test Structure

```dart
void main() {
  late ProviderContainer container;
  late MockGameRepository mockGameRepository;

  setUp(() {
    mockGameRepository = MockGameRepository();
    container = ProviderContainer(
      overrides: [
        gameRepositoryProvider.overrideWithValue(mockGameRepository),
      ],
    );
    addTearDown(container.dispose);
  });

  test('startGame_withValidConfig_transitionsToInProgress', () {
    // Arrange
    final config = GameConfig(
      difficulty: Difficulty.medium,
      playerColor: PlayerColor.white,
      timeControl: TimeControl.fiveMinutes,
    );

    // Act
    container.read(gameProvider.notifier).startGame(config);

    // Assert
    final state = container.read(gameProvider);
    expect(state, isA<InProgress>());
    final inProgress = state as InProgress;
    expect(inProgress.currentTurn, PlayerColor.white);
    expect(inProgress.moveHistory, isEmpty);
  });
}
```

### 4.5 Widget Test Structure

```dart
void main() {
  testWidgets('BoardWidget_displaysAllPiecesInCorrectPositions', (tester) async {
    // Arrange
    final container = ProviderContainer(
      overrides: [
        gameProvider.overrideWith((ref) => GameNotifier(ref)..startGame(testConfig)),
      ],
    );

    // Act
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(home: BoardWidget()),
      ),
    );

    // Assert
    expect(find.byType(PieceWidget), findsNWidgets(40)); // 20 white + 20 black
    expect(find.byType(SquareWidget), findsNWidgets(50)); // 50 playable squares
  });
}
```

### 4.6 Golden Tests for Board Rendering

Golden tests ensure pixel-perfect board rendering across changes:

```dart
void main() {
  testWidgets('BoardWidget_initialPosition_matchesGolden', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: Center(
            child: SizedBox(
              width: 400,
              height: 400,
              child: BoardWidget(),
            ),
          ),
        ),
      ),
    );

    await expectLater(
      find.byType(BoardWidget),
      matchesGoldenFile('goldens/board_initial_position.png'),
    );
  });

  testWidgets('BoardWidget_withSelectedSquare_highlightsCorrectly', (tester) async {
    // ... setup with selectedSquare = 20
    await expectLater(
      find.byType(BoardWidget),
      matchesGoldenFile('goldens/board_selected_square_20.png'),
    );
  });
}
```

**Rules:**
- Golden files are stored in `test/goldens/` and committed to the repository.
- Update goldens with `flutter test --update-goldens` when intentional UI changes are made.
- Golden tests run on Linux CI (macOS rendering may produce pixel differences).
- Golden tests cover: initial position, selected square highlight, legal move indicators, last move highlight, piece animations (keyframes), king rendering, all board themes.

### 4.7 Engine Test Parity

The Dart engine must maintain test parity with the TypeScript engine:

- Every TypeScript test case in `shared/draughts-engine/tests/` must have a corresponding Dart test in `shared/draughts-engine-dart/test/`.
- Test names should match (adjusted for Dart naming conventions).
- Both engines must produce identical results for the same inputs — validated via cross-engine test vectors stored in `shared/test-vectors/`.

### 4.8 Test Requirements

- Test all public methods and functions.
- Test edge cases: empty board, single piece, all kings, maximum capture chains, draw conditions.
- Test error conditions: network failures, invalid state transitions, corrupted save data.
- No test should depend on external services — mock all API calls, databases, and platform services.
- Tests must be deterministic — no reliance on wall-clock time, random numbers (seed randoms), or system state.
- Tests must pass in isolation and in any order.

---

## 5. Performance Standards

### 5.1 App Startup

| Metric | Target | Measurement |
|--------|--------|-------------|
| Cold start to interactive | < 2 seconds | `flutter run --trace-startup` on mid-range device |
| Warm start | < 500ms | Time from `onResume` to rendered frame |
| Splash screen duration | < 1.5 seconds | Time until first meaningful paint |

**Guidelines:**
- Defer non-critical initialization (analytics, remote config, game persistence load) to after first frame.
- Use `WidgetsBinding.instance.addPostFrameCallback` for post-startup work.
- Prefer lazy provider initialization — providers are initialized on first access, not at app start.
- Minimize main isolate work during startup: no synchronous I/O, no heavy parsing.

### 5.2 Rendering Performance

| Metric | Target |
|--------|--------|
| Frame rate during gameplay | 60 fps (16.67ms per frame) |
| Frame rate during AI thinking | 60 fps (AI runs on background isolate) |
| Frame rate during piece animation | 60 fps |
| Jank budget | < 1% of frames > 16ms during active gameplay |
| Widget rebuild count per frame | Minimize — use `select()` for targeted rebuilds |

**Guidelines:**
- Use `ref.watch(provider.select((s) => s.specificField))` to minimize rebuilds. The board widget should not rebuild when the clock ticks.
- Use `RepaintBoundary` around the board grid to isolate repaints from other UI elements.
- Use `const` constructors for unchanging widgets to skip rebuild checks.
- Profile with Flutter DevTools (Performance Overlay, Timeline) before release.
- Never allocate objects in `build()` — use `const`, `final`, or memoization.

### 5.3 AI Performance (Isolate)

Per ADR-011, all AI computation runs on a background isolate:

| Metric | Target |
|--------|--------|
| Easy difficulty response | < 500ms |
| Medium difficulty response | < 1 second |
| Hard difficulty response | < 2 seconds |
| Expert difficulty response | < 10 seconds (network, including fallback) |
| Isolate creation overhead | < 5ms |
| TT buffer transfer time | < 1ms (zero-copy via `TransferableTypedData`) |
| Main thread blocked by AI | 0ms (all computation off main isolate) |

**Guidelines:**
- Use `Isolate.run()` for AI computation — not `compute()` (cannot transfer `Uint8List` zero-copy).
- Transfer the transposition table `Uint8List` via `TransferableTypedData`, not copy.
- Never run AI search on the main isolate, even for Easy difficulty.
- Use the generation counter pattern for cancellation — do not kill isolates mid-computation.

### 5.4 Memory

| Metric | Target |
|--------|--------|
| Peak memory (during AI computation) | < 150 MB target (≤200 MB hard ceiling) |
| Steady-state memory (gameplay, no AI) | < 100 MB |
| Transposition table size | 4 MB (fixed, transferred between isolate invocations) |
| Memory after returning from background | Reclaim to steady-state within 2 seconds |

**Guidelines:**
- Avoid retaining large objects in provider state unnecessarily.
- Dispose controllers, tickers, and animation controllers in `dispose()`.
- Use `AutoDisposeModifier` on providers that should be reclaimed when not watched.
- Profile memory with Flutter DevTools (Memory tab) before release.

### 5.5 Network

| Metric | Target |
|--------|--------|
| API timeout | 10 seconds (configurable per endpoint) |
| Expert AI API timeout | 10 seconds (fallback to Hard on timeout) |
| Game persistence sync | Fire-and-forget (5 second timeout) |
| Retry policy | Exponential backoff: 1s, 2s, 4s (max 3 retries) |
| Offline tolerance | Full game playable offline (Easy/Medium/Hard AI is local) |

---

## 6. Security Standards

### 6.1 Token Storage

Per ADR-012, tokens are stored securely on mobile:

| Token | Storage | Lifetime |
|-------|---------|----------|
| Access token (JWT) | In-memory only (Riverpod `authProvider` state) | 15 minutes |
| Refresh token | `flutter_secure_storage` (Keychain on iOS, EncryptedSharedPreferences on Android) | 30 days |

**Rules:**
- **Never** store the access token in `SharedPreferences`, files, or any persistent storage.
- **Never** log, print, or include tokens in error reports or analytics.
- Access token lives only in Riverpod state — lost on app kill, refreshed on restart via refresh token.
- Refresh token is stored via `flutter_secure_storage` with the following options:

```dart
const _storage = FlutterSecureStorage(
  aOptions: AndroidOptions(encryptedSharedPreferences: true),
  iOptions: IOSOptions(
    accessibility: KeychainAccessibility.first_unlock_this_device,
  ),
);
```

### 6.2 Network Security

| Requirement | Implementation |
|-------------|---------------|
| **HTTPS only** | All API calls use `https://`. Reject `http://` in Dio base URL configuration. |
| **Certificate pinning** | Post-launch enhancement (not MVP). During MVP, rely on default TLS validation and revisit pinning after launch hardening. |
| **No cleartext traffic** | Android: set `android:usesCleartextTraffic="false"` in `AndroidManifest.xml`. iOS: ATS enabled (default). |
| **Timeout enforcement** | All Dio instances configured with connect/receive/send timeouts. |

```dart
// Certificate pinning example
final dio = Dio(BaseOptions(
  baseUrl: ApiConstants.baseUrl,
  connectTimeout: const Duration(seconds: 10),
  receiveTimeout: const Duration(seconds: 10),
));

// Add certificate pinning interceptor for production builds
if (!kDebugMode) {
  dio.httpClientAdapter = Http2Adapter(
    ConnectionManager(
      onClientCreate: (_, config) {
        config.onBadCertificate = (_) => false; // Reject invalid certs
        // Pin specific certificate
      },
    ),
  );
}
```

### 6.3 Sensitive Data

- **No secrets in source code.** API keys, signing certificates, and credentials are stored in CI secrets (GitHub Actions) or environment-specific configuration.
- **No tokens in logs.** All logging must sanitize authorization headers and token values. Use a Dio interceptor to redact `Authorization` headers in debug logs.
- **No PII in analytics.** User IDs may be logged for debugging, but never email, name, or gameplay data.
- **Secure clipboard.** If the app copies any data to clipboard, clear it after 60 seconds.

### 6.4 Release Build Hardening

| Technique | Applies To | Tool |
|-----------|-----------|------|
| **Dart obfuscation** | Release builds (iOS + Android) | `flutter build --obfuscate --split-debug-info=build/debug-info/` |
| **ProGuard/R8** | Android release | Default with `flutter build appbundle --release` |
| **Strip debug symbols** | iOS release | Default with `flutter build ipa --release` |
| **Debug info archive** | Both platforms | `--split-debug-info` output archived as CI artifact for crash symbolication |

**Release build command:**
```bash
# Android
flutter build appbundle --release --obfuscate --split-debug-info=build/debug-info/android/

# iOS
flutter build ipa --release --obfuscate --split-debug-info=build/debug-info/ios/
```

### 6.5 Data at Rest

- Game state persistence for **guests**: stored in app-private storage (not shared preferences). Cleared on app uninstall.
- Game state persistence for **registered users**: synced to backend API. Local cache in app-private storage.
- Settings: stored via `SharedPreferences` (non-sensitive data only: theme, notation preference).
- **Never** store game data, settings, or cached API responses on external/public storage.

---

## 7. Dependency Management

### 7.1 Engine Package: Zero Runtime Dependencies

The Dart engine package (`shared/draughts-engine-dart/`) must have **zero runtime dependencies** in `pubspec.yaml`. It may only depend on:

- `dart:core`, `dart:math`, `dart:typed_data`, `dart:convert` (SDK libraries only)

Dev dependencies (for testing) are allowed: `test`, `checks`.

This mirrors the TypeScript engine's zero-dependency policy and ensures the engine can be used in any Dart context (Flutter app, CLI tool, server-side) without pulling in platform-specific packages.

### 7.2 Version Pinning

All dependencies in `pubspec.yaml` must use **exact version pinning** (no caret `^` ranges):

```yaml
# ✅ CORRECT: exact versions
dependencies:
  flutter_riverpod: 2.6.1
  go_router: 14.6.2
  dio: 5.7.0
  flutter_secure_storage: 9.2.3

# ❌ WRONG: caret ranges allow uncontrolled updates
dependencies:
  flutter_riverpod: ^2.6.1  # Could resolve to 2.7.0 with breaking behavior
  dio: ^5.7.0
```

**Rules:**
- `pubspec.lock` is committed to the repository and must not be in `.gitignore`.
- Version updates are deliberate: a developer updates the version in `pubspec.yaml`, runs tests, and commits.
- Run `flutter pub outdated` weekly to check for security patches.
- Dependabot or Renovate is configured for automated PR creation on dependency updates.

### 7.3 Approved Package List

Only packages from this approved list may be added to the project. Adding a new package requires a brief justification in the PR description.

| Package | Purpose | Version Policy |
|---------|---------|----------------|
| `flutter_riverpod` | State management (ADR-009) | Exact pin |
| `go_router` | Declarative routing | Exact pin |
| `dio` | HTTP client (interceptors, timeouts, cancellation) | Exact pin |
| `flutter_secure_storage` | Secure token storage (ADR-012) | Exact pin |
| `shared_preferences` | Non-sensitive key-value storage (settings) | Exact pin |
| `path_provider` | App documents/cache directory paths | Exact pin |
| `package_info_plus` | App version for version checking (ADR-014) | Exact pin |
| `connectivity_plus` | Network connectivity status | Exact pin |
| `flutter_svg` | SVG rendering (piece assets, if SVG) | Exact pin |
| `cached_network_image` | Image caching (profile avatars) | Exact pin |
| `intl` | Internationalization / number formatting | Exact pin |
| `freezed_annotation` | (Optional) Immutable state class code generation | Exact pin |
| `json_annotation` | JSON serialization annotations | Exact pin |
| `firebase_crashlytics` | Crash reporting (production) | Exact pin |
| `firebase_analytics` | Usage analytics (production) | Exact pin |
| `url_launcher` | Open store URLs for app update (ADR-014) | Exact pin |
| `wakelock_plus` | Keep screen on during gameplay | Exact pin |
| `haptic_feedback` | Haptic feedback on moves (via `HapticFeedback` from services) | SDK built-in |

**Dev dependencies (approved):**

| Package | Purpose |
|---------|---------|
| `flutter_test` | Widget and unit testing (SDK) |
| `mocktail` | Mocking without code generation |
| `build_runner` | Code generation runner |
| `freezed` | Immutable state class generation |
| `json_serializable` | JSON serialization code gen |
| `flutter_lints` | Lint rules |
| `integration_test` | Integration testing (SDK) |

**Prohibited packages:**

| Package | Reason | Alternative |
|---------|--------|-------------|
| `provider` | Superseded by Riverpod (ADR-009) | `flutter_riverpod` |
| `bloc` / `flutter_bloc` | Not selected (ADR-009) | `flutter_riverpod` |
| `get` / `getx` | Poor testability, global mutable state | `flutter_riverpod` + `go_router` |
| `http` | Missing interceptors, timeout config | `dio` |
| `mockito` | Requires code generation | `mocktail` |
| `hive` | Over-engineered for our storage needs | `shared_preferences` + `flutter_secure_storage` |

---

## 8. Error Handling

### 8.1 Result<T> Pattern

All repository methods and service methods that can fail return `Result<T>` instead of throwing exceptions:

```dart
/// Represents the result of an operation that can succeed or fail.
sealed class Result<T> {
  const Result();

  /// Creates a successful result with a value.
  const factory Result.success(T value) = Success<T>;

  /// Creates a failed result with a failure.
  const factory Result.failure(Failure failure) = Failure_<T>;

  /// Maps the success value to a new type.
  Result<R> map<R>(R Function(T value) transform);

  /// Returns the value if success, or calls onFailure if failure.
  T getOrElse(T Function(Failure failure) onFailure);
}

final class Success<T> extends Result<T> {
  final T value;
  const Success(this.value);

  @override
  Result<R> map<R>(R Function(T value) transform) =>
      Result.success(transform(value));

  @override
  T getOrElse(T Function(Failure failure) onFailure) => value;
}

final class Failure_<T> extends Result<T> {
  final Failure failure;
  const Failure_(this.failure);

  @override
  Result<R> map<R>(R Function(T value) transform) =>
      Result.failure(failure);

  @override
  T getOrElse(T Function(Failure failure) onFailure) => onFailure(failure);
}
```

### 8.2 Failure Types

```dart
/// Categorized failure types for consistent error handling.
sealed class Failure {
  final String message;
  final Object? cause;
  const Failure(this.message, [this.cause]);
}

final class NetworkFailure extends Failure {
  final int? statusCode;
  const NetworkFailure(super.message, {this.statusCode, super.cause});
}

final class AuthFailure extends Failure {
  const AuthFailure(super.message, [super.cause]);
}

final class CacheFailure extends Failure {
  const CacheFailure(super.message, [super.cause]);
}

final class ValidationFailure extends Failure {
  final Map<String, String> fieldErrors;
  const ValidationFailure(super.message, {this.fieldErrors = const {}});
}

final class ServerFailure extends Failure {
  final int statusCode;
  const ServerFailure(super.message, {required this.statusCode, super.cause});
}
```

### 8.3 Usage in Repositories

```dart
@override
Future<Result<UserProfile>> getProfile(String userId) async {
  try {
    final response = await _dio.get('/api/player/$userId/profile');
    return Result.success(UserProfileDto.fromJson(response.data).toDomain());
  } on DioException catch (e) {
    if (e.type == DioExceptionType.connectionTimeout) {
      return const Result.failure(NetworkFailure('Connection timed out'));
    }
    if (e.response?.statusCode == 401) {
      return const Result.failure(AuthFailure('Session expired'));
    }
    if (e.response?.statusCode == 404) {
      return const Result.failure(NetworkFailure('Profile not found', statusCode: 404));
    }
    return Result.failure(NetworkFailure('Failed to load profile', cause: e));
  }
}
```

### 8.4 Usage in Providers

```dart
Future<void> loadProfile() async {
  state = state.copyWith(isLoading: true, error: null);

  final result = await _ref.read(playerRepositoryProvider).getProfile(userId);

  state = switch (result) {
    Success(:final value) => state.copyWith(
      isLoading: false,
      profile: value,
    ),
    Failure_(:final failure) => state.copyWith(
      isLoading: false,
      error: failure.message,
    ),
  };
}
```

### 8.5 Crashlytics Logging

Production builds report unhandled errors and fatal crashes to Firebase Crashlytics:

```dart
void main() {
  runZonedGuarded(() async {
    WidgetsFlutterBinding.ensureInitialized();

    // Capture Flutter framework errors
    FlutterError.onError = (details) {
      FirebaseCrashlytics.instance.recordFlutterFatalError(details);
    };

    // Capture async errors
    PlatformDispatcher.instance.onError = (error, stack) {
      FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
      return true;
    };

    await Firebase.initializeApp();
    runApp(const ProviderScope(child: DraughtsApp()));
  }, (error, stack) {
    FirebaseCrashlytics.instance.recordError(error, stack);
  });
}
```

**Rules:**
- All unhandled exceptions are caught and reported to Crashlytics.
- **Never** include tokens, passwords, or PII in crash reports.
- Include user ID (anonymized) and app version in Crashlytics user context.
- Log non-fatal errors (network failures, parse errors) as non-fatal Crashlytics events.
- In debug mode, Crashlytics collection is disabled — errors are printed to console.

### 8.6 Graceful Degradation

| Failure Scenario | Graceful Behavior |
|-----------------|-------------------|
| Backend API unreachable | Game fully playable offline (local AI). Show "Offline" indicator. Queue persistence sync. |
| Expert AI API timeout (>10s) | Fall back to Hard difficulty (local AI). Show "Using local AI" message. |
| Token refresh fails | Redirect to login screen. Preserve in-progress game locally. |
| Version check endpoint down | Allow app to continue (do not block on version check failure). |
| Game save fails | Retry silently. Show warning only on repeated failure (3+ consecutive). |
| Corrupted saved game | Discard corrupted data. Show "Could not restore saved game" message. Start fresh. |

---

## 9. CI/CD Standards

Per [ADR-010](../adr/adr-010-mobile-cicd-pipeline.md), the CI/CD pipeline uses GitHub Actions with Fastlane.

### 9.1 PR Quality Gates

All checks must pass before a PR can be merged. Zero exceptions.

| Gate | Command | Runner | Failure Behavior |
|------|---------|--------|-----------------|
| **Dart analysis** | `flutter analyze --fatal-infos` | Linux | Block merge |
| **Dart formatting** | `dart format --set-exit-if-changed .` | Linux | Block merge |
| **Unit + widget tests** | `flutter test --coverage` | Linux | Block merge |
| **Engine tests** | `cd shared/draughts-engine-dart && dart test --coverage=coverage` | Linux | Block merge |
| **Coverage thresholds** | `lcov --summary` against thresholds (§4.1) | Linux | Block merge |
| **Android compile check** | `flutter build apk --debug` | Linux | Block merge |
| **iOS compile check** | `flutter build ios --no-codesign` | macOS | Block merge |
| **Golden test verification** | Golden tests run as part of `flutter test` | Linux | Block merge |

### 9.2 CI Pipeline (`ci-flutter.yml`)

```
Trigger: push/PR to main, develop

Job 1 — Lint, Format, Test (Linux, ~5 min):
  ├── flutter analyze --fatal-infos
  ├── dart format --set-exit-if-changed .
  ├── flutter test --coverage
  ├── dart test (engine package)
  └── lcov coverage threshold check

Job 2 — Android Compile (Linux, ~8 min):
  └── flutter build apk --debug

Job 3 — iOS Compile (macOS, ~12 min):
  ├── flutter build ios --no-codesign
  └── Golden tests (platform-consistent rendering)
```

### 9.3 Deploy Pipeline (`deploy-flutter.yml`)

```
Trigger: manual dispatch or tag push (v*)

Job 1 — iOS Beta (macOS):
  ├── fastlane match (fetch signing certs)
  ├── flutter build ipa --release --obfuscate --split-debug-info=...
  ├── Sign with distribution certificate
  └── fastlane upload_to_testflight

Job 2 — Android Beta (Linux):
  ├── Generate key.properties from GitHub secrets
  ├── flutter build appbundle --release --obfuscate --split-debug-info=...
  ├── Sign with release keystore
  └── fastlane upload_to_play_store (internal track)

Job 3 — Production Promote (manual):
  └── fastlane promote (beta → production for iOS and Android)
```

### 9.4 Fastlane Configuration

| Lane | Action |
|------|--------|
| `ios beta` | Match signing → build IPA → upload TestFlight |
| `ios release` | Promote TestFlight build to App Store |
| `android beta` | Generate keystore → build AAB → upload Play Store (internal) |
| `android release` | Promote internal → production on Play Store |

**Code signing secrets (stored in GitHub Actions secrets):**

| Secret | Purpose |
|--------|---------|
| `IOS_CERTIFICATE_P12` | Base64-encoded Apple Distribution Certificate |
| `IOS_CERTIFICATE_PASSWORD` | Password for the P12 file |
| `IOS_PROVISIONING_PROFILE` | Base64-encoded provisioning profile |
| `MATCH_PASSWORD` | Fastlane match encryption password |
| `APP_STORE_CONNECT_API_KEY` | JSON key for App Store Connect API |
| `ANDROID_KEYSTORE` | Base64-encoded release keystore (.jks) |
| `ANDROID_KEY_ALIAS` | Keystore alias |
| `ANDROID_KEY_PASSWORD` | Keystore password |
| `ANDROID_STORE_PASSWORD` | Store password |
| `PLAY_STORE_JSON_KEY` | Google Play service account JSON |

### 9.5 Version Management

Per ADR-014, versioning follows semantic versioning:

```yaml
# pubspec.yaml
version: 1.2.3+45
#        ^^^^^  ^^
#        |      |
#        |      Build number (incremented every release, used by stores)
#        Semantic version (Major.Minor.Patch)
```

- **Major**: Breaking changes (game rules change, incompatible save format).
- **Minor**: New features (new AI difficulty, new board theme).
- **Patch**: Bug fixes, performance improvements.
- **Build number**: Auto-incremented in CI. Never manually set.

### 9.6 Branch Strategy

| Branch | Purpose | CI | Deploy |
|--------|---------|-----|--------|
| `main` | Production-ready code | Full CI | Auto-deploy to staging on merge |
| `develop` | Integration branch | Full CI | — |
| `feature/*` | Feature development | Full CI on PR | — |
| `hotfix/*` | Production fixes | Full CI on PR | Fast-track deploy |
| `release/*` | Release stabilization | Full CI | Deploy to TestFlight / Play Console internal |

---

## 10. Documentation Standards

### 10.1 Dartdoc on All Public APIs

Every public class, method, function, property, and enum must have a dartdoc comment. The engine package and app-level providers are held to the same standard.

```dart
/// Generates all legal moves for the given [player] from the current [position].
///
/// Implements FMJD International Draughts rules:
/// - Mandatory captures: if any capture is available, only captures are returned.
/// - Maximum capture rule: only captures taking the maximum number of pieces are legal.
/// - Flying kings: kings can move and capture any distance diagonally.
///
/// Returns an empty list if the player has no legal moves (game over condition).
///
/// Example:
/// ```dart
/// final moves = generateLegalMoves(initialPosition, PlayerColor.white);
/// assert(moves.length == 9); // 9 opening moves for white
/// ```
List<Move> generateLegalMoves(BoardPosition position, PlayerColor player) { ... }
```

### 10.2 Dartdoc Requirements

| Element | Required Sections |
|---------|-------------------|
| **Class** | Single-line summary. Purpose. Usage example for complex classes. |
| **Public method** | Summary. Parameter descriptions (via `[paramName]` references). Return value description. Throws (if any). |
| **Enum** | Summary. Each value documented. |
| **Sealed class** | Summary. Each subclass documented with its fields. |
| **Provider** | Summary. What state it manages. Dependencies. |
| **Widget** | Summary. Required props. Visual behavior. |

### 10.3 Comment Standards

```dart
// ✅ CORRECT: dartdoc on public API
/// The current game phase, determining what actions are available.
///
/// See also:
/// - [NotStarted], before a game begins
/// - [InProgress], during active gameplay
/// - [GameOver], after the game ends
sealed class GamePhase { ... }

// ✅ CORRECT: implementation comment for non-obvious logic
// The maximum capture rule (FMJD §4.13): when multiple capture
// sequences are available, the player MUST choose the sequence
// that captures the maximum number of pieces.
final bestCaptures = captures.where((c) => c.capturedCount == maxCaptures);

// ❌ WRONG: useless comment that restates the code
// Increment the counter
counter++;

// ❌ WRONG: missing dartdoc on public method
List<Move> generateLegalMoves(BoardPosition position, PlayerColor player) { ... }
```

### 10.4 README Files

Each major directory must contain a `README.md`:

| Location | Contents |
|----------|----------|
| `mobile/` (Flutter app root) | Setup instructions, build commands, architecture overview |
| `mobile/lib/features/` | Feature module directory listing with brief descriptions |
| `mobile/lib/core/` | Core module documentation (error handling, networking, DI) |
| `shared/draughts-engine-dart/` | Engine public API, usage examples, test commands |

### 10.5 Architecture Decision Records

All significant technical decisions must be documented as ADRs in `specs/adr/`. Flutter-specific ADRs:

| ADR | Topic |
|-----|-------|
| ADR-009 | State management (Riverpod) |
| ADR-010 | Mobile CI/CD (GitHub Actions + Fastlane) |
| ADR-011 | Isolate strategy for AI engine |
| ADR-012 | Backend auth overhaul for mobile |
| ADR-013 | Flutter Web exclusion (iOS + Android only) |
| ADR-014 | App versioning and forced updates |
| ADR-015 | Shared engine as Dart package |

New ADRs follow the same template: Status, Date, Context, Decision, Consequences, Alternatives Considered.

### 10.6 Inline Documentation Thresholds

| Code Area | Dartdoc Coverage Target |
|-----------|------------------------|
| Engine package public API | 100% |
| Provider public methods | 100% |
| Widget public constructors | 100% |
| Repository interfaces | 100% |
| Internal helper functions | Best effort (document non-obvious logic) |

Verify with `dart doc --dry-run` — should produce zero warnings for missing documentation on public APIs.

---

## Appendix A: Quick Reference Card

```
File naming:        snake_case.dart
Class naming:       PascalCase
Variable naming:    camelCase
Private members:    _camelCase
Providers:          camelCaseProvider

State management:   Riverpod (StateNotifier, Provider, FutureProvider)
Routing:            go_router
HTTP client:        Dio
Secure storage:     flutter_secure_storage
Testing:            flutter_test + mocktail

Architecture:       features/{name}/{data,domain,presentation}/
Engine package:     shared/draughts-engine-dart/ (zero deps)
Targets:            iOS + Android only (no Flutter Web — ADR-013)
AI:                 Isolate.run() + TransferableTypedData (ADR-011)
Auth:               JWT (15min) + refresh token (30d) (ADR-012)

CI gates:           analyze → format → test → coverage → compile
Deploy:             Fastlane → TestFlight / Play Console
```

---

## Appendix B: Relationship to AGENTS.md

This document extends the project-wide [AGENTS.md](../../AGENTS.md) with Flutter-specific standards. Where both documents address the same topic, this document takes precedence for Flutter/Dart code. AGENTS.md remains authoritative for:

- Backend (ASP.NET Core) standards
- Frontend (Next.js) standards
- Shared TypeScript engine standards
- Infrastructure and deployment (Bicep, Azure)
- Game rules reference (FMJD compliance)
- General API design conventions

The following AGENTS.md sections apply to the Flutter app without modification:
- §6 API Design (route conventions, request/response patterns)
- §8 AI Architecture (difficulty levels, Expert fallback)
- §11 Game Rules Reference (FMJD compliance)
- §12 Security (general principles)
