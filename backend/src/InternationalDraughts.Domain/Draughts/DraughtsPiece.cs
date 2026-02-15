namespace InternationalDraughts.Domain.Draughts;

/// <summary>
/// Represents a piece on the board.
/// </summary>
public readonly record struct DraughtsPiece(DraughtsPieceType Type, PieceColor Color)
{
    public static DraughtsPiece WhiteMan => new(DraughtsPieceType.Man, PieceColor.White);
    public static DraughtsPiece BlackMan => new(DraughtsPieceType.Man, PieceColor.Black);
    public static DraughtsPiece WhiteKing => new(DraughtsPieceType.King, PieceColor.White);
    public static DraughtsPiece BlackKing => new(DraughtsPieceType.King, PieceColor.Black);

    public bool IsKing => Type == DraughtsPieceType.King;
    public bool IsMan => Type == DraughtsPieceType.Man;

    /// <summary>
    /// Returns a promoted version of this piece (regular piece → king).
    /// </summary>
    public DraughtsPiece Promote() => new(DraughtsPieceType.King, Color);
}
