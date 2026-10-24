import { describe, it, expect } from 'vitest';
import { footRectAt } from '../../core/body';
import type { Point } from '../../core/geometry';
import { FACINGS, canSeeMark, groundPoint, isMarkReadable, isRectLit, lanternFootprints, roomAt } from '../../core/light';
import type { Footprint, LightMark } from '../../core/light';
import { hasAimArea } from '../../core/lightAudit';
import type { AimInput } from '../../core/lightAudit';
import { initialLantern, placeLantern } from '../../core/lantern';
import { callLumo, followLumo, lumoArrived } from '../../core/lumo';
import { auditReach, reachableFeet } from '../../core/reachAudit';
import type { AuditInput } from '../../core/reachAudit';
import { HUD_BANDS } from '../../../ui/hudLayout';
import {
  ETCHING_ID,
  PEDESTAL_ID,
  SCRATCH_ID,
  SPORES_ID,
  START_CHECKPOINT_ID,
  TEST_ROOM,
  TEST_ROOM_ITEMS,
  TEST_ROOM_LIGHT_MARKS,
  TEST_ROOM_ROOMS,
} from './testRoomLayout';
import {
  INITIAL_CORNER,
  deriveTestRoom,
  defaultTestRoomState,
  stepCorner,
  testRoomBlockers,
  testRoomSolids,
} from './testRoomLogic';
import type { CornerLive, TestRoomView } from './testRoomLogic';

/** Door A and gate B both closed: the room as a new game starts. */
const INITIAL: TestRoomView = deriveTestRoom(defaultTestRoomState(), initialLantern(), followLumo());

/** Everything open: the latch engaged, the lantern on the pedestal, Lumo holding the seal. */
const FULLY_OPEN: TestRoomView = deriveTestRoom(
  { latchA: true },
  placeLantern(initialLantern(), PEDESTAL_ID)!,
  lumoArrived(callLumo(followLumo(), 'p')),
);

/** Door C open and the root bridge walkable: the whole corner is reachable. */
const CORNER_OPEN: CornerLive = { ...INITIAL_CORNER, doorCOpen: true };

const START: Point = TEST_ROOM.checkpoints.find(c => c.id === START_CHECKPOINT_ID)!.spawn;

const flowerSouth = TEST_ROOM.flowerSouth;
const flowerNorth = TEST_ROOM.flowerNorth;
const rootBed = TEST_ROOM.rootBed;

function markOf(id: string): LightMark {
  const mark = TEST_ROOM_LIGHT_MARKS.find(m => m.id === id);
  if (!mark) throw new Error(`no light mark ${id}`);
  return mark;
}

/** Aim input for the corner state, from the start spawn, in the initial view. */
function aimInput(corner: CornerLive): AimInput {
  return {
    world: TEST_ROOM.world,
    solids: testRoomSolids(INITIAL, corner),
    blockers: testRoomBlockers(INITIAL, corner),
    start: START,
  };
}

/** Ground points of every walkable actor position reachable from the start, for the given corner state. */
function reachableGrounds(corner: CornerLive): Point[] {
  const keys = reachableFeet(START, { world: TEST_ROOM.world, solids: testRoomSolids(INITIAL, corner) });
  return [...keys].map(key => {
    const [x, y] = key.split(',').map(Number);
    return groundPoint({ x, y });
  });
}

/** Whether a ground point stands in the corner room. */
function inCorner(ground: Point): boolean {
  return roomAt(ground, TEST_ROOM_ROOMS) === 'corner';
}

/** Whether a ground point stands in the alcove: the corner, west of the chasm. */
function inAlcove(ground: Point): boolean {
  return inCorner(ground) && ground.x < 46;
}

describe('test room light corner: aim', () => {
  it('lets Nhinh light flower C from the west room', () => {
    expect(hasAimArea({ hit: [flowerSouth], avoid: [rootBed] }, aimInput(CORNER_OPEN))).toBe(true);
  });

  it('lets Nhinh light flower C from the corner, while the root bed stays dark, and makes the trade-off real', () => {
    const input = aimInput(CORNER_OPEN);
    expect(hasAimArea({ hit: [flowerNorth], avoid: [rootBed] }, input)).toBe(true);

    const blockers = input.blockers;
    let both = false;
    for (const ground of reachableGrounds(CORNER_OPEN)) {
      if (!inCorner(ground)) continue;
      for (const facing of FACINGS) {
        const footprints = lanternFootprints(initialLantern(), ground, facing, () => null);
        if (isRectLit(flowerNorth, footprints, blockers) && isRectLit(rootBed, footprints, blockers)) {
          both = true;
        }
      }
    }
    expect(both).toBe(true);
  });
});

describe('test room light corner: bridge approach', () => {
  it('lights the root bed when Nhinh faces left from the bridge head, not when she faces up', () => {
    const blockers = testRoomBlockers(INITIAL, CORNER_OPEN);
    const ground = groundPoint({ x: 110, y: 110 });
    expect(isRectLit(rootBed, lanternFootprints(initialLantern(), ground, 'left', () => null), blockers)).toBe(true);
    expect(isRectLit(rootBed, lanternFootprints(initialLantern(), ground, 'up', () => null), blockers)).toBe(false);
  });
});

describe('test room light corner: closed door C', () => {
  it('lights flower C north of the wall but not south of it, while door C is closed', () => {
    const blockers = testRoomBlockers(INITIAL, INITIAL_CORNER);
    const footprints = lanternFootprints(initialLantern(), groundPoint({ x: 100, y: 128 }), 'down', () => null);
    expect(isRectLit(flowerNorth, footprints, blockers)).toBe(true);
    expect(isRectLit(flowerSouth, footprints, blockers)).toBe(false);
  });
});

describe('test room light corner: stepCorner', () => {
  const blockers = testRoomBlockers(INITIAL, INITIAL_CORNER);
  const litFlower = lanternFootprints(initialLantern(), groundPoint({ x: 100, y: 128 }), 'down', () => null);
  const litBed = lanternFootprints(initialLantern(), groundPoint({ x: 60, y: 110 }), 'right', () => null);
  const noFootprints: Footprint[] = [];

  it('opens door C when flower C is lit', () => {
    const next = stepCorner(INITIAL_CORNER, litFlower, blockers, footRectAt({ x: 100, y: 128 }));
    expect(next.flowerLit).toBe(true);
    expect(next.doorCOpen).toBe(true);
  });

  it('keeps door C open while the foot holds the threshold, even with flower C dark', () => {
    const footAtThreshold = footRectAt({ x: 110, y: 130 });
    const prev: CornerLive = { ...INITIAL_CORNER, doorCOpen: true };
    expect(stepCorner(prev, noFootprints, blockers, footAtThreshold).doorCOpen).toBe(true);
  });

  it('closes door C when flower C is dark and the foot is away from the threshold', () => {
    const prev: CornerLive = { ...INITIAL_CORNER, doorCOpen: true };
    expect(stepCorner(prev, noFootprints, blockers, footRectAt(START)).doorCOpen).toBe(false);
  });

  it('makes the bridge unwalkable while the root bed is lit and the foot is off the deck', () => {
    const next = stepCorner(INITIAL_CORNER, litBed, blockers, footRectAt({ x: 110, y: 110 }));
    expect(next.bedLit).toBe(true);
    expect(next.bridgeWalkable).toBe(false);
  });

  it('holds the bridge walkable while the root bed is lit only if the foot is on the deck and it was walkable', () => {
    const onDeck = footRectAt({ x: 60, y: 110 });
    const held = stepCorner({ ...INITIAL_CORNER, bridgeWalkable: true }, litBed, blockers, onDeck);
    expect(held.bridgeWalkable).toBe(true);
    const notHeld = stepCorner({ ...INITIAL_CORNER, bridgeWalkable: false }, litBed, blockers, onDeck);
    expect(notHeld.bridgeWalkable).toBe(false);
  });

  it('keeps the bridge walkable while the root bed is dark', () => {
    const prev: CornerLive = { ...INITIAL_CORNER, bridgeWalkable: false };
    expect(stepCorner(prev, noFootprints, blockers, footRectAt({ x: 110, y: 110 })).bridgeWalkable).toBe(true);
  });
});

describe('test room light corner: reach', () => {
  it('reaches no corner position from the start while door C is closed', () => {
    expect(reachableGrounds(INITIAL_CORNER).some(inCorner)).toBe(false);
  });

  it('reaches the alcove with door C open and the bridge walkable', () => {
    expect(reachableGrounds(CORNER_OPEN).some(inAlcove)).toBe(true);
  });

  it('reaches no alcove position with door C open and the bridge not walkable', () => {
    const closedBridge: CornerLive = { ...CORNER_OPEN, bridgeWalkable: false };
    expect(reachableGrounds(closedBridge).some(inAlcove)).toBe(false);
  });
});

describe('test room light corner: seen marks', () => {
  const blockers = testRoomBlockers(INITIAL, CORNER_OPEN);

  it('does not show the scratch from any reachable corner position', () => {
    const scratch = markOf(SCRATCH_ID);
    const cornerGrounds = reachableGrounds(CORNER_OPEN).filter(inCorner);
    expect(cornerGrounds.length).toBeGreaterThan(0);
    for (const ground of cornerGrounds) {
      expect(canSeeMark(ground, scratch, blockers, TEST_ROOM_ROOMS)).toBe(false);
    }
  });

  it('shows the scratch from the west room, east of the corner wall', () => {
    const scratch = markOf(SCRATCH_ID);
    expect(canSeeMark(groundPoint({ x: 190, y: 120 }), scratch, blockers, TEST_ROOM_ROOMS)).toBe(true);
  });

  it('reads the spores with no footprints and sees them from a reachable corner position', () => {
    const spores = markOf(SPORES_ID);
    expect(isMarkReadable(spores, [], blockers)).toBe(true);
    expect(reachableGrounds(CORNER_OPEN).some(ground => inCorner(ground) && canSeeMark(ground, spores, blockers, TEST_ROOM_ROOMS))).toBe(true);
  });

  it('finds an aim area that lights the etching and sees it', () => {
    const etching = markOf(ETCHING_ID);
    expect(hasAimArea(
      { hit: [etching.rect], avoid: [], seen: etching, rooms: TEST_ROOM_ROOMS },
      aimInput(CORNER_OPEN),
    )).toBe(true);
  });
});

describe('test room light corner: reach audit', () => {
  function auditFor(v: TestRoomView, corner: CornerLive): AuditInput {
    return { world: TEST_ROOM.world, solids: testRoomSolids(v, corner), hudBands: HUD_BANDS, items: TEST_ROOM_ITEMS };
  }

  it('stays clean in the initial view, the fully-open view, and both with the corner open', () => {
    expect(auditReach(auditFor(INITIAL, INITIAL_CORNER))).toEqual([]);
    expect(auditReach(auditFor(FULLY_OPEN, INITIAL_CORNER))).toEqual([]);
    expect(auditReach(auditFor(INITIAL, CORNER_OPEN))).toEqual([]);
    expect(auditReach(auditFor(FULLY_OPEN, CORNER_OPEN))).toEqual([]);
  });
});

