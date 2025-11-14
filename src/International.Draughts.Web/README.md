# International Draughts - Blazor Web Interface

A web-based interface for playing International Draughts (10x10) against the computer using the Scan draughts engine.

## Features

- **Interactive Game Board**: Click-to-move interface with visual feedback
- **Computer Opponent**: Play against the AI engine with configurable difficulty
- **Game Controls**: New game, undo moves, and game status display
- **Visual Design**: Clean, responsive interface with proper board representation
- **Real-time Updates**: Uses Blazor Server for instant UI updates

## Running the Application

```bash
# From the project directory
cd src/International.Draughts.Web
dotnet run

# The application will be available at:
# http://localhost:5000 (or the port shown in the console)
```

## How to Play

1. **Start a New Game**: Click the "New Game" button to start or restart
2. **Select a Piece**: Click on one of your pieces (white pieces at the bottom)
3. **Make a Move**: Click on a highlighted square to move your piece
4. **Computer's Turn**: The computer will automatically make its move after you
5. **Undo**: Use the "Undo Move" button to take back your last move

## Game Rules

- White (bottom) plays first
- Only dark squares are used for play
- Men move diagonally forward one square
- Kings (promoted pieces) can move diagonally in any direction
- Captures are mandatory when available
- Multi-jump captures must be completed in one turn

## Technical Details

- **Framework**: ASP.NET Core 9.0 with Blazor Server
- **UI Mode**: Interactive Server-side rendering
- **Dependencies**: 
  - International.Draughts.Application (game logic)
  - International.Draughts.Infrastructure (AI engine)
  - Bootstrap 5 (styling)

## Configuration

The application uses the same engine configuration as the console application:
- Computer thinking time: 5 seconds per move (configurable in code)
- Optional features: Opening book, bitbases, learned evaluation weights
- Place data files in the `data/` directory at the root of the repository
