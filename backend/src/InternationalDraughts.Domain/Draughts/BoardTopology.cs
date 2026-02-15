using System.Collections.Immutable;

namespace InternationalDraughts.Domain.Draughts;

/// <summary>
/// The four diagonal directions on the board.
/// </summary>
public enum Direction
{
    NorthEast, // up-right (decreasing row, increasing col)
    NorthWest, // up-left (decreasing row, decreasing col)
    SouthEast, // down-right (increasing row, increasing col)
    SouthWest  // down-left (increasing row, decreasing col)
}

/// <summary>
/// Precomputed board topology for the 10×10 international draughts board.
/// FMJD numbering: squares 1-50 on dark squares.
/// </summary>
public static class BoardTopology
{
    public static readonly Direction[] AllDirections =
        [Direction.NorthEast, Direction.NorthWest, Direction.SouthEast, Direction.SouthWest];

    /// <summary>Forward directions for White (north) and Black (south) per FMJD convention.</summary>
    public static Direction[] ForwardDirections(PieceColor color) =>
        color == PieceColor.White
            ? [Direction.NorthEast, Direction.NorthWest]
            : [Direction.SouthEast, Direction.SouthWest];

    /// <summary>Promotion row for each color (White promotes on row 0, Black on row 9) per FMJD convention.</summary>
    public static int PromotionRow(PieceColor color) =>
        color == PieceColor.White ? 0 : 9;

    /// <summary>Adjacent square in a given direction, or -1 if at board edge.</summary>
    public static int Adjacent(int square, Direction direction) =>
        _adjacent[square, (int)direction];

    /// <summary>Diagonal ray from a square in a given direction (excluding the square itself).</summary>
    public static int[] GetRay(int square, Direction direction) =>
        _rayData[square * 4 + (int)direction];

    /// <summary>Converts FMJD square number (1-50) to (row, col) coordinates.</summary>
    public static (int Row, int Col) SquareToCoord(int square)
    {
        int index = square - 1;
        int row = index / 5;
        int posInRow = index % 5;
        int col = row % 2 == 0 ? posInRow * 2 + 1 : posInRow * 2;
        return (row, col);
    }

    /// <summary>Converts (row, col) to FMJD square number, or -1 if not a dark square.</summary>
    public static int CoordToSquare(int row, int col)
    {
        if (row < 0 || row > 9 || col < 0 || col > 9) return -1;
        bool isEvenRow = row % 2 == 0;
        bool isDark = isEvenRow ? col % 2 == 1 : col % 2 == 0;
        if (!isDark) return -1;
        int posInRow = isEvenRow ? (col - 1) / 2 : col / 2;
        return row * 5 + posInRow + 1;
    }

    /// <summary>Whether a square is a promotion square for the given color.</summary>
    public static bool IsPromotionSquare(int square, PieceColor color)
    {
        var (row, _) = SquareToCoord(square);
        return row == PromotionRow(color);
    }

    /// <summary>Center squares (bonus value for evaluation).</summary>
    public static readonly ImmutableHashSet<int> CenterSquares =
        ImmutableHashSet.Create(17, 18, 19, 22, 23, 24, 27, 28, 29, 32, 33, 34);

    /// <summary>Inner center squares (extra bonus).</summary>
    public static readonly ImmutableHashSet<int> InnerCenter =
        ImmutableHashSet.Create(22, 23, 24, 28, 29);

    /// <summary>Back row squares for each color (where pieces start) per FMJD convention.</summary>
    public static readonly ImmutableHashSet<int> WhiteBackRow = ImmutableHashSet.Create(46, 47, 48, 49, 50);
    public static readonly ImmutableHashSet<int> BlackBackRow = ImmutableHashSet.Create(1, 2, 3, 4, 5);

    // Precomputed adjacency: [square, direction] → adjacent square (-1 = none)
    private static readonly int[,] _adjacent = new int[51, 4];

    // Precomputed rays: [square * 4 + direction] → array of squares along the ray
    private static readonly int[][] _rayData = new int[51 * 4][];

    // Actual storage for rays

    static BoardTopology()
    {
        var (dRow, dCol) = (new int[4], new int[4]);
        dRow[(int)Direction.NorthEast] = -1; dCol[(int)Direction.NorthEast] = 1;
        dRow[(int)Direction.NorthWest] = -1; dCol[(int)Direction.NorthWest] = -1;
        dRow[(int)Direction.SouthEast] = 1; dCol[(int)Direction.SouthEast] = 1;
        dRow[(int)Direction.SouthWest] = 1; dCol[(int)Direction.SouthWest] = -1;

        for (int sq = 1; sq <= 50; sq++)
        {
            var (row, col) = SquareToCoord(sq);

            for (int d = 0; d < 4; d++)
            {
                // Compute ray
                var ray = new List<int>();
                int r = row + dRow[d], c = col + dCol[d];
                while (r >= 0 && r <= 9 && c >= 0 && c <= 9)
                {
                    int target = CoordToSquare(r, c);
                    if (target > 0) ray.Add(target);
                    r += dRow[d];
                    c += dCol[d];
                }

                _rayData[sq * 4 + d] = ray.ToArray();
                _adjacent[sq, d] = ray.Count > 0 ? ray[0] : -1;
            }
        }
    }
}
