using International.Draughts.Application.Interfaces;
using International.Draughts.Application.UseCases;
using International.Draughts.Domain;
using International.Draughts.Infrastructure.Configuration;
using International.Draughts.Infrastructure.MoveGeneration;
using International.Draughts.Infrastructure.OpeningBook;
using International.Draughts.Infrastructure.Search;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace International.Draughts.Console;

class Program
{
    static async Task<int> Main(string[] args)
    {
        var host = CreateHostBuilder(args).Build();
        
        // Display welcome message
        System.Console.WriteLine($"{Constants.EngineName} {Constants.EngineVersion}");
        System.Console.WriteLine("International Draughts Engine");
        System.Console.WriteLine("Converted to .NET 9 with Clean Architecture");
        System.Console.WriteLine();
        System.Console.WriteLine("Original C++ version by Fabien Letouzey");
        System.Console.WriteLine("This program is distributed under the GNU General Public License version 3.");
        System.Console.WriteLine();
        
        // Parse command line arguments
        if (args.Length > 0)
        {
            var mode = args[0].ToLower();
            switch (mode)
            {
                case "dxp":
                    System.Console.WriteLine("DXP mode not yet implemented in .NET version.");
                    return 1;
                case "hub":
                    System.Console.WriteLine("Hub mode not yet implemented in .NET version.");
                    return 1;
                default:
                    System.Console.WriteLine("Text mode (default)");
                    break;
            }
        }
        
        // Start the terminal interface
        var terminal = host.Services.GetRequiredService<ITerminalInterface>();
        await terminal.RunAsync();
        
        return 0;
    }
    
    static IHostBuilder CreateHostBuilder(string[] args) =>
        Host.CreateDefaultBuilder(args)
            .ConfigureServices((context, services) =>
            {
                // Register configuration
                services.AddSingleton(new EngineConfiguration());
                
                // Register application services
                services.AddSingleton<IMoveGenerator, BasicMoveGenerator>();
                services.AddSingleton<ISearchEngine, BasicSearchEngine>();
                
                // Register opening book (optional)
                services.AddSingleton<IOpeningBook>(sp =>
                {
                    var moveGenerator = sp.GetRequiredService<IMoveGenerator>();
                    var book = new OpeningBook(moveGenerator);
                    
                    // Try to load opening book from standard location
                    string bookPath = Path.Combine("data", "book.dat");
                    if (File.Exists(bookPath))
                    {
                        book.LoadFromFile(bookPath);
                    }
                    else
                    {
                        System.Console.WriteLine("Opening book not found (optional feature)");
                    }
                    
                    return book;
                });
                
                services.AddSingleton<IGameService, GameService>();
                
                // Register terminal interface
                services.AddSingleton<ITerminalInterface, TerminalInterface>();
            });
}
