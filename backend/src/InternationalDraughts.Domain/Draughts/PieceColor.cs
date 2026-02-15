namespace InternationalDraughts.Domain.Draughts;

/// <summary>
/// The two player colors in international draughts.
/// </summary>
public enum PieceColor
{
    White,
    Black
}

public static class PieceColorExtensions
{
    /// <summary>
    /// Returns the opposite color.
    /// </summary>
    public static PieceColor Opposite(this PieceColor color) =>
        color == PieceColor.White ? PieceColor.Black : PieceColor.White;
}
