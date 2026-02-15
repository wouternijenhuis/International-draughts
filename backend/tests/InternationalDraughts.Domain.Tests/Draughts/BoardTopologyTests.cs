using FluentAssertions;
using InternationalDraughts.Domain.Draughts;

namespace InternationalDraughts.Domain.Tests.Draughts;

public class BoardTopologyTests
{
    #region SquareToCoord

    [Theory]
    [InlineData(1, 0, 1)]   // Row 0 (even), first dark square at col 1
    [InlineData(5, 0, 9)]   // Row 0 (even), last dark square at col 9
    [InlineData(6, 1, 0)]   // Row 1 (odd), first dark square at col 0
    [InlineData(10, 1, 8)]  // Row 1 (odd), last dark square at col 8
    [InlineData(46, 9, 0)]  // Row 9 (odd), first dark square at col 0
    [InlineData(50, 9, 8)]  // Row 9 (odd), last square
    public void SquareToCoord_ReturnsCorrectCoordinates(int square, int expectedRow, int expectedCol)
    {
        var (row, col) = BoardTopology.SquareToCoord(square);
        row.Should().Be(expectedRow);
        col.Should().Be(expectedCol);
    }

    #endregion

    #region CoordToSquare

    [Theory]
    [InlineData(0, 1, 1)]
    [InlineData(0, 9, 5)]
    [InlineData(1, 0, 6)]
    [InlineData(9, 0, 46)]
    [InlineData(9, 8, 50)]
    public void CoordToSquare_ReturnsCo_rrectSquare(int row, int col, int expectedSquare)
    {
        BoardTopology.CoordToSquare(row, col).Should().Be(expectedSquare);
    }

    [Theory]
    [InlineData(0, 0)] // Light square on even row
    [InlineData(0, 2)] // Light square on even row
    [InlineData(1, 1)] // Light square on odd row
    public void CoordToSquare_LightSquare_ReturnsMinusOne(int row, int col)
    {
        BoardTopology.CoordToSquare(row, col).Should().Be(-1);
    }

    [Theory]
    [InlineData(-1, 0)]
    [InlineData(0, -1)]
    [InlineData(10, 0)]
    [InlineData(0, 10)]
    public void CoordToSquare_OutOfBounds_ReturnsMinusOne(int row, int col)
    {
        BoardTopology.CoordToSquare(row, col).Should().Be(-1);
    }

    [Fact]
    public void SquareToCoord_And_CoordToSquare_AreInverse()
    {
        for (int sq = 1; sq <= 50; sq++)
        {
            var (row, col) = BoardTopology.SquareToCoord(sq);
            BoardTopology.CoordToSquare(row, col).Should().Be(sq,
                because: $"Square {sq} → ({row},{col}) should map back to {sq}");
        }
    }

    #endregion

    #region Adjacent

    [Fact]
    public void Adjacent_CenterSquare_HasAllFourNeighbors()
    {
        // Square 23 is row 4, col 5 — center of the board
        foreach (var dir in BoardTopology.AllDirections)
        {
            BoardTopology.Adjacent(23, dir).Should().BeGreaterThan(0,
                because: $"Center square 23 should have a neighbor in direction {dir}");
        }
    }

    [Fact]
    public void Adjacent_CornerSquare1_MissingNorthNeighbors()
    {
        // Square 1 is row 0, col 1 — top edge
        BoardTopology.Adjacent(1, Direction.NorthEast).Should().Be(-1);
        BoardTopology.Adjacent(1, Direction.NorthWest).Should().Be(-1);
    }

    [Fact]
    public void Adjacent_CornerSquare46_MissingSouthNeighbors()
    {
        // Square 46 is row 9, col 0 — bottom-left corner
        BoardTopology.Adjacent(46, Direction.SouthEast).Should().Be(-1);
        BoardTopology.Adjacent(46, Direction.SouthWest).Should().Be(-1);
    }

    [Theory]
    [InlineData(23, Direction.NorthEast, 19)]
    [InlineData(23, Direction.NorthWest, 18)]
    [InlineData(23, Direction.SouthEast, 29)]
    [InlineData(23, Direction.SouthWest, 28)]
    public void Adjacent_Square23_ReturnsCorrectNeighbor(int square, Direction direction, int expected)
    {
        BoardTopology.Adjacent(square, direction).Should().Be(expected);
    }

    #endregion

    #region GetRay

    [Fact]
    public void GetRay_CenterSquare_ReturnsMultipleSquares()
    {
        // From square 23, the SE ray should go towards higher numbered squares
        var ray = BoardTopology.GetRay(23, Direction.SouthEast);
        ray.Should().NotBeEmpty();
        ray[0].Should().Be(29); // First square in the SE ray from 23 (row 4, col 5) is (5, 6) = sq 29
    }

    [Fact]
    public void GetRay_CornerSquare_ReturnsEmptyForBlockedDirections()
    {
        var ray = BoardTopology.GetRay(1, Direction.NorthEast);
        ray.Should().BeEmpty();
    }

    [Fact]
    public void GetRay_DiagonalFromCornerToCorner_TraversesBoard()
    {
        // Square 46 (9,0) going NorthEast should traverse the entire main diagonal
        var ray = BoardTopology.GetRay(46, Direction.NorthEast);
        ray.Should().HaveCountGreaterThan(3); // Should traverse multiple squares
    }

    #endregion

    #region ForwardDirections

    [Fact]
    public void ForwardDirections_White_ReturnsNorthDirections()
    {
        var dirs = BoardTopology.ForwardDirections(PieceColor.White);
        dirs.Should().Contain(Direction.NorthEast);
        dirs.Should().Contain(Direction.NorthWest);
        dirs.Should().HaveCount(2);
    }

    [Fact]
    public void ForwardDirections_Black_ReturnsSouthDirections()
    {
        var dirs = BoardTopology.ForwardDirections(PieceColor.Black);
        dirs.Should().Contain(Direction.SouthEast);
        dirs.Should().Contain(Direction.SouthWest);
        dirs.Should().HaveCount(2);
    }

    #endregion

    #region IsPromotionSquare

    [Theory]
    [InlineData(1, PieceColor.White)]  // Row 0
    [InlineData(2, PieceColor.White)]
    [InlineData(3, PieceColor.White)]
    [InlineData(4, PieceColor.White)]
    [InlineData(5, PieceColor.White)]
    public void IsPromotionSquare_WhiteOnRow0_ReturnsTrue(int square, PieceColor color)
    {
        BoardTopology.IsPromotionSquare(square, color).Should().BeTrue();
    }

    [Theory]
    [InlineData(46, PieceColor.Black)] // Row 9
    [InlineData(47, PieceColor.Black)]
    [InlineData(48, PieceColor.Black)]
    [InlineData(49, PieceColor.Black)]
    [InlineData(50, PieceColor.Black)]
    public void IsPromotionSquare_BlackOnRow9_ReturnsTrue(int square, PieceColor color)
    {
        BoardTopology.IsPromotionSquare(square, color).Should().BeTrue();
    }

    [Theory]
    [InlineData(46, PieceColor.White)] // White on row 9 — not promotion
    [InlineData(25, PieceColor.White)] // Middle of board
    [InlineData(1, PieceColor.Black)]  // Black on row 0 — not promotion
    public void IsPromotionSquare_WrongRow_ReturnsFalse(int square, PieceColor color)
    {
        BoardTopology.IsPromotionSquare(square, color).Should().BeFalse();
    }

    #endregion

    #region Center Squares

    [Fact]
    public void CenterSquares_Contains12Squares()
    {
        BoardTopology.CenterSquares.Should().HaveCount(12);
    }

    [Fact]
    public void InnerCenter_ContainsFiveSquares()
    {
        BoardTopology.InnerCenter.Should().HaveCount(5);
    }

    [Fact]
    public void InnerCenter_IsSubsetOfCenterSquares()
    {
        BoardTopology.InnerCenter.Should().BeSubsetOf(BoardTopology.CenterSquares);
    }

    #endregion

    #region Back Row

    [Fact]
    public void WhiteBackRow_ContainsSquares46To50()
    {
        BoardTopology.WhiteBackRow.Should().BeEquivalentTo(new[] { 46, 47, 48, 49, 50 });
    }

    [Fact]
    public void BlackBackRow_ContainsSquares1To5()
    {
        BoardTopology.BlackBackRow.Should().BeEquivalentTo(new[] { 1, 2, 3, 4, 5 });
    }

    #endregion
}
