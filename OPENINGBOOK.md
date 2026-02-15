# Opening Book Format

The International Draughts engine supports an opening book database for improved play in the opening phase.

## Overview

The opening book stores pre-analyzed positions and moves from the start of the game. When enabled, the engine will consult the book before performing a search, potentially saving time and playing stronger opening moves.

## File Format

The opening book is stored in a text-based format that represents a tree of positions:

```
<node_flag>
[score]
<node_flag>
[score]
...
```

### Format Details

- **Node Flag**: `1` (or `true`) for an internal node, `0` (or `false`) for a leaf node
- **Score**: An integer score for leaf nodes (omitted for internal nodes)

### Tree Structure

The book is loaded recursively from the starting position:

1. For each position, read a node flag
2. If it's a leaf node (0), read the score
3. If it's an internal node (1), recursively load all child positions (one for each legal move)

## File Location

The engine looks for the opening book at:
```
data/book.dat
```

You can create variant-specific books by appending the variant name:
```
data/book-normal.dat
data/book-killer.dat
```

## Creating an Opening Book

To create a custom opening book:

1. Start with the initial position
2. For each position, decide if it's:
   - **Internal node** (has analyzed variations): Write `1`, then recursively write child positions
   - **Leaf node** (terminal evaluation): Write `0`, then write the position score

### Example

Simple 2-ply book:
```
1           # Starting position is internal node
0           # After move 1: leaf
-50         # Score from white's perspective
0           # After move 2: leaf
100         # Score
1           # After move 3: internal node
0           # After move 3a: leaf
25          # Score
0           # After move 3b: leaf
-25         # Score
```

## Usage in Engine

When an opening book is loaded:

1. The engine checks if the current position is in the book
2. If found, it evaluates all legal moves and their resulting positions
3. Moves are scored based on the book evaluations
4. The engine selects from the best moves (within a configurable margin)
5. A random element ensures variety in play

### Configuration

You can configure opening book behavior:

```csharp
// Margin for move selection (in evaluation units)
// Moves within this margin of the best move are candidates
int margin = 50;

// Probe the book
if (openingBook.Probe(position, margin, out Move bookMove, out int score))
{
    // Use the book move
}
```

## Benefits

**Advantages:**
- Faster opening play (no search required)
- Stronger opening play (pre-analyzed positions)
- Variety in play (randomization among good moves)
- Avoids weak opening traps

**Statistics:**
- Typical book size: 10,000-100,000 positions
- Memory usage: ~500KB - 5MB
- Load time: < 1 second

## Advanced Topics

### Book Generation

To generate a high-quality opening book:

1. Use engine self-play at high depth
2. Analyze games from strong players
3. Include theoretical opening variations
4. Balance breadth (move coverage) vs depth (variation length)

### Book Maintenance

- Update periodically with new analysis
- Remove weak variations
- Add new opening ideas
- Balance different playing styles

## Implementation Notes

The .NET implementation:
- Uses a hash table for O(1) position lookup
- Supports position transpositions
- Implements randomization for variety
- Compatible with the original C++ book format

The opening book is fully optional - the engine works perfectly without it, just performing a normal search for all moves.
