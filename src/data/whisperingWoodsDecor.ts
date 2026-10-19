/**
 * Level 02 (Whispering Woods) decor: a pure, deterministic generator.
 *
 * CampaignScene only renders these lists. Nothing here touches Phaser, the walkable
 * layout, collision, or the woods interaction data: every position is derived from
 * WHISPERING_WOODS, and every random draw comes from one fixed-seed PRNG so two calls
 * always return the same decor.
 */
import { WHISPERING_WOODS, type WoodsPoint, type WoodsRect } from './whisperingWoodsLayout.ts';

export const WOODS_DECOR_SEED = 0x2b1e7c;
export const WOODS_MOTTLE_COLOR = 0x0a1a13;
export const WOODS_MOSS_COLOR = 0x7a9a62;
/** Native pixel height of the 'bush_woods' texture (72x77). Front bush bases must clear the walkable band with it. */
export const WOODS_BUSH_TEXTURE_HEIGHT = 77;

export type WoodsDecorTree = Readonly<{ texture: string; x: number; baseY: number; flipX: boolean; scale: number; tint: number }>;
export type WoodsDecorBush = Readonly<{ x: number; baseY: number; alpha: number; scale: number; tint: number }>;
export type WoodsDecorProp = Readonly<{ texture: string; x: number; y: number; depth: number; flipX: boolean; scale: number; alpha: number; tint: number }>;
export type WoodsDecorMark = Readonly<{ x: number; y: number; width: number; height: number; alpha: number }>;
export type WoodsDecor = Readonly<{
  /** Chaikin-smoothed walkable path polygons, used for the dirt mask and edge breakup. */
  paths: readonly (readonly WoodsPoint[])[];
  mottling: Readonly<{ shadows: readonly WoodsDecorMark[]; moss: readonly WoodsDecorMark[] }>;
  backTrees: readonly WoodsDecorTree[];
  sideTrees: readonly WoodsDecorTree[];
  frontBushes: readonly WoodsDecorBush[];
  groundCover: Readonly<{ tufts: readonly WoodsDecorProp[]; mushrooms: readonly WoodsDecorProp[] }>;
  pathEdge: Readonly<{ tufts: readonly WoodsDecorProp[]; shadows: readonly WoodsDecorProp[] }>;
}>;

/** mulberry32: small, fast, fixed-seed PRNG returning floats in [0, 1). */
export function createWoodsRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pointInPolygon(point: WoodsPoint, polygon: readonly WoodsPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Chaikin corner cutting on a closed polygon. Input is never mutated. */
export function chaikinClosed(polygon: readonly WoodsPoint[], iterations = 3): WoodsPoint[] {
  let points: WoodsPoint[] = polygon.map((p) => ({ x: p.x, y: p.y }));
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const next: WoodsPoint[] = [];
    for (let i = 0; i < points.length; i += 1) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      next.push({ x: 0.75 * a.x + 0.25 * b.x, y: 0.75 * a.y + 0.25 * b.y });
      next.push({ x: 0.25 * a.x + 0.75 * b.x, y: 0.25 * a.y + 0.75 * b.y });
    }
    points = next;
  }
  return points;
}

/** Evenly spaced points (every `step` px) along the perimeter of a closed polygon. */
function resampleClosed(polygon: readonly WoodsPoint[], step: number): WoodsPoint[] {
  const out: WoodsPoint[] = [];
  let carry = 0;
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    let distance = carry;
    while (distance < length) {
      const t = distance / length;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      distance += step;
    }
    carry = distance - length;
  }
  return out;
}

function distanceToSegment(p: WoodsPoint, a: WoodsPoint, b: WoodsPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}

function distanceToPolygonEdge(p: WoodsPoint, polygon: readonly WoodsPoint[]): number {
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < polygon.length; i += 1) {
    best = Math.min(best, distanceToSegment(p, polygon[i], polygon[(i + 1) % polygon.length]));
  }
  return best;
}

function distanceToRect(p: WoodsPoint, r: WoodsRect): number {
  const dx = Math.max(r.x - p.x, 0, p.x - (r.x + r.width));
  const dy = Math.max(r.y - p.y, 0, p.y - (r.y + r.height));
  return Math.hypot(dx, dy);
}

function expandRect(r: WoodsRect, margin: number): WoodsRect {
  return { x: r.x - margin, y: r.y - margin, width: r.width + margin * 2, height: r.height + margin * 2 };
}

function pointInRect(p: WoodsPoint, r: WoodsRect): boolean {
  return p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
}

const round1 = (v: number) => Math.round(v * 10) / 10;
const round2 = (v: number) => Math.round(v * 100) / 100;
const round3 = (v: number) => Math.round(v * 1000) / 1000;

// Top band: two staggered rows of canopy. Row 1 is the far, darker row; row 2 sits closer.
// Base y never exceeds 92, so no tall tree can reach the walkable field (feet y >= 96).
const TOP_ROWS = [
  { minY: 40, maxY: 56, tint: 0x7f948a, skipGateSpan: false, start: -16 },
  { minY: 70, maxY: 92, tint: 0xa9b8ad, skipGateSpan: true, start: -1 },
] as const;
const GATE_SPAN = { min: 448, max: 572 };
// Side bands are horizontally off-screen; base y stops before the y >= 330 bottom band.
const SIDE_BANDS = [{ min: -30, max: -8 }, { min: 648, max: 670 }] as const;
const SIDE_Y_START = 120;
const SIDE_Y_STEP = 42;
const SIDE_Y_LIMIT = 326;
const SIDE_TINT = 0x95a69b;
// Bottom band: only low bushes, skipping the southern entry path (x 92..180).
// Bushes are drawn at 0.45 scale (~32 px wide), spaced ~20 px so the band reads as continuous.
const BUSH_SKIP = { min: 92, max: 180 };
const BUSH_STEP = 20;
const BUSH_SCALE = 0.45;
const BUSH_TINT = 0x8fa79a;
const BUSH_ALPHA = 0.95;
// Ground cover: sparse, darker and more transparent than the raw 'tuft_grass' texture.
const TUFT_COUNT = 24;
const TUFT_TINT = 0x5f7d58;
const TUFT_ALPHA = 0.55;
// Path edge: tufts on every second tuft slot only, alternating slots keep their dark blobs.
const EDGE_TUFT_TINT = 0x56724f;
const EDGE_TUFT_ALPHA = 0.6;
const EDGE_TUFT_MODULO = 4;
const MUSHROOM_COUNT = 10;
const CYAN_MUSHROOM_CHANCE = 0.4;
const MOTTLE_SHADOW_COUNT = 28;
const MOSS_COUNT = 10;
const PATH_EDGE_STEP = 9;
const PATH_EDGE_CLEARANCE = 22;

export function buildWoodsDecor(): WoodsDecor {
  const rand = createWoodsRandom(WOODS_DECOR_SEED);
  const between = (min: number, max: number) => min + (max - min) * rand();

  const spots: WoodsPoint[] = [...Object.values(WHISPERING_WOODS.stands), ...Object.values(WHISPERING_WOODS.anchors)];
  const solids: WoodsRect[] = [...WHISPERING_WOODS.trees.map((t) => t.footprint), ...WHISPERING_WOODS.rocks.map((r) => r.footprint)];
  const gateZone = expandRect(WHISPERING_WOODS.gate.backing, 12);
  const paths = WHISPERING_WOODS.groundPaths.map((polygon) => chaikinClosed(polygon, 3));

  const backTrees: WoodsDecorTree[] = [];
  for (const row of TOP_ROWS) {
    let cursor = row.start;
    let index = 0;
    while (cursor <= 656) {
      const x = Math.round(cursor + between(-3, 3));
      const baseY = Math.round(between(row.minY, row.maxY));
      const flipX = rand() < 0.5;
      const scale = round2(between(0.85, 1.12));
      cursor += between(30, 36);
      if (row.skipGateSpan && x >= GATE_SPAN.min && x <= GATE_SPAN.max) continue;
      backTrees.push({ texture: index % 2 === 0 ? 'tree_woods' : 'tree_alt', x, baseY, flipX, scale, tint: row.tint });
      index += 1;
    }
  }

  const sideTrees: WoodsDecorTree[] = [];
  let sideIndex = 0;
  for (const band of SIDE_BANDS) {
    for (let y = SIDE_Y_START; y <= SIDE_Y_LIMIT; y += SIDE_Y_STEP) {
      const x = Math.round(between(band.min, band.max));
      const baseY = Math.round(y + between(-4, 4));
      const flipX = rand() < 0.5;
      const scale = round2(between(0.85, 1.12));
      sideTrees.push({ texture: sideIndex % 2 === 0 ? 'tree_woods' : 'tree_alt', x, baseY, flipX, scale, tint: SIDE_TINT });
      sideIndex += 1;
    }
  }

  const frontBushes: WoodsDecorBush[] = [];
  for (let x = 0; x <= 640; x += BUSH_STEP) {
    const jitteredX = Math.round(x + between(-4, 4));
    const baseY = Math.round(between(346, 366));
    if (jitteredX >= BUSH_SKIP.min && jitteredX <= BUSH_SKIP.max) continue;
    frontBushes.push({ x: jitteredX, baseY, alpha: BUSH_ALPHA, scale: BUSH_SCALE, tint: BUSH_TINT });
  }

  // Ground cover sits at depth 1.2-1.6, below every actor, on open grass only.
  const groundAllowed = (p: WoodsPoint): boolean => {
    if (p.x < 8 || p.x > 632 || p.y < 100 || p.y > 336) return false;
    if (WHISPERING_WOODS.groundPaths.some((polygon) => pointInPolygon(p, polygon) || distanceToPolygonEdge(p, polygon) < 8)) return false;
    if (spots.some((s) => Math.hypot(s.x - p.x, s.y - p.y) <= 26)) return false;
    if (pointInRect(p, gateZone)) return false;
    if (solids.some((r) => distanceToRect(p, r) < 20)) return false;
    return true;
  };
  const tufts: WoodsDecorProp[] = [];
  for (let attempts = 0; tufts.length < TUFT_COUNT && attempts < 6000; attempts += 1) {
    const p: WoodsPoint = { x: round1(between(8, 632)), y: round1(between(100, 336)) };
    const flipX = rand() < 0.5;
    const depth = round2(between(1.2, 1.6));
    if (!groundAllowed(p)) continue;
    tufts.push({ texture: 'tuft_grass', x: p.x, y: p.y, depth, flipX, scale: 1, alpha: TUFT_ALPHA, tint: TUFT_TINT });
  }
  const mushrooms: WoodsDecorProp[] = [];
  for (let attempts = 0; mushrooms.length < MUSHROOM_COUNT && attempts < 6000; attempts += 1) {
    const p: WoodsPoint = { x: round1(between(8, 632)), y: round1(between(100, 336)) };
    const texture = rand() < CYAN_MUSHROOM_CHANCE ? 'mushroom_cyan' : 'mushroom_warm';
    const depth = round2(between(1.4, 1.6));
    if (!groundAllowed(p)) continue;
    mushrooms.push({ texture, x: p.x, y: p.y, depth, flipX: false, scale: 1, alpha: 0.85, tint: 0xffffff });
  }

  // Mottling: soft dark patches and faint moss, drawn under the path (depth 0.3).
  const shadows: WoodsDecorMark[] = [];
  for (let i = 0; i < MOTTLE_SHADOW_COUNT; i += 1) {
    const width = round1(between(40, 120));
    shadows.push({ x: round1(between(0, 640)), y: round1(between(0, 360)), width, height: round1(width * between(0.5, 0.75)), alpha: round3(between(0.16, 0.24)) });
  }
  const moss: WoodsDecorMark[] = [];
  for (let i = 0; i < MOSS_COUNT; i += 1) {
    const width = round1(between(60, 140));
    moss.push({ x: round1(between(0, 640)), y: round1(between(0, 360)), width, height: round1(width * between(0.5, 0.75)), alpha: round3(between(0.06, 0.09)) });
  }

  // Path edge breakup: alternate grass tufts and dark blobs along each smoothed perimeter.
  const edgeTufts: WoodsDecorProp[] = [];
  const edgeShadows: WoodsDecorProp[] = [];
  for (const polygon of paths) {
    resampleClosed(polygon, PATH_EDGE_STEP).forEach((p, step) => {
      const x = round1(p.x + between(-3, 3));
      const y = round1(p.y + between(-3, 3));
      const flipX = rand() < 0.5;
      const scale = round2(between(1.4, 2.0));
      if (spots.some((s) => Math.hypot(s.x - x, s.y - y) < PATH_EDGE_CLEARANCE)) return;
      // Slots alternate tuft (even) / shadow (odd); only every second tuft slot emits a tuft.
      if (step % 2 === 0) {
        if (step % EDGE_TUFT_MODULO === 0) edgeTufts.push({ texture: 'tuft_grass', x, y, depth: 0.62, flipX, scale: 1, alpha: EDGE_TUFT_ALPHA, tint: EDGE_TUFT_TINT });
      } else {
        edgeShadows.push({ texture: 'shadow_blob', x, y, depth: 0.58, flipX: false, scale, alpha: 0.28, tint: 0xffffff });
      }
    });
  }

  return {
    paths,
    mottling: { shadows, moss },
    backTrees,
    sideTrees,
    frontBushes,
    groundCover: { tufts, mushrooms },
    pathEdge: { tufts: edgeTufts, shadows: edgeShadows },
  };
}
