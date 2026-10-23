import { FOOT_BODY, footRectAt } from './body';
import { rectsOverlap } from './geometry';
import type { Point, Rect } from './geometry';
import { REACH_GAP, isInReach, rectGap } from './reach';
import type { Face, Reach, ReachException } from './reach';

/** One interactable as the audit sees it. */
export interface AuditItem {
  readonly id: string;
  readonly reach: Reach;
  readonly exception?: ReachException;
}

/** A room to audit. `solids` holds the walls and any closed leaves; `items` the interactables. */
export interface AuditInput {
  readonly world: Rect;
  readonly solids: readonly Rect[];
  readonly hudBands: readonly Rect[];
  readonly items: readonly AuditItem[];
}

/** Only what walkability needs. */
type WalkInput = Pick<AuditInput, 'world' | 'solids'>;

/** Foot positions are sampled within this distance of an item (RULE_GAMES §9). */
const SAMPLE_BAND = 12;

const DIRECTIONS: readonly (readonly [number, number])[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function pointKey(p: Point): string {
  return `${p.x},${p.y}`;
}

/** True when the foot is inside the world and overlaps no solid. Touching an edge is allowed. */
export function isFootWalkable(foot: Rect, input: WalkInput): boolean {
  const { world } = input;
  const inside = foot.x >= world.x
    && foot.y >= world.y
    && foot.x + foot.width <= world.x + world.width
    && foot.y + foot.height <= world.y + world.height;
  return inside && !input.solids.some(solid => rectsOverlap(foot, solid));
}

/**
 * Actor centres reachable from `start` by walking, on a `step` grid (4-directional BFS).
 * Returns keys "x,y" of walkable centres. An unwalkable start gives an empty set.
 */
export function reachableFeet(start: Point, input: WalkInput, step = 2): Set<string> {
  const seen = new Set<string>();
  if (!isFootWalkable(footRectAt(start), input)) return seen;
  seen.add(pointKey(start));
  const queue: Point[] = [start];
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    for (const [dx, dy] of DIRECTIONS) {
      const next = { x: current.x + dx * step, y: current.y + dy * step };
      const key = pointKey(next);
      if (seen.has(key) || !isFootWalkable(footRectAt(next), input)) continue;
      seen.add(key);
      queue.push(next);
    }
  }
  return seen;
}

/** True when some walkable position reachable from `start` puts the foot in reach of the item. */
export function canReachItem(start: Point, item: AuditItem, input: WalkInput, step = 2): boolean {
  for (const key of reachableFeet(start, input, step)) {
    const [x, y] = key.split(',').map(Number);
    if (isInReach(footRectAt({ x, y }), item.reach, item.exception)) return true;
  }
  return false;
}

/** The face test, written here rather than read from reach.ts so the consistency check is independent. */
function onListedFace(foot: Rect, rect: Rect, faces: readonly Face[]): boolean {
  return faces.some(face => {
    switch (face) {
      case 'south': return foot.y >= rect.y + rect.height;
      case 'north': return foot.y + foot.height <= rect.y;
      case 'east': return foot.x >= rect.x + rect.width;
      case 'west': return foot.x + foot.width <= rect.x;
    }
  });
}

/**
 * Human-readable problems in a room's interactables (RULE_GAMES §6, §9). An empty array means clean.
 *
 * Per item:
 * - the collision rect must not overlap a HUD band;
 * - some walkable foot position within SAMPLE_BAND of the rect must be in reach;
 * - such a standing spot must not overlap a HUD band (reported only when the rect itself does not);
 * - for `block` and `faces`, every sampled walkable foot must agree with `gap <= maxGap`
 *   (and, for `faces`, sit on a listed face). This guards future changes to reach.ts.
 *
 * A standing spot must be walkable, so a foot overlapping the item's own rect never counts.
 */
export function auditReach(input: AuditInput): string[] {
  const problems: string[] = [];
  for (const item of input.items) {
    const rect = item.reach.rect;
    const label = `item "${item.id}"`;
    const rectInHud = input.hudBands.some(band => rectsOverlap(rect, band));
    if (rectInHud) problems.push(`${label}: collision rect overlaps a HUD band`);

    const maxGap = item.exception?.maxGap ?? REACH_GAP;
    const checkConsistency = item.reach.kind !== 'floor';
    let standingSpots = 0;
    let hudStandingSpot = false;
    let disagreement: Point | null = null;

    for (let fy = rect.y - SAMPLE_BAND - FOOT_BODY.height; fy <= rect.y + rect.height + SAMPLE_BAND; fy++) {
      for (let fx = rect.x - SAMPLE_BAND - FOOT_BODY.width; fx <= rect.x + rect.width + SAMPLE_BAND; fx++) {
        const foot = { x: fx, y: fy, width: FOOT_BODY.width, height: FOOT_BODY.height };
        if (rectGap(foot, rect) > SAMPLE_BAND) continue;
        if (!isFootWalkable(foot, input)) continue;

        const inReach = isInReach(foot, item.reach, item.exception);
        if (inReach) {
          standingSpots++;
          if (input.hudBands.some(band => rectsOverlap(foot, band))) hudStandingSpot = true;
        }
        if (checkConsistency && disagreement === null) {
          const gap = rectGap(foot, rect);
          const expected = gap <= maxGap
            && (item.reach.kind !== 'faces' || onListedFace(foot, rect, item.reach.faces));
          if (expected !== inReach) disagreement = { x: fx, y: fy };
        }
      }
    }

    if (standingSpots === 0) {
      problems.push(`${label}: no walkable foot position in reach`);
    } else if (!rectInHud && hudStandingSpot) {
      problems.push(`${label}: a standing spot in reach overlaps a HUD band`);
    }
    if (disagreement !== null) {
      problems.push(`${label}: reach at foot (${disagreement.x},${disagreement.y}) disagrees with the gap rule`);
    }
  }
  return problems;
}
