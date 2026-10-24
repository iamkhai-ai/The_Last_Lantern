import type Phaser from 'phaser';
import type { Rect } from '../core/geometry';

/** Above the darkness and the light tint, so the marker reads at night; below the Pulse wave. */
const DEPTH = 69.5;
const FILL = 0xffe08a;
const OUTLINE = 0x1a1206;
/** One bob of the arrow and one breath of the ring, ms. */
const PERIOD_MS = 900;
/** How far the arrow bobs, px. */
const BOB_PX = 3;
/** Gap between the item's rect top and the arrow's tip at rest, px. */
const ARROW_GAP = 14;
const ARROW_HALF_WIDTH = 4;
const ARROW_HEIGHT = 5;

/**
 * Marks the interactables a level points at (`V4LevelRuntime.focus`): a breathing ring on the floor around each
 * item's base and a bobbing arrow above it. Render only.
 */
export class FocusMarker {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private time = 0;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(DEPTH);
  }

  /** Draws the marker over each rect (an item's reach rect) for this frame; an empty list draws nothing. */
  update(dt: number, rects: readonly Rect[]): void {
    this.time += dt;
    this.graphics.clear();
    // 0 → 1 → 0 over one period.
    const wave = (1 - Math.cos(((this.time % PERIOD_MS) / PERIOD_MS) * Math.PI * 2)) / 2;
    for (const rect of rects) {
      const cx = rect.x + rect.width / 2;
      const base = rect.y + rect.height;
      this.graphics.lineStyle(1, FILL, 0.35 + 0.45 * wave);
      this.graphics.strokeEllipse(cx, base - 2, rect.width + 10 + 4 * wave, Math.max(8, rect.height * 0.6) + 2 * wave);

      const tip = rect.y - ARROW_GAP - BOB_PX * wave;
      const top = tip - ARROW_HEIGHT;
      this.graphics.fillStyle(FILL, 0.95);
      this.graphics.fillTriangle(cx - ARROW_HALF_WIDTH, top, cx + ARROW_HALF_WIDTH, top, cx, tip);
      this.graphics.lineStyle(1, OUTLINE, 0.9);
      this.graphics.strokeTriangle(cx - ARROW_HALF_WIDTH, top, cx + ARROW_HALF_WIDTH, top, cx, tip);
    }
  }
}
