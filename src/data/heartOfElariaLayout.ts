/**
 * Authored spatial layout and live puzzle state for Level 10 — The Heart of Elaria.
 *
 * This module is pure data and pure functions: no Phaser, no imports from the art layer, so the
 * Node check script (`scripts/check-heart-of-elaria.mjs`) can import it directly. The runtime
 * controller (`src/levels/HeartOfElariaLevel.ts`) renders and collides exactly these numbers.
 *
 * World is 640x360. Top HUD occupies y=0..58, bottom status/help y=320..360. Actor frame 36x42,
 * feet body 14x6 at center+(0,19) (same contract as Level 05 / Library).
 *
 * Authoritative art anchors kept from `assets/levels/10-the-heart-of-elaria/state-and-layout.json`:
 * core (320,115), Memory alcove (158,192), Hope alcove (320,200), Balance alcove (480,192).
 */

export interface HeartPoint {
  x: number;
  y: number;
}

export interface HeartRect extends HeartPoint {
  width: number;
  height: number;
}

/** Actor feet body relative to the sprite centre. Matches Library / Level 05. */
export const HEART_BODY = { feetY: 19, x: -7, y: 16, width: 14, height: 6 } as const;

export const HEART_WORLD = { width: 640, height: 360, hudBottom: 58, statusTop: 320 } as const;

/** Walkable foot bounds: the actor body must stay inside this rectangle. */
export const HEART_FLOOR = { left: 58, top: 150, right: 584, bottom: 308 } as const;

export const HEART_SPAWN: HeartPoint = { x: 250, y: 284 };

/** Named safe restore points, all verified clear of every solid. */
export const HEART_CHECKPOINTS: ReadonlyArray<{ id: string; point: HeartPoint }> = [
  { id: 'spawn', point: { x: 250, y: 284 } },
  { id: 'pedestal-bank', point: { x: 150, y: 244 } },
  { id: 'seal', point: { x: 320, y: 270 } },
  { id: 'confirm', point: { x: 320, y: 284 } },
  { id: 'east', point: { x: 520, y: 286 } },
  { id: 'west', point: { x: 130, y: 220 } },
];

/** Where the overload reload puts Nhinh: on the open bank beside the light pedestal. */
export const HEART_OVERLOAD_CHECKPOINT: HeartPoint = { x: 150, y: 244 };

export type HeartArtSource = 'level10' | 'texture';

export interface HeartElement {
  id: string;
  /** `prop` is a standing object with a solid footprint; `cell` is a walkable floor socket. */
  kind: 'prop' | 'cell';
  /** Art anchor (texture centre) in world coordinates. */
  x: number;
  y: number;
  /** Native art size; never rescaled. */
  width: number;
  height: number;
  /** Interaction trigger centre (south edge of a prop, inside the cell of a socket). */
  stand: HeartPoint;
  radius: number;
  /** Only for props: the solid footprint, which always sits inside the visible art box. */
  solid?: HeartRect;
  art: string;
  artSource: HeartArtSource;
  /** In-cell gate for floor sockets (rule 2 of RULE_GAMES.md). */
  gate?: HeartRect;
}

export interface HeartBlocker extends HeartRect {
  id: string;
  /** Short note describing the visible art this collider represents. */
  art: string;
}

const prop = (
  id: string,
  art: string,
  centerX: number,
  baseY: number,
  width: number,
  height: number,
  artSource: HeartArtSource,
  solidWidth: number,
  solidHeight: number,
  radius = 24,
): HeartElement => {
  const solid = { x: Math.round(centerX - solidWidth / 2), y: baseY - solidHeight, width: Math.round(solidWidth), height: solidHeight };
  return {
    id, kind: 'prop', x: centerX, y: baseY - height / 2, width, height, art, artSource, solid,
    stand: { x: centerX, y: baseY }, radius,
  };
};

const cell = (
  id: string,
  art: string,
  x: number,
  y: number,
  width: number,
  height: number,
  halfWidth: number,
  halfHeight: number,
  radius = 32,
): HeartElement => ({
  id, kind: 'cell', x, y, width, height, art, artSource: 'level10', stand: { x, y }, radius,
  gate: { x: x - halfWidth, y: y - halfHeight, width: halfWidth * 2, height: halfHeight * 2 },
});

/** Visible scenery bands and the Mother Tree mass. Every collider matches baked art. */
export const HEART_BLOCKERS: readonly HeartBlocker[] = [
  { id: 'heart-north-thicket', x: 0, y: 80, width: 640, height: 70, art: 'baked dark forest + canopy band across the top of the sanctuary' },
  { id: 'heart-west-bank', x: 0, y: 150, width: 58, height: 158, art: 'baked bushes and grey stone ruins along the west edge' },
  { id: 'heart-east-bank', x: 584, y: 150, width: 56, height: 158, art: 'baked bushes and grey stones along the east edge' },
  { id: 'heart-south-bank', x: 0, y: 308, width: 640, height: 52, art: 'baked bottom foliage plus the status/help band' },
  { id: 'heart-tree-trunk', x: 232, y: 150, width: 186, height: 50, art: 'Mother Tree trunk and root fan (authored core anchor 320,115)' },
];

/**
 * Standing props. Every collider is the prop's own visible base (a 22px-deep block that sits inside
 * the art box); the sprite above it is the object's height, so a player walking behind a prop is
 * occluded by it instead of being blocked by an invisible wall. Stand points sit on the base line.
 */
export const HEART_PROPS: readonly HeartElement[] = [
  prop('heart-pedestal', 'pedestal_lit', 85, 260, 40, 56, 'texture', 28, 22),
  prop('heart-g0', 'mirror_1', 207, 260, 36, 48, 'texture', 30, 22, 22),
  prop('heart-memory-mirror', 'mirror_1', 245, 260, 36, 48, 'texture', 30, 22, 22),
  prop('heart-statue', 'statue-notch-2', 416, 260, 64, 88, 'texture', 48, 22),
  prop('heart-balance-mirror', 'mirror_1', 530, 260, 36, 48, 'texture', 30, 22),
];

/** Walkable floor sockets (rule 2: prompt only while the actor body stands inside the cell). */
export const HEART_CELLS: readonly HeartElement[] = [
  cell('heart-memory', 'memory-alcove-empty', 158, 192, 58, 64, 22, 20),
  cell('heart-hope', 'hope-alcove-empty', 320, 200, 58, 64, 22, 20),
  cell('heart-balance', 'balance-alcove-empty', 480, 192, 58, 64, 22, 20),
  cell('heart-seal', 'pressure-empty', 320, 244, 44, 28, 22, 16),
  cell('heart-eye-left', 'lock_sun_off', 368, 282, 40, 33, 22, 18, 30),
  cell('heart-moon', 'lock_moon_off', 416, 282, 40, 34, 22, 18, 30),
  cell('heart-eye-right', 'lock_sun_off', 464, 282, 40, 33, 22, 18, 30),
  cell('heart-confirm', 'confirmation-root-waiting', 320, 278, 48, 32, 22, 16),
  cell('heart-rule-table', 'root-rule-reminder-table', 150, 284, 124, 48, 40, 18, 46),
];

export const HEART_ELEMENTS: readonly HeartElement[] = [...HEART_PROPS, ...HEART_CELLS];

export const HEART_CORE = { x: 320, y: 115, width: 58, height: 68 } as const;
/** The statue shadow that must cover the Moon pocket while the branch holds. */
export const HEART_MOON_SHADOW = { x: 416, y: 276, radiusX: 34, radiusY: 16 } as const;

/** Interaction radius of the central confirmation node (in-cell socket). */
export const HEART_CONFIRM_ID = 'heart-confirm';
export const HEART_SEAL_ID = 'heart-seal';
/** The rule mat is a low flat table in the root bed: in-cell prompt, no collider. */
export const HEART_MAT_ID = 'heart-rule-table';
/** The prism is authored inside G0's mount; G0's two aims are the scenario's two routes. */
export const HEART_G0_ID = 'heart-g0';

/** Beam waypoints, drawn as the shared light route. */
export const HEART_BEAM_NODES = {
  source: { x: 85, y: 206 },
  g0: { x: 207, y: 244 },
  prism: { x: 207, y: 214 },
  memoryMirror: { x: 245, y: 244 },
  memoryCrystal: { x: 158, y: 192 },
  balanceMirror: { x: 530, y: 244 },
  eyeLeft: { x: 368, y: 282 },
  moon: { x: 416, y: 282 },
  eyeRight: { x: 464, y: 282 },
} as const;

/** The three authored root lanes (socket → core) and the return ring (socket → central node). */
export const HEART_ROOT_LANES: Readonly<Record<'memory' | 'hope' | 'balance', ReadonlyArray<HeartPoint>>> = {
  memory: [{ x: 158, y: 192 }, { x: 204, y: 178 }, { x: 246, y: 152 }, { x: 320, y: 115 }],
  hope: [{ x: 320, y: 200 }, { x: 330, y: 173 }, { x: 320, y: 146 }, { x: 320, y: 115 }],
  balance: [{ x: 480, y: 192 }, { x: 432, y: 177 }, { x: 388, y: 151 }, { x: 320, y: 115 }],
};

export const HEART_RING_LANES: Readonly<Record<'memory' | 'hope' | 'balance', ReadonlyArray<HeartPoint>>> = {
  memory: [{ x: 158, y: 192 }, { x: 174, y: 244 }, { x: 246, y: 282 }, { x: 320, y: 278 }],
  hope: [{ x: 320, y: 200 }, { x: 320, y: 278 }],
  balance: [{ x: 480, y: 192 }, { x: 466, y: 244 }, { x: 394, y: 286 }, { x: 320, y: 278 }],
};

export const HEART_LANE_COLORS: Readonly<Record<'memory' | 'hope' | 'balance', number>> = {
  memory: 0xf2c661,
  hope: 0x74c8ef,
  balance: 0xb98cf0,
};

export const HEART_G0_AIMS = ['split', 'direct'] as const;
export type HeartG0Aim = (typeof HEART_G0_AIMS)[number];
export const HEART_MEMORY_MIRROR_GOAL = 1;
export const HEART_BALANCE_MIRROR_GOAL = 2;
export const HEART_STATUE_SHADOW = 2;
export const HEART_STATUE_BLOCKS_LEFT_EYE = 1;
export const HEART_STATUE_BLOCKS_RIGHT_EYE = 3;
export const HEART_SEAL_RADIUS = 20;

export type HeartBranchId = 'memory' | 'hope' | 'balance';

export interface HeartPuzzleInput {
  crystals: Record<HeartBranchId, boolean>;
  lanternPlaced: boolean;
  lanternOn: boolean;
  g0: number;
  memoryMirror: number;
  balanceMirror: number;
  statue: number;
  /** Live companion position; never a saved `at-*` flag. */
  lumo: HeartPoint;
  /** `l9-roots`: the brass root clips mechanically hold the configuration. */
  latched: boolean;
}

export interface HeartPuzzleState {
  light: boolean;
  g0Split: boolean;
  g0Direct: boolean;
  memoryRoute: boolean;
  balanceRoute: boolean;
  lumoAtSeal: boolean;
  eyeLeft: boolean;
  eyeRight: boolean;
  moonShadow: boolean;
  memory: boolean;
  hope: boolean;
  balance: boolean;
  crystals: boolean;
  ready: boolean;
  latched: boolean;
}

export function heartActorBody(center: HeartPoint): HeartRect {
  return { x: center.x + HEART_BODY.x, y: center.y + HEART_BODY.y, width: HEART_BODY.width, height: HEART_BODY.height };
}

export function heartRectsOverlap(a: HeartRect, b: HeartRect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function isHeartBodyInsideFloor(center: HeartPoint): boolean {
  const body = heartActorBody(center);
  return body.x >= HEART_FLOOR.left && body.x + body.width <= HEART_FLOOR.right
    && body.y >= HEART_FLOOR.top && body.y + body.height <= HEART_FLOOR.bottom;
}

export function isHeartPositionSafe(center: HeartPoint): boolean {
  if (!Number.isFinite(center.x) || !Number.isFinite(center.y)) return false;
  if (!isHeartBodyInsideFloor(center)) return false;
  const body = heartActorBody(center);
  if (HEART_BLOCKERS.some((blocker) => heartRectsOverlap(body, blocker))) return false;
  return !HEART_PROPS.some((element) => element.solid && heartRectsOverlap(body, element.solid));
}

/**
 * Rule 2 of RULE_GAMES.md: a flat floor socket answers only while the actor stands inside its cell.
 * The cell is authored on the visible socket, so the prompt appears while standing on the socket and
 * never from beyond its south edge (the same half-cell test the Level 03 library uses).
 */
export function isInsideHeartGate(cellId: string, center: HeartPoint): boolean {
  const element = HEART_CELLS.find((item) => item.id === cellId);
  if (!element?.gate) return false;
  const gate = element.gate;
  return center.x >= gate.x && center.x <= gate.x + gate.width
    && center.y >= gate.y && center.y <= gate.y + gate.height;
}

export function heartGateCenter(element: HeartElement): HeartPoint {
  if (!element.gate) return { x: element.x, y: element.y };
  return { x: element.gate.x + element.gate.width / 2, y: element.gate.y + element.gate.height / 2 };
}

export function getHeartElement(id: string): HeartElement | undefined {
  return HEART_ELEMENTS.find((item) => item.id === id);
}

export function getHeartSolid(id: string): HeartRect | undefined {
  return HEART_PROPS.find((item) => item.id === id)?.solid;
}

/** Bresenham-free grid search over walkable positions using the real 14x6 foot body. */
export function heartReaches(from: HeartPoint, to: HeartPoint, radius = 22, step = 6): boolean {
  if (!isHeartPositionSafe(from)) return false;
  const key = (p: HeartPoint): string => `${Math.round(p.x)},${Math.round(p.y)}`;
  const queue: HeartPoint[] = [from];
  const seen = new Set([key(from)]);
  for (let index = 0; index < queue.length && queue.length < 40000; index += 1) {
    const point = queue[index];
    if (Math.hypot(point.x - to.x, point.y - to.y) <= radius) return true;
    for (const [dx, dy] of [[step, 0], [-step, 0], [0, step], [0, -step]] as Array<[number, number]>) {
      const next = { x: point.x + dx, y: point.y + dy };
      if (seen.has(key(next))) continue;
      if (!isHeartPositionSafe(next)) continue;
      seen.add(key(next));
      queue.push(next);
    }
  }
  return false;
}

export interface HeartStandReport {
  id: string;
  kind: 'prop' | 'cell';
  reachable: boolean;
  /** A reachable position exists inside the trigger radius (the player can press E while standing). */
  canPress: boolean;
  /** Standing props: the trigger is at the south edge of the visible base. */
  southOfArt: boolean;
  /** Standing props: no reachable position north of the art may hold the prompt open. */
  blindFromNorth: boolean;
  /** Floor sockets: the trigger cell lies on the visible socket, i.e. rule 2 of RULE_GAMES.md. */
  gateOnArt: boolean;
}

function anySafeWithin(center: HeartPoint, radius: number): boolean {
  for (let dy = -radius; dy <= radius; dy += 2) {
    for (let dx = -radius; dx <= radius; dx += 2) {
      if (Math.hypot(dx, dy) > radius) continue;
      if (isHeartPositionSafe({ x: center.x + dx, y: center.y + dy })) return true;
    }
  }
  return false;
}

function reachableNorthProbe(element: HeartElement): boolean {
  const artTop = element.y - element.height / 2;
  for (let y = artTop - 60; y < artTop - 1; y += 2) {
    for (let dx = -element.radius; dx <= element.radius; dx += 2) {
      const probe = { x: element.stand.x + dx, y };
      if (Math.hypot(probe.x - element.stand.x, probe.y - element.stand.y) > element.radius) continue;
      if (isHeartPositionSafe(probe)) return true;
    }
  }
  return false;
}

/** Pure geometry audit used by the check script and by the layout document. */
export function auditHeartStands(): HeartStandReport[] {
  return HEART_ELEMENTS.map((element) => {
    const artBottom = element.y + element.height / 2;
    const artTop = element.y - element.height / 2;
    const resting = element.kind === 'prop' ? { x: element.stand.x, y: element.stand.y - 16 } : { x: element.stand.x, y: element.stand.y };
    const cellGate = element.gate ?? { x: element.x - element.width / 2, y: element.y - element.height / 2, width: element.width, height: element.height };
    const gateOnArt = cellGate.y >= artTop - 2 && cellGate.y + cellGate.height <= artBottom + 6;
    return {
      id: element.id,
      kind: element.kind,
      reachable: heartReaches(HEART_SPAWN, element.stand, element.radius + 8),
      canPress: isHeartPositionSafe(resting) && anySafeWithin(element.stand, Math.min(element.radius, 24)),
      southOfArt: element.kind === 'cell' || element.stand.y >= artBottom - 10,
      blindFromNorth: element.kind === 'cell' ? true : !reachableNorthProbe(element),
      gateOnArt,
    };
  });
}

export interface HeartGapReport {
  a: string;
  b: string;
  axis: 'x' | 'y';
  gap: number;
}

function solidRects(): Array<{ id: string; rect: HeartRect }> {
  return [
    ...HEART_BLOCKERS.map((blocker) => ({ id: blocker.id, rect: blocker as HeartRect })),
    ...HEART_PROPS.filter((element) => element.solid).map((element) => ({ id: element.id, rect: element.solid! })),
  ];
}

/**
 * Collision audit: a gap between two solids that the 14x6 foot body fits through but that is narrower
 * than a deliberate 36px threshold is an accidental corridor, not an authored route.
 */
export function auditHeartGaps(): HeartGapReport[] {
  const rects = solidRects();
  const reports: HeartGapReport[] = [];
  for (let i = 0; i < rects.length; i += 1) {
    for (let j = i + 1; j < rects.length; j += 1) {
      const a = rects[i];
      const b = rects[j];
      const overlapY = Math.min(a.rect.y + a.rect.height, b.rect.y + b.rect.height) - Math.max(a.rect.y, b.rect.y);
      const overlapX = Math.min(a.rect.x + a.rect.width, b.rect.x + b.rect.width) - Math.max(a.rect.x, b.rect.x);
      if (overlapY > 0) {
        const gap = a.rect.x < b.rect.x ? b.rect.x - (a.rect.x + a.rect.width) : a.rect.x - (b.rect.x + b.rect.width);
        if (gap > 0) reports.push({ a: a.id, b: b.id, axis: 'x', gap });
      }
      if (overlapX > 0) {
        const gap = a.rect.y < b.rect.y ? b.rect.y - (a.rect.y + a.rect.height) : a.rect.y - (b.rect.y + b.rect.height);
        if (gap > 0) reports.push({ a: a.id, b: b.id, axis: 'y', gap });
      }
    }
  }
  return reports;
}

export function nearestSafeHeartSpawn(saved?: HeartPoint): HeartPoint {
  if (saved && isHeartPositionSafe(saved)) return { x: Math.round(saved.x), y: Math.round(saved.y) };
  const usable = HEART_CHECKPOINTS.filter((entry) => isHeartPositionSafe(entry.point));
  if (!saved) return { ...usable[0]?.point ?? HEART_SPAWN } as HeartPoint;
  const sorted = [...usable].sort((a, b) => Math.hypot(a.point.x - saved.x, a.point.y - saved.y) - Math.hypot(b.point.x - saved.x, b.point.y - saved.y));
  return { ...(sorted[0]?.point ?? HEART_SPAWN) };
}

/**
 * Recompute every Level 10 gate from live inputs. Pure: a reload can never restore a stale derived
 * branch state, and a past visit or an `at-*` flag can never substitute for a held condition.
 */
export function deriveHeartPuzzle(input: HeartPuzzleInput): HeartPuzzleState {
  const light = input.lanternPlaced && input.lanternOn;
  const g0Direct = input.g0 === 1;
  const g0Split = input.g0 === 0;
  const memoryRoute = g0Split && input.memoryMirror === HEART_MEMORY_MIRROR_GOAL;
  const balanceRoute = g0Split && input.balanceMirror === HEART_BALANCE_MIRROR_GOAL;
  const lumoAtSeal = Math.hypot(input.lumo.x - 320, input.lumo.y - 244) <= HEART_SEAL_RADIUS;

  const eyeLeft = light && balanceRoute && input.statue !== HEART_STATUE_BLOCKS_LEFT_EYE;
  const eyeRight = light && balanceRoute && input.statue !== HEART_STATUE_BLOCKS_RIGHT_EYE;
  const moonShadow = light && balanceRoute && input.statue === HEART_STATUE_SHADOW;

  const latched = input.latched;
  const memory = latched || (light && lumoAtSeal && (g0Direct || memoryRoute));
  const hope = latched || (light && lumoAtSeal);
  const balance = latched || (eyeLeft && eyeRight && moonShadow);
  const crystals = input.crystals.memory && input.crystals.hope && input.crystals.balance;
  const ready = crystals && (latched || (memory && hope && balance));

  return {
    light, g0Split, g0Direct, memoryRoute, balanceRoute, lumoAtSeal,
    eyeLeft, eyeRight, moonShadow, memory, hope, balance, crystals, ready, latched,
  };
}

/**
 * Every unmet prerequisite, in plain Vietnamese, for the central node and the locked controls.
 * Never empty when the roots cannot latch.
 */
export function getHeartPrerequisiteFeedback(state: HeartPuzzleState): string[] {
  if (state.latched) return [];
  const missing: string[] = [];
  if (!state.crystals) missing.push('đặt đủ ba tinh thể vào ba hốc quanh Cây Mẹ');
  if (!state.light) missing.push('đặt đèn đang bật lên bệ dẫn sáng');
  if (!state.lumoAtSeal) missing.push('gọi Lumo tới ấn Hy Vọng và để cậu ấy đứng giữ');
  if (state.g0Direct) missing.push('hướng G0 vào lăng kính, đừng chiếu thẳng tới Ký Ức');
  if (!state.memoryRoute && state.g0Split && state.light && state.lumoAtSeal) missing.push('chỉnh gương Ký Ức cho tia tới tinh thể vàng');
  if (!state.balanceRoute && state.light) missing.push('chỉnh gương Cân Bằng tới bộ chia trước tượng');
  if (state.balanceRoute && state.light && (!state.eyeLeft || !state.eyeRight)) {
    missing.push(state.eyeLeft ? 'mở lại mắt nắng phải' : state.eyeRight ? 'mở lại mắt nắng trái' : 'giữ cả hai mắt nắng nhận sáng');
  }
  if (state.balanceRoute && state.light && !state.moonShadow) missing.push('xoay tượng để bóng phủ lõi Nguyệt');
  return missing;
}

export type HeartStage =
  | 'crystals' | 'teach' | 'source' | 'seal' | 'route' | 'confirm' | 'retrieve' | 'overload' | 'done';

export function getHeartStage(input: {
  crystals: boolean;
  taught: boolean;
  lanternPlaced: boolean;
  lanternInHand: boolean;
  called: boolean;
  ready: boolean;
  latched: boolean;
  retrieved: boolean;
  overload: boolean;
  complete: boolean;
}): HeartStage {
  if (input.complete) return 'done';
  if (input.overload) return 'overload';
  if (input.latched) return 'retrieve';
  if (input.ready) return 'confirm';
  if (!input.crystals) return 'crystals';
  if (!input.taught) return 'teach';
  if (input.lanternInHand && !input.lanternPlaced) return 'source';
  if (!input.called) return 'seal';
  return 'route';
}

export interface HeartRestoreState {
  lanternPlaced: boolean;
  lanternInHand: boolean;
  lanternOn: boolean;
  overloadActive: boolean;
  finalActionAvailable: boolean;
  spawnKind: 'saved' | 'overload' | 'checkpoint';
}

/**
 * Map saved flags to a restore plan. The overload stage is never persisted as a stuck state: a saved
 * overload always restores the lantern in hand and lit, with F immediately available, so the player
 * can always finish the ending.
 */
export function resolveHeartRestoreState(saved: {
  roots: boolean;
  lanternPlaced?: boolean;
  lanternRetrieved: boolean;
  overload: boolean;
  lanternOn: boolean;
  complete: boolean;
}): HeartRestoreState {
  const placed = saved.lanternPlaced === true
    || (saved.lanternPlaced === undefined && saved.roots && !saved.lanternRetrieved && !saved.overload);
  // The overload only exists while the lantern has been taken back in hand and is still lit; anything
  // else (an unlit lantern, a completed campaign) must restore a plain safe state instead.
  const overloadActive = saved.overload && saved.roots && saved.lanternRetrieved && !saved.complete;
  if (overloadActive) {
    return { lanternPlaced: false, lanternInHand: true, lanternOn: true, overloadActive: true, finalActionAvailable: true, spawnKind: 'overload' };
  }
  const placedFinal = placed && !saved.lanternRetrieved;
  return {
    lanternPlaced: placedFinal,
    lanternInHand: !placedFinal,
    lanternOn: saved.lanternOn,
    overloadActive: false,
    finalActionAvailable: saved.roots,
    spawnKind: 'checkpoint',
  };
}

/** Idempotent repair of inconsistent saved combinations before anything is derived from them. */
export function normalizeHeartProgress(flags: Record<string, boolean | string>): void {
  if (flags['l9-overload'] === true && flags['l9-lantern-retrieved'] !== true) flags['l9-overload'] = false;
  if (flags['l9-roots'] === true && flags['l9-overload'] === true) flags['l9-lantern-placed'] = false;
  if (flags['l9-lantern-retrieved'] === true) flags['l9-lantern-placed'] = false;
  if (flags['l9-overload'] === true && flags['l9-complete'] === true) flags['l9-overload'] = false;
  if (flags['l9-at-heart'] === true && flags['l9-called-heart'] !== true) flags['l9-at-heart'] = false;
}

/** The campaign-level equivalent of the v1 `finale_overload → hub_final` write-back. */
export function shouldPersistHeartOverload(stage: string): string {
  return stage === 'finale_overload' ? 'hub_final' : stage;
}

export type HeartExitBlock = 'crystals' | 'branches' | 'latched' | undefined;

/** The ending is reachable only through the scenario's completion conditions. */
export function getHeartExitBlock(state: HeartPuzzleState, complete: boolean): HeartExitBlock {
  if (complete) return undefined;
  if (!state.crystals) return 'crystals';
  if (!state.ready) return 'branches';
  if (!state.latched) return 'latched';
  return undefined;
}

/**
 * The ending is completable once the root loop is latched and the lantern is either on the pedestal
 * (still lit for a valid final action there, or already off so collecting it completes the campaign)
 * or held by Nhinh.
 */
export function isHeartFinalActionAvailable(state: HeartPuzzleState, lantern: { inHand: boolean; placed: boolean; on: boolean }): boolean {
  if (!state.latched) return false;
  return lantern.placed || lantern.inHand;
}

/** F is meaningful only while the lantern is still lit and reachable by hand or on the pedestal. */
export function canExtinguishHeartLantern(state: HeartPuzzleState, lantern: { inHand: boolean; placed: boolean; on: boolean }): boolean {
  return isHeartFinalActionAvailable(state, lantern) && lantern.on;
}
