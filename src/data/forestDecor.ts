/**
 * Shared forest decor generator (Level 01 Forgotten Forest Edge, Level 02 Whispering Woods).
 *
 * CampaignScene only renders these lists. Nothing here touches Phaser, the walkable layouts, collision,
 * or interaction data. Every position comes from the level's ForestDecorSite, and every random draw comes
 * from one fixed-seed PRNG, so the same site always yields the same decor.
 *
 * Draw order is part of the contract: reordering or adding a random draw reshuffles every position on that
 * level. Level 02's output is pinned by a SHA-256 guard in scripts/check-whispering-woods-decor.mjs.
 *
 * Texture keys live only in FOREST_DECOR_TEXTURES. New art for trees, roadside grass or mushrooms is swapped there.
 */

export type ForestPoint = Readonly<{ x: number; y: number }>;
export type ForestRect = Readonly<{ x: number; y: number; width: number; height: number }>;
export type ForestSpan = Readonly<{ min: number; max: number }>;

/** Everything a level contributes to its decor. Numbers that differ per level live here; shared numbers stay as constants. */
export type ForestDecorSite = Readonly<{
  /** Fixed PRNG seed. Changing it reshuffles that level's decor, so a level keeps its seed. */
  seed: number;
  /** Raw walkable path polygons. Ground cover keeps off them; they are Chaikin-smoothed for the dirt mask. */
  groundPaths: readonly (readonly ForestPoint[])[];
  /** Stands, anchors, checkpoints and interaction marks. Ground cover keeps `radius` px clear of each. */
  keepClear: Readonly<{ points: readonly ForestPoint[]; radius: number }>;
  /** Rectangles that ground cover keeps out of (for example a gate backing, already expanded by the level). */
  keepClearRects: readonly ForestRect[];
  /** Tree and rock footprints. Ground cover keeps 20 px away from each. */
  solids: readonly ForestRect[];
  /** X span of the near top row left open for the gate. */
  gateSpan: ForestSpan;
  /** X spans cut out of the bottom bush band to keep a path open (may be empty). */
  bushSkip: readonly ForestSpan[];
}>;

export type ForestDecorTree = Readonly<{ texture: string; x: number; baseY: number; flipX: boolean; scale: number; tint: number }>;
export type ForestDecorBush = Readonly<{ x: number; baseY: number; alpha: number; scale: number; tint: number }>;
export type ForestDecorProp = Readonly<{ texture: string; x: number; y: number; depth: number; flipX: boolean; scale: number; alpha: number; tint: number }>;
export type ForestDecorMark = Readonly<{ x: number; y: number; width: number; height: number; alpha: number }>;
export type ForestDecor = Readonly<{
  /** Chaikin-smoothed walkable path polygons, used for the dirt mask and edge breakup. */
  paths: readonly (readonly ForestPoint[])[];
  mottling: Readonly<{ shadows: readonly ForestDecorMark[]; moss: readonly ForestDecorMark[] }>;
  backTrees: readonly ForestDecorTree[];
  sideTrees: readonly ForestDecorTree[];
  frontBushes: readonly ForestDecorBush[];
  groundCover: Readonly<{ tufts: readonly ForestDecorProp[]; mushrooms: readonly ForestDecorProp[] }>;
  pathEdge: Readonly<{ tufts: readonly ForestDecorProp[]; shadows: readonly ForestDecorProp[] }>;
}>;

/**
 * The only place decor names its art. Swap a value here and every forest level picks up the new texture.
 * treeA/treeB alternate along each canopy row; edgeShadow is the dark blob along the path edge.
 */
export const FOREST_DECOR_TEXTURES = {
  treeA: 'tree_woods',
  treeB: 'tree_alt',
  bush: 'bush_woods',
  tuft: 'tuft_grass',
  mushroomCyan: 'mushroom_cyan',
  mushroomWarm: 'mushroom_warm',
  edgeShadow: 'shadow_blob',
} as const;

/** Native pixel height of the 'bush' texture (72x77). Front bush bases must clear the walkable band with it. */
export const FOREST_BUSH_TEXTURE_HEIGHT = 77;
export const FOREST_MOTTLE_COLOR = 0x0a1a13;
export const FOREST_MOSS_COLOR = 0x7a9a62;

/** mulberry32: small, fast, fixed-seed PRNG returning floats in [0, 1). */
export function createForestRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pointInPolygon(point: ForestPoint, polygon: readonly ForestPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Chaikin corner cutting on a closed polygon. Input is never mutated. */
export function chaikinClosed(polygon: readonly ForestPoint[], iterations = 3): ForestPoint[] {
  let points: ForestPoint[] = polygon.map((p) => ({ x: p.x, y: p.y }));
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const next: ForestPoint[] = [];
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
export function resampleClosed(polygon: readonly ForestPoint[], step: number): ForestPoint[] {
  const out: ForestPoint[] = [];
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

export function distanceToSegment(p: ForestPoint, a: ForestPoint, b: ForestPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}

export function distanceToPolygonEdge(p: ForestPoint, polygon: readonly ForestPoint[]): number {
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < polygon.length; i += 1) {
    best = Math.min(best, distanceToSegment(p, polygon[i], polygon[(i + 1) % polygon.length]));
  }
  return best;
}

export function distanceToRect(p: ForestPoint, r: ForestRect): number {
  const dx = Math.max(r.x - p.x, 0, p.x - (r.x + r.width));
  const dy = Math.max(r.y - p.y, 0, p.y - (r.y + r.height));
  return Math.hypot(dx, dy);
}

export function expandForestRect(r: ForestRect, margin: number): ForestRect {
  return { x: r.x - margin, y: r.y - margin, width: r.width + margin * 2, height: r.height + margin * 2 };
}

export function pointInForestRect(p: ForestPoint, r: ForestRect): boolean {
  return p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
}

const round1 = (v: number) => Math.round(v * 10) / 10;
const round2 = (v: number) => Math.round(v * 100) / 100;
const round3 = (v: number) => Math.round(v * 1000) / 1000;

// Top band: two staggered rows of canopy. Row 1 is the far, darker row; row 2 sits closer and skips the gate span.
// Base y never exceeds 92, so no tall tree can reach the walkable field (feet y >= 96).
const TOP_ROWS = [
  { minY: 40, maxY: 56, tint: 0x7f948a, skipGateSpan: false, start: -16 },
  { minY: 70, maxY: 92, tint: 0xa9b8ad, skipGateSpan: true, start: -1 },
] as const;
// Side bands are horizontally off-screen; base y stops before the y >= 330 bottom band.
const SIDE_BANDS = [{ min: -30, max: -8 }, { min: 648, max: 670 }] as const;
const SIDE_Y_START = 120;
const SIDE_Y_STEP = 42;
const SIDE_Y_LIMIT = 326;
const SIDE_TINT = 0x95a69b;
// Bottom band: only low bushes, spaced ~20 px so the band reads as continuous.
// Bushes are drawn at 0.45 scale (~32 px wide).
const BUSH_STEP = 20;
const BUSH_SCALE = 0.45;
const BUSH_TINT = 0x8fa79a;
const BUSH_ALPHA = 0.95;
// Ground cover: sparse, darker and more transparent than the raw grass texture.
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
const GROUND_PATH_CLEARANCE = 8;
const GROUND_SOLID_CLEARANCE = 20;

export function buildForestDecor(site: ForestDecorSite): ForestDecor {
  const rand = createForestRandom(site.seed);
  const between = (min: number, max: number) => min + (max - min) * rand();

  const spots = site.keepClear.points;
  const paths = site.groundPaths.map((polygon) => chaikinClosed(polygon, 3));

  const backTrees: ForestDecorTree[] = [];
  for (const row of TOP_ROWS) {
    let cursor = row.start;
    let index = 0;
    while (cursor <= 656) {
      const x = Math.round(cursor + between(-3, 3));
      const baseY = Math.round(between(row.minY, row.maxY));
      const flipX = rand() < 0.5;
      const scale = round2(between(0.85, 1.12));
      cursor += between(30, 36);
      if (row.skipGateSpan && x >= site.gateSpan.min && x <= site.gateSpan.max) continue;
      backTrees.push({ texture: index % 2 === 0 ? FOREST_DECOR_TEXTURES.treeA : FOREST_DECOR_TEXTURES.treeB, x, baseY, flipX, scale, tint: row.tint });
      index += 1;
    }
  }

  const sideTrees: ForestDecorTree[] = [];
  let sideIndex = 0;
  for (const band of SIDE_BANDS) {
    for (let y = SIDE_Y_START; y <= SIDE_Y_LIMIT; y += SIDE_Y_STEP) {
      const x = Math.round(between(band.min, band.max));
      const baseY = Math.round(y + between(-4, 4));
      const flipX = rand() < 0.5;
      const scale = round2(between(0.85, 1.12));
      sideTrees.push({ texture: sideIndex % 2 === 0 ? FOREST_DECOR_TEXTURES.treeA : FOREST_DECOR_TEXTURES.treeB, x, baseY, flipX, scale, tint: SIDE_TINT });
      sideIndex += 1;
    }
  }

  const frontBushes: ForestDecorBush[] = [];
  for (let x = 0; x <= 640; x += BUSH_STEP) {
    const jitteredX = Math.round(x + between(-4, 4));
    const baseY = Math.round(between(346, 366));
    if (site.bushSkip.some((span) => jitteredX >= span.min && jitteredX <= span.max)) continue;
    frontBushes.push({ x: jitteredX, baseY, alpha: BUSH_ALPHA, scale: BUSH_SCALE, tint: BUSH_TINT });
  }

  // Ground cover sits at depth 1.2-1.6, below every actor, on open grass only.
  const groundAllowed = (p: ForestPoint): boolean => {
    if (p.x < 8 || p.x > 632 || p.y < 100 || p.y > 336) return false;
    if (site.groundPaths.some((polygon) => pointInPolygon(p, polygon) || distanceToPolygonEdge(p, polygon) < GROUND_PATH_CLEARANCE)) return false;
    if (spots.some((s) => Math.hypot(s.x - p.x, s.y - p.y) <= site.keepClear.radius)) return false;
    if (site.keepClearRects.some((r) => pointInForestRect(p, r))) return false;
    if (site.solids.some((r) => distanceToRect(p, r) < GROUND_SOLID_CLEARANCE)) return false;
    return true;
  };
  const tufts: ForestDecorProp[] = [];
  for (let attempts = 0; tufts.length < TUFT_COUNT && attempts < 6000; attempts += 1) {
    const p: ForestPoint = { x: round1(between(8, 632)), y: round1(between(100, 336)) };
    const flipX = rand() < 0.5;
    const depth = round2(between(1.2, 1.6));
    if (!groundAllowed(p)) continue;
    tufts.push({ texture: FOREST_DECOR_TEXTURES.tuft, x: p.x, y: p.y, depth, flipX, scale: 1, alpha: TUFT_ALPHA, tint: TUFT_TINT });
  }
  const mushrooms: ForestDecorProp[] = [];
  for (let attempts = 0; mushrooms.length < MUSHROOM_COUNT && attempts < 6000; attempts += 1) {
    const p: ForestPoint = { x: round1(between(8, 632)), y: round1(between(100, 336)) };
    const texture = rand() < CYAN_MUSHROOM_CHANCE ? FOREST_DECOR_TEXTURES.mushroomCyan : FOREST_DECOR_TEXTURES.mushroomWarm;
    const depth = round2(between(1.4, 1.6));
    if (!groundAllowed(p)) continue;
    mushrooms.push({ texture, x: p.x, y: p.y, depth, flipX: false, scale: 1, alpha: 0.85, tint: 0xffffff });
  }

  // Mottling: soft dark patches and faint moss, drawn under the path (depth 0.3).
  const shadows: ForestDecorMark[] = [];
  for (let i = 0; i < MOTTLE_SHADOW_COUNT; i += 1) {
    const width = round1(between(40, 120));
    shadows.push({ x: round1(between(0, 640)), y: round1(between(0, 360)), width, height: round1(width * between(0.5, 0.75)), alpha: round3(between(0.16, 0.24)) });
  }
  const moss: ForestDecorMark[] = [];
  for (let i = 0; i < MOSS_COUNT; i += 1) {
    const width = round1(between(60, 140));
    moss.push({ x: round1(between(0, 640)), y: round1(between(0, 360)), width, height: round1(width * between(0.5, 0.75)), alpha: round3(between(0.06, 0.09)) });
  }

  // Path edge breakup: alternate grass tufts and dark blobs along each smoothed perimeter.
  const edgeTufts: ForestDecorProp[] = [];
  const edgeShadows: ForestDecorProp[] = [];
  for (const polygon of paths) {
    resampleClosed(polygon, PATH_EDGE_STEP).forEach((p, step) => {
      const x = round1(p.x + between(-3, 3));
      const y = round1(p.y + between(-3, 3));
      const flipX = rand() < 0.5;
      const scale = round2(between(1.4, 2.0));
      if (spots.some((s) => Math.hypot(s.x - x, s.y - y) < PATH_EDGE_CLEARANCE)) return;
      // Slots alternate tuft (even) / shadow (odd); only every second tuft slot emits a tuft.
      if (step % 2 === 0) {
        if (step % EDGE_TUFT_MODULO === 0) edgeTufts.push({ texture: FOREST_DECOR_TEXTURES.tuft, x, y, depth: 0.62, flipX, scale: 1, alpha: EDGE_TUFT_ALPHA, tint: EDGE_TUFT_TINT });
      } else {
        edgeShadows.push({ texture: FOREST_DECOR_TEXTURES.edgeShadow, x, y, depth: 0.58, flipX: false, scale, alpha: 0.28, tint: 0xffffff });
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
