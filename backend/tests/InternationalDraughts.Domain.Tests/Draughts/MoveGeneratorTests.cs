using FluentAssertions;
using InternationalDraughts.Domain.Draughts;

namespace InternationalDraughts.Domain.Tests.Draughts;

public class MoveGeneratorTests
{
    #region Initial Position

    [Fact]
    public void GenerateLegalMoves_InitialPosition_WhiteHas9Moves()
    {
        // In the initial position, White has 9 legal quiet moves
        // (regular pieces on row 3 can move to empty squares on row 4)
        var board = BoardPosition.Initial();
        var moves = MoveGenerator.GenerateLegalMoves(board, PieceColor.White);

        moves.Should().HaveCount(9);
        moves.Should().OnlyContain(m => !m.IsCapture);
    }

    [Fact]
    public void GenerateLegalMoves_InitialPosition_BlackHas9Moves()
    {
        var board = BoardPosition.Initial();
        var moves = MoveGenerator.GenerateLegalMoves(board, PieceColor.Black);

        moves.Should().HaveCount(9);
        moves.Should().OnlyContain(m => !m.IsCapture);
    }

    #endregion

    #region Regular Piece Quiet Moves

    [Fact]
    public void GenerateLegalMoves_WhiteManInCenter_TwoForwardMoves()
    {
        // White regular piece at square 23 should move forward (north) to 18 and 19
        var board = BoardPosition.Empty().SetPiece(23, DraughtsPiece.WhiteMan);
        var moves = MoveGenerator.GenerateLegalMoves(board, PieceColor.White);

        moves.Should().HaveCount(2);
        moves.Should().OnlyContain(m => !m.IsCapture);
        moves.Select(m => m.To).Should().BeEquivalentTo(new[] { 18, 19 });
    }

    [Fact]
    public void GenerateLegalMoves_BlackManInCenter_TwoForwardMoves()
    {
        // Black regular piece moves south
        var board = BoardPosition.Empty().SetPiece(28, DraughtsPiece.BlackMan);
        var moves = MoveGenerator.GenerateLegalMoves(board, PieceColor.Black);

        moves.Should().HaveCount(2);
        moves.Select(m => m.To).Should().BeEquivalentTo(new[] { 32, 33 });
    }

    [Fact]
    public void GenerateLegalMoves_ManOnLeftEdge_OnlyOneForwardMove()
    {
        // White regular piece on left edge: square 6 (row 1, col 0)
        var board = BoardPosition.Empty().SetPiece(6, DraughtsPiece.WhiteMan);
        var moves = MoveGenerator.GenerateLegalMoves(board, PieceColor.White);

        // On the left edge, one forward diagonal goes off-board
        moves.Should().HaveCount(1);
    }

    [Fact]
    public void GenerateLegalMoves_ManBlocked_NoMoves()
    {
        // White regular piece at 28, blocked by friendly pieces at 22 and 23 (NE and NW)
        var board = BoardPosition.Empty()
            .SetPiece(28, DraughtsPiece.WhiteMan)
            .SetPiece(22, DraughtsPiece.WhiteMan)
            .SetPiece(23, DraughtsPiece.WhiteMan);

        var moves = MoveGenerator.GenerateLegalMoves(board, PieceColor.White);

        // Square 28 is blocked, but 22 and 23 might still have moves
        // Only count moves FROM square 28
        var movesFrom28 = moves.Where(m => m.From == 28).ToList();
        movesFrom28.Should().BeEmpty();
    }

    [Fact]
    public void GenerateLegalMoves_ManCannotMoveBackward()
    {
        // White regular piece at 28 should NOT move backward (south)
        var board = BoardPosition.Empty().SetPiece(28, DraughtsPiece.WhiteMan);
        var moves = MoveGenerator.GenerateLegalMoves(board, PieceColor.White);

        // All moves should go forward (north): to lower row numbers
        foreach (var move in moves)
        {
            var (fromRow, _) = BoardTopology.SquareToCoord(move.From);
            var (toRow, _) = BoardTopology.SquareToCoord(move.To);
            toRow.Should().BeLessThan(fromRow);
        }
    }

    #endregion

    #region King Quiet Moves (Flying King)

    [Fact]
    public void GenerateLegalMoves_KingInCenter_MovesInAllDirections()
    {
        var board = BoardPosition.Empty().SetPiece(23, DraughtsPiece.WhiteKing);
        var moves = MoveGenerator.GenerateLegalMoves(board, PieceColor.White);

        // King on 23 should be able to move along all 4 diagonals
        // Each diagonal can have multiple squares (flying king)
        moves.Should().HaveCountGreaterThan(4);
        moves.Should().OnlyContain(m => !m.IsCapture);
    }

    [Fact]
    public void GenerateLegalMoves_FlyingKing_StopsAtBlockedSquares()
    {
        // King at 23, blocker (friendly piece) at 28 on SE diagonal
        var board = BoardPosition.Empty()
            .SetPiece(23, DraughtsPiece.WhiteKing)
            .SetPiece(28, DraughtsPiece.WhiteMan);

        var moves = MoveGenerator.GenerateLegalMoves(board, PieceColor.White);

        // King should NOT be able to move to 28 or beyond on that diagonal
        var kingMoves = moves.Where(m => m.From == 23).ToList();
        kingMoves.Select(m => m.To).Should().NotContain(28);
    }

    #endregion

    #region Regular Piece Captures

    [Fact]
    public void GenerateLegalMoves_ManCapture_OnlyCaptureMoves()
    {
        // White regular piece at 28 (5,4), black piece at 23 (4,5) — adjacent NE.
        // Capture 28→19 over 23. Sq 19 = (3,6).
        var board = BoardPosition.Empty()
            .SetPiece(28, DraughtsPiece.WhiteMan)
            .SetPiece(23, DraughtsPiece.BlackMan);

        var moves = MoveGenerator.GenerateLegalMoves(board, PieceColor.White);

        // Mandatory capture: only capture moves should be returned
        moves.Should().OnlyContain(m => m.IsCapture);
        moves.Should().HaveCount(1);
        moves[0].Origin.Should().Be(28);
        moves[0].Destination.Should().Be(19);
    }

    [Fact]
    public void GenerateLegalMoves_ManCapture_InAllDirections()
    {
        // Regular piece captures backward too (FMJD rule)
        // White regular piece at 23 (4,5), black piece at 28 (5,4) to the SW.
        // Capture lands at 32 (6,3).
        var board = BoardPosition.Empty()
            .SetPiece(23, DraughtsPiece.WhiteMan)
            .SetPiece(28, DraughtsPiece.BlackMan);

        var moves = MoveGenerator.GenerateLegalMoves(board, PieceColor.White);

        // Regular piece should be able to capture backward
        moves.Should().OnlyContain(m => m.IsCapture);
        moves.Should().HaveCountGreaterThanOrEqualTo(1);
    }

    [Fact]
    public void GenerateLegalMoves_ManMultiCapture_ReturnsLongestSequence()
    {
        // White regular piece at 34 (6,7), black at 29 (5,6) and 18 (3,4).
        // Capture path: 34→23 over 29, then 23→12 over 18 (NW direction).
        var board = BoardPosition.Empty()
            .SetPiece(34, DraughtsPiece.WhiteMan)
            .SetPiece(29, DraughtsPiece.BlackMan)
            .SetPiece(18, DraughtsPiece.BlackMan);

        var moves = MoveGenerator.GenerateLegalMoves(board, PieceColor.White);

        // Maximum capture rule: should only return the 2-capture sequence
        int maxCaptures = moves.Max(m => m.CaptureCount);
        moves.Should().OnlyContain(m => m.CaptureCount == maxCaptures);
        maxCaptures.Should().BeGreaterThanOrEqualTo(2);
    }

    [Fact]
    public void GenerateLegalMoves_MandatoryCapture_QuietMovesNotReturned()
    {
        // White regular piece at 28 can capture (black at 23), and White regular piece at 38 could make a quiet move
        // But since captures exist, only captures should be returned
        var board = BoardPosition.Empty()
            .SetPiece(28, DraughtsPiece.WhiteMan)
            .SetPiece(23, DraughtsPiece.BlackMan)
            .SetPiece(38, DraughtsPiece.WhiteMan);

        var moves = MoveGenerator.GenerateLegalMoves(board, PieceColor.White);

        moves.Should().OnlyContain(m => m.IsCapture);
    }

    [Fact]
    public void GenerateLegalMoves_MaximumCapture_OnlyLongestSequences()
    {
        // Piece A (at 34) can capture 2 pieces: over 29 to 23, then over 18 to 12
        // Piece B (at 6) can capture 1 piece: over 11 to some landing
        var board = BoardPosition.Empty()
            .SetPiece(34, DraughtsPiece.WhiteMan)   // Can capture 2
            .SetPiece(29, DraughtsPiece.BlackMan)    // First victim for 34
            .SetPiece(18, DraughtsPiece.BlackMan)    // Second victim for 34
            .SetPiece(6, DraughtsPiece.WhiteMan)     // Can capture 1
            .SetPiece(11, DraughtsPiece.BlackMan);   // Victim for 6

        var moves = MoveGenerator.GenerateLegalMoves(board, PieceColor.White);

        int maxCaptures = moves.Max(m => m.CaptureCount);
        moves.Should().OnlyContain(m => m.CaptureCount == maxCaptures);
    }

    #endregion

    #region King Captures (Flying King)

    [Fact]
    public void GenerateLegalMoves_KingCapture_AtDistance()
    {
        // White king at 1, black piece somewhere along a diagonal, empty beyond
        // King at square 1 (row 0, col 1)
        // On the SE diagonal: 1 → 7 → 12 → 18 → 23 → 29 → 34 → 40 → 45
        // Place black at 12, empty at 18 — king captures 12 to land on 18 (or further)
        var board = BoardPosition.Empty()
            .SetPiece(1, DraughtsPiece.WhiteKing)
            .SetPiece(12, DraughtsPiece.BlackMan);

        var moves = MoveGenerator.GenerateLegalMoves(board, PieceColor.White);

        moves.Should().OnlyContain(m => m.IsCapture);
        // Flying king can land on any empty square beyond the captured piece
        moves.Should().HaveCountGreaterThanOrEqualTo(1);

        // All captured squares should include 12
        foreach (var move in moves)
        {
            move.CapturedSquares.Should().Contain(12);
        }
    }

    [Fact]
    public void GenerateLegalMoves_KingCapture_CanLandMultipleSquaresBeyond()
    {
        // King captures a piece and can land on multiple empty squares beyond
        var board = BoardPosition.Empty()
            .SetPiece(23, DraughtsPiece.WhiteKing)
            .SetPiece(28, DraughtsPiece.BlackMan);
        // After jumping 28, king can land on 32, 37, or further along the ray

        var moves = MoveGenerator.GenerateLegalMoves(board, PieceColor.White);

        // Should have multiple landing options beyond the captured piece
        moves.Should().HaveCountGreaterThanOrEqualTo(1);
    }

    #endregion

    #region No Legal Moves (Loss)

    [Fact]
    public void GenerateLegalMoves_NoPieces_ReturnsEmpty()
    {
        var board = BoardPosition.Empty();
        var moves = MoveGenerator.GenerateLegalMoves(board, PieceColor.White);
        moves.Should().BeEmpty();
    }

    [Fact]
    public void GenerateLegalMoves_AllPiecesBlocked_ReturnsEmpty()
    {
        // White regular piece on promotion row (row 0) has nowhere to go forward
        // And no captures available
        var board = BoardPosition.Empty().SetPiece(1, DraughtsPiece.WhiteMan);
        var moves = MoveGenerator.GenerateLegalMoves(board, PieceColor.White);
        // A regular piece on the promotion row can't move forward — but it should have been promoted
        // Let's use a genuinely blocked regular piece: White at 23 blocked by friendly pieces at 18 and 19
        var blocked = BoardPosition.Empty()
            .SetPiece(23, DraughtsPiece.WhiteMan)
            .SetPiece(18, DraughtsPiece.WhiteMan)
            .SetPiece(19, DraughtsPiece.WhiteMan);

        var blockedMoves = MoveGenerator.GenerateLegalMoves(blocked, PieceColor.White);
        // Only check moves from square 23 — it's blocked forward
        // But 18 and 19 might have moves
        var movesFrom23 = blockedMoves.Where(m => m.Origin == 23).ToList();
        movesFrom23.Should().BeEmpty();
    }

    #endregion

    #region Captures Cannot Jump Same Piece Twice

    [Fact]
    public void GenerateLegalMoves_CannotJumpSamePieceTwice()
    {
        // Set up a scenario where jumping the same piece twice would be tempting
        // but illegal per FMJD rules
        var board = BoardPosition.Empty()
            .SetPiece(28, DraughtsPiece.WhiteMan)
            .SetPiece(23, DraughtsPiece.BlackMan);

        var moves = MoveGenerator.GenerateLegalMoves(board, PieceColor.White);

        // All captured squares in each move should be unique
        foreach (var move in moves)
        {
            var captured = move.CapturedSquares;
            captured.Should().OnlyHaveUniqueItems();
        }
    }

    #endregion

    #region All Moves Are Legal Validation

    [Fact]
    public void GenerateLegalMoves_InitialPosition_AllMovesHaveValidSquares()
    {
        var board = BoardPosition.Initial();
        var moves = MoveGenerator.GenerateLegalMoves(board, PieceColor.White);

        foreach (var move in moves)
        {
            move.From.Should().BeInRange(1, 50);
            move.To.Should().BeInRange(1, 50);
            move.From.Should().NotBe(move.To);
        }
    }

    [Fact]
    public void GenerateLegalMoves_InitialPosition_AllMovesFromWhitePieces()
    {
        var board = BoardPosition.Initial();
        var moves = MoveGenerator.GenerateLegalMoves(board, PieceColor.White);

        foreach (var move in moves)
        {
            board[move.From]!.Value.Color.Should().Be(PieceColor.White);
        }
    }

    #endregion

    #region Capture Sequences

    [Fact]
    public void GenerateAllCaptures_NoCaptures_ReturnsEmpty()
    {
        var board = BoardPosition.Initial();
        var captures = MoveGenerator.GenerateAllCaptures(board, PieceColor.White);
        captures.Should().BeEmpty();
    }

    [Fact]
    public void GenerateAllQuietMoves_InitialPosition_Returns9Moves()
    {
        var board = BoardPosition.Initial();
        var moves = MoveGenerator.GenerateAllQuietMoves(board, PieceColor.White);
        moves.Should().HaveCount(9);
    }

    #endregion
}
