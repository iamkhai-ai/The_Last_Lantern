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
  /** Darkness of the room outside every light, 0 (none) to 1 (black). */
  readonly ambientDarkness: number;
};

/** Forest night: a dark wood that the lantern's light cuts through. */
export const FOREST_LIGHTING: LanternLightingProfile = { ambientDarkness: 0.82 };

/** Library: a warmer, slightly brighter room; the glowing dark ink carries the clues. */
export const LIBRARY_LIGHTING: LanternLightingProfile = { ambientDarkness: 0.72 };

/** The profile for a V4 level that declares none. */
export const DEFAULT_LIGHTING: LanternLightingProfile = { ambientDarkness: 0.82 };

/** What one frame of light is drawn from. */
export type LightFrame = {
  /** Every gameplay footprint this frame (the lantern's, when it is on, and fixed sources). */
  readonly footprints: readonly Footprint[];
  /** The light blockers this frame (walls and closed leaves). */
  readonly blockers: readonly Rect[];
  /** Where Nhinh's own faint glow sits while no lit lantern is in her hand; null while the lantern lights her. */
  readonly glow: Point | null;
  /** Rects of the interactables that are there now; each glows faintly in the dark. */
  readonly items: readonly Rect[];
};

/** Side of one footprint cell, px. Each cell centre is tested with `isPointLit`. */
const LIT_CELL = 2;
/** Darkness left at a circle's edge, as a share of the ambient; it falls to 0 at the centre (squared). */
const CORE_EDGE_SHADE = 0.2;
/** A cell lit only by a declared area (a spill or fixed source) keeps this share of the ambient. */
const AREA_SHADE = 0.12;
/** Warm tint over a cell lit only by an area (additive). */
const AREA_TINT_ALPHA = 0.14;
/**
 * The soft halo past a circle's edge: decoration only, never a footprint. It reaches TAIL_BASE + radius ×
 * TAIL_PER_RADIUS past the edge, and lifts at most TAIL_ERASE of the darkness (at the brush's centre).
 */
const TAIL_BASE = 20;
const TAIL_PER_RADIUS = 0.9;
const TAIL_ERASE = 0.85;
/** Nhinh's own glow while no lit lantern is in her hand: decoration only, so she and the path stay visible. */
const GLOW_RADIUS = 48;
const GLOW_ERASE = 0.75;
/** An interactable's glow reaches this far past its half-size and lifts this much of the darkness at its centre. */
const ITEM_GLOW_PAD = 12;
const ITEM_GLOW_ERASE = 0.35;
/** Warm tint (light_radial, additive) over a circle's light and over Nhinh's own glow. */
const HALO_TINT_ALPHA = 0.45;
const GLOW_TINT_ALPHA = 0.14;
/** Radius of the gradient in the light_radial and light_mask textures, px. */
const BRUSH_RADIUS = 126;
/** Cell alphas are rounded to this step so that equal neighbours merge into one rect. */
const ALPHA_STEP = 0.02;
const LIT_FILL = 0xffe6a0;
const AMBIENT_FILL = 0x03080c;
/** The room's size in px; the darkness and the lit area are clamped to it. */
const ROOM_WIDTH = 640;
const ROOM_HEIGHT = 360;
const DEPTH_DARKNESS = 68;
const DEPTH_TINT = 69;
const DEPTH_PULSE = 70;

/**
 * Render-only lantern light, drawn the v3 way: a dark night over the room, a clear core where the footprints are, and a
 * soft halo fading out past each circle. The footprints and the light blockers are owned by the caller and passed into
 * `update()`. The core is drawn with the same `isPointLit` rule the gameplay uses, so its edge (a step from the clear
 * core to the dimmer halo) is the edge Nhinh is judged by; the halo, Nhinh's own glow and the interactables' glow are
 * decoration and light nothing (puzzle-contracts §1, "Vòng sáng ... quy ước dựng chung"). It also keeps the Pulse wave and its cooldown.
 */
export class LanternSystem {
  private scene: Phaser.Scene;
  /** The darkness: filled with the ambient each frame, then the lights are erased out of it. */
  private darkness: Phaser.GameObjects.RenderTexture;
  /** Off-list stamps for the darkness: the footprint cells and the soft brush. */
  private coreStamp: Phaser.GameObjects.Graphics;
  private brush: Phaser.GameObjects.Image;
  /** Additive warm tint: the area-only cells, and one light_radial per circle and for Nhinh's glow. */
  private areaTint: Phaser.GameObjects.Graphics;
  private halos: Phaser.GameObjects.Image[] = [];
  private pulseGraphics: Phaser.GameObjects.Graphics;
  private readonly ambientDarkness: number;

  private flickerTime = 0;
  private pulseCooldownRemaining = 0; // ms
  private pulseActiveTime = 0;        // ms (0..1000)
  private pulseOriginX = 0;
  private pulseOriginY = 0;
  private pulseListeners: PulseCallback[] = [];
  /** False for a level without darkness (lighting 'none'): no darkness, halo or tint; Pulse still draws. */
  private lightingEnabled = true;

  public static readonly PULSE_COOLDOWN_MS = 3000;
  public static readonly PULSE_DURATION_MS = 1000;
  public static readonly PULSE_MAX_RADIUS = 195;

  /** @param profile the level's lighting numbers; omit for the default. */
  constructor(scene: Phaser.Scene, profile: LanternLightingProfile = DEFAULT_LIGHTING) {
    this.scene = scene;
    this.ambientDarkness = profile.ambientDarkness;

    this.darkness = scene.add.renderTexture(0, 0, ROOM_WIDTH, ROOM_HEIGHT).setOrigin(0, 0).setDepth(DEPTH_DARKNESS);
    this.coreStamp = scene.make.graphics({}, false);
    this.brush = scene.make.image({ key: 'light_mask' }, false);

    this.areaTint = scene.add.graphics();
    this.areaTint.setDepth(DEPTH_TINT);
    this.areaTint.setBlendMode(Phaser.BlendModes.ADD);

    this.pulseGraphics = scene.add.graphics();
    this.pulseGraphics.setDepth(DEPTH_PULSE);
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

  /** Draws the light for this frame: the darkness with the lights erased out of it, the warm tint, and the Pulse wave. */
  public update(dt: number, frame: LightFrame): void {
    this.flickerTime += dt * 0.005;

    if (this.pulseCooldownRemaining > 0) {
      this.pulseCooldownRemaining = Math.max(0, this.pulseCooldownRemaining - dt);
    }

    // Gentle 2-4% organic flicker, applied to the halo and the tint only: the ambient and the core are constant.
    const flicker = 1 + Math.sin(this.flickerTime * 2.3) * 0.025 + Math.cos(this.flickerTime * 5.7) * 0.012;

    this.darkness.clear();
    this.areaTint.clear();
    this.darkness.setVisible(this.lightingEnabled);
    for (const halo of this.halos) halo.setVisible(false);

    if (this.lightingEnabled) this.drawLight(frame, flicker);

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
   * Fills the darkness with the ambient, then erases, in turn: each interactable's faint glow, Nhinh's own glow, the
   * footprint cells, and each circle's soft halo. Erasing multiplies, so overlapping lights add up without seams.
   */
  private drawLight(frame: LightFrame, flicker: number): void {
    this.darkness.fill(AMBIENT_FILL, this.ambientDarkness);

    for (const item of frame.items) {
      const radius = Math.max(item.width, item.height) / 2 + ITEM_GLOW_PAD;
      this.eraseBrush(item.x + item.width / 2, item.y + item.height / 2, radius, ITEM_GLOW_ERASE);
    }

    let haloIndex = 0;
    if (frame.glow) {
      this.eraseBrush(frame.glow.x, frame.glow.y, GLOW_RADIUS, GLOW_ERASE);
      this.showHalo(haloIndex++, frame.glow, GLOW_RADIUS, GLOW_TINT_ALPHA * flicker);
    }

    this.drawCore(frame.footprints, frame.blockers);
    this.darkness.erase(this.coreStamp);

    for (const f of frame.footprints) {
      if (f.kind !== 'circle') continue;
      const reach = f.radius + TAIL_BASE + f.radius * TAIL_PER_RADIUS;
      this.eraseBrush(f.center.x, f.center.y, reach, Math.min(1, TAIL_ERASE * flicker));
      this.showHalo(haloIndex++, f.center, reach, HALO_TINT_ALPHA * flicker);
    }
  }

  /** Erases the soft brush, scaled to `radius`, at (x, y) with strength `alpha`. */
  private eraseBrush(x: number, y: number, radius: number, alpha: number): void {
    this.brush.setPosition(x, y).setScale(radius / BRUSH_RADIUS).setAlpha(alpha);
    this.darkness.erase(this.brush);
  }

  /** Shows the warm light_radial tint number `index` at `at`, scaled to `radius`. */
  private showHalo(index: number, at: Point, radius: number, alpha: number): void {
    let halo = this.halos[index];
    if (!halo) {
      halo = this.scene.add.image(0, 0, 'light_radial').setDepth(DEPTH_TINT).setBlendMode(Phaser.BlendModes.ADD);
      this.halos.push(halo);
    }
    halo.setVisible(true).setPosition(at.x, at.y).setScale(radius / BRUSH_RADIUS).setAlpha(alpha);
  }

  /**
   * Draws the footprint cells into the core stamp over the bounding box of the footprints. Each 2px cell whose centre
   * `isPointLit` is erased: a cell lit by a circle keeps the brightest such circle's shade (none at the centre,
   * CORE_EDGE_SHADE of the ambient at the edge); a cell lit only by an area keeps AREA_SHADE and is tinted warm. Runs of
   * one alpha in a row are drawn as one rect.
   */
  private drawCore(footprints: readonly Footprint[], blockers: readonly Rect[]): void {
    this.coreStamp.clear();
    const box = footprintBox(footprints);
    if (!box) return;
    const cols = Math.ceil((box.right - box.left) / LIT_CELL);
    const rows = Math.ceil((box.bottom - box.top) / LIT_CELL);
    const circles = footprints.filter((f): f is Circle => f.kind === 'circle');

    // Per cell: the erase alpha (0 = unlit), and whether only an area lights it.
    const alphas: number[][] = [];
    const areaOnly: boolean[][] = [];
    for (let row = 0; row < rows; row++) {
      const y = box.top + row * LIT_CELL;
      const cellH = Math.min(LIT_CELL, box.bottom - y);
      const line: number[] = [];
      const areaLine: boolean[] = [];
      for (let col = 0; col < cols; col++) {
        const x = box.left + col * LIT_CELL;
        const cellW = Math.min(LIT_CELL, box.right - x);
        const centre = { x: x + cellW / 2, y: y + cellH / 2 };
        if (!isPointLit(centre, footprints, blockers)) {
          line.push(0);
          areaLine.push(false);
          continue;
        }
        const shade = circleShade(centre, circles, blockers);
        line.push(quantizeAlpha(1 - (shade ?? AREA_SHADE)));
        areaLine.push(shade === null);
      }
      alphas.push(line);
      areaOnly.push(areaLine);
    }

    const levels = new Set(alphas.flat());
    levels.delete(0);
    for (const level of levels) {
      this.coreStamp.fillStyle(0xffffff, level);
      forEachRun(alphas, (value) => value === level, box, (x, y, w, h) => this.coreStamp.fillRect(x, y, w, h));
    }
    this.areaTint.fillStyle(LIT_FILL, AREA_TINT_ALPHA);
    forEachRun(areaOnly, (value) => value, box, (x, y, w, h) => this.areaTint.fillRect(x, y, w, h));
  }
}

/** A circle footprint. */
type Circle = Extract<Footprint, { kind: 'circle' }>;

/** Rounds a cell alpha to ALPHA_STEP so that neighbours with the same level merge into one rect. */
function quantizeAlpha(alpha: number): number {
  return Math.round(alpha / ALPHA_STEP) * ALPHA_STEP;
}

/**
 * The shade (share of the ambient left) of the brightest circle that lights `p` on its own, or null when no circle
 * lights it. A circle's shade grows from 0 at its centre to CORE_EDGE_SHADE at its edge.
 */
function circleShade(p: Point, circles: readonly Circle[], blockers: readonly Rect[]): number | null {
  let best: number | null = null;
  for (const c of circles) {
    if (!isPointLit(p, [c], blockers)) continue;
    const t = Math.hypot(p.x - c.center.x, p.y - c.center.y) / c.radius;
    const shade = CORE_EDGE_SHADE * t * t;
    if (best === null || shade < best) best = shade;
  }
  return best;
}

/** Calls `draw` once per horizontal run of cells that `match`, in world px. */
function forEachRun<T>(
  grid: readonly (readonly T[])[],
  match: (value: T) => boolean,
  box: { left: number; top: number; right: number; bottom: number },
  draw: (x: number, y: number, w: number, h: number) => void,
): void {
  grid.forEach((line, row) => {
    const y = box.top + row * LIT_CELL;
    const h = Math.min(LIT_CELL, box.bottom - y);
    let col = 0;
    while (col < line.length) {
      if (!match(line[col])) {
        col++;
        continue;
      }
      const start = col;
      while (col < line.length && match(line[col])) col++;
      const x = box.left + start * LIT_CELL;
      const right = Math.min(box.left + col * LIT_CELL, box.right);
      draw(x, y, right - x, h);
    }
  });
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
