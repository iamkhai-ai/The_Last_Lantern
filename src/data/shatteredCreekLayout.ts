export type Point = Readonly<{ x: number; y: number }>;
export type Rect = Readonly<{ x: number; y: number; width: number; height: number }>;
export type Direction = 'east' | 'west' | 'north' | 'south';
export type MirrorPose = 0 | 1 | 2;
export type CreekSource = 'practice' | 'main' | null;

const p = (x: number, y: number): Point => ({ x, y });
const rect = (x: number, y: number, width: number, height: number): Rect => ({ x, y, width, height });

export const SHATTERED_CREEK = {
  bounds: rect(16, 88, 608, 222),
  banks: { west: rect(16, 88, 228, 222), island: rect(304, 88, 92, 222), east: rect(456, 88, 168, 222) },
  water: [rect(244, 88, 60, 222), rect(396, 88, 60, 222)] as const,
  bridges: {
    a: { gap: rect(244, 230, 60, 36), art: p(274, 248), latch: 'l3-latch-a' },
    b: { gap: rect(396, 230, 60, 36), art: p(426, 248), latch: 'l3-latch-b' },
  },
  objects: {
    practiceSource: { ground: p(68, 291), optical: p(68, 264), stand: p(68, 288), base: rect(57, 281, 22, 10) },
    practiceMirror: { ground: p(132, 289), optical: p(132, 264), stand: p(132, 288), base: rect(121, 279, 22, 10) },
    practiceEye: { ground: p(132, 222), optical: p(132, 208), base: rect(122, 214, 20, 8) },
    source: { ground: p(76, 201), optical: p(76, 174), stand: p(76, 207), base: rect(65, 191, 22, 10) },
    g1: { ground: p(202, 199), optical: p(202, 174), stand: p(202, 205), base: rect(191, 189, 22, 10) },
    g2: { ground: p(202, 133), optical: p(202, 108), stand: p(202, 139), base: rect(191, 123, 22, 10) },
    g3: { ground: p(350, 133), optical: p(350, 108), stand: p(350, 139), base: rect(339, 123, 22, 10) },
    eyeA: { ground: p(76, 120), optical: p(76, 108), stand: p(76, 112), base: rect(68, 112, 16, 8) },
    eyeB: { ground: p(350, 206), optical: p(350, 194), stand: p(350, 198), base: rect(342, 198, 16, 8) },
    latchA: { ground: p(224, 284), stand: p(224, 252), base: rect(214, 274, 20, 10) },
    latchB: { ground: p(374, 284), stand: p(374, 252), base: rect(364, 274, 20, 10) },
    relief: { ground: p(546, 182), stand: p(546, 188), base: rect(498, 170, 96, 12) },
    exit: { ground: p(568, 300), stand: p(568, 286), posts: [rect(530, 222, 22, 78), rect(584, 222, 22, 78)] },
  },
  spawn: p(68, 286),
  practice: { mirror: 'practiceMirror', source: 'practiceSource', receiver: 'practiceEye' },
  rays: {
    practiceSource: p(68, 264), practiceMirror: p(132, 264), mainSource: p(76, 174), g1: p(202, 174), g2: p(202, 108), g3: p(350, 108), eyeA: p(76, 108), eyeB: p(350, 194), practiceEye: p(132, 208),
  },
} as const;

export interface CreekState {
  source: CreekSource;
  lanternOn: boolean;
  g1: MirrorPose;
  g2: MirrorPose;
  g3: MirrorPose;
  practice: MirrorPose;
  practiceComplete: boolean;
  latchA: boolean;
  latchB: boolean;
  memo: boolean;
  lanternRetrieved: boolean;
}

export interface RaySegment { from: Point; to: Point; hit: string | null; }
export interface CreekLiveState { practiceSegments: RaySegment[]; mainSegments: RaySegment[]; practiceLit: boolean; eyeA: boolean; eyeB: boolean; bridgeA: boolean; bridgeB: boolean; step: 'practice' | 'pickup' | 'main' | 'latch-a' | 'reroute' | 'latch-b' | 'retrieve' | 'relief' | 'exit'; }

export function reflect(direction: Direction, pose: MirrorPose): Direction | null {
  if (pose === 0) return direction === 'east' || direction === 'west' ? null : direction === 'north' ? 'south' : 'north';
  if (pose === 1) return ({ east: 'south', south: 'east', west: 'north', north: 'west' } as const)[direction];
  return ({ east: 'north', north: 'east', west: 'south', south: 'west' } as const)[direction];
}

export function traceRay(start: Point, direction: Direction, mirrors: ReadonlyArray<{ id: string; at: Point; pose: MirrorPose }>, receivers: ReadonlyArray<{ id: string; at: Point }>, maxHits = 12): RaySegment[] {
  const segments: RaySegment[] = [];
  const visited = new Set<string>();
  let from = start;
  let heading = direction;
  for (let i = 0; i < maxHits; i += 1) {
    const candidates = [
      ...mirrors.map((item) => ({ ...item, kind: 'mirror' as const })),
      ...receivers.map((item) => ({ ...item, kind: 'receiver' as const, pose: 0 as MirrorPose })),
    ].map((item) => ({ item, distance: heading === 'east' ? item.at.y === from.y && item.at.x > from.x ? item.at.x - from.x : Infinity
      : heading === 'west' ? item.at.y === from.y && item.at.x < from.x ? from.x - item.at.x : Infinity
        : heading === 'north' ? item.at.x === from.x && item.at.y < from.y ? from.y - item.at.y : Infinity
          : item.at.x === from.x && item.at.y > from.y ? item.at.y - from.y : Infinity }))
      .filter((candidate) => Number.isFinite(candidate.distance))
      .sort((a, b) => a.distance - b.distance);
    const nearest = candidates[0]?.item;
    const endpoint = nearest?.at ?? rayBoundary(from, heading);
    segments.push({ from, to: endpoint, hit: nearest?.id ?? null });
    if (!nearest || nearest.kind === 'receiver') break;
    const key = `${nearest.id}:${heading}`;
    if (visited.has(key)) break;
    visited.add(key);
    const output = reflect(heading, nearest.pose);
    if (!output) break;
    from = nearest.at;
    heading = output;
  }
  return segments;
}

function rayBoundary(from: Point, direction: Direction): Point {
  return direction === 'east' ? p(624, from.y) : direction === 'west' ? p(16, from.y) : direction === 'north' ? p(from.x, 88) : p(from.x, 310);
}

const mirrors = (state: CreekState) => [
  { id: 'g1', at: SHATTERED_CREEK.rays.g1, pose: state.g1 },
  { id: 'g2', at: SHATTERED_CREEK.rays.g2, pose: state.g2 },
  // G3's approved art identity uses 1=slash and 2=backslash; G1/G2 use 1=backslash, 2=slash.
  { id: 'g3', at: SHATTERED_CREEK.rays.g3, pose: (state.g3 === 1 ? 2 : state.g3 === 2 ? 1 : 0) as MirrorPose },
];

export function deriveCreekState(state: CreekState): CreekLiveState {
  const mainSegments = state.source === 'main' && state.lanternOn
    ? traceRay(SHATTERED_CREEK.rays.mainSource, 'east', mirrors(state), [{ id: 'eyeA', at: SHATTERED_CREEK.rays.eyeA }, { id: 'eyeB', at: SHATTERED_CREEK.rays.eyeB }]) : [];
  const practiceSegments = state.source === 'practice' && state.lanternOn
    ? traceRay(SHATTERED_CREEK.rays.practiceSource, 'east', [{ id: 'practiceMirror', at: SHATTERED_CREEK.rays.practiceMirror, pose: state.practice }], [{ id: 'practiceEye', at: SHATTERED_CREEK.rays.practiceEye }]) : [];
  const eyeA = mainSegments.some((segment) => segment.hit === 'eyeA');
  const eyeB = mainSegments.some((segment) => segment.hit === 'eyeB');
  const practiceLit = practiceSegments.some((segment) => segment.hit === 'practiceEye');
  const bridgeA = state.latchA || eyeA;
  const bridgeB = state.latchB || eyeB;
  const step: CreekLiveState['step'] = state.latchB
    ? state.source !== null || !state.lanternRetrieved ? 'retrieve' : !state.memo ? 'relief' : 'exit'
    : state.latchA ? eyeB ? 'latch-b' : 'reroute'
      : eyeA ? 'latch-a'
        : state.source === 'practice' && state.practiceComplete ? 'pickup'
          : state.source === 'practice' || (!state.practiceComplete && !state.lanternRetrieved && !state.source) ? 'practice'
            : !state.lanternRetrieved && !state.source ? 'pickup'
              : 'main';
  return { practiceSegments, mainSegments, practiceLit, eyeA, eyeB, bridgeA, bridgeB, step };
}

export function migrateV1Creek(progress: { flags: Record<string, boolean | string>; counters: Record<string, number>; lanternOn: boolean }): CreekState {
  const flags = progress.flags;
  const migrated = flags['l3-layout-v2'] === true;
  let g2 = pose(progress.counters.g2, 0);
  if (!migrated) g2 = progress.counters.g2 === 3 ? 2 : progress.counters.g2 === 2 ? 0 : g2;
  progress.counters.g2 = g2;
  flags['l3-layout-v2'] = true;
  flags['l3-latch-a'] = flags['l3-latch-a'] === true;
  flags['l3-latch-b'] = flags['l3-latch-b'] === true;
  if (flags['l3-latch-b']) flags['l3-latch-a'] = true;
  const placed = flags['l3-lantern-placed'] === true && flags['l3-lantern-retrieved'] !== true;
  const identity = flags['l3-lamp-source'];
  const source: CreekSource = placed ? identity === 'practice' ? 'practice' : 'main' : null;
  return { source, lanternOn: progress.lanternOn, g1: pose(progress.counters.g1, 0), g2, g3: pose(progress.counters.g3, 0), practice: pose(progress.counters['l3-practice'], 0), practiceComplete: flags['l3-practice-complete'] === true, latchA: flags['l3-latch-a'] === true, latchB: flags['l3-latch-b'] === true, memo: flags['l3-memo'] === true, lanternRetrieved: flags['l3-lantern-retrieved'] === true };
}

function pose(value: number | undefined, fallback: MirrorPose): MirrorPose { return value === 1 || value === 2 ? value : fallback; }

export function bodyRect(center: Point): Rect { return rect(center.x - 7, center.y + 19 - 3, 14, 6); }
export function overlaps(a: Rect, b: Rect): boolean { return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y; }
export function pointOnBank(center: Point, bank: keyof typeof SHATTERED_CREEK.banks): boolean { return overlaps(bodyRect(center), SHATTERED_CREEK.banks[bank]); }
export function canApproach(center: Point, target: Point, bank: keyof typeof SHATTERED_CREEK.banks): boolean { return pointOnBank(center, bank) && Math.hypot(center.x - target.x, center.y - target.y) <= 24; }

export function creekCenterWalkable(center: Point, live: CreekLiveState, obstacles: Rect[] = Object.values(SHATTERED_CREEK.objects).flatMap((item) => 'base' in item ? [item.base] : [])): boolean {
  const body = bodyRect(center);
  if (body.x < SHATTERED_CREEK.bounds.x || body.y < SHATTERED_CREEK.bounds.y || body.x + body.width > SHATTERED_CREEK.bounds.x + SHATTERED_CREEK.bounds.width || body.y + body.height > SHATTERED_CREEK.bounds.y + SHATTERED_CREEK.bounds.height) return false;
  const containedBy = (outer: Rect, inner: Rect): boolean => inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.width <= outer.x + outer.width && inner.y + inner.height <= outer.y + outer.height;
  for (const [water, gap, ready] of [[SHATTERED_CREEK.water[0], SHATTERED_CREEK.bridges.a.gap, live.bridgeA], [SHATTERED_CREEK.water[1], SHATTERED_CREEK.bridges.b.gap, live.bridgeB]] as const) {
    if (overlaps(body, water)) {
      const part = { x: Math.max(body.x, water.x), y: Math.max(body.y, water.y), width: Math.min(body.x + body.width, water.x + water.width) - Math.max(body.x, water.x), height: Math.min(body.y + body.height, water.y + water.height) - Math.max(body.y, water.y) };
      if (!ready || !containedBy(gap, part)) return false;
    }
  }
  return !obstacles.some((obstacle) => overlaps(body, obstacle));
}

export function unsafePowerChange(center: Point, before: CreekLiveState, after: CreekLiveState): 'occupied-bridge' | 'stranded-east' | 'stranded-island' | null {
  const body = bodyRect(center);
  if (before.bridgeA && !after.bridgeA && overlaps(body, SHATTERED_CREEK.bridges.a.gap)
    || before.bridgeB && !after.bridgeB && overlaps(body, SHATTERED_CREEK.bridges.b.gap)) return 'occupied-bridge';
  for (const [id, was, becomes] of [
    ['a', before.bridgeA, after.bridgeA],
    ['b', before.bridgeB, after.bridgeB],
  ] as const) {
    if (was && !becomes && id === 'a' && center.x >= 304) return center.x < 396 ? 'stranded-island' : 'stranded-east';
    if (was && !becomes && id === 'b' && center.x >= 396) return 'stranded-east';
  }
  return null;
}

export function resolveCreekSpawn(saved: Point | undefined, live: CreekLiveState): Point {
  const candidates = [saved, live.bridgeA && live.bridgeB ? p(480, 140) : undefined, live.bridgeA ? SHATTERED_CREEK.objects.g3.stand : undefined, SHATTERED_CREEK.spawn, SHATTERED_CREEK.objects.source.stand, SHATTERED_CREEK.objects.latchA.stand].filter((item): item is Point => Boolean(item));
  return candidates.find((candidate) => creekCenterWalkable(candidate, live) && (candidate.x < 244 || candidate.x < 396 && live.bridgeA || live.bridgeA && live.bridgeB)) ?? SHATTERED_CREEK.spawn;
}

export function canCompleteCreek(state: CreekState): boolean { return state.latchA && state.latchB && state.source === null && state.lanternRetrieved && state.memo; }
