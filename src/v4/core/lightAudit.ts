import { rectCenter } from './geometry';
import type { Point, Rect } from './geometry';
import { initialLantern } from './lantern';
import { LANTERN_RADIUS, canSeeMark, groundPoint, isMarkReadable, isRectLit, lanternFootprints } from './light';
import type { LightMark, Room } from './light';
import { reachableFeet } from './reachAudit';

/** A standing area is this many px square; its positions sit on the reach grid. */
export const AIM_AREA = 8;

/** Grid step for standing positions. Matches the walk grid used by reachAudit. */
const AIM_STEP = 2;

/** One aim requirement, checked from each standing position with the handheld lantern. */
export interface AimGoal {
  /** Every rect here must be lit. */
  readonly hit: readonly Rect[];
  /** No rect here may be lit. */
  readonly avoid: readonly Rect[];
  /** When set, the position must also see this mark and the mark must be readable. */
  readonly seen?: LightMark;
  readonly rooms?: readonly Room[];
}

/** The room to audit: walkability and light blockers, and where the player walks from. */
export interface AimInput {
  readonly world: Rect;
  /** Solids for walkability (walls, closed leaves, chasms...). */
  readonly solids: readonly Rect[];
  /** Light blockers (walls, closed leaves). */
  readonly blockers: readonly Rect[];
  /** Actor centre the player walks from. */
  readonly start: Point;
}

/** A block of standing positions that all meet the goal with the handheld lantern. `x`/`y` is the top-left actor centre. */
export interface AimArea {
  readonly x: number;
  readonly y: number;
}

/** Offsets of the standing positions inside an area, on the reach grid. */
const AREA_OFFSETS: readonly number[] = Array.from({ length: AIM_AREA / AIM_STEP + 1 }, (_, i) => i * AIM_STEP);

/** Ground points of the goal's anchors: the hit rect centres, or the seen mark when there are no hit rects. */
function anchorsOf(goal: AimGoal): Point[] {
  if (goal.hit.length > 0) return goal.hit.map(rectCenter);
  return goal.seen ? [rectCenter(goal.seen.rect)] : [];
}

/** True when a standing position (actor centre) meets the goal with the handheld lantern at its ground point. */
function meetsGoal(pos: Point, goal: AimGoal, input: AimInput): boolean {
  const ground = groundPoint(pos);
  const footprints = lanternFootprints(initialLantern(), ground, () => null);
  if (!goal.hit.every(r => isRectLit(r, footprints, input.blockers))) return false;
  if (goal.avoid.some(r => isRectLit(r, footprints, input.blockers))) return false;
  if (goal.seen) {
    if (!isMarkReadable(goal.seen, footprints, input.blockers)) return false;
    if (!canSeeMark(ground, goal.seen, input.blockers, goal.rooms ?? [])) return false;
  }
  return true;
}

/** Walk the candidate positions and collect up to `limit` aim areas. */
function collectAimAreas(goal: AimGoal, input: AimInput, limit: number): AimArea[] {
  const anchors = anchorsOf(goal);
  if (anchors.length === 0) return [];
  const reach = reachableFeet(input.start, input, AIM_STEP);
  const maxDistance = LANTERN_RADIUS + 8;
  const areas: AimArea[] = [];

  const candidates: Point[] = [];
  for (const key of reach) {
    const [x, y] = key.split(',').map(Number);
    const ground = groundPoint({ x, y });
    const near = anchors.some(a => {
      const dx = a.x - ground.x;
      const dy = a.y - ground.y;
      return dx * dx + dy * dy <= maxDistance * maxDistance;
    });
    if (near) candidates.push({ x, y });
  }

  const good = new Set<string>();
  for (const pos of candidates) {
    if (meetsGoal(pos, goal, input)) good.add(`${pos.x},${pos.y}`);
  }
  for (const key of good) {
    const [x, y] = key.split(',').map(Number);
    const whole = AREA_OFFSETS.every(dy => AREA_OFFSETS.every(dx => good.has(`${x + dx},${y + dy}`)));
    if (!whole) continue;
    areas.push({ x, y });
    if (areas.length >= limit) return areas;
  }
  return areas;
}

/**
 * Every AIM_AREA×AIM_AREA block of standing positions (reachable from `input.start`) that meets the goal with the handheld lantern.
 * Returns an empty array when the goal has no anchor (no hit rects and no seen mark).
 */
export function findAimAreas(goal: AimGoal, input: AimInput): AimArea[] {
  return collectAimAreas(goal, input, Infinity);
}

/** True when at least one aim area exists. Stops at the first one found. */
export function hasAimArea(goal: AimGoal, input: AimInput): boolean {
  return collectAimAreas(goal, input, 1).length > 0;
}
