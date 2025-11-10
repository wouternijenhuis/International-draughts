namespace International.Draughts.Domain.ValueObjects;

/// <summary>
/// Represents a move in the game.
/// </summary>
public readonly struct Move : IEquatable<Move>
{
    public ulong Value { get; }
    
    public Move(ulong value)
    {
        Value = value;
    }
    
    public static Move None => new(0);
    
    public bool IsNone => Value == 0;
    
    public bool Equals(Move other) => Value == other.Value;
    public override bool Equals(object? obj) => obj is Move move && Equals(move);
    public override int GetHashCode() => Value.GetHashCode();
    
    public static bool operator ==(Move left, Move right) => left.Equals(right);
    public static bool operator !=(Move left, Move right) => !left.Equals(right);
    
    public override string ToString() => $"Move({Value:X})";
}
