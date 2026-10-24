import { rectsOverlap } from '../../core/geometry';
import type { Rect } from '../../core/geometry';
import type { HintLadder } from '../../core/hints';
import type { HudText } from '../../core/level';
import { isDoorOpen } from '../../core/latch';
import { lanternFeeds } from '../../core/lantern';
import type { LanternState } from '../../core/lantern';
import { isRectLit } from '../../core/light';
import type { Footprint } from '../../core/light';
import { lumoHolds } from '../../core/lumo';
import type { LumoMode } from '../../core/lumo';
import { stepBridge } from '../../core/bridge';
import { ETCHING_ID, PEDESTAL_ID, SCRATCH_ID, SEAL_ID, SPORES_ID, TEST_ROOM } from './testRoomLayout';

/** The state the test room keeps in the save: whether latch A is engaged. */
export interface TestRoomState {
  readonly latchA: boolean;
}

/** The room's derived view: what is live now and which step the player is on. */
export interface TestRoomView {
  readonly doorALive: boolean;
  readonly doorAOpen: boolean;
  readonly gateBOpen: boolean;
  readonly stage: 'door' | 'lumo' | 'done';
}

/** Journal text for the carving the pulse reveals. */
export const CARVING_JOURNAL_TEXT = 'Nét khắc: cửa A nhận ánh sáng từ bệ, không từ đèn cầm tay.';

/** Journal text for each light mark of the test room, keyed by mark id. */
export const LIGHT_MARK_JOURNAL_TEXT: Record<string, string> = {
  [SPORES_ID]: 'Bào tử phát quang trong hốc: chỉ hiện khi không có vệt đèn chiếu vào.',
  [ETCHING_ID]: 'Nét khắc ánh trong hốc: chỉ đọc được dưới vệt đèn.',
  [SCRATCH_ID]: 'Vết xước sau vách góc: phải đứng cùng phía mới thấy.',
};

/** Live, unsaved state of the light corner. Recomputed every frame; the bridge rule needs the previous frame. */
export interface CornerLive {
  /** Either face of flower C is lit. */
  readonly flowerLit: boolean;
  /** Door C is open this frame. */
  readonly doorCOpen: boolean;
  /** The root bed is lit this frame. */
  readonly bedLit: boolean;
  /** The root bridge is walkable this frame. */
  readonly bridgeWalkable: boolean;
}

/** The corner at the start: flower C dark, door C closed, the root bed dark, the root bridge walkable. */
export const INITIAL_CORNER: CornerLive = { flowerLit: false, doorCOpen: false, bedLit: false, bridgeWalkable: true };

/** Whether a foot rect overlaps a zone. */
function footOn(foot: Rect, zone: Rect): boolean {
  return rectsOverlap(foot, zone);
}

/**
 * One frame of the corner. flowerLit = either flower face is lit; door C = stepBridge(prev.doorCOpen, flowerLit, foot overlaps doorCThreshold);
 * bedLit = rootBed is lit; bridge = stepBridge(prev.bridgeWalkable, !bedLit, foot overlaps bridgeDeck). Water is always present.
 */
export function stepCorner(prev: CornerLive, footprints: readonly Footprint[], blockers: readonly Rect[], foot: Rect): CornerLive {
  const flowerLit = isRectLit(TEST_ROOM.flowerSouth, footprints, blockers) || isRectLit(TEST_ROOM.flowerNorth, footprints, blockers);
  const door = stepBridge(prev.doorCOpen, flowerLit, footOn(foot, TEST_ROOM.doorCThreshold));
  const bedLit = isRectLit(TEST_ROOM.rootBed, footprints, blockers);
  const bridge = stepBridge(prev.bridgeWalkable, !bedLit, footOn(foot, TEST_ROOM.bridgeDeck));
  return { flowerLit, doorCOpen: door.walkable, bedLit, bridgeWalkable: bridge.walkable };
}

/** Light blockers now: every wall, plus door A, gate B and door C leaves while closed. */
export function testRoomBlockers(v: TestRoomView, corner: CornerLive): Rect[] {
  const blockers: Rect[] = [...TEST_ROOM.walls];
  if (!v.doorAOpen) blockers.push(TEST_ROOM.doorA);
  if (!v.gateBOpen) blockers.push(TEST_ROOM.gateB);
  if (!corner.doorCOpen) blockers.push(TEST_ROOM.doorC);
  return blockers;
}

const OBJECTIVES: Record<TestRoomView['stage'], string> = {
  door: 'Mở cửa A và giữ nó mở.',
  lumo: 'Nhờ Lumo mở cổng B.',
  done: 'Đi qua cổng B.',
};

const HINTS: Record<'door' | 'lumo', HintLadder> = {
  door: {
    key: 'test-room:door',
    steps: [
      'Cửa A có mắt nhận ở phía bệ đèn.',
      'Đèn trên bệ mở cửa; chốt phía bên kia giữ cửa khi đèn đi nơi khác.',
      'Đặt đèn lên bệ, bật đèn, qua cửa và gài chốt A.',
    ],
  },
  lumo: {
    key: 'test-room:lumo',
    steps: [
      'Cổng B có một ấn ở trên cao.',
      'Lumo giữ ấn thì cổng mở; gọi cậu về thì cổng đóng.',
      'Dùng mốc gọi để gửi Lumo tới ấn, rồi đi qua cổng B.',
    ],
  },
};

/** The state at the start: latch A not engaged. */
export function defaultTestRoomState(): TestRoomState {
  return { latchA: false };
}

/** Reads a saved state; anything that is not `{ latchA: boolean }` is repaired to the default. */
export function parseTestRoomState(raw: unknown): TestRoomState {
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    const latchA = (raw as { latchA?: unknown }).latchA;
    if (typeof latchA === 'boolean') return { latchA };
  }
  return defaultTestRoomState();
}

/** Derives the room view from the saved state and the live lantern and Lumo states. */
export function deriveTestRoom(s: TestRoomState, lantern: LanternState, lumo: LumoMode): TestRoomView {
  const doorALive = lanternFeeds(lantern, PEDESTAL_ID);
  const doorAOpen = isDoorOpen(doorALive, s.latchA);
  const gateBOpen = lumoHolds(lumo, SEAL_ID);
  const stage = !s.latchA ? 'door' : !gateBOpen ? 'lumo' : 'done';
  return { doorALive, doorAOpen, gateBOpen, stage };
}

/**
 * The HUD lines. The status names the lantern and Lumo, and shows that door A is latched.
 * "Latched" is read from the stage: every stage after 'door' has latch A engaged.
 * `translate` localizes each word of the status at the render boundary; the default keeps the Vietnamese.
 */
export function testRoomHud(
  v: TestRoomView,
  lantern: LanternState,
  lumo: LumoMode,
  translate: (text: string) => string = (text) => text,
): HudText {
  const t = translate;
  const lamp = `${t('Đèn')}: ${t(lantern.location.at === 'hand' ? 'trong tay' : 'trên bệ')} ${t(lantern.on ? 'bật' : 'tắt')}`;
  const latched = v.stage !== 'door' ? t(', đã gài') : '';
  const door = `${t('Cửa A')}: ${t(v.doorAOpen ? 'mở' : 'đóng')}${latched}`;
  const companion = `${t('Lumo')}: ${t(lumo.mode === 'follow' ? 'theo Nhinh' : lumo.mode === 'travelling' ? 'đang bay' : 'giữ ấn')}`;
  return { objective: OBJECTIVES[v.stage], status: `${lamp} · ${door} · ${companion}` };
}

/** The hint ladder for the current step; none once the room is done. */
export function testRoomHint(v: TestRoomView): HintLadder | null {
  return v.stage === 'done' ? null : HINTS[v.stage];
}

/**
 * Every solid of the room in this view: walls, pedestal, latch, marker, the chasms and the closed leaves.
 * The corner defaults to its initial state, so existing callers keep their meaning.
 */
export function testRoomSolids(v: TestRoomView, corner: CornerLive = INITIAL_CORNER): Rect[] {
  const solids: Rect[] = [
    ...TEST_ROOM.walls,
    TEST_ROOM.pedestal,
    TEST_ROOM.latchA,
    TEST_ROOM.marker,
    TEST_ROOM.chasmNorth,
    TEST_ROOM.chasmSouth,
  ];
  if (!v.doorAOpen) solids.push(TEST_ROOM.doorA);
  if (!v.gateBOpen) solids.push(TEST_ROOM.gateB);
  if (!corner.doorCOpen) solids.push(TEST_ROOM.doorC);
  if (!corner.bridgeWalkable) solids.push(TEST_ROOM.bridgeDeck);
  return solids;
}
