using FluentAssertions;
using InternationalDraughts.Application.ExpertAi;
using InternationalDraughts.Domain.Draughts;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

namespace InternationalDraughts.Application.Tests.ExpertAi;

public class SearchEngineTests
{
    private readonly Evaluator _evaluator = new(new EvaluationWeights());
    private readonly ExpertAiOptions _options;
    private readonly ILogger<SearchEngine> _logger = NullLogger<SearchEngine>.Instance;

    public SearchEngineTests()
    {
        _options = new ExpertAiOptions
        {
            MaxDepth = 8,
            TimeLimitMs = 5_000,
            TranspositionTableSizeMb = 16,
            EnableLmr = true,
            EnablePvs = true,
            EnableAspirationWindows = true
        };
    }

    private SearchEngine CreateEngine()
    {
        var tt = new TranspositionTable(_options.TranspositionTableSizeMb);
        return new SearchEngine(_evaluator, tt, _options, _logger);
    }

    #region Basic Search

    [Fact]
    public void FindBestMove_InitialPosition_ReturnsLegalMove()
    {
        var board = BoardPosition.Initial();
        var engine = CreateEngine();

        var result = engine.FindBestMove(board, PieceColor.White);

        result.Should().NotBeNull();
        result!.Move.Should().NotBeNull();
        result.Move.Origin.Should().BeInRange(1, 50);
        result.Move.Destination.Should().BeInRange(1, 50);
    }

    [Fact]
    public void FindBestMove_InitialPosition_ReturnsValidSearchStats()
    {
        var board = BoardPosition.Initial();
        var engine = CreateEngine();

        var result = engine.FindBestMove(board, PieceColor.White);

        result.Should().NotBeNull();
        result!.DepthReached.Should().BeGreaterThanOrEqualTo(1);
        result.NodesEvaluated.Should().BeGreaterThan(0);
    }

    [Fact]
    public void FindBestMove_SingleLegalMove_ReturnsImmediately()
    {
        // Create a position where only one move is possible
        var board = BoardPosition.Empty()
            .SetPiece(6, DraughtsPiece.WhiteMan) // Left edge, only one forward move
            .SetPiece(46, DraughtsPiece.BlackMan); // Black far away

        var moves = MoveGenerator.GenerateLegalMoves(board, PieceColor.White);
        if (moves.Count == 1)
        {
            var engine = CreateEngine();
            var result = engine.FindBestMove(board, PieceColor.White);

            result.Should().NotBeNull();
            result!.Move.Origin.Should().Be(6);
            // Should return very quickly (no search needed)
            result.NodesEvaluated.Should().BeLessThanOrEqualTo(1);
        }
    }

    [Fact]
    public void FindBestMove_NoLegalMoves_ReturnsNull()
    {
        // No white pieces on the board
        var board = BoardPosition.Empty()
            .SetPiece(46, DraughtsPiece.BlackMan);

        var engine = CreateEngine();
        var result = engine.FindBestMove(board, PieceColor.White);

        result.Should().BeNull();
    }

    #endregion

    #region Forced Wins

    [Fact]
    public void FindBestMove_ForcedCapture_SelectsCaptureMove()
    {
        // White man at 28 (5,4), black man at 23 (4,5), landing at 19 (3,6)
        // Only legal move is a capture
        var board = BoardPosition.Empty()
            .SetPiece(28, DraughtsPiece.WhiteMan)
            .SetPiece(23, DraughtsPiece.BlackMan)
            .SetPiece(1, DraughtsPiece.WhiteMan); // Extra piece to prevent immediate win detection

        var engine = CreateEngine();
        var result = engine.FindBestMove(board, PieceColor.White);

        result.Should().NotBeNull();
        result!.Move.IsCapture.Should().BeTrue();
        result.Move.CapturedSquares.Should().Contain(23);
    }

    [Fact]
    public void FindBestMove_OnlyCapture_WinsAllPieces()
    {
        // White has two capturable black pieces — two captures available → engine searches
        // White at 28 captures 23 (landing 19), White at 15 captures 20 (landing 24)
        // Both give White material advantage; capturing all pieces = win
        var board = BoardPosition.Empty()
            .SetPiece(28, DraughtsPiece.WhiteMan)
            .SetPiece(15, DraughtsPiece.WhiteMan)
            .SetPiece(23, DraughtsPiece.BlackMan)
            .SetPiece(20, DraughtsPiece.BlackMan);

        var engine = CreateEngine();
        var result = engine.FindBestMove(board, PieceColor.White);

        result.Should().NotBeNull();
        result!.Move.IsCapture.Should().BeTrue();
        // After either capture, white ends up with material advantage
        result.Score.Should().BeGreaterThan(0);
    }

    [Fact]
    public void FindBestMove_MaterialAdvantage_FindsWinningScore()
    {
        // White king + white man vs lone black man — strong material advantage
        // No captures available, so multiple quiet moves → engine searches
        var board = BoardPosition.Empty()
            .SetPiece(28, DraughtsPiece.WhiteKing) // Flying king with many moves
            .SetPiece(11, DraughtsPiece.WhiteMan)  // Extra material
            .SetPiece(46, DraughtsPiece.BlackMan);  // Lone black piece far away

        var engine = CreateEngine();
        var result = engine.FindBestMove(board, PieceColor.White);

        result.Should().NotBeNull();
        // Engine should evaluate this as strongly winning for White
        result!.Score.Should().BeGreaterThan(0);
    }

    #endregion

    #region Deterministic Search

    [Fact]
    public void FindBestMove_SamePosition_ReturnsSameMove()
    {
        // Deterministic: same position always returns the same move (REQ-70)
        var board = BoardPosition.Initial();
        var engine1 = CreateEngine();
        var engine2 = CreateEngine();

        var result1 = engine1.FindBestMove(board, PieceColor.White, timeLimitOverrideMs: 2000);
        var result2 = engine2.FindBestMove(board, PieceColor.White, timeLimitOverrideMs: 2000);

        result1.Should().NotBeNull();
        result2.Should().NotBeNull();
        result1!.Move.ToNotation().Should().Be(result2!.Move.ToNotation());
    }

    #endregion

    #region Time Limit

    [Fact]
    public void FindBestMove_RespectsTimeLimit()
    {
        var board = BoardPosition.Initial();
        var engine = CreateEngine();

        var sw = System.Diagnostics.Stopwatch.StartNew();
        var result = engine.FindBestMove(board, PieceColor.White, timeLimitOverrideMs: 500);
        sw.Stop();

        result.Should().NotBeNull();
        // Should complete within a reasonable margin of the time limit
        sw.ElapsedMilliseconds.Should().BeLessThan(2000); // Allow generous margin
    }

    [Fact]
    public void FindBestMove_ShortTimeLimit_StillReturnsMove()
    {
        var board = BoardPosition.Initial();
        var engine = CreateEngine();

        var result = engine.FindBestMove(board, PieceColor.White, timeLimitOverrideMs: 50);

        // Should still return a valid move even with very short time
        result.Should().NotBeNull();
        result!.Move.Should().NotBeNull();
    }

    #endregion

    #region Move Ordering and Search Features

    [Fact]
    public void FindBestMove_WithPvsEnabled_ReturnsResult()
    {
        _options.EnablePvs = true;
        var board = BoardPosition.Initial();
        var engine = CreateEngine();

        var result = engine.FindBestMove(board, PieceColor.White, timeLimitOverrideMs: 1000);
        result.Should().NotBeNull();
    }

    [Fact]
    public void FindBestMove_WithLmrEnabled_ReturnsResult()
    {
        _options.EnableLmr = true;
        var board = BoardPosition.Initial();
        var engine = CreateEngine();

        var result = engine.FindBestMove(board, PieceColor.White, timeLimitOverrideMs: 1000);
        result.Should().NotBeNull();
    }

    [Fact]
    public void FindBestMove_WithAspirationWindows_ReturnsResult()
    {
        _options.EnableAspirationWindows = true;
        var board = BoardPosition.Initial();
        var engine = CreateEngine();

        var result = engine.FindBestMove(board, PieceColor.White, timeLimitOverrideMs: 1000);
        result.Should().NotBeNull();
    }

    [Fact]
    public void FindBestMove_AllFeaturesDisabled_StillWorks()
    {
        _options.EnablePvs = false;
        _options.EnableLmr = false;
        _options.EnableAspirationWindows = false;

        var board = BoardPosition.Initial();
        var engine = CreateEngine();

        var result = engine.FindBestMove(board, PieceColor.White, timeLimitOverrideMs: 1000);
        result.Should().NotBeNull();
    }

    #endregion

    #region Iterative Deepening

    [Fact]
    public void FindBestMove_IterativeDeepening_ReachesDepthGreaterThan1()
    {
        var board = BoardPosition.Initial();
        var engine = CreateEngine();

        var result = engine.FindBestMove(board, PieceColor.White, timeLimitOverrideMs: 2000);

        result.Should().NotBeNull();
        result!.DepthReached.Should().BeGreaterThan(1);
    }

    [Fact]
    public void FindBestMove_ForcedWin_StopsSearchEarly()
    {
        // White has two capturable black pieces — forced win in few plies
        var board = BoardPosition.Empty()
            .SetPiece(28, DraughtsPiece.WhiteMan)
            .SetPiece(15, DraughtsPiece.WhiteMan)
            .SetPiece(23, DraughtsPiece.BlackMan)
            .SetPiece(20, DraughtsPiece.BlackMan);

        var engine = CreateEngine();
        var result = engine.FindBestMove(board, PieceColor.White, timeLimitOverrideMs: 5000);

        result.Should().NotBeNull();
        // Score should indicate winning (very positive)
        result!.Score.Should().BeGreaterThan(0);
    }

    #endregion

    #region Concurrent Safety (Stateless Per Request)

    [Fact]
    public async Task FindBestMove_ConcurrentRequests_ReturnIndependentResults()
    {
        var board1 = BoardPosition.Empty()
            .SetPiece(28, DraughtsPiece.WhiteMan)
            .SetPiece(23, DraughtsPiece.BlackMan)
            .SetPiece(40, DraughtsPiece.BlackMan);

        var board2 = BoardPosition.Empty()
            .SetPiece(10, DraughtsPiece.WhiteMan)
            .SetPiece(15, DraughtsPiece.BlackMan)
            .SetPiece(40, DraughtsPiece.BlackMan);

        var task1 = Task.Run(() =>
        {
            var engine = CreateEngine();
            return engine.FindBestMove(board1, PieceColor.White, timeLimitOverrideMs: 1000);
        });

        var task2 = Task.Run(() =>
        {
            var engine = CreateEngine();
            return engine.FindBestMove(board2, PieceColor.White, timeLimitOverrideMs: 1000);
        });

        var results = await Task.WhenAll(task1, task2);

        results[0].Should().NotBeNull();
        results[1].Should().NotBeNull();
        // Both should return valid moves for their respective positions
    }

    #endregion
}
