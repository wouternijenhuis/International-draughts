using FluentAssertions;
using InternationalDraughts.Domain.Draughts;

namespace InternationalDraughts.Domain.Tests.Draughts;

public class BoardPositionTests
{
    #region Empty and Initial

    [Fact]
    public void Empty_AllSquaresAreNull()
    {
        var board = BoardPosition.Empty();
        for (int sq = 1; sq <= 50; sq++)
            board[sq].Should().BeNull();
    }

    [Fact]
    public void Initial_BlackPiecesOnSquares1To20()
    {
        var board = BoardPosition.Initial();
        for (int sq = 1; sq <= 20; sq++)
        {
            board[sq].Should().NotBeNull();
            board[sq]!.Value.Should().Be(DraughtsPiece.BlackMan);
        }
    }

    [Fact]
    public void Initial_MiddleSquaresEmpty()
    {
        var board = BoardPosition.Initial();
        for (int sq = 21; sq <= 30; sq++)
            board[sq].Should().BeNull();
    }

    [Fact]
    public void Initial_WhitePiecesOnSquares31To50()
    {
        var board = BoardPosition.Initial();
        for (int sq = 31; sq <= 50; sq++)
        {
            board[sq].Should().NotBeNull();
            board[sq]!.Value.Should().Be(DraughtsPiece.WhiteMan);
        }
    }

    [Fact]
    public void Initial_CorrectPieceCounts()
    {
        var board = BoardPosition.Initial();
        var (wMen, wKings, wTotal) = board.CountPieces(PieceColor.White);
        var (bMen, bKings, bTotal) = board.CountPieces(PieceColor.Black);

        wMen.Should().Be(20);
        wKings.Should().Be(0);
        wTotal.Should().Be(20);
        bMen.Should().Be(20);
        bKings.Should().Be(0);
        bTotal.Should().Be(20);
    }

    #endregion

    #region SetPiece

    [Fact]
    public void SetPiece_PlacesPieceOnEmptySquare()
    {
        var board = BoardPosition.Empty().SetPiece(25, DraughtsPiece.WhiteKing);
        board[25].Should().Be(DraughtsPiece.WhiteKing);
    }

    [Fact]
    public void SetPiece_ReturnsNewInstance()
    {
        var original = BoardPosition.Empty();
        var modified = original.SetPiece(25, DraughtsPiece.WhiteKing);
        original[25].Should().BeNull(); // Original unchanged
        modified[25].Should().NotBeNull();
    }

    [Fact]
    public void SetPiece_Null_ClearsSquare()
    {
        var board = BoardPosition.Empty()
            .SetPiece(25, DraughtsPiece.WhiteMan)
            .SetPiece(25, null);
        board[25].Should().BeNull();
    }

    #endregion

    #region FromIntArray

    [Fact]
    public void FromIntArray_DecodesCorrectly()
    {
        var arr = new int[51];
        arr[1] = 1;  // White man
        arr[10] = 2; // Black man
        arr[25] = 3; // White king
        arr[40] = 4; // Black king

        var board = BoardPosition.FromIntArray(arr);

        board[1].Should().Be(DraughtsPiece.WhiteMan);
        board[10].Should().Be(DraughtsPiece.BlackMan);
        board[25].Should().Be(DraughtsPiece.WhiteKing);
        board[40].Should().Be(DraughtsPiece.BlackKing);
        board[2].Should().BeNull(); // Empty square
    }

    [Fact]
    public void FromIntArray_UnknownValues_TreatedAsEmpty()
    {
        var arr = new int[51];
        arr[1] = 99; // Invalid
        var board = BoardPosition.FromIntArray(arr);
        board[1].Should().BeNull();
    }

    #endregion

    #region IsEmpty and IsEnemy

    [Fact]
    public void IsEmpty_EmptySquare_ReturnsTrue()
    {
        var board = BoardPosition.Empty();
        board.IsEmpty(25).Should().BeTrue();
    }

    [Fact]
    public void IsEmpty_OccupiedSquare_ReturnsFalse()
    {
        var board = BoardPosition.Empty().SetPiece(25, DraughtsPiece.WhiteMan);
        board.IsEmpty(25).Should().BeFalse();
    }

    [Fact]
    public void IsEnemy_EnemyPiece_ReturnsTrue()
    {
        var board = BoardPosition.Empty().SetPiece(25, DraughtsPiece.BlackMan);
        board.IsEnemy(25, PieceColor.White).Should().BeTrue();
    }

    [Fact]
    public void IsEnemy_FriendlyPiece_ReturnsFalse()
    {
        var board = BoardPosition.Empty().SetPiece(25, DraughtsPiece.WhiteMan);
        board.IsEnemy(25, PieceColor.White).Should().BeFalse();
    }

    [Fact]
    public void IsEnemy_EmptySquare_ReturnsFalse()
    {
        var board = BoardPosition.Empty();
        board.IsEnemy(25, PieceColor.White).Should().BeFalse();
    }

    #endregion

    #region ApplyMove — Quiet Moves

    [Fact]
    public void ApplyMove_QuietMove_MovesPiece()
    {
        var board = BoardPosition.Empty().SetPiece(32, DraughtsPiece.WhiteMan);
        var move = DraughtsMove.Quiet(32, 28);

        var result = board.ApplyMove(move);

        result[32].Should().BeNull();
        result[28].Should().Be(DraughtsPiece.WhiteMan);
    }

    [Fact]
    public void ApplyMove_QuietMove_OriginalUnchanged()
    {
        var board = BoardPosition.Empty().SetPiece(32, DraughtsPiece.WhiteMan);
        var move = DraughtsMove.Quiet(32, 28);

        board.ApplyMove(move);
        board[32].Should().Be(DraughtsPiece.WhiteMan); // Original preserved
    }

    [Fact]
    public void ApplyMove_QuietMove_PromotesWhiteOnRow0()
    {
        // White man on square 6 (row 1), moving to square 1 (row 0) — promotion
        var board = BoardPosition.Empty().SetPiece(6, DraughtsPiece.WhiteMan);
        var move = DraughtsMove.Quiet(6, 1);

        var result = board.ApplyMove(move);

        result[1].Should().Be(DraughtsPiece.WhiteKing);
    }

    [Fact]
    public void ApplyMove_QuietMove_PromotesBlackOnRow9()
    {
        // Black man on square 41 (row 8), moving to square 46 (row 9) — promotion
        var board = BoardPosition.Empty().SetPiece(41, DraughtsPiece.BlackMan);
        var move = DraughtsMove.Quiet(41, 46);

        var result = board.ApplyMove(move);

        result[46].Should().Be(DraughtsPiece.BlackKing);
    }

    #endregion

    #region ApplyMove — Captures

    [Fact]
    public void ApplyMove_SingleCapture_RemovesCapturedPiece()
    {
        // White man at 28 (5,4), Black man at 23 (4,5), landing on 19 (3,6)
        var board = BoardPosition.Empty()
            .SetPiece(28, DraughtsPiece.WhiteMan)
            .SetPiece(23, DraughtsPiece.BlackMan);

        var move = DraughtsMove.Capture(new[] { new CaptureStep(28, 19, 23) });
        var result = board.ApplyMove(move);

        result[28].Should().BeNull(); // Origin cleared
        result[23].Should().BeNull(); // Captured piece removed
        result[19].Should().Be(DraughtsPiece.WhiteMan); // Piece landed here
    }

    [Fact]
    public void ApplyMove_MultiCapture_RemovesAllCaptured()
    {
        // White man at 34 (6,7), jumps 29 (5,6) to 23 (4,5), then jumps 18 (3,4) to 12 (2,3)
        var board = BoardPosition.Empty()
            .SetPiece(34, DraughtsPiece.WhiteMan)
            .SetPiece(29, DraughtsPiece.BlackMan)
            .SetPiece(18, DraughtsPiece.BlackMan);

        var steps = new[]
        {
            new CaptureStep(34, 23, 29),
            new CaptureStep(23, 12, 18)
        };
        var move = DraughtsMove.Capture(steps);
        var result = board.ApplyMove(move);

        result[34].Should().BeNull();
        result[29].Should().BeNull();
        result[23].Should().BeNull(); // Intermediate square not occupied
        result[18].Should().BeNull();
        result[12].Should().Be(DraughtsPiece.WhiteMan);
    }

    [Fact]
    public void ApplyMove_Capture_PromotesAtDestination()
    {
        // White man at 12 (row 2, col 3), jump black at 8 (row 1, col 4), land at 3 (row 0, col 5)
        var board = BoardPosition.Empty()
            .SetPiece(12, DraughtsPiece.WhiteMan)
            .SetPiece(8, DraughtsPiece.BlackMan);

        var move = DraughtsMove.Capture(new[] { new CaptureStep(12, 3, 8) });
        var result = board.ApplyMove(move);

        result[3].Should().Be(DraughtsPiece.WhiteKing); // Promoted on capturing to row 0
    }

    #endregion

    #region ComputeHash

    [Fact]
    public void ComputeHash_SamePosition_SameHash()
    {
        var board = BoardPosition.Initial();
        var h1 = board.ComputeHash(PieceColor.White);
        var h2 = board.ComputeHash(PieceColor.White);
        h1.Should().Be(h2);
    }

    [Fact]
    public void ComputeHash_DifferentPlayer_DifferentHash()
    {
        var board = BoardPosition.Initial();
        var h1 = board.ComputeHash(PieceColor.White);
        var h2 = board.ComputeHash(PieceColor.Black);
        h1.Should().NotBe(h2);
    }

    [Fact]
    public void ComputeHash_DifferentPositions_DifferentHash()
    {
        var b1 = BoardPosition.Empty().SetPiece(25, DraughtsPiece.WhiteMan);
        var b2 = BoardPosition.Empty().SetPiece(26, DraughtsPiece.WhiteMan);
        b1.ComputeHash(PieceColor.White).Should().NotBe(b2.ComputeHash(PieceColor.White));
    }

    #endregion

    #region CountPieces

    [Fact]
    public void CountPieces_MixedPieces_CountsCorrectly()
    {
        var board = BoardPosition.Empty()
            .SetPiece(1, DraughtsPiece.WhiteMan)
            .SetPiece(2, DraughtsPiece.WhiteMan)
            .SetPiece(3, DraughtsPiece.WhiteKing)
            .SetPiece(48, DraughtsPiece.BlackMan)
            .SetPiece(49, DraughtsPiece.BlackKing)
            .SetPiece(50, DraughtsPiece.BlackKing);

        var (wMen, wKings, wTotal) = board.CountPieces(PieceColor.White);
        wMen.Should().Be(2);
        wKings.Should().Be(1);
        wTotal.Should().Be(3);

        var (bMen, bKings, bTotal) = board.CountPieces(PieceColor.Black);
        bMen.Should().Be(1);
        bKings.Should().Be(2);
        bTotal.Should().Be(3);
    }

    #endregion
}
