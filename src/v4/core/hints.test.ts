import { describe, it, expect } from 'vitest';
import { NO_HINT_CURSOR, nextHint } from './hints';
import type { HintLadder } from './hints';

const DOOR: HintLadder = { key: 'door', steps: ['observe', 'relation', 'step'] };
const LUMO: HintLadder = { key: 'lumo', steps: ['o2', 'r2', 's2'] };

describe('NO_HINT_CURSOR', () => {
  it('has no key and no step', () => {
    expect(NO_HINT_CURSOR).toEqual({ key: null, index: -1 });
  });
});

describe('nextHint', () => {
  it('starts a new ladder at step 0', () => {
    const first = nextHint(NO_HINT_CURSOR, DOOR);
    expect(first.text).toBe('observe');
    expect(first.cursor).toEqual({ key: 'door', index: 0 });
  });

  it('advances one step per request for the same key', () => {
    const second = nextHint(nextHint(NO_HINT_CURSOR, DOOR).cursor, DOOR);
    expect(second.text).toBe('relation');
    expect(second.cursor).toEqual({ key: 'door', index: 1 });

    const third = nextHint(second.cursor, DOOR);
    expect(third.text).toBe('step');
    expect(third.cursor).toEqual({ key: 'door', index: 2 });
  });

  it('stays on step 2 when asked again for the same key', () => {
    const last = nextHint(nextHint(nextHint(NO_HINT_CURSOR, DOOR).cursor, DOOR).cursor, DOOR);
    const again = nextHint(last.cursor, DOOR);
    expect(again.text).toBe('step');
    expect(again.cursor).toEqual({ key: 'door', index: 2 });
  });

  it('restarts at step 0 when the ladder key changes', () => {
    const atLast = nextHint(nextHint(NO_HINT_CURSOR, DOOR).cursor, DOOR).cursor;
    const other = nextHint(atLast, LUMO);
    expect(other.text).toBe('o2');
    expect(other.cursor).toEqual({ key: 'lumo', index: 0 });
  });

  it('restarts at step 0 when returning to an earlier key after another one', () => {
    const onLumo = nextHint(NO_HINT_CURSOR, LUMO).cursor;
    const back = nextHint(onLumo, DOOR);
    expect(back.text).toBe('observe');
  });

  it('does not mutate the cursor it was given', () => {
    const cursor = nextHint(NO_HINT_CURSOR, DOOR).cursor;
    nextHint(cursor, DOOR);
    expect(cursor).toEqual({ key: 'door', index: 0 });
  });
});
