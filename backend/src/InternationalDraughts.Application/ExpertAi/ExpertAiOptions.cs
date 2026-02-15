namespace InternationalDraughts.Application.ExpertAi;

/// <summary>
/// Configuration for the Expert AI search engine.
/// All values are externalizable via appsettings.json.
/// </summary>
public sealed class ExpertAiOptions
{
    public const string SectionName = "ExpertAi";

    /// <summary>Maximum search depth in ply (default: 20 for expert).</summary>
    public int MaxDepth { get; set; } = 20;

    /// <summary>Default time limit per move in milliseconds (default: 30000 = 30s).</summary>
    public int TimeLimitMs { get; set; } = 30_000;

    /// <summary>Transposition table size in megabytes (default: 256).</summary>
    public int TranspositionTableSizeMb { get; set; } = 256;

    /// <summary>Enable Late Move Reductions (LMR).</summary>
    public bool EnableLmr { get; set; } = true;

    /// <summary>Enable Principal Variation Search (PVS).</summary>
    public bool EnablePvs { get; set; } = true;

    /// <summary>Enable aspiration windows.</summary>
    public bool EnableAspirationWindows { get; set; } = true;

    /// <summary>Aspiration window initial half-width in evaluation units.</summary>
    public int AspirationWindowSize { get; set; } = 50;

    /// <summary>Minimum depth for LMR to kick in.</summary>
    public int LmrMinDepth { get; set; } = 3;

    /// <summary>Minimum move index for LMR (first N moves are searched at full depth).</summary>
    public int LmrMinMoveIndex { get; set; } = 3;
}
