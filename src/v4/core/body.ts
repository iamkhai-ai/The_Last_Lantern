import type { Point, Rect } from './geometry';

/** The one foot body (RULE_GAMES §1), relative to the actor's centre. */
export const FOOT_BODY = { offsetX: -7, offsetY: 16, width: 14, height: 6 } as const;

/** Ground line used for depth sorting, relative to the actor's centre. */
export const FOOT_DEPTH_OFFSET = 19;

/** The foot body in world space when the actor's centre is at `center`. */
export function footRectAt(center: Point): Rect {
  return {
    x: center.x + FOOT_BODY.offsetX,
    y: center.y + FOOT_BODY.offsetY,
    width: FOOT_BODY.width,
    height: FOOT_BODY.height,
  };
}
