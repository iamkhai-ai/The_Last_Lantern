export type RuneId = 'moon' | 'leaf' | 'star';
export type WoodsPoint = Readonly<{ x: number; y: number }>;
export type WoodsRect = Readonly<{ x: number; y: number; width: number; height: number }>;
export type RuneProgress = { sequence: number; activated: Record<RuneId, boolean>; open: boolean };
export type RuneFlags = { sequence: number; activated: Partial<Record<RuneId, boolean>>; open: boolean };
export type RuneActivation = { kind: 'activated' | 'repeat' | 'reset' | 'wrong' | 'open'; state: RuneProgress };
export type WoodsTutorialStage = 'exit' | 'sequence' | 'poem' | 'observe';
export type WoodsTutorialState = Readonly<{ open: boolean; sequence: number; poemRead: boolean }>;

export const RUNE_ORDER: readonly RuneId[] = ['moon', 'leaf', 'star'];
const point = (x: number, y: number): WoodsPoint => Object.freeze({ x, y });
const rect = (x: number, y: number, width: number, height: number): WoodsRect => Object.freeze({ x, y, width, height });
const stands = Object.freeze({ spawn: point(136, 286), poem: point(136, 276), moon: point(232, 248), leaf: point(326, 180), star: point(408, 272), exit: point(510, 181) });
export const WOODS_RUNE_ART = Object.freeze({ sourceWidth: 40, sourceHeight: 52, width: 60, height: 78 });
export const WOODS_POEM_ART = Object.freeze({ sourceWidth: 48, sourceHeight: 40, width: 96, height: 80 });
export const WOODS_RUNE_BODY_FIT = Object.freeze({ height: 39, centerX: 20.5, bottomY: 44, alphaThreshold: 96 });
export const WOODS_RUNE_PROMPT_OFFSET_Y = -92;
export const WOODS_POEM_PROMPT_OFFSET_Y = -104;

export function fitWoodsRuneArt(bounds?: Pick<WoodsRect, 'x'|'y'|'width'|'height'> | null): Readonly<{scale:number;offsetX:number;offsetY:number}> {
  const valid = bounds && Number.isFinite(bounds.x) && Number.isFinite(bounds.y)
    && Number.isFinite(bounds.width) && Number.isFinite(bounds.height) && bounds.width > 0 && bounds.height > 0;
  const body = valid ? bounds! : { x:0, y:0, width:WOODS_RUNE_ART.sourceWidth, height:WOODS_RUNE_ART.sourceHeight };
  const scale = WOODS_RUNE_BODY_FIT.height / body.height;
  return Object.freeze({
    scale,
    offsetX: WOODS_RUNE_BODY_FIT.centerX - (body.x + body.width / 2) * scale,
    offsetY: WOODS_RUNE_BODY_FIT.bottomY - (body.y + body.height) * scale,
  });
}

export const WHISPERING_WOODS = Object.freeze({
  size: point(640, 360),
  player: Object.freeze({ footOffsetY: 19, body: Object.freeze({ width: 14, height: 6, offsetX: 11, offsetY: 37 }) }),
  anchors: Object.freeze({ poem: point(136, 270), moon: point(232, 242), leaf: point(326, 174), star: point(408, 266), gate: point(510, 190) }),
  stands,
  // Solid bases, not just the contact line: the south edge stays on each anchor y (stands, prompts and the
  // southern collision stop are unchanged), and each stone is thickened north over its visible body and
  // widened to its visible base. Measured art (alpha >= WOODS_RUNE_BODY_FIT.alphaThreshold): runes 25x39
  // of a 40x52 canvas (displayed 1.5x, so 37.5x58.5 on screen, base 30-34 wide); poem 27x20 of 48x40
  // (displayed 2x). Depth 24 is 55-65% of the 39px fitted rune body (WOODS_RUNE_BODY_FIT.height) and of
  // the poem's 40px on-screen body; width 34 matches the 33-34.5px visible rune base.
  footprints: Object.freeze({ poem: rect(102, 246, 68, 24), moon: rect(215, 218, 34, 24), leaf: rect(309, 150, 34, 24), star: rect(391, 242, 34, 24) }),
  gate: Object.freeze({ backing: rect(446, 96, 128, 60), leftPost: rect(456, 156, 20, 34), rightPost: rect(544, 156, 20, 34), threshold: rect(476, 156, 68, 22), promptY: 94, openStopY: 140, closedStopY: 162 }),
  trees: Object.freeze([[48,142],[125,112],[240,106],[350,108],[600,130],[48,230],[600,240],[65,310],[568,310]].map(([x,y], i) => Object.freeze({ id:`tree-${i}`, x, y, footprint:rect(x-9,y-14,18,14) }))),
  rocks: Object.freeze([[100,195],[552,292]].map(([x,y], i) => Object.freeze({ id:`rock-${i}`, x, y, footprint:rect(x-13,y-14,26,14) }))),
  groundPaths: Object.freeze([
    Object.freeze([point(100,360),point(172,360),point(166,330),point(164,300),point(164,270),point(162,250),point(110,250),point(108,270),point(108,300),point(106,330)]),
    Object.freeze([point(130,243),point(178,232),point(226,221),point(238,275),point(190,286),point(142,297)]),
    Object.freeze([point(208,222),point(215,188),point(240,156),point(274,134),point(311,120),point(348,126),point(382,144),point(411,175),point(430,211),point(437,244),point(428,276),point(405,304),point(375,321),point(340,328),point(302,324),point(269,310),point(237,287),point(219,256)]),
    Object.freeze([point(390,244),point(410,244),point(426,252),point(449,255),point(472,256),point(491,258),point(500,236),point(482,212),point(482,170),point(538,170),point(538,236),point(524,270),point(503,294),point(477,316),point(444,316),point(414,295),point(392,278)]),
  ]),
  route: Object.freeze([point(136,286),point(136,276),point(232,248),point(326,180),point(408,272),point(510,286),point(510,181)]),
  fireflyRoute: Object.freeze([point(232,242),point(326,174),point(408,266)]),
  checkpoints: stands,
});

export function feetAt(center: WoodsPoint): WoodsPoint { return point(center.x, center.y + WHISPERING_WOODS.player.footOffsetY); }
export function worldDepth(anchorY: number): number { return 10 + anchorY / 10; }
export function getWoodsTutorialStage(state: WoodsTutorialState): WoodsTutorialStage {
  if (state.open || state.sequence >= 3) return 'exit';
  if (state.sequence > 0) return 'sequence';
  if (!state.poemRead) return 'poem';
  return 'observe';
}

function overlaps(a: WoodsRect, b: WoodsRect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
/** The actor's 14x6 foot body in world space (the sprite is 36x42 with its centre on the actor point). */
export function woodsFootBody(center: WoodsPoint): WoodsRect {
  const b = WHISPERING_WOODS.player.body;
  return rect(center.x + b.offsetX - 18, center.y + b.offsetY - 21, b.width, b.height);
}
function bodyRect(center: WoodsPoint): WoodsRect { return woodsFootBody(center); }
export function isWoodsCenterWalkable(center: WoodsPoint, gateOpen = false): boolean {
  const f = feetAt(center);
  const body = bodyRect(center);
  if (center.x < 12 || center.x > 628 || f.y < 96 || f.y > 310 || body.y < 96 || body.y + body.height > 310) return false;
  const solids = [...Object.values(WHISPERING_WOODS.footprints), ...WHISPERING_WOODS.trees.map((x) => x.footprint), ...WHISPERING_WOODS.rocks.map((x) => x.footprint), WHISPERING_WOODS.gate.leftPost, WHISPERING_WOODS.gate.rightPost, WHISPERING_WOODS.gate.backing, ...(gateOpen ? [] : [WHISPERING_WOODS.gate.threshold])];
  return !solids.some((solid) => overlaps(body, solid));
}
export function isWoodsPointSafe(center: WoodsPoint, gateOpen = false): boolean { return isWoodsCenterWalkable(center, gateOpen); }

export type WoodsStoneId = 'poem' | 'moon' | 'leaf' | 'star';
/** How far the foot body may sit outside a stone footprint and still answer E (~10-12px). */
export const WOODS_STONE_REACH_PADDING = 11;
/** The authored south approach each stone keeps; the campaign spawns 10px south of the poem stand. */
export const WOODS_STONE_APPROACH_RADIUS = 24;

function rectGap(a: WoodsRect, b: WoodsRect): number {
  const dx = Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width), 0);
  const dy = Math.max(a.y - (b.y + b.height), b.y - (a.y + a.height), 0);
  return Math.hypot(dx, dy);
}

/**
 * RULE_GAMES.md §3 exception (decision 2026-10-20): the Level 02 poem and rune stones answer the E
 * prompt from all four sides. A stone is in reach while the actor's 14x6 foot body — the same rect
 * `isWoodsCenterWalkable` collides with — is within `WOODS_STONE_REACH_PADDING` of its footprint, on any
 * side. Each stone also keeps its authored south approach (`WOODS_STONE_APPROACH_RADIUS` around its
 * stand) because that is where the level places the player: the campaign spawn (136,286) is 10px south
 * of the poem stand, and the rune stands are how Level 02 is played. The circles stay 48px+ apart and the
 * footprints leave 45px+ of clear floor between stones, so no stone answers from another one's stand.
 */
export function isWoodsStoneInReach(id: WoodsStoneId, player: WoodsPoint): boolean {
  if (rectGap(woodsFootBody(player), WHISPERING_WOODS.footprints[id]) <= WOODS_STONE_REACH_PADDING) return true;
  const stand = WHISPERING_WOODS.stands[id];
  return Math.hypot(player.x - stand.x, player.y - stand.y) <= WOODS_STONE_APPROACH_RADIUS;
}
export function resolveWoodsSpawn(saved: WoodsPoint | undefined, gateOpen: boolean): WoodsPoint {
  const threshold=WHISPERING_WOODS.gate.threshold;
  const behindLockedGate=!gateOpen&&saved&&saved.x>=threshold.x-8&&saved.x<=threshold.x+threshold.width+8&&saved.y<WHISPERING_WOODS.gate.closedStopY;
  if (saved && !behindLockedGate && isWoodsPointSafe(saved, gateOpen)) return point(saved.x, saved.y);
  const options = gateOpen ? [WHISPERING_WOODS.stands.spawn, WHISPERING_WOODS.stands.exit, WHISPERING_WOODS.stands.moon] : [WHISPERING_WOODS.stands.spawn, WHISPERING_WOODS.stands.poem, WHISPERING_WOODS.stands.moon, WHISPERING_WOODS.stands.leaf, WHISPERING_WOODS.stands.star];
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
