/**
 * The grove's P0 sprites (assets/levels/02-whispering-woods/v4/sprites). Each file's name becomes a texture key with a
 * `wwd-` prefix, so `stele-moon.png` is `wwd-stele-moon`. Eager URL imports, as the other level art does.
 */
const spriteModules = import.meta.glob('../../../../assets/levels/02-whispering-woods/v4/sprites/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/** Texture key to served URL for every grove sprite in the build. */
export const GROVE_SPRITE_URLS: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(
    Object.entries(spriteModules).map(([path, url]) => {
      const file = path.slice(path.lastIndexOf('/') + 1, -4);
      return [`wwd-${file}`, url];
    }),
  ),
);

/** Texture keys the runtime draws. The layout test checks that every one is in the build. */
export const GROVE_SPRITE_KEYS = Object.freeze({
  steles: { moon: 'wwd-stele-moon', leaf: 'wwd-stele-leaf', star: 'wwd-stele-star', water: 'wwd-stele-water' },
  ring: 'wwd-ring',
  cranks: { x: 'wwd-crank-x', y: 'wwd-crank-y', z: 'wwd-crank-z' },
  gateClosed: 'wwd-gate-closed',
  gateOpen: 'wwd-gate-open',
  latch: 'wwd-latch',
  mouths: { moon: 'wwd-mouth-moon', leaf: 'wwd-mouth-leaf', star: 'wwd-mouth-star', water: 'wwd-mouth-water' },
});

/**
 * Origin of a stele and its ring inside their 32×32 canvases: the ring's centre. Placed on the centre of the 28×28
 * stele rect, so the ring turns about the same point the notch sits on.
 */
export const RING_PIVOT = { x: 16 / 32, y: 19 / 32 } as const;
