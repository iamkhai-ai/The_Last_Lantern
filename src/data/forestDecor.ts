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

/**
 * Opt-in extra grass that hides the hard rim of the dirt path. Only a level that sets it gets the band; every other
 * level keeps a byte-identical decor output (the field is absent, not empty).
 */
export type ForestDenseEdgeGrass = Readonly<{
  /** Resample step along the smoothed perimeter. Smaller is denser. */
  step: number;
  /** Distance band, in px outside the rim, for the tufts that sit on the grass side. */
  outward: readonly [number, number];
  /** Distance band, in px inside the rim, for the tufts whose blades lean back over the dirt edge. */
  inward: readonly [number, number];
  /**
   * Base clearance from every `keepClear` point. Dense tufts are drawn below every prop (depth 0.62), so this only
   * has to keep the base of the art off the marks; it is deliberately narrower than the ground-cover `keepClear.radius`.
   */
  markClearance: number;
  /** Extra rectangles the band keeps out of (a gate threshold/opening, a doorway, ...). */
  keepClearRects: readonly ForestRect[];
}>;

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
  /** Opt-in dense grass band along the smoothed path rim. Absent on levels that keep the plain edge breakup. */
  denseEdgeGrass?: ForestDenseEdgeGrass;
}>;

export type ForestDecorTree = Readonly<{ texture: string; x: number; baseY: number; flipX: boolean; scale: number; tint: number }>;
export type ForestDecorBush = Readonly<{ x: number; baseY: number; alpha: number; scale: number; tint: number }>;
export type ForestDecorProp = Readonly<{ texture: string; x: number; y: number; depth: number; flipX: boolean; scale: number; alpha: number; tint: number }>;
export type ForestDecorMark = Readonly<{ x: number; y: number; width: number; height: number; alpha: number }>;
export type ForestDecor = Readonly<{
  /** Chaikin-smoothed walkable path polygons, used for the dirt mask and edge breakup. */
  paths: readonly (readonly ForestPoint[])[];
  mottling: Readonly<{ shadows: readonly ForestDecorMark[]; moss: readonly ForestDecorMark[] }>;
  /** Top band: far small canopy, then the near row (ancient trees with small trees in the gaps). */
  backTrees: readonly ForestDecorTree[];
  /** Side bands: ancient trees just off the left and right edges. */
  sideTrees: readonly ForestDecorTree[];
  frontBushes: readonly ForestDecorBush[];
  groundCover: Readonly<{ tufts: readonly ForestDecorProp[]; mushrooms: readonly ForestDecorProp[] }>;
  pathEdge: Readonly<{
    tufts: readonly ForestDecorProp[];
    shadows: readonly ForestDecorProp[];
    /** Opt-in dense band along the rim. Present only when the site sets `denseEdgeGrass`. */
    denseTufts?: readonly ForestDecorProp[];
  }>;
}>;

/**
 * The only place decor names its art. Swap a value here and every forest level picks up the new texture.
 * treeA/treeB alternate along the small canopy rows; ancientTrees cycle through the near row and side bands;
 * roadsideGrass is picked at random for path-edge and ground-cover grass; edgeShadow is the dark blob along the path edge.
 * The forest-expansion keys are registered in src/art/CampaignArt.ts from assets/environment/forest-expansion/sprites-v2.
 */
export const FOREST_DECOR_TEXTURES = {
  treeA: 'tree_woods',
  treeB: 'tree_alt',
  ancientTrees: ['forest_ancient_tree_01', 'forest_ancient_tree_02', 'forest_ancient_tree_03'],
  roadsideGrass: [
    'forest_roadside_grass_01', 'forest_roadside_grass_02', 'forest_roadside_grass_03', 'forest_roadside_grass_04',
    'forest_roadside_grass_05', 'forest_roadside_grass_06', 'forest_roadside_grass_07', 'forest_roadside_grass_08',
  ],
  bush: 'bush_woods',
  mushroomCyan: 'mushroom_cyan',
  mushroomWarm: 'mushroom_warm',
  edgeShadow: 'shadow_blob',
} as const;

/**
 * Where the generated forest sprites sit on their decor point. The y is the content bottom (roots or grass base),
 * not the canvas bottom: ancient trees have 4 px of padding under the roots (content ends at row 187 of 192),
 * roadside grass has 4 px of padding below the blades (content ends at row 27 of 32).
 */
export const FOREST_ART_ORIGIN = { ancientTreeY: 188 / 192, roadsideGrassY: 28 / 32 } as const;

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

// Top band: two staggered rows of canopy. Row 1 is the far, darker row of small trees; row 2 is the near row,
// led by ancient trees. Base y never exceeds 92, so no tall tree can reach the walkable field (feet y >= 96).
const TOP_ROWS = [
  { minY: 40, maxY: 56, tint: 0x7f948a, skipGateSpan: false, start: -16 },
  { minY: 70, maxY: 92, tint: 0xa9b8ad, skipGateSpan: true, start: -1 },
] as const;
const NEAR_ANCIENT_TINT = 0xb3c0b5;
const NEAR_ANCIENT_SPACING: readonly [number, number] = [100, 120];
const ANCIENT_SCALE_NEAR: readonly [number, number] = [0.72, 0.86];
/** Ancient trunks stay this far outside the gate span (x <= gate.min - 40 or x >= gate.max + 40). */
const ANCIENT_GATE_CLEARANCE = 40;
/** A small near-row tree is dropped when an ancient tree stands within this many px of it. */
const SMALL_TREE_ANCIENT_CLEARANCE = 40;
// Side bands: ancient trees just outside the left and right edges, stacked down the screen. Base y stops at 292.
const SIDE_BANDS = [{ min: -48, max: -28 }, { min: 668, max: 688 }] as const;
const SIDE_Y_START = 150;
const SIDE_Y_STEP = 68;
const SIDE_Y_LIMIT = 292;
const SIDE_SCALE: readonly [number, number] = [0.78, 0.9];
const SIDE_TINT = 0x9faea2;
// Bottom band: only low bushes, spaced ~20 px so the band reads as continuous.
// Bushes are drawn at 0.45 scale (~32 px wide).
const BUSH_STEP = 20;
const BUSH_SCALE = 0.45;
const BUSH_TINT = 0x8fa79a;
const BUSH_ALPHA = 0.95;
// Ground cover: sparse roadside grass on open ground, full alpha, tinted to sit in the scene.
const GROUND_GRASS_COUNT = 32;
const GROUND_GRASS_TINT = 0xaab6a4;
const GROUND_GRASS_ALPHA = 1;
// Path edge: roadside grass on every second edge slot, alternating slots keep their dark blobs.
const EDGE_GRASS_TINT = 0xc9d3c1;
const EDGE_GRASS_ALPHA = 1;
const EDGE_GRASS_DEPTH = 0.62;
const EDGE_TUFT_MODULO = 2;
// Dense edge grass (opt-in, Level 01): the same roadside art packed along the smoothed rim, just outside and just
// inside the dirt edge, so the path no longer ends on a hard line. Own PRNG, so no existing draw moves.
const DENSE_EDGE_SEED_XOR = 0x9e3779b1;
const DENSE_EDGE_SCALE: readonly [number, number] = [0.9, 1.2];
const DENSE_EDGE_GRASS_TINT = 0xb2c3a8;
/** Dense tufts keep this far off tree, rock and post footprints so no blade sprouts out of a trunk. */
export const DENSE_EDGE_SOLID_CLEARANCE = 4;
const MUSHROOM_COUNT = 10;
// Half scale: the 32x26 mushroom PNGs read as mossy boulders at native size and look like obstacles in the walkable field.
const MUSHROOM_SCALE = 0.5;
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
  const grassTexture = () => FOREST_DECOR_TEXTURES.roadsideGrass[Math.floor(rand() * FOREST_DECOR_TEXTURES.roadsideGrass.length)];
  let ancientIndex = 0;
  const nextAncientTexture = () => {
    const texture = FOREST_DECOR_TEXTURES.ancientTrees[ancientIndex % FOREST_DECOR_TEXTURES.ancientTrees.length];
    ancientIndex += 1;
    return texture;
  };

  const [farRow, nearRow] = TOP_ROWS;
  const backTrees: ForestDecorTree[] = [];

  // Far row: small canopy that reads as distant trees. Unchanged by the forest-expansion art.
  let farCursor = farRow.start;
  let farIndex = 0;
  while (farCursor <= 656) {
    const x = Math.round(farCursor + between(-3, 3));
    const baseY = Math.round(between(farRow.minY, farRow.maxY));
    const flipX = rand() < 0.5;
    const scale = round2(between(0.85, 1.12));
    farCursor += between(30, 36);
    backTrees.push({ texture: farIndex % 2 === 0 ? FOREST_DECOR_TEXTURES.treeA : FOREST_DECOR_TEXTURES.treeB, x, baseY, flipX, scale, tint: farRow.tint });
    farIndex += 1;
  }

  // Near row, ancient trees first: the dominant canopy, one every 100-120 px, never closer to the gate span than 40 px.
  const nearAncientX: number[] = [];
  let ancientCursor = nearRow.start;
  while (ancientCursor <= 656) {
    const x = Math.round(ancientCursor + between(-6, 6));
    const baseY = Math.round(between(nearRow.minY, nearRow.maxY));
    const flipX = rand() < 0.5;
    const scale = round2(between(ANCIENT_SCALE_NEAR[0], ANCIENT_SCALE_NEAR[1]));
    ancientCursor += between(NEAR_ANCIENT_SPACING[0], NEAR_ANCIENT_SPACING[1]);
    if (x > site.gateSpan.min - ANCIENT_GATE_CLEARANCE && x < site.gateSpan.max + ANCIENT_GATE_CLEARANCE) continue;
    backTrees.push({ texture: nextAncientTexture(), x, baseY, flipX, scale, tint: NEAR_ANCIENT_TINT });
    nearAncientX.push(x);
  }

  // Near row, small trees: only in the gaps between ancient trees, and never in the gate span.
  let nearCursor = nearRow.start;
  let nearIndex = 0;
  while (nearCursor <= 656) {
    const x = Math.round(nearCursor + between(-3, 3));
    const baseY = Math.round(between(nearRow.minY, nearRow.maxY));
    const flipX = rand() < 0.5;
    const scale = round2(between(0.85, 1.12));
    nearCursor += between(30, 36);
    if (nearRow.skipGateSpan && x >= site.gateSpan.min && x <= site.gateSpan.max) continue;
    if (nearAncientX.some((ax) => Math.abs(ax - x) < SMALL_TREE_ANCIENT_CLEARANCE)) continue;
    backTrees.push({ texture: nearIndex % 2 === 0 ? FOREST_DECOR_TEXTURES.treeA : FOREST_DECOR_TEXTURES.treeB, x, baseY, flipX, scale, tint: nearRow.tint });
    nearIndex += 1;
  }

  // Side bands: ancient trees stacked every 68 px from y 150 down to 292, alternating in variant.
  const sideTrees: ForestDecorTree[] = [];
  for (const band of SIDE_BANDS) {
    for (let y = SIDE_Y_START; y <= SIDE_Y_LIMIT; y += SIDE_Y_STEP) {
      const x = Math.round(between(band.min, band.max));
      const baseY = Math.min(SIDE_Y_LIMIT, Math.round(y + between(-3, 3)));
      const flipX = rand() < 0.5;
      const scale = round2(between(SIDE_SCALE[0], SIDE_SCALE[1]));
      sideTrees.push({ texture: nextAncientTexture(), x, baseY, flipX, scale, tint: SIDE_TINT });
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
  for (let attempts = 0; tufts.length < GROUND_GRASS_COUNT && attempts < 6000; attempts += 1) {
    const p: ForestPoint = { x: round1(between(8, 632)), y: round1(between(100, 336)) };
    const flipX = rand() < 0.5;
    const depth = round2(between(1.2, 1.6));
    if (!groundAllowed(p)) continue;
    tufts.push({ texture: grassTexture(), x: p.x, y: p.y, depth, flipX, scale: 1, alpha: GROUND_GRASS_ALPHA, tint: GROUND_GRASS_TINT });
  }
  const mushrooms: ForestDecorProp[] = [];
  for (let attempts = 0; mushrooms.length < MUSHROOM_COUNT && attempts < 6000; attempts += 1) {
    const p: ForestPoint = { x: round1(between(8, 632)), y: round1(between(100, 336)) };
    const texture = rand() < CYAN_MUSHROOM_CHANCE ? FOREST_DECOR_TEXTURES.mushroomCyan : FOREST_DECOR_TEXTURES.mushroomWarm;
    const depth = round2(between(1.4, 1.6));
    if (!groundAllowed(p)) continue;
    mushrooms.push({ texture, x: p.x, y: p.y, depth, flipX: false, scale: MUSHROOM_SCALE, alpha: 0.85, tint: 0xffffff });
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

  // Path edge breakup: alternate grass and dark blobs along each smoothed perimeter.
  const edgeTufts: ForestDecorProp[] = [];
  const edgeShadows: ForestDecorProp[] = [];
  for (const polygon of paths) {
    resampleClosed(polygon, PATH_EDGE_STEP).forEach((p, step) => {
      const x = round1(p.x + between(-3, 3));
      const y = round1(p.y + between(-3, 3));
      const flipX = rand() < 0.5;
      const scale = round2(between(1.4, 2.0));
      if (spots.some((s) => Math.hypot(s.x - x, s.y - y) < PATH_EDGE_CLEARANCE)) return;
      // Slots alternate grass (even) / shadow (odd); every even slot emits a grass stamp.
      if (step % EDGE_TUFT_MODULO === 0) {
        edgeTufts.push({ texture: grassTexture(), x, y, depth: EDGE_GRASS_DEPTH, flipX, scale: 1, alpha: EDGE_GRASS_ALPHA, tint: EDGE_GRASS_TINT });
      } else {
        edgeShadows.push({ texture: FOREST_DECOR_TEXTURES.edgeShadow, x, y, depth: 0.58, flipX: false, scale, alpha: 0.28, tint: 0xffffff });
      }
    });
  }

  // Dense edge grass (opt-in): a second, tighter pass along the same smoothed rim. It runs after every existing
  // draw and takes all of its numbers from its own PRNG, so nothing earlier (and no other level's output) changes.
  // Stamps straddle the rim: some sit `outward` px on the grass side, the rest `inward` px over the dirt edge.
  const denseBand: ForestDecorProp[] = [];
  if (site.denseEdgeGrass) {
    const spec = site.denseEdgeGrass;
    const denseRand = createForestRandom((site.seed ^ DENSE_EDGE_SEED_XOR) >>> 0);
    const denseBetween = (min: number, max: number) => min + (max - min) * denseRand();
    const denseGrassTexture = () => FOREST_DECOR_TEXTURES.roadsideGrass[Math.floor(denseRand() * FOREST_DECOR_TEXTURES.roadsideGrass.length)];
    const denseAllowed = (p: ForestPoint): boolean => p.x >= 8 && p.x <= 632 && p.y >= 96 && p.y <= 336
      && spots.every((s) => Math.hypot(s.x - p.x, s.y - p.y) >= spec.markClearance)
      && !site.keepClearRects.some((r) => pointInForestRect(p, r))
      && !spec.keepClearRects.some((r) => pointInForestRect(p, r))
      && site.solids.every((r) => distanceToRect(p, r) >= DENSE_EDGE_SOLID_CLEARANCE);
    for (const polygon of paths) {
      const samples = resampleClosed(polygon, spec.step);
      for (let index = 0; index < samples.length; index += 1) {
        const p = samples[index];
        const previous = samples[(index - 1 + samples.length) % samples.length];
        const next = samples[(index + 1) % samples.length];
        const tangentX = next.x - previous.x;
        const tangentY = next.y - previous.y;
        const tangentLength = Math.hypot(tangentX, tangentY);
        if (tangentLength === 0) continue;
        // Outward normal. Its sign is decided by pointInPolygon instead of assuming the polygon winding.
        let nx = -tangentY / tangentLength;
        let ny = tangentX / tangentLength;
        if (pointInPolygon({ x: p.x + nx * 2, y: p.y + ny * 2 }, polygon)) { nx = -nx; ny = -ny; }
        // Every random draw happens for both sides of every sample, so rejecting a stamp cannot reshuffle the band.
        const outwardDistance = denseBetween(spec.outward[0], spec.outward[1]);
        const inwardDistance = denseBetween(spec.inward[0], spec.inward[1]);
        const outwardTexture = denseGrassTexture();
        const inwardTexture = denseGrassTexture();
        const outwardFlipX = denseRand() < 0.5;
        const inwardFlipX = denseRand() < 0.5;
        const outwardScale = round2(denseBetween(DENSE_EDGE_SCALE[0], DENSE_EDGE_SCALE[1]));
        const inwardScale = round2(denseBetween(DENSE_EDGE_SCALE[0], DENSE_EDGE_SCALE[1]));
        const push = (q: ForestPoint, texture: string, flipX: boolean, scale: number) => {
          if (!denseAllowed(q)) return;
          denseBand.push({ texture, x: q.x, y: q.y, depth: EDGE_GRASS_DEPTH, flipX, scale, alpha: EDGE_GRASS_ALPHA, tint: DENSE_EDGE_GRASS_TINT });
        };
        const outside: ForestPoint = { x: round1(p.x + nx * outwardDistance), y: round1(p.y + ny * outwardDistance) };
        if (!pointInPolygon(outside, polygon)) push(outside, outwardTexture, outwardFlipX, outwardScale);
        const inside: ForestPoint = { x: round1(p.x - nx * inwardDistance), y: round1(p.y - ny * inwardDistance) };
        if (pointInPolygon(inside, polygon)) push(inside, inwardTexture, inwardFlipX, inwardScale);
      }
    }
  }

  return {
    paths,
    mottling: { shadows, moss },
    backTrees,
    sideTrees,
    frontBushes,
    groundCover: { tufts, mushrooms },
    // The dense band is only part of the object when the site opts in, so other levels keep their exact JSON shape.
    pathEdge: site.denseEdgeGrass
      ? { tufts: edgeTufts, shadows: edgeShadows, denseTufts: denseBand }
      : { tufts: edgeTufts, shadows: edgeShadows },
  };
}
