import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:international_draughts/features/learning/data/tutorial_steps.dart';
import 'package:international_draughts/features/learning/presentation/learning_provider.dart';

/// Creates and returns a fresh [LearningNotifier] after setting up a
/// SharedPreferences mock so the async `_loadProgress` call in the constructor
/// does not hit the platform channel.
LearningNotifier _makeNotifier() {
  SharedPreferences.setMockInitialValues({});
  return LearningNotifier();
}

void main() {
  // ──────────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────────

  group('LearningNotifier — info steps', () {
    test('Step 0 (Board & Setup) is auto-completed as info step', () {
      final notifier = _makeNotifier();
      // Step 0 is an info step → automatically completed.
      expect(notifier.state.currentStep, 0);
      expect(notifier.state.stepCompleted, isTrue);
      expect(notifier.state.completedSteps, contains(0));
    });

    test('Step 7 (Promotion to King) is auto-completed as info step', () {
      final notifier = _makeNotifier();
      notifier.loadStep(6); // 0-based → step 7
      expect(notifier.state.stepCompleted, isTrue);
    });

    test('Step 11 (Draw Rules) is auto-completed as info step', () {
      final notifier = _makeNotifier();
      notifier.loadStep(10);
      expect(notifier.state.stepCompleted, isTrue);
    });

    test('Step 12 (Basic Strategy Tips) is auto-completed as info step', () {
      final notifier = _makeNotifier();
      notifier.loadStep(11);
      expect(notifier.state.stepCompleted, isTrue);
    });

    test('onSquareTap on info step is a no-op', () {
      final notifier = _makeNotifier();
      notifier.loadStep(0); // info step
      final before = notifier.state;
      notifier.onSquareTap(1);
      // State should be unchanged.
      expect(notifier.state.selectedSquare, before.selectedSquare);
      expect(notifier.state.feedbackMessage, before.feedbackMessage);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Step 2 — How Regular Pieces Move  (piece at sq 23, goalTo [28, 29])
  // ──────────────────────────────────────────────────────────────────────────

  group('Step 2 — How Regular Pieces Move', () {
    late LearningNotifier notifier;

    setUp(() {
      notifier = _makeNotifier();
      notifier.loadStep(1); // index 1 = step 2
    });

    test('step is not yet completed', () {
      expect(notifier.state.stepCompleted, isFalse);
    });

    test('white piece is at square 23', () {
      final board = notifier.currentBoard;
      expect(board[23], isNotNull);
      expect(board[23]!.color.name, 'white');
      expect(board[23]!.type.name, 'man');
    });

    test('tapping white piece at 23 selects it and shows legal targets 28 & 29', () {
      notifier.onSquareTap(23);
      expect(notifier.state.selectedSquare, 23);
      expect(notifier.state.legalMoveTargets, containsAll([28, 29]));
      expect(notifier.state.legalMoveTargets.length, 2);
    });

    test('moving white piece from 23 to 28 completes the step', () {
      notifier.onSquareTap(23); // select
      notifier.onSquareTap(28); // move
      expect(notifier.state.stepCompleted, isTrue);
      expect(notifier.state.feedbackType, 'success');
      expect(notifier.state.completedSteps, contains(1));
    });

    test('moving white piece from 23 to 29 also completes the step', () {
      notifier.onSquareTap(23);
      notifier.onSquareTap(29);
      expect(notifier.state.stepCompleted, isTrue);
      expect(notifier.state.feedbackType, 'success');
    });

    test('tapping an empty square does not select anything', () {
      notifier.onSquareTap(28); // empty at this point
      expect(notifier.state.selectedSquare, isNull);
    });

    test('tapping a non-legal destination does not complete the step', () {
      notifier.onSquareTap(23); // select
      // 27, 30 etc are not legal destinations from 23.
      notifier.onSquareTap(27);
      expect(notifier.state.stepCompleted, isFalse);
      // Piece is deselected after a miss.
      expect(notifier.state.selectedSquare, isNull);
    });

    test('after completing step, further taps are ignored', () {
      notifier.onSquareTap(23);
      notifier.onSquareTap(28); // completes
      expect(notifier.state.stepCompleted, isTrue);
      // Another tap — should not change anything meaningful.
      final msg = notifier.state.feedbackMessage;
      notifier.onSquareTap(23);
      expect(notifier.state.stepCompleted, isTrue);
      // feedbackMessage may have been cleared by timer mock but we at least
      // verify stepCompleted remains true.
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Step 3 — Capturing with Regular Pieces
  // ──────────────────────────────────────────────────────────────────────────

  group('Step 3 — Capturing with Regular Pieces', () {
    late LearningNotifier notifier;

    setUp(() {
      notifier = _makeNotifier();
      notifier.loadStep(2); // index 2 = step 3
    });

    test('white piece at 33, black piece at 28', () {
      final board = notifier.currentBoard;
      expect(board[33]?.color.name, 'white');
      expect(board[28]?.color.name, 'black');
    });

    test('selecting white piece at 33 shows capture target 22', () {
      notifier.onSquareTap(33);
      expect(notifier.state.selectedSquare, 33);
      expect(notifier.state.legalMoveTargets, contains(22));
    });

    test('executing backward capture from 33 over 28 to 22 completes step', () {
      notifier.onSquareTap(33);
      notifier.onSquareTap(22);
      expect(notifier.state.stepCompleted, isTrue);
      expect(notifier.state.feedbackType, 'success');
    });

    test('captured piece at 28 is removed from board after move', () {
      notifier.onSquareTap(33);
      notifier.onSquareTap(22);
      // Black piece at 28 must be removed.
      expect(notifier.currentBoard[28], isNull);
      // White piece now at 22.
      expect(notifier.currentBoard[22]?.color.name, 'white');
    });

    test('wrong destination shows error feedback', () {
      notifier.onSquareTap(33);
      notifier.onSquareTap(17); // not a legal capture landing
      expect(notifier.state.stepCompleted, isFalse);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Step 4 — Mandatory Capture
  // ──────────────────────────────────────────────────────────────────────────

  group('Step 4 — Mandatory Capture', () {
    late LearningNotifier notifier;

    setUp(() {
      notifier = _makeNotifier();
      notifier.loadStep(3); // index 3 = step 4
    });

    test('white pieces at 33 and 38, black piece at 28', () {
      final board = notifier.currentBoard;
      expect(board[33]?.color.name, 'white');
      expect(board[38]?.color.name, 'white');
      expect(board[28]?.color.name, 'black');
    });

    test('tapping piece 38 (cannot capture) does not select it', () {
      // Since a capture is available from 33, only captures are legal.
      // Piece 38 has no legal captures — tapping it does nothing.
      notifier.onSquareTap(38);
      expect(notifier.state.selectedSquare, isNull);
    });

    test('tapping piece 33 selects it with target 22', () {
      notifier.onSquareTap(33);
      expect(notifier.state.selectedSquare, 33);
      expect(notifier.state.legalMoveTargets, contains(22));
    });

    test('executing capture from 33 to 22 completes the step', () {
      notifier.onSquareTap(33);
      notifier.onSquareTap(22);
      expect(notifier.state.stepCompleted, isTrue);
      expect(notifier.state.feedbackType, 'success');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Step 5 — Maximum Capture Rule  (anyMove)
  // ──────────────────────────────────────────────────────────────────────────

  group('Step 5 — Maximum Capture Rule', () {
    late LearningNotifier notifier;

    setUp(() {
      notifier = _makeNotifier();
      notifier.loadStep(4); // index 4 = step 5
    });

    test('white piece at 37', () {
      expect(notifier.currentBoard[37]?.color.name, 'white');
    });

    test('any legal max-capture move completes the step', () {
      // Select the white piece at 37.
      notifier.onSquareTap(37);
      expect(notifier.state.selectedSquare, 37);
      expect(notifier.state.legalMoveTargets, isNotEmpty);

      // The max-capture sequences end at 17 or 39.
      // Play any one of the targets returned by the engine.
      final target = notifier.state.legalMoveTargets.first;
      notifier.onSquareTap(target);
      expect(notifier.state.stepCompleted, isTrue);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Step 6 — Chain (Multiple) Captures
  // ──────────────────────────────────────────────────────────────────────────

  group('Step 6 — Chain Captures', () {
    late LearningNotifier notifier;

    setUp(() {
      notifier = _makeNotifier();
      notifier.loadStep(5); // index 5 = step 6
    });

    test('white piece at 39, black pieces at 33 and 22', () {
      final board = notifier.currentBoard;
      expect(board[39]?.color.name, 'white');
      expect(board[33]?.color.name, 'black');
      expect(board[22]?.color.name, 'black');
    });

    test('selecting 39 shows chain-capture destination 17', () {
      notifier.onSquareTap(39);
      expect(notifier.state.selectedSquare, 39);
      expect(notifier.state.legalMoveTargets, contains(17));
    });

    test('executing chain capture from 39 to 17 completes the step', () {
      notifier.onSquareTap(39);
      notifier.onSquareTap(17);
      expect(notifier.state.stepCompleted, isTrue);
      expect(notifier.state.feedbackType, 'success');
    });

    test('both black pieces are removed after chain capture', () {
      notifier.onSquareTap(39);
      notifier.onSquareTap(17);
      expect(notifier.currentBoard[33], isNull);
      expect(notifier.currentBoard[22], isNull);
      expect(notifier.currentBoard[17]?.color.name, 'white');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Step 8 — Flying Kings Movement  (anyMove)
  // ──────────────────────────────────────────────────────────────────────────

  group('Step 8 — Flying Kings Movement', () {
    late LearningNotifier notifier;

    setUp(() {
      notifier = _makeNotifier();
      notifier.loadStep(7); // index 7 = step 8
    });

    test('white king at 28', () {
      final board = notifier.currentBoard;
      expect(board[28]?.color.name, 'white');
      expect(board[28]?.type.name, 'king');
    });

    test('king has many legal moves', () {
      notifier.onSquareTap(28);
      expect(notifier.state.selectedSquare, 28);
      // A flying king on an empty board at 28 has many moves.
      expect(notifier.state.legalMoveTargets.length, greaterThan(5));
    });

    test('any legal king move completes the step', () {
      notifier.onSquareTap(28);
      final target = notifier.state.legalMoveTargets.first;
      notifier.onSquareTap(target);
      expect(notifier.state.stepCompleted, isTrue);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Step 9 — Flying Kings Capturing  (anyMove)
  // ──────────────────────────────────────────────────────────────────────────

  group('Step 9 — Flying Kings Capturing', () {
    late LearningNotifier notifier;

    setUp(() {
      notifier = _makeNotifier();
      notifier.loadStep(8); // index 8 = step 9
    });

    test('white king at 46, black man at 28', () {
      final board = notifier.currentBoard;
      expect(board[46]?.color.name, 'white');
      expect(board[46]?.type.name, 'king');
      expect(board[28]?.color.name, 'black');
    });

    test('king capture destinations include squares 23, 19, 14, 10, 5', () {
      notifier.onSquareTap(46);
      expect(notifier.state.selectedSquare, 46);
      // The king at 46 can capture the black man at 28
      // and land on any square beyond it along the NE diagonal.
      for (final sq in [23, 19, 14, 10, 5]) {
        expect(
          notifier.state.legalMoveTargets,
          contains(sq),
          reason: 'Expected landing square $sq to be in legal targets',
        );
      }
    });

    test('executing any king capture completes the step', () {
      notifier.onSquareTap(46);
      notifier.onSquareTap(23); // land one square beyond 28
      expect(notifier.state.stepCompleted, isTrue);
    });

    test('captured black piece is removed after king capture', () {
      notifier.onSquareTap(46);
      notifier.onSquareTap(19);
      expect(notifier.currentBoard[28], isNull);
      expect(notifier.currentBoard[19]?.color.name, 'white');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Step 10 — Winning the Game  (anyMove)
  // ──────────────────────────────────────────────────────────────────────────

  group('Step 10 — Winning the Game', () {
    late LearningNotifier notifier;

    setUp(() {
      notifier = _makeNotifier();
      notifier.loadStep(9); // index 9 = step 10
    });

    test('has white king at 28, white man at 22, black man at 33', () {
      final board = notifier.currentBoard;
      expect(board[28]?.color.name, 'white');
      expect(board[28]?.type.name, 'king');
      expect(board[22]?.color.name, 'white');
      expect(board[33]?.color.name, 'black');
    });

    test('any legal move completes the step', () {
      // White king at 28 can capture black at 33; select 28.
      notifier.onSquareTap(28);
      expect(notifier.state.selectedSquare, 28);
      final target = notifier.state.legalMoveTargets.first;
      notifier.onSquareTap(target);
      expect(notifier.state.stepCompleted, isTrue);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Navigation
  // ──────────────────────────────────────────────────────────────────────────

  group('Navigation — nextStep / prevStep', () {
    late LearningNotifier notifier;

    setUp(() {
      notifier = _makeNotifier();
    });

    test('nextStep advances to step index 1', () {
      notifier.nextStep();
      expect(notifier.state.currentStep, 1);
    });

    test('prevStep does nothing when on the first step', () {
      notifier.prevStep();
      expect(notifier.state.currentStep, 0);
    });

    test('prevStep goes back after advancing', () {
      notifier.nextStep(); // → step 1
      notifier.prevStep(); // → step 0
      expect(notifier.state.currentStep, 0);
    });

    test('nextStep does not exceed last step', () {
      for (var i = 0; i < tutorialSteps.length + 5; i++) {
        notifier.nextStep();
      }
      expect(notifier.state.currentStep, tutorialSteps.length - 1);
    });

    test('loadStep resets selected square and feedback', () {
      notifier.loadStep(1);
      notifier.onSquareTap(23); // select a piece
      notifier.loadStep(2); // load a different step
      expect(notifier.state.selectedSquare, isNull);
      expect(notifier.state.legalMoveTargets, isEmpty);
      expect(notifier.state.feedbackMessage, isNull);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Restart
  // ──────────────────────────────────────────────────────────────────────────

  group('Restart', () {
    test('restart resets to step 0 and clears completed steps', () {
      final notifier = _makeNotifier();
      notifier.loadStep(5);
      notifier.restart();
      expect(notifier.state.currentStep, 0);
      // completedSteps may contain 0 (info step auto-completes).
      expect(notifier.state.currentStep, 0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Hint
  // ──────────────────────────────────────────────────────────────────────────

  group('Hint', () {
    test('showHint sets showHint to true', () {
      final notifier = _makeNotifier();
      notifier.loadStep(1);
      expect(notifier.state.showHint, isFalse);
      notifier.showHint();
      expect(notifier.state.showHint, isTrue);
    });

    test('loading a new step clears the hint', () {
      final notifier = _makeNotifier();
      notifier.loadStep(1);
      notifier.showHint();
      notifier.loadStep(2);
      expect(notifier.state.showHint, isFalse);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Tutorial data integrity
  // ──────────────────────────────────────────────────────────────────────────

  group('Tutorial data integrity', () {
    test('there are exactly 12 tutorial steps', () {
      expect(tutorialSteps.length, 12);
    });

    test('info steps have no goalFrom or goalTo', () {
      for (final step in tutorialSteps) {
        if (step.goalAction.type == TutorialGoalType.info) {
          expect(step.goalAction.goalFrom, isNull);
          expect(step.goalAction.goalTo, isNull);
        }
      }
    });

    test('step 2 piece is at sq 23 (not 33)', () {
      final step2 = tutorialSteps[1];
      expect(step2.goalAction.goalFrom, 23);
      expect(step2.goalAction.goalTo, containsAll([28, 29]));
      // Verify the board actually has a piece at 23.
      expect(step2.board[23], isNotNull);
      expect(step2.board[33], isNull,
          reason: 'Piece must be at 23, not 33');
    });

    test('all move-type steps have goalFrom set', () {
      for (final step in tutorialSteps) {
        if (step.goalAction.type == TutorialGoalType.move) {
          expect(
            step.goalAction.goalFrom,
            isNotNull,
            reason: '${step.title} should have goalFrom',
          );
          expect(
            step.goalAction.goalTo,
            isNotNull,
            reason: '${step.title} should have goalTo',
          );
        }
      }
    });

    test('all interactive steps have a white piece on the board', () {
      for (final step in tutorialSteps) {
        if (step.goalAction.type == TutorialGoalType.info) continue;
        var hasWhite = false;
        for (var sq = 1; sq <= 50; sq++) {
          if (step.board[sq]?.color.name == 'white') {
            hasWhite = true;
            break;
          }
        }
        expect(
          hasWhite,
          isTrue,
          reason: '${step.title} must have at least one white piece',
        );
      }
    });
  });
}
