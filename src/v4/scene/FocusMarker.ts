import Phaser from 'phaser';
import type { Reach } from '../core/reach';

/** Above the darkness and the light tint, so the marker reads at night; below the Pulse wave. */
const DEPTH = 69.5;
const FILL = 0xffe08a;
const OUTLINE = 0x1a1206;
/** One bob of the arrow and one breath of the ring and glow, ms. */
const PERIOD_MS = 900;
/** How far the arrow bobs, px. */
const BOB_PX = 3;
/** Gap between the item's rect top and the arrow's tip at rest: an upright item's art rises above its rect. */
const ARROW_GAP_BLOCK = 14;
const ARROW_GAP_FLOOR = 4;
const ARROW_HALF_WIDTH = 4;
const ARROW_HEIGHT = 5;
/** A warm additive glow (light_radial) on the item, breathing between these alphas, reaching this far past its half-size. */
const GLOW_ALPHA_MIN = 0.35;
const GLOW_ALPHA_SPAN = 0.3;
const GLOW_PAD = 16;
/** Radius of the gradient in the light_radial texture, px. */
const BRUSH_RADIUS = 126;

/**
 * Marks the interactables a level points at (`V4LevelRuntime.focus`): a breathing warm glow and floor ring on each item
 * and a bobbing arrow above it. A floor item (a flat zone) is ringed at its centre; an upright one at its base. Render only.
 */
export class FocusMarker {
  private readonly scene: Phaser.Scene;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly glows: Phaser.GameObjects.Image[] = [];
  private time = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics().setDepth(DEPTH);
  }

  /** Draws the marker on each item's reach for this frame; an empty list draws nothing. */
  update(dt: number, reaches: readonly Reach[]): void {
    this.time += dt;
    this.graphics.clear();
    for (const glow of this.glows) glow.setVisible(false);
    // 0 → 1 → 0 over one period.
    const wave = (1 - Math.cos(((this.time % PERIOD_MS) / PERIOD_MS) * Math.PI * 2)) / 2;
    reaches.forEach((reach, index) => {
      const { rect } = reach;
      const floor = reach.kind === 'floor';
      const cx = rect.x + rect.width / 2;
      const ringY = floor ? rect.y + rect.height / 2 : rect.y + rect.height - 2;
      const ringW = floor ? rect.width + 4 * wave : rect.width + 10 + 4 * wave;
      const ringH = floor ? rect.height * 0.7 + 2 * wave : Math.max(8, rect.height * 0.6) + 2 * wave;

      this.glow(index).setPosition(cx, ringY - (floor ? 0 : rect.height / 2))
        .setScale((Math.max(rect.width, rect.height) / 2 + GLOW_PAD) / BRUSH_RADIUS)
        .setAlpha(GLOW_ALPHA_MIN + GLOW_ALPHA_SPAN * wave);

      this.graphics.lineStyle(1, FILL, 0.35 + 0.45 * wave);
      this.graphics.strokeEllipse(cx, ringY, ringW, ringH);

      const tip = rect.y - (floor ? ARROW_GAP_FLOOR : ARROW_GAP_BLOCK) - BOB_PX * wave;
      const top = tip - ARROW_HEIGHT;
      this.graphics.fillStyle(FILL, 0.95);
      this.graphics.fillTriangle(cx - ARROW_HALF_WIDTH, top, cx + ARROW_HALF_WIDTH, top, cx, tip);
      this.graphics.lineStyle(1, OUTLINE, 0.9);
      this.graphics.strokeTriangle(cx - ARROW_HALF_WIDTH, top, cx + ARROW_HALF_WIDTH, top, cx, tip);
    });
  }

  /** The pooled glow image number `index`, shown. */
  private glow(index: number): Phaser.GameObjects.Image {
    let glow = this.glows[index];
    if (!glow) {
      glow = this.scene.add.image(0, 0, 'light_radial').setDepth(DEPTH - 0.1).setBlendMode(Phaser.BlendModes.ADD);
      this.glows.push(glow);
    }
    return glow.setVisible(true);
  }
}
