import Phaser from 'phaser';
import { AssetLoader } from '../art/AssetLoader';
import { ProceduralTextures } from '../art/ProceduralTextures';
import { loadMenuFont } from '../art/MenuFont';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  public create(): void {
    void this.boot();
  }

  private async boot(): Promise<void> {
    const report = await AssetLoader.load(this);

    // Fills in anything the asset pack did not provide, so the game always runs.
    ProceduralTextures.generateAll(this);

    if (report.loaded.length > 0 || report.missing.length > 0) {
      console.info(
        `[BootScene] Art assets: ${report.loaded.length} loaded, ` +
          `${report.missing.length} fell back to procedural.`
      );
      if (report.missing.length > 0 && report.missing.length <= 12) {
        console.info('[BootScene] Still procedural:', report.missing.join(', '));
      }
    }

    // Canvas text must be measured with the real font, never a cold-load fallback.
    await loadMenuFont();
    this.scene.start('MenuScene');
  }
}
