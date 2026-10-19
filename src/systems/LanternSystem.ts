import Phaser from 'phaser';
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

export class LanternSystem {
  private scene: Phaser.Scene;
  private darknessOverlay: Phaser.GameObjects.Graphics;
  private haloSprite: Phaser.GameObjects.Image;
  private pulseGraphics: Phaser.GameObjects.Graphics;
  private vignetteImage: Phaser.GameObjects.Image;
  private forestEdgeShade?: Phaser.GameObjects.Image;
  /** Set when the shaded box recipe is active (forest levels or an explicit profile); null for generic lighting. */
  private readonly shadedLighting: LanternLightingProfile | null;

  public lanternOn = true;
  public lanternInHand = true;
  public lanternPlaced = false;
  public placedX = 0;
  public placedY = 0;
  public isDawnMode = false;
  public isOverloadMode = false;

  private flickerTime = 0;
  private pulseCooldownRemaining = 0; // ms
  private pulseActiveTime = 0;        // ms (0..1000)
  private pulseOriginX = 0;
  private pulseOriginY = 0;
  private pulseListeners: PulseCallback[] = [];
  private lastToggleTime = 0;

  public static readonly PULSE_COOLDOWN_MS = 3000;
  public static readonly PULSE_DURATION_MS = 1000;
  public static readonly PULSE_MAX_RADIUS = 195;

  constructor(scene: Phaser.Scene, forestEdgeLighting = false, woodsLighting = false, profile?: LanternLightingProfile) {
    this.scene = scene;
    this.shadedLighting = profile ?? (forestEdgeLighting || woodsLighting ? FOREST_LIGHTING : null);

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
        throw new Error(profile ? 'Missing darkness falloff texture for Level 03'
          : forestEdgeLighting ? 'Missing Level 01 darkness falloff texture' : 'Missing darkness falloff texture for Level 02');
      }
      this.forestEdgeShade = scene.add.image(0, 0, 'level01_darkness_falloff').setDepth(68.5);
    }
  }

  public onPulse(cb: PulseCallback): void {
    this.pulseListeners.push(cb);
  }

  public clearPulseListeners(): void {
    this.pulseListeners = [];
  }

  public toggleLantern(now: number): boolean {
    if (!this.lanternInHand || this.lanternPlaced) return false;
    if (now - this.lastToggleTime < 140) return false;
    this.lastToggleTime = now;
    this.lanternOn = !this.lanternOn;
    SoundSystem.playLanternToggle(this.lanternOn);
    return true;
  }

  public placeLanternAt(x: number, y: number): void {
    this.lanternPlaced = true;
    this.lanternInHand = false;
    this.lanternOn = true;
    this.placedX = x;
    this.placedY = y;
    SoundSystem.playLanternToggle(true);
  }

  public retrieveLantern(): void {
    this.lanternPlaced = false;
    this.lanternInHand = true;
    this.lanternOn = true;
    SoundSystem.playLanternToggle(true);
  }

  public triggerPulse(originX: number, originY: number): boolean {
    if (!this.lanternInHand || this.lanternPlaced || !this.lanternOn) return false;
    if (this.pulseCooldownRemaining > 0) return false;

    this.pulseCooldownRemaining = LanternSystem.PULSE_COOLDOWN_MS;
    this.pulseActiveTime = 1;
    this.pulseOriginX = originX;
    this.pulseOriginY = originY;

    SoundSystem.playLightPulse();
    for (const cb of this.pulseListeners) {
      cb(originX, originY, LanternSystem.PULSE_MAX_RADIUS);
    }
    return true;
  }

  public getCooldownRatio(): number {
    return Math.max(0, Math.min(1, this.pulseCooldownRemaining / LanternSystem.PULSE_COOLDOWN_MS));
  }

  public update(dt: number, playerX: number, playerY: number): void {
    this.flickerTime += dt * 0.005;

    if (this.pulseCooldownRemaining > 0) {
      this.pulseCooldownRemaining = Math.max(0, this.pulseCooldownRemaining - dt);
    }

    const lightX = this.lanternPlaced ? this.placedX : playerX + 6;
    const lightY = this.lanternPlaced ? this.placedY - 6 : playerY + 2;

    // Gentle 2-4% organic flicker
    const flicker = 1 + Math.sin(this.flickerTime * 2.3) * 0.025 + Math.cos(this.flickerTime * 5.7) * 0.012;

    this.darknessOverlay.clear();

    if (this.isDawnMode) {
      // Warm golden morning wash instead of night darkness
      this.haloSprite.setVisible(false);
      this.darknessOverlay.fillStyle(0xffe6a3, 0.08);
      this.darknessOverlay.fillRect(0, 0, 640, 360);
    } else if (this.isOverloadMode) {
      // Blinding white-gold light overload waiting for F
      this.haloSprite.setVisible(true);
      this.haloSprite.setPosition(320, 165);
      this.haloSprite.setScale(2.3 * flicker);
      this.haloSprite.setAlpha(0.95);
      const pulseAlpha = 0.36 + Math.sin(this.flickerTime * 4) * 0.12;
      this.darknessOverlay.fillStyle(0xfff5cc, pulseAlpha);
      this.darknessOverlay.fillRect(0, 0, 640, 360);
    } else if (this.shadedLighting) {
      // Forest levels (01 and 02) share the forest profile; Level 03 passes its own. The flags only pick the profile
      // and the missing-texture message, so the box and halo code below is shared.
      const profile = this.shadedLighting;
      const activeLantern = this.lanternOn && (this.lanternInHand || this.lanternPlaced);
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
    } else if (this.lanternOn && (this.lanternInHand || this.lanternPlaced)) {
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
      this.haloSprite.setPosition(playerX, playerY);
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
