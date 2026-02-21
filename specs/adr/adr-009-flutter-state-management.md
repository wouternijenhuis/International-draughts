# ADR-009: Flutter State Management Architecture

## Status

Proposed — Amended 2026-02-21

## Date

2026-02-21

## Context

The Flutter migration of International Draughts requires a state management solution that can handle the complexity of the existing React/Zustand frontend. The current `game-store.ts` is a 1,087-line monolithic Zustand store — the single largest source file in the frontend — managing tightly coupled concerns:

| Concern | Estimated LoC | Complexity |
|---------|--------------|------------|
| Game phase state machine | ~200 | 5 phase transitions, guards against illegal states |
| Board state + move execution | ~250 | Position arrays, move validation via shared engine |
| AI scheduling + cancellation | ~150 | Generation-based cancellation, async Expert API calls, local compute |
| Clock management | ~100 | 100ms interval ticking, time expiry detection, pause/resume |
| Game persistence | ~150 | Dual strategy (guest → sessionStorage, user → localStorage + backend sync) |
| Learning mode | ~100 | Hint computation, move feedback evaluation, step validation |
| Settings/config | ~80 | Board theme, notation, legal moves display, animation speed |
| Serialization | ~60 | JSON serialize/deserialize for persistence |

Additionally, a 70-line `auth-store.ts` manages JWT authentication with Zustand's `persist` middleware.

### Specific Technical Challenges

1. **Timer-based side effects**: The clock ticks every 100ms via `setInterval`. In Flutter, this uses `Timer.periodic` combined with `WidgetsBindingObserver` lifecycle hooks and a `Stopwatch` for monotonic elapsed time. This avoids `TickerProvider` coupling inside notifiers while still pausing/resuming correctly when the app is backgrounded.

2. **AI scheduling with generation-based cancellation**: The current implementation uses a module-level `aiMoveGeneration` counter. When a new AI move is requested, the counter increments. When the AI completes, if the counter doesn't match, the result is discarded. This pattern needs a clean equivalent.

3. **Async API calls with error handling**: Expert AI requests (`POST /api/v1/ai/move`) and game persistence (fire-and-forget backend sync) require async state management with loading/error states and fallback logic.

4. **Complex phase transitions**: The game moves through `not-started → in-progress → {white-wins, black-wins, draw}` with sub-states (`isPaused`, `isAiThinking`, `selectedSquare`). Certain actions are only valid in certain phases (can't `resign` when `not-started`, can't `makeMove` when paused).

5. **Cross-concern dependencies**: AI scheduling depends on game phase, clock state, and config. Persistence depends on auth state (guest vs. registered) and game phase. These cross-cutting concerns must be expressible without circular dependencies.

### Decision Criteria

- **Decomposability**: Can the 1,087-line monolith be split into focused units?
- **Testability**: Can each unit be tested in isolation without mocking the entire state tree?
- **Side effect management**: How cleanly does the solution handle timers, isolate calls, and API requests?
- **Type safety**: Does the solution catch illegal state transitions at compile time?
- **Boilerplate**: How much ceremony per state unit?
- **Learning curve**: How accessible is the solution for developers coming from Zustand/React?
- **Ecosystem maturity**: Package stability, documentation quality, community support.

## Decision

### Use Riverpod as the primary state management solution, with a decomposed provider architecture.

The 1,087-line Zustand monolith will be decomposed into **8 focused Riverpod providers/notifiers** (6 game providers + 1 learning provider + 1 orchestration provider), each owning a single concern. Riverpod is chosen over BLoC and Provider based on the evaluation below.

### Provider Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     RIVERPOD PROVIDERS                          │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────────────────────────┐ │
│  │  authProvider     │  │  gameProvider (StateNotifier)        │ │
│  │  (StateNotifier)  │  │                                      │ │
│  │                   │  │  Phase state machine (sealed class)  │ │
│  │  user, token      │──│  Board position, turn, move history │ │
│  │  login/logout     │  │  startGame, makeMove, resign, draw  │ │
│  │  isAuthenticated  │  │  undoMove, redoMove, resetGame      │ │
│  └───────┬───────────┘  └──────┬───────────┬──────────────────┘ │
│          │                     │           │                    │
│  ┌───────▼───────────┐  ┌─────▼──────┐ ┌──▼─────────────────┐  │
│  │ settingsProvider   │  │ clockProv. │ │ aiProvider          │  │
│  │ (StateNotifier)    │  │ (Notifier) │ │ (StateNotifier)     │  │
│  │                    │  │            │ │                     │  │
│  │ boardTheme         │  │ clockState │ │ isThinking          │  │
│  │ showNotation       │  │ tick()     │ │ triggerAiMove()     │  │
│  │ showLegalMoves     │  │ switch()   │ │ cancelPending()     │  │
│  │ animationSpeed     │  │ pause()    │ │ generation counter  │  │
│  │ persist to prefs   │  │ resume()   │ │ Isolate management  │  │
│  └────────────────────┘  └────────────┘ └─────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────┐  ┌──────────────────────────────┐ │
│  │ gamePersistenceProvider   │  │ learningModeProvider         │ │
│  │ (service, not notifier)   │  │ (StateNotifier)              │ │
│  │                           │  │                              │ │
│  │ autoSave(state)           │  │ currentStep, hintSquares     │ │
│  │ loadSavedGame()           │  │ moveFeedback                 │ │
│  │ clearSavedGame()          │  │ validateGoal(), showHint()   │ │
│  │ guest vs user routing     │  │ nextStep(), prevStep()       │ │
│  └───────────────────────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Why Riverpod Over BLoC and Provider

| Criterion | Riverpod (chosen) | BLoC | Provider + ChangeNotifier |
|-----------|-------------------|------|---------------------------|
| **Decomposition** | Providers are naturally composable. `aiProvider` can `ref.watch(gameProvider)` to react to phase changes. Dependency graph is explicit and analyzable. | BLoC instances need explicit wiring. Cross-BLoC dependencies require `BlocListener` or manual injection. | ChangeNotifiers are independent; cross-dependency requires `ProxyProvider` which is fragile and verbose. |
| **Testability** | `ProviderContainer` overrides allow injecting mocks per-provider without affecting others. No widget tree needed for unit tests. | BLoC is highly testable (stream-based assertions via `bloc_test`). Comparable to Riverpod. | Testable but requires manual `ChangeNotifier` lifecycle management. No built-in test utilities. |
| **Side effects (timers, isolates)** | `ref.onDispose()` for cleanup. `AsyncNotifier` for API calls. Timer management in notifier lifecycle. Isolate calls via `compute()` within the AI notifier. | Side effects in `mapEventToState` or `on<Event>` handlers. `Stream.periodic` for clock. Clean but verbose — every side effect needs an event class + handler. | Side effects in `ChangeNotifier` methods. No lifecycle hooks for cleanup. Easy to leak timers. |
| **Type safety** | `StateNotifier<T>` enforces typed state. Sealed class for game phase makes illegal transitions unrepresentable. `ref.watch` is compile-time checked. | Strongly typed via `Bloc<Event, State>`. Sealed events + sealed states = excellent type safety. Slight edge over Riverpod here. | `ChangeNotifier` is untyped (`notifyListeners()` exposes all fields). No compile-time state transition checks. |
| **Boilerplate** | Moderate. One class per notifier + one `provider` declaration. No code generation required (though `riverpod_generator` is available). ~30–50 lines for a typical notifier. | Heavy. Every interaction requires: Event class, State class, BLoC class with `on<Event>` handler, `BlocProvider` in widget tree. A simple action like `togglePause` needs ~15 lines of event/state/handler boilerplate. | Minimal. ChangeNotifier with methods. But the minimal structure becomes a liability as complexity grows — no guardrails. |
| **AI cancellation pattern** | Generation counter in `AiNotifier` with `ref.onDispose()` for cleanup. `CancelableOperation` from `package:async` integrates naturally. | Cancellation via `EventTransformer` (e.g., `restartable()` from `bloc_concurrency`). Elegant for stream-based cancellation but adds another concept. | Manual cancellation tracking. No framework support. |
| **Clock integration** | Clock notifier with `Timer.periodic` + `WidgetsBindingObserver` + `Stopwatch`. `ref.watch(clockProvider)` in game widgets auto-rebuilds on tick. Clean reactive flow with explicit lifecycle handling. | Clock as a separate BLoC with `Timer.periodic` + lifecycle observer. `BlocBuilder<ClockBloc, ClockState>` for UI. Works but verbose. | Clock as ChangeNotifier with Timer. Must manually call `notifyListeners()` every 100ms. Works but no lifecycle safety. |
| **Learning curve (from Zustand)** | Moderate. Zustand's `create()` → Riverpod's `StateNotifier`. Zustand's selectors → `ref.watch(provider.select(...))`. Conceptual model is similar: atomic state units with actions. | Steep. Event-driven paradigm is fundamentally different from Zustand's direct mutation model. Team must learn: events, states, transitions, transformers. | Low. ChangeNotifier is the simplest model. But the simplicity breaks down at game-store complexity. |
| **Ecosystem** | 10K+ GitHub stars, strong documentation, maintained by Remi Rousselet (also created Provider). Used by major Flutter apps. | 11K+ GitHub stars, excellent documentation and tooling (VSCode extension, CLI). Used by very large apps (banking, enterprise). | Built into Flutter SDK. Universal adoption but declining for complex apps in favor of Riverpod/BLoC. |

### Game Phase as Sealed Class

Model the game phase as a sealed class hierarchy to make illegal state transitions compile-time errors:

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
  final List<int> lastMoveSquares;
  final bool isPaused;

  const InProgress({
    required this.position,
    required this.currentTurn,
    required this.moveHistory,
    required this.moveIndex,
    this.selectedSquare,
    this.legalMoveSquares = const [],
    this.lastMoveSquares = const [],
    this.isPaused = false,
  });

  InProgress copyWith({...});
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

With this design, calling `makeMove()` when the phase is `NotStarted` is structurally impossible — the `InProgress` state data (position, turn) simply doesn't exist in the `NotStarted` type. Widgets use exhaustive `switch` on the phase:

```dart
switch (ref.watch(gameProvider)) {
  case NotStarted():
    return GameSetupPrompt();
  case InProgress(:final position, :final currentTurn):
    return GameBoard(position: position, turn: currentTurn);
  case GameOver(:final result):
    return GameOverScreen(result: result);
}
```

### Clock Management with Timer.periodic and Stopwatch

> **Amendment (2026-02-21):** The original version used `TickerProviderMixin`, which requires
> a `StatefulWidget`'s `State` object and cannot be mixed into a `StateNotifier`. The corrected
> implementation below uses `Timer.periodic` for the tick, `Stopwatch` for monotonic elapsed-time
> measurement, and `WidgetsBindingObserver` for app lifecycle pause/resume.

```dart
class ClockNotifier extends StateNotifier<ClockState?>
    with WidgetsBindingObserver {
  Timer? _timer;
  final Stopwatch _stopwatch = Stopwatch();

  ClockNotifier() : super(null) {
    WidgetsBinding.instance.addObserver(this);
  }

  void start(ClockState initial) {
    state = initial;
    _stopwatch.reset();
    _stopwatch.start();
    _timer = Timer.periodic(
      const Duration(milliseconds: 100),
      (_) => _onTick(),
    );
  }

  void _onTick() {
    if (state == null) return;
    state = tickClock(state!, _stopwatch.elapsedMilliseconds);
    if (isTimeExpired(state!, state!.activePlayer)) {
      _timer?.cancel();
      _stopwatch.stop();
      // Notify game provider of time expiry
    }
  }

  void pause() {
    _timer?.cancel();
    _stopwatch.stop();
  }

  void resume() {
    _stopwatch.start();
    _timer = Timer.periodic(
      const Duration(milliseconds: 100),
      (_) => _onTick(),
    );
  }

  /// Pauses the clock when the app is backgrounded; resumes when foregrounded.
  @override
  void didChangeAppLifecycleState(AppLifecycleState lifecycleState) {
    if (state == null) return;
    if (lifecycleState == AppLifecycleState.paused) {
      pause();
    } else if (lifecycleState == AppLifecycleState.resumed) {
      resume();
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _stopwatch.stop();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }
}
```

`Timer.periodic` drives the 100 ms tick. `Stopwatch` provides monotonic elapsed time
so that clock calculations are not affected by wall-clock adjustments.
`WidgetsBindingObserver.didChangeAppLifecycleState` pauses the timer when the app is
backgrounded, preventing battery drain and incorrect time calculations when the user
switches away from the app.

### AI Cancellation with Generation Counter

Port the existing generation counter pattern directly, as recommended by the DevLead review (§4.3, Option B):

```dart
class AiNotifier extends StateNotifier<AiState> {
  int _aiGeneration = 0;

  AiNotifier(this._ref) : super(const AiState(isThinking: false));

  Future<void> triggerAiMove(BoardPosition position, PlayerColor player, DifficultyConfig config) async {
    state = state.copyWith(isThinking: true);
    final gen = ++_aiGeneration;

    try {
      final move = await compute(findBestMove, AiParams(position, player, config));
      if (gen != _aiGeneration) return; // Stale — discarded
      if (move != null) {
        _ref.read(gameProvider.notifier).executeMove(move);
      }
    } catch (e) {
      if (gen != _aiGeneration) return;
      // Handle error
    } finally {
      if (gen == _aiGeneration) {
        state = state.copyWith(isThinking: false);
      }
    }
  }

  void cancel() {
    _aiGeneration++;
    state = state.copyWith(isThinking: false);
  }
}
```

### Settings Persistence

The `SettingsNotifier` uses `SharedPreferences` (not Riverpod `persist` — which doesn't exist natively) with manual load/save:

```dart
class SettingsNotifier extends StateNotifier<SettingsState> {
  SettingsNotifier() : super(SettingsState.defaults()) {
    _loadFromPrefs();
  }

  Future<void> _loadFromPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    state = SettingsState(
      boardTheme: prefs.getString('boardTheme') ?? 'classic-wood',
      showNotation: prefs.getBool('showNotation') ?? true,
      showLegalMoves: prefs.getBool('showLegalMoves') ?? true,
      animationSpeed: prefs.getString('animationSpeed') ?? 'normal',
    );
  }

  Future<void> setBoardTheme(String theme) async {
    state = state.copyWith(boardTheme: theme);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('boardTheme', theme);
  }
  // ... similar for other settings
}
```

## Consequences

### Positive

- **Monolith eliminated.** The 1,087-line store is split into 8 focused units (6 game providers + 1 learning provider + 1 orchestration provider), each under 200 lines. Each unit has a single responsibility and is independently testable.
- **Compile-time phase safety.** The sealed class hierarchy for `GamePhase` makes illegal state transitions (e.g., `makeMove` in `NotStarted`) structurally impossible. The TypeScript version relies on runtime guards (`if (phase !== 'in-progress') return`); the Dart version catches these at compile time.
- **Clean timer lifecycle.** `Timer.periodic` + `WidgetsBindingObserver` + `Stopwatch` in the clock notifier ensures the clock pauses/resumes correctly when the app is backgrounded — a critical correctness requirement for mobile that the web version doesn't need to handle.
- **Reactive dependency graph.** `ref.watch` makes cross-provider dependencies explicit and automatically triggers rebuilds. When the game phase changes, the AI notifier and clock notifier react automatically without manual event wiring.
- **Testable in isolation.** Each notifier can be tested with `ProviderContainer` overrides. Clock tests don't need to set up the full game state. AI tests can mock the game provider.
- **Familiar for Zustand developers.** Riverpod's `StateNotifier` + immutable state model is conceptually close to Zustand's `create()` + immutable state pattern, easing the learning curve.

### Negative

- **8 providers to coordinate.** The decomposition introduces inter-provider communication that the monolith handled implicitly. Game completion requires the game notifier to stop the clock, cancel AI, trigger persistence, and update learning mode feedback. This coordination logic must be carefully designed to avoid cascading update issues.
  - **Mitigation:** Create a `GameCoordinator` class (not a provider) that orchestrates cross-cutting actions like `onGameOver()`, injected into providers that need it. Alternatively, use Riverpod's `ref.listen` for reactive coordination.
- **More files to navigate.** 6 provider files + state classes + a coordinator vs. 1 Zustand store file. Developers must understand the provider graph layout.
  - **Mitigation:** Clear directory structure (`lib/providers/`) with a README documenting the provider dependency graph.
- **Riverpod learning curve.** Developers unfamiliar with Riverpod need to learn `ref.watch` vs `ref.read` vs `ref.listen`, `StateNotifier` vs `AsyncNotifier`, `ProviderScope`, and override patterns. Estimated: 2–3 days of ramp-up.
  - **Mitigation:** Provide annotated code examples for each provider pattern used in the project. The Riverpod documentation is excellent.
- **No built-in persistence middleware.** Unlike Zustand's `persist`, Riverpod has no native persistence middleware. Persistence must be implemented manually per notifier.
  - **Mitigation:** The manual approach (as shown for `SettingsNotifier`) is ~10 lines per notifier and avoids the hydration mismatch issues that Zustand persist can cause.

## Alternatives Considered

### Alternative 1: BLoC (Business Logic Component)

BLoC's event-driven architecture is a strong fit for the game's state machine nature — events map cleanly to game actions:

```dart
sealed class GameEvent {}
class StartGame extends GameEvent { ... }
class MakeMove extends GameEvent { ... }
class Resign extends GameEvent { ... }
```

**Rejected because:**
- Boilerplate overhead is 2–3× Riverpod for the same functionality. Every user action requires an event class, a state class change, and an `on<Event>` handler. With 17 game store actions, this means 17 event classes — significant ceremony.
- The team is moving from Zustand (direct method calls) to Flutter. BLoC's event-driven paradigm is a larger conceptual leap than Riverpod's method-call model. This increases ramp-up time and the risk of subtle bugs during the migration.
- BLoC's stream-based cancellation (`restartable`, `droppable` transformers) is elegant for the AI cancellation use case, but introduces yet another concept (event transformers) for a problem that the generation counter solves in 5 lines.
- BLoC would be a defensible choice for a team already familiar with it. For this project, the additional ceremony doesn't pay for itself.

### Alternative 2: Provider + ChangeNotifier

The simplest option — `ChangeNotifier` subclasses registered via the `provider` package.

**Rejected because:**
- `ChangeNotifier` has no typed state management. `notifyListeners()` triggers all listeners regardless of which field changed. For the game store with rapid clock ticks (10/second), this would cause unnecessary widget rebuilds across the entire game UI.
- No lifecycle hooks comparable to `ref.onDispose()`. Timer cleanup requires manual `dispose()` override, and there's no framework enforcement that `dispose()` is called.
- `ProxyProvider` for cross-provider dependencies is fragile and verbose. The game coordinator pattern requires `ProxyProvider4<Game, Clock, AI, Persistence, Coordinator>` — unwieldy.
- Suitable for the settings and auth stores (simple state), but inadequate for the game store complexity. Using Provider for simple stores and Riverpod for complex ones creates inconsistency. Riverpod handles both simple and complex cases well, so it should be used for all providers.

### Alternative 3: Port as a Single Riverpod Notifier (No Decomposition)

Port the Zustand monolith as-is into a single `GameNotifier` with a single `GameState` class.

**Rejected because:**
- A 1,087-line notifier in Dart would be even harder to maintain than the TypeScript version, because Dart's class syntax is more verbose than Zustand's functional style.
- Testing requires constructing the entire game state for every test case. A clock tick test shouldn't need to set up AI config, learning mode state, and persistence targets.
- The DevLead review (§4.1) explicitly recommends decomposition into 5–6 focused providers. The monolith is identified as the "#1 architecture risk."
- The migration is the ideal time to fix this architectural debt. Porting the monolith as-is defers the problem to a worse time (post-migration, when the team is less focused on architecture).

## Related

- [Flutter Migration Analysis — §4 State Management](../migration/flutter-migration-analysis.md) — Full inventory of current Zustand state shape, actions, and persistence patterns
- [Flutter Migration PRD Review — §4 State Management Deep Dive](../migration/flutter-migration-prd-review.md) — DevLead decomposition recommendation, timer patterns, AI cancellation patterns
- [Flutter Migration PRD — §10 Q3](../migration/flutter-migration-prd.md) — Open question on state management choice
- [ADR-008: Game Setup Dialog](adr-008-game-setup-dialog.md) — Establishes local state pattern for dialogs (consistent with Riverpod for global state, local state for UI concerns)
- Source: [frontend/src/stores/game-store.ts](../../frontend/src/stores/game-store.ts) — 1,087-line Zustand store to be decomposed
- Source: [frontend/src/stores/auth-store.ts](../../frontend/src/stores/auth-store.ts) — 70-line auth store to be ported
