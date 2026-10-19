/**
 * Level 02 (Whispering Woods) decor: a thin wrapper over the shared forest generator.
 *
 * The site below describes this level only. The generator, the PRNG, the texture table and every draw
 * order live in forestDecor.ts. The export names here are kept so existing callers keep compiling.
 */
import {
  buildForestDecor,
  createForestRandom,
  expandForestRect,
  FOREST_BUSH_TEXTURE_HEIGHT,
  FOREST_MOSS_COLOR,
  FOREST_MOTTLE_COLOR,
  type ForestDecor,
  type ForestDecorBush,
  type ForestDecorMark,
  type ForestDecorProp,
  type ForestDecorSite,
  type ForestDecorTree,
} from './forestDecor.ts';
import { WHISPERING_WOODS } from './whisperingWoodsLayout.ts';

export { chaikinClosed, pointInPolygon, FOREST_DECOR_TEXTURES } from './forestDecor.ts';

export const WOODS_DECOR_SEED = 0x2b1e7c;
export const WOODS_MOTTLE_COLOR = FOREST_MOTTLE_COLOR;
export const WOODS_MOSS_COLOR = FOREST_MOSS_COLOR;
/** Native pixel height of the 'bush_woods' texture (72x77). Front bush bases must clear the walkable band with it. */
export const WOODS_BUSH_TEXTURE_HEIGHT = FOREST_BUSH_TEXTURE_HEIGHT;

export type WoodsDecorTree = ForestDecorTree;
export type WoodsDecorBush = ForestDecorBush;
export type WoodsDecorProp = ForestDecorProp;
export type WoodsDecorMark = ForestDecorMark;
export type WoodsDecor = ForestDecor;

/** mulberry32: small, fast, fixed-seed PRNG returning floats in [0, 1). */
export const createWoodsRandom = createForestRandom;

/** The Level 02 site: stands and anchors are kept clear, the gate span is open in the near row, and the south entry path has no bushes. */
export function woodsDecorSite(): ForestDecorSite {
  return {
    seed: WOODS_DECOR_SEED,
    groundPaths: WHISPERING_WOODS.groundPaths,
    keepClear: { points: [...Object.values(WHISPERING_WOODS.stands), ...Object.values(WHISPERING_WOODS.anchors)], radius: 26 },
    keepClearRects: [expandForestRect(WHISPERING_WOODS.gate.backing, 12)],
    solids: [...WHISPERING_WOODS.trees.map((t) => t.footprint), ...WHISPERING_WOODS.rocks.map((r) => r.footprint)],
    gateSpan: { min: 448, max: 572 },
    bushSkip: [{ min: 92, max: 180 }],
  };
}

export function buildWoodsDecor(): WoodsDecor {
  return buildForestDecor(woodsDecorSite());
}
