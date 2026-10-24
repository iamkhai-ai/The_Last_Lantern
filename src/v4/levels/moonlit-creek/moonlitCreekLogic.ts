import { rectsOverlap } from '../../core/geometry';
import type { Point, Rect } from '../../core/geometry';
import { stepBridge } from '../../core/bridge';
import type { HintLadder } from '../../core/hints';
import type { HudText } from '../../core/level';
import { setFixedLatch } from '../../core/latch';
import { lanternFeeds } from '../../core/lantern';
import type { LanternState } from '../../core/lantern';
import type { Footprint } from '../../core/light';
import {
  DIAGRAM_ID,
  G1_CENTRE,
  G2_CENTRE,
  MOONLIT_CREEK,
  PEDESTAL_S_ID,
  PIPE_BEN_EAST_ID,
  PIPE_BEN_RAY_ID,
  PIPE_BEN_WEST_ID,
  PIPE_RE_EAST_ID,
  PIPE_RE_ISLAND_ID,
  PIPE_RE_RAY_ID,
  RAY_WIDTH,
  S_CENTRE,
} from './moonlitCreekLayout';

/** Which bridge G1 aims at: bridge A, or G2 on the island. */
export type G1Aim = 'A' | 'G2';
/** Which bridge G2 aims at: bridge B, or the test station T. */
export type G2Aim = 'B' | 'T';
/** idle: no sample yet; running: presentation under way; safe: presentation ended or stopped, the catch holds the lever. */
export type TestPhase = 'idle' | 'running' | 'safe';

/** The level's save (puzzle-contracts §4 and 04 §5). The lantern, Lumo and the journal live in the host's save. */
export interface MoonlitState {
  readonly latchA: boolean;
  readonly latchB: boolean;
  readonly g1: G1Aim;
  readonly g2: G2Aim;
  /** Valve N, toggled by E on the East bank. */
  readonly nOpen: boolean;
  readonly test: TestPhase;
}

/** Live values derived from the state and the lantern. Never saved. */
export interface MoonlitView {
  /** The lantern sits on S, lit: the network has its source. */
  readonly feeds: boolean;
  /** Bridge A's own condition this frame (fed through G1). */
  readonly bridgeALive: boolean;
  /** Bridge B's own condition this frame (fed through G1 and G2). */
  readonly bridgeBLive: boolean;
  /** Test station T is fed by the right route. */
  readonly testFed: boolean;
  /** Bridge A is open: fed, or held by latch A. */
  readonly bridgeAOpen: boolean;
  /** Bridge B is open: fed, or held by latch B. */
  readonly bridgeBOpen: boolean;
}

/** The bridges' walkable state, carried frame to frame (stepBridge needs the previous frame). */
export interface CrossingLive {
  readonly a: boolean;
  readonly b: boolean;
}

/** Both bridges closed: the start of every load. */
export const INITIAL_CROSSINGS: CrossingLive = { a: false, b: false };

/** Seconds of presentation in ms. Runtime-only; a reload settles the test to safe. */
export const PRESENTATION_MS = 8000;

/** Reading recorded by the single sample, fixed by the design (04 §4). */
export const SAMPLE_READING = { ben: 'Bến tăng', re: 'Rễ hạ' } as const;

/** Journal text for each mark or pulse id. */
export const MOONLIT_JOURNAL_TEXT: Readonly<Record<string, string>> = {
  [DIAGRAM_ID]: 'Sơ đồ bờ Tây: S chiếu G1; G1 hướng cầu A hoặc G2; G2 hướng cầu B hoặc trạm T. Van hồi N nằm ở bờ Đông. Hai ống chính Bến và Rễ chạy riêng dưới đường tia.',
  [PIPE_BEN_WEST_ID]: 'Khoáng trên ống Bến: chỉ đọc được khi không có tia đèn phủ lên.',
  [PIPE_BEN_RAY_ID]: 'Khoáng trên ống Bến dưới tia S: chỉ đọc được khi tia tắt.',
  [PIPE_BEN_EAST_ID]: 'Khoáng trên ống Bến phía Đông: chỉ đọc được khi không có tia đèn phủ lên.',
  [PIPE_RE_RAY_ID]: 'Khoáng trên ống Rễ dưới tia G1–G2: chỉ đọc được khi tia tắt.',
  [PIPE_RE_ISLAND_ID]: 'Khoáng trên ống Rễ trên đảo: chỉ đọc được khi không có tia đèn phủ lên.',
  [PIPE_RE_EAST_ID]: 'Khoáng trên ống Rễ phía Đông: chỉ đọc được khi không có tia đèn phủ lên.',
};

/** The state at the start: both latches off, G1 at A, G2 at B, N closed, T not fed, no test. */
export function defaultMoonlitState(): MoonlitState {
  return { latchA: false, latchB: false, g1: 'A', g2: 'B', nOpen: false, test: 'idle' };
}

/**
 * Reads a saved state field by field; anything not of the right type falls back to its default. A test saved in
 * the middle of its presentation comes back safe (the lever catches on reload, 04 §5).
 */
export function parseMoonlitState(raw: unknown): MoonlitState {
  const d = defaultMoonlitState();
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return d;
  const r = raw as Record<string, unknown>;
  const test: TestPhase = r.test === 'idle' || r.test === 'safe' || r.test === 'running' ? r.test : d.test;
  return {
    latchA: typeof r.latchA === 'boolean' ? r.latchA : d.latchA,
    latchB: typeof r.latchB === 'boolean' ? r.latchB : d.latchB,
    g1: r.g1 === 'A' || r.g1 === 'G2' ? r.g1 : d.g1,
    g2: r.g2 === 'B' || r.g2 === 'T' ? r.g2 : d.g2,
    nOpen: typeof r.nOpen === 'boolean' ? r.nOpen : d.nOpen,
    // A sample is only ever recorded together with the test leaving 'idle', so a saved 'running' is always safe here.
    test: test === 'running' ? 'safe' : test,
  };
}

/** Derives the network's live values from the state and the lantern. */
export function deriveMoonlit(s: MoonlitState, lantern: LanternState): MoonlitView {
  const feeds = lanternFeeds(lantern, PEDESTAL_S_ID);
  const bridgeALive = feeds && s.g1 === 'A';
  const bridgeBLive = feeds && s.g1 === 'G2' && s.g2 === 'B';
  const testFed = feeds && s.g1 === 'G2' && s.g2 === 'T';
  return {
    feeds,
    bridgeALive,
    bridgeBLive,
    testFed,
    bridgeAOpen: bridgeALive || s.latchA,
    bridgeBOpen: bridgeBLive || s.latchB,
  };
}

/** One frame of both bridges (core stepBridge): a bridge with Nhinh on its deck stays walkable until she is clear. */
export function stepCrossings(prev: CrossingLive, view: MoonlitView, foot: Rect): CrossingLive {
  const a = stepBridge(prev.a, view.bridgeAOpen, rectsOverlap(foot, MOONLIT_CREEK.deckA));
  const b = stepBridge(prev.b, view.bridgeBOpen, rectsOverlap(foot, MOONLIT_CREEK.deckB));
  return { a: a.walkable, b: b.walkable };
}

/** Every solid of the level now: walls, both channels, the fixed pieces, and each deck while it is not walkable. */
export function moonlitSolids(c: CrossingLive): Rect[] {
  const m = MOONLIT_CREEK;
  const solids: Rect[] = [
    ...m.walls,
    m.chasmANorth,
    m.chasmASouth,
    m.chasmBNorth,
    m.chasmBSouth,
    m.pedestalS,
    m.mirrorG1,
    m.mirrorG2,
    m.crankG1,
    m.crankG2,
    m.restoreA,
    m.restoreB,
    m.latchA,
    m.latchB,
    m.valveN,
    m.testT,
    m.stop,
  ];
  if (!c.a) solids.push(m.deckA);
  if (!c.b) solids.push(m.deckB);
  return solids;
}

/** Light blockers now: the walls only. Decks, water, mirrors and the lantern's own rays do not block. */
export function moonlitBlockers(): Rect[] {
  return [...MOONLIT_CREEK.walls];
}

/** A straight ray segment of the mirror network. */
export interface RaySegment {
  readonly from: Point;
  readonly to: Point;
}

/**
 * The active ray segments: S→G1 whenever the lantern feeds; then G1→A, or G1→G2 and G2→B or G2→T. Nothing when the
 * network has no source.
 */
export function raySegments(s: MoonlitState, view: MoonlitView): RaySegment[] {
  if (!view.feeds) return [];
  const segments: RaySegment[] = [{ from: S_CENTRE, to: G1_CENTRE }];
  if (s.g1 === 'A') {
    segments.push({ from: G1_CENTRE, to: MOONLIT_CREEK.eyeA });
  } else {
    segments.push({ from: G1_CENTRE, to: G2_CENTRE });
    segments.push(s.g2 === 'B'
      ? { from: G2_CENTRE, to: MOONLIT_CREEK.eyeB }
      : { from: G2_CENTRE, to: MOONLIT_CREEK.eyeT });
  }
  return segments;
}

/** The 6px strip under one segment, as a convex polygon. */
export function raySegmentStrip(seg: RaySegment): Point[] {
  const dx = seg.to.x - seg.from.x;
  const dy = seg.to.y - seg.from.y;
  const length = Math.hypot(dx, dy);
  const half = RAY_WIDTH / 2;
  const nx = (-dy / length) * half;
  const ny = (dx / length) * half;
  return [
    { x: seg.from.x + nx, y: seg.from.y + ny },
    { x: seg.to.x + nx, y: seg.to.y + ny },
    { x: seg.to.x - nx, y: seg.to.y - ny },
    { x: seg.from.x - nx, y: seg.from.y - ny },
  ];
}

/** The rays as fixed footprints (origin null: authored, never clipped; the layout test proves no wall crosses them). */
export function rayFootprints(s: MoonlitState, view: MoonlitView): Footprint[] {
  return raySegments(s, view).map(seg => ({ kind: 'area' as const, points: raySegmentStrip(seg), origin: null }));
}

/** The outcome of one E action: the new state, or the same state with the line that says why nothing changed. */
export interface StepOutcome {
  readonly state: MoonlitState;
  readonly message: string;
  /** True when this action changed the state in a way that counts as a success. */
  readonly ok: boolean;
}

function done(state: MoonlitState, message: string): StepOutcome {
  return { state, message, ok: true };
}

function refused(state: MoonlitState, message: string): StepOutcome {
  return { state, message, ok: false };
}

/** The drive crank on the island: G1 toggles between bridge A and G2. */
export function driveG1(s: MoonlitState): StepOutcome {
  const g1: G1Aim = s.g1 === 'A' ? 'G2' : 'A';
  return done({ ...s, g1 }, g1 === 'A' ? 'Gương G1 quay về cầu A.' : 'Gương G1 quay sang G2.');
}

/** The drive crank on the island: G2 toggles between bridge B and T. */
export function driveG2(s: MoonlitState): StepOutcome {
  const g2: G2Aim = s.g2 === 'B' ? 'T' : 'B';
  return done({ ...s, g2 }, g2 === 'B' ? 'Gương G2 quay về cầu B.' : 'Gương G2 quay sang trạm T.');
}

/** Restore crank A (West bank): aims G1 back at bridge A. Does not engage any latch. */
export function restoreA(s: MoonlitState): StepOutcome {
  if (s.g1 === 'A') return refused(s, 'Cần hồi A: G1 đã hướng cầu A.');
  return done({ ...s, g1: 'A' }, 'Cần hồi A đưa G1 về cầu A.');
}

/** Restore crank B (East bank): aims G1 at G2 and G2 at bridge B, by one continuous wire. */
export function restoreB(s: MoonlitState): StepOutcome {
  if (s.g1 === 'G2' && s.g2 === 'B') return refused(s, 'Cần hồi B: tuyến tới cầu B đã đặt sẵn.');
  return done({ ...s, g1: 'G2', g2: 'B' }, 'Cần hồi B đưa G1 về G2 và G2 về cầu B.');
}

/** Why a latch will not release while the lantern is not on S (04 §5). */
export const LATCH_RELEASE_REFUSED = 'Đèn không ở S: nhả chốt thì cầu đóng, bên này không còn nguồn nào mở lại.';

/**
 * Latch A or B (East bank). Engaging needs its bridge open right now (`liveNow`). Releasing needs the lantern on S
 * (04 §5): then every bridge that closes can be fed again by the island drive or restore B. With the lantern
 * anywhere else nothing on this side can feed a bridge, so the release would cut the way back.
 */
export function stepLatch(s: MoonlitState, which: 'A' | 'B', liveNow: boolean, lanternOnS: boolean): StepOutcome {
  const key = which === 'A' ? 'latchA' : 'latchB';
  const engaged = s[key];
  if (!engaged) {
    const next = setFixedLatch(false, true, liveNow);
    if (next === null) return refused(s, `Cầu ${which} chưa mở thật nên chưa gài được chốt ${which}.`);
    return done({ ...s, [key]: next }, `Chốt ${which} đã gài.`);
  }
  if (!lanternOnS) return refused(s, LATCH_RELEASE_REFUSED);
  return done({ ...s, [key]: false }, `Chốt ${which} đã nhả.`);
}

/** Valve N: toggled by E. Stopping the test never does this (04 §2). */
export function toggleN(s: MoonlitState): StepOutcome {
  const nOpen = !s.nOpen;
  return done({ ...s, nOpen }, nOpen ? 'Van hồi N mở.' : 'Van hồi N đóng.');
}

/**
 * E at test station T. Starts the one sample only when T is fed by the right route AND N is open; the first valid E
 * records the pair at once. Otherwise it says what is missing and does not start, does not record and does not
 * consume the sample. A later E only shows the recorded pair.
 */
export function stepTest(s: MoonlitState, view: MoonlitView): StepOutcome {
  if (s.test === 'running') return refused(s, 'Trạm T đang trình bày kết quả.');
  if (s.test === 'safe') return refused(s, `Kết quả đã ghi: ${SAMPLE_READING.ben}, ${SAMPLE_READING.re}.`);
  const missing: string[] = [];
  if (!view.testFed) missing.push('trạm T chưa nhận nguồn đúng tuyến');
  if (!s.nOpen) missing.push('van hồi N đang đóng');
  if (missing.length > 0) return refused(s, `Chưa thử được: ${missing.join('; ')}.`);
  return done({ ...s, test: 'running' }, `Ghi mẫu: ${SAMPLE_READING.ben}, ${SAMPLE_READING.re}. Đang trình bày.`);
}

/** The stop button beside the board: ends a running presentation early. The lever catches; N does not change. */
export function stepStop(s: MoonlitState): StepOutcome {
  if (s.test !== 'running') return refused(s, 'Không có trình bày nào đang chạy.');
  return done({ ...s, test: 'safe' }, 'Đã dừng trình bày. Lẫy tự gài, van N giữ nguyên.');
}

/**
 * The presentation ends when it runs out, or when T loses its power or N closes. Either way the test goes safe and
 * the lever catches. Anything else returns the state unchanged.
 */
export function settleTest(s: MoonlitState, view: MoonlitView, presentationDone: boolean): MoonlitState {
  if (s.test !== 'running') return s;
  if (presentationDone || !view.testFed || !s.nOpen) return { ...s, test: 'safe' };
  return s;
}

/**
 * The first missing condition for the exit, or null when the exit is ready: a recorded sample, T safe with its catch,
 * N open, and the lantern in hand. One line, in that order (RULE_GAMES §7).
 */
export function exitMissing(s: MoonlitState, lanternInHand: boolean): string | null {
  if (s.test === 'idle') return 'Chưa có mẫu thử tại trạm T.';
  if (s.test === 'running') return 'Trạm T chưa về tải thấp.';
  if (!s.nOpen) return 'Van hồi N đang đóng: mở van ở nền Đông.';
  if (!lanternInHand) return 'Đèn chưa ở tay: lấy đèn ở bệ S.';
  return null;
}

/** The HUD lines (04 §4 order). `translate` localizes each word at the render boundary. */
export function moonlitHud(
  s: MoonlitState,
  view: MoonlitView,
  lantern: LanternState,
  translate: (text: string) => string = (text) => text,
): HudText {
  const t = translate;
  const lanternInHand = lantern.location.at === 'hand';
  let objective: string;
  if (s.test === 'idle') objective = 'Kiểm tra tuyến Bến và tuyến Rễ';
  else if (s.test === 'running') objective = 'Đưa trạm thử về mức an toàn';
  else if (!s.nOpen) objective = 'Mở van hồi N';
  else objective = 'Thu đèn và tiếp tục tới tháp';

  const lamp = `${t('Đèn')}: ${t(lanternInHand ? 'trong tay' : 'trên bệ S')} ${t(lantern.on ? 'bật' : 'tắt')}`;
  const bridgeA = `${t('Cầu A')}: ${t(view.bridgeAOpen ? 'mở' : 'đóng')}${s.latchA ? t(', đã gài') : ''}`;
  const bridgeB = `${t('Cầu B')}: ${t(view.bridgeBOpen ? 'mở' : 'đóng')}${s.latchB ? t(', đã gài') : ''}`;
  const testText = `${t('Trạm T')}: ${t(s.test === 'idle' ? 'chưa thử' : s.test === 'running' ? 'đang thử' : 'tải thấp, đã gài')}`;
  const valve = `${t('Van N')}: ${t(s.nOpen ? 'mở' : 'đóng')}`;
  return { objective: t(objective), status: `${lamp} · ${bridgeA} · ${bridgeB} · ${testText} · ${valve}` };
}

/** The three H levels for the current stage (04 §5). The stage is read from the state, never from history. */
export function moonlitHint(s: MoonlitState): HintLadder {
  if (s.test === 'idle') {
    return {
      key: 'moonlit:sample',
      steps: [
        'Tay giữ cầu A nằm ở Đông, còn trên đảo có tay truyền động nào? Khi dấu không bị đèn chiếu, hai ống chính được ghi là Bến và Rễ.',
        'Có thể để A tạm đóng sau lưng khi đổi G1 để mở B. Pulse chỉ cho thấy liên kết tĩnh giữa G2, cầu và T; dòng chính tách khỏi mạch đèn thử. N mở hồi không có nghĩa phần Rễ đang nhận đủ.',
        'Mở A để sang đảo, đổi G1 sang G2 rồi mở B. Tại Đông gài B, cấp lại A rồi gài A; sau đó cấp T và mở N. E hợp lệ đầu tiên tại T ghi cặp kết quả; nếu thiếu nguồn hoặc N đóng, chưa có mẫu nào được ghi.',
      ],
    };
  }
  if (s.test === 'running') {
    return {
      key: 'moonlit:running',
      steps: [
        'Trạm T đang trình bày kết quả đã ghi; chỉ báo Bến và Rễ không đổi theo lần E.',
        'Dòng chính đổi tải và không cần đèn cầm. Chốt và cầu giữ bằng cơ khí, không bằng tia.',
        'Nút dừng cạnh bảng kết thúc trình bày sớm. Lẫy sẽ tự gài và van N giữ nguyên.',
      ],
    };
  }
  return {
    key: 'moonlit:after',
    steps: [
      'Cặp kết quả Bến và Rễ đã ghi tại T. E tại T chỉ để xem lại, không chạy thử lần nữa.',
      'Cầu đã gài giữ khi chịu tải; đèn cầm qua cầu phải đi trên cầu đã gài.',
      'Nếu N đã đóng, mở riêng van N bằng E; sau đó đưa đèn về tay và tới lối ra Đông qua đường cầu vật lý đã giữ.',
    ],
  };
}
