/**
 * Converts an internal square number to FMJD display number.
 * The game engine uses an inverted orientation (White on 1-20),
 * while FMJD standard has White on 31-50. This function maps
 * internal squares to their FMJD equivalents for display.
 */
export const toFmjdSquare = (square: number): number => 51 - square;

/**
 * Converts an internal move notation string to FMJD display notation.
 * Transforms all square numbers in the notation (e.g., "20-25" → "31-26").
 * Supports both quiet moves ("from-to") and captures ("fromxcaptured1xcaptured2").
 */
export const toFmjdNotation = (notation: string): string =>
  notation.replace(/\d+/g, (match) => String(51 - Number(match)));
