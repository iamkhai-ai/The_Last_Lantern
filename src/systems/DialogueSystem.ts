import Phaser from 'phaser';
import { speakerLabel, tr } from '../i18n/catalog.ts';
import { DialogueLine } from '../types/gameTypes';
import { SoundSystem } from './SoundSystem';

export class DialogueSystem {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bgGraphics: Phaser.GameObjects.Graphics;
  private speakerText: Phaser.GameObjects.Text;
  private bodyText: Phaser.GameObjects.Text;
  private hintText: Phaser.GameObjects.Text;
  private portraitFrame: Phaser.GameObjects.Graphics;
  private portrait: Phaser.GameObjects.Image;
  private static readonly PORTRAITS: Record<string, string> = {
    Nhinh: 'portrait_linh',
    Lumo: 'portrait_lumo',
  };

  private queue: DialogueLine[] = [];
  private currentIndex = 0;
  private fullLineText = '';
  private visibleChars = 0;
  private charTimer = 0;
  private active = false;
  private onCompleteCallback?: () => void;
  private lastInputTime = 0;
  private dismissedUntil = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.bgGraphics = scene.add.graphics();
    this.speakerText = scene.add.text(56, 266, '', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#f2d678',
    });

    this.bodyText = scene.add.text(56, 286, '', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '12px',
      color: '#f5efe0',
      wordWrap: { width: 528 },
      lineSpacing: 4,
    });

    this.hintText = scene.add.text(584, 330, tr('[E / Space] Tiếp →'), {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '10px',
      color: '#9ec4bd',
    });
    this.hintText.setOrigin(1, 0.5);

    this.portraitFrame = scene.add.graphics();
    this.portraitFrame.lineStyle(1.5, 0xd8b869, 0.9);
    this.portraitFrame.strokeRoundedRect(48, 272, 58, 58, 4);
    this.portrait = scene.add.image(77, 301, 'portrait_linh');
    this.portrait.setDisplaySize(54, 54);
    this.portrait.setVisible(false);
    this.portraitFrame.setVisible(false);

    this.container = scene.add.container(0, 0, [
      this.bgGraphics,
      this.portraitFrame,
      this.portrait,
      this.speakerText,
      this.bodyText,
      this.hintText,
    ]);
    this.container.setDepth(95);
    this.container.setVisible(false);
  }

  public startDialogue(lines: DialogueLine[], onComplete?: () => void): void {
    if (!lines || lines.length === 0) {
      onComplete?.();
      return;
    }
    this.queue = lines;
    this.currentIndex = 0;
    this.active = true;
    this.onCompleteCallback = onComplete;
    this.lastInputTime = performance.now();
    this.container.setVisible(true);
    this.showLine(0);
  }

  private showLine(index: number): void {
    const line = this.queue[index];
    // Localized at the render boundary: authored copy stays Vietnamese, the id above stays identity.
    this.fullLineText = tr(line.text);
    this.visibleChars = 0;
    this.charTimer = 0;

    const speakerColors: Record<string, string> = {
      Nhinh: '#f7dfaa',
      Lumo: '#b8f5d4',
      Shadow: '#d28cff',
      'The Shadow': '#d28cff',
      'Ký Ức': '#ffd966',
      'Hệ thống': '#8cc3da',
    };

    this.speakerText.setText(speakerLabel(line.speaker).toUpperCase());
    this.speakerText.setColor(speakerColors[line.speaker] ?? '#f7dfaa');
    this.bodyText.setText('');

    // Speaker portrait (Nhinh / Lumo); text shifts right when shown.
    const portraitKey = DialogueSystem.PORTRAITS[line.speaker];
    if (portraitKey && this.scene.textures.exists(portraitKey)) {
      this.portrait.setTexture(portraitKey);
      this.portrait.setVisible(true);
      this.portraitFrame.setVisible(true);
      this.speakerText.setPosition(118, 266);
      this.bodyText.setPosition(118, 286);
      this.bodyText.setWordWrapWidth(466);
    } else {
      this.portrait.setVisible(false);
      this.portraitFrame.setVisible(false);
      this.speakerText.setPosition(56, 266);
      this.bodyText.setPosition(56, 286);
      this.bodyText.setWordWrapWidth(528);
    }

    this.bgGraphics.clear();
    this.bgGraphics.fillStyle(0x07141b, 0.94);
    this.bgGraphics.lineStyle(1.5, 0xd8b869, 0.85);
    this.bgGraphics.fillRoundedRect(40, 256, 560, 88, 7);
    this.bgGraphics.strokeRoundedRect(40, 256, 560, 88, 7);
  }

  public update(dt: number): void {
    if (!this.active) return;

    if (this.visibleChars < this.fullLineText.length) {
      this.charTimer += Math.max(0, dt);
      const charsToAdd = Math.floor((this.charTimer + 1e-6) / 16);
      if (charsToAdd > 0) {
        this.charTimer = Math.max(0, this.charTimer - charsToAdd * 16);
        const prev = this.visibleChars;
        this.visibleChars = Math.min(this.fullLineText.length, this.visibleChars + charsToAdd);
        this.bodyText.setText(this.fullLineText.slice(0, this.visibleChars));
        // A softer tick every six characters; no frame-rate-dependent chatter or catch-up burst.
        if (Math.floor(this.visibleChars / 6) !== Math.floor(prev / 6)) {
          const line = this.queue[this.currentIndex];
          if (line) SoundSystem.playDialogueTick(line.speaker);
        }
      }
    }
  }

  public handleAdvanceInput(now: number): boolean {
    if (!this.active) return false;
    if (now - this.lastInputTime < 140) return true;
    this.lastInputTime = now;

    if (this.visibleChars < this.fullLineText.length) {
      this.visibleChars = this.fullLineText.length;
      this.bodyText.setText(this.fullLineText);
      return true;
    }

    this.currentIndex += 1;
    if (this.currentIndex < this.queue.length) {
      this.showLine(this.currentIndex);
    } else {
      this.active = false;
      this.container.setVisible(false);
      this.dismissedUntil = now + 200;
      const cb = this.onCompleteCallback;
      this.onCompleteCallback = undefined;
      cb?.();
    }
    return true;
  }

  /** Drops the running dialogue and its queued lines without calling the completion callback. */
  public stop(): void {
    this.active = false;
    this.queue = [];
    this.currentIndex = 0;
    this.onCompleteCallback = undefined;
    this.container.setVisible(false);
    this.dismissedUntil = 0;
  }

  public isActive(): boolean {
    return this.active;
  }

  public isInputLocked(now: number): boolean {
    return this.active || now < this.dismissedUntil;
  }
}
