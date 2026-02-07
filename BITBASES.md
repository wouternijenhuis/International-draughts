# Endgame Bitbases (Tablebases)

This document describes the endgame bitbase system for the International Draughts engine.

## Overview

Bitbases (also known as tablebases or endgame databases) provide **perfect play** in endgame positions. They contain pre-computed game-theoretic values (win/draw/loss) and distance-to-mate information for all possible positions with a limited number of pieces.

## Features

- **Perfect Endgame Play**: Bitbases provide guaranteed optimal play in endgame positions
- **Compressed Storage**: Positions are stored in compressed format (.gz files)
- **Fast Lookup**: O(1) position indexing using combinatorial numbering
- **Automatic Integration**: Seamlessly integrated into search algorithm
- **Configurable**: Support for multiple piece configurations

## Architecture

The bitbase system consists of several components:

### 1. BitbaseIndex
Indexes positions for compact storage and fast lookup.
- Uses combinatorial numbering to map piece placements to unique indices
- Handles position normalization and symmetries
- Computes index space sizes for different piece configurations

### 2. BitbaseStorage
Compressed storage for bitbase data.
- Stores win/draw/loss values (2 bits)
- Stores distance-to-mate information (6 bits)
- Uses GZip compression for disk storage
- Total: 8 bits (1 byte) per position

### 3. Bitbase
Main bitbase class that manages loading and probing.
- Loads multiple bitbases from files
- Probes positions during search
- Returns perfect evaluation with distance-to-mate

## File Format

### Naming Convention
Bitbase files should be named according to their piece configuration:

- **Simple format**: `bb_WvB.gz`
  - Example: `bb_2v1.gz` (2 white men vs 1 black man)
  - All pieces are men (no kings)

- **Detailed format**: `bb_WmMmWkKbBkK.gz`
  - Example: `bb_1m0m1k0k.gz` (1 white man, 0 black men, 1 white king, 0 black kings)
  - Explicit piece type specification

### Storage Format
Each position is stored as a single byte:
- Bits 7-6: Value (00=Win, 01=Loss, 10=Draw, 11=Unknown)
- Bits 5-0: Distance to mate (0-63 plies)

Files are compressed using GZip compression.

## Directory Structure

Bitbases should be placed in the `data/bitbases/` directory:

```
data/
└── bitbases/
    ├── bb_2v1.gz       # 2 vs 1 endgame
    ├── bb_3v1.gz       # 3 vs 1 endgame
    ├── bb_2v2.gz       # 2 vs 2 endgame
    └── ...
```

## Usage

### Automatic Loading
The engine automatically attempts to load bitbases at startup from `data/bitbases/`.

### Manual Testing
You can generate a test bitbase for development:

```csharp
Bitbase.GenerateTestBitbase("data/bitbases/bb_2v1.gz");
```

### Integration with Search
The search engine automatically probes the bitbase:
1. Before searching a position, check if it's in the bitbase
2. If found, return the perfect evaluation
3. Otherwise, continue with normal search

## Performance Benefits

Using bitbases provides several advantages:

1. **Perfect Play**: Guaranteed optimal play in endgame positions
2. **Instant Evaluation**: No search needed for bitbase positions (instant vs 10+ seconds)
3. **Simplified Endgames**: Converts complex endgames to trivial lookups
4. **Stronger Play**: Never misses a win or draw in covered endgames

## Generating Bitbases

Generating bitbases requires retrograde analysis:

### Algorithm (Simplified)
1. Start with all possible positions for a given piece configuration
2. Mark positions with no moves as losses
3. Mark positions where all moves lead to loss as wins
4. Mark positions where at least one move leads to draw as draws
5. Iterate until all positions are classified
6. Compute distance-to-mate by working backwards from terminal positions

### Implementation Notes
Full bitbase generation is computationally intensive and can take hours or days for larger endgames. The provided `GenerateTestBitbase` method creates a simplified example for testing.

## Supported Configurations

The engine supports bitbases for any piece configuration, but common useful endgames include:

- **2 vs 1**: Always winning
- **3 vs 1**: Always winning
- **2 vs 2**: Complex, many draws
- **3 vs 2**: Complex, many wins
- **1 king vs 1 man**: Winning for king
- **2 kings vs 1 king**: Winning for side with 2 kings

## Memory Requirements

Bitbase memory usage depends on the piece configuration:

| Config | Positions | Uncompressed | Compressed (est.) |
|--------|-----------|--------------|-------------------|
| 2v1    | ~100K     | ~100 KB      | ~10 KB           |
| 3v1    | ~10M      | ~10 MB       | ~1 MB            |
| 2v2    | ~10M      | ~10 MB       | ~1 MB            |
| 3v2    | ~1B       | ~1 GB        | ~100 MB          |
| 4v3    | ~100B     | ~100 GB      | ~10 GB           |

## Limitations

- Bitbases must be pre-generated (not included with engine)
- Large endgames require significant disk space and memory
- Generation time increases exponentially with piece count
- Currently supports up to 10 pieces efficiently

## Future Enhancements

Potential improvements for the bitbase system:

1. **On-the-fly Generation**: Generate small bitbases at runtime
2. **Compression Improvements**: Better compression algorithms
3. **Partial Bitbases**: Store only most important positions
4. **Network Access**: Download bitbases from online repositories
5. **Syzygy Format**: Support for standard Syzygy tablebase format

## Technical Details

### Combinatorial Indexing
The engine uses combinatorial numbering to assign a unique index to each position:

- For n squares and k pieces, there are C(n,k) possible placements
- Each piece type gets its own index space
- Total index = white_men_index * C(50,wm) + black_men_index * ...

### Hash vs Index
- **Hash**: Used for transposition table (fast but collisions possible)
- **Index**: Used for bitbase (slower but unique for each position)

## References

- Retrograde Analysis: https://en.wikipedia.org/wiki/Endgame_tablebase
- Syzygy Tablebases: https://syzygy-tables.info/
- Combinatorial Number System: https://en.wikipedia.org/wiki/Combinatorial_number_system

## License

The bitbase implementation is part of the International Draughts engine and is distributed under the GNU General Public License version 3.
