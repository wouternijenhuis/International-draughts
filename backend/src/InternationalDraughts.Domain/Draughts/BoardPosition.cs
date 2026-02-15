namespace InternationalDraughts.Domain.Draughts;

/// <summary>
/// Represents the board position as a flat array of 51 elements (index 0 unused, 1-50 for squares).
/// Immutable value object — all mutations return new instances.
/// </summary>
public sealed class BoardPosition
{
    private readonly DraughtsPiece?[] _squares;

    /// <summary>Number of playable squares on the board.</summary>
    public const int SquareCount = 50;

    private BoardPosition(DraughtsPiece?[] squares)
    {
        _squares = squares;
    }

    /// <summary>Gets the piece on a square (1-50), or null if empty.</summary>
    public DraughtsPiece? this[int square] => _squares[square];

    /// <summary>Creates an empty board.</summary>
    public static BoardPosition Empty()
    {
        return new BoardPosition(new DraughtsPiece?[SquareCount + 1]);
    }

    /// <summary>Creates the standard initial position for international draughts.</summary>
    public static BoardPosition Initial()
    {
        var squares = new DraughtsPiece?[SquareCount + 1];

        // Black pieces on squares 1-20 per FMJD convention
        for (int i = 1; i <= 20; i++)
            squares[i] = DraughtsPiece.BlackMan;

        // White pieces on squares 31-50 per FMJD convention
        for (int i = 31; i <= 50; i++)
            squares[i] = DraughtsPiece.WhiteMan;

        return new BoardPosition(squares);
    }

    /// <summary>Creates a board from a raw integer array (used by API deserialization).
    /// Encoding: 0=empty, 1=white man, 2=black man, 3=white king, 4=black king.
    /// </summary>
    public static BoardPosition FromIntArray(int[] board)
    {
        var squares = new DraughtsPiece?[SquareCount + 1];
        int limit = Math.Min(board.Length, SquareCount + 1);
        for (int i = 1; i < limit; i++)
        {
            squares[i] = board[i] switch
            {
                1 => DraughtsPiece.WhiteMan,
                2 => DraughtsPiece.BlackMan,
                3 => DraughtsPiece.WhiteKing,
                4 => DraughtsPiece.BlackKing,
                _ => null
            };
        }
        return new BoardPosition(squares);
    }

    /// <summary>
    /// Sets a piece on a square, returning a new board position.
    /// </summary>
    public BoardPosition SetPiece(int square, DraughtsPiece? piece)
    {
        var newSquares = (DraughtsPiece?[])_squares.Clone();
        newSquares[square] = piece;
        return new BoardPosition(newSquares);
    }

    /// <summary>
    /// Applies a move and returns the new board position.
    /// Handles movement, captures (removing jumped pieces), and promotion.
    /// </summary>
    public BoardPosition ApplyMove(DraughtsMove move)
    {
        var newSquares = (DraughtsPiece?[])_squares.Clone();

        if (move.IsCapture)
        {
            var piece = newSquares[move.Steps[0].From]!.Value;
            newSquares[move.Steps[0].From] = null;

            // Remove all captured pieces
            foreach (var step in move.Steps)
                newSquares[step.Captured] = null;

            // Place piece at final destination
            int destination = move.Steps[^1].To;
            newSquares[destination] = piece;

            // Promotion at end of capture sequence
            if (piece.IsMan && BoardTopology.IsPromotionSquare(destination, piece.Color))
                newSquares[destination] = piece.Promote();
        }
        else
        {
            var piece = newSquares[move.From]!.Value;
            newSquares[move.From] = null;
            newSquares[move.To] = piece;

            // Promotion
            if (piece.IsMan && BoardTopology.IsPromotionSquare(move.To, piece.Color))
                newSquares[move.To] = piece.Promote();
        }

        return new BoardPosition(newSquares);
    }

    /// <summary>Counts pieces of a given color.</summary>
    public (int Men, int Kings, int Total) CountPieces(PieceColor color)
    {
        int men = 0, kings = 0;
        for (int sq = 1; sq <= SquareCount; sq++)
        {
            var p = _squares[sq];
            if (p.HasValue && p.Value.Color == color)
            {
                if (p.Value.IsMan) men++;
                else kings++;
            }
        }
        return (men, kings, men + kings);
    }

    /// <summary>Checks if a square is empty.</summary>
    public bool IsEmpty(int square) => !_squares[square].HasValue;

    /// <summary>Checks if a square has an enemy piece.</summary>
    public bool IsEnemy(int square, PieceColor friendlyColor)
    {
        var p = _squares[square];
        return p.HasValue && p.Value.Color != friendlyColor;
    }

    /// <summary>Computes a Zobrist-style hash for the position.</summary>
    public ulong ComputeHash(PieceColor currentPlayer)
    {
        ulong hash = currentPlayer == PieceColor.White ? 1UL : 2UL;
        for (int sq = 1; sq <= SquareCount; sq++)
        {
            var p = _squares[sq];
            if (p.HasValue)
            {
                ulong pieceVal = p.Value.Color == PieceColor.White
                    ? (p.Value.IsMan ? 1UL : 2UL)
                    : (p.Value.IsMan ? 3UL : 4UL);
                hash = hash * 67UL + (ulong)sq * 5UL + pieceVal;
            }
            else
            {
                hash = hash * 67UL;
            }
        }
        return hash;
    }
}
