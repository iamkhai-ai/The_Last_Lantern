import { describe, it, expect } from 'vitest';
import { stepBridge } from './bridge';

describe('stepBridge', () => {
  it('opens with its condition, even with nobody on the deck', () => {
    expect(stepBridge(false, true, false)).toEqual({ walkable: true, holding: false });
  });

  it('stays closed without the condition and without a foot on it', () => {
    expect(stepBridge(false, false, false)).toEqual({ walkable: false, holding: false });
  });

  it('never opens from a closed deck alone when stepped on', () => {
    expect(stepBridge(false, false, true)).toEqual({ walkable: false, holding: false });
  });

  it('keeps a crossing walkable when the condition is lost mid-way, until the foot leaves the deck', () => {
    const open = stepBridge(false, true, true);
    expect(open).toEqual({ walkable: true, holding: false });

    // the condition is lost while the foot is still on the deck: held up by the load
    const held = stepBridge(open.walkable, false, true);
    expect(held).toEqual({ walkable: true, holding: true });

    // the foot is still held one more frame, then leaves the deck: the bridge closes
    const stillHeld = stepBridge(held.walkable, false, true);
    expect(stillHeld).toEqual({ walkable: true, holding: true });
    const closed = stepBridge(stillHeld.walkable, false, false);
    expect(closed).toEqual({ walkable: false, holding: false });
  });

  it('does not hold a bridge that is open by its condition', () => {
    expect(stepBridge(true, true, true).holding).toBe(false);
  });
});
