using International.Draughts.Application.Interfaces;
using International.Draughts.Domain.Entities;
using International.Draughts.Domain.ValueObjects;
using System.Net;
using System.Net.Sockets;
using System.Text;

namespace International.Draughts.Infrastructure.Protocols;

/// <summary>
/// DXP (Dammen eXchange Protocol) implementation for engine-to-engine communication
/// </summary>
public class DxpProtocol : IProtocolHandler
{
    private TcpListener? _listener;
    private TcpClient? _client;
    private NetworkStream? _stream;
    private readonly Position _initialPosition;
    private readonly IMoveGenerator _moveGenerator;
    private bool _isWhite;
    
    public bool IsConnected => _client?.Connected ?? false;
    
    public DxpProtocol(Position initialPosition, IMoveGenerator moveGenerator)
    {
        _initialPosition = initialPosition;
        _moveGenerator = moveGenerator;
    }
    
    public async Task StartAsync(CancellationToken cancellationToken = default)
    {
        _listener = new TcpListener(IPAddress.Any, 27531); // Default DXP port
        _listener.Start();
        
        Console.WriteLine("DXP: Waiting for connection on port 27531...");
        _client = await _listener.AcceptTcpClientAsync(cancellationToken);
        _stream = _client.GetStream();
        _isWhite = false; // Server plays black
        
        Console.WriteLine("DXP: Connection established");
        
        // Send initial handshake
        await SendCommandAsync("R", cancellationToken);
        await SendCommandAsync("A", cancellationToken);
    }
    
    public async Task ConnectAsync(string host, int port, CancellationToken cancellationToken = default)
    {
        _client = new TcpClient();
        await _client.ConnectAsync(host, port, cancellationToken);
        _stream = _client.GetStream();
        _isWhite = true; // Client plays white
        
        Console.WriteLine($"DXP: Connected to {host}:{port}");
        
        // Receive initial handshake
        await ReceiveCommandAsync(cancellationToken);
        await ReceiveCommandAsync(cancellationToken);
    }
    
    public async Task StopAsync()
    {
        if (_stream != null)
        {
            await SendCommandAsync("E", CancellationToken.None);
            _stream.Close();
            _stream = null;
        }
        
        _client?.Close();
        _client = null;
        
        _listener?.Stop();
        _listener = null;
    }
    
    public async Task SendMoveAsync(Move move, CancellationToken cancellationToken = default)
    {
        if (_stream == null)
            throw new InvalidOperationException("Not connected");
        
        // Convert move to DXP format (e.g., "M3728" for 37-28)
        // Note: This is a simplified implementation
        // Full implementation would need position context to extract from/to squares
        var moveStr = $"M{move.Value}";
        
        await SendCommandAsync(moveStr, cancellationToken);
    }
    
    public async Task<Move?> ReceiveMoveAsync(CancellationToken cancellationToken = default)
    {
        if (_stream == null)
            throw new InvalidOperationException("Not connected");
        
        var command = await ReceiveCommandAsync(cancellationToken);
        
        if (command == null || !command.StartsWith("M"))
            return null;
        
        // Parse DXP move format "M3728"
        if (command.Length >= 5)
        {
            var fromStr = command.Substring(1, 2);
            var toStr = command.Substring(3, 2);
            
            if (int.TryParse(fromStr, out int from) && int.TryParse(toStr, out int to))
            {
                return Move.Make(new Square(from), new Square(to)); // Simplified
            }
        }
        
        return null;
    }
    
    private async Task SendCommandAsync(string command, CancellationToken cancellationToken)
    {
        if (_stream == null)
            return;
        
        var bytes = Encoding.ASCII.GetBytes(command + "\n");
        await _stream.WriteAsync(bytes, cancellationToken);
        await _stream.FlushAsync(cancellationToken);
    }
    
    private async Task<string?> ReceiveCommandAsync(CancellationToken cancellationToken)
    {
        if (_stream == null)
            return null;
        
        var buffer = new byte[256];
        var bytesRead = await _stream.ReadAsync(buffer, cancellationToken);
        
        if (bytesRead == 0)
            return null;
        
        var command = Encoding.ASCII.GetString(buffer, 0, bytesRead).Trim();
        return command;
    }
}
