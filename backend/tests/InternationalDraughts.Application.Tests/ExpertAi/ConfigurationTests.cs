using FluentAssertions;
using InternationalDraughts.Application.ExpertAi;

namespace InternationalDraughts.Application.Tests.ExpertAi;

public class EvaluationWeightsTests
{
    [Fact]
    public void DefaultWeights_HaveReasonableValues()
    {
        var w = new EvaluationWeights();

        w.ManValue.Should().BeGreaterThan(0);
        w.KingValue.Should().BeGreaterThan(w.ManValue);
        w.WinScore.Should().BeGreaterThan(0);
        w.LossScore.Should().BeLessThan(0);
    }

    [Fact]
    public void DefaultWeights_KingWorthThreeTimesMan()
    {
        var w = new EvaluationWeights();
        w.KingValue.Should().Be(3 * w.ManValue);
    }

    [Fact]
    public void SectionName_IsExpertAiWeights()
    {
        EvaluationWeights.SectionName.Should().Be("ExpertAi:Weights");
    }
}

public class ExpertAiOptionsTests
{
    [Fact]
    public void DefaultOptions_HaveReasonableValues()
    {
        var o = new ExpertAiOptions();

        o.MaxDepth.Should().BeGreaterThan(0);
        o.TimeLimitMs.Should().BeGreaterThan(0);
        o.TranspositionTableSizeMb.Should().BeGreaterThan(0);
    }

    [Fact]
    public void DefaultOptions_MaxDepth20()
    {
        new ExpertAiOptions().MaxDepth.Should().Be(20);
    }

    [Fact]
    public void DefaultOptions_TimeLimit30Seconds()
    {
        new ExpertAiOptions().TimeLimitMs.Should().Be(30_000);
    }

    [Fact]
    public void DefaultOptions_TtSize256Mb()
    {
        new ExpertAiOptions().TranspositionTableSizeMb.Should().Be(256);
    }

    [Fact]
    public void DefaultOptions_AllFeaturesEnabled()
    {
        var o = new ExpertAiOptions();
        o.EnableLmr.Should().BeTrue();
        o.EnablePvs.Should().BeTrue();
        o.EnableAspirationWindows.Should().BeTrue();
    }

    [Fact]
    public void SectionName_IsExpertAi()
    {
        ExpertAiOptions.SectionName.Should().Be("ExpertAi");
    }
}
