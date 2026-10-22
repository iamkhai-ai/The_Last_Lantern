export type ForestEdgeObjectId =
  | 'player' | 'lantern' | 'tablet' | 'standing-ring' | 'gate' | 'sun-eye'
  | 'tree-nw' | 'tree-northwest' | 'tree-north' | 'tree-northeast' | 'tree-east'
  | 'tree-west' | 'tree-right' | 'tree-southwest' | 'tree-southeast' | 'rock-west' | 'rock-east';

export interface Point { x: number; y: number }
export interface Rect { x: number; y: number; width: number; height: number }
export interface ForestEdgeProp { id: ForestEdgeObjectId; anchor: Point; texture: string; solid?: Rect; depth: number }

export const FOREST_EDGE = {
  world: { left: 0, right: 640, top: 96, bottom: 310 },
  // The opening cluster sits 72 px farther west; the ring and gate stay fixed.
  player: { spawn: { x: 208, y: 286 }, footOffsetY: 19, body: { width: 14, height: 6, offsetX: 11, offsetY: 37 } },
  objects: {
    lantern: { anchor: { x: 152, y: 238 }, stand: { x: 152, y: 251 }, texture: 'pickup-lantern' },
    tablet: { anchor: { x: 228, y: 230 }, stand: { x: 228, y: 222 }, solid: { x: 214, y: 218, width: 28, height: 12 } },
    ring: { anchor: { x: 410, y: 225 }, ground: { x: 410, y: 210 }, stand: { x: 410, y: 191 }, radius: 16, texture: 'stone-standing-ring' },
    gate: { anchor: { x: 486, y: 166 }, stand: { x: 486, y: 151 }, exit: { x: 486, y: 151 }, posts: [{ x: 410, y: 126, width: 50, height: 40 }, { x: 512, y: 126, width: 50, height: 40 }], header: { x: 447, y: 126, width: 78, height: 18 }, threshold: { x: 447, y: 126, width: 78, height: 18 }, backing: { x: 410, y: 96, width: 152, height: 30 } },
    eye: { anchor: { x: 538, y: 122 }, texture: 'sun-eye-dormant' },
    trees: [
      { id: 'tree-nw', anchor: { x: 48, y: 142 } }, { id: 'tree-northwest', anchor: { x: 112, y: 102 } },
      { id: 'tree-north', anchor: { x: 212, y: 108 } }, { id: 'tree-northeast', anchor: { x: 358, y: 108 } },
      { id: 'tree-east', anchor: { x: 595, y: 138 } }, { id: 'tree-west', anchor: { x: 46, y: 230 } },
      { id: 'tree-right', anchor: { x: 592, y: 236 } }, { id: 'tree-southwest', anchor: { x: 76, y: 313 } },
      { id: 'tree-southeast', anchor: { x: 567, y: 313 } },
    ] as Array<{ id: ForestEdgeObjectId; anchor: Point }>,
    rocks: [{ id: 'rock-west', anchor: { x: 122, y: 204 } }, { id: 'rock-east', anchor: { x: 531, y: 279 } }] as Array<{ id: ForestEdgeObjectId; anchor: Point }>,
    trail: [{ x: 258, y: 245 }, { x: 285, y: 241 }, { x: 312, y: 236 }, { x: 339, y: 229 }, { x: 366, y: 221 }, { x: 392, y: 216 }] as Point[],
  },
  checkpoints: {
    start: { x: 208, y: 286 }, tablet: { x: 228, y: 250 }, ring: { x: 410, y: 191 }, gate: { x: 486, y: 174 },
  } satisfies Record<string, Point>,
  pulseDiscovery: { center: { x: 324, y: 235 }, radius: 195 },
  chargeMs: 900,
} as const;

export const FOREST_EDGE_SOLIDS: Rect[] = [
  FOREST_EDGE.objects.tablet.solid,
  ...FOREST_EDGE.objects.gate.posts,
  FOREST_EDGE.objects.gate.backing,
  ...FOREST_EDGE.objects.trees.map(({ anchor }) => ({ x: anchor.x - 9, y: anchor.y - 14, width: 18, height: 14 })),
  ...FOREST_EDGE.objects.rocks.map(({ anchor }) => ({ x: anchor.x - 13, y: anchor.y - 14, width: 26, height: 14 })),
];

/** The lantern pedestal's visual footprint (20x28 above its anchor). It has no collision; E answers from its base. */
export const FOREST_EDGE_LANTERN_PEDESTAL: Rect = {
  x: FOREST_EDGE.objects.lantern.anchor.x - 10,
  y: FOREST_EDGE.objects.lantern.anchor.y - 28,
  width: 20,
  height: 28,
};

/** The doorway slot between the two gate posts: the only spot the gate's E prompt answers from (RULE_GAMES.md §3). */
const [FOREST_GATE_LEFT_POST, FOREST_GATE_RIGHT_POST] = FOREST_EDGE.objects.gate.posts;
export const FOREST_EDGE_GATE_SLOT: Rect = {
  x: FOREST_GATE_LEFT_POST.x + FOREST_GATE_LEFT_POST.width,
  y: FOREST_GATE_LEFT_POST.y,
  width: FOREST_GATE_RIGHT_POST.x - (FOREST_GATE_LEFT_POST.x + FOREST_GATE_LEFT_POST.width),
  height: FOREST_GATE_LEFT_POST.height,
};

/** Walkable dirt path through the forest edge, raw (before Chaikin smoothing). Point order is the polygon outline. */
export const FOREST_EDGE_GROUND_PATH: readonly Point[] = [
  { x: 176, y: 304 }, { x: 149, y: 282 }, { x: 123, y: 265 },
  { x: 120, y: 252 }, { x: 126, y: 243 }, { x: 166, y: 234 },
  { x: 208, y: 235 }, { x: 247, y: 230 }, { x: 287, y: 221 },
  { x: 329, y: 207 }, { x: 371, y: 197 }, { x: 405, y: 191 },
  { x: 431, y: 171 }, { x: 468, y: 151 }, { x: 504, y: 151 },
  { x: 511, y: 160 }, { x: 494, y: 178 }, { x: 454, y: 197 },
  { x: 420, y: 220 }, { x: 399, y: 226 }, { x: 361, y: 234 },
  { x: 321, y: 248 }, { x: 279, y: 258 }, { x: 216, y: 263 },
  { x: 183, y: 262 }, { x: 180, y: 272 }, { x: 210, y: 293 },
];

export function feetAt(center: Point): Point {
  return { x: center.x, y: center.y + FOREST_EDGE.player.footOffsetY };
}

export function worldDepth(groundY: number): number {
  return 10 + groundY / 10;
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function isForestEdgeCenterWalkable(center: Point, gateOpen: boolean): boolean {
  const feet = feetAt(center);
  const { world, player } = FOREST_EDGE;
  const body: Rect = { x: feet.x - player.body.width / 2, y: feet.y - player.body.height / 2, width: player.body.width, height: player.body.height };
  if (center.x < world.left + 12 || center.x > world.right - 12 || feet.y - 5 < world.top || feet.y + 5 > world.bottom) return false;
  if (FOREST_EDGE_SOLIDS.some((solid) => overlaps(body, solid))) return false;
  if (!gateOpen && overlaps(body, FOREST_EDGE.objects.gate.threshold)) return false;
  return true;
}

export function resolveForestEdgeSpawn(saved: Point | undefined, flags: { tabletRead?: boolean; footprintsFound?: boolean; gateOpen?: boolean }): Point {
  const gateOpen = flags.gateOpen === true;
  if (saved && isForestEdgeCenterWalkable(saved, gateOpen)) return saved;
  const fallback = flags.gateOpen ? FOREST_EDGE.checkpoints.gate
    : flags.footprintsFound ? FOREST_EDGE.checkpoints.ring
      : flags.tabletRead ? FOREST_EDGE.checkpoints.tablet : FOREST_EDGE.checkpoints.start;
  if (isForestEdgeCenterWalkable(fallback, gateOpen)) return fallback;
  return FOREST_EDGE.checkpoints.start;
}

export function canChargeForestEdgeReceiver(feet: Point, lampOn: boolean, tabletRead: boolean, footprintsFound: boolean, gateOpen: boolean): boolean {
  return !gateOpen && lampOn && tabletRead && footprintsFound
    && Math.hypot(feet.x - FOREST_EDGE.objects.ring.ground.x, feet.y - FOREST_EDGE.objects.ring.ground.y) <= FOREST_EDGE.objects.ring.radius;
}

export function canUseForestEdgePulse(tabletRead: boolean): boolean {
  return tabletRead;
}
