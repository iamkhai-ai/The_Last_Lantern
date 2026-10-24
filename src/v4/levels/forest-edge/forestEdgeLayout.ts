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
export const SPORES_LATCH_IDS = ['spores-latch-1', 'spores-latch-2'] as const;
export const STEPS_LATCH_IDS = ['steps-latch-1', 'steps-latch-2', 'steps-latch-3'] as const;
export const SPORES_HINGE_IDS = ['spores-hinge-1', 'spores-hinge-2'] as const;

/** The level's geometry in world pixels. */
export interface ForestEdgeLayout extends LevelLayout {
  /** Door A's leaf in the split wall; solid and a light blocker while closed. */
  readonly doorA: Rect;
  /** A foot overlapping this zone holds door A open (bridge rule). */
  readonly thresholdA: Rect;
  /** Gate B's leaf in the east wall; solid and a light blocker while closed. */
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
  { id: YARD_CHECKPOINT_ID, spawn: { x: 120, y: 262 }, zone: { x: 64, y: 236, width: 120, height: 88 } },
  { id: MIDDLE_CHECKPOINT_ID, spawn: { x: 420, y: 262 }, zone: { x: 368, y: 236, width: 120, height: 88 } },
];

/** The one level: an entry yard, a split wall with door A, a middle yard, and gate B to the exit. */
export const FOREST_EDGE: ForestEdgeLayout = Object.freeze({
  world: { x: 0, y: 0, width: 640, height: 360 },
  walls: Object.freeze([
    { x: 0, y: 0, width: 640, height: 112 },        // north wall (the HUD plate sits over its west end)
    { x: 0, y: 328, width: 640, height: 32 },       // south wall
    { x: 0, y: 112, width: 24, height: 216 },       // west wall of the entry yard
    { x: 312, y: 112, width: 8, height: 78 },       // split wall, north of door A
    { x: 312, y: 230, width: 8, height: 98 },       // split wall, south of door A
    { x: 600, y: 112, width: 40, height: 78 },      // east wall, north of gate B
    { x: 600, y: 230, width: 40, height: 98 },      // east wall, south of gate B
  ]),
  checkpoints,
  doorA: { x: 312, y: 190, width: 8, height: 40 },
  thresholdA: { x: 304, y: 186, width: 16, height: 48 },
  gateB: { x: 592, y: 190, width: 8, height: 40 },
  thresholdB: { x: 584, y: 186, width: 16, height: 48 },
  stele: { x: 200, y: 196, width: 28, height: 16 },
  hinge: { x: 152, y: 226, width: 24, height: 14 },
  s1: { x: 252, y: 232, width: 24, height: 24 },
  s2: { x: 500, y: 232, width: 24, height: 24 },
  latchA: { x: 336, y: 150, width: 16, height: 16 },
  braceB: { x: 548, y: 140, width: 16, height: 16 },
  exitZone: { x: 600, y: 190, width: 24, height: 40 },
  sprout: { x: 132, y: 276, width: 12, height: 10 },
  lampRest: { x: 226, y: 216, width: 14, height: 10 },
});

/** The lit mark and the dark marks. Dark marks sit outside every footprint; the lit mark sits under one. */
export const FOREST_EDGE_LIGHT_MARKS: readonly LightMark[] = Object.freeze([
  { id: SPROUT_ID, kind: 'lit', rect: FOREST_EDGE.sprout },
  { id: SPORES_HINGE_IDS[0], kind: 'dark', rect: { x: 138, y: 246, width: 6, height: 6 } },
  { id: SPORES_HINGE_IDS[1], kind: 'dark', rect: { x: 160, y: 258, width: 6, height: 6 } },
  { id: SPORES_LATCH_IDS[0], kind: 'dark', rect: { x: 350, y: 180, width: 6, height: 6 } },
  { id: SPORES_LATCH_IDS[1], kind: 'dark', rect: { x: 360, y: 170, width: 6, height: 6 } },
  { id: STEPS_LATCH_IDS[0], kind: 'dark', rect: { x: 324, y: 208, width: 8, height: 4 } },
  { id: STEPS_LATCH_IDS[1], kind: 'dark', rect: { x: 330, y: 196, width: 8, height: 4 } },
  { id: STEPS_LATCH_IDS[2], kind: 'dark', rect: { x: 338, y: 174, width: 8, height: 4 } },
]);

/** Pulse at the stele (lantern in hand and on) reveals the S1–A line and the tool marks on latch A. */
export const FOREST_EDGE_PULSE_MARKS: readonly PulseMark[] = Object.freeze([
  { id: LINE_S1_A_ID, x: 290, y: 240 },
  { id: LATCH_TOOL_ID, x: 344, y: 166 },
]);

/** The rooms for the "seen" rule: the entry yard and the middle yard. The split wall keeps them apart. */
export const FOREST_EDGE_ROOMS: readonly Room[] = Object.freeze([
  { id: 'entry', rect: { x: 24, y: 112, width: 288, height: 216 } },
  { id: 'middle', rect: { x: 320, y: 112, width: 272, height: 216 } },
]);

/** The interactables for the reach audit. The stele and the walls are not interactive. */
export const FOREST_EDGE_ITEMS: readonly AuditItem[] = Object.freeze([
  { id: HINGE_ID, reach: { kind: 'block', rect: FOREST_EDGE.hinge } },
  { id: S1_ID, reach: { kind: 'block', rect: FOREST_EDGE.s1 } },
  { id: LATCH_A_ID, reach: { kind: 'block', rect: FOREST_EDGE.latchA } },
  { id: S2_ID, reach: { kind: 'block', rect: FOREST_EDGE.s2 } },
  { id: BRACE_B_ID, reach: { kind: 'block', rect: FOREST_EDGE.braceB } },
  { id: LAMP_REST_ID, reach: { kind: 'floor', rect: FOREST_EDGE.lampRest } },
]);
