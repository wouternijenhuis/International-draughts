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

```
Scan 3.1 (.NET 9)
International Draughts Engine
Converted to .NET 9 with Clean Architecture

Text mode ready. Type 'help' or 'h' for commands.

Ply: 0
Turn: White
White pieces: 20
Black pieces: 15

> help
[shows available commands]

> 1
Mode: 1 computer player

> quit
```

## Current Implementation Status

### ✅ Implemented

- Clean architecture structure with .NET 9
- Domain models (Position, Game, Move, Square, Bitboard)
- Application layer with service interfaces
- Dependency injection and hosting setup
- Terminal interface with command processing
- Configuration system

### 🚧 To Be Implemented

The following features from the original C++ version require porting:

1. **Move Generation** - Full draughts move generation logic
2. **Search Algorithm** - Minimax/Alpha-Beta search with optimizations
3. **Evaluation Function** - Position evaluation
4. **Opening Book** - Opening book support
5. **Endgame Bitbases** - Endgame tablebase support
6. **DXP Protocol** - DamExchange Protocol support
7. **Hub Protocol** - Hub GUI protocol support
8. **Variants** - Full support for all game variants (Killer, BT, Frisian, Losing)

The current implementation provides a working framework with placeholder implementations for these features.

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
