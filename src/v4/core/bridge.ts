/** Result of one frame of a bridge. */
export interface BridgeStep {
  /** The bridge can be stepped on this frame. */
  readonly walkable: boolean;
  /** The bridge stays up only because a crossing is in progress; the load on it holds it until the far bank. */
  readonly holding: boolean;
}

/**
 * One frame of a bridge (puzzle-contracts §1 "Cầu"). A bridge is walkable while its condition `open` holds,
 * or while it is already carrying a foot that stays on the deck. A closed deck alone never opens it.
 * @param prevWalkable walkable state of the previous frame
 * @param open the bridge's condition this frame
 * @param onDeck the foot body overlaps the deck
 */
export function stepBridge(prevWalkable: boolean, open: boolean, onDeck: boolean): BridgeStep {
  const walkable = open || (prevWalkable && onDeck);
  return { walkable, holding: walkable && !open };
}
