import { describe, it, expect } from 'vitest';
import {
  canPulse,
  initialLantern,
  lanternFeeds,
  pickUpLantern,
  placeLantern,
  toggleLantern,
} from './lantern';

describe('initialLantern', () => {
  it('starts in hand and lit', () => {
    expect(initialLantern()).toEqual({ location: { at: 'hand' }, on: true });
  });
});

describe('toggleLantern', () => {
  it('flips the light while in hand', () => {
    const off = toggleLantern(initialLantern());
    expect(off).toEqual({ location: { at: 'hand' }, on: false });
    expect(toggleLantern(off).on).toBe(true);
  });

  it('flips the light while on a pedestal', () => {
    const placed = placeLantern(initialLantern(), 's1');
    expect(placed).not.toBeNull();
    const off = toggleLantern(placed!);
    expect(off).toEqual({ location: { at: 'pedestal', pedestalId: 's1' }, on: false });
  });

  it('does not mutate its input', () => {
    const s = initialLantern();
    toggleLantern(s);
    expect(s.on).toBe(true);
  });
});

describe('placeLantern', () => {
  it('sets the lantern on a pedestal from hand and keeps it lit', () => {
    expect(placeLantern(initialLantern(), 's1')).toEqual({
      location: { at: 'pedestal', pedestalId: 's1' },
      on: true,
    });
  });

  it('keeps an unlit lantern unlit', () => {
    const dark = toggleLantern(initialLantern());
    expect(placeLantern(dark, 's1')?.on).toBe(false);
  });

  it('is refused when the lantern is already placed', () => {
    const placed = placeLantern(initialLantern(), 's1')!;
    expect(placeLantern(placed, 's2')).toBeNull();
    expect(placeLantern(placed, 's1')).toBeNull();
  });
});

describe('pickUpLantern', () => {
  it('takes the lantern back to hand from its own pedestal and keeps it lit', () => {
    const placed = placeLantern(initialLantern(), 's1')!;
    expect(pickUpLantern(placed, 's1')).toEqual({ location: { at: 'hand' }, on: true });
  });

  it('keeps an unlit lantern unlit', () => {
    const placed = placeLantern(toggleLantern(initialLantern()), 's1')!;
    expect(pickUpLantern(placed, 's1')?.on).toBe(false);
  });

  it('is refused from another pedestal', () => {
    const placed = placeLantern(initialLantern(), 's1')!;
    expect(pickUpLantern(placed, 's2')).toBeNull();
  });

  it('is refused when the lantern is in hand', () => {
    expect(pickUpLantern(initialLantern(), 's1')).toBeNull();
  });
});

describe('lanternFeeds', () => {
  it('is true only when lit and on that pedestal', () => {
    const placed = placeLantern(initialLantern(), 's1')!;
    expect(lanternFeeds(placed, 's1')).toBe(true);
    expect(lanternFeeds(placed, 's2')).toBe(false);
  });

  it('is false when the lantern is off', () => {
    const placedOff = toggleLantern(placeLantern(initialLantern(), 's1')!);
    expect(lanternFeeds(placedOff, 's1')).toBe(false);
  });

  it('is false while the lantern is in hand', () => {
    expect(lanternFeeds(initialLantern(), 's1')).toBe(false);
  });
});

describe('canPulse', () => {
  it('needs the lantern in hand and lit', () => {
    expect(canPulse(initialLantern())).toBe(true);
    expect(canPulse(toggleLantern(initialLantern()))).toBe(false);
    expect(canPulse(placeLantern(initialLantern(), 's1')!)).toBe(false);
  });
});
