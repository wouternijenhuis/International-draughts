# AI Engine

## Difficulty Levels

| Level | Runs On | Search Depth | Time Limit | Blunder Rate | Target Audience |
|-------|---------|-------------|------------|--------------|-----------------|
| **Easy** | Client | 1 ply | 1s | 50% | Beginners |
| **Medium** | Client | 3 ply | 1.5s | 20% | Casual players |
| **Hard** | Client | 5 ply | 2s | 5% | Experienced players |
| **Expert** | Server | Iterative deepening | 30s | 0% | Competitive players |

## Client-Side AI (Easy/Medium/Hard)

### Search Algorithm

- **Iterative deepening alpha-beta** with NegaMax framework
- **Move ordering** for pruning efficiency: captures first, then by evaluation score
- Runs entirely in the browser via the shared TypeScript engine

### Evaluation Function

The position evaluation considers:

- **Material balance**: Men (100 centipawns) vs. Kings (300 centipawns)
- **Center control**: Bonus for pieces on central squares
- **Advancement**: Bonus for men closer to promotion
- **Back row defense**: Bonus for men on the back row
- **King centralization**: Bonus for kings near the center

### Difficulty Tuning

Lower difficulties achieve human-like play through:

- **Evaluation noise**: Random value added to scores (±300cp for Easy, ±120cp for Medium, ±30cp for Hard)
- **Blunder probability**: Chance of selecting a suboptimal move
- **Blunder margin**: How bad the selected blunder can be

This approach makes the AI play "human-like mistakes" rather than random moves.

## Server-Side Expert AI

### Search Techniques

The Expert AI in `Application/ExpertAi/SearchEngine.cs` uses:

1. **Iterative Deepening**: Start at depth 1, increase until time limit
2. **Principal Variation Search (PVS)**: Full window for first move, null window for rest
3. **Late Move Reductions (LMR)**: Reduced depth for moves unlikely to be best
4. **Aspiration Windows**: Narrow initial search window around previous score
5. **Transposition Table**: Hash-based position caching to avoid re-searching
6. **Killer Moves**: Track moves that caused beta cutoffs at each depth
7. **History Heuristic**: Track historically successful moves for ordering

### Move Ordering

Moves are searched in this order for optimal pruning:

1. Hash move (from transposition table)
2. Captures (by number of pieces captured)
3. Killer moves (at current depth)
4. Remaining moves (ordered by history heuristic score)

### Evaluation (Expert)

The expert evaluator (`Evaluator.cs`) includes all client-side features plus:

- **Mobility**: Count of legal moves available
- **Left/Right balance**: Penalty for unbalanced piece distribution
- **Piece structure**: Connected pieces and formation evaluation
- **Locked position penalty**: Penalty for blocked pieces
- **Runaway man detection**: Bonus for men with a clear path to promotion
- **Endgame king advantage**: Enhanced king value in endgame positions
- **Quick evaluation**: Lightweight eval for move ordering (avoids full computation)

### Configuration

Expert AI behavior is configurable via `ExpertAiOptions`:

- **Time limit**: Default 30 seconds per move
- **Maximum depth**: Configurable ceiling
- **Feature toggles**: PVS, LMR, aspiration windows can be enabled/disabled

## Future Enhancements (Post-v1)

- **Opening book**: Curated library of strong opening lines
- **Endgame databases**: Perfect play for positions with ≤6 pieces
- **Learned evaluation**: ML-trained position evaluation
- **Quiescence search**: Extended search at leaf nodes to avoid horizon effects
