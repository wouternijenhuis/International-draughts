import 'package:draughts_engine/draughts_engine.dart';

/// The type of goal action for a tutorial step.
enum TutorialGoalType {
  /// Informational step — no interaction required.
  info,

  /// Player must make a specific move.
  move,

  /// Player can make any legal move.
  anyMove,
}

/// Defines the goal the player must accomplish for a tutorial step.
class TutorialGoalAction {
  /// Creates a [TutorialGoalAction].
  const TutorialGoalAction({
    required this.type,
    this.goalFrom,
    this.goalTo,
  });

  /// The type of goal.
  final TutorialGoalType type;

  /// Required starting square for 'move' goals.
  final int? goalFrom;

  /// Required destination square(s) for 'move' goals.
  final List<int>? goalTo;
}

/// A single tutorial step.
class TutorialStep {
  /// Creates a [TutorialStep].
  const TutorialStep({
    required this.title,
    required this.description,
    required this.board,
    required this.goalAction,
    this.highlights = const [],
    this.details = const [],
  });

  /// Step title.
  final String title;

  /// Main description.
  final String description;

  /// Board position for this step.
  final BoardPosition board;

  /// Squares to highlight.
  final List<int> highlights;

  /// Bullet point details.
  final List<String> details;

  /// The goal action.
  final TutorialGoalAction goalAction;
}

/// Helper to create a tutorial board from piece descriptions.
BoardPosition _createTutorialBoard(
  List<({int sq, PieceType type, PlayerColor color})> pieces,
) {
  final board = createEmptyBoard();
  for (final p in pieces) {
    board[p.sq] = createPiece(p.type, p.color);
  }
  return board;
}

/// All tutorial steps for the learning mode.
///
/// Derived from the frontend's learn page tutorial data,
/// adapted for the Dart engine's convention.
final List<TutorialStep> tutorialSteps = [
  // 1 — Board & Setup
  TutorialStep(
    title: '1. The Board & Setup',
    description:
        'International Draughts is played on a 10×10 board with alternating '
        'light and dark squares. Only the dark squares are used. Each player '
        'starts with 20 pieces placed on the first four rows.',
    board: createInitialBoard(),
    goalAction: const TutorialGoalAction(type: TutorialGoalType.info),
    details: const [
      'White pieces occupy squares 1–20 (top four rows).',
      'Black pieces occupy squares 31–50 (bottom four rows).',
      'Squares 21–30 (middle two rows) start empty.',
      'White always moves first.',
    ],
  ),

  // 2 — How Regular Pieces Move
  TutorialStep(
    title: '2. How Regular Pieces Move',
    description:
        'Regular pieces move diagonally forward by exactly one square onto '
        'an empty dark square.',
    board: _createTutorialBoard([
      (sq: 23, type: PieceType.man, color: PlayerColor.white),
    ]),
    highlights: const [28, 29],
    goalAction: const TutorialGoalAction(
      type: TutorialGoalType.move,
      goalFrom: 23,
      goalTo: [28, 29],
    ),
    details: const [
      'A regular piece can only move forward — never backward (except when capturing).',
      'Each move goes diagonally to an adjacent empty square.',
      'If a regular piece has no legal moves and cannot capture, it is stuck.',
    ],
  ),

  // 3 — Capturing with Regular Pieces
  TutorialStep(
    title: '3. Capturing with Regular Pieces',
    description:
        'Regular pieces capture by jumping diagonally over an adjacent enemy '
        'piece to the empty square beyond it. Regular pieces can capture both '
        'forward AND backward.',
    board: _createTutorialBoard([
      (sq: 33, type: PieceType.man, color: PlayerColor.white),
      (sq: 28, type: PieceType.man, color: PlayerColor.black),
    ]),
    highlights: const [22],
    goalAction: const TutorialGoalAction(
      type: TutorialGoalType.move,
      goalFrom: 33,
      goalTo: [22],
    ),
    details: const [
      'The square behind the enemy piece must be empty.',
      'The captured piece is removed from the board.',
      'Regular pieces can capture backward — a key rule of International Draughts!',
    ],
  ),

  // 4 — Mandatory Capture
  TutorialStep(
    title: '4. Mandatory Capture!',
    description:
        'In International Draughts, capturing is mandatory. If you can '
        'capture, you must capture — you cannot make a regular move instead.',
    board: _createTutorialBoard([
      (sq: 33, type: PieceType.man, color: PlayerColor.white),
      (sq: 28, type: PieceType.man, color: PlayerColor.black),
      (sq: 38, type: PieceType.man, color: PlayerColor.white),
    ]),
    highlights: const [22],
    goalAction: const TutorialGoalAction(
      type: TutorialGoalType.move,
      goalFrom: 33,
      goalTo: [22],
    ),
    details: const [
      'If any of your pieces can capture, you must make a capture move.',
      'You cannot choose to move a different piece that cannot capture.',
      'This rule applies to both regular pieces and kings.',
    ],
  ),

  // 5 — Maximum Capture Rule
  TutorialStep(
    title: '5. The Maximum Capture Rule',
    description:
        'When you have multiple capture sequences available, you MUST choose '
        'the sequence that captures the most pieces. This is the "majority rule".',
    board: _createTutorialBoard([
      (sq: 37, type: PieceType.man, color: PlayerColor.white),
      (sq: 32, type: PieceType.man, color: PlayerColor.black),
      (sq: 33, type: PieceType.man, color: PlayerColor.black),
      (sq: 22, type: PieceType.man, color: PlayerColor.black),
    ]),
    highlights: const [28, 17],
    goalAction: const TutorialGoalAction(type: TutorialGoalType.anyMove),
    details: const [
      'Count the total pieces captured in each possible sequence.',
      'You must pick the sequence with the highest total captures.',
      'If two sequences capture the same number, you may choose either.',
      'A king capture and a regular piece capture count equally.',
    ],
  ),

  // 6 — Chain Captures
  TutorialStep(
    title: '6. Chain (Multiple) Captures',
    description:
        'After making a capture, if the same piece can capture again from '
        'its landing square, it must continue capturing. This creates chain '
        'captures where you can take several pieces in one turn.',
    board: _createTutorialBoard([
      (sq: 39, type: PieceType.man, color: PlayerColor.white),
      (sq: 33, type: PieceType.man, color: PlayerColor.black),
      (sq: 22, type: PieceType.man, color: PlayerColor.black),
    ]),
    highlights: const [28, 17],
    goalAction: const TutorialGoalAction(
      type: TutorialGoalType.move,
      goalFrom: 39,
      goalTo: [17],
    ),
    details: const [
      'A regular piece continues jumping as long as captures are available.',
      'You may not stop in the middle of a chain capture.',
      'Captured pieces are removed only after the entire chain is complete.',
      'A piece cannot jump over the same enemy piece twice in one chain.',
    ],
  ),

  // 7 — Promotion to King
  TutorialStep(
    title: '7. Promotion to King',
    description:
        'When a regular piece reaches the opposite back row, it is promoted '
        'to a King. Promotion happens at the end of a move — if a regular '
        'piece reaches the back row during a chain capture, it does NOT '
        'promote until the chain is finished.',
    board: _createTutorialBoard([
      (sq: 4, type: PieceType.man, color: PlayerColor.white),
      (sq: 47, type: PieceType.man, color: PlayerColor.black),
      (sq: 25, type: PieceType.king, color: PlayerColor.white),
    ]),
    goalAction: const TutorialGoalAction(type: TutorialGoalType.info),
    details: const [
      'White promotes on squares 46–50 (bottom row from White\'s perspective).',
      'Black promotes on squares 1–5 (top row).',
      'Kings are much more powerful — protect yours and try to promote!',
    ],
  ),

  // 8 — Flying Kings — Movement
  TutorialStep(
    title: '8. Flying Kings — Movement',
    description:
        'Kings in International Draughts are "flying kings" — they can move '
        'any number of squares along a diagonal. This makes kings extremely '
        'powerful pieces.',
    board: _createTutorialBoard([
      (sq: 28, type: PieceType.king, color: PlayerColor.white),
    ]),
    highlights: const [
      1, 6, 10, 14, 19, 23, 32, 37, 41, 46,
      5, 12, 17, 22, 33, 39, 44, 50,
    ],
    goalAction: const TutorialGoalAction(type: TutorialGoalType.anyMove),
    details: const [
      'A king can move along any of its four diagonals.',
      'It can travel any number of empty squares along a diagonal.',
      'It must stay on the same diagonal for a single move.',
      'This is different from English/American checkers where kings move only one square!',
    ],
  ),

  // 9 — Flying Kings — Capturing
  TutorialStep(
    title: '9. Flying Kings — Capturing',
    description:
        'Kings capture by jumping over an enemy piece from any distance along '
        'a diagonal, and can land on any empty square beyond the captured piece.',
    board: _createTutorialBoard([
      (sq: 46, type: PieceType.king, color: PlayerColor.white),
      (sq: 28, type: PieceType.man, color: PlayerColor.black),
    ]),
    highlights: const [23, 19, 14, 10, 5],
    goalAction: const TutorialGoalAction(type: TutorialGoalType.anyMove),
    details: const [
      'The king can be far from the enemy piece — it just needs a clear diagonal.',
      'After capturing, the king can land on ANY empty square beyond the captured piece.',
      'Kings can change direction during chain captures (onto a different diagonal).',
      'A king cannot jump over its own pieces or two enemy pieces in a row.',
    ],
  ),

  // 10 — Winning the Game
  TutorialStep(
    title: '10. Winning the Game',
    description:
        'You win by either capturing all opponent\'s pieces, or by blocking '
        'them so they have no legal moves.',
    board: _createTutorialBoard([
      (sq: 28, type: PieceType.king, color: PlayerColor.white),
      (sq: 22, type: PieceType.man, color: PlayerColor.white),
      (sq: 33, type: PieceType.man, color: PlayerColor.black),
    ]),
    goalAction: const TutorialGoalAction(type: TutorialGoalType.anyMove),
    details: const [
      'Capture all enemy pieces — the most common way to win.',
      'Block all enemy pieces so they cannot move — a positional win.',
      'Games may also end in a draw (see next step).',
    ],
  ),

  // 11 — Draw Rules
  TutorialStep(
    title: '11. Draw Rules',
    description:
        'A game can end in a draw in several ways. Draws are common in '
        'high-level play.',
    board: _createTutorialBoard([
      (sq: 28, type: PieceType.king, color: PlayerColor.white),
      (sq: 46, type: PieceType.king, color: PlayerColor.black),
    ]),
    goalAction: const TutorialGoalAction(type: TutorialGoalType.info),
    details: const [
      'Mutual agreement — both players agree to a draw.',
      'Threefold repetition — the same position occurs three times.',
      '25-move rule — 25 consecutive moves by each side without capture or man move.',
      '16-move endgame rule — in king-vs-king endgames, the stronger side must win within 16 moves.',
      'In this app, draw rules are enforced automatically!',
    ],
  ),

  // 12 — Basic Strategy Tips
  TutorialStep(
    title: '12. Basic Strategy Tips',
    description:
        'Now that you know the rules, here are strategic principles to '
        'improve your game.',
    board: createInitialBoard(),
    goalAction: const TutorialGoalAction(type: TutorialGoalType.info),
    details: const [
      'Control the center — pieces in the center have more options.',
      'Keep your back row filled — prevents opponent promotion.',
      'Build formations — pieces supporting each other are stronger.',
      'Think ahead — look for forced capture sequences.',
      'Race to promote — a king is worth much more than a regular piece.',
      'Don\'t overextend — lone pieces pushed too far are easy targets.',
      'Use the mandatory capture rule — force your opponent into bad captures.',
      'Practice tactics — multiple captures and sacrifices are the heart of the game!',
    ],
  ),
];
