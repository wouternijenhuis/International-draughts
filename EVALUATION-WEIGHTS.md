# Evaluation Weights

This document describes the machine-learned evaluation weights system for the International Draughts engine.

## Overview

The evaluation function can use either:
1. **Default hand-tuned weights** (built-in, no setup required)
2. **Machine-learned weights** from an external data file (optional enhancement)

The engine loads weights from `data/weights.dat` at startup. If the file doesn't exist, it automatically falls back to the default weights.

## Features

- **Flexible weight system**: All evaluation parameters are configurable
- **Automatic fallback**: Uses default weights if file is missing or invalid
- **Optional compression**: Supports GZip compression for larger weight files
- **Pattern weights**: Optional support for complex positional patterns
- **Compatible format**: Based on the original C++ eval.cpp weight format

## Weight Parameters

### Material Values

```
man_value=100              # Value of a man (regular piece)
king_value=300             # Value of a king
first_king_bonus=50        # Bonus for having the first king in the game
```

### Positional Weights

```
center_control=5           # Bonus for pieces in central files (4-8)
advancement=3              # Bonus per rank advanced (for men)
back_rank_penalty=10       # Penalty for men stuck on back rank
```

### Mobility Weights

```
king_mobility=2            # Value per available move for kings
```

### Strategic Weights

```
tempo_diagonal=2           # Bonus for pieces on main diagonals
endgame_king_advantage=20  # King advantage in endgame positions (<= 10 pieces)
```

### Pattern Weights (Optional)

Pattern weights can be defined for complex positional structures:

```
pattern_bridge=15          # Bonus for bridge formation
pattern_wedge=10           # Bonus for wedge formation
pattern_trap=20            # Bonus for trap position
```

Pattern names must start with `pattern_` prefix.

## File Format

The weights file is a simple text format:

### Basic Format

Each line contains one weight parameter in either format:
- `name=value` (recommended)
- `name value` (space-separated)

### Example File

```
# Material values
man_value=100
king_value=300
first_king_bonus=50

# Positional weights
center_control=5
advancement=3
back_rank_penalty=10

# Mobility
king_mobility=2

# Strategic
tempo_diagonal=2
endgame_king_advantage=20

# Optional patterns
pattern_bridge=15
pattern_wedge=10
```

### Comments

Lines starting with `#` are treated as comments and ignored.

Empty lines are also ignored.

## Using Custom Weights

### 1. Create Weight File

Create a file at `data/weights.dat`:

```bash
mkdir -p data
cat > data/weights.dat << EOF
# Custom evaluation weights
man_value=110
king_value=320
first_king_bonus=45
center_control=6
advancement=4
back_rank_penalty=12
king_mobility=3
tempo_diagonal=3
endgame_king_advantage=25
EOF
```

### 2. Run Engine

The engine automatically loads the weights on startup:

```bash
dotnet run
```

You'll see a message indicating weights were loaded:
```
Loaded 9 evaluation weights from data/weights.dat
```

### 3. Verify

The engine now uses your custom weights for all position evaluations.

## Using Compressed Weights

For larger weight files (e.g., with many pattern weights), compression can save space:

### Create Compressed File

```bash
gzip data/weights.dat
# This creates data/weights.dat.gz
```

### Modify Program.cs

Change the weight loading line to specify compression:

```csharp
return LearnedEvaluationWeights.LoadOrDefault(weightsPath, compressed: true);
```

## Machine Learning Weights

### Training Process

To create machine-learned weights:

1. **Collect training data**: Games with known outcomes
2. **Feature extraction**: Extract evaluation features from positions
3. **Optimization**: Use techniques like:
   - Linear regression
   - Gradient descent
   - Genetic algorithms
   - Reinforcement learning (self-play)
4. **Export weights**: Save optimized parameters to weights file

### Example Training Tools

Popular tools for training evaluation weights:
- **Texel's Tuning Method**: Linear regression on quiescent positions
- **Self-Play**: Reinforcement learning with tournament feedback
- **Genetic Algorithms**: Evolutionary optimization of weights
- **Bayesian Optimization**: Efficient parameter search

### Validation

After training, validate weights by:
1. Playing test suites (EPD format)
2. Tournament play against reference engines
3. Tactical test positions
4. Endgame database verification

## Default Weights

If no weight file is provided, the engine uses these default hand-tuned values:

| Parameter | Default Value | Description |
|-----------|---------------|-------------|
| `man_value` | 100 | Man piece value |
| `king_value` | 300 | King piece value |
| `first_king_bonus` | 50 | First king advantage |
| `center_control` | 5 | Central file bonus |
| `advancement` | 3 | Advancement bonus |
| `back_rank_penalty` | 10 | Back rank penalty |
| `king_mobility` | 2 | Mobility per move |
| `tempo_diagonal` | 2 | Diagonal control |
| `endgame_king_advantage` | 20 | Endgame king bonus |

These values provide strong intermediate-level play without any external files.

## Troubleshooting

### Weights Not Loading

If weights aren't loading:

1. **Check file path**: Ensure `data/weights.dat` exists
2. **Check format**: Verify each line is `name=value` or `name value`
3. **Check values**: All values must be valid integers
4. **Check console**: Look for error messages on startup

### Invalid Weight Values

If a weight has an invalid value:
- The line is skipped with a warning
- The default value is used for that parameter

### Missing Weight Parameters

If a weight parameter is missing from the file:
- The default value is used automatically
- No error or warning is generated

## Performance Impact

Using custom weights has minimal performance impact:
- Weights are loaded once at startup
- All weight lookups are direct property access (no dictionary overhead)
- Evaluation function remains fully optimized

## Advanced Usage

### Runtime Weight Adjustment

For experimentation, you can programmatically create weights:

```csharp
var customWeights = new Dictionary<string, int>
{
    ["man_value"] = 105,
    ["king_value"] = 310,
    // ... other weights
};

var weights = new LearnedEvaluationWeights(customWeights);
var evaluator = new ImprovedEvaluator(weights);
```

### Weight File Generators

You can create tools to generate weight files from training results:

```csharp
public static void SaveWeights(Dictionary<string, int> weights, string path)
{
    using var writer = new StreamWriter(path);
    writer.WriteLine("# Generated evaluation weights");
    writer.WriteLine($"# Created: {DateTime.Now}");
    writer.WriteLine();
    
    foreach (var (name, value) in weights.OrderBy(kv => kv.Key))
    {
        writer.WriteLine($"{name}={value}");
    }
}
```

## Future Enhancements

Potential improvements to the weight system:
- Support for floating-point weights (higher precision)
- Separate weight files for different game phases (opening/middlegame/endgame)
- Neural network evaluation (requires different architecture)
- Online learning (adjust weights during play)
- Per-variant weight files (International/Killer/BT/Frisian)

## See Also

- **README.md**: General engine documentation
- **MIGRATION.md**: C++ to .NET migration guide
- **OPENINGBOOK.md**: Opening book format
- **BITBASES.md**: Endgame bitbase format

## References

- Texel's Tuning Method: https://www.chessprogramming.org/Texel%27s_Tuning_Method
- Evaluation in Draughts: https://en.wikipedia.org/wiki/Draughts#Strategy_and_tactics
- Machine Learning in Games: https://www.chessprogramming.org/Automated_Tuning
