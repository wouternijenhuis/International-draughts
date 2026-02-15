namespace InternationalDraughts.Application.ExpertAi;

/// <summary>
/// Configuration for evaluation function weights.
/// Loaded from appsettings.json, allowing tuning without code changes (REQ-71).
/// </summary>
public sealed class EvaluationWeights
{
    public const string SectionName = "ExpertAi:Weights";

    // Material
    public int ManValue { get; set; } = 100;
    public int KingValue { get; set; } = 300;
    public int FirstKingBonus { get; set; } = 50;

    // Positional
    public int CenterControl { get; set; } = 5;
    public int InnerCenterBonus { get; set; } = 5;
    public int Advancement { get; set; } = 3;
    public int BackRowBonus { get; set; } = 8;
    public int KingCentralization { get; set; } = 4;

    // Mobility
    public int KingMobility { get; set; } = 2;
    public int ManMobility { get; set; } = 1;

    // Strategic — Expert-specific features
    public int LeftRightBalance { get; set; } = 3;
    public int LockedPositionPenalty { get; set; } = 10;
    public int RunawayManBonus { get; set; } = 30;
    public int TempoDiagonal { get; set; } = 2;
    public int EndgameKingAdvantage { get; set; } = 20;
    public int PieceStructure { get; set; } = 4;

    // Win/loss bounds
    public int WinScore { get; set; } = 10_000;
    public int LossScore { get; set; } = -10_000;
}
