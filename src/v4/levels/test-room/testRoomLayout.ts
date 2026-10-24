import type { Checkpoint, LevelLayout } from '../../core/level';
import type { Point, Rect } from '../../core/geometry';
import type { PulseMark } from '../../core/pulse';
import type { AuditItem } from '../../core/reachAudit';
import type { LightMark, Room } from '../../core/light';

/** Id of the pedestal that carries the lantern. */
export const PEDESTAL_ID = 's1';
/** Id of the fixed latch A east of door A. */
export const LATCH_ID = 'latchA';
/** Id of the Lumo marker that sends Lumo to the seal. */
export const MARKER_ID = 'm';
/** Id of the seal Lumo holds to open gate B. */
export const SEAL_ID = 'p';
/** Id of the pulse mark that reveals the carving. */
export const CARVING_ID = 'carving';
/** Id of the checkpoint at the west end of the room. */
export const START_CHECKPOINT_ID = 'start';
/** Id of the checkpoint at the east room. */
export const EAST_CHECKPOINT_ID = 'east';
/** Id of door C, the leaf in the corner's south wall. */
export const DOOR_C_ID = 'doorC';
/** Id of flower C, whose two faces sit either side of the corner wall. */
export const FLOWER_ID = 'flowerC';
/** Id of the root bed at the head of the root bridge. */
export const ROOT_BED_ID = 'rootBed';
/** Id of the light mark of spores in the alcove (dark mark). */
export const SPORES_ID = 'spores';
/** Id of the light mark of the etching in the alcove (lit mark). */
export const ETCHING_ID = 'etching';
/** Id of the light mark of the scratch behind the corner's east wall (dark mark). */
export const SCRATCH_ID = 'scratch';

/** The test room's geometry (world pixels). Extends the generic level layout with its named pieces. */
export interface TestRoomLayout extends LevelLayout {
  /** Door A's leaf; solid while the door is closed. */
  readonly doorA: Rect;
  /** Gate B's leaf; solid while the gate is closed. */
  readonly gateB: Rect;
  /** Door C's leaf in the corner's south wall; solid and a light blocker while closed. */
  readonly doorC: Rect;
  /** A foot overlapping this zone holds door C open (bridge rule). */
  readonly doorCThreshold: Rect;
  /** Chasm north of the root bridge; always solid. */
  readonly chasmNorth: Rect;
  /** Chasm south of the root bridge; always solid. */
  readonly chasmSouth: Rect;
  /** The root bridge's deck; solid unless the root bridge is walkable. */
  readonly bridgeDeck: Rect;
  /** Open-face sensor on the floor at the bridge head; not solid. Lighting it blocks the bridge. */
  readonly rootBed: Rect;
  /** Open face of flower C on the west room side; not solid. */
  readonly flowerSouth: Rect;
  /** Open face of flower C on the corner side; not solid. */
  readonly flowerNorth: Rect;
  /** The pedestal s1 (solid). The lantern sits at its centre. */
  readonly pedestal: Rect;
  /** Fixed latch A (solid), east of door A. */
  readonly latchA: Rect;
  /** Lumo marker m (solid). */
  readonly marker: Rect;
  /** Lumo's target point for the seal p. Not solid and not interactive for Nhinh. */
  readonly seal: Point;
  /** The pulse mark that reveals the carving. Not solid. */
  readonly carving: PulseMark;
  /** Trigger east of gate B that leaves the room. */
  readonly exitZone: Rect;
}

const checkpoints: readonly Checkpoint[] = [
  { id: START_CHECKPOINT_ID, spawn: { x: 110, y: 250 }, zone: { x: 60, y: 200, width: 100, height: 100 } },
  { id: EAST_CHECKPOINT_ID, spawn: { x: 380, y: 210 }, zone: { x: 340, y: 180, width: 80, height: 60 } },
];

/** The one test room: a wall split with a door gap, a pedestal, a latch, a Lumo marker and a gate. */
export const TEST_ROOM: TestRoomLayout = Object.freeze({
  world: { x: 16, y: 96, width: 608, height: 232 },
  walls: Object.freeze([
    // West room / east room split at x 316..324, with the door gap at y 190..230.
    { x: 316, y: 96, width: 8, height: 94 },
    { x: 316, y: 230, width: 8, height: 98 },
    // East wall at x 592..600, with the gate B gap at y 190..230.
    { x: 592, y: 96, width: 8, height: 94 },
    { x: 592, y: 230, width: 8, height: 98 },
    // Corner walls: the north-west corner's south wall (door C gap at x 104..134) and its east wall.
    { x: 16, y: 150, width: 88, height: 8 },
    { x: 134, y: 150, width: 16, height: 8 },
    { x: 150, y: 96, width: 8, height: 62 },
  ]),
  checkpoints,
  doorA: { x: 316, y: 190, width: 8, height: 40 },
  gateB: { x: 592, y: 190, width: 8, height: 40 },
  doorC: { x: 104, y: 150, width: 30, height: 8 },
  doorCThreshold: { x: 104, y: 146, width: 30, height: 16 },
  chasmNorth: { x: 46, y: 96, width: 34, height: 16 },
  chasmSouth: { x: 46, y: 136, width: 34, height: 14 },
  bridgeDeck: { x: 46, y: 112, width: 34, height: 24 },
  rootBed: { x: 80, y: 112, width: 12, height: 24 },
  flowerSouth: { x: 96, y: 160, width: 8, height: 8 },
  flowerNorth: { x: 96, y: 140, width: 8, height: 8 },
  pedestal: { x: 180, y: 160, width: 24, height: 24 },
  latchA: { x: 340, y: 248, width: 16, height: 16 },
  marker: { x: 420, y: 140, width: 16, height: 16 },
  seal: { x: 560, y: 132 },
  carving: { id: CARVING_ID, x: 250, y: 290 },
  exitZone: { x: 600, y: 190, width: 24, height: 40 },
});

/**
 * The marks the light can reveal in the test room. Spores and the etching sit in the alcove; the scratch sits in the
 * west room behind the corner's east wall.
 */
export const TEST_ROOM_LIGHT_MARKS: readonly LightMark[] = Object.freeze([
  { id: SPORES_ID, kind: 'dark', rect: { x: 22, y: 104, width: 10, height: 8 } },   // alcove, past the root bridge
  { id: ETCHING_ID, kind: 'lit', rect: { x: 22, y: 132, width: 10, height: 8 } },   // alcove
  { id: SCRATCH_ID, kind: 'dark', rect: { x: 162, y: 110, width: 8, height: 8 } },  // west room, just east of the corner wall
]);

/** The rooms for the "seen" rule. The corner is a part of the west room; the east room starts past the west split. */
export const TEST_ROOM_ROOMS: readonly Room[] = Object.freeze([
  { id: 'corner', rect: { x: 16, y: 96, width: 134, height: 54 } },
  { id: 'west', rect: { x: 16, y: 96, width: 300, height: 232 } },
  { id: 'east', rect: { x: 324, y: 96, width: 268, height: 232 } },
]);

/** The interactables of the test room, for the reach audit. */
export const TEST_ROOM_ITEMS: readonly AuditItem[] = Object.freeze([
  { id: PEDESTAL_ID, reach: { kind: 'block', rect: TEST_ROOM.pedestal } },
  { id: LATCH_ID, reach: { kind: 'block', rect: TEST_ROOM.latchA } },
  { id: MARKER_ID, reach: { kind: 'block', rect: TEST_ROOM.marker } },
]);
