import type { Checkpoint, LevelLayout } from '../../core/level';
import type { Rect } from '../../core/geometry';
import type { PulseMark } from '../../core/pulse';
import type { AuditItem } from '../../core/reachAudit';
import type { LightMark, Room } from '../../core/light';

/** Id of the pedestal S1 by the stele: the sealed socket that feeds door A. */
export const S1_ID = 's1';
/** Id of the pedestal S2 in the middle yard: the sealed socket that feeds gate B. */
export const S2_ID = 's2';
/** Id of the fixed latch A in the middle yard. */
export const LATCH_A_ID = 'latchA';
/** Id of the brace B (tay hãm) in the middle yard. */
export const BRACE_B_ID = 'braceB';
/** Id of the maintenance lamp on the ground by the stele: taken once with E, never set down there. */
export const LAMP_REST_ID = 'lampRest';
/** Id of the optional hinge model by the stele. Never required. */
export const HINGE_ID = 'hinge';
/** Id of the lit mark (the sprout Lumo hides). */
export const SPROUT_ID = 'sprout';
/** Id of the pulse mark for the carved line from S1 to door A. */
export const LINE_S1_A_ID = 'line-s1-a';
/** Id of the pulse mark for the tool marks on latch A. */
export const LATCH_TOOL_ID = 'latch-tool-marks';
/** Id of the checkpoint in the entry yard (the default). */
export const YARD_CHECKPOINT_ID = 'yard';
/** Id of the checkpoint in the middle yard. */
export const MIDDLE_CHECKPOINT_ID = 'middle';

/** Dark marks, grouped by where they sit. */
export const SPORES_LATCH_IDS = ['spores-latch-1', 'spores-latch-2', 'spores-latch-3'] as const;
export const STEPS_LATCH_IDS = ['steps-latch-1', 'steps-latch-2', 'steps-latch-3'] as const;
export const SPORES_HINGE_IDS = ['spores-hinge-1', 'spores-hinge-2'] as const;

/** The level's geometry in world pixels. */
export interface ForestEdgeLayout extends LevelLayout {
  /** Door A's leaf in the courtyard's south wall; solid and a light blocker while closed. */
  readonly doorA: Rect;
  /** A foot overlapping this zone holds door A open (bridge rule). */
  readonly thresholdA: Rect;
  /** Gate B's leaf in the courtyard's north wall, leading to level 02; solid and a light blocker while closed. */
  readonly gateB: Rect;
  /** A foot overlapping this zone holds gate B open (bridge rule). */
  readonly thresholdB: Rect;
  /** Standing stone by the hinge model in the entry yard. Solid, not interactive. */
  readonly stele: Rect;
  /** Optional hinge model (solid). */
  readonly hinge: Rect;
  /** Pedestal S1 (solid). Its sealed socket feeds door A. */
  readonly s1: Rect;
  /** Pedestal S2 (solid). Its sealed socket feeds gate B. */
  readonly s2: Rect;
  /** Fixed latch A (solid), in the middle yard beside door A. */
  readonly latchA: Rect;
  /** Brace B (solid), in the middle yard by gate B. */
  readonly braceB: Rect;
  /** Trigger inside the exit opening, beyond gate B. */
  readonly exitZone: Rect;
  /** The lit sprout (not solid). */
  readonly sprout: Rect;
  /** The maintenance lamp on the ground by the stele, unlit (not solid). */
  readonly lampRest: Rect;
}

/**
 * The one declared exception to puzzle-contracts §1 (lamp picked up only at a pedestal), kept with its reason
 * (RULE_GAMES §8). Nothing else is picked up from the ground, and the lamp is never set down there.
 */
export const LAMP_REST_EXCEPTION = {
  rule: 'puzzle-contracts §1: E đặt và nhặt đèn chỉ tại bệ',
  reason:
    'Đèn đã được đặt cạnh bia trước khi nghỉ (prologue, cảnh nghỉ cuối); người chơi tự nhặt một lần ở đó (quyết định b, docs/scenario-v4/01).',
} as const;

const checkpoints: readonly Checkpoint[] = [
  { id: YARD_CHECKPOINT_ID, spawn: { x: 124, y: 214 }, zone: { x: 80, y: 190, width: 110, height: 80 } },
  { id: MIDDLE_CHECKPOINT_ID, spawn: { x: 480, y: 150 }, zone: { x: 440, y: 120, width: 90, height: 50 } },
];

/**
 * The one level: an entry yard below, a walled middle courtyard above it (door A in its south wall), and gate B in
 * its north wall to level 02. The layout follows the art (assets/levels/01-forgotten-forest-edge/v4/asset-map.json).
 */
export const FOREST_EDGE: ForestEdgeLayout = Object.freeze({
  world: { x: 16, y: 0, width: 608, height: 330 },
  walls: Object.freeze([
    { x: 16, y: 0, width: 240, height: 110 },     // forestNW: forest block north-west of the yard
    { x: 256, y: 0, width: 16, height: 214 },     // innerWest: west wall of the courtyard
    { x: 272, y: 0, width: 184, height: 52 },     // northWallWest: courtyard north wall, west of gate B
    { x: 504, y: 0, width: 120, height: 52 },     // northWallEast: courtyard north wall, east of gate B
    { x: 600, y: 52, width: 24, height: 162 },    // eastWall: courtyard east wall
    { x: 272, y: 190, width: 64, height: 24 },    // frontWallWest: courtyard south wall, west of door A
    { x: 376, y: 190, width: 224, height: 24 },   // frontWallEast: courtyard south wall, east of door A
    { x: 40, y: 168, width: 64, height: 30 },     // bigTreeTrunk: the old tree in the entry yard
    { x: 500, y: 240, width: 100, height: 46 },   // stationShelter: the shelter in the south yard
    { x: 568, y: 88, width: 16, height: 16 },     // waterColumn: the water column in the courtyard
  ]),
  checkpoints,
  doorA: { x: 336, y: 190, width: 40, height: 24 },
  thresholdA: { x: 336, y: 182, width: 40, height: 40 },
  gateB: { x: 456, y: 36, width: 48, height: 16 },
  thresholdB: { x: 456, y: 28, width: 48, height: 32 },
  stele: { x: 160, y: 206, width: 28, height: 12 },
  hinge: { x: 112, y: 268, width: 24, height: 14 },
  s1: { x: 282, y: 240, width: 24, height: 24 },
  s2: { x: 420, y: 96, width: 24, height: 24 },
  latchA: { x: 392, y: 166, width: 16, height: 16 },
  braceB: { x: 520, y: 60, width: 16, height: 16 },
  exitZone: { x: 456, y: 0, width: 48, height: 20 },
  sprout: { x: 236, y: 276, width: 16, height: 16 },
  lampRest: { x: 206, y: 226, width: 16, height: 10 },
});

/** The lit mark and the dark marks. Dark marks sit outside every footprint; the lit mark sits under one. */
export const FOREST_EDGE_LIGHT_MARKS: readonly LightMark[] = Object.freeze([
  { id: SPROUT_ID, kind: 'lit', rect: FOREST_EDGE.sprout },
  { id: SPORES_HINGE_IDS[0], kind: 'dark', rect: { x: 138, y: 256, width: 6, height: 6 } },
  { id: SPORES_HINGE_IDS[1], kind: 'dark', rect: { x: 146, y: 266, width: 6, height: 6 } },
  { id: SPORES_LATCH_IDS[0], kind: 'dark', rect: { x: 380, y: 180, width: 6, height: 6 } },
  { id: SPORES_LATCH_IDS[1], kind: 'dark', rect: { x: 412, y: 184, width: 6, height: 6 } },
  { id: SPORES_LATCH_IDS[2], kind: 'dark', rect: { x: 404, y: 150, width: 6, height: 6 } },
  { id: STEPS_LATCH_IDS[0], kind: 'dark', rect: { x: 380, y: 186, width: 8, height: 4 } },
  { id: STEPS_LATCH_IDS[1], kind: 'dark', rect: { x: 382, y: 172, width: 8, height: 4 } },
  { id: STEPS_LATCH_IDS[2], kind: 'dark', rect: { x: 386, y: 158, width: 8, height: 4 } },
]);

/** Pulse at the stele (lantern in hand and on) reveals the S1–A line and the tool marks on latch A. */
export const FOREST_EDGE_PULSE_MARKS: readonly PulseMark[] = Object.freeze([
  { id: LINE_S1_A_ID, x: 310, y: 224 },
  { id: LATCH_TOOL_ID, x: 386, y: 168 },
]);

/**
 * The rooms for the "seen" rule: the courtyard and the entry yard. They overlap; `roomAt` returns the first match,
 * so `middle` is listed first to keep the courtyard its own room.
 */
export const FOREST_EDGE_ROOMS: readonly Room[] = Object.freeze([
  { id: 'middle', rect: { x: 272, y: 52, width: 328, height: 138 } },
  { id: 'entry', rect: { x: 16, y: 110, width: 608, height: 220 } },
]);

/**
 * The zone that shows the lamp's prompt: the lamp's rect grown by 8px on every side (RULE_GAMES §2). A flat item shows
 * its control when the foot centre is inside its zone, so a zone exactly the lamp's size left no room to stand beside it.
 */
export const LAMP_REST_REACH: Rect = {
  x: FOREST_EDGE.lampRest.x - 8,
  y: FOREST_EDGE.lampRest.y - 8,
  width: FOREST_EDGE.lampRest.width + 16,
  height: FOREST_EDGE.lampRest.height + 16,
};

/** The interactables for the reach audit. The stele and the walls are not interactive. */
export const FOREST_EDGE_ITEMS: readonly AuditItem[] = Object.freeze([
  { id: HINGE_ID, reach: { kind: 'block', rect: FOREST_EDGE.hinge } },
  { id: S1_ID, reach: { kind: 'block', rect: FOREST_EDGE.s1 } },
  { id: LATCH_A_ID, reach: { kind: 'block', rect: FOREST_EDGE.latchA } },
  { id: S2_ID, reach: { kind: 'block', rect: FOREST_EDGE.s2 } },
  { id: BRACE_B_ID, reach: { kind: 'block', rect: FOREST_EDGE.braceB } },
  { id: LAMP_REST_ID, reach: { kind: 'floor', rect: LAMP_REST_REACH } },
]);
