import type { Rect } from '../../core/geometry';
import type { HintLadder } from '../../core/hints';
import type { HudText } from '../../core/level';
import { isDoorOpen } from '../../core/latch';
import { lanternFeeds } from '../../core/lantern';
import type { LanternState } from '../../core/lantern';
import { lumoHolds } from '../../core/lumo';
import type { LumoMode } from '../../core/lumo';
import { PEDESTAL_ID, SEAL_ID, TEST_ROOM } from './testRoomLayout';

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

/** Every solid of the room in this view: walls, pedestal, latch, marker and the closed leaves. */
export function testRoomSolids(v: TestRoomView): Rect[] {
  const solids: Rect[] = [...TEST_ROOM.walls, TEST_ROOM.pedestal, TEST_ROOM.latchA, TEST_ROOM.marker];
  if (!v.doorAOpen) solids.push(TEST_ROOM.doorA);
  if (!v.gateBOpen) solids.push(TEST_ROOM.gateB);
  return solids;
}
