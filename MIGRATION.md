# Migration Guide: C++ to .NET 9

This document describes the migration from the original C++ Scan 3.1 engine to the .NET 9 implementation.

## Overview

The migration follows Clean Architecture principles and converts the ~9,300 lines of C++ code into a structured, maintainable .NET solution.

## Architecture Mapping

### Original C++ Structure
```
src/
  *.cpp, *.hpp files (monolithic structure)
  - main.cpp (entry point)
  - pos.hpp/cpp (position)
  - move.hpp/cpp (move logic)
  - game.hpp/cpp (game state)
  - search.hpp/cpp (AI search)
  - eval.hpp/cpp (evaluation)
  - gen.hpp/cpp (move generation)
  - book.hpp/cpp (opening book)
  - bb_*.hpp/cpp (bitbase)
  - dxp.hpp/cpp (DXP protocol)
  - hub.hpp/cpp (Hub protocol)
```

### New .NET 9 Structure
```
International.Draughts.Domain/
  - Core business entities (Position, Game, Move, Square, Bitboard)
  - No external dependencies
  
International.Draughts.Application/
  - Use cases (GameService)
  - Interfaces (ISearchEngine, IMoveGenerator, IGameService)
  - Depends only on Domain
  
International.Draughts.Infrastructure/
  - Concrete implementations
  - Move generation (from gen.cpp)
  - Search engine (from search.cpp)
  - Configuration
  
International.Draughts.Console/
  - User interface (from main.cpp Terminal class)
  - Dependency injection setup
  - Application entry point
```

## Type Mappings

### C++ → C#

| C++ Type | .NET Type | Notes |
|----------|-----------|-------|
| `uint64` | `ulong` | 64-bit unsigned integer |
| `int64` | `long` | 64-bit signed integer |
| `enum Side : int` | `enum Side` | Strong-typed enum |
| `enum class Move : uint64` | `readonly struct Move` | Value type with equality |
| `class Bit` | `readonly struct Bitboard` | Immutable bitboard |
| `Square` (enum) | `readonly struct Square` | Value type |
| `std::string` | `string` | .NET string |
| `std::array<T, N>` | `T[]` or `List<T>` | Arrays or collections |
| `Pos` (immutable) | `class Position` | Immutable position |
| `Game` | `class Game` | Mutable game state |

## Key Differences

### 1. Memory Management
- **C++**: Manual memory management, RAII
- **.NET**: Garbage collection, no manual cleanup needed

### 2. Mutability
- **C++**: `const` for immutability
- **.NET**: `readonly` structs, immutable classes, `init` properties

### 3. Namespaces
- **C++**: `namespace xxx { ... }`
- **.NET**: File-scoped namespaces: `namespace International.Draughts.Domain;`

### 4. Generics vs Templates
- **C++**: Templates with duck typing
- **.NET**: Generics with constraints

### 5. Bitboard Operations
- **C++**: Custom Bit class with operators
- **.NET**: `Bitboard` struct using `System.Numerics.BitOperations`

## Implementation Status

### ✅ Completed

1. **Domain Layer**
   - Position class (from pos.hpp/cpp)
   - Game class (from game.hpp/cpp)
   - Move value object (from move.hpp/cpp)
   - Square value object (from common.hpp/cpp)
   - Bitboard value object (from bit.hpp/cpp)
   - Enumerations (Side, Piece, Variant)

2. **Application Layer**
   - Service interfaces
   - GameService use case

3. **Infrastructure Layer**
   - Configuration (from scan.ini logic)
   - Placeholder implementations

4. **Console Layer**
   - Terminal interface (from main.cpp Terminal class)
   - Command processing
   - Dependency injection

5. **Infrastructure Layer - Core Implementations**
   - Move generation (from gen.cpp)
   - Search engine with alpha-beta (from search.cpp)
   - Basic evaluation function

### ✅ **Core Functionality Complete!**

The engine is now fully functional with the following ported from C++:

1. **Move Generation** (gen.hpp/cpp, ~800 lines) ✅ COMPLETE
   - ✅ Legal move generation for men
   - ✅ Legal move generation for kings  
   - ✅ Capture logic with multi-jumps
   - ✅ Promotion detection
   - ✅ Mandatory capture enforcement

2. **Search Algorithm** (search.hpp/cpp) ✅ CORE COMPLETE
   - ✅ Alpha-beta pruning
   - ✅ Iterative deepening
   - ✅ Time management
   - ✅ Basic evaluation (material + advancement)
   - 🚧 Transposition table (not yet ported)
   - 🚧 Advanced move ordering (not yet ported)
   - 🚧 Quiescence search (not yet ported)

3. **Position Management** (pos.hpp/cpp) ✅ COMPLETE
   - ✅ Move execution
   - ✅ State updates
   - ✅ Promotion handling

### 🚧 Advanced Features To Be Implemented

The following components remain for future enhancement (~3,000 LOC):

1. **Advanced Evaluation** (eval.hpp/cpp, ~600 lines)
   - Pattern recognition
   - Sophisticated position assessment
   - Endgame-specific evaluation

2. **Opening Book** (book.hpp/cpp, ~400 lines)
   - Book file loading
   - Move selection from book
   - Book randomness

3. **Endgame Bitbases** (bb_*.hpp/cpp, ~2000 lines)
   - Bitbase loading
   - Perfect play in endgames

4. **DXP Protocol** (dxp.hpp/cpp, ~800 lines)
   - Network communication
   - DXP message handling

5. **Hub Protocol** (hub.hpp/cpp, ~600 lines)
   - Hub GUI communication

6. **Utilities**
   - Hash table (hash.hpp/cpp)
   - Sorting (sort.hpp/cpp)
   - Threading (thread.hpp/cpp)
   - FEN notation (fen.hpp/cpp)

## Migration Guidelines

### For Move Generation

1. Port the `gen.cpp` functions to `MoveGenerator` class
2. Use `Bitboard` operations instead of raw `uint64`
3. Replace macros with proper methods
4. Add unit tests for each move type

### For Search Algorithm

1. Port `search.cpp` to `SearchEngine` class
2. Use `CancellationToken` for search interruption
3. Use `Task` for parallel search
4. Implement `ISearchEngine` interface

### For Evaluation

1. Port `eval.cpp` to `Evaluator` class
2. Load weights from configuration or files
3. Use span/array for pattern tables

## Performance Considerations

### C++ Optimizations to Port

1. **Bitboard Operations**: Use `System.Numerics.BitOperations.PopCount`
2. **Lookup Tables**: Pre-compute and cache in static fields
3. **Stack Allocation**: Use `Span<T>` and `stackalloc` for small arrays
4. **Inlining**: Use `[MethodImpl(MethodImplOptions.AggressiveInlining)]`
5. **SIMD**: Use `System.Runtime.Intrinsics` for vectorization where applicable

### .NET 9 Features to Use

1. **Collection expressions**: `[1, 2, 3]`
2. **Primary constructors**: For simple classes
3. **Init-only properties**: For immutable data
4. **Records**: For simple value types
5. **Pattern matching**: For cleaner conditionals

## Testing Strategy

1. **Unit Tests**: Test each component in isolation
2. **Integration Tests**: Test component interactions
3. **Performance Tests**: Compare with C++ version
4. **Game Tests**: Play known positions and verify results

## Building and Running

### Build
```bash
dotnet build
```

### Run
```bash
dotnet run --project src/International.Draughts.Console
```

### Test
```bash
dotnet test
```

## Next Steps

1. Implement move generation with tests
2. Implement basic search algorithm
3. Add evaluation function
4. Optimize performance
5. Add remaining features (book, bitbases, protocols)
6. Achieve parity with C++ version

## Resources

- Original C++ code: `src/*.cpp` and `src/*.hpp`
- Original documentation: `readme.txt`, `protocol.txt`
- Clean Architecture: https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html
- .NET Performance: https://learn.microsoft.com/en-us/dotnet/core/performance/
