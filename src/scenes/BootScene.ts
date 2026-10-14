import Phaser from 'phaser';
import { ProceduralTextures } from '../art/ProceduralTextures';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  public create(): void {
    ProceduralTextures.generateAll(this);
    this.scene.start('MenuScene');
  }
}
