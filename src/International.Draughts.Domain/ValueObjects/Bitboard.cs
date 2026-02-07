namespace International.Draughts.Domain.ValueObjects;

/// <summary>
/// Represents a bitboard for efficient piece representation on the board.
/// Uses a 64-bit integer where each bit represents a square.
/// </summary>
public readonly struct Bitboard : IEquatable<Bitboard>
{
    private const ulong ValidSquaresMask = 0x7DF3EF9F7CFBE7DF;
    
    public ulong Value { get; }
    
    public Bitboard(ulong value)
    {
        if ((value & ~ValidSquaresMask) != 0)
            throw new ArgumentException("Invalid bitboard value", nameof(value));
        Value = value;
    }
    
    public static Bitboard Empty => new(0);
    
    public bool IsEmpty => Value == 0;
    
    public int PopCount => System.Numerics.BitOperations.PopCount(Value);
    
    public bool Equals(Bitboard other) => Value == other.Value;
    public override bool Equals(object? obj) => obj is Bitboard bitboard && Equals(bitboard);
    public override int GetHashCode() => Value.GetHashCode();
    
    public static bool operator ==(Bitboard left, Bitboard right) => left.Equals(right);
    public static bool operator !=(Bitboard left, Bitboard right) => !left.Equals(right);
    
    public static Bitboard operator |(Bitboard left, Bitboard right) => new(left.Value | right.Value);
    public static Bitboard operator &(Bitboard left, Bitboard right) => new(left.Value & right.Value);
    public static Bitboard operator ^(Bitboard left, Bitboard right) => new(left.Value ^ right.Value);
    public static Bitboard operator ~(Bitboard bitboard) => new((~bitboard.Value) & ValidSquaresMask);
    
    public override string ToString() => $"Bitboard({Value:X16})";
}
