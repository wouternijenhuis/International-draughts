using International.Draughts.Application.Interfaces;

namespace International.Draughts.Infrastructure.Evaluation;

/// <summary>
/// Default evaluation weights (hand-tuned heuristics).
/// These are the baseline weights used when no external weight file is provided.
/// </summary>
public class DefaultEvaluationWeights : IEvaluationWeights
{
    public int ManValue => 100;
    public int KingValue => 300;
    public int FirstKingBonus => 50;
    
    public int CenterControlBonus => 5;
    public int AdvancedPieceBonus => 3;
    public int BackRankPenalty => 10;
    
    public int KingMobilityValue => 2;
    
    public int TempoDiagonal => 2;
    public int EndgameKingAdvantage => 20;
    
    public Dictionary<string, int>? PatternWeights => null;
    
    public bool IsCustomWeights => false;
}
