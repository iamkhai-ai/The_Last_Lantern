import Phaser from 'phaser';
import { getLevelArtKey, getNhinhTexture, getShadowArtKey, getSharedMechanismKey, type ShadowPose } from '../art/CampaignArt';
import {
  EndingMachine, endingBeatLines, MONTAGE_SHOTS, SHADOW_DAWN_POSES, type EndingEffect, type EndingLine,
} from '../data/campaignEnding';
import { SoundSystem } from './SoundSystem';
import type { DialogueLine } from '../types/gameTypes';
import type { CampaignEndingBeat, CampaignProgress } from './CampaignSaveSystem';

export type { CampaignEndingBeat };

export interface CampaignEndingSequenceOptions {
  scene: Phaser.Scene;
  progress: CampaignProgress;
  /** Persists `progress`; called once at each beat boundary. */
  save: () => void;
  showDialogue: (lines: DialogueLine[], onComplete: () => void) => void;
  stopDialogue: () => void;
  showCredits: () => void;
}

/**
 * Draws the campaign ending (scenario 10, sections 6 and 7) from the pure beat machine. EndingScene owns the keyboard,
 * the pointer, the dialogue box and the credits; this class owns the pictures and the timeline of one beat at a time.
 * Every beat rebuilds its whole stage, so resuming a checkpoint never depends on a controller that no longer exists.
 */
export class CampaignEndingSequence {
  private readonly scene: Phaser.Scene;
  private readonly progress: CampaignProgress;
  private readonly machine = new EndingMachine();
  private readonly saveProgress: () => void;
  private readonly showDialogue: CampaignEndingSequenceOptions['showDialogue'];
  private readonly stopDialogue: () => void;
  private readonly showCredits: () => void;

  private layer: Phaser.GameObjects.GameObject[] = [];
  private shotObjects: Phaser.GameObjects.GameObject[] = [];
  private destroyed = false;
  private clock = 0;

  private lumo?: Phaser.GameObjects.Image;
  private nhinh?: Phaser.GameObjects.Image;
  private shadow?: Phaser.GameObjects.Image;
  /** Spokes turning over the observatory's painted wheel (the wheel is part of the room picture, so its motion is drawn). */
  private spokes?: Phaser.GameObjects.Graphics;
  private fireflies: Phaser.GameObjects.Arc[] = [];
  private water?: Phaser.GameObjects.Graphics;
  private title?: Phaser.GameObjects.Image;
  private pickup = false;
  private cues = new Set<string>();

  constructor(options: CampaignEndingSequenceOptions) {
    this.scene = options.scene;
    this.progress = options.progress;
    this.saveProgress = options.save;
    this.showDialogue = options.showDialogue;
    this.stopDialogue = options.stopDialogue;
    this.showCredits = options.showCredits;
  }

  public start(beat: CampaignEndingBeat): void {
    this.apply(this.machine.begin(beat));
  }

  public getBeat(): CampaignEndingBeat { return this.machine.beat; }

  public canAdvance(): boolean { return !this.destroyed && !this.pickup && this.machine.canAdvance(); }

  /** The label of the continue control, or null while nothing can be advanced (silence, dialogue, montage shot). */
  public getPrompt(): string | null { return this.canAdvance() ? this.machine.prompt() : null; }

  public advance(): void {
    if (!this.canAdvance()) return;
    this.apply(this.machine.press());
  }

  /** `paused` freezes every timer: the silence, the montage and the title wait do not run behind a pause. */
  public update(deltaMs: number, paused: boolean): void {
    if (this.destroyed || paused) return;
    this.clock += deltaMs;
    this.apply(this.machine.tick(deltaMs, false));
    this.animate(deltaMs);
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stopDialogue();
    this.clearLayer();
  }

  /* ------------------------------------------------------------------ effects */

  private apply(effects: EndingEffect[]): void {
    for (const effect of effects) {
      if (this.destroyed) return;
      switch (effect.type) {
        case 'enter': this.enter(effect.beat, effect.lines); break;
        case 'shot': this.buildShot(effect.index); break;
        case 'pose': if (effect.index === 0) SoundSystem.playDawnChord(); this.setShadowPose(SHADOW_DAWN_POSES[effect.index]); break;
        case 'title': this.showTitle(); break;
        case 'ambient': this.ambient(effect.progress); break;
        default: break;
      }
    }
  }

  private enter(beat: CampaignEndingBeat, lines: readonly EndingLine[] | null): void {
    this.stopDialogue();
    this.clearLayer();
    // The checkpoint is saved at the boundary, once; every beat resumes by rebuilding its own stage.
    this.progress.flags['l9-ending-beat'] = beat;
    this.saveProgress();
    switch (beat) {
      case 'night-call': this.buildNight(0.72, 0.15); break;
      case 'night-wait': this.buildNight(0.72, 0.15); break;
      case 'reassure': this.buildNight(0.42, 0.85); break;
      case 'montage': this.buildShot(0); break;
      case 'shadow-dawn': this.buildShadowDawn(); break;
      case 'tree-return': this.buildTreeReturn(); break;
      case 'seated': this.buildSeated(); break;
      case 'trail-title': this.buildTrail(); break;
      case 'credits': this.showCredits(); return;
      default: break;
    }
    if (lines && !this.pickup) this.speak(beat, lines);
  }

  private speak(beat: CampaignEndingBeat, lines: readonly EndingLine[]): void {
    this.showDialogue(lines.map((line): DialogueLine => ({ speaker: line.speaker, text: line.text })), () => {
      if (this.destroyed || this.machine.beat !== beat) return;
      this.machine.dialogueFinished();
    });
  }

  /* ------------------------------------------------------------------ helpers */

  private track<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.layer.push(object);
    return object;
  }

  private clearLayer(): void {
    for (const object of this.layer) {
      if (!object.active) continue;
      this.scene.tweens.killTweensOf(object);
      object.destroy();
    }
    this.layer = [];
    this.shotObjects = [];
    this.fireflies = [];
    this.lumo = undefined; this.nhinh = undefined; this.shadow = undefined; this.spokes = undefined;
    this.water = undefined; this.title = undefined;
    this.pickup = false;
    this.cues.clear();
  }

  private exists(key: string | null): key is string {
    return Boolean(key && this.scene.textures.exists(key));
  }

  private background(key: string | null): Phaser.GameObjects.Image | undefined {
    if (!this.exists(key)) return undefined;
    return this.track(this.scene.add.image(0, 0, key).setOrigin(0, 0).setDisplaySize(640, 360).setDepth(0));
  }

  private overlay(alpha: number, depth: number, colour = 0x050b16): Phaser.GameObjects.Rectangle {
    return this.track(this.scene.add.rectangle(320, 180, 640, 360, colour, alpha).setDepth(depth));
  }

  private dawnOverlay(alpha: number): void {
    const key = getLevelArtKey(9, 'ending-dawn-lighting-overlay');
    if (this.exists(key)) this.track(this.scene.add.image(0, 0, key).setOrigin(0, 0).setAlpha(alpha).setDepth(40));
  }

  private lumoSprite(x: number, y: number, alpha: number): Phaser.GameObjects.Image | undefined {
    if (!this.scene.textures.exists('lumo_0')) return undefined;
    const lumo = this.track(this.scene.add.image(x, y, 'lumo_0').setAlpha(alpha).setDepth(26));
    this.scene.tweens.add({ targets: lumo, y: y - 6, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return lumo;
  }

  private nhinhSprite(key: string | null, x: number, y: number): Phaser.GameObjects.Image | undefined {
    if (!this.exists(key)) return undefined;
    return this.track(this.scene.add.image(x, y, key).setOrigin(0.5, 1).setDepth(20 + y / 100));
  }

  /* ------------------------------------------------------------------ beats */

  /** The Mother Tree at night. `lumoAlpha` is how bright Lumo's light is: he dims in the dark and comes back softer. */
  private buildNight(darkness: number, lumoAlpha: number): void {
    this.background(getLevelArtKey(9, 'sanctuary-base'));
    this.overlay(darkness, 30);
    // Actors stand above y=250 so the dialogue box (y256..344) never covers them.
    this.nhinh = this.nhinhSprite(getLevelArtKey(9, 'ending-nhinh-carry-off-reference'), 300, 240);
    this.lumo = this.lumoSprite(338, 208, lumoAlpha);
    this.fireflies = [];
    const spots: Array<[number, number]> = [[150, 220], [210, 160], [470, 190], [520, 250], [400, 150], [90, 270]];
    for (const [x, y] of spots) {
      const glow = this.track(this.scene.add.circle(x, y, 2.5, 0xf6e7a1, 0.9).setDepth(35).setAlpha(0));
      this.fireflies.push(glow);
    }
    this.water = this.track(this.scene.add.graphics().setDepth(34));
  }

  /** Night wait: the insect, the water and the first fireflies come back one by one; Lumo's light returns, softer. */
  private ambient(progress: number): void {
    // sound, once each: the cricket, then the water, then a second cricket answering
    for (const [at, cue] of [[0.3, 'cricket'], [0.55, 'water'], [0.8, 'answer']] as const) {
      if (progress >= at && !this.cues.has(cue)) { this.cues.add(cue); SoundSystem.playEndingCue(cue); }
    }
    this.lumo?.setAlpha(0.15 + 0.7 * progress);
    this.fireflies.forEach((glow, index) => {
      const start = 0.25 + index * 0.1;
      glow.setAlpha(Phaser.Math.Clamp((progress - start) * 4, 0, 0.9));
    });
    if (this.water) {
      this.water.clear();
      this.water.lineStyle(1, 0xbfe8f2, Phaser.Math.Clamp((progress - 0.45) * 1.4, 0, 0.5));
      for (let line = 0; line < 4; line += 1) {
        const y = 300 + line * 6;
        const shift = (this.clock / 40 + line * 17) % 60;
        this.water.lineBetween(120 + shift, y, 150 + shift, y);
      }
    }
  }

  private shotBackground(index: number): string | null {
    switch (MONTAGE_SHOTS[index]) {
      case 'garden': return getLevelArtKey(6, 'garden-scene-base');
      case 'creek': return getLevelArtKey(3, 'creek-scene-base');
      case 'tower': return getLevelArtKey(5, 'tower-scene-base');
      default: return getLevelArtKey(8, 'observatory-clean-base');
    }
  }

  /** One montage shot: garden seedlings sway, creek water runs, the tower window turns pink, the wheel turns. */
  private buildShot(index: number): void {
    for (const old of this.shotObjects) {
      if (!old.active) continue;
      this.scene.tweens.killTweensOf(old);
      old.destroy();
    }
    this.layer = this.layer.filter((object) => object.active);
    this.shotObjects = [];
    this.spokes = undefined;
    this.water = undefined;
    const add = <T extends Phaser.GameObjects.GameObject>(object: T): T => { this.shotObjects.push(object); return this.track(object); };
    const key = this.shotBackground(index);
    if (this.exists(key)) add(this.scene.add.image(0, 0, key).setOrigin(0, 0).setDisplaySize(640, 360).setDepth(0));
    const dawn = getLevelArtKey(9, 'ending-dawn-lighting-overlay');
    if (this.exists(dawn)) add(this.scene.add.image(0, 0, dawn).setOrigin(0, 0).setAlpha(0.55).setDepth(40));
    const shot = MONTAGE_SHOTS[index];
    if (shot === 'garden') {
      const sprout = getSharedMechanismKey('sprout-after');
      if (this.exists(sprout)) {
        for (const [x, y] of [[470, 262], [500, 268], [530, 262]] as Array<[number, number]>) {
          const plant = add(this.scene.add.image(x, y, sprout).setOrigin(0.5, 1).setDepth(12));
          this.scene.tweens.add({ targets: plant, angle: 5, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        }
      }
    } else if (shot === 'creek') {
      this.water = add(this.scene.add.graphics().setDepth(14));
    } else if (shot === 'tower') {
      const window = add(this.scene.add.ellipse(455, 45, 70, 90, 0xf2a0b4, 0.0).setDepth(41));
      this.scene.tweens.add({ targets: window, fillAlpha: 0.38, duration: 1600, ease: 'Sine.easeInOut' });
    } else {
      this.spokes = add(this.scene.add.graphics().setDepth(12));
    }
    for (const object of this.shotObjects) {
      if ('setAlpha' in object && shot !== 'tower') {
        const target = object as Phaser.GameObjects.Image;
        const alpha = target.alpha;
        target.setAlpha(0);
        this.scene.tweens.add({ targets: target, alpha, duration: 450 });
      }
    }
  }

  private buildShadowDawn(): void {
    this.background(getLevelArtKey(8, 'observatory-clean-base'));
    this.dawnOverlay(0.55);
    this.spokes = this.track(this.scene.add.graphics().setDepth(12));
    const stillness = getShadowArtKey('stillness');
    if (this.exists(stillness)) {
      this.shadow = this.track(this.scene.add.image(330, 238, stillness).setOrigin(0.5, 1).setDepth(26));
    }
  }

  private setShadowPose(pose: ShadowPose | undefined): void {
    if (!pose || !this.shadow) return;
    const key = getShadowArtKey(pose);
    if (this.exists(key)) this.shadow.setTexture(key);
  }

  /** The Mother Tree at dawn. If the lamp was left dark on its pedestal, Nhinh takes it first (nothing relights it). */
  private buildTreeReturn(): void {
    this.background(getLevelArtKey(9, 'sanctuary-base'));
    this.dawnOverlay(0.6);
    const carry = getLevelArtKey(9, 'ending-nhinh-carry-off-reference');
    const parked = this.progress.flags['l9-lantern-placed'] === true && this.progress.flags['l9-lantern-retrieved'] !== true;
    if (parked) this.buildPickup(carry);
    else this.buildCarry(carry, 300, 240);
  }

  private buildCarry(carry: string | null, x: number, y: number): void {
    this.nhinh = this.nhinhSprite(carry, x, y);
    const leaf = getLevelArtKey(9, 'ending-leaf-handle-attachment');
    if (this.exists(leaf)) this.track(this.scene.add.image(x + 12, y - 16, leaf).setDepth(28));
    this.lumo = this.lumoSprite(x + 14, y - 38, 0.95);
  }

  /** Nhinh walks to the parked, dark lamp, takes it, and only then are the two lines spoken. */
  private buildPickup(carry: string | null): void {
    this.pickup = true;
    const pedestal = this.scene.textures.exists('pedestal_empty') ? this.track(this.scene.add.image(85, 260, 'pedestal_empty').setOrigin(0.5, 1).setDepth(12)) : undefined;
    const lamp = this.track(this.scene.add.rectangle(85, 232, 8, 11, 0x2a2118, 1).setDepth(13));
    void pedestal;
    this.nhinh = this.nhinhSprite(carry, 110, 258);
    this.lumo = this.lumoSprite(150, 226, 0.95);
    const nhinh = this.nhinh;
    this.scene.tweens.add({
      targets: lamp, x: 114, y: 236, duration: 900, delay: 500, ease: 'Sine.easeInOut',
      onComplete: () => {
        if (this.destroyed) return;
        // The lamp is in Nhinh's hand now: save the truth before the two lines, dark and with the leaf.
        this.progress.flags['l9-lantern-placed'] = false;
        this.progress.flags['l9-lantern-retrieved'] = true;
        this.saveProgress();
        if (lamp.active) lamp.destroy();
        if (nhinh?.active) this.scene.tweens.add({ targets: nhinh, x: 300, y: 240, duration: 1100, ease: 'Sine.easeInOut' });
        if (this.lumo?.active) this.scene.tweens.killTweensOf(this.lumo); // the idle bob would fight the walk
        this.scene.tweens.add({
          targets: this.lumo ?? [], x: 314, y: 202, duration: 1100, ease: 'Sine.easeInOut',
          onComplete: () => {
            if (this.destroyed) return;
            this.pickup = false;
            const leafKey = getLevelArtKey(9, 'ending-leaf-handle-attachment');
            if (this.exists(leafKey)) this.track(this.scene.add.image(312, 224, leafKey).setDepth(28));
            const lines = endingBeatLines('tree-return');
            if (this.machine.beat === 'tree-return' && lines) this.speak('tree-return', lines);
          },
        });
      },
    });
  }

  /** The seated key pose at its native 36x42 (never the 144x168 dialogue insert): the lamp stays dark and the leaf is on it. */
  private buildSeated(): void {
    this.background(getLevelArtKey(9, 'sanctuary-base'));
    this.dawnOverlay(0.55);
    this.nhinh = this.nhinhSprite(getLevelArtKey(9, 'ending-nhinh-seated-unlit-leaf'), 292, 244);
    this.lumo = this.lumoSprite(330, 214, 0.95);
  }

  /** Two figures leave on the trail, then the title appears. The walk uses the existing off-lamp frames. */
  private buildTrail(): void {
    this.background(getLevelArtKey(9, 'sanctuary-base'));
    this.dawnOverlay(0.6);
    const frame = getNhinhTexture('walk_nolamp', 'right', 0) ?? getLevelArtKey(9, 'ending-nhinh-carry-off-reference');
    this.nhinh = this.nhinhSprite(frame, 300, 244);
    this.lumo = this.lumoSprite(324, 214, 0.95);
    for (const target of [this.nhinh, this.lumo]) {
      if (target) this.scene.tweens.add({ targets: target, x: target.x + 360, duration: 3400, ease: 'Sine.easeIn' });
    }
  }

  private showTitle(): void {
    const key = getLevelArtKey(9, 'ending-title-the-last-dawn');
    if (!this.exists(key)) return;
    this.track(this.scene.add.rectangle(320, 180, 640, 360, 0x050b16, 0.35).setDepth(59));
    this.title = this.track(this.scene.add.image(0, 0, key).setOrigin(0, 0).setDepth(60).setAlpha(0));
    this.scene.tweens.add({ targets: this.title, alpha: 1, duration: 800 });
  }

  /* ------------------------------------------------------------------ per frame */

  private animate(deltaMs: number): void {
    if (this.spokes?.active) {
      // the painted wheel is centred at (440,83) with a ~54px rim: the dawn sets it turning again
      this.spokes.clear();
      this.spokes.lineStyle(2, 0xe6c874, 0.85);
      for (let index = 0; index < 8; index += 1) {
        const angle = this.clock * 0.0007 + (index * Math.PI) / 4;
        this.spokes.lineBetween(440 + Math.cos(angle) * 12, 83 + Math.sin(angle) * 12, 440 + Math.cos(angle) * 52, 83 + Math.sin(angle) * 52);
      }
    }
    if (this.machine.beat === 'trail-title' && this.nhinh?.active) {
      const frames = [0, 1, 2, 1];
      const step = frames[Math.floor(this.clock / 150) % frames.length];
      const key = getNhinhTexture('walk_nolamp', 'right', step);
      if (this.exists(key) && this.nhinh.texture.key !== key) this.nhinh.setTexture(key);
    }
    if (this.machine.beat === 'montage' && this.water?.active) {
      this.water.clear();
      this.water.lineStyle(1, 0xbfe8f2, 0.5);
      for (let line = 0; line < 6; line += 1) {
        const y = 150 + line * 16;
        const shift = (this.clock / 30 + line * 23) % 70;
        this.water.lineBetween(300 + shift * 0.4, y, 330 + shift * 0.4, y);
      }
    }
  }
}
