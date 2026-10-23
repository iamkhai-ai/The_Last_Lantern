import { pointInRect, rectCenter } from './geometry';
import type { Rect } from './geometry';

/** Largest gap in px between the foot body and a target that still counts as reach (RULE_GAMES §2). */
export const REACH_GAP = 8;

/** A side of a rectangle, as seen from outside it. */
export type Face = 'north' | 'south' | 'east' | 'west';

/**
 * How an interactable is approached (RULE_GAMES §2–4).
 * - `block`: a standing object; reach is the gap from its collision rectangle, from any side.
 * - `floor`: a flat tile on the ground; reach is the foot centre inside the tile.
 * - `faces`: a wall-mounted control; reach counts only from the listed faces.
 */
export type Reach =
  | { readonly kind: 'block'; readonly rect: Rect }
  | { readonly kind: 'floor'; readonly rect: Rect }
  | { readonly kind: 'faces'; readonly rect: Rect; readonly faces: readonly Face[] };

/** A declared exception to RULE_GAMES §1–7 (RULE_GAMES §8). `reason` is required; `maxGap` widens the reach gap. */
export interface ReachException {
  readonly reason: string;
  readonly maxGap?: number;
}

/** Euclidean gap between two rectangles; 0 when they touch or overlap. */
export function rectGap(a: Rect, b: Rect): number {
  const dx = Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width), 0);
  const dy = Math.max(a.y - (b.y + b.height), b.y - (a.y + a.height), 0);
  return Math.hypot(dx, dy);
}

/** True when the foot lies wholly outside `rect` on the given face. */
function outsideFace(foot: Rect, rect: Rect, face: Face): boolean {
  switch (face) {
    case 'south': return foot.y >= rect.y + rect.height;
    case 'north': return foot.y + foot.height <= rect.y;
    case 'east': return foot.x >= rect.x + rect.width;
    case 'west': return foot.x + foot.width <= rect.x;
  }
}

/**
 * The gap used to rank a target, or `null` when the foot is out of reach.
 * `exception.maxGap` replaces REACH_GAP for this target only.
 */
export function reachGap(foot: Rect, reach: Reach, exception?: ReachException): number | null {
  const maxGap = exception?.maxGap ?? REACH_GAP;
  if (reach.kind === 'floor') return pointInRect(rectCenter(foot), reach.rect) ? 0 : null;

  const gap = rectGap(foot, reach.rect);
  if (gap > maxGap) return null;
  if (reach.kind === 'block') return gap;
  return reach.faces.some(face => outsideFace(foot, reach.rect, face)) ? gap : null;
}

/** True when the foot body is in reach of the target. */
export function isInReach(foot: Rect, reach: Reach, exception?: ReachException): boolean {
  return reachGap(foot, reach, exception) !== null;
}

/** Index of the in-reach item with the smallest gap; ties go to the lower index; -1 when none is in reach. */
export function pickTarget(
  foot: Rect,
  items: readonly { readonly reach: Reach; readonly exception?: ReachException }[],
): number {
  let best = -1;
  let bestGap = Infinity;
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const gap = reachGap(foot, item.reach, item.exception);
    if (gap !== null && gap < bestGap) {
      best = index;
      bestGap = gap;
    }
  }
  return best;
}
