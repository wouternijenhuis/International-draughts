namespace International.Draughts.Application.Interfaces;

/// <summary>
/// Interface for evaluation weight providers.
/// Allows loading pre-trained evaluation weights from external data files.
/// </summary>
public interface IEvaluationWeights
{
    /// <summary>
    /// Material values
    /// </summary>
    int ManValue { get; }
    int KingValue { get; }
    int FirstKingBonus { get; }
    
    /// <summary>
    /// Positional weights
    /// </summary>
    int CenterControlBonus { get; }
    int AdvancedPieceBonus { get; }
    int BackRankPenalty { get; }
    
    /// <summary>
    /// Mobility weights
    /// </summary>
    int KingMobilityValue { get; }
    
    /// <summary>
    /// Strategic weights
    /// </summary>
    int TempoDiagonal { get; }
    int EndgameKingAdvantage { get; }
    
    /// <summary>
    /// Pattern weights (optional, can be null)
    /// </summary>
    Dictionary<string, int>? PatternWeights { get; }
    
    /// <summary>
    /// Gets if custom weights are loaded
    /// </summary>
    bool IsCustomWeights { get; }
}
