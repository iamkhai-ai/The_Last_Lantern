import { describe, it, expect } from 'vitest';
import { setFixedLatch } from '../../core/latch';
import { initialLantern, pickUpLantern, placeLantern, toggleLantern } from '../../core/lantern';
import type { LanternState } from '../../core/lantern';
import { callLumo, followLumo, lumoArrived, recallLumo } from '../../core/lumo';
import type { LumoMode } from '../../core/lumo';
import {
  CARVING_JOURNAL_TEXT,
  defaultTestRoomState,
  deriveTestRoom,
  parseTestRoomState,
  testRoomHint,
  testRoomHud,
  testRoomSolids,
} from './testRoomLogic';
import type { TestRoomState, TestRoomView } from './testRoomLogic';
import { PEDESTAL_ID, SEAL_ID, TEST_ROOM } from './testRoomLayout';

const CLOSED_VIEW: TestRoomView = { doorALive: false, doorAOpen: false, gateBOpen: false, stage: 'door' };

describe('deriveTestRoom', () => {
  it('starts with the lantern in hand, both doors closed and stage door', () => {
    const v = deriveTestRoom(defaultTestRoomState(), initialLantern(), followLumo());
    expect(v).toEqual(CLOSED_VIEW);
  });

  it('opens door A while the lit lantern sits on the pedestal', () => {
    const lantern = placeLantern(initialLantern(), PEDESTAL_ID)!;
    const v = deriveTestRoom({ latchA: false }, lantern, followLumo());
    expect(v).toEqual({ doorALive: true, doorAOpen: true, gateBOpen: false, stage: 'door' });
  });

  it('keeps door A open after the latch engages, even with the lantern gone', () => {
    const v = deriveTestRoom({ latchA: true }, initialLantern(), followLumo());
    expect(v.doorAOpen).toBe(true);
    expect(v.doorALive).toBe(false);
    expect(v.stage).toBe('lumo');
  });
});

describe('the reference path', () => {
  it('goes from the pedestal to the latch, the pick-up, Lumo and gate B', () => {
    let lantern: LanternState = initialLantern();
    let lumo: LumoMode = followLumo();
    let s: TestRoomState = defaultTestRoomState();

    // Place the lantern on the pedestal: door A goes live.
    lantern = placeLantern(lantern, PEDESTAL_ID)!;
    let v = deriveTestRoom(s, lantern, lumo);
    expect(v).toEqual({ doorALive: true, doorAOpen: true, gateBOpen: false, stage: 'door' });

    // Engage the latch while the door is really open.
    const engaged = setFixedLatch(false, true, v.doorALive);
    expect(engaged).toBe(true);
    s = { latchA: engaged! };
    v = deriveTestRoom(s, lantern, lumo);
    expect(v.stage).toBe('lumo');

    // Pick up the lantern: the door stays open on the latch.
    lantern = pickUpLantern(lantern, PEDESTAL_ID)!;
    v = deriveTestRoom(s, lantern, lumo);
    expect(v).toEqual({ doorALive: false, doorAOpen: true, gateBOpen: false, stage: 'lumo' });

    // Call Lumo to the seal: gate B is still closed until he arrives.
    lumo = callLumo(lumo, SEAL_ID);
    expect(deriveTestRoom(s, lantern, lumo).gateBOpen).toBe(false);

    lumo = lumoArrived(lumo);
    v = deriveTestRoom(s, lantern, lumo);
    expect(v).toEqual({ doorALive: false, doorAOpen: true, gateBOpen: true, stage: 'done' });
  });
});

describe('door A rules', () => {
  it('closes the door when the lantern is picked up before the latch is engaged', () => {
    let lantern = placeLantern(initialLantern(), PEDESTAL_ID)!;
    expect(deriveTestRoom(defaultTestRoomState(), lantern, followLumo()).doorAOpen).toBe(true);
    lantern = pickUpLantern(lantern, PEDESTAL_ID)!;
    expect(deriveTestRoom(defaultTestRoomState(), lantern, followLumo()).doorAOpen).toBe(false);
  });

  it('refuses to engage the latch while door A is closed', () => {
    const v = deriveTestRoom(defaultTestRoomState(), initialLantern(), followLumo());
    expect(setFixedLatch(false, true, v.doorALive)).toBeNull();
  });

  it('closes an unlatched door when the lantern is turned off on the pedestal', () => {
    const lantern = toggleLantern(placeLantern(initialLantern(), PEDESTAL_ID)!);
    expect(deriveTestRoom(defaultTestRoomState(), lantern, followLumo()).doorAOpen).toBe(false);
  });
});

describe('gate B rules', () => {
  it('closes gate B when Lumo is recalled from the seal', () => {
    const holding = lumoArrived(callLumo(followLumo(), 'p'));
    const lantern = initialLantern();
    expect(deriveTestRoom({ latchA: true }, lantern, holding).gateBOpen).toBe(true);
    const recalled = recallLumo(holding);
    expect(deriveTestRoom({ latchA: true }, lantern, recalled).gateBOpen).toBe(false);
  });
});

describe('parseTestRoomState', () => {
  it('keeps a valid state', () => {
    expect(parseTestRoomState({ latchA: true })).toEqual({ latchA: true });
  });

  it('repairs anything else to the default', () => {
    for (const raw of [null, undefined, 'x', 3, [], { latchA: 'yes' }, {}]) {
      expect(parseTestRoomState(raw)).toEqual({ latchA: false });
    }
  });
});

describe('testRoomHud', () => {
  it('shows the door objective and status at the start', () => {
    expect(testRoomHud(CLOSED_VIEW, initialLantern(), followLumo())).toEqual({
      objective: 'Mở cửa A và giữ nó mở.',
      status: 'Đèn: trong tay bật · Cửa A: đóng · Lumo: theo Nhinh',
    });
  });

  it('shows the lantern on the pedestal, off, with the latch engaged and Lumo travelling', () => {
    const lantern = toggleLantern(placeLantern(initialLantern(), PEDESTAL_ID)!);
    const lumo = callLumo(followLumo(), 'p');
    const v = deriveTestRoom({ latchA: true }, lantern, lumo);
    expect(testRoomHud(v, lantern, lumo)).toEqual({
      objective: 'Nhờ Lumo mở cổng B.',
      status: 'Đèn: trên bệ tắt · Cửa A: mở, đã gài · Lumo: đang bay',
    });
  });

  it('shows the done objective and Lumo holding the seal', () => {
    const lumo = lumoArrived(callLumo(followLumo(), 'p'));
    const lantern = initialLantern();
    const v = deriveTestRoom({ latchA: true }, lantern, lumo);
    expect(testRoomHud(v, lantern, lumo)).toEqual({
      objective: 'Đi qua cổng B.',
      status: 'Đèn: trong tay bật · Cửa A: mở, đã gài · Lumo: giữ ấn',
    });
  });
});

describe('testRoomHint', () => {
  it('gives the door ladder before the latch and the Lumo ladder after it', () => {
    expect(testRoomHint(CLOSED_VIEW)?.key).toBe('test-room:door');
    expect(testRoomHint({ ...CLOSED_VIEW, doorAOpen: true, stage: 'lumo' })?.key).toBe('test-room:lumo');
  });

  it('gives no ladder once the room is done', () => {
    expect(testRoomHint({ ...CLOSED_VIEW, doorAOpen: true, gateBOpen: true, stage: 'done' })).toBeNull();
  });

  it('keeps the plan wording for the first door hint', () => {
    expect(testRoomHint(CLOSED_VIEW)?.steps[0]).toBe('Cửa A có mắt nhận ở phía bệ đèn.');
  });
});

describe('testRoomSolids', () => {
  it('includes both closed leaves in the initial view', () => {
    const solids = testRoomSolids(CLOSED_VIEW);
    expect(solids).toContainEqual(TEST_ROOM.doorA);
    expect(solids).toContainEqual(TEST_ROOM.gateB);
    expect(solids).toContainEqual(TEST_ROOM.pedestal);
    expect(solids).toContainEqual(TEST_ROOM.latchA);
    expect(solids).toContainEqual(TEST_ROOM.marker);
  });

  it('drops each leaf once its door is open', () => {
    const solids = testRoomSolids({ doorALive: true, doorAOpen: true, gateBOpen: true, stage: 'done' });
    expect(solids).not.toContainEqual(TEST_ROOM.doorA);
    expect(solids).not.toContainEqual(TEST_ROOM.gateB);
    expect(solids).toContainEqual(TEST_ROOM.pedestal);
  });
});

describe('carving journal text', () => {
  it('describes the cause, not the lantern in hand', () => {
    expect(CARVING_JOURNAL_TEXT).toBe('Nét khắc: cửa A nhận ánh sáng từ bệ, không từ đèn cầm tay.');
  });
});
