import { SquareNumber } from './board';

/** A simple non-capture move from one square to another */
export interface QuietMove {
  readonly type: 'quiet';
  readonly from: SquareNumber;
  readonly to: SquareNumber;
}

/** A single capture step within a capture sequence */
export interface CaptureStep {
  readonly from: SquareNumber;
  readonly to: SquareNumber;
  readonly captured: SquareNumber;
}

/** A capture sequence (may be a single capture or multi-jump) */
export interface CaptureMove {
  readonly type: 'capture';
  readonly steps: readonly CaptureStep[];
}

/** Any legal move */
export type Move = QuietMove | CaptureMove;

/** Create a quiet move */
export const createQuietMove = (from: SquareNumber, to: SquareNumber): QuietMove => ({
  type: 'quiet',
  from,
  to,
});

/** Create a capture move from steps */
export const createCaptureMove = (steps: CaptureStep[]): CaptureMove => ({
  type: 'capture',
  steps: [...steps],
});

/** Get the starting square of a move */
export const getMoveOrigin = (move: Move): SquareNumber =>
  move.type === 'quiet' ? move.from : move.steps[0]!.from;

/** Get the ending square of a move */
export const getMoveDestination = (move: Move): SquareNumber =>
  move.type === 'quiet' ? move.to : move.steps[move.steps.length - 1]!.to;

/** Get all captured squares in a capture move */
export const getCapturedSquares = (move: CaptureMove): SquareNumber[] =>
  move.steps.map(step => step.captured);
