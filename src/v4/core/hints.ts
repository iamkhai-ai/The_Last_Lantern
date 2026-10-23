/** Three hint levels for one puzzle state: observe, relation, concrete step (puzzle-contracts §3). */
export interface HintLadder {
  /** Identifies the puzzle state; a different key restarts the ladder. */
  readonly key: string;
  readonly steps: readonly [string, string, string];
}

/** Where the player is on the hint ladder. */
export interface HintCursor {
  readonly key: string | null;
  readonly index: number;
}

/** No hint has been shown yet. */
export const NO_HINT_CURSOR: HintCursor = { key: null, index: -1 };

/**
 * Returns the next hint text. A new `ladder.key` starts at step 0; the same key advances one step
 * and stays on the last step.
 */
export function nextHint(cursor: HintCursor, ladder: HintLadder): { cursor: HintCursor; text: string } {
  const last = ladder.steps.length - 1;
  const index = cursor.key === ladder.key ? Math.min(cursor.index + 1, last) : 0;
  return { cursor: { key: ladder.key, index }, text: ladder.steps[index] };
}
