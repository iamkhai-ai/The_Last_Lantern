import { footRectAt } from './body';
import { pointInRect, rectCenter } from './geometry';
import type { Point, Rect } from './geometry';
import type { LanternState } from './lantern';

/** The eight directions Nhinh can face. Same strings as `Player.FacingDirection`. */
export type Facing = 'up' | 'upright' | 'right' | 'downright' | 'down' | 'downleft' | 'left' | 'upleft';

/** Every facing, in a fixed order. */
export const FACINGS: readonly Facing[] = ['up', 'upright', 'right', 'downright', 'down', 'downleft', 'left', 'upleft'];

/** Beam length from the ground point, in px. */
export const BEAM_LENGTH = 56;
/** Beam width at the root (the ground point), in px. */
export const BEAM_ROOT_WIDTH = 12;
/** Beam width at the far end, in px. */
export const BEAM_FAR_WIDTH = 32;
/** Halo radius around a light origin (hand or pedestal), in px. */
export const HALO_RADIUS = 12;
/** Distance from the ground point to a mark centre within which Nhinh can see the mark, in px. */
export const SEEN_RADIUS = 64;

const DIAGONAL = Math.SQRT1_2;

/** Unit vector of a facing; screen y grows downward; diagonals are (±√½, ±√½). */
export function facingVector(f: Facing): Point {
  switch (f) {
    case 'up': return { x: 0, y: -1 };
    case 'upright': return { x: DIAGONAL, y: -DIAGONAL };
    case 'right': return { x: 1, y: 0 };
    case 'downright': return { x: DIAGONAL, y: DIAGONAL };
    case 'down': return { x: 0, y: 1 };
    case 'downleft': return { x: -DIAGONAL, y: DIAGONAL };
    case 'left': return { x: -1, y: 0 };
    case 'upleft': return { x: -DIAGONAL, y: -DIAGONAL };
  }
}

/** The floor point under Nhinh: the centre of her foot body. Light and line of sight start here. */
export function groundPoint(actor: Point): Point {
  return rectCenter(footRectAt(actor));
}

/**
 * The beam's four corners, in order: root-left, far-left, far-right, root-right.
 * "Left" and "right" are relative to the facing (screen left/right when facing up).
 * The polygon is convex.
 */
export function beamPolygon(origin: Point, facing: Facing): Point[] {
  const d = facingVector(facing);
  const n = { x: -d.y, y: d.x };
  const rootHalf = BEAM_ROOT_WIDTH / 2;
  const farHalf = BEAM_FAR_WIDTH / 2;
  const farX = origin.x + d.x * BEAM_LENGTH;
  const farY = origin.y + d.y * BEAM_LENGTH;
  return [
    { x: origin.x - n.x * rootHalf, y: origin.y - n.y * rootHalf },
    { x: farX - n.x * farHalf, y: farY - n.y * farHalf },
    { x: farX + n.x * farHalf, y: farY + n.y * farHalf },
    { x: origin.x + n.x * rootHalf, y: origin.y + n.y * rootHalf },
  ];
}

/**
 * One piece of light on the floor.
 * - `beam`: the trapezoid from `origin` along `facing`; blocked from `origin`.
 * - `halo`: a circle around `center`; blocked from `center`.
 * - `area`: a declared polygon (pedestal spill or fixed source). `origin` is where its light comes from
 *   and is used for blocking; null means authored and never clipped.
 */
export type Footprint =
  | { readonly kind: 'beam'; readonly origin: Point; readonly facing: Facing }
  | { readonly kind: 'halo'; readonly center: Point; readonly radius: number }
  | { readonly kind: 'area'; readonly points: readonly Point[]; readonly origin: Point | null };

/** A pedestal's declared spill (puzzle-contracts §1): a convex polygon lit while the lantern is lit on that pedestal. */
export interface SpillDecl {
  readonly pedestalId: string;
  readonly points: readonly Point[];
}

/**
 * The lantern's footprints now. Off: none. In hand: beam + halo at `ground`, along `facing`.
 * On a pedestal: a halo at `pedestalAt(id)` plus that pedestal's spills, each with origin = the pedestal point.
 * A pedestal with no position gives no footprints.
 */
export function lanternFootprints(
  lantern: LanternState,
  ground: Point,
  facing: Facing,
  pedestalAt: (pedestalId: string) => Point | null,
  spills: readonly SpillDecl[] = [],
): Footprint[] {
  if (!lantern.on) return [];
  if (lantern.location.at === 'hand') {
    return [
      { kind: 'beam', origin: ground, facing },
      { kind: 'halo', center: ground, radius: HALO_RADIUS },
    ];
  }
  const pedestalId = lantern.location.pedestalId;
  const at = pedestalAt(pedestalId);
  if (at === null) return [];
  const footprints: Footprint[] = [{ kind: 'halo', center: at, radius: HALO_RADIUS }];
  for (const spill of spills) {
    if (spill.pedestalId === pedestalId) {
      footprints.push({ kind: 'area', points: spill.points, origin: at });
    }
  }
  return footprints;
}

/** Point in a convex polygon; points on the boundary count as inside. Works for either winding. */
export function pointInConvexPolygon(p: Point, polygon: readonly Point[]): boolean {
  const EPS = 1e-9;
  let hasPositive = false;
  let hasNegative = false;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    if (cross > EPS) hasPositive = true;
    if (cross < -EPS) hasNegative = true;
    if (hasPositive && hasNegative) return false;
  }
  return true;
}

/**
 * Liang–Barsky clip of the segment a→b against one rect's open interior.
 * Returns true when the clipped parameter range is non-empty with positive length.
 */
function segmentCrossesInterior(a: Point, b: Point, r: Rect): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  let t0 = 0;
  let t1 = 1;
  const pairs: readonly (readonly [number, number])[] = [
    [-dx, a.x - r.x],
    [dx, r.x + r.width - a.x],
    [-dy, a.y - r.y],
    [dy, r.y + r.height - a.y],
  ];
  for (const [p, q] of pairs) {
    if (p === 0) {
      if (q <= 0) return false;
      continue;
    }
    const t = q / p;
    if (p < 0) {
      if (t > t1) return false;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return false;
      if (t < t1) t1 = t;
    }
  }
  return t0 < t1;
}

/** True when the segment a→b passes through the open interior of some blocker (Liang–Barsky, strict). */
export function segmentBlocked(a: Point, b: Point, blockers: readonly Rect[]): boolean {
  return blockers.some(r => segmentCrossesInterior(a, b, r));
}

/** Whether `p` lies inside a footprint's own shape, ignoring blockers. */
function inShape(p: Point, f: Footprint): boolean {
  switch (f.kind) {
    case 'beam': return pointInConvexPolygon(p, beamPolygon(f.origin, f.facing));
    case 'halo': {
      const dx = p.x - f.center.x;
      const dy = p.y - f.center.y;
      return dx * dx + dy * dy <= f.radius * f.radius;
    }
    case 'area': return pointInConvexPolygon(p, f.points);
  }
}

/** The point a footprint's light comes from for blocking, or null when it is never clipped. */
function sourceOf(f: Footprint): Point | null {
  switch (f.kind) {
    case 'beam': return f.origin;
    case 'halo': return f.center;
    case 'area': return f.origin;
  }
}

/** Inside some footprint's shape (halo: distance ≤ radius) and not hidden from that footprint's origin by a blocker. */
export function isPointLit(p: Point, footprints: readonly Footprint[], blockers: readonly Rect[]): boolean {
  return footprints.some(f => {
    if (!inShape(p, f)) return false;
    const source = sourceOf(f);
    return source === null || !segmentBlocked(source, p, blockers);
  });
}

/** One rect's sample coordinates along an axis: start, start+step, …, and always the far edge. */
function axisSamples(start: number, length: number, step: number): number[] {
  const values: number[] = [];
  for (let v = start; v < start + length; v += step) values.push(v);
  values.push(start + length);
  return values;
}

/**
 * True when any sample point of the rect is lit. Samples: x = rect.x, rect.x+step, … and always rect.x+width;
 * same for y. Default step 2.
 */
export function isRectLit(rect: Rect, footprints: readonly Footprint[], blockers: readonly Rect[], step = 2): boolean {
  const xs = axisSamples(rect.x, rect.width, step);
  const ys = axisSamples(rect.y, rect.height, step);
  for (const y of ys) {
    for (const x of xs) {
      if (isPointLit({ x, y }, footprints, blockers)) return true;
    }
  }
  return false;
}

/** Lit marks sit in light; dark marks sit out of it. */
export type LightMarkKind = 'lit' | 'dark';

/** A mark on the floor that Nhinh can read or find. */
export interface LightMark {
  readonly id: string;
  readonly kind: LightMarkKind;
  readonly rect: Rect;
}

/** A room, for the "seen" rule. Rooms are half-open rects. */
export interface Room {
  readonly id: string;
  readonly rect: Rect;
}

/** A lit mark reads only under a footprint; a dark mark only when no footprint covers it. */
export function isMarkReadable(mark: LightMark, footprints: readonly Footprint[], blockers: readonly Rect[]): boolean {
  const lit = isRectLit(mark.rect, footprints, blockers);
  return mark.kind === 'lit' ? lit : !lit;
}

/** The id of the first room (in list order) whose rect contains the point (half-open), or null. */
export function roomAt(p: Point, rooms: readonly Room[]): string | null {
  const room = rooms.find(r => pointInRect(p, r.rect));
  return room ? room.id : null;
}

/**
 * Whether Nhinh, standing with her ground point at `ground`, can see the mark: distance ground → mark centre ≤ SEEN_RADIUS,
 * same room when `rooms` is non-empty (roomAt of both points equal and not null), and no blocker on the segment ground → mark centre.
 * Readability is checked separately.
 */
export function canSeeMark(ground: Point, mark: LightMark, blockers: readonly Rect[], rooms: readonly Room[] = []): boolean {
  const center = rectCenter(mark.rect);
  const dx = center.x - ground.x;
  const dy = center.y - ground.y;
  if (dx * dx + dy * dy > SEEN_RADIUS * SEEN_RADIUS) return false;
  if (rooms.length > 0) {
    const from = roomAt(ground, rooms);
    if (from === null || from !== roomAt(center, rooms)) return false;
  }
  return !segmentBlocked(ground, center, blockers);
}

/** Ids, in `marks` order, of marks that are readable, seen, and not yet in `found`. */
export function marksToRecord(
  ground: Point,
  marks: readonly LightMark[],
  footprints: readonly Footprint[],
  blockers: readonly Rect[],
  rooms: readonly Room[],
  found: ReadonlySet<string>,
): string[] {
  return marks
    .filter(m => !found.has(m.id))
    .filter(m => isMarkReadable(m, footprints, blockers) && canSeeMark(ground, m, blockers, rooms))
    .map(m => m.id);
}
