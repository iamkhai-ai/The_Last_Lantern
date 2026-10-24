import type { Checkpoint, LevelLayout } from '../../core/level';
import type { Rect } from '../../core/geometry';
import type { PulseMark } from '../../core/pulse';
import type { AuditItem } from '../../core/reachAudit';
import type { LightMark } from '../../core/light';

/** Ids of the four steles. Each is a ring with three directions (0 = N, 1 = SE, 2 = SW). */
export const MOON_ID = 'moon';
export const LEAF_ID = 'leaf';
export const STAR_ID = 'star';
export const WATER_ID = 'water';
/** Ids of the three cranks. X turns Moon and Leaf, Y turns Leaf and Star, Z turns Star and Water. */
export const CRANK_X_ID = 'crankX';
export const CRANK_Y_ID = 'crankY';
export const CRANK_Z_ID = 'crankZ';
/** Id of the gate down to the library. Solid while closed; a light blocker while closed. */
export const GATE_ID = 'gate';
/** Ids of the fixed receiving mouths, one per stele (dark marks). */
export const MOUTH_MOON_ID = 'mouth-moon';
export const MOUTH_LEAF_ID = 'mouth-leaf';
export const MOUTH_STAR_ID = 'mouth-star';
export const MOUTH_WATER_ID = 'mouth-water';
/** Ids of the Pulse marks: the axle links and the crank match marks. */
export const AXLE_X_ID = 'axle-x';
export const AXLE_Y_ID = 'axle-y';
export const AXLE_Z_ID = 'axle-z';
export const CRANK_MARK_X_ID = 'crank-x';
export const CRANK_MARK_Y_ID = 'crank-y';
export const CRANK_MARK_Z_ID = 'crank-z';
/** Checkpoint ids. */
export const START_CHECKPOINT_ID = 'start';
export const SOUTH_CHECKPOINT_ID = 'south';

/** The grove's geometry (world pixels). Extends the generic level layout with its named pieces. */
export interface WhisperingWoodsLayout extends LevelLayout {
  /** The four steles, each a standing block (solid, interactive). */
  readonly steles: Readonly<Record<'moon' | 'leaf' | 'star' | 'water', Rect>>;
  /** The three cranks, each a standing block (solid, interactive). */
  readonly cranks: Readonly<Record<'x' | 'y' | 'z', Rect>>;
  /** The gate leaf in the east wall; solid and a light blocker while closed. */
  readonly gate: Rect;
  /** The exit zone beyond the gate. */
  readonly exitZone: Rect;
}

const checkpoints: readonly Checkpoint[] = [
  { id: START_CHECKPOINT_ID, spawn: { x: 100, y: 230 }, zone: { x: 60, y: 200, width: 100, height: 100 } },
  { id: SOUTH_CHECKPOINT_ID, spawn: { x: 330, y: 300 }, zone: { x: 250, y: 284, width: 160, height: 40 } },
];

/** The grove: one room. Steles and cranks stand on the grove side of the gate; the gate leads down to the library. */
export const WHISPERING_WOODS: WhisperingWoodsLayout = Object.freeze({
  world: { x: 16, y: 96, width: 608, height: 232 },
  walls: Object.freeze([
    // East wall with the gate gap at y 190..230.
    { x: 592, y: 96, width: 8, height: 94 },
    { x: 592, y: 230, width: 8, height: 98 },
  ]),
  checkpoints,
  steles: Object.freeze({
    moon: { x: 160, y: 140, width: 28, height: 28 },
    leaf: { x: 240, y: 140, width: 28, height: 28 },
    star: { x: 320, y: 140, width: 28, height: 28 },
    water: { x: 400, y: 140, width: 28, height: 28 },
  }),
  cranks: Object.freeze({
    // Each crank stands midway between the two steles its axle joins.
    x: { x: 206, y: 262, width: 16, height: 16 },
    y: { x: 286, y: 262, width: 16, height: 16 },
    z: { x: 366, y: 262, width: 16, height: 16 },
  }),
  gate: { x: 592, y: 190, width: 8, height: 40 },
  exitZone: { x: 600, y: 190, width: 24, height: 40 },
});

/**
 * The four fixed receiving mouths, one just south of each stele. Each is a dark mark: its firefly marks show the
 * direction the ring must face, and they read only outside every footprint.
 */
export const WHISPERING_WOODS_LIGHT_MARKS: readonly LightMark[] = Object.freeze([
  { id: MOUTH_MOON_ID, kind: 'dark', rect: { x: 168, y: 178, width: 12, height: 12 } },
  { id: MOUTH_LEAF_ID, kind: 'dark', rect: { x: 248, y: 178, width: 12, height: 12 } },
  { id: MOUTH_STAR_ID, kind: 'dark', rect: { x: 328, y: 178, width: 12, height: 12 } },
  { id: MOUTH_WATER_ID, kind: 'dark', rect: { x: 408, y: 178, width: 12, height: 12 } },
]);

/** Pulse marks: the axle links run along the back of the steles, and each crank carries its match mark. */
export const WHISPERING_WOODS_PULSE_MARKS: readonly PulseMark[] = Object.freeze([
  { id: AXLE_X_ID, x: 214, y: 118 },
  { id: AXLE_Y_ID, x: 294, y: 118 },
  { id: AXLE_Z_ID, x: 374, y: 118 },
  { id: CRANK_MARK_X_ID, x: 214, y: 270 },
  { id: CRANK_MARK_Y_ID, x: 294, y: 270 },
  { id: CRANK_MARK_Z_ID, x: 374, y: 270 },
]);

/** The interactables of the grove (steles and cranks), for the reach audit. */
export const WHISPERING_WOODS_ITEMS: readonly AuditItem[] = Object.freeze([
  { id: MOON_ID, reach: { kind: 'block', rect: WHISPERING_WOODS.steles.moon } },
  { id: LEAF_ID, reach: { kind: 'block', rect: WHISPERING_WOODS.steles.leaf } },
  { id: STAR_ID, reach: { kind: 'block', rect: WHISPERING_WOODS.steles.star } },
  { id: WATER_ID, reach: { kind: 'block', rect: WHISPERING_WOODS.steles.water } },
  { id: CRANK_X_ID, reach: { kind: 'block', rect: WHISPERING_WOODS.cranks.x } },
  { id: CRANK_Y_ID, reach: { kind: 'block', rect: WHISPERING_WOODS.cranks.y } },
  { id: CRANK_Z_ID, reach: { kind: 'block', rect: WHISPERING_WOODS.cranks.z } },
]);
