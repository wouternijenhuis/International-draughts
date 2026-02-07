using Microsoft.AspNetCore.Mvc;

namespace InternationalDraughts.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet("/health")]
    [ProducesResponseType(typeof(HealthResponse), StatusCodes.Status200OK)]
    public IActionResult GetHealth()
    {
        return Ok(new HealthResponse { Status = "healthy" });
    }
}

public record HealthResponse
{
    public string Status { get; init; } = string.Empty;
}
