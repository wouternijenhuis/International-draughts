using International.Draughts.Application.Interfaces;
using System.IO.Compression;
using System.Text;

namespace International.Draughts.Infrastructure.Evaluation;

/// <summary>
/// Evaluation weights loaded from external data files.
/// Supports machine-learned or pre-optimized weight parameters.
/// Compatible with the eval.cpp weight file format.
/// </summary>
public class LearnedEvaluationWeights : IEvaluationWeights
{
    private readonly Dictionary<string, int> _weights;
    private readonly Dictionary<string, int>? _patterns;
    
    public int ManValue { get; }
    public int KingValue { get; }
    public int FirstKingBonus { get; }
    
    public int CenterControlBonus { get; }
    public int AdvancedPieceBonus { get; }
    public int BackRankPenalty { get; }
    
    public int KingMobilityValue { get; }
    
    public int TempoDiagonal { get; }
    public int EndgameKingAdvantage { get; }
    
    public Dictionary<string, int>? PatternWeights => _patterns;
    
    public bool IsCustomWeights => true;
    
    /// <summary>
    /// Load evaluation weights from a file.
    /// </summary>
    /// <param name="filePath">Path to the weights file</param>
    /// <param name="compressed">Whether the file is GZip compressed</param>
    public LearnedEvaluationWeights(string filePath, bool compressed = false)
    {
        _weights = new Dictionary<string, int>();
        
        try
        {
            LoadWeightsFromFile(filePath, compressed);
            
            // Extract standard weights
            ManValue = GetWeight("man_value", 100);
            KingValue = GetWeight("king_value", 300);
            FirstKingBonus = GetWeight("first_king_bonus", 50);
            
            CenterControlBonus = GetWeight("center_control", 5);
            AdvancedPieceBonus = GetWeight("advancement", 3);
            BackRankPenalty = GetWeight("back_rank_penalty", 10);
            
            KingMobilityValue = GetWeight("king_mobility", 2);
            
            TempoDiagonal = GetWeight("tempo_diagonal", 2);
            EndgameKingAdvantage = GetWeight("endgame_king_advantage", 20);
            
            // Load pattern weights if present
            _patterns = LoadPatternWeights();
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException(
                $"Failed to load evaluation weights from '{filePath}': {ex.Message}", ex);
        }
    }
    
    /// <summary>
    /// Create weights from a dictionary (for testing or manual configuration).
    /// </summary>
    public LearnedEvaluationWeights(Dictionary<string, int> weights)
    {
        _weights = weights;
        
        ManValue = GetWeight("man_value", 100);
        KingValue = GetWeight("king_value", 300);
        FirstKingBonus = GetWeight("first_king_bonus", 50);
        
        CenterControlBonus = GetWeight("center_control", 5);
        AdvancedPieceBonus = GetWeight("advancement", 3);
        BackRankPenalty = GetWeight("back_rank_penalty", 10);
        
        KingMobilityValue = GetWeight("king_mobility", 2);
        
        TempoDiagonal = GetWeight("tempo_diagonal", 2);
        EndgameKingAdvantage = GetWeight("endgame_king_advantage", 20);
        
        _patterns = LoadPatternWeights();
    }
    
    /// <summary>
    /// Load weights from a file.
    /// File format: each line is "weight_name=value" or "weight_name value"
    /// Lines starting with # are comments.
    /// </summary>
    private void LoadWeightsFromFile(string filePath, bool compressed)
    {
        using var fileStream = File.OpenRead(filePath);
        Stream stream = fileStream;
        
        if (compressed)
        {
            stream = new GZipStream(fileStream, CompressionMode.Decompress, leaveOpen: false);
        }
        
        using (stream)
        using (var reader = new StreamReader(stream, Encoding.UTF8))
        {
            string? line;
            int lineNum = 0;
            
            while ((line = reader.ReadLine()) != null)
            {
                lineNum++;
                line = line.Trim();
                
                // Skip empty lines and comments
                if (string.IsNullOrEmpty(line) || line.StartsWith('#'))
                    continue;
                
                // Parse line: "name=value" or "name value"
                string[] parts = line.Contains('=') 
                    ? line.Split('=', 2) 
                    : line.Split(new[] { ' ', '\t' }, 2, StringSplitOptions.RemoveEmptyEntries);
                
                if (parts.Length != 2)
                {
                    System.Console.WriteLine($"Warning: Skipping invalid line {lineNum}: {line}");
                    continue;
                }
                
                string name = parts[0].Trim();
                if (int.TryParse(parts[1].Trim(), out int value))
                {
                    _weights[name] = value;
                }
                else
                {
                    System.Console.WriteLine($"Warning: Invalid value on line {lineNum}: {line}");
                }
            }
        }
        
        System.Console.WriteLine($"Loaded {_weights.Count} evaluation weights from {filePath}");
    }
    
    /// <summary>
    /// Get a weight value with a default fallback.
    /// </summary>
    private int GetWeight(string name, int defaultValue)
    {
        return _weights.TryGetValue(name, out int value) ? value : defaultValue;
    }
    
    /// <summary>
    /// Load pattern weights (weights starting with "pattern_").
    /// </summary>
    private Dictionary<string, int>? LoadPatternWeights()
    {
        var patterns = _weights
            .Where(kvp => kvp.Key.StartsWith("pattern_"))
            .ToDictionary(kvp => kvp.Key, kvp => kvp.Value);
        
        return patterns.Count > 0 ? patterns : null;
    }
    
    /// <summary>
    /// Static factory method to safely load weights with fallback to defaults.
    /// </summary>
    public static IEvaluationWeights LoadOrDefault(string filePath, bool compressed = false)
    {
        try
        {
            if (File.Exists(filePath))
            {
                return new LearnedEvaluationWeights(filePath, compressed);
            }
            else
            {
                Console.WriteLine($"Weights file not found: {filePath}. Using default weights.");
                return new DefaultEvaluationWeights();
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to load weights from {filePath}: {ex.Message}");
            Console.WriteLine("Using default weights.");
            return new DefaultEvaluationWeights();
        }
    }
}
