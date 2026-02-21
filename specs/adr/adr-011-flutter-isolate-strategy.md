# ADR-011: Flutter Isolate Strategy for AI Engine

## Status

Proposed

## Date

2026-02-21

## Context

The draughts AI engine performs CPU-intensive alpha-beta search with iterative deepening. On the current web frontend, this runs on the main JavaScript thread — acceptable in browsers where the event loop is more forgiving, but **not acceptable on Flutter mobile** where blocking the main isolate for even 100ms causes visible jank (dropped frames, unresponsive gestures).

### Performance Characteristics

| Difficulty | Search Depth | Typical Duration | Main Thread Impact |
|-----------|-------------|-----------------|-------------------|
| Easy | 1–3 ply | < 500ms | Tolerable (1–2 dropped frames) |
| Medium | 4–6 ply | 200ms–1s | **Jank** — noticeable stutter |
| Hard | 6–10 ply | 500ms–2s | **Severe jank** — UI freezes |
| Expert | Server-side | N/A (network) | No local compute |

At Hard difficulty with iterative deepening, the engine evaluates tens of thousands of positions. Each evaluation involves array traversal (51-element `BoardPosition`), move generation, and recursive search. This **must** run off the main isolate.

### Transposition Table Challenge

The AI uses a `TranspositionTable` — a 4 MB `ArrayBuffer` (JavaScript) / `ByteData` (Dart) that caches evaluated positions to avoid redundant computation. This table is the primary performance optimization: without it, Hard difficulty would take 5–10× longer.

In the TypeScript version, the TT is a module-level singleton shared across all `findBestMove()` calls. Positions cached from move 5 may accelerate the search at move 6. This amortization is critical for acceptable AI response times.

**The Dart Isolate memory model breaks this pattern.** Dart isolates have separate memory heaps. A `ByteData` allocated in one isolate cannot be accessed from another. The TT must either:

1. Be **recreated** in each isolate invocation (losing the cache between moves)
2. Be **transferred** between isolates using `TransferableTypedData` (complex but preserves cache)
3. Live in **shared memory** via `dart:ffi` (fragile, platform-specific)
4. Live in a **persistent background isolate** that stays alive across moves

### Flutter Web Consideration

If Flutter Web is supported (see ADR-013), the isolate strategy must also work in the browser. Dart isolates compile to **Web Workers** on Flutter Web. Web Workers have the same memory isolation as Dart isolates, so the chosen strategy must work for both targets. However, `compute()` is supported on all platforms including web.

### Decision Criteria

- **Cache preservation**: Can the TT persist across moves for amortized performance?
- **Communication overhead**: How much time is spent serializing/transferring data vs. actual computation?
- **Memory efficiency**: Avoid duplicating the 4 MB TT unnecessarily.
- **API simplicity**: How complex is the calling code?
- **Web compatibility**: Does it work on Flutter Web (Web Workers)?
- **Cancellation support**: Can in-progress searches be abandoned when the user makes a new move?

## Decision

### Use `Isolate.run()` with TransferableTypedData for TT transfer across invocations.

The AI engine runs on a background isolate via `Isolate.run()` (Dart 2.19+, a cleaner API than raw `Isolate.spawn()`). The transposition table is **transferred** (zero-copy) to the isolate at the start of each computation and **transferred back** when the computation completes. This preserves the TT cache across moves without copying the 4 MB buffer.

### Architecture

```
Main Isolate                          Background Isolate (per move)
─────────────                         ───────────────────────────
                                      
  AiService                           
  ├── _ttBuffer: Uint8List? ◄─────── (transferred back after compute)
  │                                   
  │   triggerAiMove()                 
  │   ├── Transfer _ttBuffer ────────► receive ttBuffer
  │   │   (zero-copy via             │  
  │   │    TransferableTypedData)     │  Create TranspositionTable from buffer
  │   │                               │  Run findBestMove()
  │   │                               │  Transfer ttBuffer + result back
  │   ◄──────────────────────────────── (zero-copy return)
  │   _ttBuffer = returned buffer     
  │   return result                   
```

### Implementation

```dart
class AiService {
  /// Transposition table buffer, transferred to/from isolates.
  /// Null before first use and during computation (owned by isolate).
  Uint8List? _ttBuffer;

  /// Size of the transposition table in megabytes.
  static const int _ttSizeMb = 4;

  int _generation = 0;

  /// Request an AI move. Returns null if cancelled or no legal moves.
  Future<SearchResult?> findBestMove({
    required BoardPosition position,
    required PlayerColor player,
    required DifficultyConfig config,
  }) async {
    final gen = ++_generation;

    // Take ownership of the TT buffer (or create a new one)
    final ttBuffer = _ttBuffer ?? Uint8List(_ttSizeMb * 1024 * 1024);
    _ttBuffer = null; // Ownership transferred

    final params = AiParams(
      position: position,
      player: player,
      config: config,
      ttBuffer: ttBuffer,
    );

    try {
      final result = await Isolate.run(() => _computeInIsolate(params));

      // Check if this computation is still relevant
      if (gen != _generation) {
        // Stale result — but still reclaim the TT buffer
        _ttBuffer = result.ttBuffer;
        return null;
      }

      // Reclaim the TT buffer for the next invocation
      _ttBuffer = result.ttBuffer;
      return result.searchResult;
    } catch (e) {
      // On error, allocate a fresh TT buffer (the old one is lost)
      _ttBuffer = Uint8List(_ttSizeMb * 1024 * 1024);
      if (gen != _generation) return null;
      rethrow;
    }
  }

  void cancel() {
    _generation++;
  }

  /// Runs inside the background isolate.
  static AiResult _computeInIsolate(AiParams params) {
    final tt = TranspositionTable.fromBuffer(params.ttBuffer);
    final result = searchBestMove(
      position: params.position,
      player: params.player,
      config: params.config,
      transpositionTable: tt,
    );
    return AiResult(
      searchResult: result,
      ttBuffer: tt.buffer, // Return the (potentially modified) buffer
    );
  }
}
```

### Data Transfer Design

`AiParams` and `AiResult` must be serializable for isolate communication. Since `Isolate.run()` uses `SendPort`/`ReceivePort` under the hood, all data must be sendable across isolate boundaries:

```dart
class AiParams {
  final List<int?> position;  // BoardPosition as primitive list
  final int player;           // PlayerColor as int
  final int maxDepth;
  final double noiseLevel;
  final double blunderProbability;
  final Uint8List ttBuffer;   // Transferred, not copied

  AiParams({...});
}

class AiResult {
  final SearchResult? searchResult;
  final Uint8List ttBuffer;   // Transferred back

  AiResult({required this.searchResult, required this.ttBuffer});
}
```

**Key design decision:** Pass **primitive types** across the isolate boundary (lists of ints, not custom objects with methods). The isolate reconstructs domain objects internally. This avoids serialization overhead and ensures compatibility with `Isolate.run()`.

### TransferableTypedData for Zero-Copy Transfer

For the 4 MB TT buffer, `TransferableTypedData` ensures zero-copy transfer:

```dart
// In the parent isolate, explicitly using ports for transfer:
final response = ReceivePort();
final ttTransferable = TransferableTypedData.fromList([params.ttBuffer]);

await Isolate.spawn(
  _computeEntry,
  _IsolateMessage(response.sendPort, params, ttTransferable),
);

// In the spawned isolate:
final ttBytes = message.ttTransferable.materialize().asUint8List();
```

**Note:** `Isolate.run()` handles `TransferableTypedData` automatically for `Uint8List` return values in Dart 3.x. The `Uint8List` in `AiResult.ttBuffer` is transferred (not copied) when returned from the isolate closure. If profiling reveals copies occurring, fall back to explicit `Isolate.spawn()` with `TransferableTypedData`.

### Cancellation Strategy

Cancellation uses the generation counter pattern (consistent with ADR-009):

1. User makes a move or starts a new game → `AiService.cancel()` increments `_generation`
2. When the isolate returns, the generation is checked. If stale, the result is discarded
3. The isolate itself is **not** killed mid-computation — it runs to completion. This is intentional:
   - Killing isolates mid-computation would lose the TT buffer
   - Hard difficulty completes in < 2 seconds — not worth the complexity of mid-search cancellation
   - The result is simply discarded if stale

**Edge case:** If the user makes moves rapidly (faster than AI response), multiple isolates may run simultaneously. Only the latest generation's result is used. Previous isolate results are discarded but their TT buffers are lost. This is acceptable — the TT warms up quickly (2–3 moves) and rapid user moves imply Easy/Medium difficulty where the TT matters less.

### Flutter Web (Web Worker) Compatibility

`Isolate.run()` compiles to Web Workers on Flutter Web. The key limitations:

- `TransferableTypedData` maps to `Transferable` in the JavaScript worker API — zero-copy transfer is supported
- `Uint8List` transferred to a worker becomes `ArrayBuffer` on the JS side — compatible
- Web Workers have the same memory isolation model as Dart isolates

The chosen approach works on Flutter Web without modification. If Flutter Web is dropped (per ADR-013), this is a non-concern, but the design imposes no Web-incompatible constraints.

### Zobrist Table Initialization

The Zobrist hash table (used by the TT for position hashing) is deterministic from a fixed seed. It will be **re-initialized** in each isolate invocation. This takes < 1ms and is negligible compared to the search itself. No transfer needed.

The KillerMoves table is per-search (reset at the start of each `findBestMove` call) and is created fresh inside the isolate. No transfer needed.

## Consequences

### Positive

- **Zero UI jank.** All AI computation runs off the main isolate. The UI thread stays free for animations, gestures, and clock ticking even during Hard difficulty search (up to 2 seconds of computation).
- **TT cache preservation.** The transposition table survives across moves via zero-copy transfer, maintaining the amortized performance benefit of cached positions. Hard difficulty response times remain consistent with the TypeScript version.
- **Simple API.** `AiService.findBestMove()` is an async method — callers don't need to know about isolates, ports, or transfers. The Riverpod `AiNotifier` (ADR-009) calls it like any other async operation.
- **Web compatible.** The design works on Flutter Web via Web Workers without platform-specific code paths.
- **Memory efficient.** Only one 4 MB TT buffer exists at a time (it's transferred, not copied). Peak memory usage for AI is ~5 MB (TT + search stack + move generation).

### Negative

- **TT buffer lost on error.** If the isolate throws an exception, the TT buffer is not returned. A fresh buffer must be allocated. The TT warms up in 2–3 moves, so this is a minor performance regression on error.
  - **Mitigation:** Wrap isolate computation in try/catch inside the isolate to prevent unhandled exceptions. Only platform-level crashes (out of memory) lose the buffer.
- **No mid-search cancellation.** The isolate runs to completion even if cancelled. At Hard difficulty, this means up to 2 seconds of wasted computation. This is acceptable — the computation cost is CPU-only (no I/O) and completes quickly.
  - **Mitigation:** If future profiling shows wasted computation is a problem, add a `shouldCancel` flag via `ReceivePort` that the search checks periodically. This is an optimization, not required for launch.
- **Serialization overhead.** Board position (51 ints) and config (5 primitive fields) are serialized/deserialized for each isolate invocation. This adds ~0.1ms — negligible compared to search time.
- **One isolate per move.** A new isolate is created for each AI move. Isolate creation takes ~2–5ms on mobile. This is negligible for a single invocation but means no persistent isolate maintaining warm JIT caches.
  - **Mitigation:** Dart AOT (release builds) eliminates JIT concerns. The 2–5ms creation overhead is imperceptible to users.

## Alternatives Considered

### Alternative 1: `compute()` (Simple Top-Level Function)

```dart
final result = await compute(findBestMove, params);
```

Dart's `compute()` is the simplest isolate API — it runs a top-level function in a background isolate and returns the result.

**Rejected because:**
- `compute()` does **not** support `TransferableTypedData`. The TT buffer would be **copied** (4 MB per move), not transferred. On mid-range Android devices, this 4 MB copy takes ~5–10ms — tolerable but wasteful.
- More critically, `compute()` cannot return the TT buffer back to the caller efficiently. The return value is also copied. This means 8 MB of copies per AI move (4 MB in, 4 MB out).
- `compute()` doesn't support sending messages to a running isolate, foreclosing future mid-search cancellation.
- For Easy/Medium difficulty where the TT is less important, `compute()` would work fine. But inconsistency between difficulty levels adds complexity.

**Note:** If profiling shows that the TT cache provides negligible benefit (positions rarely repeat between moves), `compute()` with a fresh TT per invocation becomes viable. This should be benchmarked during Phase 1.

### Alternative 2: Persistent Background Isolate

Keep a single long-lived isolate that persists across the app lifecycle. The TT lives permanently in the background isolate. The main isolate sends computation requests via `SendPort` and receives results.

```dart
class AiIsolatePool {
  late final Isolate _isolate;
  late final SendPort _sendPort;

  Future<void> init() async {
    final receivePort = ReceivePort();
    _isolate = await Isolate.spawn(_workerEntry, receivePort.sendPort);
    _sendPort = await receivePort.first;
  }

  Future<SearchResult?> findBestMove(AiParams params) async {
    final responsePort = ReceivePort();
    _sendPort.send(_Request(params, responsePort.sendPort));
    return await responsePort.first;
  }
}
```

**Rejected because:**
- Significantly more complex. Requires managing isolate lifecycle (creation, error handling, restart on crash), a message protocol (request/response with correlation IDs), and graceful shutdown.
- The isolate must be initialized on app start and kept alive — consuming memory even when no AI computation is happening.
- Flutter Web support for persistent isolates (workers) requires `dart:html` `Worker` API usage, which differs from `dart:isolate`. The `Isolate.run()` approach abstracts this difference.
- The benefit (avoiding isolate creation overhead) saves ~3ms per move — imperceptible vs. the 200ms–2s search time.
- This approach would be justified if AI calls were frequent (e.g., real-time evaluation during drag) or if the TT were much larger. For this use case, the simpler `Isolate.run()` + transfer approach is sufficient.

### Alternative 3: `dart:ffi` Shared Memory

Use C FFI to allocate shared memory accessible from both isolates, placing the TT in a `malloc`-backed buffer visible to all isolates.

**Rejected because:**
- Introduces native code compilation complexity (CMakeLists.txt for Android, Podspec for iOS).
- `dart:ffi` is not supported on Flutter Web — breaks web compatibility.
- Shared memory requires manual synchronization (mutexes) to prevent race conditions. The AI search is single-threaded per invocation, but the main isolate must not read the TT while the worker is writing.
- Fragile and platform-specific. Different behavior on iOS (no JIT) vs. Android vs. Web.
- Massive overkill for a 4 MB buffer that transfers in < 1ms via `TransferableTypedData`.

### Alternative 4: Fresh TT Per Invocation (No Transfer)

Create a new `TranspositionTable` inside each isolate invocation. Don't transfer or preserve the TT.

```dart
final result = await compute((params) {
  final tt = TranspositionTable(sizeMb: 4); // Fresh, empty
  return searchBestMove(params, tt);
}, params);
```

**Considered as a fallback if transfer proves unreliable:** The performance impact depends on how often positions repeat between consecutive moves. In the TypeScript version, TT hit rates of 15–30% are typical in mid-game. Losing these hits increases Hard difficulty response time by an estimated 20–40%.

**Not chosen as the primary approach because** the transfer mechanism is well-supported in Dart and avoids this performance regression. However, this is a viable fallback if the transfer approach proves problematic in practice — the API is simpler and the performance impact may be acceptable.

## Related

- [Flutter Migration PRD Review — §1.1 AI Search TT Risk](../migration/flutter-migration-prd-review.md) — Identification of TT Isolate transfer as a key risk
- [Flutter Migration PRD Review — §3.3 ArrayBuffer/DataView → ByteData](../migration/flutter-migration-prd-review.md) — Dart equivalent for TT implementation
- [Flutter Migration PRD Review — §3.6 Module-Level State → Isolate-Safe Patterns](../migration/flutter-migration-prd-review.md) — Zobrist table and KillerMoves isolation
- [Flutter Migration Analysis — §7.2 AI Module](../migration/flutter-migration-analysis.md) — Shared engine AI module structure
- [ADR-009: Flutter State Management](adr-009-flutter-state-management.md) — AI notifier consuming AiService, generation counter cancellation pattern
- [ADR-006: Enhanced Client-Side AI Architecture](adr-006-enhanced-client-ai.md) — Current AI difficulty configs and search parameters
- Source: [shared/draughts-engine/src/ai/search.ts](../../shared/draughts-engine/src/ai/search.ts) — TypeScript AI search to be ported
- Source: [shared/draughts-engine/src/ai/transposition-table.ts](../../shared/draughts-engine/src/ai/transposition-table.ts) — TypeScript TT using ArrayBuffer/DataView
