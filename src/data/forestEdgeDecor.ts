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
    // Opt-in: the Level 01 dirt path had a hard, flat rim, so a dense grass band now straddles its whole smoothed edge.
    // The band packs tufts every 5.5 px, so 14 px is enough base clearance from the interaction marks: the tufts are
    // drawn at depth 0.62, below the propped art and the footprint trail, and the 26 px ground-cover radius would blank
    // the whole middle third of this rim (the trail marks sit inside a 35 px wide path).
    // The gate threshold rect keeps the doorway and the gate stands grass-free.
    denseEdgeGrass: {
      step: 5.5,
      outward: [3, 10],
      inward: [1, 4],
      markClearance: 14,
      keepClearRects: [expandForestRect(objects.gate.threshold, 10)],
    },
  };
}

export function buildForestEdgeDecor(): ForestDecor {
  return buildForestDecor(forestEdgeDecorSite());
}
