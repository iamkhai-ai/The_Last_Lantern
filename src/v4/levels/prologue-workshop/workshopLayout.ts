import type { Point, Rect } from '../../core/geometry';
import type { LevelLayout } from '../../core/level';
import type { AuditItem } from '../../core/reachAudit';

/** Id of the repair bench (solid). */
export const BENCH_ID = 'bench';
/** Id of the parts tray on the left (solid). */
export const TRAY_ID = 'tray';
/** Id of the window panel (solid). */
export const PANEL_ID = 'panel';
/** Id of Mẹ at the room edge (solid). */
export const MOTHER_ID = 'mother';
/** Id of the boatman by the south door (solid until he leaves). */
export const BOATMAN_ID = 'boatman';
/** Id of the only checkpoint, the room centre. */
export const START_CHECKPOINT_ID = 'start';

/** The workshop geometry (world pixels). Extends the generic level layout with its named pieces. */
export interface WorkshopLayout extends LevelLayout {
  /** The repair bench (solid, always). */
  readonly bench: Rect;
  /** The parts tray (solid, always). */
  readonly tray: Rect;
  /** The window panel (solid, always). */
  readonly panel: Rect;
  /** Mẹ's collision rect (solid, always). */
  readonly mother: Rect;
  /** The boatman's collision rect (solid until he has returned). */
  readonly boatman: Rect;
  /** The south exit: solid until the assignment is received, then the way out. */
  readonly southDoor: Rect;
}

/** Nhinh's start, the centre of the room (actor centre). */
export const WORKSHOP_SPAWN: Point = Object.freeze({ x: 300, y: 250 });

/** The workshop's geometry: the walkable floor, the walls around it and the named pieces. */
export const WORKSHOP: WorkshopLayout = Object.freeze({
  world: { x: 74, y: 98, width: 486, height: 206 },
  walls: Object.freeze([
    // Frame around the floor (74..560 x 98..304). The south wall has a gap for the exit (272..368), between the door posts.
    { x: 66, y: 90, width: 502, height: 8 },
    { x: 66, y: 98, width: 8, height: 206 },
    { x: 560, y: 98, width: 8, height: 206 },
    { x: 66, y: 304, width: 206, height: 8 },
    { x: 368, y: 304, width: 192, height: 8 },
  ]),
  checkpoints: Object.freeze([
    { id: START_CHECKPOINT_ID, spawn: WORKSHOP_SPAWN, zone: { x: 260, y: 220, width: 80, height: 60 } },
  ]),
  // Footprints of the props in the pass-2 art, drawn with their foot on the bottom edge.
  bench: { x: 269, y: 172, width: 64, height: 34 },
  tray: { x: 92, y: 214, width: 40, height: 22 },
  panel: { x: 528, y: 170, width: 32, height: 16 },
  mother: { x: 516, y: 208, width: 16, height: 6 },
  boatman: { x: 224, y: 282, width: 16, height: 6 },
  southDoor: { x: 272, y: 298, width: 96, height: 6 },
});

/** The interactables of the workshop, for the reach audit. Every one is a standing block. */
export const WORKSHOP_ITEMS: readonly AuditItem[] = Object.freeze([
  { id: BENCH_ID, reach: { kind: 'block', rect: WORKSHOP.bench } },
  { id: TRAY_ID, reach: { kind: 'block', rect: WORKSHOP.tray } },
  { id: PANEL_ID, reach: { kind: 'block', rect: WORKSHOP.panel } },
  { id: MOTHER_ID, reach: { kind: 'block', rect: WORKSHOP.mother } },
  { id: BOATMAN_ID, reach: { kind: 'block', rect: WORKSHOP.boatman } },
]);
