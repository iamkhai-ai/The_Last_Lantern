import type { Checkpoint, LevelLayout } from '../../core/level';
import type { Point, Rect } from '../../core/geometry';
import type { PulseMark } from '../../core/pulse';
import type { AuditItem } from '../../core/reachAudit';

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

/** The test room's geometry (world pixels). Extends the generic level layout with its named pieces. */
export interface TestRoomLayout extends LevelLayout {
  /** Door A's leaf; solid while the door is closed. */
  readonly doorA: Rect;
  /** Gate B's leaf; solid while the gate is closed. */
  readonly gateB: Rect;
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
  ]),
  checkpoints,
  doorA: { x: 316, y: 190, width: 8, height: 40 },
  gateB: { x: 592, y: 190, width: 8, height: 40 },
  pedestal: { x: 180, y: 160, width: 24, height: 24 },
  latchA: { x: 340, y: 248, width: 16, height: 16 },
  marker: { x: 420, y: 140, width: 16, height: 16 },
  seal: { x: 560, y: 132 },
  carving: { id: CARVING_ID, x: 250, y: 290 },
  exitZone: { x: 600, y: 190, width: 24, height: 40 },
});

/** The interactables of the test room, for the reach audit. */
export const TEST_ROOM_ITEMS: readonly AuditItem[] = Object.freeze([
  { id: PEDESTAL_ID, reach: { kind: 'block', rect: TEST_ROOM.pedestal } },
  { id: LATCH_ID, reach: { kind: 'block', rect: TEST_ROOM.latchA } },
  { id: MARKER_ID, reach: { kind: 'block', rect: TEST_ROOM.marker } },
]);
