using International.Draughts.Application.Interfaces;
using International.Draughts.Domain.Entities;
using International.Draughts.Domain.ValueObjects;
using System.Net;
using System.Net.Sockets;
using System.Text;

namespace International.Draughts.Infrastructure.Protocols;

/// <summary>
/// Hub protocol implementation for GUI communication (Damage, Tornado, etc.)
/// </summary>
public class HubProtocol : IProtocolHandler
{
    private TcpListener? _listener;
    private TcpClient? _client;
    private NetworkStream? _stream;
    private readonly Position _initialPosition;
    private readonly IMoveGenerator _moveGenerator;
    private readonly ISearchEngine _searchEngine;
    
    public bool IsConnected => _client?.Connected ?? false;
    
    public HubProtocol(Position initialPosition, IMoveGenerator moveGenerator, ISearchEngine searchEngine)
    {
        _initialPosition = initialPosition;
        _moveGenerator = moveGenerator;
        _searchEngine = searchEngine;
    }
    
    public async Task StartAsync(CancellationToken cancellationToken = default)
    {
        _listener = new TcpListener(IPAddress.Any, 27531); // Default Hub port
        _listener.Start();
        
        Console.WriteLine("Hub: Waiting for connection on port 27531...");
        _client = await _listener.AcceptTcpClientAsync(cancellationToken);
        _stream = _client.GetStream();
        
        Console.WriteLine("Hub: Connection established");
        
        // Send Hub protocol identification
        await SendResponseAsync("OK Hub Engine Ready", cancellationToken);
    }
    
    public async Task ConnectAsync(string host, int port, CancellationToken cancellationToken = default)
    {
        _client = new TcpClient();
        await _client.ConnectAsync(host, port, cancellationToken);
        _stream = _client.GetStream();
        
        Console.WriteLine($"Hub: Connected to {host}:{port}");
    }
    
    public async Task StopAsync()
    {
        if (_stream != null)
        {
            await SendResponseAsync("BYE", CancellationToken.None);
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
        
        // Convert move to Hub format (standard notation)
        var moveStr = FormatMove(move);
        await SendResponseAsync($"MOVE {moveStr}", cancellationToken);
    }
    
    public async Task<Move?> ReceiveMoveAsync(CancellationToken cancellationToken = default)
    {
        if (_stream == null)
            throw new InvalidOperationException("Not connected");
        
        var command = await ReceiveCommandAsync(cancellationToken);
        
        if (command == null)
            return null;
        
        var parts = command.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        
        if (parts.Length < 2)
            return null;
        
        switch (parts[0].ToUpper())
        {
            case "MOVE":
                return ParseMove(parts[1]);
            case "POSITION":
                // Handle position setup command
                return null;
            case "GO":
                // Handle search command
                return null;
            default:
                return null;
        }
    }
    
    private async Task SendResponseAsync(string response, CancellationToken cancellationToken)
    {
        if (_stream == null)
            return;
        
        var bytes = Encoding.UTF8.GetBytes(response + "\n");
        await _stream.WriteAsync(bytes, cancellationToken);
        await _stream.FlushAsync(cancellationToken);
    }
    
    private async Task<string?> ReceiveCommandAsync(CancellationToken cancellationToken)
    {
        if (_stream == null)
            return null;
        
        var buffer = new byte[1024];
        var bytesRead = await _stream.ReadAsync(buffer, cancellationToken);
        
        if (bytesRead == 0)
            return null;
        
        var command = Encoding.UTF8.GetString(buffer, 0, bytesRead).Trim();
        return command;
    }
    
    private string FormatMove(Move move)
    {
        // Format as "37-28" or "37x28" for captures
        // Note: This is a simplified implementation
        // Full implementation would need position context to extract from/to squares
        return $"{move.Value}";
    }
    
    private Move? ParseMove(string moveStr)
    {
        // Parse "37-28" or "37x28" format
        moveStr = moveStr.Replace("x", "-");
        var parts = moveStr.Split('-');
        
        if (parts.Length == 2 &&
            int.TryParse(parts[0], out int from) &&
            int.TryParse(parts[1], out int to))
        {
            return Move.Make(new Square(from), new Square(to)); // Simplified
        }
        
        return null;
    }
}
