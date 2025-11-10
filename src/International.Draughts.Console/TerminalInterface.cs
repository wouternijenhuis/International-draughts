using International.Draughts.Application.Interfaces;
using International.Draughts.Domain;
using International.Draughts.Domain.Entities;
using International.Draughts.Infrastructure.Configuration;

namespace International.Draughts.Console;

/// <summary>
/// Terminal interface for text-mode interaction with the engine.
/// </summary>
public class TerminalInterface : ITerminalInterface
{
    private readonly IGameService _gameService;
    private readonly EngineConfiguration _config;
    private Game? _game;
    private bool[] _computerPlayers;
    private double _timeLimit;
    
    public TerminalInterface(IGameService gameService, EngineConfiguration config)
    {
        _gameService = gameService ?? throw new ArgumentNullException(nameof(gameService));
        _config = config ?? throw new ArgumentNullException(nameof(config));
        _computerPlayers = new[] { false, false }; // Both sides human by default
        _timeLimit = config.DefaultTimeLimit;
    }
    
    public async Task RunAsync()
    {
        _game = _gameService.CreateGame(_config.Variant);
        
        System.Console.WriteLine("Text mode ready. Type 'help' or 'h' for commands.");
        System.Console.WriteLine();
        
        await GameLoopAsync();
    }
    
    private async Task GameLoopAsync()
    {
        while (true)
        {
            DisplayPosition();
            
            if (_gameService.IsGameOver(_game!))
            {
                System.Console.WriteLine("Game over!");
                System.Console.Write("> ");
                var endCmd = System.Console.ReadLine();
                if (string.IsNullOrEmpty(endCmd))
                    break;
                continue;
            }
            
            var currentSide = _game!.CurrentPosition.Turn;
            var isComputer = _computerPlayers[(int)currentSide];
            
            if (isComputer)
            {
                // Computer move
                System.Console.WriteLine($"Computer thinking (time limit: {_timeLimit}s)...");
                var move = await Task.Run(() => _gameService.GetBestMove(_game, _timeLimit));
                
                if (!move.IsNone)
                {
                    System.Console.WriteLine($"Computer plays: {move}");
                    _gameService.MakeMove(_game, move);
                }
                else
                {
                    System.Console.WriteLine("Computer has no legal moves.");
                }
            }
            else
            {
                // Human move
                System.Console.Write("> ");
                var input = System.Console.ReadLine()?.Trim().ToLower();
                
                if (string.IsNullOrEmpty(input))
                    continue;
                
                if (!await ProcessCommandAsync(input))
                    break;
            }
        }
    }
    
    private Task<bool> ProcessCommandAsync(string input)
    {
        switch (input)
        {
            case "q":
            case "quit":
            case "exit":
                return Task.FromResult(false);
                
            case "h":
            case "help":
                DisplayHelp();
                break;
                
            case "0":
                _computerPlayers[0] = false;
                _computerPlayers[1] = false;
                System.Console.WriteLine("Mode: 0 computer players (human vs human)");
                break;
                
            case "1":
                _computerPlayers[(int)_game!.CurrentPosition.Turn] = false;
                _computerPlayers[(int)_game!.CurrentPosition.OpponentSide] = true;
                System.Console.WriteLine("Mode: 1 computer player");
                break;
                
            case "2":
                _computerPlayers[0] = true;
                _computerPlayers[1] = true;
                System.Console.WriteLine("Mode: 2 computer players (auto-play)");
                break;
                
            case "g":
            case "go":
                _computerPlayers[(int)_game!.CurrentPosition.Turn] = true;
                System.Console.WriteLine("Computer will play this side.");
                break;
                
            case "u":
            case "undo":
                if (_game!.CurrentPly > 0)
                {
                    _game.GoToPly(_game.CurrentPly - 1);
                    System.Console.WriteLine("Undone.");
                }
                else
                {
                    System.Console.WriteLine("Cannot undo: at start position.");
                }
                break;
                
            default:
                if (input.StartsWith("time "))
                {
                    if (double.TryParse(input.Substring(5), out var time) && time > 0)
                    {
                        _timeLimit = time;
                        System.Console.WriteLine($"Time limit set to {_timeLimit}s");
                    }
                    else
                    {
                        System.Console.WriteLine("Invalid time value.");
                    }
                }
                else
                {
                    System.Console.WriteLine($"Unknown command or move: {input}");
                    System.Console.WriteLine("Type 'help' for available commands.");
                }
                break;
        }
        
        return Task.FromResult(true);
    }
    
    private void DisplayPosition()
    {
        System.Console.WriteLine();
        System.Console.WriteLine($"Ply: {_game!.CurrentPly}");
        System.Console.WriteLine($"Turn: {_game.CurrentPosition.Turn}");
        System.Console.WriteLine($"White pieces: {_game.CurrentPosition.GetPieceCount(Domain.Enums.Side.White)}");
        System.Console.WriteLine($"Black pieces: {_game.CurrentPosition.GetPieceCount(Domain.Enums.Side.Black)}");
        System.Console.WriteLine();
    }
    
    private void DisplayHelp()
    {
        System.Console.WriteLine();
        System.Console.WriteLine("Available commands:");
        System.Console.WriteLine("  0-2     - Set number of computer players");
        System.Console.WriteLine("  g, go   - Make computer play current side");
        System.Console.WriteLine("  u, undo - Take back one move");
        System.Console.WriteLine("  time <n> - Set time limit in seconds (default: 10)");
        System.Console.WriteLine("  h, help - Show this help");
        System.Console.WriteLine("  q, quit - Exit the program");
        System.Console.WriteLine();
        System.Console.WriteLine("Note: Move generation and search are not yet fully implemented.");
        System.Console.WriteLine();
    }
}
