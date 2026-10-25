import { rectsOverlap } from '../../core/geometry';
import type { Rect } from '../../core/geometry';
import type { HintLadder } from '../../core/hints';
import type { HudText } from '../../core/level';
import { isDoorOpen } from '../../core/latch';
import { stepMod } from '../../core/rotary';
import { WHISPERING_WOODS } from './whisperingWoodsLayout';

/** A crank: X turns Moon and Leaf, Y turns Leaf and Star, Z turns Star and Water. */
export type Crank = 'x' | 'y' | 'z';
/** A stele ring. */
export type Ring = 'moon' | 'leaf' | 'star' | 'water';
/** A ring direction: 0 = N, 1 = SE, 2 = SW. */
export type RingDir = 0 | 1 | 2;

/** The rings each crank moves together (its shared axle). */
export const CRANK_RINGS: Readonly<Record<Crank, readonly [Ring, Ring]>> = {
  x: ['moon', 'leaf'],
  y: ['leaf', 'star'],
  z: ['star', 'water'],
};

/** The direction the receiving mouth of each ring requires (the author's target (2,0,0,2)). */
export const TARGET_RINGS: Readonly<Record<Ring, RingDir>> = { moon: 2, leaf: 0, star: 0, water: 2 };

/**
 * The crank counts that give TARGET_RINGS. Derived by hand: moon = x = 2, water = z = 2, leaf = x + y = 0 gives y = 1,
 * and star = y + z = 0 agrees. Tests check it.
 */
export const GOAL_CRANKS: Readonly<Record<Crank, number>> = { x: 2, y: 1, z: 2 };

/** The state the save keeps: the three crank counters modulo 3 (the source of truth) and the gate catch. */
export interface WhisperingWoodsState {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** The catch drops by itself once the gate is fully open, and holds it open after that. */
  readonly gateCatch: boolean;
}

/** The derived view: ring directions from the cranks, which rings match, and whether the gate is open. */
export interface WhisperingWoodsView {
  readonly rings: Readonly<Record<Ring, RingDir>>;
  readonly matched: Readonly<Record<Ring, boolean>>;
  readonly matchedCount: number;
  /** Every ring faces its mouth now. */
  readonly gateLive: boolean;
  /** Live or held by the catch. */
  readonly gateOpen: boolean;
}

/** Direction words for the mouth journal texts. */
export const DIR_WORDS: Readonly<Record<RingDir, string>> = { 0: 'Bắc', 1: 'Đông Nam', 2: 'Tây Nam' };

/** Journal texts for the Pulse marks and the mouth marks, keyed by mark id. */
export const WHISPERING_WOODS_JOURNAL_TEXT: Record<string, string> = {
  'axle-x': 'Trục X nối bia Trăng với bia Lá, đi bên dưới rêu.',
  'axle-y': 'Trục Y nối bia Lá với bia Sao. Hai vành giữa dùng chung trục.',
  'axle-z': 'Trục Z nối bia Sao với bia Nước.',
  'crank-x': 'Dấu khớp trên tay X: tay này quay trục X.',
  'crank-y': 'Dấu khớp trên tay Y: tay này quay trục Y.',
  'crank-z': 'Dấu khớp trên tay Z: tay này quay trục Z.',
  'mouth-moon': `Miệng nhận của bia Trăng: đom đóm đậu theo hướng ${DIR_WORDS[TARGET_RINGS.moon]}.`,
  'mouth-leaf': `Miệng nhận của bia Lá: đom đóm đậu theo hướng ${DIR_WORDS[TARGET_RINGS.leaf]}.`,
  'mouth-star': `Miệng nhận của bia Sao: đom đóm đậu theo hướng ${DIR_WORDS[TARGET_RINGS.star]}.`,
  'mouth-water': `Miệng nhận của bia Nước: đom đóm đậu theo hướng ${DIR_WORDS[TARGET_RINGS.water]}.`,
};

/** The state at the start: all cranks on their first notch, the gate closed. */
export function defaultWhisperingWoodsState(): WhisperingWoodsState {
  return { x: 0, y: 0, z: 0, gateCatch: false };
}

/** The ring directions the cranks give now. X and Z are the ends; Y sits between the two middle rings. */
export function ringsOf(s: Pick<WhisperingWoodsState, 'x' | 'y' | 'z'>): Record<Ring, RingDir> {
  return {
    moon: s.x as RingDir,
    leaf: stepMod(s.x, s.y, 3) as RingDir,
    star: stepMod(s.y, s.z, 3) as RingDir,
    water: s.z as RingDir,
  };
}

/** The view derived from the saved state. Rings are never stored; they are computed from the cranks every time. */
export function deriveWhisperingWoods(s: WhisperingWoodsState): WhisperingWoodsView {
  const rings = ringsOf(s);
  const matched = {
    moon: rings.moon === TARGET_RINGS.moon,
    leaf: rings.leaf === TARGET_RINGS.leaf,
    star: rings.star === TARGET_RINGS.star,
    water: rings.water === TARGET_RINGS.water,
  };
  const matchedCount = Object.values(matched).filter(Boolean).length;
  const gateLive = matchedCount === 4;
  return { rings, matched, matchedCount, gateLive, gateOpen: isDoorOpen(gateLive, s.gateCatch) };
}

const RING_ORDER: readonly Ring[] = ['moon', 'leaf', 'star', 'water'];

/**
 * The rings that match in `after` but did not match in `before`, in ring order. With no earlier view (the first draw
 * of a build) nothing is new: a ring already matched when the level opens does not flash again.
 */
export function newlyMatchedRings(before: WhisperingWoodsView | null, after: WhisperingWoodsView): readonly Ring[] {
  if (!before) return [];
  return RING_ORDER.filter((ring) => after.matched[ring] && !before.matched[ring]);
}

/** The catch engages as soon as the gate is live. Turning cranks afterwards never releases it. */
export function settleCatch(s: WhisperingWoodsState): WhisperingWoodsState {
  if (s.gateCatch || !deriveWhisperingWoods(s).gateLive) return s;
  return { ...s, gateCatch: true };
}

/** Reads a saved state field by field: a crank counter must be an integer 0..2, otherwise it falls back to 0. Never throws. */
export function parseWhisperingWoodsState(raw: unknown): WhisperingWoodsState {
  const defaults = defaultWhisperingWoodsState();
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return defaults;
  const r = raw as Record<string, unknown>;
  const counter = (v: unknown): number => (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 2 ? (v as number) : 0);
  const parsed: WhisperingWoodsState = {
    x: counter(r.x),
    y: counter(r.y),
    z: counter(r.z),
    gateCatch: typeof r.gateCatch === 'boolean' ? r.gateCatch : defaults.gateCatch,
  };
  return settleCatch(parsed);
}

/** The result of one crank turn: the new state and the two rings that moved together. Turning always works. */
export interface TurnResult {
  readonly state: WhisperingWoodsState;
  readonly moved: readonly [Ring, Ring];
}

/** E on a crank: advances its counter by one notch (mod 3). Wrong slots stay open; nothing resets. */
export function turnCrank(s: WhisperingWoodsState, crank: Crank): TurnResult {
  const next: WhisperingWoodsState = {
    ...s,
    x: crank === 'x' ? stepMod(s.x, 1, 3) : s.x,
    y: crank === 'y' ? stepMod(s.y, 1, 3) : s.y,
    z: crank === 'z' ? stepMod(s.z, 1, 3) : s.z,
  };
  return { state: settleCatch(next), moved: CRANK_RINGS[crank] };
}

/** Turns still needed on each crank to reach the goal, each counted in one direction only (a turn is +1 mod 3). */
export function turnsNeeded(s: WhisperingWoodsState): Record<Crank, number> {
  return {
    x: stepMod(0, GOAL_CRANKS.x - s.x, 3),
    y: stepMod(0, GOAL_CRANKS.y - s.y, 3),
    z: stepMod(0, GOAL_CRANKS.z - s.z, 3),
  };
}

/** The HUD: the doc's objective line, and a status with the count of matched slots and the gate state. */
export function whisperingWoodsHud(
  v: WhisperingWoodsView,
  translate: (text: string) => string = (text) => text,
): HudText {
  const t = translate;
  const gate = t(v.gateOpen ? 'mở' : 'đóng');
  const latched = v.gateOpen && !v.gateLive ? t(', chốt đã gài') : '';
  return {
    objective: t('Hiệu chỉnh lại cụm dẫn đường'),
    status: `${t('Vành khớp')}: ${v.matchedCount}/4 · ${t('Cổng')}: ${gate}${latched}`,
  };
}

/**
 * The hint ladder for the current state, or null once the gate is live. Levels one and two are the doc's lines;
 * level three counts the crank turns still needed from the current counters, not from the start state.
 */
export function whisperingWoodsHint(s: WhisperingWoodsState): HintLadder | null {
  if (deriveWhisperingWoods(s).gateLive) return null;
  const need = turnsNeeded(s);
  const parts: string[] = [];
  if (need.x > 0) parts.push(`tay X ${need.x} lần`);
  if (need.y > 0) parts.push(`tay Y ${need.y} lần`);
  if (need.z > 0) parts.push(`tay Z ${need.z} lần`);
  const third = `Còn lại: ${parts.join(', ')}. Mỗi lần quay đổi hai bia cùng lúc.`;
  return {
    key: `whispering-woods:${s.x}${s.y}${s.z}:${s.gateCatch ? 1 : 0}`,
    steps: [
      'Các bia ở hai đầu và hai bia ở giữa nối với cùng số trục hay khác nhau? Lùi khỏi vòng sáng hoặc tắt F để thấy hướng của miệng nhận.',
      'Chỉnh hai đầu bằng X và Z; tay Y có thể đổi hai bia giữa mà không đụng tới hai đầu.',
      third,
    ],
  };
}

/** The gate leaf is a light blocker and a solid while the gate is closed. */
export function whisperingWoodsBlockers(v: WhisperingWoodsView): Rect[] {
  const blockers: Rect[] = [...WHISPERING_WOODS.walls];
  if (!v.gateOpen) blockers.push(WHISPERING_WOODS.gate);
  return blockers;
}

/** Every solid of the grove in this view: walls, steles, cranks and the closed gate. */
export function whisperingWoodsSolids(v: WhisperingWoodsView): Rect[] {
  const { steles, cranks } = WHISPERING_WOODS;
  const solids: Rect[] = [
    ...WHISPERING_WOODS.walls,
    steles.moon,
    steles.leaf,
    steles.star,
    steles.water,
    cranks.x,
    cranks.y,
    cranks.z,
  ];
  if (!v.gateOpen) solids.push(WHISPERING_WOODS.gate);
  return solids;
}

/** Whether a foot overlaps the exit zone. The exit itself checks the gate; this only checks the place. */
export function inExitZone(foot: Rect): boolean {
  return rectsOverlap(foot, WHISPERING_WOODS.exitZone);
}
