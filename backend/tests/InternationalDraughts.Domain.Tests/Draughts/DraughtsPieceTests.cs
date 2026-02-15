using FluentAssertions;
using InternationalDraughts.Domain.Draughts;

namespace InternationalDraughts.Domain.Tests.Draughts;

public class DraughtsPieceTests
{
    [Fact]
    public void WhiteMan_HasCorrectProperties()
    {
        var piece = DraughtsPiece.WhiteMan;
        piece.Color.Should().Be(PieceColor.White);
        piece.Type.Should().Be(DraughtsPieceType.Man);
        piece.IsMan.Should().BeTrue();
        piece.IsKing.Should().BeFalse();
    }

    [Fact]
    public void BlackMan_HasCorrectProperties()
    {
        var piece = DraughtsPiece.BlackMan;
        piece.Color.Should().Be(PieceColor.Black);
        piece.Type.Should().Be(DraughtsPieceType.Man);
        piece.IsMan.Should().BeTrue();
        piece.IsKing.Should().BeFalse();
    }

    [Fact]
    public void WhiteKing_HasCorrectProperties()
    {
        var piece = DraughtsPiece.WhiteKing;
        piece.Color.Should().Be(PieceColor.White);
        piece.Type.Should().Be(DraughtsPieceType.King);
        piece.IsKing.Should().BeTrue();
        piece.IsMan.Should().BeFalse();
    }

    [Fact]
    public void BlackKing_HasCorrectProperties()
    {
        var piece = DraughtsPiece.BlackKing;
        piece.Color.Should().Be(PieceColor.Black);
        piece.Type.Should().Be(DraughtsPieceType.King);
        piece.IsKing.Should().BeTrue();
        piece.IsMan.Should().BeFalse();
    }

    [Fact]
    public void Promote_ManBecomesKing()
    {
        var man = DraughtsPiece.WhiteMan;
        var king = man.Promote();
        king.IsKing.Should().BeTrue();
        king.Color.Should().Be(PieceColor.White);
    }

    [Fact]
    public void Promote_PreservesColor()
    {
        var blackMan = DraughtsPiece.BlackMan;
        var blackKing = blackMan.Promote();
        blackKing.Color.Should().Be(PieceColor.Black);
        blackKing.IsKing.Should().BeTrue();
    }

    [Fact]
    public void Equality_SameTypeAndColor_AreEqual()
    {
        var a = new DraughtsPiece(DraughtsPieceType.Man, PieceColor.White);
        var b = DraughtsPiece.WhiteMan;
        a.Should().Be(b);
    }

    [Fact]
    public void Equality_DifferentType_AreNotEqual()
    {
        DraughtsPiece.WhiteMan.Should().NotBe(DraughtsPiece.WhiteKing);
    }
}
