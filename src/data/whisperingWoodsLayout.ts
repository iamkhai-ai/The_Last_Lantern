export type RuneId = 'moon' | 'leaf' | 'star';
export type WoodsPoint = Readonly<{ x: number; y: number }>;
export type WoodsRect = Readonly<{ x: number; y: number; width: number; height: number }>;
export type RuneProgress = { sequence: number; activated: Record<RuneId, boolean>; open: boolean };
export type RuneFlags = { sequence: number; activated: Partial<Record<RuneId, boolean>>; open: boolean };
export type RuneActivation = { kind: 'activated' | 'repeat' | 'reset' | 'wrong' | 'open'; state: RuneProgress };

export const RUNE_ORDER: readonly RuneId[] = ['moon', 'leaf', 'star'];
const point = (x: number, y: number): WoodsPoint => Object.freeze({ x, y });
const rect = (x: number, y: number, width: number, height: number): WoodsRect => Object.freeze({ x, y, width, height });
const stands = Object.freeze({ spawn: point(280, 286), practice: point(120, 282), moon: point(180, 254), leaf: point(320, 180), star: point(450, 254), poem: point(402, 167), exit: point(510, 181) });

export const WHISPERING_WOODS = Object.freeze({
  size: point(640, 360),
  player: Object.freeze({ footOffsetY: 19, body: Object.freeze({ width: 14, height: 6, offsetX: 11, offsetY: 37 }) }),
  anchors: Object.freeze({ practice: point(120, 276), moon: point(180, 248), leaf: point(320, 174), star: point(450, 248), poem: point(402, 161), gate: point(510, 190) }),
  stands,
  footprints: Object.freeze({ practice: rect(107, 264, 26, 12), moon: rect(167, 236, 26, 12), leaf: rect(307, 162, 26, 12), star: rect(437, 236, 26, 12), poem: rect(385, 150, 34, 11) }),
  gate: Object.freeze({ backing: rect(446, 108, 128, 48), leftPost: rect(456, 164, 20, 26), rightPost: rect(544, 164, 20, 26), threshold: rect(476, 164, 68, 14), promptY: 94, openStopY: 140 }),
  trees: Object.freeze([[48,142],[125,112],[240,106],[350,108],[600,130],[48,230],[600,240],[65,310],[568,310]].map(([x,y], i) => Object.freeze({ id:`tree-${i}`, x, y, footprint:rect(x-9,y-14,18,14) }))),
  rocks: Object.freeze([[100,195],[552,292]].map(([x,y], i) => Object.freeze({ id:`rock-${i}`, x, y, footprint:rect(x-13,y-14,26,14) }))),
  route: Object.freeze([point(280,286),point(230,286),point(180,258),point(250,220),point(320,184),point(385,215),point(450,258),point(402,174),point(510,181)]),
  fireflyRoute: Object.freeze([point(180,248),point(320,174),point(450,248)]),
  checkpoints: stands,
});

export function feetAt(center: WoodsPoint): WoodsPoint { return point(center.x, center.y + WHISPERING_WOODS.player.footOffsetY); }
export function worldDepth(anchorY: number): number { return 10 + anchorY / 10; }

function overlaps(a: WoodsRect, b: WoodsRect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
function bodyRect(center: WoodsPoint): WoodsRect {
  const b = WHISPERING_WOODS.player.body;
  return rect(center.x + b.offsetX - 18, center.y + b.offsetY - 21, b.width, b.height);
}
export function isWoodsCenterWalkable(center: WoodsPoint, gateOpen = false): boolean {
  const f = feetAt(center);
  if (center.x < 12 || center.x > 628 || f.y < 96 || f.y > 310) return false;
  const body = bodyRect(center);
  const solids = [...Object.values(WHISPERING_WOODS.footprints), ...WHISPERING_WOODS.trees.map((x) => x.footprint), ...WHISPERING_WOODS.rocks.map((x) => x.footprint), WHISPERING_WOODS.gate.leftPost, WHISPERING_WOODS.gate.rightPost, WHISPERING_WOODS.gate.backing, ...(gateOpen ? [] : [WHISPERING_WOODS.gate.threshold])];
  return !solids.some((solid) => solid===WHISPERING_WOODS.gate.threshold
    ? body.x <= solid.x+solid.width && body.x+body.width >= solid.x && body.y <= solid.y+solid.height && body.y+body.height >= solid.y
    : overlaps(body, solid));
}
export function isWoodsPointSafe(center: WoodsPoint, gateOpen = false): boolean { return isWoodsCenterWalkable(center, gateOpen); }
export function resolveWoodsSpawn(saved: WoodsPoint | undefined, gateOpen: boolean): WoodsPoint {
  if (saved && isWoodsPointSafe(saved, gateOpen)) return point(saved.x, saved.y);
  const options = gateOpen ? [WHISPERING_WOODS.stands.spawn, WHISPERING_WOODS.stands.exit, WHISPERING_WOODS.stands.moon] : [WHISPERING_WOODS.stands.spawn, WHISPERING_WOODS.stands.practice, WHISPERING_WOODS.stands.moon, WHISPERING_WOODS.stands.leaf, WHISPERING_WOODS.stands.star, WHISPERING_WOODS.stands.poem];
  return options.filter((p) => isWoodsPointSafe(p, gateOpen)).sort((a,b) => saved ? Math.hypot(a.x-saved.x,a.y-saved.y)-Math.hypot(b.x-saved.x,b.y-saved.y) : 0)[0] ?? WHISPERING_WOODS.stands.spawn;
}
export function normalizeRuneProgress(input: RuneFlags): RuneProgress {
  const raw = input.activated ?? {};
  const allActivated = RUNE_ORDER.every((id) => raw[id] === true);
  const solvedLegacy = input.open || input.sequence >= 3 || allActivated;
  let prefix = 0;
  while (prefix < 3 && raw[RUNE_ORDER[prefix]] === true) prefix += 1;
  const sequence = solvedLegacy ? 3 : Math.min(prefix, Math.max(0, Math.trunc(input.sequence || prefix)));
  const activated = Object.fromEntries(RUNE_ORDER.map((id, i) => [id, sequence === 3 || i < sequence])) as Record<RuneId, boolean>;
  return { sequence, activated, open: input.open || solvedLegacy };
}
export function canActivateWoodsRune(liveReveal: boolean, alreadyActivated: boolean): boolean { return liveReveal || alreadyActivated; }
export function activateWoodsRune(state: RuneProgress, id: RuneId): RuneActivation {
  if (state.open) return { kind: 'open', state };
  if (state.activated[id]) return { kind: 'repeat', state };
  if (RUNE_ORDER[state.sequence] !== id) {
    return { kind: state.sequence > 0 ? 'reset' : 'wrong', state: { sequence: 0, activated: { moon:false,leaf:false,star:false }, open:false } };
  }
  const sequence = state.sequence + 1;
  const next = { sequence, activated: { ...state.activated, [id]: true }, open: sequence === 3 };
  return { kind: 'activated', state: next };
}
