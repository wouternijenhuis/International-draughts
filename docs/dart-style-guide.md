# Dart & Flutter Style Guide

> Coding standards and patterns for the International Draughts Flutter mobile application
> and the shared Dart engine package.
>
> **Source:** [Flutter Development Standards](../specs/migration/flutter-development-standards.md)
> **Extends:** [AGENTS.md](../AGENTS.md) (Flutter-specific standards take precedence for Dart code)

---

## Contents

1. [Naming Conventions](#1-naming-conventions)
2. [File Organization](#2-file-organization)
3. [Import Ordering](#3-import-ordering)
4. [Immutability Patterns](#4-immutability-patterns)
5. [Sealed Class Patterns](#5-sealed-class-patterns)
6. [Error Handling — Result\<T\> Pattern](#6-error-handling--resultt-pattern)
7. [Boolean Naming](#7-boolean-naming)
8. [Dependency Rules](#8-dependency-rules)
9. [Provider Naming (Riverpod)](#9-provider-naming-riverpod)
10. [Dart Language Preferences](#10-dart-language-preferences)
11. [Widget Rules](#11-widget-rules)
12. [Documentation Standards](#12-documentation-standards)

---

## 1. Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| **Classes, enums, typedefs, sealed classes** | `PascalCase` | `GamePhase`, `BoardPosition`, `PlayerColor` |
| **Libraries, packages, file names, directories** | `snake_case` | `game_provider.dart`, `move_generator.dart` |
| **Variables, parameters, functions, methods** | `camelCase` | `findBestMove()`, `currentTurn`, `isThinking` |
| **Constants (top-level & static)** | `camelCase` | `defaultBoardTheme`, `maxSearchDepth` |
| **Private members** | `_camelCase` | `_aiGeneration`, `_ttBuffer` |
| **Named parameters** | `camelCase` (always use `required` or provide default) | `required this.position` |
| **Boolean variables/getters** | Affirmative phrasing | `isThinking`, `hasLegalMoves`, `canUndo` |
| **Riverpod providers** | `camelCase` + `Provider` suffix | `gameProvider`, `clockProvider`, `authProvider` |

```dart
// ✅ CORRECT
class BoardPosition { ... }           // PascalCase class
final currentTurn = PlayerColor.white; // camelCase variable
const maxSearchDepth = 20;            // camelCase constant
bool get isThinking => _isThinking;   // Affirmative boolean
File: move_generator.dart             // snake_case file

// ❌ WRONG
class board_position { ... }          // snake_case class
final CurrentTurn = PlayerColor.white; // PascalCase variable
const MAX_SEARCH_DEPTH = 20;          // SCREAMING_CASE constant
bool get notStarted => _notStarted;   // Negative boolean
File: MoveGenerator.dart              // PascalCase file
```

---

## 2. File Organization

**One public class per file.** Private helper classes may colocate with their public class.
The file name must match the primary class name in `snake_case`:

```
game_phase.dart       → sealed class GamePhase
game_provider.dart    → class GameNotifier + gameProvider
board_widget.dart     → class BoardWidget
move_generator.dart   → List<Move> generateLegalMoves(...)
```

Feature modules follow a clean-architecture layout:

```
features/game/
├── data/
│   ├── game_repository_impl.dart
│   └── game_remote_data_source.dart
├── domain/
│   ├── game_phase.dart
│   ├── game_config.dart
│   └── game_repository.dart       # Abstract interface
└── presentation/
    ├── providers/
    │   ├── game_provider.dart
    │   └── ai_provider.dart
    ├── screens/
    │   └── game_screen.dart
    └── widgets/
        ├── board_widget.dart
        └── piece_widget.dart
```

---

## 3. Import Ordering

Enforce with the `directives_ordering` lint rule. Imports are grouped in this order,
separated by blank lines:

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

---

## 4. Immutability Patterns

### 4.1 Final Fields & Const Constructors

All class fields must be `final` unless mutation is explicitly required and documented.
All widget and value-object constructors must be `const` when all fields are final.

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
```

### 4.2 Const Widget Constructors

```dart
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
```

### 4.3 Prefer `final` Locals

```dart
// ✅ CORRECT: final local variable
final moves = generateLegalMoves(position, player);
final bestMove = moves.first;

// ❌ WRONG: var when value is never reassigned
var moves = generateLegalMoves(position, player);
```

### 4.4 Const in Widget Trees

Use `const` for compile-time constant widget instances to enable Flutter's const optimization:

```dart
// ✅ CORRECT: const widgets where possible
Column(
  children: const [
    SizedBox(height: 16),
    Text('International Draughts'),
    SizedBox(height: 8),
  ],
)
```

### 4.5 Anti-Pattern

```dart
// ❌ WRONG: missing const, missing final
class BadExample {
  Color lightSquare;                // Should be final
  BadExample(this.lightSquare);     // Should be const if all fields are final
}
```

---

## 5. Sealed Class Patterns

Use sealed classes for types with distinct variants. This enables exhaustive `switch`
handling and makes illegal states unrepresentable.

### 5.1 GamePhase — State Machine

```dart
sealed class GamePhase {
  const GamePhase();
}

final class NotStarted extends GamePhase {
  const NotStarted();
}

final class InProgress extends GamePhase {
  final BoardPosition position;
  final PlayerColor currentTurn;
  final List<MoveRecord> moveHistory;
  final int moveIndex;
  final int? selectedSquare;
  final List<int> legalMoveSquares;

  const InProgress({
    required this.position,
    required this.currentTurn,
    this.moveHistory = const [],
    this.moveIndex = 0,
    this.selectedSquare,
    this.legalMoveSquares = const [],
  });
}

final class GameOver extends GamePhase {
  final GameResult result;
  final String reason;
  final BoardPosition finalPosition;
  final List<MoveRecord> moveHistory;

  const GameOver({
    required this.result,
    required this.reason,
    required this.finalPosition,
    required this.moveHistory,
  });
}
```

### 5.2 Move — Union Type

```dart
sealed class Move {
  final int from;
  final int to;
  const Move({required this.from, required this.to});
}

final class SimpleMove extends Move {
  const SimpleMove({required super.from, required super.to});
}

final class CaptureMove extends Move {
  final List<int> captured;
  final List<int> path;

  const CaptureMove({
    required super.from,
    required super.to,
    required this.captured,
    required this.path,
  });
}
```

### 5.3 DrawReason — Exhaustive Enum-Like

```dart
sealed class DrawReason {
  final String description;
  const DrawReason(this.description);
}

final class ThreefoldRepetition extends DrawReason {
  const ThreefoldRepetition() : super('Threefold repetition');
}

final class TwentyFiveMoveRule extends DrawReason {
  const TwentyFiveMoveRule() : super('25-move rule (kings only)');
}

final class SixteenMoveEndgameRule extends DrawReason {
  const SixteenMoveEndgameRule() : super('16-move endgame rule');
}

final class MutualAgreement extends DrawReason {
  const MutualAgreement() : super('Draw by mutual agreement');
}
```

### 5.4 Exhaustive Switch Expressions

Always use exhaustive `switch` expressions on sealed types — **never** add a default case:

```dart
// ✅ CORRECT: exhaustive switch — compiler enforces all cases handled
Widget buildPhase(GamePhase phase) {
  return switch (phase) {
    NotStarted()                                    => const GameSetupPrompt(),
    InProgress(:final position, :final selectedSquare) => BoardGrid(
      position: position,
      selectedSquare: selectedSquare,
    ),
    GameOver(:final result)                         => GameOverScreen(result: result),
  };
}

// ✅ CORRECT: exhaustive switch on Move
String describeMove(Move move) {
  return switch (move) {
    SimpleMove(:final from, :final to)          => '$from-$to',
    CaptureMove(:final from, :final to, :final captured) =>
        '$from×$to (captured ${captured.length})',
  };
}

// ❌ WRONG: default case on sealed type — hides missing cases at compile time
Widget buildPhaseBad(GamePhase phase) {
  return switch (phase) {
    InProgress() => const BoardGrid(),
    _ => const Placeholder(), // Hides NotStarted and GameOver
  };
}
```

### 5.5 Rules

- Use `sealed class` for all types with distinct variants (game phase, move type, result, error).
- Mark all subclasses as `final class` to prevent further extension outside the library.
- Always use exhaustive `switch` expressions — never add a default case on sealed types.
- Use pattern matching with destructuring: `case InProgress(:final position)`.

---

## 6. Error Handling — Result\<T\> Pattern

Repository and service methods that can fail return `Result<T>` instead of throwing exceptions.
Exceptions are reserved for programmer errors (assertion failures, bugs).

### 6.1 The Result Type

```dart
/// Represents the result of an operation that can succeed or fail.
sealed class Result<T> {
  const Result();

  const factory Result.success(T value) = Success<T>;
  const factory Result.failure(Failure failure) = Failure_<T>;

  /// Maps the success value to a new type.
  Result<R> map<R>(R Function(T value) transform);

  /// Returns the value if success, or calls [onFailure] if failure.
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

### 6.2 Failure Types

```dart
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

### 6.3 Usage in Repositories

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
    return Result.failure(NetworkFailure('Failed to load profile', cause: e));
  }
}
```

### 6.4 Usage in Providers

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

### 6.5 When to Use Exceptions vs Result\<T\>

| Scenario | Approach |
|----------|----------|
| Network call may fail | `Result<T>` |
| File I/O may fail | `Result<T>` |
| Invalid user input | `Result<T>` with `ValidationFailure` |
| Programmer error (bug) | `throw AssertionError(...)` or `assert()` |
| Framework contract violated | `throw StateError(...)` |
| Null where impossible | Document with `!` + comment (see Null Safety rules) |

---

## 7. Boolean Naming

All boolean variables, getters, and parameters must use **affirmative phrasing**.
The name should read naturally in an `if` statement.

```dart
// ✅ CORRECT: affirmative booleans
bool get isThinking => _isThinking;
bool get hasLegalMoves => _legalMoves.isNotEmpty;
bool get canUndo => _moveIndex > 0;
bool get isGameOver => state is GameOver;
bool get isConnected => _connectionStatus == ConnectionStatus.connected;
final bool isFirstMove;
final bool shouldAnimate;

// ❌ WRONG: negative/double-negative booleans
bool get notStarted => ...;       // Use isStarted or isNotStarted via !isStarted
bool get noMovesLeft => ...;      // Use hasLegalMoves
bool get cantUndo => ...;         // Use canUndo
bool get isNotConnected => ...;   // Use isConnected, negate at call site
```

At the call site, negate with `!`:

```dart
if (!isConnected) {
  showOfflineIndicator();
}
```

---

## 8. Dependency Rules

### 8.1 Engine Package — ZERO Runtime Dependencies

The Dart engine package (`shared/draughts-engine-dart/`) must have **zero runtime dependencies**
in `pubspec.yaml`. It may only import:

- `dart:core` (implicit)
- `dart:math`
- `dart:typed_data`
- `dart:convert`

No other SDK libraries. No third-party packages.

```yaml
# shared/draughts-engine-dart/pubspec.yaml
name: draughts_engine
description: Pure Dart draughts engine — FMJD 10×10 rules, AI, move generation.

environment:
  sdk: '>=3.0.0 <4.0.0'

# ✅ ZERO runtime dependencies
dependencies: {}

# Dev dependencies for testing are allowed
dev_dependencies:
  test: 1.25.8
  checks: 0.3.0
```

This mirrors the TypeScript engine's zero-dependency policy and ensures the engine
works in any Dart context: Flutter app, CLI tool, server-side, or WASM.

### 8.2 App Code — Approved Packages Only

The Flutter app (`mobile/`) may use packages from the [approved list](../specs/migration/flutter-development-standards.md#73-approved-package-list).
Adding a new package requires justification in the PR description.

Key approved packages:

| Package | Purpose |
|---------|---------|
| `flutter_riverpod` | State management (ADR-009) |
| `go_router` | Declarative routing |
| `dio` | HTTP client |
| `flutter_secure_storage` | Secure token storage (ADR-012) |
| `shared_preferences` | Non-sensitive key-value storage |
| `freezed_annotation` | Immutable model code generation (serialization models only) |
| `json_annotation` | JSON serialization annotations |
| `mocktail` | Mocking in tests (dev dependency) |

### 8.3 Freezed Usage

`freezed` is allowed for **serialization models** (DTOs, API responses) in the `data/` layer.
Domain entities and sealed state classes must be written by hand using native Dart
sealed classes — not generated with `freezed`.

```dart
// ✅ CORRECT: freezed for DTO serialization
@freezed
class UserProfileDto with _$UserProfileDto {
  const factory UserProfileDto({
    required String id,
    required String displayName,
    required int rating,
  }) = _UserProfileDto;

  factory UserProfileDto.fromJson(Map<String, dynamic> json) =>
      _$UserProfileDtoFromJson(json);
}

// ✅ CORRECT: hand-written sealed class for domain state
sealed class GamePhase {
  const GamePhase();
}

// ❌ WRONG: freezed for domain state
@freezed
sealed class GamePhase with _$GamePhase { ... }
```

### 8.4 Version Pinning

All dependencies use **exact version pinning** (no caret `^` ranges):

```yaml
# ✅ CORRECT
dependencies:
  flutter_riverpod: 2.6.1
  go_router: 14.6.2
  dio: 5.7.0

# ❌ WRONG
dependencies:
  flutter_riverpod: ^2.6.1
  dio: ^5.7.0
```

`pubspec.lock` is committed to the repository.

---

## 9. Provider Naming (Riverpod)

Provider variables use `camelCase` with a `Provider` suffix. Each provider and its
notifier live in one file.

```dart
// features/game/presentation/providers/game_provider.dart

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

  /// Executes a validated move.
  void executeMove(Move move) { ... }
}

/// Provider for the game state machine.
final gameProvider = StateNotifierProvider<GameNotifier, GamePhase>((ref) {
  return GameNotifier(ref);
});
```

| Provider | File | Variable |
|----------|------|----------|
| Game state | `game_provider.dart` | `gameProvider` |
| AI computation | `ai_provider.dart` | `aiProvider` |
| Clock | `clock_provider.dart` | `clockProvider` |
| Auth session | `auth_provider.dart` | `authProvider` |
| Settings | `settings_provider.dart` | `settingsProvider` |
| Persistence | `game_persistence_provider.dart` | `gamePersistenceServiceProvider` |

**Rules:**

- One provider + its notifier per file.
- Provider variables are top-level `final` declarations.
- Use `ref.watch` in `build()` methods and computed providers. Use `ref.read` in callbacks and event handlers.
- No circular provider dependencies.

---

## 10. Dart Language Preferences

| Prefer | Over | Rationale |
|--------|------|-----------|
| `switch` expression | `if-else if` chain | Exhaustive, more concise |
| Pattern matching (`case InProgress(:final position)`) | `is` checks + casts | Combines check and destructuring |
| `final` local variables | `var` | Immutability by default |
| Named parameters | Positional parameters (>2 params) | Readability at call site |
| Records `(int, String)` for ad-hoc return types | Custom classes | Less boilerplate for internal plumbing |
| `extension type` for newtypes | Raw primitives | Type safety for SquareNumber, etc. |
| `sealed class` hierarchies | Enum + data | Variants can carry different data |
| `typedef` for function types | Inline function types | Reusability, readability |
| String interpolation `'$var'` | Concatenation `'a' + b` | Readability |
| Collection `if`/`for` | `addAll`/`map` + `toList` | Declarative, idiomatic |
| Single quotes `'text'` | Double quotes `"text"` | Dart convention |

```dart
// ✅ Pattern matching with destructuring
final description = switch (move) {
  SimpleMove(:final from, :final to) => '$from-$to',
  CaptureMove(:final from, :final to, :final captured) =>
      '$from×$to (${captured.length} captured)',
};

// ✅ Collection if/for
final widgets = [
  const HeaderWidget(),
  if (isThinking) const ThinkingIndicator(),
  for (final move in moveHistory) MoveListItem(move: move),
];

// ✅ Records for ad-hoc return types
(int score, Move bestMove) search(BoardPosition position, int depth) {
  // ...
  return (bestScore, bestMove);
}

// ✅ Extension type for type safety
extension type SquareNumber(int value) {
  bool get isValid => value >= 1 && value <= 50;
}
```

---

## 11. Widget Rules

- **No business logic in widgets.** Widgets read providers and render UI — nothing more.
- **Extract widgets at ~80 lines.** If `build()` exceeds ~80 lines, extract sub-widgets.
- **Use `ConsumerWidget`** for widgets that read Riverpod providers.
- **Use `StatelessWidget` with `const`** for pure UI components with no provider dependency.
- **Avoid `setState`** when Riverpod state is available. Use `StatefulWidget` only for
  animation controllers, focus nodes, and text editing controllers.
- **Always provide `Key`** via `super.key` in constructors.
- **Return type is `Widget`**, not `Container`, `Column`, etc.

```dart
// ✅ CORRECT: widget reads state, dispatches action, renders UI
class GameBoard extends ConsumerWidget {
  const GameBoard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final phase = ref.watch(gameProvider);
    return switch (phase) {
      NotStarted()   => const GameSetupPrompt(),
      InProgress(:final position, :final selectedSquare) => BoardGrid(
        position: position,
        selectedSquare: selectedSquare,
        onSquareTap: (square) =>
            ref.read(gameProvider.notifier).onSquareTap(square),
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
    if (legalMoves.isEmpty) { /* ... */ }
  }
}
```

---

## 12. Documentation Standards

### 12.1 Dartdoc on All Public APIs

Every public class, method, function, property, and enum must have a dartdoc comment:

```dart
/// Generates all legal moves for the given [player] from the current [position].
///
/// Implements FMJD International Draughts rules:
/// - Mandatory captures: if any capture is available, only captures are returned.
/// - Maximum capture rule: only the longest capture chains are legal.
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

### 12.2 Implementation Comments

Use `//` comments to explain non-obvious logic. Do not restate what the code does:

```dart
// ✅ CORRECT: explains WHY, not WHAT
// The maximum capture rule (FMJD §4.13): when multiple capture
// sequences are available, the player MUST choose the sequence
// that captures the maximum number of pieces.
final bestCaptures = captures.where((c) => c.capturedCount == maxCaptures);

// ❌ WRONG: useless restatement
// Filter captures by max count
final bestCaptures = captures.where((c) => c.capturedCount == maxCaptures);
```

### 12.3 Dartdoc Coverage Targets

| Code Area | Target |
|-----------|--------|
| Engine package public API | 100% |
| Provider public methods | 100% |
| Widget public constructors | 100% |
| Repository interfaces | 100% |
| Internal helper functions | Best effort (document non-obvious logic) |

---

## Quick Reference

```
File naming:        snake_case.dart
Class naming:       PascalCase
Variable naming:    camelCase
Private members:    _camelCase
Providers:          camelCaseProvider
Booleans:           isX, hasX, canX (affirmative only)

Engine package:     ZERO runtime dependencies (dart:typed_data, dart:math only)
App serialization:  freezed allowed for DTOs in data/ layer
Domain state:       Hand-written sealed classes (no freezed)

State management:   Riverpod (StateNotifier, Provider, FutureProvider)
Error handling:     Result<T> sealed class — not exceptions
Routing:            go_router
HTTP client:        Dio
Testing:            flutter_test + mocktail

Architecture:       features/{name}/{data,domain,presentation}/
Imports:            dart: → flutter: → third-party → package: → relative
Widgets:            No business logic, const constructors, extract at ~80 lines
```
