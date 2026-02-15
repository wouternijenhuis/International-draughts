namespace InternationalDraughts.Domain.Draughts;

/// <summary>
/// A single step in a capture sequence.
/// </summary>
public readonly record struct CaptureStep(int From, int To, int Captured);

/// <summary>
/// Represents a legal move in international draughts.
/// Can be either a quiet move (from → to) or a capture sequence (multiple steps).
/// </summary>
public sealed class DraughtsMove
{
    /// <summary>Whether this is a capture move.</summary>
    public bool IsCapture { get; }

    /// <summary>Origin square (quiet moves only; for captures use Steps[0].From).</summary>
    public int From { get; }

    /// <summary>Destination square (quiet moves only; for captures use Steps[^1].To).</summary>
    public int To { get; }

    /// <summary>Capture steps (capture moves only).</summary>
    public CaptureStep[] Steps { get; }

    private DraughtsMove(int from, int to)
    {
        IsCapture = false;
        From = from;
        To = to;
        Steps = [];
    }

    private DraughtsMove(CaptureStep[] steps)
    {
        IsCapture = true;
        From = steps[0].From;
        To = steps[^1].To;
        Steps = steps;
    }

    /// <summary>Creates a quiet (non-capture) move.</summary>
    public static DraughtsMove Quiet(int from, int to) => new(from, to);

    /// <summary>Creates a capture move from a sequence of steps.</summary>
    public static DraughtsMove Capture(CaptureStep[] steps) => new(steps);

    /// <summary>Origin square (works for both quiet and capture moves).</summary>
    public int Origin => IsCapture ? Steps[0].From : From;

    /// <summary>Destination square (works for both quiet and capture moves).</summary>
    public int Destination => IsCapture ? Steps[^1].To : To;

    /// <summary>Number of pieces captured.</summary>
    public int CaptureCount => Steps.Length;

    /// <summary>All captured square numbers.</summary>
    public int[] CapturedSquares => IsCapture
        ? Steps.Select(s => s.Captured).ToArray()
        : [];

    /// <summary>Formats the move in FMJD notation (e.g., "32-28" or "19x30").</summary>
    public string ToNotation()
    {
        if (!IsCapture)
            return $"{From}-{To}";

        var squares = new List<int> { Steps[0].From };
        squares.AddRange(Steps.Select(s => s.To));
        return string.Join("x", squares);
    }

    public override string ToString() => ToNotation();
}
