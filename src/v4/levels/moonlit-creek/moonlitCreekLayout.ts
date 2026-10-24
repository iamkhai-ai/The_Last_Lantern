import { rectCenter } from '../../core/geometry';
import type { Checkpoint, LevelLayout } from '../../core/level';
import type { Point, Rect } from '../../core/geometry';
import type { PulseMark } from '../../core/pulse';
import type { AuditItem } from '../../core/reachAudit';
import type { LightMark, Room } from '../../core/light';

/** Ids of the level's pieces. Saved and read by the logic; keep them stable. */
export const PEDESTAL_S_ID = 'S';
export const MIRROR_G1_ID = 'G1';
export const MIRROR_G2_ID = 'G2';
export const CRANK_G1_ID = 'crankG1';
export const CRANK_G2_ID = 'crankG2';
export const RESTORE_A_ID = 'restoreA';
export const RESTORE_B_ID = 'restoreB';
export const LATCH_A_ID = 'latchA';
export const LATCH_B_ID = 'latchB';
export const VALVE_N_ID = 'valveN';
export const TEST_T_ID = 'testT';
export const STOP_ID = 'stop';
export const DIAGRAM_ID = 'diagram';
export const START_CHECKPOINT_ID = 'west';
export const ISLAND_CHECKPOINT_ID = 'island';
export const EAST_CHECKPOINT_ID = 'east';

/** Pulse marks: the West diagram reveals the static routes, the valve and the two main pipes. */
export const PIPE_BEN_WEST_ID = 'pipe-ben-west';
export const PIPE_BEN_RAY_ID = 'pipe-ben-ray';
export const PIPE_RE_RAY_ID = 'pipe-re-ray';
export const PIPE_RE_ISLAND_ID = 'pipe-re-island';
export const PIPE_BEN_EAST_ID = 'pipe-ben-east';
export const PIPE_RE_EAST_ID = 'pipe-re-east';

/** Width of a ray strip, px (puzzle-contracts §1 "Tia của mạng gương"). */
export const RAY_WIDTH = 6;

/** The moonlit creek layout (world pixels). Bridges A and B cross two vertical channels; the island sits between. */
export interface MoonlitCreekLayout extends LevelLayout {
  /** Channel 1 north and south of bridge A's deck. Always solid. */
  readonly chasmANorth: Rect;
  readonly chasmASouth: Rect;
  /** Bridge A's deck: solid unless walkable. */
  readonly deckA: Rect;
  /** Channel 2 north and south of bridge B's deck. Always solid. */
  readonly chasmBNorth: Rect;
  readonly chasmBSouth: Rect;
  /** Bridge B's deck: solid unless walkable. */
  readonly deckB: Rect;
  /** Pedestal S on the West bank (solid). The lantern sits at its centre. */
  readonly pedestalS: Rect;
  /** Mirror G1 on the West bank (solid). */
  readonly mirrorG1: Rect;
  /** Mirror G2 on the island (solid). */
  readonly mirrorG2: Rect;
  /** Drive cranks on the island: G1 toggles A/G2, G2 toggles B/T. */
  readonly crankG1: Rect;
  readonly crankG2: Rect;
  /** Restore crank A on the West bank: aims G1 at bridge A. */
  readonly restoreA: Rect;
  /** Restore crank B on the East bank: aims G1 at G2 and G2 at bridge B. */
  readonly restoreB: Rect;
  /** Latch A on the East bank, fed by a long rod along the channel. */
  readonly latchA: Rect;
  /** Latch B on the East bank, beside bridge B's far head. */
  readonly latchB: Rect;
  /** Valve N on the East bank, off the walking line. */
  readonly valveN: Rect;
  /** Test station T on the East bank (sealed socket, solid). */
  readonly testT: Rect;
  /** The presentation board beside T. Decorative only; not solid. */
  readonly board: Rect;
  /** Stop button beside the board. */
  readonly stop: Rect;
  /** Exit steps on the East edge, toward the tower. */
  readonly exitZone: Rect;
  /** Pulse diagram point on the West bank. */
  readonly diagram: Point;
  /** Mirror-ray endpoints. The bridge eyes sit on each deck's near face; T on its west face. */
  readonly eyeA: Point;
  readonly eyeB: Point;
  readonly eyeT: Point;
}

const checkpoints: readonly Checkpoint[] = [
  { id: START_CHECKPOINT_ID, spawn: { x: 110, y: 240 }, zone: { x: 60, y: 200, width: 100, height: 70 } },
  { id: ISLAND_CHECKPOINT_ID, spawn: { x: 330, y: 236 }, zone: { x: 320, y: 220, width: 30, height: 30 } },
  { id: EAST_CHECKPOINT_ID, spawn: { x: 482, y: 230 }, zone: { x: 470, y: 214, width: 40, height: 30 } },
];

export const MOONLIT_CREEK: MoonlitCreekLayout = Object.freeze({
  world: { x: 0, y: 0, width: 640, height: 360 },
  walls: Object.freeze([
    // A rock wall on the West bank: a light blocker, clear of every ray.
    { x: 120, y: 96, width: 8, height: 60 },
    // A rock wall on the East bank, north of the walking line: a light blocker, clear of every ray.
    { x: 600, y: 96, width: 8, height: 60 },
  ]),
  checkpoints,
  chasmANorth: { x: 208, y: 0, width: 64, height: 170 },
  chasmASouth: { x: 208, y: 190, width: 64, height: 170 },
  deckA: { x: 208, y: 170, width: 64, height: 20 },
  chasmBNorth: { x: 368, y: 0, width: 64, height: 250 },
  chasmBSouth: { x: 368, y: 270, width: 64, height: 90 },
  deckB: { x: 368, y: 250, width: 64, height: 20 },
  pedestalS: { x: 150, y: 250, width: 24, height: 24 },
  mirrorG1: { x: 172, y: 180, width: 16, height: 16 },
  mirrorG2: { x: 292, y: 254, width: 16, height: 16 },
  crankG1: { x: 282, y: 200, width: 14, height: 14 },
  crankG2: { x: 326, y: 200, width: 14, height: 14 },
  restoreA: { x: 88, y: 200, width: 12, height: 12 },
  restoreB: { x: 474, y: 196, width: 12, height: 12 },
  latchA: { x: 452, y: 150, width: 16, height: 16 },
  latchB: { x: 448, y: 226, width: 16, height: 16 },
  valveN: { x: 560, y: 150, width: 14, height: 14 },
  testT: { x: 500, y: 280, width: 28, height: 28 },
  board: { x: 498, y: 246, width: 34, height: 22 },
  stop: { x: 540, y: 256, width: 12, height: 12 },
  exitZone: { x: 606, y: 200, width: 34, height: 40 },
  diagram: { x: 44, y: 110 },
  eyeA: { x: 208, y: 180 },
  eyeB: { x: 368, y: 260 },
  eyeT: { x: 500, y: 294 },
});

/** The mirror's centre points, used as ray origins and ends. */
export const S_CENTRE: Point = rectCenter(MOONLIT_CREEK.pedestalS);
export const G1_CENTRE: Point = rectCenter(MOONLIT_CREEK.mirrorG1);
export const G2_CENTRE: Point = rectCenter(MOONLIT_CREEK.mirrorG2);

/**
 * The marks the light can reveal. Each pipe mark is dark: it reads only when no footprint covers it. The two marks on
 * the ray routes sit under the strip, so they read only with the lantern's ray off (F off from afar, or the lantern
 * taken from S).
 */
export const MOONLIT_LIGHT_MARKS: readonly LightMark[] = Object.freeze([
  { id: PIPE_BEN_WEST_ID, kind: 'dark', rect: { x: 60, y: 230, width: 12, height: 8 } },
  { id: PIPE_BEN_RAY_ID, kind: 'dark', rect: { x: 166, y: 221, width: 10, height: 8 } },
  { id: PIPE_RE_RAY_ID, kind: 'dark', rect: { x: 276, y: 246, width: 10, height: 8 } },
  { id: PIPE_RE_ISLAND_ID, kind: 'dark', rect: { x: 345, y: 214, width: 10, height: 8 } },
  { id: PIPE_BEN_EAST_ID, kind: 'dark', rect: { x: 580, y: 240, width: 10, height: 8 } },
  { id: PIPE_RE_EAST_ID, kind: 'dark', rect: { x: 560, y: 200, width: 10, height: 8 } },
]);

/** Rooms for the "seen" rule: the chasms belong to no room, so a mark across them is never recorded. */
export const MOONLIT_ROOMS: readonly Room[] = Object.freeze([
  { id: 'west', rect: { x: 0, y: 0, width: 208, height: 360 } },
  { id: 'island', rect: { x: 272, y: 0, width: 96, height: 360 } },
  { id: 'east', rect: { x: 432, y: 0, width: 208, height: 360 } },
]);

/** The pulse marks: one point at the West diagram. */
export const MOONLIT_PULSE_MARKS: readonly PulseMark[] = Object.freeze([
  { id: DIAGRAM_ID, x: MOONLIT_CREEK.diagram.x, y: MOONLIT_CREEK.diagram.y },
]);

/** The interactables of the level, for the reach audit. Bridges and the exit zone are not interactables. */
export const MOONLIT_ITEMS: readonly AuditItem[] = Object.freeze([
  { id: PEDESTAL_S_ID, reach: { kind: 'block', rect: MOONLIT_CREEK.pedestalS } },
  { id: RESTORE_A_ID, reach: { kind: 'block', rect: MOONLIT_CREEK.restoreA } },
  { id: CRANK_G1_ID, reach: { kind: 'block', rect: MOONLIT_CREEK.crankG1 } },
  { id: CRANK_G2_ID, reach: { kind: 'block', rect: MOONLIT_CREEK.crankG2 } },
  { id: RESTORE_B_ID, reach: { kind: 'block', rect: MOONLIT_CREEK.restoreB } },
  { id: LATCH_A_ID, reach: { kind: 'block', rect: MOONLIT_CREEK.latchA } },
  { id: LATCH_B_ID, reach: { kind: 'block', rect: MOONLIT_CREEK.latchB } },
  { id: VALVE_N_ID, reach: { kind: 'block', rect: MOONLIT_CREEK.valveN } },
  { id: TEST_T_ID, reach: { kind: 'block', rect: MOONLIT_CREEK.testT } },
  { id: STOP_ID, reach: { kind: 'block', rect: MOONLIT_CREEK.stop } },
]);
