namespace International.Draughts.Infrastructure.OpeningBook;

/// <summary>
/// Represents an entry in the opening book.
/// </summary>
internal class OpeningBookEntry
{
    public ulong PositionHash { get; set; }
    public int Score { get; set; }
    public bool IsNode { get; set; }
    public bool IsProcessed { get; set; }

    public OpeningBookEntry()
    {
        PositionHash = 0;
        Score = 0;
        IsNode = false;
        IsProcessed = false;
    }
}
