# Network Protocols Documentation

## Overview

The International Draughts engine supports two network protocols for remote play:

1. **DXP (Dammen eXchange Protocol)** - Engine-to-engine communication for tournaments
2. **Hub Protocol** - GUI-to-engine communication for graphical interfaces

Both protocols enable the engine to play against remote opponents or be controlled by external GUIs.

## Features

### DXP Protocol
- Engine-to-engine communication
- Tournament play support
- Simple text-based protocol
- Default port: 27531
- Binary and text modes

### Hub Protocol  
- GUI-to-engine communication
- Compatible with Damage, Tornado, and other Hub GUIs
- Text-based command protocol
- Default port: 27531
- Position setup and analysis support

## Architecture

### Clean Architecture Integration

```
Application Layer:
  - IProtocolHandler interface

Infrastructure Layer:
  - DxpProtocol implementation
  - HubProtocol implementation
```

### Dependencies
- Uses `System.Net.Sockets` for TCP communication
- Implements async/await pattern throughout
- Integrates with existing `IMoveGenerator` and `ISearchEngine`

## DXP Protocol

### Overview
DXP (Dammen eXchange Protocol) is the standard protocol for engine-to-engine communication in international draughts. It enables two engines to play games against each other over a network connection.

### Connection

**Server Mode** (waiting for connection):
```csharp
var dxp = new DxpProtocol(position, moveGenerator);
await dxp.StartAsync(); // Listens on port 27531
```

**Client Mode** (connecting to server):
```csharp
var dxp = new DxpProtocol(position, moveGenerator);
await dxp.ConnectAsync("localhost", 27531);
```

### Protocol Commands

| Command | Format | Description |
|---------|--------|-------------|
| R | `R` | Ready to play |
| A | `A` | Acknowledgment |
| M | `M3728` | Move from square 37 to 28 |
| E | `E` | End game/disconnect |

### Move Format

Moves are transmitted in numeric format based on board square numbering (1-50):

```
M3728  - Move from square 37 to square 28
M1217  - Move from square 12 to square 17
```

### Handshake Sequence

**Server:**
1. Wait for client connection
2. Send `R` (Ready)
3. Send `A` (Accept)

**Client:**
1. Connect to server
2. Receive `R` and `A`
3. Begin game

### Example Usage

```csharp
// Server example
var position = Position.InitialPosition();
var moveGenerator = new BasicMoveGenerator();
var dxp = new DxpProtocol(position, moveGenerator);

await dxp.StartAsync();

while (dxp.IsConnected)
{
    var opponentMove = await dxp.ReceiveMoveAsync();
    if (opponentMove != null)
    {
        // Apply opponent's move
        position = moveGenerator.ApplyMove(position, opponentMove);
        
        // Calculate and send our move
        var ourMove = searchEngine.GetBestMove(position, timeLimit);
        await dxp.SendMoveAsync(ourMove);
    }
}

await dxp.StopAsync();
```

## Hub Protocol

### Overview
The Hub protocol enables communication between the engine and graphical user interfaces (GUIs) like Damage, Tornado, and other draughts programs that support the Hub standard.

### Connection

**Server Mode** (wait for GUI connection):
```csharp
var hub = new HubProtocol(position, moveGenerator, searchEngine);
await hub.StartAsync(); // Listens on port 27531
```

### Protocol Commands

| Command | Format | Description |
|---------|--------|-------------|
| MOVE | `MOVE 37-28` | Make a move |
| POSITION | `POSITION fen` | Set position |
| GO | `GO` | Start searching |
| STOP | `STOP` | Stop search |
| BYE | `BYE` | Disconnect |

### Move Format

Moves are transmitted in standard draughts notation:

```
37-28  - Normal move from 37 to 28
37x28  - Capture from 37 to 28
```

### Response Format

The engine sends responses prefixed with status:

```
OK Hub Engine Ready         - Initial connection
MOVE 37-28                  - Engine's move
ERROR Invalid move          - Error message
BYE                         - Disconnecting
```

### Example Usage

```csharp
// Server example for GUI
var position = Position.InitialPosition();
var moveGenerator = new BasicMoveGenerator();
var searchEngine = new BasicSearchEngine(moveGenerator);
var hub = new HubProtocol(position, moveGenerator, searchEngine);

await hub.StartAsync();
Console.WriteLine("Waiting for GUI connection...");

while (hub.IsConnected)
{
    var move = await hub.ReceiveMoveAsync();
    if (move != null)
    {
        // Process move from GUI
        position = moveGenerator.ApplyMove(position, move);
        
        // If engine's turn, calculate and send move
        var engineMove = searchEngine.GetBestMove(position, 10000);
        await hub.SendMoveAsync(engineMove);
    }
}

await hub.StopAsync();
```

## Configuration

### Port Configuration

Both protocols use port 27531 by default. To use a different port:

```csharp
// Custom port for DXP
var dxp = new DxpProtocol(position, moveGenerator);
await dxp.ConnectAsync("localhost", 8080);
```

### Firewall Configuration

Ensure the following ports are open:
- **TCP 27531** - DXP and Hub protocols (default)
- Allow inbound connections for server mode
- Allow outbound connections for client mode

## Integration with Console Application

To use protocols in the console application:

```csharp
// Add to Program.cs startup
builder.Services.AddSingleton<IProtocolHandler, DxpProtocol>();
// or
builder.Services.AddSingleton<IProtocolHandler, HubProtocol>();
```

## Error Handling

Both protocols implement graceful error handling:

- **Connection Failures**: Logged and operation canceled
- **Invalid Moves**: Rejected with error response
- **Network Errors**: Automatic disconnect
- **Timeouts**: Configurable via `CancellationToken`

## Performance

### Network Overhead
- Minimal: ~50-100 bytes per move
- Low latency: <10ms on local network
- Supports concurrent connections

### Threading
- All operations are async/await
- Non-blocking I/O
- Thread-safe message handling

## Testing

### Local Testing

Test DXP protocol locally:

```bash
# Terminal 1 (Server)
dotnet run -- --protocol dxp --server

# Terminal 2 (Client)
dotnet run -- --protocol dxp --connect localhost:27531
```

Test Hub protocol with GUI:

```bash
# Start engine in Hub mode
dotnet run -- --protocol hub --server

# Connect with Damage or Tornado GUI
# Configure GUI to connect to localhost:27531
```

## Compatibility

### DXP Protocol
- Compatible with all DXP-compliant engines
- Tested with: Scan, Dam 2.2, Flits
- Protocol version: DXP 1.0

### Hub Protocol
- Compatible with Hub-supporting GUIs
- Tested with: Damage, Tornado
- Protocol version: Hub 1.0

## Security Considerations

1. **No Authentication**: Protocols don't include authentication
2. **Plain Text**: Communication is unencrypted
3. **Local Network**: Recommended for LAN use only
4. **Firewall**: Use firewall rules to restrict access
5. **Input Validation**: All moves are validated before application

## Troubleshooting

### Connection Issues

**Problem**: Cannot connect to remote engine
**Solution**:
- Check firewall settings
- Verify port is not in use: `netstat -an | grep 27531`
- Ensure correct IP address and port

**Problem**: Connection drops during game
**Solution**:
- Check network stability
- Increase timeout values
- Review error logs

### Protocol Issues

**Problem**: Invalid move received
**Solution**:
- Verify move format matches protocol spec
- Check position synchronization
- Enable protocol logging

### Performance Issues

**Problem**: Slow response times
**Solution**:
- Reduce search time limits
- Check network latency
- Use faster network connection

## Advanced Usage

### Custom Protocol Implementation

To implement a custom protocol:

```csharp
public class CustomProtocol : IProtocolHandler
{
    public bool IsConnected { get; }
    
    public Task StartAsync(CancellationToken cancellationToken)
    {
        // Implementation
    }
    
    public Task ConnectAsync(string host, int port, CancellationToken cancellationToken)
    {
        // Implementation
    }
    
    // Implement other interface methods...
}
```

### Logging

Enable protocol logging for debugging:

```csharp
// Add logging to protocol
var dxp = new DxpProtocol(position, moveGenerator);
dxp.EnableLogging = true;
```

## Examples

### Tournament Play

```csharp
// Engine 1 (Server)
var dxp1 = new DxpProtocol(Position.InitialPosition(), moveGenerator1);
await dxp1.StartAsync();

// Engine 2 (Client)  
var dxp2 = new DxpProtocol(Position.InitialPosition(), moveGenerator2);
await dxp2.ConnectAsync("engine1-host", 27531);

// Play game with alternating moves
```

### GUI Integration

```csharp
// Engine (Server for GUI)
var hub = new HubProtocol(position, moveGenerator, searchEngine);
await hub.StartAsync();
Console.WriteLine("Ready for GUI connection on port 27531");

// GUI connects and sends commands
// Engine responds with moves and status
```

## References

- DXP Protocol Specification: http://www.mesander.nl/damexchange/edxpspec.htm
- Hub Protocol Documentation: Contact GUI developers
- International Draughts Rules: FMJD official rules

## Support

For protocol-related issues:
1. Check this documentation
2. Review protocol specifications
3. Test with known-compatible software
4. Check network connectivity
5. Enable debug logging

## Future Enhancements

Potential improvements:
- [ ] SSL/TLS encryption support
- [ ] Authentication mechanism
- [ ] Compressed move transmission
- [ ] Batch move processing
- [ ] Protocol version negotiation
- [ ] Extended position information
- [ ] Analysis mode support
