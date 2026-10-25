import { describe, it, expect } from 'vitest';
import { nextHint, NO_HINT_CURSOR } from '../../core/hints';
import {
  DIR_WORDS,
  GOAL_CRANKS,
  TARGET_RINGS,
  defaultWhisperingWoodsState,
  deriveWhisperingWoods,
  newlyMatchedRings,
  parseWhisperingWoodsState,
  ringsOf,
  turnCrank,
  turnsNeeded,
  whisperingWoodsBlockers,
  whisperingWoodsHint,
  whisperingWoodsHud,
  whisperingWoodsSolids,
} from './whisperingWoodsLogic';
import type { Crank, WhisperingWoodsState } from './whisperingWoodsLogic';
import { WHISPERING_WOODS } from './whisperingWoodsLayout';

const START: WhisperingWoodsState = defaultWhisperingWoodsState();

/** Applies a sequence of crank turns, returning the final state. */
function run(from: WhisperingWoodsState, cranks: readonly Crank[]): WhisperingWoodsState {
  return cranks.reduce((s, c) => turnCrank(s, c).state, from);
}

describe('ring directions', () => {
  it('starts with every ring on its first notch', () => {
    expect(ringsOf(START)).toEqual({ moon: 0, leaf: 0, star: 0, water: 0 });
  });

  it('gives the target (2,0,0,2) at the goal cranks', () => {
    expect(ringsOf(GOAL_CRANKS)).toEqual(TARGET_RINGS);
    expect(TARGET_RINGS).toEqual({ moon: 2, leaf: 0, star: 0, water: 2 });
  });

  it('moves exactly the two rings on each crank axle, by one notch', () => {
    expect(ringsOf(turnCrank(START, 'x').state)).toEqual({ moon: 1, leaf: 1, star: 0, water: 0 });
    expect(ringsOf(turnCrank(START, 'y').state)).toEqual({ moon: 0, leaf: 1, star: 1, water: 0 });
    expect(ringsOf(turnCrank(START, 'z').state)).toEqual({ moon: 0, leaf: 0, star: 1, water: 1 });
  });

  it('moves the two rings together on every turn, not just the first', () => {
    const s = run(START, ['x', 'x', 'y']);
    expect(turnCrank(s, 'y').moved).toEqual(['leaf', 'star']);
    expect(turnCrank(s, 'x').moved).toEqual(['moon', 'leaf']);
    expect(turnCrank(s, 'z').moved).toEqual(['star', 'water']);
  });

  it('wraps a ring after three notches', () => {
    expect(ringsOf(run(START, ['x', 'x', 'x']))).toEqual({ moon: 0, leaf: 0, star: 0, water: 0 });
  });
});

describe('the reference path', () => {
  it('reaches the target with X twice, Z twice, Y once and opens the gate', () => {
    let s: WhisperingWoodsState = START;
    s = turnCrank(s, 'x').state;
    expect(deriveWhisperingWoods(s).gateOpen).toBe(false);
    s = turnCrank(s, 'x').state;
    s = turnCrank(s, 'z').state;
    s = turnCrank(s, 'z').state;
    // Moon and water match; leaf and star still face the wrong way until Y is turned.
    const v = deriveWhisperingWoods(s);
    expect(v.matchedCount).toBe(2);
    expect(v.gateOpen).toBe(false);
    s = turnCrank(s, 'y').state;
    const done = deriveWhisperingWoods(s);
    expect(done.rings).toEqual(TARGET_RINGS);
    expect(done.gateLive).toBe(true);
    expect(done.gateOpen).toBe(true);
    expect(s.gateCatch).toBe(true);
  });

  it('accepts a different order of the same five turns', () => {
    const s = run(START, ['y', 'z', 'x', 'z', 'x']);
    expect(deriveWhisperingWoods(s).gateOpen).toBe(true);
  });

  it('accepts a route that turns past a full cycle', () => {
    const s = run(START, ['x', 'x', 'x', 'x', 'x', 'z', 'z', 'y']);
    expect(deriveWhisperingWoods(s).gateLive).toBe(true);
  });
});

describe('a wrong slot stays open and each matched slot is its own', () => {
  it('reports only the matched rings', () => {
    // X twice and Z twice: moon and water match; leaf and star do not until Y is turned.
    const s = run(START, ['x', 'x', 'z', 'z']);
    const v = deriveWhisperingWoods(s);
    expect(v.matched).toEqual({ moon: true, leaf: false, star: false, water: true });
    expect(v.matchedCount).toBe(2);
  });

  it('keeps a gate closed while any one ring is wrong', () => {
    expect(deriveWhisperingWoods(run(START, ['x', 'x', 'z'])).gateOpen).toBe(false);
    expect(deriveWhisperingWoods(run(START, ['x', 'z', 'z', 'y'])).gateOpen).toBe(false);
  });

  it('reopens after a mistake: a wrong Z turn is undone by turning Z on, with no reset', () => {
    // Z turned three times wraps to 0 and leaves water wrong; two more Z turns and one Y turn reach the goal.
    let s = run(START, ['x', 'x', 'z', 'z', 'z']);
    expect(deriveWhisperingWoods(s).gateOpen).toBe(false);
    s = run(s, ['z', 'z', 'y']);
    expect(deriveWhisperingWoods(s).gateOpen).toBe(true);
  });

  it('returns to the start after a mistake with no reset: three turns of one crank', () => {
    const s = run(START, ['y', 'y', 'y']);
    expect(s).toEqual(START);
  });
});

describe('the catch', () => {
  it('stays engaged after the gate opens, so turning the cranks afterwards does not close it', () => {
    let s = run(START, ['x', 'x', 'z', 'z', 'y']);
    expect(deriveWhisperingWoods(s).gateOpen).toBe(true);
    s = turnCrank(s, 'x').state;
    const v = deriveWhisperingWoods(s);
    expect(v.gateLive).toBe(false);
    expect(v.gateOpen).toBe(true);
    expect(s.gateCatch).toBe(true);
  });

  it('does not engage while the rings are still wrong', () => {
    const s = run(START, ['x', 'x', 'z', 'z']);
    expect(s.gateCatch).toBe(false);
  });

  it('the gate blocks light and walking only while it is closed', () => {
    const closed = deriveWhisperingWoods(START);
    const open = deriveWhisperingWoods({ ...START, gateCatch: true, x: 2, y: 1, z: 2 });
    expect(whisperingWoodsBlockers(closed)).toContainEqual(WHISPERING_WOODS.gate);
    expect(whisperingWoodsBlockers(open)).not.toContainEqual(WHISPERING_WOODS.gate);
    expect(whisperingWoodsSolids(closed)).toContainEqual(WHISPERING_WOODS.gate);
    expect(whisperingWoodsSolids(open)).not.toContainEqual(WHISPERING_WOODS.gate);
  });
});

describe('parseState', () => {
  it('returns the defaults for anything that is not an object', () => {
    for (const raw of [null, undefined, 'x', 42, [1, 2, 3], true]) {
      expect(parseWhisperingWoodsState(raw)).toEqual(START);
    }
  });

  it('falls back field by field on junk values', () => {
    expect(parseWhisperingWoodsState({ x: 'a', y: 1.5, z: -1, gateCatch: 'yes' })).toEqual(START);
    expect(parseWhisperingWoodsState({ x: 5, y: 1, z: 2 })).toEqual({ x: 0, y: 1, z: 2, gateCatch: false });
  });

  it('keeps valid counters and a valid catch', () => {
    expect(parseWhisperingWoodsState({ x: 1, y: 2, z: 0, gateCatch: false })).toEqual({ x: 1, y: 2, z: 0, gateCatch: false });
  });

  it('settles the catch from a saved state whose cranks already match the goal', () => {
    expect(parseWhisperingWoodsState({ x: 2, y: 1, z: 2 }).gateCatch).toBe(true);
  });
});

describe('the HUD', () => {
  it('shows the matched count and the closed gate at the start', () => {
    // Leaf and star already face their mouths at (0,0,0,0); moon and water do not.
    const hud = whisperingWoodsHud(deriveWhisperingWoods(START));
    expect(hud.objective).toBe('Hiệu chỉnh lại cụm dẫn đường');
    expect(hud.status).toBe('Vành khớp: 2/4 · Cổng: đóng');
  });

  it('shows the open gate and the catch once every ring matches', () => {
    const hud = whisperingWoodsHud(deriveWhisperingWoods({ x: 2, y: 1, z: 2, gateCatch: true }));
    expect(hud.status).toBe('Vành khớp: 4/4 · Cổng: mở');
  });

  it('says the catch holds the gate after the cranks have moved on', () => {
    const hud = whisperingWoodsHud(deriveWhisperingWoods({ x: 0, y: 1, z: 2, gateCatch: true }));
    expect(hud.status).toContain('mở, chốt đã gài');
  });
});

describe('the hint ladder', () => {
  it('gives the doc lines for levels one and two, from any state', () => {
    const ladder = whisperingWoodsHint(START);
    expect(ladder).not.toBeNull();
    expect(ladder!.steps[0]).toBe('Các bia ở hai đầu và hai bia ở giữa nối với cùng số trục hay khác nhau? Lùi khỏi vòng sáng hoặc tắt F để thấy hướng của miệng nhận.');
    expect(ladder!.steps[1]).toBe('Chỉnh hai đầu bằng X và Z; tay Y có thể đổi hai bia giữa mà không đụng tới hai đầu.');
  });

  it('counts the turns still needed from the start state at level three', () => {
    expect(whisperingWoodsHint(START)!.steps[2]).toBe('Còn lại: tay X 2 lần, tay Y 1 lần, tay Z 2 lần. Mỗi lần quay đổi hai bia cùng lúc.');
  });

  it('counts the turns still needed from a later state at level three, not from the start', () => {
    const s = run(START, ['x', 'x']);
    expect(turnsNeeded(s)).toEqual({ x: 0, y: 1, z: 2 });
    expect(whisperingWoodsHint(s)!.steps[2]).toBe('Còn lại: tay Y 1 lần, tay Z 2 lần. Mỗi lần quay đổi hai bia cùng lúc.');
  });

  it('gives no hint once every ring matches', () => {
    expect(whisperingWoodsHint({ x: 2, y: 1, z: 2, gateCatch: true })).toBeNull();
  });

  it('restarts the ladder when the state changes, and advances on the same state', () => {
    const a = whisperingWoodsHint(START)!;
    const first = nextHint(NO_HINT_CURSOR, a);
    const second = nextHint(first.cursor, a);
    expect(first.text).toBe(a.steps[0]);
    expect(second.text).toBe(a.steps[1]);
    const b = whisperingWoodsHint(run(START, ['x']))!;
    expect(b.key).not.toBe(a.key);
    expect(nextHint(second.cursor, b).text).toBe(b.steps[0]);
  });

  it('keeps the direction words used by the journal in the doc convention', () => {
    expect(DIR_WORDS).toEqual({ 0: 'Bắc', 1: 'Đông Nam', 2: 'Tây Nam' });
  });
});

describe('newly matched rings', () => {
  const view = (s: WhisperingWoodsState) => deriveWhisperingWoods(s);

  it('is empty before the first draw, so rings matched at the start do not flash', () => {
    expect(newlyMatchedRings(null, view(START))).toEqual([]);
  });

  it('is empty when nothing changed', () => {
    expect(newlyMatchedRings(view(START), view(START))).toEqual([]);
  });

  it('names only the ring that gained its match', () => {
    // Two notches on X turn Moon to its mouth; Leaf turns off its mouth, so it is not new.
    expect(newlyMatchedRings(view(START), view(run(START, ['x', 'x'])))).toEqual(['moon']);
  });
});
