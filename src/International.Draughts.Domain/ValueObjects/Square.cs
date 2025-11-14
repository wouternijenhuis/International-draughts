namespace International.Draughts.Domain.ValueObjects;

/// <summary>
/// Represents a square on the 10x10 draughts board (using sparse representation).
/// </summary>
public readonly struct Square : IEquatable<Square>
{
    public const int Size = 63; // 13x10 sparse board representation
    public const int FileSize = 10;
    public const int RankSize = 10;
    
    public int Value { get; }
    
    public Square(int value)
    {
        if (value < 0 || value >= Size)
            throw new ArgumentOutOfRangeException(nameof(value), "Square value must be between 0 and 62");
        Value = value;
    }
    
    public static Square Invalid => new(-1);
    
    public bool IsValid => Value >= 0 && Value < Size;
    
    public int File => Value % 13;
    public int Rank => Value / 13;
    
    public bool Equals(Square other) => Value == other.Value;
    public override bool Equals(object? obj) => obj is Square square && Equals(square);
    public override int GetHashCode() => Value.GetHashCode();
    
    public static bool operator ==(Square left, Square right) => left.Equals(right);
    public static bool operator !=(Square left, Square right) => !left.Equals(right);
    
    public override string ToString() => $"Square({Value})";
}
