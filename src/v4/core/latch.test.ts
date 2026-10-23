import { describe, it, expect } from 'vitest';
import {
  attachPortableLatch,
  detachPortableLatch,
  isDoorOpen,
  setFixedLatch,
} from './latch';
import type { PortableLatchLocation } from './latch';

describe('isDoorOpen', () => {
  it('is open while live or latched', () => {
    expect(isDoorOpen(true, false)).toBe(true);
    expect(isDoorOpen(false, true)).toBe(true);
    expect(isDoorOpen(true, true)).toBe(true);
  });

  it('is closed when neither is true', () => {
    expect(isDoorOpen(false, false)).toBe(false);
  });
});

describe('setFixedLatch', () => {
  it('refuses engaging while the door is not really open', () => {
    expect(setFixedLatch(false, true, false)).toBeNull();
  });

  it('engages while the door is really open', () => {
    expect(setFixedLatch(false, true, true)).toBe(true);
  });

  it('always releases, whatever the door does', () => {
    expect(setFixedLatch(true, false, false)).toBe(false);
    expect(setFixedLatch(true, false, true)).toBe(false);
  });

  it('returns the current value unchanged when asked for it', () => {
    expect(setFixedLatch(false, false, false)).toBe(false);
    expect(setFixedLatch(false, false, true)).toBe(false);
    expect(setFixedLatch(true, true, true)).toBe(true);
  });
});

describe('attachPortableLatch', () => {
  const belt: PortableLatchLocation = { at: 'belt' };

  it('clips from the belt into a slot while that door is open', () => {
    expect(attachPortableLatch(belt, 'A', true)).toEqual({ at: 'slot', slotId: 'A' });
  });

  it('is refused while the door is closed', () => {
    expect(attachPortableLatch(belt, 'A', false)).toBeNull();
  });

  it('is refused when the latch is already in a slot', () => {
    const slotted: PortableLatchLocation = { at: 'slot', slotId: 'A' };
    expect(attachPortableLatch(slotted, 'B', true)).toBeNull();
    expect(attachPortableLatch(slotted, 'A', true)).toBeNull();
  });
});

describe('detachPortableLatch', () => {
  it('takes the latch from its own slot back to the belt', () => {
    const slotted: PortableLatchLocation = { at: 'slot', slotId: 'A' };
    expect(detachPortableLatch(slotted, 'A')).toEqual({ at: 'belt' });
  });

  it('is refused from another slot', () => {
    const slotted: PortableLatchLocation = { at: 'slot', slotId: 'A' };
    expect(detachPortableLatch(slotted, 'B')).toBeNull();
  });

  it('is refused when the latch is already on the belt', () => {
    expect(detachPortableLatch({ at: 'belt' }, 'A')).toBeNull();
  });
});
