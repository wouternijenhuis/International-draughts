using System.Net;
using System.Text.Json;
using FluentAssertions;
using InternationalDraughts.Api.Middleware;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;

namespace InternationalDraughts.Api.Tests;

public class GlobalExceptionHandlerMiddlewareTests
{
    private readonly Mock<ILogger<GlobalExceptionHandlerMiddleware>> _loggerMock;

    public GlobalExceptionHandlerMiddlewareTests()
    {
        _loggerMock = new Mock<ILogger<GlobalExceptionHandlerMiddleware>>();
    }

    [Fact]
    public async Task InvokeAsync_WhenNoException_CallsNext()
    {
        // Arrange
        var nextCalled = false;
        RequestDelegate next = _ =>
        {
            nextCalled = true;
            return Task.CompletedTask;
        };

        var middleware = new GlobalExceptionHandlerMiddleware(next, _loggerMock.Object);
        var context = new DefaultHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        nextCalled.Should().BeTrue();
    }

    [Fact]
    public async Task InvokeAsync_WhenExceptionThrown_Returns500()
    {
        // Arrange
        RequestDelegate next = _ => throw new InvalidOperationException("Test exception");

        var middleware = new GlobalExceptionHandlerMiddleware(next, _loggerMock.Object);
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.StatusCode.Should().Be(StatusCodes.Status500InternalServerError);
        context.Response.ContentType.Should().Contain("application/json");
    }

    [Fact]
    public async Task InvokeAsync_WhenExceptionThrown_ReturnsStructuredErrorResponse()
    {
        // Arrange
        RequestDelegate next = _ => throw new InvalidOperationException("Test exception");

        var middleware = new GlobalExceptionHandlerMiddleware(next, _loggerMock.Object);
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        context.TraceIdentifier = "test-trace-id";

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.Body.Seek(0, SeekOrigin.Begin);
        var responseBody = await new StreamReader(context.Response.Body).ReadToEndAsync();
        var errorResponse = JsonSerializer.Deserialize<ErrorResponse>(responseBody, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        errorResponse.Should().NotBeNull();
        errorResponse!.Status.Should().Be(500);
        errorResponse.Title.Should().Be("An unexpected error occurred");
        errorResponse.TraceId.Should().Be("test-trace-id");
    }
}
