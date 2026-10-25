import { rectsOverlap } from '../../core/geometry';
import type { Rect } from '../../core/geometry';
import type { HintLadder } from '../../core/hints';
import type { HudText } from '../../core/level';
import { stepBridge } from '../../core/bridge';
import { isDoorOpen, setFixedLatch } from '../../core/latch';
import { lanternFeeds, pickUpLantern, placeLantern } from '../../core/lantern';
import type { LanternState } from '../../core/lantern';
import { stepMod } from '../../core/rotary';
import type { DialogueLine } from '../../../types/gameTypes';
import { BRACE_B_ID, FOREST_EDGE, LAMP_REST_ID, LATCH_A_ID, S1_ID, S2_ID } from './forestEdgeLayout';

/**
 * The state the level keeps in the save: whether latch A and brace B are engaged. Door and gate openings are not
 * saved; they are recomputed from the current lantern, the feeds and the foot (puzzle-contracts §4).
 */
export interface ForestEdgeState {
  readonly latchA: boolean;
  readonly braceB: boolean;
}

/** Door A and gate B as they stand this frame. Only the bridge rule needs the previous frame. */
export interface ForestEdgeLive {
  /** Door A is walkable and a light blocker is gone. */
  readonly doorAOpen: boolean;
  /** Gate B is walkable. */
  readonly gateBOpen: boolean;
}

/** The derived view: what is open now and which step the player is on. */
export interface ForestEdgeView {
  readonly doorAFed: boolean;
  readonly gateBFed: boolean;
  readonly doorAOpen: boolean;
  readonly gateBOpen: boolean;
  readonly stage: 'take-lantern' | 'latch-a' | 'brace-b' | 'done';
}

/** A step result: the new value, or the reason it was refused (RULE_GAMES §7). */
export type Outcome<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly reason: string };

/** The door and gate at the start of a new game: both closed. */
export const INITIAL_FOREST_LIVE: ForestEdgeLive = { doorAOpen: false, gateBOpen: false };

/** The journal entry the first meeting writes: who Lumo is, what he wants, and the trade. */
export const AGREEMENT_JOURNAL_ID = 'agreement';

/** Journal text for each mark, keyed by mark id. */
export const FOREST_EDGE_JOURNAL_TEXT: Record<string, string> = {
  [AGREEMENT_JOURNAL_ID]:
    'Lumo muốn về vườn nhưng cổng bảo trì đóng. Cậu biết đường qua thư viện và trung tâm trạm; đổi lại, Nhinh giúp cậu mở lối vào vườn. Nhinh kiểm tra trạm trước.',
  sprout: 'Mầm cây dưới vệt đèn: Lumo đang che nó.',
  'spores-hinge-1': 'Bào tử tối cạnh mô hình bản lề: chỉ hiện ngoài vệt đèn cầm tay.',
  'spores-hinge-2': 'Bào tử tối cạnh mô hình bản lề: chỉ hiện ngoài vệt đèn cầm tay.',
  'spores-latch-1': 'Bào tử tối cạnh chốt A: chỉ hiện ngoài vệt đèn cầm tay.',
  'spores-latch-2': 'Bào tử tối cạnh chốt A: chỉ hiện ngoài vệt đèn cầm tay.',
  'spores-latch-3': 'Bào tử tối cạnh chốt A: chỉ hiện ngoài vệt đèn cầm tay.',
  'steps-latch-1': 'Vết chân phía sân giữa dẫn tới chốt A.',
  'steps-latch-2': 'Vết chân phía sân giữa dẫn tới chốt A.',
  'steps-latch-3': 'Vết chân phía sân giữa dẫn tới chốt A.',
  'line-s1-a': 'Đường khắc S1–A: đầu nối kín của bệ S1 đi tới cửa A.',
  'latch-tool-marks': 'Vết dụng cụ quanh chốt A.',
};

/**
 * The hinge model in E-cycle order (scenario 01 §3: pulled open and let go, it shuts; hooked, it holds): each phase
 * gives the pose it shows, the prompt for the next E, and the line shown when it is reached. Cosmetic only: nothing
 * depends on it.
 */
export const HINGE_PHASES = [
  { pose: 'closed', prompt: 'E: kéo thử bản lề', reached: 'Bản lề: tháo móc, cánh đóng lại.' },
  { pose: 'pulled', prompt: 'E: thả bản lề', reached: 'Bản lề: kéo mở; lò xo đang kéo về.' },
  { pose: 'closed', prompt: 'E: kéo và cài móc', reached: 'Bản lề: thả ra, lò xo kéo cánh đóng lại.' },
  { pose: 'hooked', prompt: 'E: tháo móc', reached: 'Bản lề: cài móc, cánh giữ mở.' },
] as const;

/** The refusal texts. Each says the condition that is still missing. */
export const REFUSE_LATCH_A = 'Chốt A chỉ gài được khi cửa A đang mở.';
export const REFUSE_BRACE_B = 'Tay hãm B chỉ gài được khi cổng B đang mở.';
export const REFUSE_LANTERN_ELSEWHERE = 'Đèn đang đặt ở bệ khác.';
export const REFUSE_LAMP_ON_GROUND = 'Đèn còn trên đất cạnh bia; nhặt đèn trước.';
export const REFUSE_LAMP_GONE = 'Đèn không còn ở chỗ cạnh bia.';

/** The save event that records the one pickup of the lamp from the ground (decision b). Once set, the lamp never rests there again. */
export const LAMP_TAKEN_EVENT = 'forest-edge:lamp-taken';

/**
 * The dialogue cues, in the order the level checks them. Each plays once (a saved event). `agreement` is the one
 * exception to the trigger order: it follows the opening line when that has played, and otherwise waits for door A.
 */
export type ForestCue = 'opening' | 'agreement' | 'pedestal' | 'door-feed' | 'lumo-door' | 'ending';

/** The save event each cue leaves behind once it has played. */
export const CUE_EVENT: Readonly<Record<ForestCue, string>> = {
  opening: 'forest-edge:opening',
  agreement: 'forest-edge:agreement',
  pedestal: 'forest-edge:pedestal',
  'door-feed': 'forest-edge:door-feed',
  'lumo-door': 'forest-edge:lumo-door',
  ending: 'forest-edge:ending',
};

/**
 * Dialogue for each cue. Lines are quoted from docs/scenario-v4/01-forgotten-forest-edge.md and the demo rewrite.
 * The opening apology is a paraphrase; the doc gives it no verbatim line. `agreement` turns the paragraph in
 * 01 section 1 into four spoken lines: who they are, what each of them wants, and the trade they make.
 */
export const CUE_LINES: Readonly<Record<ForestCue, readonly DialogueLine[]>> = {
  opening: [
    { speaker: 'Lumo', text: 'Cậu có thể đừng soi vào nhà người khác không?' },
    { speaker: 'Nhinh', text: 'Xin lỗi. Tôi đến đây để kiểm tra trạm.' },
  ],
  // Quoted in 01 section 1 (added there with this pass): Lumo offers the trade, Nhinh accepts it and puts the station first.
  agreement: [
    { speaker: 'Nhinh', text: 'Tôi là Nhinh, thợ sửa đèn ở Bến Sương.' },
    { speaker: 'Lumo', text: 'Còn tôi là Lumo. Tôi muốn về vườn của mình, nhưng cổng bảo trì đóng cả rồi.' },
    { speaker: 'Lumo', text: 'Tôi biết đường qua thư viện và trung tâm trạm. Cậu giúp tôi mở lối vào vườn nhé?' },
    { speaker: 'Nhinh', text: 'Cậu dẫn đường, tôi giúp mở lối vào vườn. Nhưng tôi phải kiểm tra nguồn của bến trước.' },
  ],
  pedestal: [{ speaker: 'Nhinh', text: 'Khớp này giống ở xưởng.' }],
  'door-feed': [{ speaker: 'Nhinh', text: 'Cửa còn chạy. Đường cấp của trạm mới là thứ đang thiếu.' }],
  'lumo-door': [{ speaker: 'Lumo', text: 'Trước đây cửa vẫn mở khi người giữ trạm tới.' }],
  ending: [
    { speaker: 'Nhinh', text: 'Đường này nối về bến.' },
    { speaker: 'Lumo', text: 'Cũng từng nối về vườn tôi.' },
  ],
};

/** The state at the start: latch A and brace B not engaged. */
export function defaultForestEdgeState(): ForestEdgeState {
  return { latchA: false, braceB: false };
}

/** Reads a saved state. Any field that is not a boolean falls back to its default; junk gives the defaults. */
export function parseForestEdgeState(raw: unknown): ForestEdgeState {
  const fallback = defaultForestEdgeState();
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return fallback;
  const record = raw as { latchA?: unknown; braceB?: unknown };
  return {
    latchA: typeof record.latchA === 'boolean' ? record.latchA : fallback.latchA,
    braceB: typeof record.braceB === 'boolean' ? record.braceB : fallback.braceB,
  };
}

/** Whether a foot rect overlaps a zone. */
function footOn(foot: Rect, zone: Rect): boolean {
  return rectsOverlap(foot, zone);
}

/**
 * One frame of the two doors. Door A is open while S1 is fed or latch A is engaged; gate B while S2 is fed or brace B
 * is engaged. Either holds open while a foot is in its threshold (stepBridge), so a door never closes on Nhinh.
 */
export function stepDoors(prev: ForestEdgeLive, state: ForestEdgeState, lantern: LanternState, foot: Rect): ForestEdgeLive {
  const a = stepBridge(
    prev.doorAOpen,
    isDoorOpen(lanternFeeds(lantern, S1_ID), state.latchA),
    footOn(foot, FOREST_EDGE.thresholdA),
  );
  const b = stepBridge(
    prev.gateBOpen,
    isDoorOpen(lanternFeeds(lantern, S2_ID), state.braceB),
    footOn(foot, FOREST_EDGE.thresholdB),
  );
  return { doorAOpen: a.walkable, gateBOpen: b.walkable };
}

/** The derived view from the saved state, the live doors and the lantern. */
export function deriveForestEdge(state: ForestEdgeState, lantern: LanternState, live: ForestEdgeLive): ForestEdgeView {
  const stage = lantern.location.at === 'pedestal' && lantern.location.pedestalId === LAMP_REST_ID
    ? 'take-lantern'
    : !state.latchA ? 'latch-a' : !state.braceB ? 'brace-b' : 'done';
  return {
    doorAFed: lanternFeeds(lantern, S1_ID),
    gateBFed: lanternFeeds(lantern, S2_ID),
    doorAOpen: live.doorAOpen,
    gateBOpen: live.gateBOpen,
    stage,
  };
}

/** Light blockers now: the walls, and door A and gate B while their leaves are closed. */
export function forestBlockers(live: ForestEdgeLive): Rect[] {
  const blockers: Rect[] = [...FOREST_EDGE.walls];
  if (!live.doorAOpen) blockers.push(FOREST_EDGE.doorA);
  if (!live.gateBOpen) blockers.push(FOREST_EDGE.gateB);
  return blockers;
}

/**
 * Every solid of the level now: walls, foliage, the stone, pedestals, latch, brace, hinge and the closed leaves.
 * Defaults to the initial live state so the layout tests can ask for a closed level.
 */
export function forestSolids(live: ForestEdgeLive = INITIAL_FOREST_LIVE): Rect[] {
  const solids: Rect[] = [
    ...FOREST_EDGE.walls,
    ...FOREST_EDGE.foliage,
    FOREST_EDGE.stele,
    FOREST_EDGE.hinge,
    FOREST_EDGE.s1,
    FOREST_EDGE.s2,
    FOREST_EDGE.latchA,
    FOREST_EDGE.braceB,
  ];
  if (!live.doorAOpen) solids.push(FOREST_EDGE.doorA);
  if (!live.gateBOpen) solids.push(FOREST_EDGE.gateB);
  return solids;
}

/** The exit now: gate B open, the lantern in Nhinh's hand, and her foot in the exit zone. */
export function forestExitReady(live: ForestEdgeLive, lantern: LanternState, foot: Rect): boolean {
  return live.gateBOpen && lantern.location.at === 'hand' && rectsOverlap(foot, FOREST_EDGE.exitZone);
}

/**
 * The first dialogue cue whose condition holds now, or null. Cues only say things; none of them gates progress.
 * `sproutLit` is whether the sprout reads as lit this frame.
 */
export function pendingCue(input: {
  readonly hasEvent: (id: string) => boolean;
  readonly sproutLit: boolean;
  readonly live: ForestEdgeLive;
  readonly lantern: LanternState;
  readonly foot: Rect;
}): ForestCue | null {
  const { hasEvent, sproutLit, live, lantern, foot } = input;
  const played = (cue: ForestCue) => hasEvent(CUE_EVENT[cue]);
  if (!played('opening') && sproutLit) return 'opening';
  // The agreement needs either the apology already said or door A open, so it never carries "đừng soi" for a player
  // who never lit the sprout, and it always comes before Lumo's remark about the door.
  if (!played('agreement') && (played('opening') || live.doorAOpen)) return 'agreement';
  if (!played('pedestal') && lantern.location.at === 'pedestal' && lantern.location.pedestalId === S1_ID) return 'pedestal';
  if (!played('door-feed') && lanternFeeds(lantern, S1_ID) && live.doorAOpen) return 'door-feed';
  if (!played('lumo-door') && live.doorAOpen) return 'lumo-door';
  if (!played('ending') && forestExitReady(live, lantern, foot)) return 'ending';
  return null;
}

/**
 * The lantern a new game starts with: unlit on the ground by the stele, until the player takes it once. Only used
 * while LAMP_TAKEN_EVENT is absent.
 */
export function lampOnGround(): LanternState {
  return { location: { at: 'pedestal', pedestalId: LAMP_REST_ID }, on: false };
}

/** Step for E at the lamp on the ground: the one pickup. The lamp comes into hand unlit. */
export function takeLampFromRest(lantern: LanternState): Outcome<LanternState> {
  const next = pickUpLantern(lantern, LAMP_REST_ID);
  if (next) return { ok: true, value: next };
  return { ok: false, reason: REFUSE_LAMP_GONE };
}

/** Step for E at pedestal S1 or S2: places the lantern from hand, or takes it back from that pedestal. */
export function lanternAtPedestal(lantern: LanternState, pedestalId: string): Outcome<LanternState> {
  if (lantern.location.at === 'pedestal' && lantern.location.pedestalId === LAMP_REST_ID) {
    return { ok: false, reason: REFUSE_LAMP_ON_GROUND };
  }
  const next = placeLantern(lantern, pedestalId) ?? pickUpLantern(lantern, pedestalId);
  if (next) return { ok: true, value: next };
  return { ok: false, reason: REFUSE_LANTERN_ELSEWHERE };
}

/** Step for E at latch A: engages it while door A is open now, or releases it. Release is always allowed. */
export function toggleLatchA(state: ForestEdgeState, doorAOpenNow: boolean): Outcome<ForestEdgeState> {
  const next = setFixedLatch(state.latchA, !state.latchA, doorAOpenNow);
  if (next === null) return { ok: false, reason: REFUSE_LATCH_A };
  return { ok: true, value: { ...state, latchA: next } };
}

/** Step for E at brace B: engages it while gate B is open now, or releases it. Release is always allowed. */
export function toggleBraceB(state: ForestEdgeState, gateBOpenNow: boolean): Outcome<ForestEdgeState> {
  const next = setFixedLatch(state.braceB, !state.braceB, gateBOpenNow);
  if (next === null) return { ok: false, reason: REFUSE_BRACE_B };
  return { ok: true, value: { ...state, braceB: next } };
}

/** Next hinge phase on E: pull, let go, pull and hook, unhook, and back. */
export function nextHingePhase(phase: number): number {
  return stepMod(phase, 1, HINGE_PHASES.length);
}

/** The HUD lines. The objective changes once both latch and brace hold; the status names both doors. */
export function forestEdgeHud(view: ForestEdgeView, lantern: LanternState, state: ForestEdgeState): HudText {
  const where =
    lantern.location.at === 'hand'
      ? 'trong tay'
      : lantern.location.pedestalId === LAMP_REST_ID
        ? 'trên đất cạnh bia'
        : lantern.location.pedestalId === S1_ID
          ? 'trên bệ S1'
          : 'trên bệ S2';
  const lamp = `Đèn: ${where} ${lantern.on ? 'bật' : 'tắt'}`;
  const doorA = `Cửa A: ${view.doorAOpen ? 'mở' : 'đóng'}${state.latchA ? ', đã gài' : ''}`;
  const gateB = `Cổng B: ${view.gateBOpen ? 'mở' : 'đóng'}${state.braceB ? ', đã gài' : ''}`;
  return {
    objective: view.stage === 'take-lantern' ? 'Nhặt đèn cạnh bia để kiểm tra trạm'
      : view.stage === 'done' ? 'Giữ lối qua trạm để mang đèn đi tiếp' : 'Kiểm tra trạm mất nguồn',
    status: `${lamp} · ${doorA} · ${gateB}`,
  };
}

/**
 * The interactables to point at next on the reference route (a marker, never a lock): the lamp by the stele, then S1,
 * latch A while S1 feeds door A, S1 again to take the lamp back, S2, brace B while S2 feeds gate B, and S2 once more
 * to take the lamp through the gate. A lamp left unlit on a pedestal points back at that pedestal.
 */
export function forestEdgeFocus(lantern: LanternState, state: ForestEdgeState): readonly string[] {
  if (lantern.location.at === 'hand') {
    if (!state.latchA) return [S1_ID];
    if (!state.braceB) return [S2_ID];
    return [];
  }
  const at = lantern.location.pedestalId;
  if (at === LAMP_REST_ID) return [LAMP_REST_ID];
  if (at === S1_ID) return !state.latchA && lanternFeeds(lantern, S1_ID) ? [LATCH_A_ID] : [S1_ID];
  if (at === S2_ID) return state.latchA && !state.braceB && lanternFeeds(lantern, S2_ID) ? [BRACE_B_ID] : [S2_ID];
  return [];
}

/** The three hint levels from the doc, for the current step. None once both latch and brace hold. */
const HINTS: Record<Exclude<ForestEdgeView['stage'], 'done'>, HintLadder> = {
  'take-lantern': {
    key: 'forest-edge:take-lantern',
    steps: [
      'Đèn bảo trì vẫn ở nơi Nhinh đặt trước khi ngủ.',
      'Chiếc đèn nằm trên đất cạnh bia, chưa ở trong tay.',
      'Đi tới đèn cạnh bia rồi nhấn E để nhặt. Khi cầm đèn, F bật hoặc tắt.',
    ],
  },
  'latch-a': {
    key: 'forest-edge:latch-a',
    steps: [
      'Đầu cắm S1 khớp với đèn thử. Lẫy và thanh hãm ở cửa A còn nguyên; cửa đã phản ứng với nguồn chưa?',
      'Nguồn thử mở cửa A, còn chốt cơ khí có thể giữ kết quả khi đèn được chuyển sang S2.',
      'Đặt đèn ở S1, qua A, gài chốt từ sân giữa rồi quay lại lấy đèn sang S2. Khi B mở, dùng tay hãm ở phía sân giữa.',
    ],
  },
  'brace-b': {
    key: 'forest-edge:brace-b',
    steps: [
      'Cổng B nhận nguồn từ S2, như cửa A nhận từ S1.',
      'Tay hãm B chỉ gài được khi cổng B đang mở; sau khi gài, B giữ dù đèn ở đâu.',
      'Đặt đèn bật ở S2 để mở B, gài tay hãm B từ sân giữa, rồi lấy đèn đi qua cổng.',
    ],
  },
};

/** The hint ladder for the current step, computed from the current state only. */
export function forestEdgeHint(view: ForestEdgeView): HintLadder | null {
  if (view.stage === 'done') return null;
  return HINTS[view.stage];
}
