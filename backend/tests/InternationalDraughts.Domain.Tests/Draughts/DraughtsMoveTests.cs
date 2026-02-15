using FluentAssertions;
using InternationalDraughts.Domain.Draughts;

namespace InternationalDraughts.Domain.Tests.Draughts;

public class DraughtsMoveTests
{
    [Fact]
    public void QuietMove_HasCorrectProperties()
    {
        var move = DraughtsMove.Quiet(32, 28);
        move.IsCapture.Should().BeFalse();
        move.From.Should().Be(32);
        move.To.Should().Be(28);
        move.Origin.Should().Be(32);
        move.Destination.Should().Be(28);
        move.CaptureCount.Should().Be(0);
        move.CapturedSquares.Should().BeEmpty();
    }

    [Fact]
    public void CaptureMove_HasCorrectProperties()
    {
        var steps = new[]
        {
            new CaptureStep(34, 23, 29),
            new CaptureStep(23, 12, 18)
        };
        var move = DraughtsMove.Capture(steps);

        move.IsCapture.Should().BeTrue();
        move.Origin.Should().Be(34);
        move.Destination.Should().Be(12);
        move.CaptureCount.Should().Be(2);
        move.CapturedSquares.Should().BeEquivalentTo(new[] { 29, 18 });
    }

    [Fact]
    public void ToNotation_QuietMove_ReturnsCorrectFormat()
    {
        var move = DraughtsMove.Quiet(32, 28);
        move.ToNotation().Should().Be("32-28");
    }

    [Fact]
    public void ToNotation_CaptureMove_ReturnsCorrectFormat()
    {
        var steps = new[]
        {
            new CaptureStep(34, 23, 29),
            new CaptureStep(23, 12, 18)
        };
        var move = DraughtsMove.Capture(steps);
        move.ToNotation().Should().Be("34x23x12");
    }

    [Fact]
    public void ToString_DelegatesToToNotation()
    {
        var move = DraughtsMove.Quiet(35, 30);
        move.ToString().Should().Be("35-30");
    }

    [Fact]
    public void SingleCapture_HasCorrectCaptureCount()
    {
        var steps = new[] { new CaptureStep(28, 19, 23) };
        var move = DraughtsMove.Capture(steps);
        move.CaptureCount.Should().Be(1);
    }
}
