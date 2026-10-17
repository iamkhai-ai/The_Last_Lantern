import Phaser from 'phaser';
import { getLevelArtKey } from '../art/CampaignArt';
import { EffectsSystem } from '../systems/EffectsSystem';
import { SoundSystem } from '../systems/SoundSystem';

export class ComingSoonScene extends Phaser.Scene {
  private effectsSystem!: EffectsSystem;
  private button!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'ComingSoonScene' });
  }

  public create(): void {
    const backdropKey = getLevelArtKey(4, 'station-scene-base');
    if (backdropKey && this.textures.exists(backdropKey)) {
      const backdrop = this.add.image(320, 180, backdropKey);
      backdrop.setDepth(0);
      backdrop.setTint(0x8fa3ae);
      this.tweens.add({ targets: backdrop, scale: 1.05, duration: 16000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    const veil = this.add.graphics().setDepth(10);
    veil.fillStyle(0x04121a, 0.6);
    veil.fillRect(0, 0, 640, 360);

    this.effectsSystem = new EffectsSystem(this);
    this.effectsSystem.setupZoneEffects('creek', false);

    const panel = this.add.graphics().setDepth(80);
    panel.fillStyle(0x07151c, 0.94);
    panel.lineStyle(1.5, 0xc9be82, 0.9);
    panel.fillRoundedRect(88, 74, 464, 212, 10);
    panel.strokeRoundedRect(88, 74, 464, 212, 10);

    const overline = this.add.text(320, 94, 'THE LAST LANTERN · BẢN CHƠI THỬ', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '9.5px',
      color: '#9eb8b2',
    });
    overline.setOrigin(0.5);
    overline.setDepth(81);

    const title = this.add.text(320, 122, 'MÀN TIẾP THEO ĐANG PHÁT TRIỂN', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '19px',
      fontStyle: 'bold',
      color: '#f7dfaa',
    });
    title.setOrigin(0.5);
    title.setDepth(81);

    const divider = this.add.graphics().setDepth(81);
    divider.lineStyle(1, 0x3b5c63, 0.9);
    divider.lineBetween(150, 144, 490, 144);

    const nextTitle = this.add.text(320, 160, 'MÀN 05 · A PATH FOR TWO', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#d7e6e1',
    });
    nextTitle.setOrigin(0.5);
    nextTitle.setDepth(81);

    const thanks = this.add.text(320, 186, 'Cảm ơn bạn đã chơi thử 4 màn đầu tiên của The Last Lantern.', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '11px',
      color: '#cddbd8',
    });
    thanks.setOrigin(0.5);
    thanks.setDepth(81);

    const soon = this.add.text(320, 204, 'Hành trình tới Trạm Dẫn Nước đang được hoàn thiện — hẹn gặp lại!', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '11px',
      color: '#9eb8b2',
    });
    soon.setOrigin(0.5);
    soon.setDepth(81);

    this.button = this.add.text(320, 250, '▸ VỀ MÀN HÌNH CHÍNH', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffe680',
    });
    this.button.setOrigin(0.5);
    this.button.setDepth(82);
    this.button.setInteractive({ useHandCursor: true });
    this.button.on('pointerover', () => this.button.setColor('#fff3bd'));
    this.button.on('pointerout', () => this.button.setColor('#ffe680'));
    this.button.on('pointerdown', () => this.backToMenu());

    const hint = this.add.text(320, 338, '[E / Enter / ESC] Quay về màn hình chính', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '10px',
      color: '#a8c4bd',
    });
    hint.setOrigin(0.5);
    hint.setDepth(82);

    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-E', () => this.backToMenu());
      this.input.keyboard.on('keydown-ENTER', () => this.backToMenu());
      this.input.keyboard.on('keydown-SPACE', () => this.backToMenu());
      this.input.keyboard.on('keydown-ESC', () => this.backToMenu());
    }
  }

  private backToMenu(): void {
    SoundSystem.playLanternToggle(true);
    this.scene.start('MenuScene');
  }

  public update(_time: number, delta: number): void {
    this.effectsSystem?.update(delta);
  }
}
