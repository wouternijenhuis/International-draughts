using FluentAssertions;
using InternationalDraughts.Domain.Draughts;

namespace InternationalDraughts.Domain.Tests.Draughts;

public class PieceColorTests
{
    [Fact]
    public void Opposite_White_ReturnsBlack()
    {
        PieceColor.White.Opposite().Should().Be(PieceColor.Black);
    }

    [Fact]
    public void Opposite_Black_ReturnsWhite()
    {
        PieceColor.Black.Opposite().Should().Be(PieceColor.White);
    }

    [Fact]
    public void Opposite_IsInvolution()
    {
        PieceColor.White.Opposite().Opposite().Should().Be(PieceColor.White);
        PieceColor.Black.Opposite().Opposite().Should().Be(PieceColor.Black);
    }
}
