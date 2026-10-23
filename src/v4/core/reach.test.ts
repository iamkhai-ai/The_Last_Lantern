import { describe, it, expect } from 'vitest';
import type { Rect } from './geometry';
import { footRectAt } from './body';
import { REACH_GAP, isInReach, pickTarget, rectGap, reachGap } from './reach';
import type { Reach, ReachException } from './reach';

/** A 14x6 foot whose top-left corner is (x, y). */
function foot(x: number, y: number): Rect {
  return { x, y, width: 14, height: 6 };
}

/** A 20x20 standing block at (100,100): spans x 100..120, y 100..120. */
const BLOCK: Rect = { x: 100, y: 100, width: 20, height: 20 };
const block: Reach = { kind: 'block', rect: BLOCK };

describe('reach: block (any side, 8px)', () => {
  it('is in reach when the foot touches each side', () => {
    expect(isInReach(foot(103, 120), block)).toBe(true); // south
    expect(isInReach(foot(103, 94), block)).toBe(true); // north
    expect(isInReach(foot(120, 103), block)).toBe(true); // east
    expect(isInReach(foot(86, 103), block)).toBe(true); // west
  });

  it('is in reach exactly 8px away on each side', () => {
    expect(isInReach(foot(103, 128), block)).toBe(true); // south
    expect(isInReach(foot(103, 86), block)).toBe(true); // north
    expect(isInReach(foot(128, 103), block)).toBe(true); // east
    expect(isInReach(foot(78, 103), block)).toBe(true); // west
  });

  it('is out of reach 9px away on each side', () => {
    expect(isInReach(foot(103, 129), block)).toBe(false); // south
    expect(isInReach(foot(103, 85), block)).toBe(false); // north
    expect(isInReach(foot(129, 103), block)).toBe(false); // east
    expect(isInReach(foot(77, 103), block)).toBe(false); // west
  });

  it('measures diagonally at the corners', () => {
    expect(isInReach(foot(126, 126), block)).toBe(false); // 6px and 6px: about 8.49
    expect(isInReach(foot(125, 125), block)).toBe(true); // 5px and 5px: about 7.07
  });

  it('has gap 0 when the foot overlaps the block', () => {
    expect(reachGap(foot(105, 105), block)).toBe(0);
    expect(isInReach(foot(105, 105), block)).toBe(true);
  });

  it('returns the gap used for ranking', () => {
    expect(reachGap(foot(103, 124), block)).toBe(4);
    expect(reachGap(foot(103, 128), block)).toBe(REACH_GAP);
    expect(reachGap(foot(103, 129), block)).toBeNull();
  });

  it('lets a declared exception widen maxGap for that target only', () => {
    const exception: ReachException = { reason: 'test exception', maxGap: 12 };
    expect(isInReach(foot(103, 130), block)).toBe(false); // 10px, default 8px
    expect(isInReach(foot(103, 130), block, exception)).toBe(true); // 10px, maxGap 12
    expect(isInReach(foot(103, 133), block, exception)).toBe(false); // 13px, maxGap 12
  });
});

describe('reach: floor (foot centre inside the tile)', () => {
  const tile: Reach = { kind: 'floor', rect: BLOCK };

  it('is in reach when the foot centre is inside the tile, with gap 0', () => {
    // Foot centre is (110, 106).
    expect(isInReach(foot(103, 103), tile)).toBe(true);
    expect(reachGap(foot(103, 103), tile)).toBe(0);
  });

  it('is out of reach when the foot centre is 1px outside, even when the feet touch the tile', () => {
    // Foot centre y = 99, one pixel above the top edge.
    expect(isInReach(foot(103, 96), tile)).toBe(false);
    // Foot centre x = 120, on the right edge (half-open, so outside).
    expect(isInReach(foot(113, 103), tile)).toBe(false);
    // Foot centre y = 120, on the bottom edge (outside).
    expect(isInReach(foot(103, 117), tile)).toBe(false);
  });
});

describe('reach: faces (wall control, listed faces only)', () => {
  const south: Reach = { kind: 'faces', rect: BLOCK, faces: ['south'] };

  it('is in reach 4px below the south face', () => {
    expect(isInReach(foot(103, 124), south)).toBe(true);
  });

  it('is out of reach 4px north of the block when only the south face is listed', () => {
    expect(isInReach(foot(103, 90), south)).toBe(false);
  });

  it('is out of reach 4px east of the block when only the south face is listed', () => {
    expect(isInReach(foot(124, 103), south)).toBe(false);
  });

  it('accepts any one of several listed faces', () => {
    const northEast: Reach = { kind: 'faces', rect: BLOCK, faces: ['north', 'east'] };
    expect(isInReach(foot(124, 103), northEast)).toBe(true); // east
    expect(isInReach(foot(103, 90), northEast)).toBe(true); // north
    expect(isInReach(foot(103, 124), northEast)).toBe(false); // south is not listed
  });
});

describe('reach: pickTarget', () => {
  // Foot spans y 126..132. Block A is 6px north of it; block B is 8px south of it.
  const f = foot(103, 126);
  const nearer = { reach: { kind: 'block', rect: { x: 100, y: 100, width: 20, height: 20 } } as Reach };
  const farther = { reach: { kind: 'block', rect: { x: 100, y: 140, width: 20, height: 20 } } as Reach };

  it('picks the nearer in-reach target', () => {
    expect(pickTarget(f, [farther, nearer])).toBe(1);
  });

  it('breaks equal gaps in favour of the lower index', () => {
    expect(pickTarget(f, [nearer, { ...nearer }])).toBe(0);
  });

  it('returns -1 when nothing is in reach or the list is empty', () => {
    const far = { reach: { kind: 'block', rect: { x: 300, y: 300, width: 20, height: 20 } } as Reach };
    expect(pickTarget(f, [far])).toBe(-1);
    expect(pickTarget(f, [])).toBe(-1);
  });

  it('applies each item\'s own exception', () => {
    // Block bottom at y=120, foot top at y=130: a 10px gap. Out of reach by default, in reach with maxGap 12.
    const excepted = {
      reach: { kind: 'block', rect: BLOCK } as Reach,
      exception: { reason: 'test exception', maxGap: 12 },
    };
    expect(pickTarget(foot(103, 130), [excepted])).toBe(0);
    expect(pickTarget(foot(103, 130), [{ reach: excepted.reach }])).toBe(-1);
  });
});

describe('rectGap', () => {
  it('is 0 when rectangles touch or overlap, and Euclidean otherwise', () => {
    expect(rectGap(foot(103, 120), BLOCK)).toBe(0);
    expect(rectGap({ x: 0, y: 0, width: 10, height: 10 }, { x: 13, y: 14, width: 10, height: 10 })).toBe(5);
  });
});

describe('footRectAt', () => {
  it('places the foot body 7px left of and 16px below the centre', () => {
    expect(footRectAt({ x: 100, y: 100 })).toEqual({ x: 93, y: 116, width: 14, height: 6 });
  });
});
