/** The illustration narration types itself out one character at a time, this many milliseconds per character. */
export const CAPTION_MS_PER_CHAR = 26;

/** How many characters of a caption show after `elapsedMs` of typing, never more than `total`. */
export function typedCharacters(elapsedMs: number, total: number, msPerChar = CAPTION_MS_PER_CHAR): number {
  if (elapsedMs <= 0) return 0;
  return Math.min(total, Math.floor(elapsedMs / msPerChar) + 1);
}

/**
 * Splits `count` revealed characters over pre-wrapped lines (each an array of characters), in reading order.
 * Returns the visible text of every line; lines not reached yet are empty.
 */
export function revealLines(lines: readonly (readonly string[])[], count: number): string[] {
  let left = Math.max(0, count);
  return lines.map((chars) => {
    const shown = Math.min(left, chars.length);
    left -= shown;
    return chars.slice(0, shown).join('');
  });
}
