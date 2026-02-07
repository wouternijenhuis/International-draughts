using System.Net;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;

namespace InternationalDraughts.Api.Tests;

public class CorsTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public CorsTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Cors_AllowedOrigin_ReturnsAccessControlHeaders()
    {
        // Arrange
        var client = _factory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Get, "/health");
        request.Headers.Add("Origin", "http://localhost:3000");

        // Act
        var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Headers.Should().ContainKey("Access-Control-Allow-Origin");
        response.Headers.GetValues("Access-Control-Allow-Origin").Should().Contain("http://localhost:3000");
    }

    [Fact]
    public async Task Cors_DisallowedOrigin_DoesNotReturnAccessControlHeaders()
    {
        // Arrange
        var client = _factory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Get, "/health");
        request.Headers.Add("Origin", "http://evil-site.com");

        // Act
        var response = await client.SendAsync(request);

        // Assert
        response.Headers.Contains("Access-Control-Allow-Origin").Should().BeFalse();
    }

    [Fact]
    public async Task Cors_PreflightRequest_ReturnsCorrectHeaders()
    {
        // Arrange
        var client = _factory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Options, "/health");
        request.Headers.Add("Origin", "http://localhost:3000");
        request.Headers.Add("Access-Control-Request-Method", "GET");
        request.Headers.Add("Access-Control-Request-Headers", "Content-Type");

        // Act
        var response = await client.SendAsync(request);

        // Assert
        response.Headers.Should().ContainKey("Access-Control-Allow-Origin");
        response.Headers.GetValues("Access-Control-Allow-Origin").Should().Contain("http://localhost:3000");
    }
}
