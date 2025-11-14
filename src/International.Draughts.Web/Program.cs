using International.Draughts.Web.Components;
using International.Draughts.Application.Interfaces;
using International.Draughts.Application.UseCases;
using International.Draughts.Infrastructure.Configuration;
using International.Draughts.Infrastructure.Evaluation;
using International.Draughts.Infrastructure.MoveGeneration;
using International.Draughts.Infrastructure.OpeningBook;
using International.Draughts.Infrastructure.Search;
using International.Draughts.Infrastructure.Bitbase;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();

// Register configuration
builder.Services.AddSingleton(new EngineConfiguration());

// Register application services
builder.Services.AddSingleton<IMoveGenerator, BasicMoveGenerator>();

// Register evaluation weights (optional)
builder.Services.AddSingleton<IEvaluationWeights>(sp =>
{
    string weightsPath = Path.Combine("data", "weights.dat");
    return LearnedEvaluationWeights.LoadOrDefault(weightsPath, compressed: false);
});

// Register bitbase (optional)
builder.Services.AddSingleton<IBitbase>(sp =>
{
    var bitbase = new Bitbase();
    
    // Try to load bitbases from standard location
    string bitbasePath = Path.Combine("data", "bitbases");
    if (Directory.Exists(bitbasePath))
    {
        bitbase.LoadBitbases();
    }
    
    return bitbase;
});

builder.Services.AddSingleton<ISearchEngine>(sp =>
{
    var moveGenerator = sp.GetRequiredService<IMoveGenerator>();
    var bitbase = sp.GetRequiredService<IBitbase>();
    return new BasicSearchEngine(moveGenerator, bitbase);
});

// Register opening book (optional)
builder.Services.AddSingleton<IOpeningBook>(sp =>
{
    var moveGenerator = sp.GetRequiredService<IMoveGenerator>();
    var book = new OpeningBook(moveGenerator);
    
    // Try to load opening book from standard location
    string bookPath = Path.Combine("data", "book.dat");
    if (File.Exists(bookPath))
    {
        book.LoadFromFile(bookPath);
    }
    
    return book;
});

builder.Services.AddSingleton<IGameService, GameService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHttpsRedirection();


app.UseAntiforgery();

app.MapStaticAssets();
app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

app.Run();
