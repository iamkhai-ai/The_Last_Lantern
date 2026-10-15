import Phaser from 'phaser';
import { ZoneId } from '../types/gameTypes';

interface FireflyParticle {
  sprite: Phaser.GameObjects.Image;
  baseX: number;
  baseY: number;
  speed: number;
  phase: number;
  ampX: number;
  ampY: number;
}

interface MistLayer {
  sprite: Phaser.GameObjects.Image;
  vx: number;
}

interface WeatherMote {
  sprite: Phaser.GameObjects.Image;
  vy: number;
  swayAmp: number;
  swaySpeed: number;
  phase: number;
}

export class EffectsSystem {
  private scene: Phaser.Scene;
  private fireflies: FireflyParticle[] = [];
  private mists: MistLayer[] = [];
  private weather: WeatherMote[] = [];
  private rippleGraphics: Phaser.GameObjects.Graphics;
  private elapsed = 0;
  private currentZone: ZoneId = 'hub';
  private isDawn = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.rippleGraphics = scene.add.graphics();
    this.rippleGraphics.setDepth(4);
  }

  public setupZoneEffects(zone: ZoneId, isDawn = false): void {
    this.clear();
    this.currentZone = zone;
    this.isDawn = isDawn;

    const count = isDawn ? 38 : zone === 'woods' ? 28 : 20;
    for (let i = 0; i < count; i++) {
      const bx = 40 + Math.random() * 560;
      const by = 45 + Math.random() * 270;
      const sp = this.scene.add.image(bx, by, 'particle_firefly');
      sp.setDepth(62);
      sp.setScale(0.6 + Math.random() * 0.65);

      if (isDawn && i % 3 === 0) {
        sp.setTint(0xf28b78);
      } else if (zone === 'creek') {
        sp.setTint(0x9ad9ea);
      } else if (zone === 'ruins') {
        sp.setTint(0xd28cff);
      } else {
        sp.setTint(0xffe680);
      }

      this.fireflies.push({
        sprite: sp,
        baseX: bx,
        baseY: by,
        speed: 0.8 + Math.random() * 1.4,
        phase: Math.random() * Math.PI * 2,
        ampX: 10 + Math.random() * 18,
        ampY: 6 + Math.random() * 14,
      });
    }

    // Add 4 drifting mist clouds
    if (!isDawn) {
      for (let m = 0; m < 4; m++) {
        const mist = this.scene.add.image(
          80 + m * 150,
          90 + (m % 2) * 150,
          'particle_mist'
        );
        mist.setDepth(60);
        mist.setScale(1.8, 1.4);
        mist.setAlpha(0.45);
        this.mists.push({
          sprite: mist,
          vx: (m % 2 === 0 ? 1 : -1) * (4 + m * 1.5),
        });
      }
    }

    // Zone weather: petals / mist drops / violet ash drifting down
    const weatherTex =
      zone === 'woods'
        ? ['mote_petal', 'mote_petal_white']
        : zone === 'creek'
          ? ['mote_drop']
          : zone === 'ruins'
            ? ['mote_ash']
            : ['mote_petal_white'];
    const weatherCount = isDawn ? 22 : 16;
    for (let i = 0; i < weatherCount; i++) {
      const sp = this.scene.add.image(
        Math.random() * 640,
        Math.random() * 360,
        weatherTex[i % weatherTex.length]
      );
      sp.setDepth(61);
      sp.setAlpha(0.55 + Math.random() * 0.35);
      const s = 0.7 + Math.random() * 0.7;
      sp.setScale(s);
      this.weather.push({
        sprite: sp,
        vy: (zone === 'ruins' ? 9 : 13) + Math.random() * 10,
        swayAmp: 8 + Math.random() * 14,
        swaySpeed: 0.8 + Math.random() * 1.2,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  public spawnBurst(x: number, y: number, colorHex = 0xffe680, count = 14): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.25;
      const dist = 16 + Math.random() * 26;
      const p = this.scene.add.image(x, y, 'particle_firefly');
      p.setDepth(75);
      p.setTint(colorHex);
      p.setScale(0.95);

      this.scene.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.2,
        duration: 550 + Math.random() * 250,
        onComplete: () => p.destroy(),
      });
    }
  }

  public update(dt: number): void {
    this.elapsed += dt * 0.001;

    for (const f of this.fireflies) {
      const t = this.elapsed * f.speed + f.phase;
      f.sprite.x = f.baseX + Math.cos(t) * f.ampX;
      f.sprite.y = f.baseY + Math.sin(t * 1.3) * f.ampY;
      f.sprite.alpha = 0.4 + 0.55 * (0.5 + 0.5 * Math.sin(t * 2.2));
    }

    for (const m of this.mists) {
      m.sprite.x += m.vx * (dt * 0.001);
      if (m.sprite.x > 700) m.sprite.x = -60;
      if (m.sprite.x < -60) m.sprite.x = 700;
    }

    for (const w of this.weather) {
      const sp = w.sprite;
      sp.y += w.vy * (dt * 0.001);
      sp.x += Math.cos(this.elapsed * w.swaySpeed + w.phase) * w.swayAmp * (dt * 0.001);
      sp.rotation += dt * 0.0006;
      if (sp.y > 375) {
        sp.y = -12;
        sp.x = Math.random() * 640;
      }
      if (sp.x > 655) sp.x = -12;
      if (sp.x < -12) sp.x = 655;
    }

    // Water ripples in Moonlit Creek
    this.rippleGraphics.clear();
    if (this.currentZone === 'creek') {
      this.rippleGraphics.lineStyle(1, 0x629bb8, 0.45);
      const ripples = [
        [455, 65],
        [425, 115],
        [385, 165],
        [345, 215],
        [305, 265],
        [265, 315],
        [520, 145],
        [485, 205],
      ];
      ripples.forEach(([rx, ry], idx) => {
        const shift = Math.sin(this.elapsed * 2 + idx) * 5;
        this.rippleGraphics.beginPath();
        this.rippleGraphics.moveTo(rx + shift - 8, ry + 2);
        this.rippleGraphics.lineTo(rx + shift + 8, ry - 2);
        this.rippleGraphics.strokePath();
      });
    }
  }

  public clear(): void {
    for (const f of this.fireflies) f.sprite.destroy();
    for (const m of this.mists) m.sprite.destroy();
    for (const w of this.weather) w.sprite.destroy();
    this.fireflies = [];
    this.mists = [];
    this.weather = [];
    this.rippleGraphics.clear();
  }
}
