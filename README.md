# International Draughts Engine - .NET 9 Edition

This is a .NET 9 port of the Scan International Draughts engine, converted from C++ to C# using Clean Architecture principles.

## Original Project

**Scan 3.1** by Fabien Letouzey  
Original C++ implementation: Copyright (C) 2015-2019  
Licensed under GNU General Public License version 3

The original C++ source code is preserved in the `src/` directory (`.cpp` and `.hpp` files) for reference.

## .NET 9 Conversion

This conversion implements a clean architecture approach with the following structure:

### Architecture Layers

```
International.Draughts.Domain/          - Core business logic and entities
  ├── Entities/                          - Game entities (Position, Game)
  ├── ValueObjects/                      - Value objects (Move, Square, Bitboard)
  ├── Enums/                             - Enumerations (Side, Piece, Variant)
  └── Constants.cs                       - Domain constants

International.Draughts.Application/     - Application use cases and interfaces
  ├── Interfaces/                        - Service interfaces
  └── UseCases/                          - Application services

International.Draughts.Infrastructure/  - Infrastructure implementations
  ├── MoveGeneration/                    - Move generation implementation
  ├── Search/                            - Search algorithm implementation
  └── Configuration/                     - Configuration classes

International.Draughts.Console/         - Console application entry point
  ├── Program.cs                         - Application startup with DI
  └── TerminalInterface.cs               - Terminal user interface
```

### Clean Architecture Principles

1. **Dependency Inversion**: Domain layer has no dependencies. Application depends on Domain. Infrastructure depends on Application. Console depends on all layers but only for composition.

2. **Separation of Concerns**: 
   - Domain: Pure business logic, no external dependencies
   - Application: Use cases and abstractions
   - Infrastructure: Technical implementations
   - Console: UI and composition root

3. **Testability**: All layers are designed to be testable with clear interfaces.

4. **SOLID Principles**: Applied throughout the codebase.

## Requirements

- .NET 9.0 SDK or later
- Supported platforms: Windows, Linux, macOS

## Building

```bash
# Restore dependencies and build
dotnet build

# Build release version
dotnet build -c Release
```

## Running

```bash
# Run in text mode (default)
dotnet run --project src/International.Draughts.Console

# Or run the built executable
cd src/International.Draughts.Console/bin/Debug/net9.0
./International.Draughts.Console
```

## Usage

The engine starts in text mode. Available commands:

- `0-2` - Set number of computer players (0=human vs human, 1=human vs computer, 2=computer vs computer)
- `g` or `go` - Make the computer play the current side
- `u` or `undo` - Take back one move
- `time <n>` - Set time limit in seconds (default: 10)
- `h` or `help` - Show help
- `q` or `quit` - Exit the program

### Example Session

**Playing against the computer:**

```
Scan 3.1 (.NET 9)
International Draughts Engine
Converted to .NET 9 with Clean Architecture

Text mode ready. Type 'help' or 'h' for commands.

Ply: 0
Turn: White
White pieces: 20
Black pieces: 20

> 1
Mode: 1 computer player

> go
Computer will play this side.

Ply: 0
Turn: White
White pieces: 20
Black pieces: 20

Computer thinking (time limit: 10s)...
Computer plays: Move(8200000000)

Ply: 1
Turn: Black
White pieces: 20
Black pieces: 20

> quit
```

**Computer vs Computer:**

```
> 2
Mode: 2 computer players (auto-play)

[watches the computer play against itself]
```

**Adjusting time limit:**

```
> time 5
Time limit set to 5s

> time 30
Time limit set to 30s
```

## Current Implementation Status

### ✅ Fully Implemented and Working

The engine is now **fully functional** and can play complete games of international draughts!

**Core Engine (Ported from C++):**
- ✅ Complete move generation (gen.cpp) - men and kings, captures with multi-jumps
- ✅ Position representation with bitboards
- ✅ Move execution with state updates and promotions
- ✅ Search algorithm with minimax and alpha-beta pruning
- ✅ Iterative deepening search
- ✅ Basic position evaluation (material + advancement)
- ✅ Time-based search control

**Architecture:**
- ✅ Clean architecture structure with .NET 9
- ✅ Domain models (Position, Game, Move, Square, Bitboard)
- ✅ Bit manipulation helpers (BitOperations)
- ✅ Application layer with service interfaces
- ✅ Dependency injection and hosting setup
- ✅ Terminal interface with command processing
- ✅ Configuration system

**Verified Functionality:**
- ✅ Generates legal moves from any position
- ✅ Enforces mandatory capture rules
- ✅ Handles multi-jump captures correctly
- ✅ Promotes men to kings on last rank
- ✅ Computer player calculates and executes moves
- ✅ Game history and undo functionality

### 🚧 Advanced Features (Not Yet Ported)

The following advanced features from the original C++ version remain for future enhancement (~3,000 LOC):

1. **Advanced Evaluation** (eval.cpp, ~600 lines) - Pattern recognition, endgame evaluation
2. **Opening Book** (book.cpp, ~400 lines) - Opening book support with randomization
3. **Endgame Bitbases** (bb_*.cpp, ~2,000 lines) - Perfect play tablebase for endgames
4. **DXP Protocol** (dxp.cpp, ~800 lines) - Network protocol for engine-engine communication
5. **Hub Protocol** (hub.cpp, ~600 lines) - Hub GUI protocol
6. **Search Enhancements** - Transposition tables, move ordering, quiescence search
7. **Variant Support** - Full support for Killer, Breakthrough, Frisian, and Losing draughts

The engine is fully playable with the current implementation. The advanced features would improve playing strength and add tournament/GUI support.

## Game Variants

The engine supports (or will support) multiple draughts variants:

- **Normal** - Standard international (10x10) draughts
- **Killer** - Killer draughts variant
- **Breakthrough** - First to make a king wins
- **Frisian** - Frisian draughts
- **Losing** - Antidraughts/Giveaway variant

## Configuration

Configuration is handled through the `EngineConfiguration` class in the Infrastructure layer. Key settings:

- `Variant` - Game variant to use
- `UseOpeningBook` - Enable/disable opening book
- `Threads` - Number of CPU cores for search
- `TranspositionTableSize` - Size of the transposition table (2^n entries)
- `BitbaseSize` - Maximum pieces for endgame bitbases
- `DefaultTimeLimit` - Default time limit per move

## Technical Details

### .NET 9 Features Used

- **File-scoped namespaces** - For cleaner code
- **Record types** (where applicable) - For immutable data
- **Nullable reference types** - For better null safety
- **Modern C# patterns** - Pattern matching, switch expressions, etc.

### Performance Considerations

- Uses `Span<T>` and modern .NET performance features where applicable
- Bitboard operations use `System.Numerics.BitOperations`
- Designed for efficient memory allocation

## Development

### Adding New Features

1. Start with domain models in the Domain layer
2. Define interfaces in the Application layer
3. Implement in the Infrastructure layer
4. Wire up in the Console layer's Program.cs

### Testing

(Tests to be added)

```bash
# Run tests
dotnet test
```

## License

This .NET port maintains the original GNU General Public License version 3.

See `license.txt` for the full license text.

## Credits

- **Original Engine**: Fabien Letouzey (fabien_letouzey@hotmail.com)
- **.NET 9 Conversion**: Clean Architecture implementation using .NET 9

Special thanks to the original contributors mentioned in the C++ version's readme.

## Contributing

Contributions are welcome! Areas that need work:

1. Complete move generation implementation
2. Port the search algorithm
3. Port the evaluation function
4. Add unit tests
5. Optimize performance
6. Add documentation

## References

- Original Scan engine documentation: See `readme.txt` and `protocol.txt`
- Clean Architecture: Robert C. Martin (Uncle Bob)
- International Draughts Rules: FMJD (Fédération Mondiale du Jeu de Dames)
