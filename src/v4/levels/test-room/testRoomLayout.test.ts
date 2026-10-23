import { describe, it, expect } from 'vitest';
import { footRectAt } from '../../core/body';
import { pointInRect, rectsOverlap } from '../../core/geometry';
import type { Rect } from '../../core/geometry';
import { placeLantern, initialLantern } from '../../core/lantern';
import { followLumo, callLumo, lumoArrived } from '../../core/lumo';
import { HUD_BANDS } from '../../../ui/hudLayout';
import { auditReach, canReachItem, isFootWalkable } from '../../core/reachAudit';
import type { AuditInput } from '../../core/reachAudit';
import { defaultTestRoomState, deriveTestRoom, testRoomSolids } from './testRoomLogic';
import type { TestRoomView } from './testRoomLogic';
import {
  EAST_CHECKPOINT_ID,
  MARKER_ID,
  PEDESTAL_ID,
  LATCH_ID,
  START_CHECKPOINT_ID,
  TEST_ROOM,
  TEST_ROOM_ITEMS,
} from './testRoomLayout';

/** Door A and gate B both closed: the room as a new game starts. */
const INITIAL: TestRoomView = deriveTestRoom(defaultTestRoomState(), initialLantern(), followLumo());

/** Door A open on the latch, gate B closed. */
const DOOR_OPEN: TestRoomView = deriveTestRoom({ latchA: true }, initialLantern(), followLumo());

/** Everything open: the latch engaged, the lantern on the pedestal, Lumo holding the seal. */
const FULLY_OPEN: TestRoomView = deriveTestRoom(
  { latchA: true },
  placeLantern(initialLantern(), PEDESTAL_ID)!,
  lumoArrived(callLumo(followLumo(), 'p')),
);

function auditInput(v: TestRoomView): AuditInput {
  return { world: TEST_ROOM.world, solids: testRoomSolids(v), hudBands: HUD_BANDS, items: TEST_ROOM_ITEMS };
}

function spawnOf(id: string) {
  const checkpoint = TEST_ROOM.checkpoints.find(c => c.id === id);
  if (!checkpoint) throw new Error(`no checkpoint ${id}`);
  return checkpoint.spawn;
}

function item(id: string) {
  const found = TEST_ROOM_ITEMS.find(i => i.id === id);
  if (!found) throw new Error(`no item ${id}`);
  return found;
}

describe('test room reach audit', () => {
  it('is clean in the initial view', () => {
    expect(auditReach(auditInput(INITIAL))).toEqual([]);
  });

  it('is clean when every door is open', () => {
    expect(auditReach(auditInput(FULLY_OPEN))).toEqual([]);
  });
});

describe('test room reachability', () => {
  it('reaches the pedestal from the start spawn', () => {
    expect(canReachItem(spawnOf(START_CHECKPOINT_ID), item(PEDESTAL_ID), { world: TEST_ROOM.world, solids: testRoomSolids(INITIAL) })).toBe(true);
  });

  it('does not reach latch A from the start spawn while door A is closed', () => {
    expect(canReachItem(spawnOf(START_CHECKPOINT_ID), item(LATCH_ID), { world: TEST_ROOM.world, solids: testRoomSolids(INITIAL) })).toBe(false);
  });

  it('reaches latch A from the start spawn once door A is open', () => {
    expect(canReachItem(spawnOf(START_CHECKPOINT_ID), item(LATCH_ID), { world: TEST_ROOM.world, solids: testRoomSolids(DOOR_OPEN) })).toBe(true);
  });

  it('reaches the Lumo marker from the east spawn', () => {
    expect(canReachItem(spawnOf(EAST_CHECKPOINT_ID), item(MARKER_ID), { world: TEST_ROOM.world, solids: testRoomSolids(INITIAL) })).toBe(true);
  });
});

describe('test room geometry', () => {
  it('keeps both spawns on walkable feet inside their checkpoint zones, in both views', () => {
    for (const v of [INITIAL, FULLY_OPEN]) {
      const solids = testRoomSolids(v);
      for (const c of TEST_ROOM.checkpoints) {
        expect(pointInRect(c.spawn, c.zone)).toBe(true);
        expect(isFootWalkable(footRectAt(c.spawn), { world: TEST_ROOM.world, solids })).toBe(true);
      }
    }
  });

  it('places the door gaps where the leaves close them', () => {
    const { doorA, gateB } = TEST_ROOM;
    for (const leaf of [doorA, gateB]) {
      expect(leaf.y).toBe(190);
      expect(leaf.y + leaf.height).toBe(230);
      expect(TEST_ROOM.walls.some((wall: Rect) => rectsOverlap(wall, leaf))).toBe(false);
    }
  });

  it('puts the exit zone beyond gate B', () => {
    expect(TEST_ROOM.exitZone.x).toBeGreaterThanOrEqual(TEST_ROOM.gateB.x + TEST_ROOM.gateB.width);
  });
});
