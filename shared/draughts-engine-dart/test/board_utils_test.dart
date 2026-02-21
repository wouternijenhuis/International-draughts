import 'package:draughts_engine/draughts_engine.dart';
import 'package:test/test.dart' hide isEmpty;

void main() {
  group('Board utilities', () {
    group('getPiece', () {
      test('returns piece on occupied square', () {
        final board = createEmptyBoard();
        board[1] = createPiece(PieceType.man, PlayerColor.white);
        expect(
          getPiece(board, 1),
          equals(const Piece(type: PieceType.man, color: PlayerColor.white)),
        );
      });

      test('returns null for empty square', () {
        final board = createEmptyBoard();
        expect(getPiece(board, 1), isNull);
      });
    });

    group('isEmpty', () {
      test('returns true for empty square', () {
        final board = createEmptyBoard();
        expect(isEmpty(board, 25), isTrue);
      });

      test('returns false for occupied square', () {
        final board = createEmptyBoard();
        board[25] = createPiece(PieceType.man, PlayerColor.black);
        expect(isEmpty(board, 25), isFalse);
      });
    });

    group('isEnemy / isFriendly', () {
      test('identifies enemy correctly', () {
        final board = createEmptyBoard();
        board[10] = createPiece(PieceType.man, PlayerColor.black);
        expect(isEnemy(board, 10, PlayerColor.white), isTrue);
        expect(isEnemy(board, 10, PlayerColor.black), isFalse);
      });

      test('identifies friendly correctly', () {
        final board = createEmptyBoard();
        board[10] = createPiece(PieceType.man, PlayerColor.white);
        expect(isFriendly(board, 10, PlayerColor.white), isTrue);
        expect(isFriendly(board, 10, PlayerColor.black), isFalse);
      });

      test('empty square is neither enemy nor friendly', () {
        final board = createEmptyBoard();
        expect(isEnemy(board, 10, PlayerColor.white), isFalse);
        expect(isFriendly(board, 10, PlayerColor.white), isFalse);
      });
    });

    group('movePiece', () {
      test('moves piece from origin to destination', () {
        final board = createEmptyBoard();
        board[28] = createPiece(PieceType.man, PlayerColor.white);
        final newBoard = movePiece(board, 28, 33);
        expect(newBoard[28], isNull);
        expect(
          newBoard[33],
          equals(
            const Piece(type: PieceType.man, color: PlayerColor.white),
          ),
        );
      });

      test('does not modify original board', () {
        final board = createEmptyBoard();
        board[28] = createPiece(PieceType.man, PlayerColor.white);
        movePiece(board, 28, 33);
        expect(board[28], isNotNull);
      });
    });

    group('removePiece', () {
      test('removes piece from board', () {
        final board = createEmptyBoard();
        board[28] = createPiece(PieceType.man, PlayerColor.white);
        final newBoard = removePiece(board, 28);
        expect(newBoard[28], isNull);
      });
    });

    group('promotePiece', () {
      test('promotes regular piece to king', () {
        final board = createEmptyBoard();
        board[46] = createPiece(PieceType.man, PlayerColor.white);
        final newBoard = promotePiece(board, 46);
        expect(
          newBoard[46],
          equals(
            const Piece(type: PieceType.king, color: PlayerColor.white),
          ),
        );
      });

      test('does nothing if already king', () {
        final board = createEmptyBoard();
        board[46] = createPiece(PieceType.king, PlayerColor.white);
        final newBoard = promotePiece(board, 46);
        expect(
          newBoard[46],
          equals(
            const Piece(type: PieceType.king, color: PlayerColor.white),
          ),
        );
      });
    });

    group('findPieces', () {
      test('finds all pieces of a color', () {
        final board = createEmptyBoard();
        board[1] = createPiece(PieceType.man, PlayerColor.white);
        board[5] = createPiece(PieceType.king, PlayerColor.white);
        board[50] = createPiece(PieceType.man, PlayerColor.black);
        final whites = findPieces(board, PlayerColor.white);
        expect(whites, equals([1, 5]));
      });
    });

    group('countPieces', () {
      test('counts regular pieces and kings separately', () {
        final board = createEmptyBoard();
        board[1] = createPiece(PieceType.man, PlayerColor.white);
        board[5] = createPiece(PieceType.king, PlayerColor.white);
        board[10] = createPiece(PieceType.man, PlayerColor.white);
        final count = countPieces(board, PlayerColor.white);
        expect(count.men, equals(2));
        expect(count.kings, equals(1));
        expect(count.total, equals(3));
      });
    });
  });
}
