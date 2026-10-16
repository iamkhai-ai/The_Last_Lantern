import Phaser from 'phaser';
import manifest from './assetManifest.json';
import { CAMPAIGN_ART_FILES } from './CampaignArt';

interface ManifestEntry {
  key: string;
  w: number;
  h: number;
}

export interface AssetLoadReport {
  loaded: string[];
  missing: string[];
}

// Eager URL imports: dev serves real files, production inlines them as data URIs.
const modules = import.meta.glob('../assets/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const MANIFEST = manifest as ManifestEntry[];

export function getAssetUrl(key: string): string | null {
  return modules[`../assets/${key}.png`] ?? null;
}

export class AssetLoader {
  private static started = false;

  public static reset(): void {
    this.started = false;
  }

  /**
   * Queue every manifest sprite that exists in src/assets.
   * Missing keys are skipped so ProceduralTextures.generateAll() can fill
   * them in as a fallback - the game stays playable with zero art files.
   */
  public static async load(scene: Phaser.Scene): Promise<AssetLoadReport> {
    const empty: AssetLoadReport = { loaded: [], missing: [] };
    if (this.started) return empty;
    this.started = true;

    const present: string[] = [];
    const missing: string[] = [];
    for (const entry of MANIFEST) {
      if (getAssetUrl(entry.key)) {
        present.push(entry.key);
      } else {
        missing.push(entry.key);
      }
    }

    if (present.length === 0 && CAMPAIGN_ART_FILES.length === 0) {
      return { loaded: [], missing };
    }

    for (const key of present) {
      const url = getAssetUrl(key);
      if (url) scene.load.image(key, url);
    }
    for (const asset of CAMPAIGN_ART_FILES) scene.load.image(asset.key, asset.url);

    await new Promise<void>((resolve) => {
      scene.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
      scene.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () => resolve());
      scene.load.start();
    });

    const loaded = [
      ...present.filter((key) => scene.textures.exists(key)),
      ...CAMPAIGN_ART_FILES.filter((asset) => scene.textures.exists(asset.key)).map((asset) => asset.key),
    ];
    return { loaded, missing };
  }
}
