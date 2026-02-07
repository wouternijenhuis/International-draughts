using FluentAssertions;
using InternationalDraughts.Api.Middleware;
using Microsoft.AspNetCore.Http;

namespace InternationalDraughts.Api.Tests;

public class CorrelationIdMiddlewareTests
{
    [Fact]
    public async Task InvokeAsync_WhenNoCorrelationIdHeader_GeneratesNewCorrelationId()
    {
        // Arrange
        var nextCalled = false;
        RequestDelegate next = _ =>
        {
            nextCalled = true;
            return Task.CompletedTask;
        };

        var middleware = new CorrelationIdMiddleware(next);
        var context = new DefaultHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        nextCalled.Should().BeTrue();
        context.Response.Headers.Should().ContainKey("X-Correlation-Id");
        var correlationId = context.Response.Headers["X-Correlation-Id"].ToString();
        correlationId.Should().NotBeNullOrWhiteSpace();
        Guid.TryParse(correlationId, out _).Should().BeTrue();
    }

    [Fact]
    public async Task InvokeAsync_WhenCorrelationIdHeaderProvided_UsesExistingCorrelationId()
    {
        // Arrange
        var expectedCorrelationId = "my-custom-correlation-id";
        RequestDelegate next = _ => Task.CompletedTask;

        var middleware = new CorrelationIdMiddleware(next);
        var context = new DefaultHttpContext();
        context.Request.Headers["X-Correlation-Id"] = expectedCorrelationId;

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.Headers["X-Correlation-Id"].ToString().Should().Be(expectedCorrelationId);
        context.Items["CorrelationId"]!.ToString().Should().Be(expectedCorrelationId);
    }

    [Fact]
    public async Task InvokeAsync_WhenEmptyCorrelationIdHeader_GeneratesNewCorrelationId()
    {
        // Arrange
        RequestDelegate next = _ => Task.CompletedTask;

        var middleware = new CorrelationIdMiddleware(next);
        var context = new DefaultHttpContext();
        context.Request.Headers["X-Correlation-Id"] = "";

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        var correlationId = context.Response.Headers["X-Correlation-Id"].ToString();
        correlationId.Should().NotBeNullOrWhiteSpace();
        Guid.TryParse(correlationId, out _).Should().BeTrue();
    }

    [Fact]
    public async Task InvokeAsync_SetsCorrelationIdInHttpContextItems()
    {
        // Arrange
        var expectedCorrelationId = "test-correlation-id";
        RequestDelegate next = _ => Task.CompletedTask;

        var middleware = new CorrelationIdMiddleware(next);
        var context = new DefaultHttpContext();
        context.Request.Headers["X-Correlation-Id"] = expectedCorrelationId;

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Items.Should().ContainKey("CorrelationId");
        context.Items["CorrelationId"]!.ToString().Should().Be(expectedCorrelationId);
    }
}
