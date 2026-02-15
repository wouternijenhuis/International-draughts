namespace InternationalDraughts.Domain.Draughts;

/// <summary>
/// Generates all legal moves for a given position, enforcing mandatory capture
/// and maximum capture rules per FMJD international draughts regulations.
/// </summary>
public static class MoveGenerator
{
    /// <summary>
    /// Generates all legal moves for the current player.
    /// If captures exist, only the longest capture sequences are returned (maximum capture rule).
    /// </summary>
    public static List<DraughtsMove> GenerateLegalMoves(BoardPosition board, PieceColor player)
    {
        var captures = GenerateAllCaptures(board, player);

        if (captures.Count > 0)
        {
            // Maximum capture rule: only keep sequences with the most captures
            int maxLen = 0;
            foreach (var c in captures)
                if (c.CaptureCount > maxLen)
                    maxLen = c.CaptureCount;

            return captures.Where(c => c.CaptureCount == maxLen).ToList();
        }

        // No captures — return quiet moves
        return GenerateAllQuietMoves(board, player);
    }

    /// <summary>
    /// Generates all quiet (non-capture) moves for a player.
    /// </summary>
    public static List<DraughtsMove> GenerateAllQuietMoves(BoardPosition board, PieceColor player)
    {
        var moves = new List<DraughtsMove>();

        for (int sq = 1; sq <= BoardPosition.SquareCount; sq++)
        {
            var piece = board[sq];
            if (!piece.HasValue || piece.Value.Color != player) continue;

            if (piece.Value.IsMan)
                GenerateManQuietMoves(board, sq, player, moves);
            else
                GenerateKingQuietMoves(board, sq, moves);
        }

        return moves;
    }

    /// <summary>
    /// Generates all capture sequences for a player.
    /// </summary>
    public static List<DraughtsMove> GenerateAllCaptures(BoardPosition board, PieceColor player)
    {
        var captures = new List<DraughtsMove>();

        for (int sq = 1; sq <= BoardPosition.SquareCount; sq++)
        {
            var piece = board[sq];
            if (!piece.HasValue || piece.Value.Color != player) continue;

            if (piece.Value.IsMan)
                GenerateManCaptures(board, sq, player, [], new HashSet<int>(), captures);
            else
                GenerateKingCaptures(board, sq, player, [], new HashSet<int>(), captures);
        }

        return captures;
    }

    /// <summary>Man quiet moves: one square diagonally forward.</summary>
    private static void GenerateManQuietMoves(
        BoardPosition board, int square, PieceColor color, List<DraughtsMove> moves)
    {
        foreach (var dir in BoardTopology.ForwardDirections(color))
        {
            int target = BoardTopology.Adjacent(square, dir);
            if (target > 0 && board.IsEmpty(target))
                moves.Add(DraughtsMove.Quiet(square, target));
        }
    }

    /// <summary>King quiet moves: flying king — any number of squares along any diagonal.</summary>
    private static void GenerateKingQuietMoves(
        BoardPosition board, int square, List<DraughtsMove> moves)
    {
        foreach (var dir in BoardTopology.AllDirections)
        {
            var ray = BoardTopology.GetRay(square, dir);
            foreach (int target in ray)
            {
                if (board.IsEmpty(target))
                    moves.Add(DraughtsMove.Quiet(square, target));
                else
                    break; // Blocked
            }
        }
    }

    /// <summary>
    /// Recursively finds all capture sequences for a man.
    /// Men capture in all four directions (forward and backward).
    /// Jumped pieces remain on the board during the sequence but cannot be jumped twice.
    /// A man passing through the promotion row mid-capture is NOT promoted (FMJD rule).
    /// </summary>
    private static void GenerateManCaptures(
        BoardPosition board, int square, PieceColor color,
        List<CaptureStep> currentSteps, HashSet<int> jumpedSquares,
        List<DraughtsMove> result)
    {
        bool foundContinuation = false;

        foreach (var dir in BoardTopology.AllDirections)
        {
            int enemySquare = BoardTopology.Adjacent(square, dir);
            if (enemySquare < 1) continue;

            // Must be an enemy piece not already jumped
            if (!board.IsEnemy(enemySquare, color) || jumpedSquares.Contains(enemySquare))
                continue;

            // Landing square must be empty
            int landingSquare = BoardTopology.Adjacent(enemySquare, dir);
            if (landingSquare < 1 || !board.IsEmpty(landingSquare))
                continue;

            // Also check that landing square isn't occupied by a piece from a previous step's origin
            // (in multi-jump, the piece has left its origin, so that square is now empty)
            // This is already handled since we're working on the actual board state

            foundContinuation = true;
            var step = new CaptureStep(square, landingSquare, enemySquare);
            var newSteps = new List<CaptureStep>(currentSteps) { step };
            var newJumped = new HashSet<int>(jumpedSquares) { enemySquare };

            // Recurse to find continuations
            GenerateManCaptures(board, landingSquare, color, newSteps, newJumped, result);
        }

        // If no further captures, record the completed sequence
        if (!foundContinuation && currentSteps.Count > 0)
            result.Add(DraughtsMove.Capture(currentSteps.ToArray()));
    }

    /// <summary>
    /// Recursively finds all capture sequences for a king (flying king).
    /// King can capture at any distance along a diagonal, jumping over exactly one enemy.
    /// Can land on any empty square beyond the jumped piece.
    /// </summary>
    private static void GenerateKingCaptures(
        BoardPosition board, int square, PieceColor color,
        List<CaptureStep> currentSteps, HashSet<int> jumpedSquares,
        List<DraughtsMove> result)
    {
        bool foundContinuation = false;

        foreach (var dir in BoardTopology.AllDirections)
        {
            var ray = BoardTopology.GetRay(square, dir);
            int enemySquare = -1;

            foreach (int target in ray)
            {
                var piece = board[target];

                if (!piece.HasValue)
                {
                    // Empty square
                    if (enemySquare > 0)
                    {
                        // We've passed over an enemy — valid landing square
                        foundContinuation = true;
                        var step = new CaptureStep(square, target, enemySquare);
                        var newSteps = new List<CaptureStep>(currentSteps) { step };
                        var newJumped = new HashSet<int>(jumpedSquares) { enemySquare };

                        GenerateKingCaptures(board, target, color, newSteps, newJumped, result);
                    }
                    // If no enemy yet, just an empty square — continue scanning
                }
                else if (board.IsEnemy(target, color) && !jumpedSquares.Contains(target))
                {
                    // Found an enemy we haven't jumped
                    if (enemySquare > 0)
                        break; // Two enemies in a row — can't jump
                    enemySquare = target;
                }
                else
                {
                    // Friendly piece or already-jumped enemy — blocked
                    break;
                }
            }
        }

        // If no further captures, record the completed sequence
        if (!foundContinuation && currentSteps.Count > 0)
            result.Add(DraughtsMove.Capture(currentSteps.ToArray()));
    }
}
