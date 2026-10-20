/**
 * Foot-to-footprint reach for interactables (RULE_GAMES.md §1).
 *
 * Pure functions, no Phaser import. Reach is measured from the player's foot body (the Arcade body,
 * the part that actually touches furniture), not from the sprite centre, and against the object's
 * collision rectangle, not its anchor point. A control opts in by passing `reach` at registration.
 */

export interface ReachRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ReachFootprint {
  /** The object's collision rectangle, in world pixels. */
  rect: ReachRect;
  /** 'south' (default): only from the front face. 'any': from every side, within `maxGap`. */
  face?: 'south' | 'any';
  /** Largest gap in px between the foot body and `rect` that still counts as reach (default 10). */
  maxGap?: number;
  /** For face 'south' only: largest horizontal overhang in px beyond `rect`'s width (default 6). */
  sideMargin?: number;
}

const DEFAULT_MAX_GAP = 10;
const DEFAULT_SIDE_MARGIN = 6;
/** The foot may sit this many px above the south edge and still stand in front of it. */
const SOUTH_FACE_SLACK = 2;

/** Euclidean gap between two rectangles, 0 when they touch or overlap. */
export function rectGap(a: ReachRect, b: ReachRect): number {
  const dx = Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width), 0);
  const dy = Math.max(a.y - (b.y + b.height), b.y - (a.y + a.height), 0);
  return Math.hypot(dx, dy);
}

/** True when the foot body is close enough to the object's footprint to answer E. */
export function isFootInReach(foot: ReachRect, reach: ReachFootprint): boolean {
  const rect = reach.rect;
  const maxGap = reach.maxGap ?? DEFAULT_MAX_GAP;
  if ((reach.face ?? 'south') === 'any') return rectGap(foot, rect) <= maxGap;

  const southEdge = rect.y + rect.height;
  // Standing north of (or level with the upper part of) the object does not count as facing its front.
  if (foot.y < southEdge - SOUTH_FACE_SLACK) return false;
  const sideMargin = reach.sideMargin ?? DEFAULT_SIDE_MARGIN;
  const dx = Math.max(foot.x - (rect.x + rect.width), rect.x - (foot.x + foot.width), 0);
  const dy = Math.max(foot.y - southEdge, 0);
  return dx <= sideMargin && dy <= maxGap;
}
