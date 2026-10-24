import Phaser from 'phaser';
import type { Point } from '../v4/core/geometry';
import { canPulse } from '../v4/core/lantern';
import type { LanternState } from '../v4/core/lantern';
import { SoundSystem } from './SoundSystem';

export type PulseCallback = (x: number, y: number, maxRadius: number) => void;

/** Numbers for the falloff-shaded lantern box: a lit box and a dark (lantern off) box, each with its darkness and halo. */
export type LanternLightingProfile = {
  litShadeSize: number;
  litDarkness: number;
  litHaloScale: number;
  litHaloAlpha: number;
  darkShadeSize: number;
  darkDarkness: number;
  darkHaloScale: number;
  darkHaloAlpha: number;
};

// Forest night lighting, shared by Level 01 (Forgotten Forest Edge) and Level 02 (Whispering Woods):
// a falloff-shaded lantern box inside a dark forest.
export const FOREST_LIGHTING: LanternLightingProfile = {
  litShadeSize: 300, litDarkness: 0.80, litHaloScale: 0.80, litHaloAlpha: 0.48,
  darkShadeSize: 120, darkDarkness: 0.88, darkHaloScale: 0.30, darkHaloAlpha: 0.14,
};

// Level 03 (Library Beneath the Roots): a wider warm box when lit keeps the tablets readable across the room;
// with the lantern off, the box is tighter and the room darker, and the glowing dark ink carries the clues.
export const LIBRARY_LIGHTING: LanternLightingProfile = {
  litShadeSize: 380, litDarkness: 0.62, litHaloScale: 0.75, litHaloAlpha: 0.42,
  darkShadeSize: 170, darkDarkness: 0.74, darkHaloScale: 0.30, darkHaloAlpha: 0.12,
};

/**
 * Render-only lantern light. The lantern's state (in hand or on a pedestal, lit or not) is owned by the
 * caller and passed into `update()`; this class only draws it and keeps the Pulse wave and its cooldown.
 */
export class LanternSystem {
  private scene: Phaser.Scene;
  private darknessOverlay: Phaser.GameObjects.Graphics;
  private haloSprite: Phaser.GameObjects.Image;
  private pulseGraphics: Phaser.GameObjects.Graphics;
  private vignetteImage: Phaser.GameObjects.Image;
  private forestEdgeShade?: Phaser.GameObjects.Image;
  /** Set when the shaded box recipe is active (an explicit profile); null for generic lighting. */
  private readonly shadedLighting: LanternLightingProfile | null;

  private flickerTime = 0;
  private pulseCooldownRemaining = 0; // ms
  private pulseActiveTime = 0;        // ms (0..1000)
  private pulseOriginX = 0;
  private pulseOriginY = 0;
  private pulseListeners: PulseCallback[] = [];
  /** False for a level without darkness (lighting 'none'): no halo, vignette or darkness overlay; Pulse still draws. */
  private lightingEnabled = true;

  public static readonly PULSE_COOLDOWN_MS = 3000;
  public static readonly PULSE_DURATION_MS = 1000;
  public static readonly PULSE_MAX_RADIUS = 195;

  /** @param profile shaded falloff box numbers; omit for the generic lighting branch. */
  constructor(scene: Phaser.Scene, profile?: LanternLightingProfile) {
    this.scene = scene;
    this.shadedLighting = profile ?? null;

    this.darknessOverlay = scene.add.graphics();
    this.darknessOverlay.setDepth(68);

    this.haloSprite = scene.add.image(0, 0, 'light_radial');
    this.haloSprite.setDepth(69);

    this.pulseGraphics = scene.add.graphics();
    this.pulseGraphics.setDepth(70);

    this.vignetteImage = scene.add.image(320, 180, 'vignette');
    this.vignetteImage.setDepth(71);
    this.vignetteImage.setScrollFactor(0);
    if (this.shadedLighting) {
      this.vignetteImage.setVisible(false);
      if (!scene.textures.exists('level01_darkness_falloff')) {
        throw new Error('Missing darkness falloff texture');
      }
      this.forestEdgeShade = scene.add.image(0, 0, 'level01_darkness_falloff').setDepth(68.5);
    }
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

  /** Where the carried lamp's light sits relative to the player; the halo and every beam from the carried lamp share it. */
  public getCarriedLightPosition(player: Point): Point {
    return { x: player.x + 6, y: player.y + 2 };
  }

  public getCooldownRatio(): number {
    return Math.max(0, Math.min(1, this.pulseCooldownRemaining / LanternSystem.PULSE_COOLDOWN_MS));
  }

  /**
   * Draws the lantern light for this frame.
   * @param player the player's centre, used for the carried light and the lamp-off halo
   * @param lantern the lantern's state; lit when `lantern.on`
   * @param placedAt where the placed lantern's light sits (the pedestal point), or null when it is not placed
   */
  public update(dt: number, player: Point, lantern: LanternState, placedAt: Point | null): void {
    this.flickerTime += dt * 0.005;

    if (this.pulseCooldownRemaining > 0) {
      this.pulseCooldownRemaining = Math.max(0, this.pulseCooldownRemaining - dt);
    }

    const carried = this.getCarriedLightPosition(player);
    const placed = lantern.location.at === 'pedestal' ? placedAt : null;
    const lightX = placed ? placed.x : carried.x;
    const lightY = placed ? placed.y : carried.y;

    // Gentle 2-4% organic flicker
    const flicker = 1 + Math.sin(this.flickerTime * 2.3) * 0.025 + Math.cos(this.flickerTime * 5.7) * 0.012;

    this.darknessOverlay.clear();
    this.vignetteImage.setVisible(this.lightingEnabled && !this.shadedLighting);
    this.forestEdgeShade?.setVisible(this.lightingEnabled && this.shadedLighting !== null);

    if (!this.lightingEnabled) {
      this.haloSprite.setVisible(false);
    } else if (this.shadedLighting) {
      // The shaded falloff box: the profile picks the numbers, the box and halo code below is shared.
      const profile = this.shadedLighting;
      const activeLantern = lantern.on;
      this.haloSprite.setVisible(true);
      this.haloSprite.setPosition(lightX, lightY);
      this.haloSprite.setScale((activeLantern ? profile.litHaloScale : profile.darkHaloScale) * flicker);
      this.haloSprite.setAlpha(activeLantern ? profile.litHaloAlpha : profile.darkHaloAlpha);
      const darknessAlpha = activeLantern ? profile.litDarkness : profile.darkDarkness;
      const size = activeLantern ? profile.litShadeSize : profile.darkShadeSize;
      const shadeX = Math.round(lightX);
      const shadeY = Math.round(lightY);
      this.forestEdgeShade!.setPosition(shadeX, shadeY).setDisplaySize(size, size).setAlpha(darknessAlpha);
      this.fillForestEdgeDarknessOutside(shadeX, shadeY, size, darknessAlpha);
    } else if (lantern.on) {
      // Night mode with warm lantern light active (radius ~115 world px)
      this.haloSprite.setVisible(true);
      this.haloSprite.setPosition(lightX, lightY);
      this.haloSprite.setScale(0.95 * flicker);
      this.haloSprite.setAlpha(0.88);

      // Subtle outer darkness frame so environment stays readable while focusing light
      this.darknessOverlay.fillStyle(0x040d12, 0.24);
      this.darknessOverlay.fillRect(0, 0, 640, 360);
    } else {
      // Lantern OFF: dim atmosphere (0.46 alpha) so player, paths, and locks remain clearly visible
      this.haloSprite.setVisible(true);
      this.haloSprite.setPosition(player.x, player.y);
      this.haloSprite.setScale(0.38);
      this.haloSprite.setAlpha(0.32);

      this.darknessOverlay.fillStyle(0x040b12, 0.44);
      this.darknessOverlay.fillRect(0, 0, 640, 360);
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

  private fillForestEdgeDarknessOutside(centerX: number, centerY: number, size: number, alpha: number): void {
    const half = size / 2;
    const left = Phaser.Math.Clamp(centerX - half, 0, 640);
    const right = Phaser.Math.Clamp(centerX + half, 0, 640);
    const top = Phaser.Math.Clamp(centerY - half, 0, 360);
    const bottom = Phaser.Math.Clamp(centerY + half, 0, 360);
    this.darknessOverlay.fillStyle(0x03080c, alpha);
    if (top > 0) this.darknessOverlay.fillRect(0, 0, 640, top);
    if (bottom < 360) this.darknessOverlay.fillRect(0, bottom, 640, 360 - bottom);
    if (left > 0 && bottom > top) this.darknessOverlay.fillRect(0, top, left, bottom - top);
    if (right < 640 && bottom > top) this.darknessOverlay.fillRect(right, top, 640 - right, bottom - top);
  }
}
