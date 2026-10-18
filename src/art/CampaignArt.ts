const levelDirectories = [
  '01-forgotten-forest-edge',
  '02-whispering-woods',
  '03-library-beneath-the-roots',
  '04-shattered-moonlit-creek',
  '05-a-path-for-two',
  '06-the-sleepless-tower',
  '07-the-sleeping-garden',
  '08-ruins-of-two-halves',
  '09-dark-moon-observatory',
  '10-the-heart-of-elaria',
] as const;

const levelArtModules = import.meta.glob([
  '../../assets/levels/01-forgotten-forest-edge/sprites/*.png',
  '../../assets/levels/02-whispering-woods/sprites/*.png',
  '../../assets/levels/03-library-beneath-the-roots/sprites/tablet-body.png',
  '../../assets/levels/03-library-beneath-the-roots/sprites/border-thuyen.png',
  '../../assets/levels/03-library-beneath-the-roots/sprites/border-la.png',
  '../../assets/levels/03-library-beneath-the-roots/sprites/border-hat.png',
  '../../assets/levels/03-library-beneath-the-roots/sprites/border-chim.png',
  '../../assets/levels/03-library-beneath-the-roots/sprites/bright-horizon-sun.png',
  '../../assets/levels/03-library-beneath-the-roots/sprites/bright-high-sun.png',
  '../../assets/levels/03-library-beneath-the-roots/sprites/bright-high-moon.png',
  '../../assets/levels/03-library-beneath-the-roots/sprites/dark-motion-up.png',
  '../../assets/levels/03-library-beneath-the-roots/sprites/dark-motion-down.png',
  '../../assets/levels/03-library-beneath-the-roots/sprites/dark-apex-arc.png',
  '../../assets/levels/03-library-beneath-the-roots/sprites/test-book-body.png',
  '../../assets/levels/03-library-beneath-the-roots/sprites/test-book-bright-layer.png',
  '../../assets/levels/03-library-beneath-the-roots/sprites/test-book-dark-layer.png',
  '../../assets/levels/03-library-beneath-the-roots/sprites/socket-selected.png',
  '../../assets/levels/03-library-beneath-the-roots/sprites/socket-occupied.png',
  '../../assets/levels/03-library-beneath-the-roots/sprites/socket-empty.png',
  '../../assets/levels/03-library-beneath-the-roots/sprites/room-memory-crystal.png',
  '../../assets/levels/03-library-beneath-the-roots/sprites/room-bookshelf.png',
  '../../assets/levels/03-library-beneath-the-roots/sprites/room-well-closed.png',
  '../../assets/levels/03-library-beneath-the-roots/sprites/room-well-open.png',
  '../../assets/levels/03-library-beneath-the-roots/sprites/room-panel-closed.png',
  '../../assets/levels/03-library-beneath-the-roots/sprites/room-panel-open.png',
  '../../assets/levels/03-library-beneath-the-roots/sprites/room-test-desk.png',
  '../../assets/levels/03-library-beneath-the-roots/sprites/room-mural-fifth.png',
  '../../assets/levels/04-shattered-moonlit-creek/sprites/creek-scene-base.png',
  '../../assets/levels/04-shattered-moonlit-creek/sprites/storm-relief.png',
  '../../assets/levels/04-shattered-moonlit-creek/sprites/test-flower-closed.png',
  '../../assets/levels/04-shattered-moonlit-creek/sprites/test-flower-open.png',
  '../../assets/levels/04-shattered-moonlit-creek/sprites/mechanisms/*.png',
  '../../assets/levels/05-a-path-for-two/sprites/*.png',
  '../../assets/levels/06-the-sleepless-tower/sprites/*.png',
  '../../assets/levels/07-the-sleeping-garden/sprites/*.png',
  '../../assets/levels/08-ruins-of-two-halves/sprites/*.png',
  '../../assets/levels/09-dark-moon-observatory/sprites/*.png',
  '../../assets/levels/10-the-heart-of-elaria/sprites/*.png',
], {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const characterModules = import.meta.glob([
  '../../assets/character/nhinh_*.png',
  '!../../assets/character/*contact_sheet*.png',
], {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const sharedMechanismModules = import.meta.glob([
  '../../assets/levels/shared/mechanisms/bridge-west-absent.png',
  '../../assets/levels/shared/mechanisms/bridge-west-powered.png',
  '../../assets/levels/shared/mechanisms/bridge-west-latched.png',
  '../../assets/levels/shared/mechanisms/bridge-east-absent.png',
  '../../assets/levels/shared/mechanisms/bridge-east-powered.png',
  '../../assets/levels/shared/mechanisms/bridge-east-latched.png',
  '../../assets/levels/shared/mechanisms/latch-west-unlatched.png',
  '../../assets/levels/shared/mechanisms/latch-west-latched.png',
  '../../assets/levels/shared/mechanisms/latch-east-unlatched.png',
  '../../assets/levels/shared/mechanisms/latch-east-latched.png',
  '../../assets/levels/shared/mechanisms/source-empty.png',
  '../../assets/levels/shared/mechanisms/source-lit.png',
  '../../assets/levels/shared/mechanisms/source-off-source.png',
  '../../assets/levels/shared/mechanisms/receiver-off.png',
  '../../assets/levels/shared/mechanisms/receiver-energized.png',
  '../../assets/levels/shared/mechanisms/receiver-on.png',
  '../../assets/levels/shared/mechanisms/mirror-1-horizontal.png',
  '../../assets/levels/shared/mechanisms/mirror-1-backslash.png',
  '../../assets/levels/shared/mechanisms/mirror-1-slash.png',
  '../../assets/levels/shared/mechanisms/mirror-2-horizontal.png',
  '../../assets/levels/shared/mechanisms/mirror-2-backslash.png',
  '../../assets/levels/shared/mechanisms/mirror-2-slash.png',
  '../../assets/levels/shared/mechanisms/mirror-3-horizontal.png',
  '../../assets/levels/shared/mechanisms/mirror-3-slash.png',
  '../../assets/levels/shared/mechanisms/mirror-3-backslash.png',
  '../../assets/levels/shared/beam-splitter/*.png',
  '../../assets/levels/shared/garden-mechanisms/*.png',
], { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

/**
 * The Shadow's shared character frames (Level 08 waiting pose, Level 09 memory
 * overlay). Explicit keys keep the observatory able to place him beside the
 * final record without depending on a filename-derived key.
 */
const shadowCharacterModules = import.meta.glob([
  '../../assets/levels/shared/characters/the-shadow/sprites/waiting.png',
  '../../assets/levels/shared/characters/the-shadow/sprites/memory-overlay.png',
], { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

const SHADOW_ART_KEYS: Record<string, string> = {
  'waiting.png': 'shadow_waiting',
  'memory-overlay.png': 'shadow_memory_overlay',
};

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function artKeyForPath(path: string): string {
  const match = path.match(/\/assets\/levels\/(.+?)\/sprites\/(.+)\.png$/);
  return match ? `art_${normalize(match[1])}_${normalize(match[2])}` : '';
}

const artKeyByPath = new Map<string, string>();
for (const path of Object.keys(levelArtModules)) {
  const key = artKeyForPath(path);
  if (key) artKeyByPath.set(path, key);
}

export interface CampaignArtFile {
  key: string;
  url: string;
}

export const CAMPAIGN_ART_FILES: CampaignArtFile[] = [
  ...Object.entries(levelArtModules).flatMap(([path, url]) => {
    const key = artKeyForPath(path);
    return key ? [{ key, url }] : [];
  }),
  ...Object.entries(characterModules).map(([path, url]) => ({
    key: path.slice(path.lastIndexOf('/') + 1, -4),
    url,
  })),
  ...Object.entries(sharedMechanismModules).map(([path, url]) => ({
    key: `shared_${normalize(path.slice(path.lastIndexOf('/') + 1, -4))}`,
    url,
  })),
  ...Object.entries(shadowCharacterModules)
    .filter(([path]) => Boolean(SHADOW_ART_KEYS[path.slice(path.lastIndexOf('/') + 1)]))
    .map(([path, url]) => ({ key: SHADOW_ART_KEYS[path.slice(path.lastIndexOf('/') + 1)], url })),
];

/** The Shadow's Level 09 frames, or null when the pack is absent. */
export function getShadowArtKey(frame: 'waiting' | 'memory-overlay'): string | null {
  const key = SHADOW_ART_KEYS[`${frame}.png`];
  return CAMPAIGN_ART_FILES.some((asset) => asset.key === key) ? key : null;
}

export function getSharedMechanismKey(filename: string): string | null {
  const key = `shared_${normalize(filename.replace(/\.png$/i, ''))}`;
  return CAMPAIGN_ART_FILES.some((asset) => asset.key === key) ? key : null;
}

export function getLevelArtKey(levelIndex: number, filename: string): string | null {
  const directory = levelDirectories[levelIndex];
  if (!directory) return null;
  const key = `art_${normalize(directory)}_${normalize(filename.replace(/\.png$/i, ''))}`;
  return CAMPAIGN_ART_FILES.some((asset) => asset.key === key) ? key : null;
}

export function getLevelBackgroundKey(levelIndex: number, roomId?: string): string | null {
  const backgrounds: Record<number, string> = {
    3: 'creek-scene-base',
    4: 'station-scene-base',
    5: 'tower-scene-base',
    6: 'garden-scene-base',
    7: 'temple-scene-base',
    9: 'sanctuary-base',
  };
  if (levelIndex === 8) {
    // Every observatory room paints its own base: the lobby, the star-map
    // corridor and the observatory. The observatory always uses the CLEAN base
    // (observatory-clean-base); the hand-off base with the baked caption strip
    // is never loaded into the runtime.
    if (roomId === 'observatory') return getLevelArtKey(8, 'observatory-clean-base');
    if (roomId === 'entrance') return getLevelArtKey(8, 'lobby-base');
    if (roomId === 'corridor') return getLevelArtKey(8, 'star-chart-base');
    return null;
  }
  return backgrounds[levelIndex] ? getLevelArtKey(levelIndex, backgrounds[levelIndex]) : null;
}

export function getNhinhTexture(state: string, direction: string, frame: number): string | null {
  const key = `nhinh_${direction}_${state}_${frame}`;
  return Object.prototype.hasOwnProperty.call(characterModules, `../../assets/character/${key}.png`) ? key : null;
}
