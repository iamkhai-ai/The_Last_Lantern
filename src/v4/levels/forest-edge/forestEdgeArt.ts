import type Phaser from 'phaser';

/**
 * Level 01 art, exported at 2x into assets/levels/01-forgotten-forest-edge/v4 (asset-map.json). The sprite files are
 * found by name; the placements below copy asset-map.json, so the art can be moved there without touching the level.
 */
const SPRITE_URLS = import.meta.glob('../../../../assets/levels/01-forgotten-forest-edge/v4/sprites/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const KEY_PREFIX = 'f01-';

/** The texture key a sprite file is loaded under. */
export function artKey(name: string): string {
  return KEY_PREFIX + name;
}

/** Queues every level 01 sprite. Called from the level's preload, before any build. */
export function preloadForestArt(scene: Phaser.Scene): void {
  for (const path of Object.keys(SPRITE_URLS)) {
    const name = path.slice(path.lastIndexOf('/') + 1).replace(/\.png$/, '');
    if (!scene.textures.exists(artKey(name))) scene.load.image(artKey(name), SPRITE_URLS[path]);
  }
}

/** Whether the level 01 art is in the texture cache. False in a build where the art files are missing. */
export function forestArtReady(scene: Phaser.Scene): boolean {
  return scene.textures.exists(artKey('station-yard'));
}

/**
 * Where a slot sits in the level, from asset-map.json: the anchor point (game px, inside the sprite's game size)
 * placed at `position`. Origin is anchor / gameSize, so the 2x texture scales by 0.5 and keeps the anchor on `position`.
 */
export interface ArtSlot {
  readonly position: { readonly x: number; readonly y: number };
  readonly anchor: readonly [number, number];
  readonly gameSize: readonly [number, number];
}

/** Anchor and game size of each texture, from asset-map.json. */
const SIZE: Readonly<Record<string, Pick<ArtSlot, 'anchor' | 'gameSize'>>> = {
  'door-a-closed': { anchor: [34, 36], gameSize: [68, 36] },
  'gate-b-closed': { anchor: [34, 40], gameSize: [68, 40] },
  'latch-a-released': { anchor: [8, 30], gameSize: [16, 30] },
  'brake-b-released': { anchor: [8.137, 28], gameSize: [23, 28] },
  'socket-empty': { anchor: [12, 34], gameSize: [24, 34] },
  'eye-dormant': { anchor: [6, 6], gameSize: [12, 12] },
  'stele-normal': { anchor: [14, 40], gameSize: [28, 40] },
  'hinge-closed': { anchor: [12, 20], gameSize: [24, 20] },
  sprout: { anchor: [8, 16], gameSize: [16, 16] },
  'lantern-off': { anchor: [6, 18], gameSize: [12, 18] },
  'water-column': { anchor: [8, 56], gameSize: [16, 56] },
  'station-yard': { anchor: [0, 0], gameSize: [640, 360] },
  's1ToA-hidden': { anchor: [0, 0], gameSize: [640, 360] },
  'latch-tool-marks': { anchor: [8, 6], gameSize: [16, 12] },
};

/** The slots of the level, by place. Each slot takes its texture from the level's state. */
export const ART_SLOTS = {
  background: { position: { x: 0, y: 0 }, ...SIZE['station-yard'] },
  column: { position: { x: 576, y: 104 }, ...SIZE['water-column'] },
  stele: { position: { x: 174, y: 218 }, ...SIZE['stele-normal'] },
  hinge: { position: { x: 124, y: 282 }, ...SIZE['hinge-closed'] },
  doorA: { position: { x: 356, y: 214 }, ...SIZE['door-a-closed'] },
  gateB: { position: { x: 480, y: 52 }, ...SIZE['gate-b-closed'] },
  latchA: { position: { x: 400, y: 182 }, ...SIZE['latch-a-released'] },
  brakeB: { position: { x: 528, y: 76 }, ...SIZE['brake-b-released'] },
  s1: { position: { x: 294, y: 264 }, ...SIZE['socket-empty'] },
  s2: { position: { x: 432, y: 120 }, ...SIZE['socket-empty'] },
  eyeA: { position: { x: 328, y: 200 }, ...SIZE['eye-dormant'] },
  eyeB: { position: { x: 448, y: 42 }, ...SIZE['eye-dormant'] },
  sprout: { position: { x: 244, y: 272 }, ...SIZE.sprout },
  lantern: { position: { x: 214, y: 236 }, ...SIZE['lantern-off'] },
  // The carved S1–A and S2–B lines: full-screen overlays, registered to the yard.
  s1ToA: { position: { x: 0, y: 0 }, ...SIZE['s1ToA-hidden'] },
  s2ToB: { position: { x: 0, y: 0 }, ...SIZE['s1ToA-hidden'] },
  latchTool: { position: { x: 386, y: 168 }, ...SIZE['latch-tool-marks'] },
} as const satisfies Record<string, ArtSlot>;
