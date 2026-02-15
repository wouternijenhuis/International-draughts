using FluentAssertions;
using InternationalDraughts.Application.ExpertAi;
using InternationalDraughts.Domain.Draughts;

namespace InternationalDraughts.Application.Tests.ExpertAi;

public class EvaluatorTests
{
    private readonly Evaluator _evaluator = new(new EvaluationWeights());

    #region Material Evaluation

    [Fact]
    public void Evaluate_MaterialAdvantage_ReturnsPositiveScore()
    {
        // White has more regular pieces than Black → positive score from White's perspective
        var board = BoardPosition.Empty()
            .SetPiece(25, DraughtsPiece.WhiteMan)
            .SetPiece(26, DraughtsPiece.WhiteMan)
            .SetPiece(40, DraughtsPiece.BlackMan);

        var score = _evaluator.Evaluate(board, PieceColor.White);
        score.Should().BeGreaterThan(0);
    }

    [Fact]
    public void Evaluate_MaterialDisadvantage_ReturnsNegativeScore()
    {
        // White has fewer regular pieces than Black → negative score from White's perspective
        var board = BoardPosition.Empty()
            .SetPiece(25, DraughtsPiece.WhiteMan)
            .SetPiece(40, DraughtsPiece.BlackMan)
            .SetPiece(41, DraughtsPiece.BlackMan);

        var score = _evaluator.Evaluate(board, PieceColor.White);
        score.Should().BeLessThan(0);
    }

    [Fact]
    public void Evaluate_KingWorthMoreThanMan()
    {
        // One white king vs one black regular piece — king is worth more
        var boardWithKing = BoardPosition.Empty()
            .SetPiece(25, DraughtsPiece.WhiteKing)
            .SetPiece(40, DraughtsPiece.BlackMan);

        var boardWithMan = BoardPosition.Empty()
            .SetPiece(25, DraughtsPiece.WhiteMan)
            .SetPiece(40, DraughtsPiece.BlackMan);

        var scoreKing = _evaluator.Evaluate(boardWithKing, PieceColor.White);
        var scoreMan = _evaluator.Evaluate(boardWithMan, PieceColor.White);

        scoreKing.Should().BeGreaterThan(scoreMan);
    }

    [Fact]
    public void Evaluate_EqualMaterial_ScoreNearZero()
    {
        // Symmetric position: equal material
        var board = BoardPosition.Empty()
            .SetPiece(23, DraughtsPiece.WhiteMan)
            .SetPiece(28, DraughtsPiece.BlackMan);

        var score = _evaluator.Evaluate(board, PieceColor.White);

        // Should be close to zero (small positional differences allowed)
        Math.Abs(score).Should().BeLessThan(100);
    }

    [Fact]
    public void Evaluate_AllOpponentPiecesCaptured_ReturnsWinScore()
    {
        // White has pieces, Black has none → win
        var board = BoardPosition.Empty()
            .SetPiece(25, DraughtsPiece.WhiteMan);

        var score = _evaluator.Evaluate(board, PieceColor.White);
        score.Should().Be(10_000); // WinScore
    }

    [Fact]
    public void Evaluate_AllPlayerPiecesCaptured_ReturnsLossScore()
    {
        // White has no pieces, Black has some → loss from White's perspective
        var board = BoardPosition.Empty()
            .SetPiece(40, DraughtsPiece.BlackMan);

        var score = _evaluator.Evaluate(board, PieceColor.White);
        score.Should().Be(-10_000); // LossScore
    }

    #endregion

    #region Positional Evaluation

    [Fact]
    public void Evaluate_CenterControl_BonusForCenterPieces()
    {
        // Piece on center square vs piece on edge — center should score higher
        var boardCenter = BoardPosition.Empty()
            .SetPiece(23, DraughtsPiece.WhiteMan) // center square
            .SetPiece(46, DraughtsPiece.BlackMan);

        var boardEdge = BoardPosition.Empty()
            .SetPiece(6, DraughtsPiece.WhiteMan) // edge square (row 1, col 0)
            .SetPiece(46, DraughtsPiece.BlackMan);

        var scoreCenter = _evaluator.Evaluate(boardCenter, PieceColor.White);
        var scoreEdge = _evaluator.Evaluate(boardEdge, PieceColor.White);

        scoreCenter.Should().BeGreaterThan(scoreEdge);
    }

    [Fact]
    public void Evaluate_Advancement_FurtherForwardIsBetter()
    {
        // White regular piece further advanced (closer to row 0 = promotion) should score better
        var boardAdvanced = BoardPosition.Empty()
            .SetPiece(13, DraughtsPiece.WhiteMan) // row 2 — close to promotion (row 0)
            .SetPiece(40, DraughtsPiece.BlackMan);  // row 7

        var boardBack = BoardPosition.Empty()
            .SetPiece(38, DraughtsPiece.WhiteMan) // row 7 — far from promotion
            .SetPiece(40, DraughtsPiece.BlackMan);  // row 7

        var scoreAdvanced = _evaluator.Evaluate(boardAdvanced, PieceColor.White);
        var scoreBack = _evaluator.Evaluate(boardBack, PieceColor.White);

        scoreAdvanced.Should().BeGreaterThan(scoreBack);
    }

    [Fact]
    public void Evaluate_FirstKingBonus_WhenOnlyOnePlayerHasKings()
    {
        // White has a king, Black has none → first king advantage bonus
        var boardWithKing = BoardPosition.Empty()
            .SetPiece(25, DraughtsPiece.WhiteKing)
            .SetPiece(40, DraughtsPiece.BlackMan)
            .SetPiece(41, DraughtsPiece.BlackMan);

        var boardWithoutKing = BoardPosition.Empty()
            .SetPiece(25, DraughtsPiece.WhiteMan)
            .SetPiece(40, DraughtsPiece.BlackMan)
            .SetPiece(41, DraughtsPiece.BlackMan);

        var scoreWithKing = _evaluator.Evaluate(boardWithKing, PieceColor.White);
        var scoreWithoutKing = _evaluator.Evaluate(boardWithoutKing, PieceColor.White);

        // The king version should be significantly higher due to king value + first king advantage bonus
        (scoreWithKing - scoreWithoutKing).Should().BeGreaterThan(200);
    }

    #endregion

    #region QuickEvaluate

    [Fact]
    public void QuickEvaluate_MaterialOnly()
    {
        var board = BoardPosition.Empty()
            .SetPiece(10, DraughtsPiece.WhiteMan)
            .SetPiece(11, DraughtsPiece.WhiteMan)
            .SetPiece(40, DraughtsPiece.BlackMan);

        var score = _evaluator.QuickEvaluate(board, PieceColor.White);
        // 2 white regular pieces - 1 black regular piece = +1 regular piece value = +100
        score.Should().Be(100);
    }

    [Fact]
    public void QuickEvaluate_KingsCountedCorrectly()
    {
        var board = BoardPosition.Empty()
            .SetPiece(10, DraughtsPiece.WhiteKing)
            .SetPiece(40, DraughtsPiece.BlackMan);

        var score = _evaluator.QuickEvaluate(board, PieceColor.White);
        // 1 white king (300) - 1 black regular piece (100) = +200
        score.Should().Be(200);
    }

    [Fact]
    public void QuickEvaluate_SymmetricPosition_ReturnsZero()
    {
        var board = BoardPosition.Empty()
            .SetPiece(10, DraughtsPiece.WhiteMan)
            .SetPiece(40, DraughtsPiece.BlackMan);

        var score = _evaluator.QuickEvaluate(board, PieceColor.White);
        score.Should().Be(0);
    }

    #endregion

    #region Symmetry

    [Fact]
    public void Evaluate_SymmetricScore_OppositeForDifferentPlayers()
    {
        // For in a position, evaluating as White and as Black should give opposite signs
        // (approximately — positional differences may cause slight asymmetry)
        var board = BoardPosition.Empty()
            .SetPiece(23, DraughtsPiece.WhiteMan)
            .SetPiece(28, DraughtsPiece.BlackMan);

        var scoreWhite = _evaluator.Evaluate(board, PieceColor.White);
        var scoreBlack = _evaluator.Evaluate(board, PieceColor.Black);

        // They should be approximately opposite
        (scoreWhite + scoreBlack).Should().BeInRange(-50, 50);
    }

    #endregion

    #region Custom Weights

    [Fact]
    public void Evaluate_CustomWeights_AffectsScore()
    {
        var heavyWeights = new EvaluationWeights { ManValue = 500 };
        var lightWeights = new EvaluationWeights { ManValue = 50 };

        var heavyEval = new Evaluator(heavyWeights);
        var lightEval = new Evaluator(lightWeights);

        var board = BoardPosition.Empty()
            .SetPiece(10, DraughtsPiece.WhiteMan)
            .SetPiece(11, DraughtsPiece.WhiteMan)
            .SetPiece(40, DraughtsPiece.BlackMan);

        var heavyScore = heavyEval.Evaluate(board, PieceColor.White);
        var lightScore = lightEval.Evaluate(board, PieceColor.White);

        heavyScore.Should().BeGreaterThan(lightScore);
    }

    #endregion
}
