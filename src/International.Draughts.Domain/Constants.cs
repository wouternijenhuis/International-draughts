namespace International.Draughts.Domain;

/// <summary>
/// Core constants for the draughts engine.
/// </summary>
public static class Constants
{
    public const string EngineName = "Scan";
    public const string EngineVersion = "3.1 (.NET 9)";
    
    public const int FileSize = 10;
    public const int RankSize = 10;
    public const int DenseSize = FileSize * RankSize / 2; // 50 squares for pieces
    public const int SquareSize = 63; // 13x10 sparse board
    
    public const int MaxDepth = 99;
    public const int MaxPly = 99;
    
    public const double DefaultTimeLimit = 10.0; // seconds
}
