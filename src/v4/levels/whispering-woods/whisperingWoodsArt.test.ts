import { describe, it, expect } from 'vitest';
import { GROVE_SPRITE_KEYS, GROVE_SPRITE_URLS, RING_PIVOT } from './whisperingWoodsArt';

const USED_KEYS: readonly string[] = [
  ...Object.values(GROVE_SPRITE_KEYS.steles),
  GROVE_SPRITE_KEYS.ring,
  ...Object.values(GROVE_SPRITE_KEYS.cranks),
  GROVE_SPRITE_KEYS.gateClosed,
  GROVE_SPRITE_KEYS.gateOpen,
  GROVE_SPRITE_KEYS.latch,
  ...Object.values(GROVE_SPRITE_KEYS.mouths),
];

describe('grove sprites', () => {
  it('builds every P0 sprite, and nothing else from the folder', () => {
    expect(Object.keys(GROVE_SPRITE_URLS).sort()).toHaveLength(15);
  });

  it('has a served URL for every sprite the runtime draws', () => {
    for (const key of USED_KEYS) {
      expect(GROVE_SPRITE_URLS[key], key).toBeTypeOf('string');
    }
  });

  it('pivots the rings on their centre inside the 32 by 32 canvas', () => {
    expect(RING_PIVOT.x).toBe(0.5);
    expect(RING_PIVOT.y).toBeCloseTo(19 / 32);
  });
});
