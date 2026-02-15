using InternationalDraughts.Domain.Draughts;

namespace InternationalDraughts.Application.ExpertAi;

/// <summary>
/// Expert-level evaluation function for international draughts positions.
/// Evaluates from the perspective of the given player (positive = good for player).
/// Includes all positional features specified in the Expert AI v1 spec:
/// material, center control, advancement, king centralization, mobility,
/// left/right balance, locked positions, runaway regular pieces, and tempo.
/// </summary>
public sealed class Evaluator
{
    private readonly EvaluationWeights _w;

    public Evaluator(EvaluationWeights weights)
    {
        _w = weights;
    }

    /// <summary>
    /// Full evaluation of a board position from the perspective of the given player.
    /// Returns a score in evaluation units.
    /// </summary>
    public int Evaluate(BoardPosition board, PieceColor player)
    {
        var opponent = player.Opposite();
        var (pMen, pKings, pTotal) = board.CountPieces(player);
        var (oMen, oKings, oTotal) = board.CountPieces(opponent);

        // Terminal conditions
        if (oTotal == 0) return _w.WinScore;
        if (pTotal == 0) return _w.LossScore;

        int score = 0;

        // --- Material ---
        score += (pMen - oMen) * _w.ManValue;
        score += (pKings - oKings) * _w.KingValue;

        // First king advantage bonus: having the only king on the board is valuable
        if (pKings > 0 && oKings == 0) score += _w.FirstKingBonus;
        if (oKings > 0 && pKings == 0) score -= _w.FirstKingBonus;

        // --- Positional evaluation per square ---
        int playerLeftPieces = 0, playerRightPieces = 0;
        int opponentLeftPieces = 0, opponentRightPieces = 0;
        int playerMobility = 0, opponentMobility = 0;
        int playerConnected = 0, opponentConnected = 0;

        for (int sq = 1; sq <= BoardPosition.SquareCount; sq++)
        {
            var piece = board[sq];
            if (!piece.HasValue) continue;

            bool isPlayer = piece.Value.Color == player;
            int multiplier = isPlayer ? 1 : -1;
            var (row, col) = BoardTopology.SquareToCoord(sq);

            // Center control
            if (BoardTopology.CenterSquares.Contains(sq))
            {
                score += multiplier * _w.CenterControl;
                if (BoardTopology.InnerCenter.Contains(sq))
                    score += multiplier * _w.InnerCenterBonus;
            }

            // Advancement (regular pieces only — closer to promotion is better)
            if (piece.Value.IsMan)
            {
                int advancement = piece.Value.Color == PieceColor.White ? (9 - row) : row;
                score += multiplier * advancement * _w.Advancement;

                // Back row bonus
                bool isBackRow = piece.Value.Color == PieceColor.White
                    ? BoardTopology.WhiteBackRow.Contains(sq)
                    : BoardTopology.BlackBackRow.Contains(sq);
                if (isBackRow)
                    score += multiplier * _w.BackRowBonus;

                // Runaway regular piece detection: a regular piece that cannot be stopped from promoting
                if (IsRunawayMan(board, sq, piece.Value.Color))
                    score += multiplier * _w.RunawayManBonus;
            }

            // King centralization
            if (piece.Value.IsKing)
            {
                double distFromCenter = Math.Abs(row - 4.5) + Math.Abs(col - 4.5);
                score += multiplier * (int)Math.Round((7 - distFromCenter) * _w.KingCentralization);
            }

            // Tempo diagonal bonus (main diagonals)
            if (row == col || row + col == 9)
                score += multiplier * _w.TempoDiagonal;

            // Left/right balance tracking
            if (isPlayer)
            {
                if (col < 5) playerLeftPieces++;
                else playerRightPieces++;
            }
            else
            {
                if (col < 5) opponentLeftPieces++;
                else opponentRightPieces++;
            }

            // Mobility: count available moves from this piece
            if (piece.Value.IsKing)
            {
                int moves = CountKingMoves(board, sq);
                if (isPlayer) playerMobility += moves;
                else opponentMobility += moves;
            }
            else
            {
                int moves = CountManMoves(board, sq, piece.Value.Color);
                if (isPlayer) playerMobility += moves;
                else opponentMobility += moves;
            }

            // Piece structure: connected pieces (adjacent friendly piece)
            if (HasAdjacentFriendly(board, sq, piece.Value.Color))
            {
                if (isPlayer) playerConnected++;
                else opponentConnected++;
            }
        }

        // --- Mobility ---
        score += (playerMobility - opponentMobility) * _w.ManMobility;

        // --- King mobility bonus ---
        // Already included via per-square king moves above, but add differential
        // (king mobility is worth more than regular piece mobility)

        // --- Left/right balance ---
        int playerImbalance = Math.Abs(playerLeftPieces - playerRightPieces);
        int opponentImbalance = Math.Abs(opponentLeftPieces - opponentRightPieces);
        // Penalize imbalanced positions
        score -= playerImbalance * _w.LeftRightBalance;
        score += opponentImbalance * _w.LeftRightBalance;

        // --- Piece structure ---
        score += (playerConnected - opponentConnected) * _w.PieceStructure;

        // --- Locked position penalty ---
        // If a player has no moves, that's a loss (handled by search),
        // but having very low mobility is penalized
        if (playerMobility <= 2 && pTotal > 2)
            score -= _w.LockedPositionPenalty;
        if (opponentMobility <= 2 && oTotal > 2)
            score += _w.LockedPositionPenalty;

        // --- Endgame king advantage ---
        if (pTotal + oTotal <= 10 && pKings > oKings)
            score += (pKings - oKings) * _w.EndgameKingAdvantage;
        else if (pTotal + oTotal <= 10 && oKings > pKings)
            score -= (oKings - pKings) * _w.EndgameKingAdvantage;

        return score;
    }

    /// <summary>
    /// Quick evaluation for move ordering (material + basic positional only).
    /// </summary>
    public int QuickEvaluate(BoardPosition board, PieceColor player)
    {
        var opponent = player.Opposite();
        var (pMen, pKings, _) = board.CountPieces(player);
        var (oMen, oKings, _) = board.CountPieces(opponent);
        return (pMen - oMen) * _w.ManValue + (pKings - oKings) * _w.KingValue;
    }

    /// <summary>
    /// Checks if a regular piece is "runaway" — it has a clear path to promotion
    /// and the opponent cannot catch it.
    /// </summary>
    private static bool IsRunawayMan(BoardPosition board, int square, PieceColor color)
    {
        var (row, col) = BoardTopology.SquareToCoord(square);
        int promotionRow = BoardTopology.PromotionRow(color);
        int distance = Math.Abs(promotionRow - row);

        if (distance == 0) return false; // Already on promotion row (shouldn't be a regular piece)
        if (distance > 4) return false; // Too far to be considered runaway

        // Check if path ahead is clear (simplified: check diagonal squares toward promotion)
        int dRow = color == PieceColor.White ? -1 : 1;
        int checkRow = row;
        for (int d = 0; d < distance; d++)
        {
            checkRow += dRow;
            if (checkRow < 0 || checkRow > 9) return false;

            // Check both diagonal landing squares on this row
            int leftCol = col - (d + 1);
            int rightCol = col + (d + 1);

            // At least one path must be clear
            bool leftClear = true, rightClear = true;
            if (leftCol >= 0 && leftCol <= 9)
            {
                int sq = BoardTopology.CoordToSquare(checkRow, leftCol);
                if (sq > 0 && !board.IsEmpty(sq) && board.IsEnemy(sq, color))
                    leftClear = false;
            }
            else
            {
                leftClear = false;
            }

            if (rightCol >= 0 && rightCol <= 9)
            {
                int sq = BoardTopology.CoordToSquare(checkRow, rightCol);
                if (sq > 0 && !board.IsEmpty(sq) && board.IsEnemy(sq, color))
                    rightClear = false;
            }
            else
            {
                rightClear = false;
            }

            if (!leftClear && !rightClear) return false;
        }

        return true;
    }

    /// <summary>Counts available quiet moves for a king.</summary>
    private static int CountKingMoves(BoardPosition board, int square)
    {
        int count = 0;
        foreach (var dir in BoardTopology.AllDirections)
        {
            var ray = BoardTopology.GetRay(square, dir);
            foreach (int target in ray)
            {
                if (board.IsEmpty(target)) count++;
                else break;
            }
        }
        return count;
    }

    /// <summary>Counts available forward quiet moves for a regular piece.</summary>
    private static int CountManMoves(BoardPosition board, int square, PieceColor color)
    {
        int count = 0;
        foreach (var dir in BoardTopology.ForwardDirections(color))
        {
            int target = BoardTopology.Adjacent(square, dir);
            if (target > 0 && board.IsEmpty(target)) count++;
        }
        return count;
    }

    /// <summary>Checks if a piece has an adjacent friendly piece (piece structure).</summary>
    private static bool HasAdjacentFriendly(BoardPosition board, int square, PieceColor color)
    {
        foreach (var dir in BoardTopology.AllDirections)
        {
            int adj = BoardTopology.Adjacent(square, dir);
            if (adj > 0)
            {
                var p = board[adj];
                if (p.HasValue && p.Value.Color == color) return true;
            }
        }
        return false;
    }
}
