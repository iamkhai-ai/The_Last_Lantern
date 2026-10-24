import { rectCenter } from '../../core/geometry';
import type { Rect } from '../../core/geometry';
import type { HintLadder } from '../../core/hints';
import type { HudText } from '../../core/level';
import type { LightMark } from '../../core/light';
import { stepMod } from '../../core/rotary';
import {
  LIBRARY,
  PRACTICE_DARK_ID,
  PRACTICE_LIT_ID,
  PULSE_FEED_ID,
  PULSE_RETURN_ID,
  PULSE_SHAFT_ID,
  handRect,
  tabletRect,
} from './libraryRootsLayout';

/** The four tablets, in their correct ring order from the start mark. */
export const TABLET_IDS = ['bird', 'leaf', 'boat', 'seed'] as const;
export type TabletId = (typeof TABLET_IDS)[number];

export const TABLET_NAME: Readonly<Record<TabletId, string>> = { bird: 'Chim', leaf: 'Lá', boat: 'Thuyền', seed: 'Hạt' };

/** The lit layer: where the sun or moon sits. */
export type LitBody = 'sunLow' | 'sunHigh' | 'moonHigh';
/** The dark layer: the direction of motion. */
export type DarkSign = 'arrowUp' | 'arc' | 'arrowDown';

export const TABLET_LIT: Readonly<Record<TabletId, LitBody>> = {
  bird: 'sunLow',
  leaf: 'sunHigh',
  boat: 'sunLow',
  seed: 'moonHigh',
};
export const TABLET_DARK: Readonly<Record<TabletId, DarkSign>> = {
  bird: 'arrowUp',
  leaf: 'arc',
  boat: 'arrowDown',
  seed: 'arc',
};

/** The sockets' correct order: north (start mark), east, south, west. */
export const CORRECT_RING: readonly TabletId[] = ['bird', 'leaf', 'boat', 'seed'];
export const SOCKET_NAMES: readonly string[] = ['Hốc Bắc', 'Hốc Đông', 'Hốc Nam', 'Hốc Tây'];

/** A two-way valve, or one not yet set ("chưa cam kết"). */
export type Valve = 'unset' | 'feed' | 'return';
/** The model has one stage per socket. */
export const STAGE_COUNT = 4;
/** Reference solution: return, feed, return, return (hồi–cấp–hồi–hồi). */
export const SOLUTION_VALVES: readonly Valve[] = ['return', 'feed', 'return', 'return'];

export const BANK_SHORT = 'kho Bến không được nạp';
export const ROOT_SHORT = 'Rễ thiếu hồi phục';
export const HUD_OBJECTIVE = 'Khôi phục và thử một chu kỳ cấp–hồi';

/** A tablet's place: a rack holder, a socket, or Nhinh's hand (null). */
export type Slot = TabletId | null;

/** What the level keeps in the save. Every tablet is in exactly one place: a rack holder, a socket, or the hand. */
export interface LibraryState {
  readonly rack: readonly Slot[];
  readonly sockets: readonly Slot[];
  readonly held: TabletId | null;
  /** The record-room door's latch: once the ring has been correct, it keeps the door open. */
  readonly doorLatched: boolean;
  readonly valves: readonly Valve[];
  /** The stage the wheel shows, 0..3. */
  readonly wheel: number;
  /** The confirm lever has locked the model. Final; nothing in the model changes after it. */
  readonly modelLocked: boolean;
  readonly crystalTaken: boolean;
}

/** A holder in the room: a rack hook or a socket. */
export interface Holder {
  readonly kind: 'rack' | 'socket';
  readonly index: number;
}

/** The result of one action. `text` is the toast; `changed` says whether the state moved and must be saved. */
export interface StepOutcome {
  readonly state: LibraryState;
  readonly changed: boolean;
  readonly text: string;
}

/** The start: four tablets on the rack in ring order, sockets empty, valves unset, the model unlocked. */
export function defaultLibraryState(): LibraryState {
  return {
    rack: [...CORRECT_RING],
    sockets: [null, null, null, null],
    held: null,
    doorLatched: false,
    valves: ['unset', 'unset', 'unset', 'unset'],
    wheel: 0,
    modelLocked: false,
    crystalTaken: false,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTablet(value: unknown): value is TabletId {
  return typeof value === 'string' && (TABLET_IDS as readonly string[]).includes(value);
}

function isValve(value: unknown): value is Valve {
  return value === 'unset' || value === 'feed' || value === 'return';
}

/** Every tablet appears exactly once across the rack, the sockets and the hand. */
function placementIsWhole(rack: readonly Slot[], sockets: readonly Slot[], held: Slot): boolean {
  const seen = [...rack, ...sockets, held].filter((t): t is TabletId => t !== null);
  return seen.length === TABLET_IDS.length && TABLET_IDS.every((t) => seen.filter((x) => x === t).length === 1);
}

/** Reads a save; anything broken falls back to the default field by field and never throws. */
export function parseLibraryState(raw: unknown): LibraryState {
  const d = defaultLibraryState();
  if (!isRecord(raw)) return d;

  let rack: Slot[] = [...d.rack];
  let sockets: Slot[] = [...d.sockets];
  let held: Slot = d.held;
  const rawRack = raw.rack;
  const rawSockets = raw.sockets;
  const rawHeld = raw.held;
  const shapeOk = Array.isArray(rawRack) && rawRack.length === 4
    && Array.isArray(rawSockets) && rawSockets.length === 4
    && rawRack.every((t) => t === null || isTablet(t))
    && rawSockets.every((t) => t === null || isTablet(t))
    && (rawHeld === null || isTablet(rawHeld));
  if (shapeOk) {
    const candidate = {
      rack: rawRack as Slot[],
      sockets: rawSockets as Slot[],
      held: rawHeld as Slot,
    };
    if (placementIsWhole(candidate.rack, candidate.sockets, candidate.held)) {
      rack = candidate.rack;
      sockets = candidate.sockets;
      held = candidate.held;
    }
  }

  const valves: Valve[] = Array.isArray(raw.valves) && raw.valves.length === 4
    ? (raw.valves as unknown[]).map((v) => (isValve(v) ? v : 'unset'))
    : [...d.valves];
  const wheel = Number.isInteger(raw.wheel) && (raw.wheel as number) >= 0 && (raw.wheel as number) < STAGE_COUNT
    ? (raw.wheel as number)
    : 0;
  const modelLocked = typeof raw.modelLocked === 'boolean' ? raw.modelLocked : false;
  const crystalTaken = modelLocked && typeof raw.crystalTaken === 'boolean' ? raw.crystalTaken : false;
  const latched = typeof raw.doorLatched === 'boolean' ? raw.doorLatched : false;

  const base = { rack, sockets, held, valves, wheel, modelLocked, crystalTaken };
  return withLatch({ ...base, doorLatched: latched });
}

/** The ring's faults: socket indices that do not hold the tablet the ring wants there. An empty socket is a fault. */
export function ringFaults(sockets: readonly Slot[]): number[] {
  const faults: number[] = [];
  CORRECT_RING.forEach((tablet, i) => {
    if (sockets[i] !== tablet) faults.push(i);
  });
  return faults;
}

export function ringCorrect(sockets: readonly Slot[]): boolean {
  return ringFaults(sockets).length === 0;
}

/** Engages the latch once the ring is correct. Never releases it. */
function withLatch(s: LibraryState): LibraryState {
  if (s.doorLatched || !ringCorrect(s.sockets)) return s;
  return { ...s, doorLatched: true };
}

/** The record-room door is open while the ring is correct now, or while its latch holds it. */
export function doorOpen(s: LibraryState): boolean {
  return s.doorLatched || ringCorrect(s.sockets);
}

/** Result of the well's run test: the sockets that are wrong, and the line Nhinh reads. */
export function ringReport(sockets: readonly Slot[]): { faults: number[]; text: string } {
  const faults = ringFaults(sockets);
  if (faults.length === 0) return { faults, text: 'Chu kỳ chạy liền; cửa hồ sơ mở.' };
  return { faults, text: `Chu kỳ đứt ở: ${faults.map((i) => SOCKET_NAMES[i]).join(', ')}.` };
}

/** The tablet at a holder, or null. */
function slotOf(s: LibraryState, h: Holder): Slot {
  return h.kind === 'rack' ? s.rack[h.index] : s.sockets[h.index];
}

/** Writes a holder's content and returns the new state. */
function withSlot(s: LibraryState, h: Holder, tablet: Slot, held: TabletId | null): LibraryState {
  const next = h.kind === 'rack'
    ? { ...s, rack: s.rack.map((t, i) => (i === h.index ? tablet : t)), held }
    : { ...s, sockets: s.sockets.map((t, i) => (i === h.index ? tablet : t)), held };
  return withLatch(next);
}

function holderName(h: Holder): string {
  return h.kind === 'rack' ? `giá ${h.index + 1}` : SOCKET_NAMES[h.index];
}

/**
 * E at a rack holder or a socket. Empty and carrying nothing: refused. Carrying nothing, holder full: take.
 * Carrying one, holder empty: place. Both: swap. Nhinh carries at most one tablet.
 */
export function holderAction(s: LibraryState, h: Holder): StepOutcome {
  const here = slotOf(s, h);
  if (s.held === null && here === null) {
    return { state: s, changed: false, text: `${holderName(h)} trống; không có phiến để lấy.` };
  }
  if (s.held === null && here !== null) {
    return { state: withSlot(s, h, null, here), changed: true, text: `Đã lấy phiến ${TABLET_NAME[here]}.` };
  }
  if (s.held !== null && here === null) {
    return { state: withSlot(s, h, s.held, null), changed: true, text: `Đã đặt phiến ${TABLET_NAME[s.held]}.` };
  }
  const held = s.held as TabletId;
  const out = here as TabletId;
  return { state: withSlot(s, h, held, out), changed: true, text: `Đã đổi ${TABLET_NAME[held]} lấy ${TABLET_NAME[out]}.` };
}

/** The body each stage shows: the lit layer of the tablet in that socket, or null for an empty socket. */
export function stageBodies(sockets: readonly Slot[]): (LitBody | null)[] {
  return sockets.map((t) => (t === null ? null : TABLET_LIT[t]));
}

/** What one valve sends in one stage: return feeds the root; feed reaches the bank only in full day. */
function receives(valve: Valve, body: LitBody | null): { root: boolean; bank: boolean } {
  return { root: valve === 'return', bank: valve === 'feed' && body === 'sunHigh' };
}

export interface PassReport {
  readonly bankFed: boolean;
  readonly rootRestored: boolean;
  /** The lines naming the short side(s); empty when the pass is sound. */
  readonly shortfalls: string[];
}

/**
 * One pass of the model over the four stages. The bank needs a feed in full day. The root needs a return in every
 * stage that is not full day, so it recovers at the head of the cycle and after sunset.
 */
export function passReport(valves: readonly Valve[], bodies: readonly (LitBody | null)[]): PassReport {
  const bankFed = valves.some((v, i) => receives(v, bodies[i] ?? null).bank);
  const rootRestored = bodies.every((b, i) => b === 'sunHigh' || valves[i] === 'return');
  const shortfalls: string[] = [];
  if (!bankFed) shortfalls.push(BANK_SHORT);
  if (!rootRestored) shortfalls.push(ROOT_SHORT);
  return { bankFed, rootRestored, shortfalls };
}

/** E at the wheel: one stage forward. Refused once the model is locked. */
export function stepWheel(s: LibraryState): StepOutcome {
  if (s.modelLocked) return { state: s, changed: false, text: 'Trục hãm đã giữ cấu hình; bánh xe không quay nữa.' };
  const wheel = stepMod(s.wheel, 1, STAGE_COUNT);
  return { state: { ...s, wheel }, changed: true, text: stageLine({ ...s, wheel }, wheel) };
}

/** E at a valve: feed and return switch; an unset valve goes to return first. Refused once locked. */
export function toggleValve(s: LibraryState, stage: number): StepOutcome {
  if (s.modelLocked) return { state: s, changed: false, text: 'Van đã giữ theo trục hãm.' };
  const current = s.valves[stage];
  const next: Valve = current === 'return' ? 'feed' : 'return';
  const valves = s.valves.map((v, i) => (i === stage ? next : v));
  return { state: { ...s, valves }, changed: true, text: `Chặng ${stage + 1}: nước ${next === 'return' ? 'về rễ' : 'về bến'}.` };
}

/**
 * The confirm lever. With the ring correct and the valves passing, the model locks and the crystal compartment opens.
 * Otherwise the lever runs one pass and names the short side; it locks nothing and counts nothing.
 */
export function pullLever(s: LibraryState): StepOutcome {
  if (s.modelLocked) return { state: s, changed: false, text: 'Trục hãm đã giữ cấu hình.' };
  const ring = ringCorrect(s.sockets);
  const report = passReport(s.valves, stageBodies(s.sockets));
  if (ring && report.shortfalls.length === 0) {
    return {
      state: { ...s, modelLocked: true, doorLatched: true },
      changed: true,
      text: 'Trục hãm giữ cấu hình; ngăn tinh thể Ký Ức mở.',
    };
  }
  const parts = [...report.shortfalls];
  if (!ring) parts.push('vòng lịch chưa khớp');
  return { state: s, changed: false, text: `Mô hình chạy một lượt: ${parts.join('; ')}.` };
}

/** E at the crystal compartment. Only after the lock; one crystal, once. */
export function takeCrystal(s: LibraryState): StepOutcome {
  if (!s.modelLocked) return { state: s, changed: false, text: 'Ngăn tinh thể còn khóa.' };
  if (s.crystalTaken) return { state: s, changed: false, text: 'Ngăn đã trống.' };
  return { state: { ...s, crystalTaken: true }, changed: true, text: 'Đã lấy tinh thể Ký Ức.' };
}

const BODY_TEXT: Readonly<Record<LitBody, string>> = {
  sunLow: 'mặt trời sát chân trời',
  sunHigh: 'mặt trời trên cao',
  moonHigh: 'mặt trăng trên cao',
};

/** One stage as a line: body, where the water goes, and which side takes it. */
export function stageLine(s: LibraryState, stage: number): string {
  const body = stageBodies(s.sockets)[stage];
  const valve = s.valves[stage];
  const water = valve === 'return' ? 'nước về rễ' : valve === 'feed' ? 'nước về bến' : 'van chưa đặt';
  const r = receives(valve, body);
  const takes = r.root ? 'rễ nhận' : r.bank ? 'bến nhận' : 'không bên nào nhận';
  const where = body === null ? 'chưa có phiến' : BODY_TEXT[body];
  return `Chặng ${stage + 1}: ${where} · ${water} · ${takes}`;
}

/** The HUD: the one objective line, and a status that names the current state (not the answer). */
export function libraryHud(s: LibraryState): HudText {
  let status: string;
  if (s.crystalTaken) {
    status = 'Đã lấy tinh thể Ký Ức';
  } else if (s.modelLocked) {
    status = 'Mô hình đã chốt · ngăn tinh thể mở';
  } else if (doorOpen(s)) {
    status = stageLine(s, s.wheel);
  } else {
    status = `Phiến cầm: ${s.held ? TABLET_NAME[s.held] : 'không'} · Cửa hồ sơ: đóng`;
  }
  return { objective: HUD_OBJECTIVE, status };
}

const RING_HINT: HintLadder = {
  key: 'library-roots:ring',
  steps: [
    'Hai phiến có cùng hình mặt trời gần chân trời nhưng kể hướng chuyển động nào?',
    'Thiên thể nằm ở lớp sáng, hướng chuyển động ở lớp tối; cần ghép cả hai.',
    'Từ mốc đầu, xếp Chim–Lá–Thuyền–Hạt.',
  ],
};

/** The hint ladder for the current state: the ring while it is wrong, the model after, nothing once locked. */
export function libraryHint(s: LibraryState): HintLadder | null {
  if (s.modelLocked) return null;
  if (!ringCorrect(s.sockets)) {
    const faults = ringFaults(s.sockets);
    const last = `Từ mốc đầu, xếp Chim–Lá–Thuyền–Hạt. Hốc còn sai: ${faults.map((i) => SOCKET_NAMES[i]).join(', ')}.`;
    return { key: RING_HINT.key, steps: [RING_HINT.steps[0], RING_HINT.steps[1], last] };
  }
  const wrong = s.valves.map((v, i) => (v === SOLUTION_VALVES[i] ? -1 : i)).filter((i) => i >= 0);
  const concrete = wrong.length === 0
    ? 'Các van đã đúng; dùng cần cạnh bánh xe để chạy và chốt.'
    : `Đặt các van lần lượt hồi–cấp–hồi–hồi. Chặng còn sai: ${wrong.map((i) => i + 1).join(', ')}.`;
  return {
    key: 'library-roots:model',
    steps: [
      'Hãy theo dõi mức của kho bến và tuyến Rễ khi bánh xe đi qua các chặng.',
      'Trong mô hình, rễ nhận phần đầu và cuối chu kỳ, bến nhận lúc ban ngày.',
      concrete,
    ],
  };
}

/** Every solid of the library for Nhinh's foot: walls, blocks, and the door leaf while it is closed. */
export function librarySolids(open: boolean): Rect[] {
  const solids: Rect[] = [
    ...LIBRARY.walls,
    ...LIBRARY.rack,
    ...LIBRARY.sockets,
    LIBRARY.well,
    LIBRARY.desk,
    LIBRARY.model,
    ...LIBRARY.valves,
    LIBRARY.wheel,
    LIBRARY.lever,
    LIBRARY.crystal,
  ];
  if (!open) solids.push(LIBRARY.door);
  return solids;
}

/** Light blockers: the walls, and the door leaf while it is closed. */
export function libraryBlockers(open: boolean): Rect[] {
  return open ? [...LIBRARY.walls] : [...LIBRARY.walls, LIBRARY.door];
}

/** The tablet marks now: each tablet has a lit mark and a dark mark on its current place. */
export function tabletMarks(s: LibraryState, foot: Rect): LightMark[] {
  const marks: LightMark[] = [];
  const ground = rectCenter(foot);
  for (const tablet of TABLET_IDS) {
    let rect: Rect | null = null;
    if (s.held === tablet) {
      rect = handRect(ground);
    } else {
      const rackAt = s.rack.indexOf(tablet);
      const socketAt = s.sockets.indexOf(tablet);
      if (rackAt >= 0) rect = tabletRect(LIBRARY.rack[rackAt]);
      else if (socketAt >= 0) rect = tabletRect(LIBRARY.sockets[socketAt]);
    }
    if (rect === null) continue;
    marks.push({ id: `${tablet}:lit`, kind: 'lit', rect });
    marks.push({ id: `${tablet}:dark`, kind: 'dark', rect });
  }
  return marks;
}

/** The glyph a light mark draws. */
export type MarkSymbol = LitBody | DarkSign | 'practiceLit' | 'practiceDark';

export function markSymbol(id: string): MarkSymbol | null {
  if (id === PRACTICE_LIT_ID) return 'practiceLit';
  if (id === PRACTICE_DARK_ID) return 'practiceDark';
  const [tablet, layer] = id.split(':');
  if (!(TABLET_IDS as readonly string[]).includes(tablet)) return null;
  return layer === 'lit' ? TABLET_LIT[tablet as TabletId] : TABLET_DARK[tablet as TabletId];
}

/** Journal text for each mark, Pulse reveal and one-time entry. Only what is seen; no time-of-day labels. */
export const LIBRARY_JOURNAL_TEXT: Readonly<Record<string, string>> = {
  'bird:lit': 'Chim, lớp sáng: mặt trời sát đường chân trời.',
  'bird:dark': 'Chim, lớp tối: mũi tên hướng lên.',
  'leaf:lit': 'Lá, lớp sáng: mặt trời trên cao.',
  'leaf:dark': 'Lá, lớp tối: cung ở đỉnh.',
  'boat:lit': 'Thuyền, lớp sáng: mặt trời sát đường chân trời.',
  'boat:dark': 'Thuyền, lớp tối: mũi tên hướng xuống.',
  'seed:lit': 'Hạt, lớp sáng: mặt trăng trên cao.',
  'seed:dark': 'Hạt, lớp tối: cung ở đỉnh.',
  [PRACTICE_LIT_ID]: 'Trang thực hành, lớp sáng: dấu chữ thập. Chỉ là ví dụ.',
  [PRACTICE_DARK_ID]: 'Trang thực hành, lớp tối: dấu răng cưa. Chỉ là ví dụ.',
  [PULSE_SHAFT_ID]: 'Trục tĩnh nối từ giếng tới gian mô hình.',
  [PULSE_FEED_ID]: 'Đường cấp khắc dưới rêu, chạy tới nhánh bến.',
  [PULSE_RETURN_ID]: 'Đường hồi khắc dưới rêu, chạy về rễ.',
};

/** Journal id added once the crystal is taken: what is known about the original design. */
export const ORIGINAL_DESIGN_JOURNAL_ID = 'library-roots:original-design';
export const ORIGINAL_DESIGN_JOURNAL_TEXT =
  'Thiết kế ban đầu có cả nhánh cấp và nhánh hồi. Chưa biết tuyến thật bị hỏng, bị chặn hay đang chạy sai chế độ.';

/** Cues for the Memory crystal taken line and the room's intro, one time each. */
export const INTRO_EVENT_ID = 'library-roots:intro';
export const MEMORY_EVENT_ID = 'library-roots:memory';
