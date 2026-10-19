export interface GardenPoint { x: number; y: number }
export interface GardenRect { x: number; y: number; width: number; height: number }
export type GardenSpanId = 's1' | 's2';
export type GardenCrossingSide = 'west' | 'east';

export const GARDEN_ACTOR = { feetY: 19, bodyX: -7, bodyY: 16, bodyWidth: 14, bodyHeight: 6 };

export function gardenActorBody(center: GardenPoint): GardenRect {
  return { x: center.x + GARDEN_ACTOR.bodyX, y: center.y + GARDEN_ACTOR.bodyY, width: GARDEN_ACTOR.bodyWidth, height: GARDEN_ACTOR.bodyHeight };
}

export function rectsOverlap(a: GardenRect, b: GardenRect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function pointInRect(p: GardenPoint, r: GardenRect): boolean {
  return p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
}

export function gardenPropDepth(bottomY: number): number { return 10 + bottomY / 10; }
export function gardenActorDepth(centerY: number): number { return 10 + (centerY + GARDEN_ACTOR.feetY) / 10; }

export interface GardenState {
  canopyShut: boolean;
  sunLatched: boolean;
  waterFlowing: boolean;
  returnLatched: boolean;
  lumoRealized: boolean;
  bridgeCrossed: boolean;
  crossingSide: GardenCrossingSide | null;
}

export function readGardenState(flags: Record<string, unknown>): GardenState {
  const side = flags['l6-crossing-side'];
  const state: GardenState = {
    canopyShut: flags['l6-canopy-shut'] === true,
    sunLatched: flags['l6-sun-latched'] === true,
    waterFlowing: flags['l6-water-flowing'] === true,
    returnLatched: flags['l6-return-latched'] === true,
    lumoRealized: flags['l6-lumo-realized'] === true,
    bridgeCrossed: flags['l6-bridge-crossed'] === true,
    crossingSide: side === 'west' || side === 'east' ? side : null,
  };
  return sanitizeGardenState(state);
}

export function sanitizeGardenState(state: GardenState): GardenState {
  const next: GardenState = { ...state };
  if (next.returnLatched) next.waterFlowing = true;
  if (next.waterFlowing) next.bridgeCrossed = next.bridgeCrossed || next.returnLatched;
  if (!next.canopyShut && (next.sunLatched || next.returnLatched)) next.canopyShut = true;
  if (!next.bridgeCrossed) next.crossingSide = null;
  return next;
}

export function effectiveLight(state: GardenState, lanternOn: boolean): boolean {
  return !state.canopyShut || lanternOn;
}

export function sunOpen(state: GardenState, lanternOn: boolean): boolean {
  return effectiveLight(state, lanternOn);
}

export function barRaised(state: GardenState, lanternOn: boolean): boolean {
  return effectiveLight(state, lanternOn) || state.sunLatched;
}

export function rootsDeployed(state: GardenState, lanternOn: boolean): boolean {
  return state.canopyShut && !lanternOn;
}

export function sidePathOpen(state: GardenState): boolean {
  return state.returnLatched;
}

export const GARDEN_BAR_BEAM: GardenRect = { x: 107, y: 136, width: 87, height: 26 };
/**
 * The gate-bar sprite (112x72 at top-left 94,104) holds two posts and a beam. Raised or held, only
 * the beam (rows 0..29) is overhead (depth 70); the posts (rows 30..71) sort with the world by their
 * feet at y=176 so the actor is never painted over a post it stands in front of.
 */
export const GARDEN_BAR_SPRITE: GardenRect = { x: 94, y: 104, width: 112, height: 72 };
export const GARDEN_BAR_BEAM_ROWS = 30;
export const GARDEN_BAR_POSTS: Array<{ id: 'w' | 'e'; crop: GardenRect }> = [
  { id: 'w', crop: { x: 0, y: GARDEN_BAR_BEAM_ROWS, width: 16, height: 72 - GARDEN_BAR_BEAM_ROWS } },
  { id: 'e', crop: { x: 96, y: GARDEN_BAR_BEAM_ROWS, width: 16, height: 72 - GARDEN_BAR_BEAM_ROWS } },
];

/** Where the two practice pots are close enough to read (the south lawn, zone z1-lawn). */
export const GARDEN_OBSERVATION_ZONE: GardenRect = { x: 28, y: 266, width: 276, height: 82 };
export function inGardenObservationZone(center: GardenPoint): boolean { return pointInRect(center, GARDEN_OBSERVATION_ZONE); }

/** Any light change (on->off or off->on) after the canopy is shut arms the practice lesson once. */
export function practiceLessonArmed(canopyShut: boolean, observed: boolean): boolean { return canopyShut && !observed; }

/** The armed lesson plays only while the player stands where both pots can be read; otherwise it keeps waiting. */
export function practiceLessonDue(pending: boolean, canopyShut: boolean, observed: boolean, center: GardenPoint): boolean {
  return pending && practiceLessonArmed(canopyShut, observed) && inGardenObservationZone(center);
}

/**
 * Scenario §7 beat: a silhouette crosses the light by the shrine gate, stops beside the seedlings
 * and slips out of sight by the gate pillar. Points are ground anchors (bottom-centre).
 */
export const GARDEN_SHADOW_PATH = {
  appear: { x: 574, y: 84 } as GardenPoint,
  toSeedlings: [{ x: 574, y: 262 }, { x: 548, y: 272 }, { x: 524, y: 274 }] as GardenPoint[],
  back: [{ x: 548, y: 272 }, { x: 574, y: 258 }, { x: 574, y: 124 }, { x: 556, y: 102 }] as GardenPoint[],
  speed: 110,
  stopMs: 1100,
} as const;
export const GARDEN_BRIDGE: GardenRect = { x: 304, y: 228, width: 92, height: 20 };
// The visible plank PNG (side-stone-path-closed/open) is 80x32 native; the solid the
// closed plank draws with matches that art exactly so no invisible blocker is left at
// the strip's east end. The walkable side strip itself stays 92 wide (GARDEN_SIDE_STRIP).
export const GARDEN_SIDE_PATH: GardenRect = { x: 304, y: 284, width: 80, height: 32 };
export const GARDEN_SIDE_STRIP: GardenRect = { x: 304, y: 284, width: 92, height: 24 };
export const GARDEN_SPANS: Record<GardenSpanId, GardenRect> = {
  s1: { x: 304, y: 228, width: 46, height: 20 },
  s2: { x: 347, y: 228, width: 49, height: 20 },
};

export interface GardenHeldSpans { s1: boolean; s2: boolean }
export const NO_HELD_SPANS: GardenHeldSpans = { s1: false, s2: false };

export function bridgeWalkable(span: GardenSpanId, state: GardenState, lanternOn: boolean, held: GardenHeldSpans): boolean {
  return rootsDeployed(state, lanternOn) || held[span];
}

export function updateHeldSpans(held: GardenHeldSpans, state: GardenState, lanternOn: boolean, body: GardenRect): GardenHeldSpans {
  const next: GardenHeldSpans = { s1: held.s1, s2: held.s2 };
  for (const span of ['s1', 's2'] as const) {
    if (rootsDeployed(state, lanternOn)) { next[span] = false; continue; }
    const overlaps = rectsOverlap(body, GARDEN_SPANS[span]);
    if (overlaps) next[span] = true;
    else if (next[span]) next[span] = false;
  }
  return next;
}

export const GARDEN_ZONES: Array<{ id: string; rect: GardenRect }> = [
  { id: 'z1-lawn', rect: { x: 28, y: 266, width: 276, height: 82 } },
  { id: 'z2-forecourt', rect: { x: 218, y: 186, width: 86, height: 64 } },
  { id: 'z3-terrace', rect: { x: 208, y: 96, width: 96, height: 90 } },
  { id: 'gate-corridor', rect: { x: 104, y: 136, width: 92, height: 20 } },
  { id: 'z4-west-field', rect: { x: 28, y: 156, width: 164, height: 62 } },
  { id: 'connector', rect: { x: 192, y: 156, width: 26, height: 42 } },
  { id: 'z5-reservoir-nook', rect: { x: 28, y: 56, width: 132, height: 80 } },
  { id: 'z5-nook-east', rect: { x: 160, y: 56, width: 48, height: 30 } },
  { id: 'sluice-crossing', rect: { x: 148, y: 218, width: 44, height: 48 } },
  { id: 'bridge-strip', rect: { x: 304, y: 228, width: 92, height: 20 } },
  { id: 'side-strip', rect: { x: 304, y: 284, width: 92, height: 24 } }, // GARDEN_SIDE_STRIP
  { id: 'nursery', rect: { x: 364, y: 96, width: 160, height: 196 } },
  { id: 'steps', rect: { x: 524, y: 252, width: 12, height: 40 } },
  { id: 'walkway', rect: { x: 536, y: 96, width: 76, height: 196 } },
  { id: 'gate-opening', rect: { x: 552, y: 0, width: 44, height: 96 } },
  { id: 'entry-mouth', rect: { x: 216, y: 348, width: 42, height: 12 } },
];

export const GARDEN_STATIC_SOLIDS: Array<{ id: string; rect: GardenRect }> = [
  { id: 'band-north-a', rect: { x: 0, y: 0, width: 552, height: 56 } },
  { id: 'band-north-b', rect: { x: 596, y: 0, width: 44, height: 56 } },
  { id: 'band-west', rect: { x: 0, y: 56, width: 28, height: 304 } },
  { id: 'band-south-west', rect: { x: 0, y: 348, width: 216, height: 12 } },
  { id: 'band-south-east', rect: { x: 258, y: 348, width: 382, height: 12 } },
  { id: 'south-east-band', rect: { x: 304, y: 312, width: 336, height: 48 } },
  { id: 'east-band', rect: { x: 612, y: 96, width: 28, height: 264 } },
  { id: 'pond-railing', rect: { x: 208, y: 56, width: 328, height: 40 } },
  { id: 'gate-west-wall', rect: { x: 520, y: 56, width: 32, height: 40 } },
  { id: 'gate-east-wall', rect: { x: 596, y: 56, width: 44, height: 40 } },
  { id: 'wall-nw', rect: { x: 28, y: 136, width: 76, height: 20 } },
  { id: 'wall-nw-east', rect: { x: 196, y: 136, width: 12, height: 20 } },
  { id: 'platform-stone', rect: { x: 160, y: 86, width: 56, height: 50 } },
  { id: 'tower', rect: { x: 192, y: 198, width: 26, height: 64 } },
  { id: 'wall-lawn-north-west', rect: { x: 28, y: 250, width: 120, height: 16 } },
  { id: 'wall-lawn-north-east-a', rect: { x: 218, y: 250, width: 28, height: 16 } },
  { id: 'wall-lawn-north-east-b', rect: { x: 282, y: 250, width: 22, height: 16 } },
  { id: 'wall-canal-north', rect: { x: 28, y: 218, width: 120, height: 8 } },
  { id: 'wall-walkway-west', rect: { x: 524, y: 96, width: 12, height: 156 } },
  { id: 'balu-south', rect: { x: 396, y: 308, width: 216, height: 20 } },
  { id: 'canal-west-wall-a', rect: { x: 304, y: 96, width: 8, height: 132 } },
  { id: 'canal-west-wall-b', rect: { x: 304, y: 248, width: 8, height: 36 } },
  { id: 'canal-west-wall-c', rect: { x: 304, y: 312, width: 8, height: 36 } },
  { id: 'canal-east-wall-a', rect: { x: 356, y: 96, width: 8, height: 132 } },
  { id: 'canal-east-wall-b', rect: { x: 356, y: 248, width: 8, height: 36 } },
  { id: 'canal-east-wall-c', rect: { x: 356, y: 312, width: 8, height: 36 } },
  { id: 'tree-trunk-sw', rect: { x: 40, y: 296, width: 24, height: 24 } },
  { id: 'wall-lawn-south-west', rect: { x: 120, y: 330, width: 72, height: 18 } },
  { id: 'bar-post-west', rect: { x: 99, y: 136, width: 8, height: 40 } },
  { id: 'bar-post-east', rect: { x: 194, y: 136, width: 8, height: 40 } },
  { id: 'reservoir', rect: { x: 36, y: 58, width: 80, height: 72 } },
  { id: 'shutter-handle', rect: { x: 120, y: 86, width: 24, height: 40 } },
  { id: 'sun-main', rect: { x: 200, y: 152, width: 40, height: 44 } },
  { id: 'latch-west', rect: { x: 128, y: 96, width: 28, height: 32 } },
  { id: 'moon-main', rect: { x: 252, y: 186, width: 48, height: 44 } },
  { id: 'drain', rect: { x: 436, y: 224, width: 52, height: 48 } },
  { id: 'latch-east', rect: { x: 400, y: 240, width: 28, height: 32 } },
  { id: 'practice-sun-pot', rect: { x: 74, y: 294, width: 40, height: 44 } },
  { id: 'practice-moon-pot', rect: { x: 136, y: 290, width: 40, height: 38 } },
];

export const GARDEN_WATER: GardenRect[] = [
  { x: 312, y: 96, width: 44, height: 132 },
  { x: 312, y: 248, width: 44, height: 36 },
  { x: 28, y: 226, width: 120, height: 24 },
];

export interface GardenDynamicSolid { id: string; rect: GardenRect; enabled: boolean }

export function gardenDynamicSolids(state: GardenState, lanternOn: boolean, held: GardenHeldSpans = NO_HELD_SPANS): GardenDynamicSolid[] {
  const solids: GardenDynamicSolid[] = [];
  solids.push({ id: 'bar-beam', rect: GARDEN_BAR_BEAM, enabled: !barRaised(state, lanternOn) });
  if (!sidePathOpen(state)) solids.push({ id: 'side-plank', rect: GARDEN_SIDE_PATH, enabled: true });
  const deployed = rootsDeployed(state, lanternOn);
  solids.push({ id: 'bridge-s1', rect: GARDEN_SPANS.s1, enabled: !deployed && !held.s1 });
  solids.push({ id: 'bridge-s2', rect: GARDEN_SPANS.s2, enabled: !deployed && !held.s2 });
  return solids;
}

export function gardenActiveSolids(state: GardenState, lanternOn: boolean, held: GardenHeldSpans = NO_HELD_SPANS): GardenRect[] {
  const rects: GardenRect[] = GARDEN_STATIC_SOLIDS.map((solid) => solid.rect).concat(GARDEN_WATER);
  for (const solid of gardenDynamicSolids(state, lanternOn, held)) {
    if (solid.enabled) rects.push(solid.rect);
  }
  return rects;
}

export function isGardenPositionSafe(state: GardenState, lanternOn: boolean, held: GardenHeldSpans, center: GardenPoint): boolean {
  if (center.x < GARDEN_BOUNDS.minX || center.x > GARDEN_BOUNDS.maxX || center.y < GARDEN_BOUNDS.minY || center.y > GARDEN_BOUNDS.maxY) return false;
  const body = gardenActorBody(center);
  return !gardenActiveSolids(state, lanternOn, held).some((rect) => rectsOverlap(body, rect));
}

export function inGateCorridor(p: GardenPoint): boolean {
  return p.x >= 104 && p.x <= 196 && p.y >= 100 && p.y <= 136;
}

/**
 * Live-condition guards for the two corridor controls (mirrored by the controller so the
 * "nearest target wins" rule can never pick a disabled neighbour). The handle is only
 * useful while the reservoir canopy is still open; the stone latch only exists once the
 * canopy is shut and the bar is up. They are therefore never enabled at the same time.
 */
export function gardenHandleEnabled(state: GardenState): boolean {
  return !state.canopyShut;
}

export function gardenLatchWestEnabled(state: GardenState, lanternOn: boolean): boolean {
  return state.canopyShut && !state.sunLatched && barRaised(state, lanternOn);
}

export function gardenDrainEnabled(state: GardenState): boolean {
  return !state.waterFlowing && (state.bridgeCrossed || state.returnLatched);
}

export function gardenLatchEastEnabled(state: GardenState): boolean {
  return state.waterFlowing && !state.returnLatched;
}

export const GARDEN_STAGE_ANCHORS: GardenPoint[] = [
  { x: 238, y: 300 },
  { x: 200, y: 300 },
  { x: 258, y: 300 },
  { x: 440, y: 282 },
  { x: 576, y: 150 },
  { x: 574, y: 64 },
];

export const GARDEN_BOUNDS = { minX: 14, maxX: 626, minY: 12, maxY: 348 };

/** Collision-aware walk grid: cells are player centers on a 4px lattice inside GARDEN_BOUNDS. */
export const GARDEN_REACH_STEP = 4;
export const GARDEN_REACH_ORIGIN: GardenPoint = { x: GARDEN_BOUNDS.minX, y: GARDEN_BOUNDS.minY };

export function gardenCellOf(center: GardenPoint): { i: number; j: number } {
  return {
    i: Math.round((center.x - GARDEN_REACH_ORIGIN.x) / GARDEN_REACH_STEP),
    j: Math.round((center.y - GARDEN_REACH_ORIGIN.y) / GARDEN_REACH_STEP),
  };
}

export function gardenCellKey(center: GardenPoint): string {
  const { i, j } = gardenCellOf(center);
  return `${i}:${j}`;
}

export function gardenCellCenter(i: number, j: number): GardenPoint {
  return { x: GARDEN_REACH_ORIGIN.x + i * GARDEN_REACH_STEP, y: GARDEN_REACH_ORIGIN.y + j * GARDEN_REACH_STEP };
}

export function gardenCellInBounds(i: number, j: number): boolean {
  const { x, y } = gardenCellCenter(i, j);
  return x >= GARDEN_BOUNDS.minX && x <= GARDEN_BOUNDS.maxX && y >= GARDEN_BOUNDS.minY && y <= GARDEN_BOUNDS.maxY;
}

/**
 * Flood-fills every player-center cell reachable from `start` using the live solid predicate.
 * Rendering, checks and safe-restore all consume this single implementation (no copies).
 */
export function gardenReachableRegion(
  state: GardenState, lanternOn: boolean, held: GardenHeldSpans, start: GardenPoint = GARDEN_SPAWN,
): Set<string> {
  const region = new Set<string>();
  const startCell = gardenCellOf(start);
  if (!isGardenPositionSafe(state, lanternOn, held, start)) return region;
  const queue: Array<[number, number]> = [[startCell.i, startCell.j]];
  region.add(`${startCell.i}:${startCell.j}`);
  while (queue.length) {
    const [i, j] = queue.pop() as [number, number];
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Array<[number, number]>) {
      const ni = i + di; const nj = j + dj;
      const key = `${ni}:${nj}`;
      if (region.has(key) || !gardenCellInBounds(ni, nj)) continue;
      if (!isGardenPositionSafe(state, lanternOn, held, gardenCellCenter(ni, nj))) continue;
      region.add(key); queue.push([ni, nj]);
    }
  }
  return region;
}

/** True when a stand/trigger circle around `point` is reachable from the level entry. */
export function gardenRegionReaches(
  region: Set<string>, point: GardenPoint, radius: number, predicate?: (center: GardenPoint) => boolean,
): boolean {
  for (const key of region) {
    const [i, j] = key.split(':').map(Number);
    const center = gardenCellCenter(i, j);
    if (Math.hypot(center.x - point.x, center.y - point.y) <= radius && (!predicate || predicate(center))) return true;
  }
  return false;
}

export function gardenPointReachable(state: GardenState, lanternOn: boolean, held: GardenHeldSpans, center: GardenPoint, start: GardenPoint = GARDEN_SPAWN): boolean {
  return gardenReachableRegion(state, lanternOn, held, start).has(gardenCellKey(center));
}

export function nearestSafeGardenSpawn(state: GardenState, lanternOn: boolean, held: GardenHeldSpans, saved?: GardenPoint): GardenPoint {
  const candidates: GardenPoint[] = [];
  if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) candidates.push({ x: saved.x, y: saved.y });
  candidates.push(...GARDEN_STAGE_ANCHORS);
  const region = gardenReachableRegion(state, lanternOn, held, GARDEN_SPAWN);
  // A saved point that is merely collision-free can still be sealed behind an unsolved
  // crossing (e.g. a legacy save inside the nursery with the garden still lit); restoring
  // there would strand the player with no way back to the shutter handle. Only a point
  // connected to the level entry by the live solids is accepted.
  for (const candidate of candidates) {
    if (isGardenPositionSafe(state, lanternOn, held, candidate) && region.has(gardenCellKey(candidate))) return candidate;
  }
  for (const candidate of candidates) {
    if (isGardenPositionSafe(state, lanternOn, held, candidate)) return candidate;
  }
  return { ...GARDEN_STAGE_ANCHORS[0] };
}

export const GARDEN_SPAWN: GardenPoint = { x: 238, y: 300 }; // south practice lawn, above the shared bottom HUD band (y>=320)

export const GARDEN_STANDS = {
  // The handle/latch sit on the north side of the wall gap, so their reachable stand sits
  // at the gap's north band (player centers y<=136) rather than deeper inside the gap.
  handle: { x: 132, y: 132, radius: 22 },
  latchWest: { x: 142, y: 132, radius: 22 },
  drain: { x: 462, y: 286, radius: 24 },
  latchEast: { x: 414, y: 286, radius: 22 },
  sprout: { x: 500, y: 280, radius: 24 },
  exit: { x: 574, y: 64, radius: 24 },
} as const;

export function gardenCompletionBlock(state: GardenState): 'canopy' | 'bar' | 'drain' | 'side' | 'scene' | null {
  if (!state.canopyShut) return 'canopy';
  if (!state.sunLatched) return 'bar';
  if (!state.waterFlowing) return 'drain';
  if (!state.returnLatched) return 'side';
  if (!state.lumoRealized) return 'scene';
  return null;
}

/** The shrine gate opens only when every committed puzzle state is present (live, not stale). */
export function gardenExitReady(state: GardenState): boolean {
  return gardenCompletionBlock(state) === null;
}

export function crossingSideFor(center: GardenPoint): GardenCrossingSide {
  return center.x < 334 ? 'west' : 'east';
}

export function onGardenBridge(center: GardenPoint): boolean {
  return rectsOverlap(gardenActorBody(center), GARDEN_BRIDGE);
}

export function crossedToFarBank(side: GardenCrossingSide, center: GardenPoint): boolean {
  if (onGardenBridge(center)) return false;
  return side === 'west' ? center.x > 396 : center.x < 304;
}

export interface GardenArtVariant { file: string; shared?: boolean }
export interface GardenModuleSpec {
  id: string;
  rect: GardenRect;
  extendedRect?: GardenRect;
  origin: 'topleft' | 'bottom' | 'center';
  variants: Record<string, GardenArtVariant>;
  icon?: { x: number; y: number };
  floorArt?: boolean;
  overhead?: boolean;
}

export const GARDEN_MODULES: GardenModuleSpec[] = [
  { id: 'reservoir', rect: { x: 36, y: 58, width: 80, height: 72 }, origin: 'topleft', variants: { open: { file: 'reservoir-open' }, closed: { file: 'reservoir-closed' } } },
  { id: 'reservoir-overlay', rect: { x: 36, y: 58, width: 80, height: 72 }, origin: 'topleft', variants: { closed: { file: 'reservoir-shutter-closed-overlay' } } },
  { id: 'handle', rect: { x: 120, y: 86, width: 24, height: 40 }, origin: 'topleft', variants: { open: { file: 'shutter-handle-open' }, closed: { file: 'shutter-handle-closed' } } },
  { id: 'sun-main', rect: { x: 196, y: 124, width: 48, height: 72 }, origin: 'bottom', variants: { open: { file: 'sun-open', shared: true }, folded: { file: 'sun-folded', shared: true } }, icon: { x: 252, y: 164 } },
  { id: 'gate-bar', rect: { x: 94, y: 104, width: 112, height: 72 }, origin: 'topleft', overhead: true, variants: { lowered: { file: 'gate-bar-lowered' }, raised: { file: 'gate-bar-raised' }, held: { file: 'gate-bar-held' } } },
  { id: 'latch-west', rect: { x: 128, y: 96, width: 28, height: 32 }, origin: 'topleft', variants: { unlatched: { file: 'latch-west-unlatched', shared: true }, latched: { file: 'latch-west-latched', shared: true } } },
  { id: 'moon-main', rect: { x: 252, y: 186, width: 48, height: 44 }, extendedRect: { x: 200, y: 186, width: 112, height: 44 }, origin: 'bottom', variants: { coiled: { file: 'moon-coiled', shared: true }, extended: { file: 'moon-extended', shared: true } }, icon: { x: 250, y: 240 } },
  { id: 'bridge', rect: { x: 304, y: 222, width: 48, height: 32 }, origin: 'center', floorArt: true, variants: { off: { file: 'root-bridge-off', shared: true }, on: { file: 'root-bridge-on', shared: true }, held: { file: 'root-bridge-held', shared: true } } },
  { id: 'drain', rect: { x: 436, y: 224, width: 52, height: 48 }, origin: 'topleft', variants: { closed: { file: 'nursery-drain-closed' }, open: { file: 'nursery-drain-open' } } },
  { id: 'water', rect: { x: 466, y: 262, width: 128, height: 24 }, origin: 'topleft', floorArt: true, variants: { open: { file: 'nursery-water-delivered' } } },
  { id: 'sprout', rect: { x: 484, y: 232, width: 32, height: 32 }, origin: 'bottom', variants: { before: { file: 'sprout-before', shared: true }, after: { file: 'sprout-after', shared: true } } },
  { id: 'side-path', rect: { x: 304, y: 284, width: 80, height: 32 }, origin: 'topleft', floorArt: true, variants: { closed: { file: 'side-stone-path-closed' }, open: { file: 'side-stone-path-open' } } },
  { id: 'latch-east', rect: { x: 400, y: 240, width: 28, height: 32 }, origin: 'topleft', variants: { unlatched: { file: 'latch-east-unlatched', shared: true }, latched: { file: 'latch-east-latched', shared: true } } },
  { id: 'practice-sun', rect: { x: 70, y: 266, width: 48, height: 72 }, origin: 'bottom', variants: { open: { file: 'sun-open', shared: true }, folded: { file: 'sun-folded', shared: true } }, icon: { x: 126, y: 275 } },
  { id: 'practice-moon', rect: { x: 132, y: 284, width: 48, height: 44 }, origin: 'bottom', variants: { coiled: { file: 'moon-coiled', shared: true }, extended: { file: 'moon-extended', shared: true } }, icon: { x: 160, y: 274 } },
  { id: 'teaching-bridge', rect: { x: 182, y: 288, width: 48, height: 32 }, origin: 'center', floorArt: true, variants: { on: { file: 'root-bridge-on', shared: true } } },
];

export const GARDEN_ICONS: Record<'sunOpen' | 'sunFolded' | 'moonOpen' | 'moonClosed', GardenArtVariant> = {
  sunOpen: { file: 'icon-sun-bloom', shared: true },
  sunFolded: { file: 'icon-sun-folded', shared: true },
  moonOpen: { file: 'icon-moon-open', shared: true },
  moonClosed: { file: 'icon-moon-closed', shared: true },
};
