export type Point = Readonly<{ x: number; y: number }>;
export type Rect = Readonly<{ x: number; y: number; width: number; height: number }>;
export type MirrorPose = 0 | 1 | 2;
export type G0Pose = 0 | 1 | 2;
export type TowerSource = 'practice' | 'main' | null;
export type LumoAssign = 'follow' | 'to-c' | 'at-c';
export type TowerStep = 'practice' | 'place' | 'main' | 'call' | 'switch' | 'retrieve' | 'crystal' | 'record' | 'recall' | 'exit';

const p = (x: number, y: number): Point => ({ x, y });
const rect = (x: number, y: number, width: number, height: number): Rect => ({ x, y, width, height });

export const TOWER = {
  bounds: rect(24, 88, 592, 222),
  spawn: p(135, 272),
  objects: {
    benchSource: { ground: p(95, 180), optical: p(95, 155), stand: p(95, 200), base: rect(84, 170, 22, 10) },
    benchMirror: { ground: p(140, 180), optical: p(140, 155), stand: p(140, 202), base: rect(129, 170, 22, 10) },
    benchPrism: { center: p(140, 116), input: p(140, 122), left: p(123, 122), right: p(157, 122), base: rect(129, 128, 22, 8) },
    benchEyeA: { ground: p(123, 110), optical: p(123, 98), base: rect(115, 102, 16, 8) },
    benchEyeB: { ground: p(157, 110), optical: p(157, 98), base: rect(149, 102, 16, 8) },
    source: { ground: p(140, 242), optical: p(140, 215), stand: p(140, 262), base: rect(129, 232, 22, 10) },
    g0: { ground: p(212, 242), optical: p(212, 215), stand: p(212, 262), base: rect(201, 232, 22, 10) },
    prism: { center: p(292, 209), input: p(292, 215), left: p(275, 215), right: p(309, 215), base: rect(281, 221, 22, 8) },
    g1: { ground: p(275, 187), optical: p(275, 162), stand: p(275, 218), base: rect(264, 177, 22, 10) },
    g2: { ground: p(309, 280), optical: p(309, 255), stand: p(309, 272), base: rect(298, 270, 22, 10) },
    eyeA: { ground: p(460, 174), optical: p(460, 162), base: rect(452, 166, 16, 8) },
    eyeB: { ground: p(460, 267), optical: p(460, 255), base: rect(452, 259, 16, 8) },
    call: { ground: p(350, 252), stand: p(350, 272), base: rect(339, 242, 22, 10) },
    // The lever sits 36px west of the chamber so the lane between them fits a 14px body with clearance on both sides.
    lever: { ground: p(497, 232), stand: p(497, 254), base: rect(482, 222, 22, 10) },
    chamber: { ground: p(580, 284), stand: p(580, 288), solid: rect(540, 180, 80, 104), crystal: p(580, 232) },
    window: { center: p(565, 92) },
    // Its body keeps 5px clear of the chamber, so the stand is reachable without an exact-fit column.
    record: { center: p(565, 156), stand: p(528, 192) },
    // The window and the record panel are wall art, so the strip above the chamber is solid (x 509..620, y 88..180 joins the chamber solid at y=180).
    eastWall: { solid: rect(509, 88, 111, 92) },
    rings: { a: p(283, 120), b: p(307, 120), c: p(331, 120) },
  },
  lumo: {
    route: [p(400, 246), p(382, 262), p(366, 276), p(350, 290)] as const,
    seal: p(350, 290),
    sealTolerance: 8,
    reuniteRange: 30,
  },
  stairsStand: p(100, 272),
  interactionRange: 24,
} as const;

export const TOWER_SOLIDS: readonly Rect[] = [
  ...Object.values(TOWER.objects).flatMap((item) => ('base' in item ? [item.base] : 'solid' in item ? [item.solid] : [])),
];

export interface TowerState {
  source: TowerSource;
  lanternOn: boolean;
  g0: G0Pose;
  g1: MirrorPose;
  g2: MirrorPose;
  practice: MirrorPose;
  practiceDone: boolean;
  lanternRetrieved: boolean;
  waterReturned: boolean;
  crystal: boolean;
  recordRead: boolean;
  reunited: boolean;
  lumoAssign: LumoAssign;
}

export interface TowerBeam { from: Point; to: Point; live: boolean; kind: 'main' | 'practice'; }
export interface TowerLiveState {
  beams: TowerBeam[];
  liveA: boolean;
  liveB: boolean;
  liveC: boolean;
  practiceLit: boolean;
  lumoAtC: boolean;
  canSwitch: boolean;
  step: TowerStep;
}

export function towerBodyRect(center: Point): Rect { return rect(center.x - 7, center.y + 16, 14, 6); }
export function overlaps(a: Rect, b: Rect): boolean { return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y; }

export function towerCenterWalkable(center: Point, obstacles: readonly Rect[] = TOWER_SOLIDS): boolean {
  const body = towerBodyRect(center);
  if (body.x < TOWER.bounds.x || body.y < TOWER.bounds.y || body.x + body.width > TOWER.bounds.x + TOWER.bounds.width || body.y + body.height > TOWER.bounds.y + TOWER.bounds.height) return false;
  return !obstacles.some((obstacle) => overlaps(body, obstacle));
}

export function towerCanApproach(center: Point, target: Point, obstacles: readonly Rect[] = TOWER_SOLIDS): boolean {
  return towerCenterWalkable(center, obstacles) && Math.hypot(center.x - target.x, center.y - target.y) <= TOWER.interactionRange;
}

/**
 * Standing props are used from their south face only (RULE_GAMES §1): the body must sit at or below
 * the prop's footprint bottom edge (1px tolerance for sub-pixel collision), the player's centre must lie
 * within the footprint's x span (1px tolerance), and the stand must be in range.
 */
export function towerCanApproachFront(center: Point, stand: Point, front: Rect, obstacles: readonly Rect[] = TOWER_SOLIDS): boolean {
  const southFace = towerBodyRect(center).y + 1 >= front.y + front.height;
  const withinSpan = center.x >= front.x - 1 && center.x <= front.x + front.width + 1;
  return towerCanApproach(center, stand, obstacles) && southFace && withinSpan;
}

export function isLumoAtSeal(assignment: LumoAssign, lumo: Point | undefined): boolean {
  return assignment === 'at-c' && lumo !== undefined && Math.hypot(lumo.x - TOWER.lumo.seal.x, lumo.y - TOWER.lumo.seal.y) <= TOWER.lumo.sealTolerance;
}

export function deriveTowerLive(state: TowerState, lumo?: Point): TowerLiveState {
  const beams: TowerBeam[] = [];
  const o = TOWER.objects;
  let liveA = false;
  let liveB = false;
  const opticsLive = !state.waterReturned;
  if (state.source === 'main' && state.lanternOn) {
    beams.push({ from: o.source.optical, to: o.g0.optical, live: opticsLive, kind: 'main' });
    if (state.g0 === 0) {
      beams.push({ from: o.g0.optical, to: o.prism.input, live: opticsLive, kind: 'main' });
      beams.push({ from: o.prism.left, to: o.g1.optical, live: opticsLive, kind: 'main' });
      if (state.g1 === 2) {
        beams.push({ from: o.g1.optical, to: o.eyeA.optical, live: opticsLive, kind: 'main' });
        liveA = opticsLive;
      } else if (state.g1 === 1) {
        beams.push({ from: o.g1.optical, to: p(253, 162), live: false, kind: 'main' });
      }
      beams.push({ from: o.prism.right, to: o.g2.optical, live: opticsLive, kind: 'main' });
      if (state.g2 === 1) {
        beams.push({ from: o.g2.optical, to: o.eyeB.optical, live: opticsLive, kind: 'main' });
        liveB = opticsLive;
      } else if (state.g2 === 2) {
        beams.push({ from: o.g2.optical, to: p(287, 255), live: false, kind: 'main' });
      }
    } else if (state.g0 === 1) {
      beams.push({ from: o.g0.optical, to: p(247, 180), live: opticsLive, kind: 'main' });
      beams.push({ from: p(247, 180), to: p(292, 180), live: opticsLive, kind: 'main' });
      beams.push({ from: p(292, 180), to: p(292, 162), live: opticsLive, kind: 'main' });
      beams.push({ from: p(292, 162), to: o.eyeA.optical, live: opticsLive, kind: 'main' });
      liveA = opticsLive;
    } else {
      beams.push({ from: o.g0.optical, to: p(240, 243), live: opticsLive, kind: 'main' });
      beams.push({ from: p(240, 243), to: p(440, 243), live: opticsLive, kind: 'main' });
      beams.push({ from: p(440, 243), to: p(440, 255), live: opticsLive, kind: 'main' });
      beams.push({ from: p(440, 255), to: o.eyeB.optical, live: opticsLive, kind: 'main' });
      liveB = opticsLive;
    }
  }
  let practiceLit = false;
  if (state.source === 'practice' && state.lanternOn) {
    beams.push({ from: o.benchSource.optical, to: o.benchMirror.optical, live: opticsLive, kind: 'practice' });
    if (state.practice === 1) {
      beams.push({ from: o.benchMirror.optical, to: o.benchPrism.input, live: opticsLive, kind: 'practice' });
      beams.push({ from: o.benchPrism.left, to: o.benchEyeA.optical, live: opticsLive, kind: 'practice' });
      beams.push({ from: o.benchPrism.right, to: o.benchEyeB.optical, live: opticsLive, kind: 'practice' });
      practiceLit = opticsLive;
    } else if (state.practice === 2) {
      beams.push({ from: o.benchMirror.optical, to: p(140, 175), live: false, kind: 'practice' });
    }
  }
  const lumoAtC = isLumoAtSeal(state.lumoAssign, lumo);
  const canSwitch = state.source === 'main' && state.lanternOn && liveA && liveB && lumoAtC && !state.waterReturned;
  const step = deriveTowerStep(state, liveA, liveB, canSwitch);
  return { beams, liveA, liveB, liveC: lumoAtC, practiceLit, lumoAtC, canSwitch, step };
}

function deriveTowerStep(state: TowerState, liveA: boolean, liveB: boolean, canSwitch: boolean): TowerStep {
  if (state.waterReturned) {
    if (state.source !== null || !state.lanternRetrieved) return 'retrieve';
    if (!state.crystal) return 'crystal';
    if (!state.recordRead) return 'record';
    if (!state.reunited) return 'recall';
    return 'exit';
  }
  if (canSwitch) return 'switch';
  if (state.source === 'main') return liveA && liveB ? 'call' : 'main';
  if (!state.practiceDone) return 'practice';
  return 'place';
}

export function getTowerExitBlock(state: TowerState): 'power' | 'lamp' | 'crystal' | 'record' | 'companion' | null {
  if (!state.waterReturned) return 'power';
  if (state.source !== null || !state.lanternRetrieved) return 'lamp';
  if (!state.crystal) return 'crystal';
  if (!state.recordRead) return 'record';
  if (!state.reunited) return 'companion';
  return null;
}

export function canCompleteTower(state: TowerState): boolean { return getTowerExitBlock(state) === null; }

/**
 * The call pedestal sends Lumo to C or recalls him. Once the machine has switched and Lumo is already back
 * beside Nhinh, the mark has nothing left to do: sending him to C again would undo the reunion.
 */
export function canUseCallMark(state: TowerState): boolean {
  return !(state.waterReturned && state.lumoAssign === 'follow');
}

/**
 * Scenario 06 §5 "Những dấu nhỏ": tally marks under the window sill, between the sill and the record panel. They are
 * placeholder decals drawn at runtime (no art yet). A Pulse whose origin is within `pulseRadius` reveals them.
 */
export const TOWER_TALLY = { centre: p(552, 131), pulseRadius: 80, groups: [5, 5, 3] as const } as const;

export function towerPulseReachesTally(origin: Point): boolean {
  return Math.hypot(origin.x - TOWER_TALLY.centre.x, origin.y - TOWER_TALLY.centre.y) <= TOWER_TALLY.pulseRadius;
}

export interface TowerMachineLayers { hum: boolean; circuitA: boolean; circuitB: boolean; circuitC: boolean; }

/**
 * Scenario 06 §4 "Âm thanh của máy": the machine's hum is present until Return Flow. Each live circuit adds its own
 * voice; a circuit that is not live adds nothing. After Return Flow every layer is off, so nothing buzzes or errors.
 */
export function towerMachineLayers(live: TowerLiveState, waterReturned: boolean): TowerMachineLayers {
  return {
    hum: !waterReturned,
    circuitA: !waterReturned && live.liveA,
    circuitB: !waterReturned && live.liveB,
    circuitC: !waterReturned && live.liveC,
  };
}

export function resolveTowerSpawn(saved: Point | undefined): Point {
  return saved && towerCenterWalkable(saved) ? saved : TOWER.spawn;
}

const pose = (value: number | undefined, fallback: MirrorPose): MirrorPose => (value === 1 || value === 2 ? value : fallback);

export function migrateTowerProgress(progress: { flags: Record<string, boolean | string>; counters: Record<string, number>; lanternOn: boolean }): TowerState {
  const flags = progress.flags;
  const migrated = flags['l5-layout-v2'] === true;
  if (!migrated) {
    // Legacy pose space: the working configuration was g0=2, g1=1, g2=3 -> new space g0=0 (splitter), g1=2 (aim A), g2=1 (aim B).
    // Every legacy G0 value lands on the splitter (0): the old working pose had g0=2, which is the splitter's new home.
    progress.counters['tower-g0'] = 0;
    progress.counters['tower-g1'] = progress.counters['tower-g1'] === 1 ? 2 : 0;
    progress.counters['tower-g2'] = progress.counters['tower-g2'] === 3 ? 1 : 0;
    const assign = flags['l5-lumo-assign'];
    const keep = assign === 'to-c' || assign === 'at-c' ? assign : flags['l5-called-high'] === true && flags['l5-return-called'] !== true ? 'at-c' : 'follow';
    flags['l5-lumo-assign'] = keep;
    flags['l5-layout-v2'] = true;
  }
  const placed = flags['l5-lantern-placed'] === true && flags['l5-lantern-retrieved'] !== true;
  const source: TowerSource = placed ? (flags['l5-lamp-source'] === 'practice' ? 'practice' : 'main') : null;
  const g0 = progress.counters['tower-g0'];
  const assignRaw = flags['l5-lumo-assign'];
  return {
    source,
    lanternOn: progress.lanternOn,
    g0: g0 === 1 || g0 === 2 ? g0 : 0,
    g1: pose(progress.counters['tower-g1'], 0),
    g2: pose(progress.counters['tower-g2'], 0),
    practice: pose(progress.counters['l5-practice'], 0),
    practiceDone: flags['l5-practice-ok'] === true,
    lanternRetrieved: flags['l5-lantern-retrieved'] === true,
    waterReturned: flags['l5-water-returned'] === true || flags['l5-power'] === true,
    crystal: flags['l5-crystal'] === true,
    recordRead: flags['l5-record-read'] === true,
    reunited: flags['l5-reunited'] === true,
    lumoAssign: assignRaw === 'to-c' || assignRaw === 'at-c' ? assignRaw : 'follow',
  };
}
