import Phaser from 'phaser';
import type { Point, Rect } from '../v4/core/geometry';
import { canPulse } from '../v4/core/lantern';
import type { LanternState } from '../v4/core/lantern';
import { isPointLit } from '../v4/core/light';
import type { Footprint } from '../v4/core/light';
import { SoundSystem } from './SoundSystem';

export type PulseCallback = (x: number, y: number, maxRadius: number) => void;

/** A level's lighting numbers. The ambient darkness is constant for the level; it never depends on the lantern. */
export type LanternLightingProfile = {
  /** Darkness of the room outside every footprint, 0 (none) to 1 (black). */
  readonly ambientDarkness: number;
};

/** Forest night: a dark wood that the lantern's light cuts through. */
export const FOREST_LIGHTING: LanternLightingProfile = { ambientDarkness: 0.5 };

/** Library: a warmer, slightly brighter room; the glowing dark ink carries the clues. */
export const LIBRARY_LIGHTING: LanternLightingProfile = { ambientDarkness: 0.42 };

/** The profile for a V4 level that declares none. */
export const DEFAULT_LIGHTING: LanternLightingProfile = { ambientDarkness: 0.42 };

/** Side of one lit-area cell, px. Each cell centre is tested with `isPointLit`. */
const LIT_CELL = 2;
/** Fill of the lit area. A cell lit by a circle fades from its centre: alpha = MIN + SPAN × (1 − d / radius). */
const LIT_FILL = 0xffe6a0;
const CIRCLE_ALPHA_MIN = 0.08;
const CIRCLE_ALPHA_SPAN = 0.3;
/** A cell lit only by a declared area (a spill or fixed source). */
const AREA_ALPHA = 0.22;
/** A rim cell (lit, with an unlit side neighbour) draws brighter. */
const RIM_ALPHA = 0.45;
/** Cell alphas are rounded to this step so that equal neighbours merge into one rect. */
const ALPHA_STEP = 0.01;
const AMBIENT_FILL = 0x040b12;
/** The room's size in px; the overlay and the lit area are clamped to it. */
const ROOM_WIDTH = 640;
const ROOM_HEIGHT = 360;

/**
 * Render-only lantern light. The footprints (the lantern's light and any fixed sources) and the light blockers are
 * owned by the caller and passed into `update()`; this class draws them with the same `isPointLit` rule the gameplay
 * uses, so the drawn edge is the edge Nhinh is judged by. It also keeps the Pulse wave and its cooldown.
 */
export class LanternSystem {
  private scene: Phaser.Scene;
  private darknessOverlay: Phaser.GameObjects.Graphics;
  private litArea: Phaser.GameObjects.Graphics;
  private pulseGraphics: Phaser.GameObjects.Graphics;
  private vignetteImage: Phaser.GameObjects.Image;
  private readonly ambientDarkness: number;

  private flickerTime = 0;
  private pulseCooldownRemaining = 0; // ms
  private pulseActiveTime = 0;        // ms (0..1000)
  private pulseOriginX = 0;
  private pulseOriginY = 0;
  private pulseListeners: PulseCallback[] = [];
  /** False for a level without darkness (lighting 'none'): no overlay, lit area or vignette; Pulse still draws. */
  private lightingEnabled = true;

  public static readonly PULSE_COOLDOWN_MS = 3000;
  public static readonly PULSE_DURATION_MS = 1000;
  public static readonly PULSE_MAX_RADIUS = 195;

  /** @param profile the level's lighting numbers; omit for the default. */
  constructor(scene: Phaser.Scene, profile: LanternLightingProfile = DEFAULT_LIGHTING) {
    this.scene = scene;
    this.ambientDarkness = profile.ambientDarkness;

    this.darknessOverlay = scene.add.graphics();
    this.darknessOverlay.setDepth(68);

    this.litArea = scene.add.graphics();
    this.litArea.setDepth(69);
    this.litArea.setBlendMode(Phaser.BlendModes.ADD);

    this.pulseGraphics = scene.add.graphics();
    this.pulseGraphics.setDepth(70);

    this.vignetteImage = scene.add.image(320, 180, 'vignette');
    this.vignetteImage.setDepth(71);
    this.vignetteImage.setScrollFactor(0);
  }

  public onPulse(cb: PulseCallback): void {
    this.pulseListeners.push(cb);
  }

  /** Turns the darkness and the lantern light on or off for the level. Off draws no light at all. */
  public setLightingEnabled(enabled: boolean): void {
    this.lightingEnabled = enabled;
  }

  public clearPulseListeners(): void {
    this.pulseListeners = [];
  }

  /**
   * Starts a Pulse from `origin` when the lantern allows it (in hand and lit, see `canPulse`) and the cooldown
   * has run out. Refused returns false. The toggle sound is the caller's job; the Pulse sound plays here.
   */
  public triggerPulse(origin: Point, lantern: LanternState): boolean {
    if (!canPulse(lantern)) return false;
    if (this.pulseCooldownRemaining > 0) return false;

    this.pulseCooldownRemaining = LanternSystem.PULSE_COOLDOWN_MS;
    this.pulseActiveTime = 1;
    this.pulseOriginX = origin.x;
    this.pulseOriginY = origin.y;

    SoundSystem.playLightPulse();
    for (const cb of this.pulseListeners) {
      cb(origin.x, origin.y, LanternSystem.PULSE_MAX_RADIUS);
    }
    return true;
  }

  public getCooldownRatio(): number {
    return Math.max(0, Math.min(1, this.pulseCooldownRemaining / LanternSystem.PULSE_COOLDOWN_MS));
  }

  /**
   * Draws the light for this frame: the constant ambient overlay, the lit area (every footprint, cut by the blockers),
   * and the Pulse wave.
   * @param footprints every light footprint this frame (the lantern's, when it is on, and fixed sources)
   * @param blockers the light blockers this frame (walls and closed leaves)
   */
  public update(dt: number, footprints: readonly Footprint[], blockers: readonly Rect[]): void {
    this.flickerTime += dt * 0.005;

    if (this.pulseCooldownRemaining > 0) {
      this.pulseCooldownRemaining = Math.max(0, this.pulseCooldownRemaining - dt);
    }

    // Gentle 2-4% organic flicker, applied to the lit area only: the ambient darkness is constant.
    const flicker = 1 + Math.sin(this.flickerTime * 2.3) * 0.025 + Math.cos(this.flickerTime * 5.7) * 0.012;

    this.darknessOverlay.clear();
    this.litArea.clear();
    this.vignetteImage.setVisible(this.lightingEnabled);

    if (this.lightingEnabled) {
      this.darknessOverlay.fillStyle(AMBIENT_FILL, this.ambientDarkness);
      this.darknessOverlay.fillRect(0, 0, ROOM_WIDTH, ROOM_HEIGHT);
      this.drawLitArea(footprints, blockers, flicker);
    }

    // Draw expanding Light Pulse wave (~1s outward)
    this.pulseGraphics.clear();
    if (this.pulseActiveTime > 0) {
      this.pulseActiveTime += dt;
      const t = this.pulseActiveTime / LanternSystem.PULSE_DURATION_MS;
      if (t >= 1) {
        this.pulseActiveTime = 0;
      } else {
        const radius = 12 + t * (LanternSystem.PULSE_MAX_RADIUS - 12);
        const alpha = (1 - t) * 0.85;
        this.pulseGraphics.lineStyle(2.5, 0xfff0a8, alpha);
        this.pulseGraphics.strokeCircle(this.pulseOriginX, this.pulseOriginY, radius);

        this.pulseGraphics.lineStyle(1.2, 0x7df2d4, alpha * 0.65);
        this.pulseGraphics.strokeCircle(this.pulseOriginX, this.pulseOriginY, Math.max(4, radius - 8));
      }
    }
  }

  /**
   * Draws the lit area over the bounding box of the footprints. Each 2px cell whose centre `isPointLit` is filled:
   * a cell lit by a circle takes the brightest such circle's fade (centre brighter, edge dimmer); a cell lit only by
   * an area takes AREA_ALPHA; a rim cell (lit, with an unlit 4-neighbour) takes RIM_ALPHA. Runs of one alpha in a row
   * are drawn as one rect.
   */
  private drawLitArea(footprints: readonly Footprint[], blockers: readonly Rect[], flicker: number): void {
    const box = footprintBox(footprints);
    if (!box) return;
    const cols = Math.ceil((box.right - box.left) / LIT_CELL);
    const rows = Math.ceil((box.bottom - box.top) / LIT_CELL);
    const circles = footprints.filter((f): f is Circle => f.kind === 'circle');

    const lit: boolean[][] = [];
    for (let row = 0; row < rows; row++) {
      const y = box.top + row * LIT_CELL;
      const cellH = Math.min(LIT_CELL, box.bottom - y);
      const line: boolean[] = [];
      for (let col = 0; col < cols; col++) {
        const x = box.left + col * LIT_CELL;
        const cellW = Math.min(LIT_CELL, box.right - x);
        line.push(isPointLit({ x: x + cellW / 2, y: y + cellH / 2 }, footprints, blockers));
      }
      lit.push(line);
    }

    const litAt = (row: number, col: number): boolean =>
      row >= 0 && row < rows && col >= 0 && col < cols && lit[row][col];
    const alphas: number[][] = lit.map((line, row) => line.map((isLit, col) => {
      if (!isLit) return 0;
      const onRim = !litAt(row - 1, col) || !litAt(row + 1, col) || !litAt(row, col - 1) || !litAt(row, col + 1);
      if (onRim) return quantizeAlpha(RIM_ALPHA);
      const centre = { x: box.left + col * LIT_CELL + LIT_CELL / 2, y: box.top + row * LIT_CELL + LIT_CELL / 2 };
      const circleFade = brightestCircleAlpha(centre, circles, blockers);
      return quantizeAlpha(circleFade ?? AREA_ALPHA);
    }));

    const levels = new Set(alphas.flat());
    levels.delete(0);
    for (const level of levels) {
      this.litArea.fillStyle(LIT_FILL, level * flicker);
      alphas.forEach((line, row) => {
        const y = box.top + row * LIT_CELL;
        const h = Math.min(LIT_CELL, box.bottom - y);
        let col = 0;
        while (col < line.length) {
          if (line[col] !== level) {
            col++;
            continue;
          }
          const start = col;
          while (col < line.length && line[col] === level) col++;
          const x = box.left + start * LIT_CELL;
          const right = Math.min(box.left + col * LIT_CELL, box.right);
          this.litArea.fillRect(x, y, right - x, h);
        }
      });
    }
  }
}

/** A circle footprint. */
type Circle = Extract<Footprint, { kind: 'circle' }>;

/** Rounds a cell alpha to ALPHA_STEP so that neighbours with the same level merge into one rect. */
function quantizeAlpha(alpha: number): number {
  return Math.round(alpha / ALPHA_STEP) * ALPHA_STEP;
}

/**
 * The alpha of the brightest circle that lights `p` on its own, or null when no circle lights it.
 * A circle fades from MIN + SPAN at its centre down to MIN at its edge.
 */
function brightestCircleAlpha(p: Point, circles: readonly Circle[], blockers: readonly Rect[]): number | null {
  let best: number | null = null;
  for (const c of circles) {
    if (!isPointLit(p, [c], blockers)) continue;
    const d = Math.hypot(p.x - c.center.x, p.y - c.center.y);
    const alpha = CIRCLE_ALPHA_MIN + CIRCLE_ALPHA_SPAN * (1 - d / c.radius);
    if (best === null || alpha > best) best = alpha;
  }
  return best;
}

/** The clamped integer box around every footprint, or null when nothing of them is on the room. */
function footprintBox(footprints: readonly Footprint[]): { left: number; top: number; right: number; bottom: number } | null {
  const points: Point[] = [];
  for (const f of footprints) {
    switch (f.kind) {
      case 'circle':
        points.push(
          { x: f.center.x - f.radius, y: f.center.y - f.radius },
          { x: f.center.x + f.radius, y: f.center.y + f.radius },
        );
        break;
      case 'area':
        points.push(...f.points);
        break;
    }
  }
  if (points.length === 0) return null;
  const left = Math.max(0, Math.floor(Math.min(...points.map(p => p.x))));
  const top = Math.max(0, Math.floor(Math.min(...points.map(p => p.y))));
  const right = Math.min(ROOM_WIDTH, Math.ceil(Math.max(...points.map(p => p.x))));
  const bottom = Math.min(ROOM_HEIGHT, Math.ceil(Math.max(...points.map(p => p.y))));
  if (right <= left || bottom <= top) return null;
  return { left, top, right, bottom };
}
