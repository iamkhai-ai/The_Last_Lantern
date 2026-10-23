import Phaser from 'phaser';
import { tr } from '../../i18n/catalog.ts';

/**
 * Placeholder for the V4 host scene (Task 6 replaces it). It shows that V4 is being built
 * and returns to the main menu with ESC.
 */
export class V4Scene extends Phaser.Scene {
  constructor() {
    super({ key: 'V4Scene' });
  }

  public create(): void {
    this.add.rectangle(320, 180, 640, 360, 0x081d26).setDepth(0);
    this.add.text(320, 168, tr('The Last Lantern — bản V4 đang dựng'), {
      fontFamily: 'Bitter, serif', fontSize: '16px', color: '#efe6cf',
    }).setOrigin(0.5).setDepth(1);
    this.add.text(320, 198, tr('ESC: về menu'), {
      fontFamily: 'Bitter, serif', fontSize: '11px', color: '#d2c4a6',
    }).setOrigin(0.5).setDepth(1);
    this.input.keyboard?.once('keydown-ESC', () => this.scene.start('MenuScene'));
  }
}
