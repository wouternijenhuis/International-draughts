using System.IO.Compression;
using International.Draughts.Application.Interfaces;

namespace International.Draughts.Infrastructure.Bitbase;

/// <summary>
/// Compressed storage for bitbase data.
/// Stores win/draw/loss information and distance-to-mate for positions.
/// </summary>
public class BitbaseStorage
{
    private readonly byte[] _data;
    private readonly ulong _size;
    private readonly int _whiteMen;
    private readonly int _blackMen;
    private readonly int _whiteKings;
    private readonly int _blackKings;
    
    /// <summary>
    /// Number of bits per position: 2 bits for value (win/draw/loss/unknown) + 6 bits for DTM
    /// </summary>
    private const int BitsPerPosition = 8;
    
    public BitbaseStorage(int whiteMen, int blackMen, int whiteKings, int blackKings)
    {
        _whiteMen = whiteMen;
        _blackMen = blackMen;
        _whiteKings = whiteKings;
        _blackKings = blackKings;
        
        _size = BitbaseIndex.IndexSpaceSize(whiteMen, blackMen, whiteKings, blackKings);
        _data = new byte[(_size * BitsPerPosition + 7) / 8]; // Round up to nearest byte
    }
    
    /// <summary>
    /// Store a bitbase result for a specific index.
    /// </summary>
    public void Store(ulong index, BitbaseValue value, int distanceToMate)
    {
        if (index >= _size)
            return;
        
        // Pack value (2 bits) and distance (6 bits) into 1 byte
        byte data = value switch
        {
            BitbaseValue.Win => (byte)(0x00 | Math.Min(distanceToMate, 63)),
            BitbaseValue.Loss => (byte)(0x40 | Math.Min(distanceToMate, 63)),
            BitbaseValue.Draw => 0x80,
            _ => 0xC0 // Unknown
        };
        
        ulong byteIndex = index;
        if (byteIndex < (ulong)_data.Length)
        {
            _data[byteIndex] = data;
        }
    }
    
    /// <summary>
    /// Retrieve a bitbase result for a specific index.
    /// </summary>
    public BitbaseResult? Retrieve(ulong index)
    {
        if (index >= _size)
            return null;
        
        ulong byteIndex = index;
        if (byteIndex >= (ulong)_data.Length)
            return null;
        
        byte data = _data[byteIndex];
        
        // Unpack value and distance
        BitbaseValue value = (data & 0xC0) switch
        {
            0x00 => BitbaseValue.Win,
            0x40 => BitbaseValue.Loss,
            0x80 => BitbaseValue.Draw,
            _ => (BitbaseValue)(-1) // Unknown
        };
        
        if ((int)value == -1)
            return null;
        
        int distanceToMate = data & 0x3F;
        
        return new BitbaseResult(value, distanceToMate);
    }
    
    /// <summary>
    /// Load bitbase from compressed file.
    /// </summary>
    public static BitbaseStorage? LoadFromFile(string path, int whiteMen, int blackMen, int whiteKings, int blackKings)
    {
        if (!File.Exists(path))
            return null;
        
        try
        {
            var storage = new BitbaseStorage(whiteMen, blackMen, whiteKings, blackKings);
            
            using (var fileStream = File.OpenRead(path))
            using (var gzipStream = new GZipStream(fileStream, CompressionMode.Decompress))
            {
                int offset = 0;
                int remaining = storage._data.Length;
                
                while (remaining > 0)
                {
                    int read = gzipStream.Read(storage._data, offset, remaining);
                    if (read == 0)
                        break;
                    offset += read;
                    remaining -= read;
                }
                
                // Validate that all expected data was read
                if (remaining > 0)
                {
                    Console.WriteLine($"Warning: Incomplete bitbase file {path}. Expected {storage._data.Length} bytes, got {offset}");
                    return null;
                }
            }
            
            return storage;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to load bitbase from {path}: {ex.Message}");
            return null;
        }
    }
    
    /// <summary>
    /// Save bitbase to compressed file.
    /// </summary>
    public void SaveToFile(string path)
    {
        var directory = Path.GetDirectoryName(path);
        if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
        {
            Directory.CreateDirectory(directory);
        }
        
        using (var fileStream = File.Create(path))
        using (var gzipStream = new GZipStream(fileStream, CompressionLevel.Optimal))
        {
            gzipStream.Write(_data, 0, _data.Length);
        }
    }
    
    public int WhiteMen => _whiteMen;
    public int BlackMen => _blackMen;
    public int WhiteKings => _whiteKings;
    public int BlackKings => _blackKings;
    public ulong Size => _size;
}
