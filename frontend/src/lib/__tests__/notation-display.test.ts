import { describe, it, expect } from 'vitest';
import { toFmjdSquare, toFmjdNotation } from '../notation-display';

describe('toFmjdSquare', () => {
  it('converts internal square 1 to FMJD 50', () => {
    expect(toFmjdSquare(1)).toBe(50);
  });

  it('converts internal square 50 to FMJD 1', () => {
    expect(toFmjdSquare(50)).toBe(1);
  });

  it('converts internal square 20 to FMJD 31', () => {
    expect(toFmjdSquare(20)).toBe(31);
  });

  it('converts internal square 26 to FMJD 25', () => {
    expect(toFmjdSquare(26)).toBe(25);
  });

  it('is its own inverse', () => {
    for (let i = 1; i <= 50; i++) {
      expect(toFmjdSquare(toFmjdSquare(i))).toBe(i);
    }
  });
});

describe('toFmjdNotation', () => {
  it('converts quiet move notation', () => {
    expect(toFmjdNotation('20-25')).toBe('31-26');
  });

  it('converts single capture notation', () => {
    expect(toFmjdNotation('19x30')).toBe('32x21');
  });

  it('converts multi-capture notation', () => {
    expect(toFmjdNotation('19x10x3')).toBe('32x41x48');
  });

  it('preserves separators', () => {
    expect(toFmjdNotation('1-50')).toBe('50-1');
  });
});
