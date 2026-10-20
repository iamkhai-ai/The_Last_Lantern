import Phaser from 'phaser';
import { AssetLoader } from '../art/AssetLoader';
import { ProceduralTextures } from '../art/ProceduralTextures';
import { loadMenuFont } from '../art/MenuFont';
import { SoundSystem } from '../systems/SoundSystem';

// Curated SFX keys -> file paths (relative to src/assets/sfx/).
// Files are downloaded by scripts/download-sfx.ps1 from Sound Effect Lab.
const SFX_MANIFEST: { key: string; file: string }[] = [
  { key: 'ui_click', file: 'ui_click.mp3' },
  { key: 'ui_cancel', file: 'ui_cancel.mp3' },
  { key: 'ui_success', file: 'ui_success.mp3' },
  { key: 'ui_levelup', file: 'ui_levelup.mp3' },
  { key: 'ui_item_get', file: 'ui_item_get.mp3' },
  { key: 'ui_item_get2', file: 'ui_item_get2.mp3' },
  { key: 'lantern_on', file: 'lantern_on.mp3' },
  { key: 'lantern_off', file: 'lantern_off.mp3' },
  { key: 'light_pulse', file: 'light_pulse.mp3' },
  { key: 'rune_activate', file: 'rune_activate.mp3' },
  { key: 'puzzle_solved', file: 'puzzle_solved.mp3' },
  { key: 'puzzle_error', file: 'puzzle_error.mp3' },
  { key: 'mirror_rotate', file: 'mirror_rotate.mp3' },
  { key: 'door_open', file: 'door_open.mp3' },
  { key: 'door_close', file: 'door_close.mp3' },
  { key: 'gate_open', file: 'gate_open.mp3' },
  { key: 'footstep_grass', file: 'footstep_grass.mp3' },
  { key: 'footstep_soil', file: 'footstep_soil.mp3' },
  { key: 'ambient_creek', file: 'ambient_creek.mp3' },
  { key: 'crystal_pickup', file: 'crystal_pickup.mp3' },
];

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

    // Wire up the sound manager and load curated SFX from Sound Effect Lab.
    SoundSystem.setSoundManager(this.sound);
    await this.loadSfx();

    // Canvas text must be measured with the real font, never a cold-load fallback.
    await loadMenuFont();
    this.scene.start('MenuScene');
  }

  private async loadSfx(): Promise<void> {
    const modules = import.meta.glob('../assets/sfx/*.{mp3,ogg,wav}', {
      eager: true,
      query: '?url',
      import: 'default',
    }) as Record<string, string>;

    const toLoad: { key: string; url: string }[] = [];
    for (const entry of SFX_MANIFEST) {
      const url = modules[`../assets/sfx/${entry.file}`];
      if (url) toLoad.push({ key: entry.key, url });
    }

    if (toLoad.length === 0) {
      console.info('[BootScene] No SFX files found in src/assets/sfx/ — using procedural sounds.');
      return;
    }

    for (const { key, url } of toLoad) {
      this.load.audio(key, url);
    }

    // Wait for the whole batch: resolving on the first FILE_LOAD_ERROR used to
    // start the menu while the remaining files were still queued, so their keys
    // never got registered even though the files were fine. The timer is only a
    // safety net so a stalled batch can never block the menu.
    const failed: string[] = [];
    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = (): void => {
        if (settled) return;
        settled = true;
        clearTimeout(guard);
        resolve();
      };
      const guard = setTimeout(finish, 15000);
      this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
        failed.push(file.key);
      });
      this.load.once(Phaser.Loader.Events.COMPLETE, finish);
      this.load.start();
    });

    let loaded = 0;
    for (const { key } of toLoad) {
      if (this.cache.audio.exists(key)) {
        SoundSystem.registerLoadedKey(key);
        loaded++;
      }
    }
    console.info(`[BootScene] SFX: ${loaded}/${toLoad.length} loaded from Sound Effect Lab.`);
    if (failed.length > 0) console.warn('[BootScene] SFX failed to load:', failed.join(', '));
  }
}