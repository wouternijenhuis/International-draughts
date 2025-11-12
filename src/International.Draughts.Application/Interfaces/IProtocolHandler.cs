namespace International.Draughts.Application.Interfaces;

/// <summary>
/// Interface for network protocol handlers (DXP, Hub)
/// </summary>
public interface IProtocolHandler
{
    /// <summary>
    /// Start listening for connections
    /// </summary>
    Task StartAsync(CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Stop listening and close connections
    /// </summary>
    Task StopAsync();
    
    /// <summary>
    /// Connect to a remote server
    /// </summary>
    Task ConnectAsync(string host, int port, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Send a move to the remote side
    /// </summary>
    Task SendMoveAsync(Domain.ValueObjects.Move move, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Receive a move from the remote side
    /// </summary>
    Task<Domain.ValueObjects.Move?> ReceiveMoveAsync(CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Check if connected
    /// </summary>
    bool IsConnected { get; }
}
