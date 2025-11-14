using International.Draughts.Domain.Enums;

namespace International.Draughts.Infrastructure.Configuration;

/// <summary>
/// Configuration settings for the draughts engine.
/// </summary>
public class EngineConfiguration
{
    public Variant Variant { get; set; } = Variant.Normal;
    public bool UseOpeningBook { get; set; } = true;
    public int BookPly { get; set; } = 4;
    public int BookMargin { get; set; } = 1;
    public int Threads { get; set; } = 1;
    public int TranspositionTableSize { get; set; } = 26; // 2^26 entries = 1GB
    public int BitbaseSize { get; set; } = 6; // Maximum pieces for endgame bitbases
    public double DefaultTimeLimit { get; set; } = 10.0; // seconds
    
    // DXP Protocol settings
    public bool DxpServer { get; set; } = true;
    public string DxpHost { get; set; } = "127.0.0.1";
    public int DxpPort { get; set; } = 27531;
    public bool DxpInitiator { get; set; } = false;
    public int DxpTime { get; set; } = 5; // minutes
    public int DxpMoves { get; set; } = 0; // 0 = no limit
    public bool DxpBoard { get; set; } = true;
    public bool DxpSearch { get; set; } = true;
}
