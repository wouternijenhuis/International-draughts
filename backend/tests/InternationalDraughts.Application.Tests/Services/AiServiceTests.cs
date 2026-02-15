using FluentAssertions;
using InternationalDraughts.Application.ExpertAi;
using InternationalDraughts.Application.Interfaces;
using InternationalDraughts.Application.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

namespace InternationalDraughts.Application.Tests.Services;

public class AiServiceTests
{
    private readonly AiService _service;

    public AiServiceTests()
    {
        var weights = new EvaluationWeights();
        var evaluator = new Evaluator(weights);
        var options = new ExpertAiOptions
        {
            MaxDepth = 6,
            TimeLimitMs = 5_000,
            TranspositionTableSizeMb = 8
        };

        _service = new AiService(
            evaluator,
            options,
            NullLogger<AiService>.Instance,
            NullLogger<SearchEngine>.Instance);
    }

    #region Valid Requests

    [Fact]
    public async Task GetBestMoveAsync_InitialPosition_ReturnsLegalMove()
    {
        var board = CreateInitialBoardArray();

        var request = new AiMoveRequest(board, "white", "expert");
        var response = await _service.GetBestMoveAsync(request);

        response.Should().NotBeNull();
        response.From.Should().BeInRange(1, 50);
        response.To.Should().BeInRange(1, 50);
        response.Notation.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task GetBestMoveAsync_BlackPlayer_ReturnsLegalMove()
    {
        var board = CreateInitialBoardArray();

        var request = new AiMoveRequest(board, "black", "expert");
        var response = await _service.GetBestMoveAsync(request);

        response.Should().NotBeNull();
        response.From.Should().BeInRange(1, 20); // Black pieces are at 1-20
    }

    [Fact]
    public async Task GetBestMoveAsync_CaseInsensitivePlayer()
    {
        var board = CreateInitialBoardArray();

        var request = new AiMoveRequest(board, "WHITE", "expert");
        var response = await _service.GetBestMoveAsync(request);

        response.Should().NotBeNull();
    }

    [Fact]
    public async Task GetBestMoveAsync_WithTimeLimit_RespectsLimit()
    {
        var board = CreateInitialBoardArray();

        var request = new AiMoveRequest(board, "white", "expert", TimeLimitMs: 500);
        var sw = System.Diagnostics.Stopwatch.StartNew();
        var response = await _service.GetBestMoveAsync(request);
        sw.Stop();

        response.Should().NotBeNull();
        sw.ElapsedMilliseconds.Should().BeLessThan(3000); // Generous margin
    }

    #endregion

    #region Response Structure

    [Fact]
    public async Task GetBestMoveAsync_ResponseContainsRequiredFields()
    {
        var board = CreateInitialBoardArray();

        var request = new AiMoveRequest(board, "white", "expert");
        var response = await _service.GetBestMoveAsync(request);

        response.Notation.Should().NotBeNullOrEmpty();
        response.From.Should().BeInRange(1, 50);
        response.To.Should().BeInRange(1, 50);
        response.CapturedSquares.Should().NotBeNull();
        response.DepthReached.Should().BeGreaterThanOrEqualTo(1);
        response.TimeConsumedMs.Should().BeGreaterThanOrEqualTo(0);
    }

    [Fact]
    public async Task GetBestMoveAsync_CapturePosition_ReturnsCapturedSquares()
    {
        // Set up a position with mandatory capture
        var board = new int[51];
        board[28] = 1; // White man
        board[23] = 2; // Black man (capturable)

        var request = new AiMoveRequest(board, "white", "expert");
        var response = await _service.GetBestMoveAsync(request);

        response.CapturedSquares.Should().NotBeEmpty();
        response.CapturedSquares.Should().Contain(23);
    }

    [Fact]
    public async Task GetBestMoveAsync_QuietPosition_NoCapturedSquares()
    {
        var board = CreateInitialBoardArray();

        var request = new AiMoveRequest(board, "white", "expert");
        var response = await _service.GetBestMoveAsync(request);

        response.CapturedSquares.Should().BeEmpty();
    }

    #endregion

    #region Error Handling

    [Fact]
    public async Task GetBestMoveAsync_InvalidPlayer_ThrowsInvalidOperation()
    {
        var board = CreateInitialBoardArray();

        var request = new AiMoveRequest(board, "green", "expert");

        var act = () => _service.GetBestMoveAsync(request);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Invalid player color*");
    }

    [Fact]
    public async Task GetBestMoveAsync_NoPiecesForPlayer_ThrowsInvalidOperation()
    {
        // Board with only black pieces, asking for white's move
        var board = new int[51];
        board[40] = 2; // Only black man

        var request = new AiMoveRequest(board, "white", "expert");

        var act = () => _service.GetBestMoveAsync(request);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*No pieces*");
    }

    [Fact]
    public async Task GetBestMoveAsync_EmptyBoard_WhiteThrowsInvalidOperation()
    {
        var board = new int[51];

        var request = new AiMoveRequest(board, "white", "expert");

        var act = () => _service.GetBestMoveAsync(request);
        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    #endregion

    #region Stateless Contract (REQ-70)

    [Fact]
    public async Task GetBestMoveAsync_DifferentPositions_IndependentResults()
    {
        // Two completely different positions should return independent results
        var board1 = new int[51];
        board1[28] = 1; // White man
        board1[23] = 2; // Black man
        board1[1] = 1;  // Another white man

        var board2 = new int[51];
        board2[10] = 1; // White man in different position
        board2[15] = 2; // Black man
        board2[1] = 1;

        var request1 = new AiMoveRequest(board1, "white", "expert");
        var request2 = new AiMoveRequest(board2, "white", "expert");

        var response1 = await _service.GetBestMoveAsync(request1);
        var response2 = await _service.GetBestMoveAsync(request2);

        // At least one field should differ between the two responses
        (response1.From != response2.From || response1.To != response2.To)
            .Should().BeTrue("different positions should produce different moves");
    }

    [Fact]
    public async Task GetBestMoveAsync_SamePosition_SameResult()
    {
        var board = CreateInitialBoardArray();

        var request = new AiMoveRequest(board, "white", "expert", TimeLimitMs: 2000);

        var response1 = await _service.GetBestMoveAsync(request);
        var response2 = await _service.GetBestMoveAsync(request);

        response1.Notation.Should().Be(response2.Notation,
            because: "deterministic search should return the same move");
    }

    #endregion

    #region Concurrent Requests (REQ-70)

    [Fact]
    public async Task GetBestMoveAsync_ConcurrentRequests_HandleCorrectly()
    {
        var board = CreateInitialBoardArray();
        var request = new AiMoveRequest(board, "white", "expert", TimeLimitMs: 1000);

        var tasks = Enumerable.Range(0, 3)
            .Select(_ => _service.GetBestMoveAsync(request))
            .ToList();

        var results = await Task.WhenAll(tasks);

        results.Should().AllSatisfy(r =>
        {
            r.Should().NotBeNull();
            r.From.Should().BeInRange(1, 50);
            r.To.Should().BeInRange(1, 50);
        });
    }

    #endregion

    private static int[] CreateInitialBoardArray()
    {
        var board = new int[51];
        for (int i = 1; i <= 20; i++) board[i] = 2;   // Black men
        for (int i = 31; i <= 50; i++) board[i] = 1;   // White men
        return board;
    }
}
