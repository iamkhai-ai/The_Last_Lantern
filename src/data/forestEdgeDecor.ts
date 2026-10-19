/**
 * Level 01 (Forgotten Forest Edge) decor: the Level 01 site over the shared forest generator.
 *
 * Positions come from forestEdgeLayout.ts only. Nothing here changes walkable data, collision, or interactions.
 */
import {
  buildForestDecor,
  expandForestRect,
  type ForestDecor,
  type ForestDecorSite,
} from './forestDecor.ts';
import { FOREST_EDGE, FOREST_EDGE_GROUND_PATH, FOREST_EDGE_SOLIDS } from './forestEdgeLayout.ts';

/** Fixed seed for Level 01. It is independent of the Level 02 seed, so the two forests never share a layout. */
export const FOREST_EDGE_DECOR_SEED = 0x1e0f3d;

/** The Level 01 site. Stands, anchors, checkpoints, ring, eye, and trail marks are kept clear; the gate span is open in the near row. */
export function forestEdgeDecorSite(): ForestDecorSite {
  const { objects, checkpoints } = FOREST_EDGE;
  return {
    seed: FOREST_EDGE_DECOR_SEED,
    groundPaths: [FOREST_EDGE_GROUND_PATH],
    keepClear: {
      points: [
        objects.lantern.anchor, objects.lantern.stand,
        objects.tablet.anchor, objects.tablet.stand,
        objects.ring.anchor, objects.ring.ground, objects.ring.stand,
        objects.gate.anchor, objects.gate.stand,
        objects.eye.anchor,
        ...Object.values(checkpoints),
        ...objects.trail,
      ],
      radius: 26,
    },
    keepClearRects: [expandForestRect(objects.gate.backing, 12)],
    solids: FOREST_EDGE_SOLIDS,
    gateSpan: { min: 400, max: 572 },
    // The Level 01 path enters from the south with no bush gap, so no bottom-band span is cut.
    bushSkip: [],
  };
}

export function buildForestEdgeDecor(): ForestDecor {
  return buildForestDecor(forestEdgeDecorSite());
}
