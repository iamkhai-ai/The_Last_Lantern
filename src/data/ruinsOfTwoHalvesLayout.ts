/**
 * Level 08 — "Ruins of Two Halves" (campaign index 7).
 *
 * Pure geometry and pure puzzle state. No Phaser import: rendering, collision,
 * beam drawing and `scripts/check-ruins-of-two-halves.mjs` all consume exactly
 * these numbers and functions, so the drawn world and the tested world cannot
 * drift apart.
 *
 * Coordinates: player CENTERS for spawns / stands / actor bodies, GROUND
 * ANCHORS (bottom-center) for standing art, and plain rects for footprints.
 * Depth contract: standing world objects and actor feet use `10 + groundY/10`;
 * ground stamps use 0..7; effects 68..71; prompts/HUD above all.
 */

export interface RuinsPoint { x: number; y: number; }
export interface RuinsRect extends RuinsPoint { width: number; height: number; }
export interface RuinsQuad { readonly points: readonly RuinsPoint[]; }
export interface RuinsSegment { readonly from: RuinsPoint; readonly to: RuinsPoint; }
export interface RuinsSolid extends RuinsRect { id: string; /** true = a standing prop/architecture the player must not pass */ prop: boolean; }
export interface RuinsStand { id: string; x: number; y: number; radius: number; }
export interface RuinsCheckpoint { id: string; x: number; y: number; requiresExit?: boolean; }

/** Player frame 36x42, baseline 40. Arcade foot body is 14x6. */
export const RUINS_BODY = { feetY: 19, x: -7, y: 16, width: 14, height: 6 } as const;
export const RUINS_FOOT_PLACEMENT = { depthOffsetY: 19, bodyOffsetX: 11, bodyOffsetY: 37, bodyWidth: 14, bodyHeight: 6 } as const;

/** Playable floor band for the foot body, with the HUD bands excluded. */
export const RUINS_FLOOR = { left: 24, right: 616, top: 80, bottom: 310 } as const;

export const RUINS_WORLD = { width: 640, height: 360 } as const;

/* -------------------------------------------------------------------------- */
/* Walls and architecture                                                     */
/* -------------------------------------------------------------------------- */

export const RUINS_WALLS: readonly RuinsSolid[] = [
  { id: 'north-wall', prop: false, x: 0, y: 0, width: 640, height: 80 },
  { id: 'south-wall', prop: false, x: 0, y: 310, width: 640, height: 50 },
  { id: 'west-wall', prop: false, x: 0, y: 80, width: 24, height: 230 },
  { id: 'east-wall', prop: false, x: 616, y: 80, width: 24, height: 230 },
  { id: 'west-buttress', prop: true, x: 24, y: 80, width: 64, height: 96 },
];

/* -------------------------------------------------------------------------- */
/* Standing props: art anchor, footprint, stand point, depth                   */
/* -------------------------------------------------------------------------- */

export interface RuinsStandingProp {
  id: string;
  /** sprite filename without extension, or a template using `{n}` for the rotating state */
  art: string;
  artWidth: number;
  artHeight: number;
  /** image centre used when drawing (native size, no scaling) */
  artCenter: RuinsPoint;
  /** ground anchor = bottom of the visible silhouette */
  groundAnchor: RuinsPoint;
  /** silhouette footprint, `x/y` are top-left */
  footprint: RuinsRect;
  /** extra art drawn in the same composite, if any */
  overlay?: { art: string; artWidth: number; artHeight: number; artCenter: RuinsPoint; depthOffset: number };
  stand: RuinsStand;
}

export const RUINS_PROPS: Record<string, RuinsStandingProp> = {
  statue: {
    id: 'statue', art: 'statue-notch-{n}', artWidth: 64, artHeight: 88,
    artCenter: { x: 320, y: 176 }, groundAnchor: { x: 320, y: 212 },
    footprint: { x: 292, y: 148, width: 56, height: 64 },
    stand: { id: 'statue', x: 320, y: 241, radius: 22 },
  },
  'mirror-left': {
    id: 'mirror-left', art: 'mirror_{n}', artWidth: 36, artHeight: 48,
    artCenter: { x: 240, y: 238 }, groundAnchor: { x: 240, y: 262 },
    footprint: { x: 222, y: 214, width: 36, height: 48 },
    stand: { id: 'mirror-left', x: 240, y: 286, radius: 22 },
  },
  'mirror-right': {
    id: 'mirror-right', art: 'mirror_{n}', artWidth: 36, artHeight: 48,
    artCenter: { x: 400, y: 238 }, groundAnchor: { x: 400, y: 262 },
    footprint: { x: 382, y: 214, width: 36, height: 48 },
    stand: { id: 'mirror-right', x: 400, y: 286, radius: 22 },
  },
  pedestal: {
    id: 'pedestal', art: 'ruins_altar', artWidth: 104, artHeight: 52,
    artCenter: { x: 480, y: 236 }, groundAnchor: { x: 480, y: 262 },
    footprint: { x: 428, y: 210, width: 104, height: 52 },
    stand: { id: 'pedestal', x: 480, y: 286, radius: 22 },
  },
  'practice-column': {
    id: 'practice-column', art: 'test-pedestal', artWidth: 48, artHeight: 36,
    artCenter: { x: 150, y: 234 }, groundAnchor: { x: 150, y: 250 },
    footprint: { x: 126, y: 216, width: 48, height: 36 },
    overlay: { art: 'test-column-notch-{n}', artWidth: 32, artHeight: 44, artCenter: { x: 150, y: 223 }, depthOffset: 0.1 },
    stand: { id: 'practice-column', x: 150, y: 276, radius: 22 },
  },
  'seedling-bed': {
    id: 'seedling-bed', art: 'seedling-curtain-{curtain}', artWidth: 88, artHeight: 48,
    artCenter: { x: 180, y: 128 }, groundAnchor: { x: 180, y: 152 },
    footprint: { x: 136, y: 104, width: 88, height: 48 },
    stand: { id: 'seedling-bed', x: 180, y: 176, radius: 22 },
  },
  'shadow-npc': {
    id: 'shadow-npc', art: 'shadow_npc', artWidth: 44, artHeight: 56,
    artCenter: { x: 522, y: 140 }, groundAnchor: { x: 522, y: 160 },
    footprint: { x: 508, y: 124, width: 28, height: 36 },
    stand: { id: 'shadow-npc', x: 522, y: 184, radius: 22 },
  },
};

/** Wall-mounted fixtures with interaction stand points but no extra collider. */
export const RUINS_WALL_FIXTURES: readonly {
  id: string; art: string; artWidth: number; artHeight: number; artCenter: RuinsPoint; stand: RuinsStand;
}[] = [
  {
    id: 'inscription', art: 'beacon_stone', artWidth: 34, artHeight: 46,
    artCenter: { x: 430, y: 57 }, stand: { id: 'inscription', x: 430, y: 106, radius: 22 },
  },
  {
    id: 'north-door', art: 'sanctuary-door-{open}', artWidth: 104, artHeight: 76,
    artCenter: { x: 548, y: 42 }, stand: { id: 'exit', x: 548, y: 112, radius: 24 },
  },
];

export function getRuinsSolid(id: string): RuinsSolid | undefined {
  const prop = RUINS_PROPS[id];
  if (prop) return { id: prop.id, prop: true, ...prop.footprint };
  return RUINS_WALLS.find((wall) => wall.id === id);
}

/** Every solid that blocks the player: walls, architecture and standing props. */
export const RUINS_BLOCKERS: readonly RuinsSolid[] = [
  ...RUINS_WALLS,
  ...Object.values(RUINS_PROPS).map((prop): RuinsSolid => ({ id: prop.id, prop: true, ...prop.footprint })),
];

/* -------------------------------------------------------------------------- */
/* Ground stamps                                                              */
/* -------------------------------------------------------------------------- */

export const RUINS_SPLITTER = { center: { x: 320, y: 238 }, width: 48, height: 48, depth: 4 } as const;
export const RUINS_CONDUIT: readonly RuinsPoint[] = [
  { x: 470, y: 258 }, { x: 410, y: 258 }, { x: 350, y: 258 }, { x: 330, y: 252 }, { x: 320, y: 244 },
];
export const RUINS_PEDESTAL_LAMP: RuinsPoint = { x: 480, y: 220 };

export const RUINS_PRACTICE = {
  rayY: 224,
  /** Entry notch for a fresh save: a narrow face, so the slab starts LIT and the player must rotate to find the shadow. */
  startNotch: 1,
  port: { x: 28, y: 224 },
  portRect: { x: 24, y: 216, width: 16, height: 16 },
  axisX: 150,
  blockedNotches: [0, 2] as readonly number[],
  slab: { id: 'practice-slab', art: 'test-moon-{state}', width: 16, height: 20, center: { x: 206, y: 224 }, depth: 4 },
  shadowPatch: { x: 196, y: 214, width: 20, height: 20, depth: 3.5, center: { x: 206, y: 224 } },
  beam: [
    { from: { x: 28, y: 224 }, to: { x: 150, y: 224 } },
    { from: { x: 150, y: 224 }, to: { x: 206, y: 224 } },
  ] as readonly RuinsSegment[],
  depths: { port: 4, shadow: 4.5, beam: 5 },
} as const;

/* -------------------------------------------------------------------------- */
/* Receivers                                                                  */
/* -------------------------------------------------------------------------- */

export type RuinsSide = 'left' | 'right';

export const RUINS_RECEIVERS: Record<'left' | 'moon' | 'right', RuinsRect> = {
  left: { x: 224, y: 92, width: 32, height: 40 },
  moon: { x: 304, y: 92, width: 32, height: 40 },
  right: { x: 384, y: 92, width: 32, height: 40 },
};

export const RUINS_RECEIVER_DEPTH = 4;

/* -------------------------------------------------------------------------- */
/* Statue orientations and their shadow regions                               */
/* -------------------------------------------------------------------------- */

export const RUINS_STATUE_NOTCHES = 4;

/**
 * Verbatim extents of the level's own `shadow-notch-{0..3}` overlays (measured
 * from the 640x360 PNGs). Point order is always TL, TR, BR, BL, which makes the
 * quads convex and the containment test a single cross-product sign check.
 */
export const RUINS_SHADOW_QUADS: readonly RuinsQuad[] = [
  { points: [{ x: 292, y: 75 }, { x: 348, y: 75 }, { x: 336, y: 220 }, { x: 304, y: 220 }] },
  { points: [{ x: 316, y: 75 }, { x: 324, y: 75 }, { x: 326, y: 220 }, { x: 314, y: 220 }] },
  { points: [{ x: 187, y: 76 }, { x: 230, y: 76 }, { x: 336, y: 220 }, { x: 304, y: 220 }] },
  { points: [{ x: 420, y: 76 }, { x: 438, y: 76 }, { x: 326, y: 220 }, { x: 314, y: 220 }] },
];

/** The one notch whose wide face is perpendicular to the centre flow. */
export const RUINS_STATUE_SOLUTION = 0;
/**
 * Entry notch for a fresh save: an edge-on face, so the statue starts NEUTRAL — the Moon lock is
 * outside the shadow and both side branches are clear. The player has to find the solving notch
 * instead of walking in on an already-shadowed Moon lock.
 */
export const RUINS_STATUE_START_NOTCH = 1;
export const RUINS_SHADOW_OVERLAY = { center: { x: 320, y: 180 }, width: 640, height: 360, depth: 6 } as const;

/* -------------------------------------------------------------------------- */
/* Beams                                                                      */
/* -------------------------------------------------------------------------- */

export const RUINS_BEAMS = {
  splitter: { x: 320, y: 238 },
  branchRailY: 238,
  depth: 5,
  centre: { from: { x: 320, y: 238 }, to: { x: 320, y: 112 } } as RuinsSegment,
  /** parts of the centre ray the statue does not occlude */
  centreVisible: [
    { from: { x: 320, y: 238 }, to: { x: 320, y: 212 } },
    { from: { x: 320, y: 148 }, to: { x: 320, y: 112 } },
  ] as readonly RuinsSegment[],
  leftInbound: { from: { x: 320, y: 238 }, to: { x: 240, y: 238 } } as RuinsSegment,
  leftOutbound: { from: { x: 240, y: 238 }, to: { x: 240, y: 112 } } as RuinsSegment,
  rightInbound: { from: { x: 320, y: 238 }, to: { x: 400, y: 238 } } as RuinsSegment,
  rightOutbound: { from: { x: 400, y: 238 }, to: { x: 400, y: 112 } } as RuinsSegment,
} as const;

/**
 * Mirror art mapping, native (no rotation): 0 = `/`, 1 = `\`, 2 = flat plank,
 * 3 = upright plank. A west-travelling ray needs `\` to climb; an
 * east-travelling ray needs `/`.
 */
export const RUINS_MIRROR_SOLUTION: Record<RuinsSide, number> = { left: 1, right: 0 };
export const RUINS_MIRROR_STATES = 4;

/**
 * Entry counters for a fresh or legacy save. The mirrors start on the two "plank" faces
 * (`mirror_3` upright, `mirror_2` flat) so neither branch is aimed, and the statue starts
 * edge-on so the Moon lock is outside its shadow. Nothing is pre-solved on arrival.
 */
export const RUINS_ENTRY_COUNTERS = {
  statue: RUINS_STATUE_START_NOTCH,
  leftMirror: 3,
  rightMirror: 2,
  practice: RUINS_PRACTICE.startNotch,
} as const;

/**
 * The configuration that produced the scenario's simultaneous condition. Once the latch is
 * committed the scenario asks for it to be kept ("Giữ cấu hình tượng, gương, màn che và cửa Bắc"),
 * so a resumed session re-derives the live state from this configuration instead of from a stale
 * counter that would leave the three locks dark behind an already-latched ring.
 */
export const RUINS_SOLVED_CONFIGURATION = {
  statue: RUINS_STATUE_SOLUTION,
  leftMirror: RUINS_MIRROR_SOLUTION.left,
  rightMirror: RUINS_MIRROR_SOLUTION.right,
} as const;

/** Writes the solved statue/mirror configuration into a progress counter bag. */
export function ruinsSnapSolvedConfiguration(counters: Record<string, number>): void {
  counters['statue'] = RUINS_SOLVED_CONFIGURATION.statue;
  counters['ruins-left'] = RUINS_SOLVED_CONFIGURATION.leftMirror;
  counters['ruins-right'] = RUINS_SOLVED_CONFIGURATION.rightMirror;
}

/**
 * Brings a saved counter bag onto this level's entry values, and — only when the latch is already
 * committed — onto the configuration that solved the temple. Reading the latch from either of the
 * two durable flag names keeps a v1 save that only carries `l7-solved` working unchanged.
 */
export function ruinsNormalizeCounters(
  flags: Record<string, boolean | string>,
  counters: Record<string, number>,
): void {
  counters['statue'] = ruinsNormalizeNotch(counters['statue'] ?? RUINS_ENTRY_COUNTERS.statue);
  counters['ruins-left'] = ruinsNormalizeNotch(counters['ruins-left'] ?? RUINS_ENTRY_COUNTERS.leftMirror);
  counters['ruins-right'] = ruinsNormalizeNotch(counters['ruins-right'] ?? RUINS_ENTRY_COUNTERS.rightMirror);
  counters['practice'] = ruinsNormalizeNotch(counters['practice'] ?? RUINS_ENTRY_COUNTERS.practice);
  if (flags['l7-route-latched'] === true || flags['l7-solved'] === true) ruinsSnapSolvedConfiguration(counters);
}

/**
 * True as soon as the player has touched the main puzzle, so the tutorial objective stops
 * nagging someone who walked past the practice forecourt straight to the pedestal.
 * The practice lesson still teaches whoever follows the intended order.
 */
export function isRuinsMainPuzzleEngaged(input: {
  lanternPlaced: boolean; statue: number; leftMirror: number; rightMirror: number;
}): boolean {
  return input.lanternPlaced
    || ruinsNormalizeNotch(input.statue) !== RUINS_ENTRY_COUNTERS.statue
    || ruinsNormalizeNotch(input.leftMirror) !== RUINS_ENTRY_COUNTERS.leftMirror
    || ruinsNormalizeNotch(input.rightMirror) !== RUINS_ENTRY_COUNTERS.rightMirror;
}

/* -------------------------------------------------------------------------- */
/* Pure geometry helpers                                                      */
/* -------------------------------------------------------------------------- */

export function ruinsActorBody(center: RuinsPoint): RuinsRect {
  return { x: center.x + RUINS_BODY.x, y: center.y + RUINS_BODY.y, width: RUINS_BODY.width, height: RUINS_BODY.height };
}

export function ruinsRectsOverlap(a: RuinsRect, b: RuinsRect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function ruinsNormalizeNotch(value: unknown): number {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : 0;
  return ((numeric % RUINS_STATUE_NOTCHES) + RUINS_STATUE_NOTCHES) % RUINS_STATUE_NOTCHES;
}

export function ruinsIsInsideFloor(rect: RuinsRect): boolean {
  return rect.x >= RUINS_FLOOR.left
    && rect.x + rect.width <= RUINS_FLOOR.right
    && rect.y >= RUINS_FLOOR.top
    && rect.y + rect.height <= RUINS_FLOOR.bottom;
}

/** Cross-product sign of `point` relative to the directed edge `a -> b`. */
function edgeSign(a: RuinsPoint, b: RuinsPoint, point: RuinsPoint): number {
  return (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);
}

/** True when the point is inside (or on the border of) a convex quad. */
export function ruinsPointInQuad(quad: RuinsQuad, point: RuinsPoint): boolean {
  const points = quad.points;
  let positive = false;
  let negative = false;
  for (let index = 0; index < points.length; index += 1) {
    const sign = edgeSign(points[index], points[(index + 1) % points.length], point);
    if (sign > 0) positive = true;
    else if (sign < 0) negative = true;
    if (positive && negative) return false;
  }
  return true;
}

/** A receiver counts as covered only when its whole footprint is inside the shadow. */
export function ruinsQuadContainsRect(quad: RuinsQuad, rect: RuinsRect): boolean {
  return ruinsPointInQuad(quad, { x: rect.x, y: rect.y })
    && ruinsPointInQuad(quad, { x: rect.x + rect.width, y: rect.y })
    && ruinsPointInQuad(quad, { x: rect.x + rect.width, y: rect.y + rect.height })
    && ruinsPointInQuad(quad, { x: rect.x, y: rect.y + rect.height });
}

function orientation(a: RuinsPoint, b: RuinsPoint, c: RuinsPoint): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function segmentsCross(p1: RuinsPoint, p2: RuinsPoint, p3: RuinsPoint, p4: RuinsPoint): boolean {
  const d1 = orientation(p3, p4, p1);
  const d2 = orientation(p3, p4, p2);
  const d3 = orientation(p1, p2, p3);
  const d4 = orientation(p1, p2, p4);
  if (((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0))) return true;
  return false;
}

/** True when the segment crosses the shadow quad (a blocked ray). */
export function ruinsSegmentIntersectsQuad(segment: RuinsSegment, quad: RuinsQuad): boolean {
  if (ruinsPointInQuad(quad, segment.from) || ruinsPointInQuad(quad, segment.to)) return true;
  const points = quad.points;
  for (let index = 0; index < points.length; index += 1) {
    if (segmentsCross(segment.from, segment.to, points[index], points[(index + 1) % points.length])) return true;
  }
  return false;
}

/** True when the 14x6 foot body at `center` is walkable: inside the floor and clear of every blocker. */
export function isRuinsPositionSafe(center: RuinsPoint): boolean {
  const body = ruinsActorBody(center);
  if (!ruinsIsInsideFloor(body)) return false;
  return !RUINS_BLOCKERS.some((blocker) => ruinsRectsOverlap(body, blocker));
}

/** True when the stand point is inside the floor and clear of every blocker. */
export function isRuinsStandReachable(center: RuinsPoint): boolean {
  return isRuinsPositionSafe(center);
}

/* -------------------------------------------------------------------------- */
/* Pure puzzle state                                                          */
/* -------------------------------------------------------------------------- */

export interface RuinsPuzzleInput {
  /** the lamp is physically sitting on the main pedestal */
  lanternPlaced: boolean;
  /** the live lamp light state (`LanternSystem.lanternOn`), never a saved history */
  lanternOn: boolean;
  statue: number;
  leftMirror: number;
  rightMirror: number;
}

export interface RuinsPuzzleState {
  statue: number;
  shadowQuad: RuinsQuad;
  lightActive: boolean;
  moonCovered: boolean;
  moonDark: boolean;
  leftAimed: boolean;
  rightAimed: boolean;
  leftLit: boolean;
  rightLit: boolean;
  sunsLit: number;
  confirmReady: boolean;
  leftRayBlocked: boolean;
  rightRayBlocked: boolean;
}

/**
 * The whole puzzle as a pure function of LIVE world input. No `l7-*` flag and no
 * arrival history is read here: a stale save can never re-create a solved or a
 * lit lock, because nothing but the current lamp/mirror/statue state is passed in.
 */
export function deriveRuinsPuzzleState(input: RuinsPuzzleInput): RuinsPuzzleState {
  const statue = ruinsNormalizeNotch(input.statue);
  const shadowQuad = RUINS_SHADOW_QUADS[statue];
  const lightActive = input.lanternPlaced && input.lanternOn;
  const moonCovered = ruinsQuadContainsRect(shadowQuad, RUINS_RECEIVERS.moon);
  const leftAimed = ruinsNormalizeNotch(input.leftMirror) === RUINS_MIRROR_SOLUTION.left;
  const rightAimed = ruinsNormalizeNotch(input.rightMirror) === RUINS_MIRROR_SOLUTION.right;
  const leftRayBlocked = ruinsSegmentIntersectsQuad(RUINS_BEAMS.leftOutbound, shadowQuad);
  const rightRayBlocked = ruinsSegmentIntersectsQuad(RUINS_BEAMS.rightOutbound, shadowQuad);
  const leftLit = lightActive && leftAimed && !leftRayBlocked;
  const rightLit = lightActive && rightAimed && !rightRayBlocked;
  const sunsLit = (leftLit ? 1 : 0) + (rightLit ? 1 : 0);
  return {
    statue, shadowQuad, lightActive, moonCovered,
    moonDark: moonCovered || !lightActive,
    leftAimed, rightAimed, leftLit, rightLit, sunsLit,
    confirmReady: leftLit && rightLit && moonCovered,
    leftRayBlocked, rightRayBlocked,
  };
}

/** The latch is a mechanical commit: it may only be taken while the live condition holds. */
export function canLatchRuinsSanctuary(state: RuinsPuzzleState, alreadyLatched: boolean): boolean {
  return !alreadyLatched && state.confirmReady;
}

/** Practice forecourt lesson. Shares no state with the main puzzle. */
export interface RuinsPracticeState { portLit: boolean; blocked: boolean; slabShadowed: boolean; wideFace: boolean; }

export function deriveRuinsPracticeState(input: { practiceNotch: number; lanternOn: boolean }): RuinsPracticeState {
  const notch = ruinsNormalizeNotch(input.practiceNotch);
  const wideFace = RUINS_PRACTICE.blockedNotches.includes(notch);
  const portLit = input.lanternOn;
  return { portLit, blocked: wideFace, slabShadowed: portLit && wideFace, wideFace };
}

/** Locked-exit feedback naming the unmet prerequisite, in scenario order. */
export function getRuinsExitBlock(state: { latched: boolean; lanternRetrieved: boolean; metShadow: boolean }):
'latch' | 'lamp' | 'shadow' | undefined {
  if (!state.latched) return 'latch';
  if (!state.lanternRetrieved) return 'lamp';
  if (!state.metShadow) return 'shadow';
  return undefined;
}

export function isRuinsExitReady(state: { latched: boolean; lanternRetrieved: boolean; metShadow: boolean }): boolean {
  return getRuinsExitBlock(state) === undefined;
}

/** Live-state stages that drive the objective row, the hint ladder and the one-off toasts. */
export type RuinsStage = 'practice' | 'place' | 'suns' | 'moon' | 'confirm' | 'retrieve' | 'shadow' | 'exit';

export function getRuinsStage(state: {
  practiceSeen: boolean; lanternPlaced: boolean; puzzle: RuinsPuzzleState;
  latched: boolean; lanternRetrieved: boolean; metShadow: boolean;
  /** the player has already touched the main puzzle, so the tutorial stage no longer applies */
  mainPuzzleEngaged: boolean;
}): RuinsStage {
  if (!state.practiceSeen && !state.mainPuzzleEngaged) return 'practice';
  if (state.metShadow) return 'exit';
  if (state.latched) {
    if (!state.lanternRetrieved) return 'retrieve';
    return 'shadow';
  }
  if (!state.lanternPlaced) return 'place';
  if (!state.puzzle.confirmReady) {
    if (state.puzzle.sunsLit < 2) return 'suns';
    return 'moon';
  }
  return 'confirm';
}

/* -------------------------------------------------------------------------- */
/* Spawn resolution                                                           */
/* -------------------------------------------------------------------------- */

export const RUINS_SPAWN: RuinsPoint = { x: 120, y: 288 };

export const RUINS_CHECKPOINTS: readonly RuinsCheckpoint[] = [
  { id: 'entrance', x: 120, y: 288 },
  { id: 'yard', x: 320, y: 286 },
  { id: 'east', x: 570, y: 200 },
  { id: 'north-stair', x: 548, y: 44, requiresExit: true },
];

/**
 * Save contract: a saved centre is kept only when the real foot body fits and the
 * checkpoint is unlocked. A saved centre beyond the north door (behind an
 * unsolved gate) can never be used, because it fails the floor test anyway and
 * `north-stair` additionally requires the exit to be open.
 */
export function resolveRuinsSpawn(
  saved: RuinsPoint | undefined,
  options: { exitReady: boolean } = { exitReady: false },
): RuinsPoint {
  const usable = RUINS_CHECKPOINTS.filter((point) => !point.requiresExit || options.exitReady);
  const target = saved && Number.isFinite(saved.x) && Number.isFinite(saved.y) ? saved : RUINS_SPAWN;
  const anchor: RuinsPoint = { ...RUINS_SPAWN };
  if (isRuinsPositionSafe(target)) {
    return { x: Math.round(target.x), y: Math.round(target.y) };
  }
  const ordered = [...usable].sort((a, b) => Math.hypot(a.x - target.x, a.y - target.y) - Math.hypot(b.x - target.x, b.y - target.y));
  for (const point of ordered) {
    if (isRuinsPositionSafe(point)) return { x: point.x, y: point.y };
  }
  for (let radius = 12; radius <= 120; radius += 12) {
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      const candidate = {
        x: Math.round(anchor.x + Math.cos(angle) * radius),
        y: Math.round(anchor.y + Math.sin(angle) * radius),
      };
      if (isRuinsPositionSafe(candidate)) return candidate;
    }
  }
  return { ...RUINS_SPAWN };
}

/** Stand points that must stay reachable and distinct. */
export const RUINS_STANDS: readonly RuinsStand[] = [
  ...Object.values(RUINS_PROPS).map((prop) => prop.stand),
  ...RUINS_WALL_FIXTURES.map((fixture) => fixture.stand),
];

/** Named checkpoints used before the exit opens (no `requiresExit`). */
export const RUINS_OPEN_CHECKPOINTS: readonly RuinsCheckpoint[] = RUINS_CHECKPOINTS.filter((point) => !point.requiresExit);

/* -------------------------------------------------------------------------- */
/* Depth helpers                                                              */
/* -------------------------------------------------------------------------- */

/** Standing world objects and actor feet: `10 + groundY / 10`. */
export function ruinsDepthAt(groundY: number): number {
  return 10 + groundY / 10;
}

export const RUINS_DEPTH = {
  backdrop: 0,
  floor: 0.5,
  masonry: 1,
  conduit: 3,
  shadowPatch: 3.5,
  groundStamp: 4,
  beam: 5,
  shadow: 6,
  effectsLow: 68,
  prompt: 82,
  hud: 86,
} as const;
