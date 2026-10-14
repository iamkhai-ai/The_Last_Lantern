import Phaser from 'phaser';

interface ManifestEntry {
  key: string;
  w: number;
  h: number;
}

export interface AssetLoadReport {
  loaded: string[];
  missing: string[];
}

const INDEX_URL = 'assets/index.json';
const ASSET_URL = (key: string) => `assets/${key}.png`;

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function fileExists(url: string): Promise<boolean> {
  try {
    // Vite dev tra index.html (200 text/html) cho moi path khong ton tai (SPA fallback),
    // nen phai kiem tra content-type chu khong chi status.
    const res = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
    if (!res.ok) return false;
    const ct = res.headers.get('content-type') ?? '';
    return ct.startsWith('image/');
  } catch {
    return false;
  }
}

export class AssetLoader {
  private static started = false;

  public static reset(): void {
    this.started = false;
  }

  /**
   * Load every sprite listed in public/assets/index.json that actually exists on disk.
   * Missing files are skipped so ProceduralTextures.generateAll() can fill them in as
   * a fallback - the game stays playable with zero art files.
   */
  public static async load(scene: Phaser.Scene): Promise<AssetLoadReport> {
    const empty: AssetLoadReport = { loaded: [], missing: [] };
    if (this.started) return empty;
    this.started = true;

    const manifest = await fetchJson<ManifestEntry[]>(INDEX_URL);
    if (!manifest || !Array.isArray(manifest) || manifest.length === 0) {
      return empty;
    }

    const presence = await Promise.all(
      manifest.map((entry) => fileExists(ASSET_URL(entry.key)))
    );

    const present = manifest.filter((entry, i) => presence[i]);
    const missing = manifest.filter((_, i) => !presence[i]).map((e) => e.key);

    if (present.length === 0) {
      return { loaded: [], missing };
    }

    for (const entry of present) {
      scene.load.image(entry.key, ASSET_URL(entry.key));
    }

    await new Promise<void>((resolve) => {
      scene.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
      scene.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () => resolve());
      scene.load.start();
    });

    // Guard against a decode failure leaving a key half-registered.
    const loaded = present
      .map((entry) => entry.key)
      .filter((key) => scene.textures.exists(key));

    return { loaded, missing };
  }
}