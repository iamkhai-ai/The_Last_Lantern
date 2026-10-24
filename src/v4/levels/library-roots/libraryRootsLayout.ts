import type { Checkpoint, LevelLayout } from '../../core/level';
import type { Point, Rect } from '../../core/geometry';
import type { PulseMark } from '../../core/pulse';
import type { AuditItem } from '../../core/reachAudit';
import type { LightMark, Room } from '../../core/light';

/** Interactable ids. Racks and sockets are indexed in the order of the arrays below. */
export const RACK_IDS: readonly string[] = ['rack0', 'rack1', 'rack2', 'rack3'];
export const SOCKET_IDS: readonly string[] = ['sock0', 'sock1', 'sock2', 'sock3'];
export const VALVE_IDS: readonly string[] = ['valve0', 'valve1', 'valve2', 'valve3'];
export const WELL_ID = 'well';
export const WHEEL_ID = 'wheel';
export const LEVER_ID = 'lever';
export const CRYSTAL_ID = 'crystal';
export const DESK_ID = 'desk';

/** Checkpoint ids. The well checkpoint is the default (first in the list). */
export const WELL_CHECKPOINT_ID = 'well';
export const BACK_CHECKPOINT_ID = 'back';

/** Pulse marks: the static shaft from the well to the model and the two carved pipes under the moss. */
export const PULSE_SHAFT_ID = 'shaft';
export const PULSE_FEED_ID = 'pipe-feed';
export const PULSE_RETURN_ID = 'pipe-return';

/** The practice sheet by the desk: a two-layer example with other symbols. It has no answer. */
export const PRACTICE_LIT_ID = 'practice-lit';
export const PRACTICE_DARK_ID = 'practice-dark';

/** The library's geometry (world pixels). One room pair: the well room (west) and the model room behind the door. */
export interface LibraryLayout extends LevelLayout {
  /** The record-room door leaf in the wall gap; solid and a light blocker while closed. */
  readonly door: Rect;
  /** The well at the centre of the well room. Solid; running the test happens here. */
  readonly well: Rect;
  /** Four rack holders on the west wall. Tablets rest here at the start. Solid. */
  readonly rack: readonly Rect[];
  /** Four sockets around the well: north (start mark), east, south, west. Solid. */
  readonly sockets: readonly Rect[];
  /** The desk with the practice sheet on its top. Solid. */
  readonly desk: Rect;
  /** The practice sheet: both practice marks sit on this rect. */
  readonly practiceSheet: Rect;
  /** The model body in the model room. Solid. */
  readonly model: Rect;
  /** Four two-way valves, one per model stage. Solid. */
  readonly valves: readonly Rect[];
  /** The wheel that steps the model one stage at a time. Solid. */
  readonly wheel: Rect;
  /** The confirm lever next to the wheel. Solid. */
  readonly lever: Rect;
  /** The Memory crystal compartment; it opens once the model is locked. Solid. */
  readonly crystal: Rect;
  /** Trigger on the south-east edge of the model room. Not solid. */
  readonly exitZone: Rect;
}

const SOCKET_SIZE = 16;
const VALVE_Y = 178;

export const LIBRARY: LibraryLayout = Object.freeze({
  world: { x: 16, y: 96, width: 608, height: 232 },
  walls: Object.freeze([
    // The wall between the well room and the model room, with the door gap at y 200..240.
    { x: 344, y: 96, width: 8, height: 104 },
    { x: 344, y: 240, width: 8, height: 88 },
  ]),
  checkpoints: Object.freeze([
    { id: WELL_CHECKPOINT_ID, spawn: { x: 250, y: 252 }, zone: { x: 222, y: 236, width: 60, height: 40 } },
    { id: BACK_CHECKPOINT_ID, spawn: { x: 432, y: 258 }, zone: { x: 400, y: 236, width: 64, height: 44 } },
  ] as readonly Checkpoint[]),
  door: { x: 344, y: 200, width: 8, height: 40 },
  well: { x: 164, y: 194, width: 32, height: 32 },
  rack: Object.freeze([
    { x: 28, y: 126, width: 16, height: 16 },
    { x: 28, y: 166, width: 16, height: 16 },
    { x: 28, y: 206, width: 16, height: 16 },
    { x: 28, y: 246, width: 16, height: 16 },
  ]),
  sockets: Object.freeze([
    // North: the start mark sits here. Then east, south, west.
    { x: 172, y: 136, width: SOCKET_SIZE, height: SOCKET_SIZE },
    { x: 216, y: 202, width: SOCKET_SIZE, height: SOCKET_SIZE },
    { x: 172, y: 268, width: SOCKET_SIZE, height: SOCKET_SIZE },
    { x: 124, y: 202, width: SOCKET_SIZE, height: SOCKET_SIZE },
  ]),
  desk: { x: 262, y: 112, width: 40, height: 20 },
  practiceSheet: { x: 270, y: 116, width: 12, height: 10 },
  model: { x: 368, y: 96, width: 236, height: 52 },
  valves: Object.freeze([392, 456, 520, 584].map((x) => ({ x, y: VALVE_Y, width: 16, height: 16 }))),
  wheel: { x: 370, y: 240, width: 20, height: 20 },
  lever: { x: 372, y: 276, width: 14, height: 18 },
  crystal: { x: 548, y: 150, width: 16, height: 16 },
  exitZone: { x: 600, y: 256, width: 24, height: 40 },
});

/** The pulse marks: the shaft in the well room, the two pipes between the model and the valves. */
export const LIBRARY_PULSE_MARKS: readonly PulseMark[] = Object.freeze([
  { id: PULSE_SHAFT_ID, x: 300, y: 216 },
  { id: PULSE_FEED_ID, x: 420, y: 162 },
  { id: PULSE_RETURN_ID, x: 492, y: 162 },
]);

/** The practice marks: a lit mark and a dark mark on the same sheet, with symbols that are not in the model. */
export const LIBRARY_PRACTICE_MARKS: readonly LightMark[] = Object.freeze([
  { id: PRACTICE_LIT_ID, kind: 'lit', rect: LIBRARY.practiceSheet },
  { id: PRACTICE_DARK_ID, kind: 'dark', rect: LIBRARY.practiceSheet },
]);

/** The two rooms for the "seen" rule. */
export const LIBRARY_ROOMS: readonly Room[] = Object.freeze([
  { id: 'well', rect: { x: 16, y: 96, width: 328, height: 232 } },
  { id: 'back', rect: { x: 352, y: 96, width: 272, height: 232 } },
]);

/** The interactables of the library, for the reach audit. Racks and sockets share one reach rule. */
export const LIBRARY_ITEMS: readonly AuditItem[] = Object.freeze([
  ...LIBRARY.rack.map((rect, i) => ({ id: RACK_IDS[i], reach: { kind: 'block' as const, rect } })),
  ...LIBRARY.sockets.map((rect, i) => ({ id: SOCKET_IDS[i], reach: { kind: 'block' as const, rect } })),
  { id: WELL_ID, reach: { kind: 'block' as const, rect: LIBRARY.well } },
  { id: DESK_ID, reach: { kind: 'block' as const, rect: LIBRARY.desk } },
  ...LIBRARY.valves.map((rect, i) => ({ id: VALVE_IDS[i], reach: { kind: 'block' as const, rect } })),
  { id: WHEEL_ID, reach: { kind: 'block' as const, rect: LIBRARY.wheel } },
  { id: LEVER_ID, reach: { kind: 'block' as const, rect: LIBRARY.lever } },
  { id: CRYSTAL_ID, reach: { kind: 'block' as const, rect: LIBRARY.crystal } },
]);

/** Inset of a holder's rect, where a tablet's marks sit. */
export function tabletRect(holder: Rect): Rect {
  return { x: holder.x + 1, y: holder.y + 1, width: holder.width - 2, height: holder.height - 2 };
}

/** The point a tablet carried in the hand sits on: the centre of the foot body. */
export function handRect(ground: Point): Rect {
  return { x: ground.x - 7, y: ground.y - 7, width: 14, height: 14 };
}
