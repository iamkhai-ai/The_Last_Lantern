import { describe, it, expect } from 'vitest';
import type { Point, Rect } from './geometry';
import type { LanternState } from './lantern';
import {
  BEAM_LENGTH,
  FACINGS,
  HALO_RADIUS,
  beamPolygon,
  canSeeMark,
  facingVector,
  groundPoint,
  isMarkReadable,
  isPointLit,
  isRectLit,
  lanternFootprints,
  marksToRecord,
  pointInConvexPolygon,
  roomAt,
  segmentBlocked,
} from './light';
import type { Footprint, LightMark, Room } from './light';

const SQRT_HALF = Math.SQRT1_2;

const hand = (on = true): LanternState => ({ location: { at: 'hand' }, on });

/** The hand beam and halo for a lamp at `origin`, facing `facing`. */
function handFootprints(origin: Point, facing: Parameters<typeof facingVector>[0]): Footprint[] {
  return [
    { kind: 'beam', origin, facing },
    { kind: 'halo', center: origin, radius: HALO_RADIUS },
  ];
}

function near(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-9;
}

function samePoint(a: Point, b: Point): boolean {
  return near(a.x, b.x) && near(a.y, b.y);
}

describe('facingVector', () => {
  it('gives a unit vector for all eight facings', () => {
    expect(FACINGS).toHaveLength(8);
    for (const f of FACINGS) {
      const v = facingVector(f);
      expect(Math.hypot(v.x, v.y)).toBeGreaterThan(1 - 1e-9);
      expect(Math.hypot(v.x, v.y)).toBeLessThan(1 + 1e-9);
    }
  });

  it('points up as (0,-1) and down-right as (√½, √½)', () => {
    expect(facingVector('up')).toEqual({ x: 0, y: -1 });
    const dr = facingVector('downright');
    expect(near(dr.x, SQRT_HALF)).toBe(true);
    expect(near(dr.y, SQRT_HALF)).toBe(true);
  });
});

describe('groundPoint', () => {
  it('is the centre of the foot body, 19px below the actor centre', () => {
    expect(groundPoint({ x: 100, y: 100 })).toEqual({ x: 100, y: 119 });
  });
});

describe('beamPolygon', () => {
  it('has the expected corners for a beam facing up', () => {
    const poly = beamPolygon({ x: 100, y: 200 }, 'up');
    expect(poly).toHaveLength(4);
    const expected: Point[] = [
      { x: 94, y: 200 },
      { x: 106, y: 200 },
      { x: 84, y: 144 },
      { x: 116, y: 144 },
    ];
    for (const e of expected) {
      expect(poly.some(p => samePoint(p, e))).toBe(true);
    }
  });

  it('is convex for every facing', () => {
    for (const f of FACINGS) {
      const poly = beamPolygon({ x: 0, y: 0 }, f);
      // Each corner lies on the same side of every edge as the centroid.
      const cx = poly.reduce((s, p) => s + p.x, 0) / 4;
      const cy = poly.reduce((s, p) => s + p.y, 0) / 4;
      expect(pointInConvexPolygon({ x: cx, y: cy }, poly)).toBe(true);
      for (let i = 0; i < 4; i++) {
        const a = poly[i];
        const b = poly[(i + 1) % 4];
        const c = poly[(i + 2) % 4];
        const turn = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
        expect(turn).not.toBe(0);
      }
    }
    expect(BEAM_LENGTH).toBe(56);
  });
});

describe('pointInConvexPolygon', () => {
  const square: Point[] = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];

  it('counts boundary points as inside, for either winding', () => {
    expect(pointInConvexPolygon({ x: 0, y: 5 }, square)).toBe(true);
    expect(pointInConvexPolygon({ x: 5, y: 5 }, [...square].reverse())).toBe(true);
  });

  it('rejects points outside', () => {
    expect(pointInConvexPolygon({ x: 11, y: 5 }, square)).toBe(false);
    expect(pointInConvexPolygon({ x: -0.5, y: 5 }, square)).toBe(false);
  });
});

describe('isPointLit', () => {
  const origin = { x: 100, y: 200 };

  it('lights the beam out to its length and not beyond', () => {
    const fp = handFootprints(origin, 'up');
    expect(isPointLit({ x: 100, y: 150 }, fp, [])).toBe(true);
    expect(isPointLit({ x: 100, y: 143 }, fp, [])).toBe(false);
  });

  it('lights the halo 5px behind the lamp and not 13px behind', () => {
    const fp = handFootprints(origin, 'up');
    expect(isPointLit({ x: 100, y: 205 }, fp, [])).toBe(true);
    expect(isPointLit({ x: 100, y: 213 }, fp, [])).toBe(false);
  });

  it('keeps the beam width at distance 50 at about 14.93 px either side', () => {
    const fp = handFootprints(origin, 'up');
    expect(isPointLit({ x: 114, y: 150 }, fp, [])).toBe(true);
    expect(isPointLit({ x: 115, y: 150 }, fp, [])).toBe(false);
  });

  it('lights the diagonal beam at distance 50 and not at 57', () => {
    const fp = handFootprints(origin, 'upright');
    const along = (d: number): Point => ({ x: origin.x + d * SQRT_HALF, y: origin.y - d * SQRT_HALF });
    expect(isPointLit(along(50), fp, [])).toBe(true);
    expect(isPointLit(along(57), fp, [])).toBe(false);
  });

  it('is cut by a wall between the lamp and the point', () => {
    const wall: Rect = { x: 98, y: 170, width: 4, height: 10 };
    const fp = handFootprints(origin, 'up');
    expect(isPointLit({ x: 100, y: 150 }, fp, [wall])).toBe(false);
    expect(isPointLit({ x: 110, y: 150 }, fp, [wall])).toBe(true);
  });

  it('clips the halo at a blocker', () => {
    const wall: Rect = { x: 95, y: 195, width: 10, height: 2 };
    const halo: Footprint[] = [{ kind: 'halo', center: origin, radius: HALO_RADIUS }];
    expect(isPointLit({ x: 100, y: 192 }, halo, [wall])).toBe(false);
    expect(isPointLit({ x: 100, y: 192 }, halo, [])).toBe(true);
  });

  it('is not blocked by a segment that runs exactly along a blocker edge', () => {
    // The segment from the lamp to (98, 150) runs along the blocker's left edge x = 98.
    const edge: Rect = { x: 98, y: 170, width: 4, height: 10 };
    expect(segmentBlocked({ x: 98, y: 200 }, { x: 98, y: 150 }, [edge])).toBe(false);
    expect(segmentBlocked({ x: 100, y: 200 }, { x: 100, y: 150 }, [edge])).toBe(true);
  });
});

describe('lanternFootprints', () => {
  const ground = { x: 100, y: 119 };
  const noPedestal = (): Point | null => null;

  it('gives nothing when the lantern is off', () => {
    expect(lanternFootprints(hand(false), ground, 'up', noPedestal)).toEqual([]);
  });

  it('gives a beam and a halo at the ground point in hand', () => {
    const fps = lanternFootprints(hand(), ground, 'left', noPedestal);
    expect(fps).toEqual([
      { kind: 'beam', origin: ground, facing: 'left' },
      { kind: 'halo', center: ground, radius: HALO_RADIUS },
    ]);
  });

  it('gives a halo at the pedestal plus only that pedestal\'s spills', () => {
    const lantern: LanternState = { location: { at: 'pedestal', pedestalId: 'a' }, on: true };
    const pedestals: Record<string, Point> = { a: { x: 50, y: 50 }, b: { x: 200, y: 50 } };
    const spills = [
      { pedestalId: 'a', points: [{ x: 60, y: 40 }, { x: 70, y: 40 }, { x: 70, y: 60 }] },
      { pedestalId: 'b', points: [{ x: 210, y: 40 }, { x: 220, y: 40 }, { x: 220, y: 60 }] },
    ];
    const fps = lanternFootprints(lantern, ground, 'up', id => pedestals[id] ?? null, spills);
    expect(fps).toHaveLength(2);
    expect(fps[0]).toEqual({ kind: 'halo', center: { x: 50, y: 50 }, radius: HALO_RADIUS });
    expect(fps[1]).toEqual({ kind: 'area', points: spills[0].points, origin: { x: 50, y: 50 } });
  });

  it('gives nothing for a pedestal with no position', () => {
    const lantern: LanternState = { location: { at: 'pedestal', pedestalId: 'missing' }, on: true };
    expect(lanternFootprints(lantern, ground, 'up', noPedestal)).toEqual([]);
  });
});

describe('spill clipping', () => {
  const origin = { x: 50, y: 50 };
  const spill: Point[] = [{ x: 60, y: 45 }, { x: 80, y: 45 }, { x: 80, y: 55 }, { x: 60, y: 55 }];
  const wall: Rect = { x: 66, y: 40, width: 4, height: 20 };

  it('is unlit behind a wall from the pedestal point', () => {
    const fp: Footprint[] = [{ kind: 'area', points: spill, origin }];
    expect(isPointLit({ x: 70, y: 50 }, fp, [wall])).toBe(false);
    expect(isPointLit({ x: 70, y: 50 }, fp, [])).toBe(true);
  });

  it('is never clipped when its origin is null', () => {
    const fp: Footprint[] = [{ kind: 'area', points: spill, origin: null }];
    expect(isPointLit({ x: 70, y: 50 }, fp, [wall])).toBe(true);
  });
});

describe('isRectLit', () => {
  it('is lit when only the corner sample touches the halo', () => {
    // Halo at (100,200), radius 12. Samples of {112,200,2,2}: (112,200), (114,200), (112,202), (114,202).
    // Only (112,200) lies within 12px of the centre.
    const fp: Footprint[] = [{ kind: 'halo', center: { x: 100, y: 200 }, radius: HALO_RADIUS }];
    expect(isRectLit({ x: 112, y: 200, width: 2, height: 2 }, fp, [])).toBe(true);
  });

  it('is not lit when the rect lies fully outside', () => {
    const fp = handFootprints({ x: 100, y: 200 }, 'up');
    expect(isRectLit({ x: 200, y: 0, width: 10, height: 10 }, fp, [])).toBe(false);
  });
});

describe('isMarkReadable', () => {
  const rect: Rect = { x: 98, y: 158, width: 4, height: 4 };
  const fp = handFootprints({ x: 100, y: 200 }, 'up');

  it('reads a lit mark under the beam and not without light', () => {
    const lit: LightMark = { id: 'l', kind: 'lit', rect };
    expect(isMarkReadable(lit, fp, [])).toBe(true);
    expect(isMarkReadable(lit, [], [])).toBe(false);
  });

  it('reads a dark mark only when no footprint covers it', () => {
    const dark: LightMark = { id: 'd', kind: 'dark', rect };
    expect(isMarkReadable(dark, fp, [])).toBe(false);
    expect(isMarkReadable(dark, [], [])).toBe(true);
  });
});

describe('canSeeMark', () => {
  const ground = { x: 100, y: 100 };
  const markAt = (cx: number, cy: number): LightMark => ({ id: 'm', kind: 'lit', rect: { x: cx - 2, y: cy - 2, width: 4, height: 4 } });

  it('sees a mark exactly 64px away and not one 65px away', () => {
    expect(canSeeMark(ground, markAt(100, 164), [])).toBe(true);
    expect(canSeeMark(ground, markAt(100, 165), [])).toBe(false);
  });

  it('does not see through a wall', () => {
    const wall: Rect = { x: 96, y: 120, width: 8, height: 4 };
    expect(canSeeMark(ground, markAt(100, 140), [wall])).toBe(false);
  });

  it('does not see across rooms', () => {
    const rooms: Room[] = [
      { id: 'a', rect: { x: 0, y: 0, width: 100, height: 200 } },
      { id: 'b', rect: { x: 100, y: 0, width: 100, height: 200 } },
    ];
    const westGround = { x: 90, y: 100 };
    expect(canSeeMark(westGround, markAt(110, 100), [], rooms)).toBe(false);
    expect(canSeeMark(westGround, markAt(95, 100), [], rooms)).toBe(true);
  });

  it('skips the room check when there are no rooms', () => {
    const rooms: Room[] = [];
    expect(canSeeMark(ground, markAt(110, 100), [], rooms)).toBe(true);
  });
});

describe('roomAt', () => {
  it('returns the first room containing the point, half-open', () => {
    const rooms: Room[] = [
      { id: 'a', rect: { x: 0, y: 0, width: 100, height: 100 } },
      { id: 'b', rect: { x: 100, y: 0, width: 100, height: 100 } },
    ];
    expect(roomAt({ x: 99.5, y: 50 }, rooms)).toBe('a');
    expect(roomAt({ x: 100, y: 50 }, rooms)).toBe('b');
    expect(roomAt({ x: 200, y: 50 }, rooms)).toBeNull();
  });
});

describe('marksToRecord', () => {
  const fp = handFootprints({ x: 100, y: 200 }, 'up');
  const ground = { x: 100, y: 200 };
  const litAhead: LightMark = { id: 'ahead', kind: 'lit', rect: { x: 98, y: 158, width: 4, height: 4 } };
  const litFar: LightMark = { id: 'far', kind: 'lit', rect: { x: 98, y: 98, width: 4, height: 4 } };
  const darkBehind: LightMark = { id: 'dark', kind: 'dark', rect: { x: 98, y: 178, width: 4, height: 4 } };
  const litAheadSecond: LightMark = { id: 'ahead2', kind: 'lit', rect: { x: 96, y: 150, width: 4, height: 4 } };

  it('keeps list order and skips ids already found', () => {
    const ids = marksToRecord(ground, [litAhead, litAheadSecond], fp, [], [], new Set(['ahead']));
    expect(ids).toEqual(['ahead2']);
  });

  it('skips marks that are unreadable or unseen', () => {
    // litFar is not seen (more than 64px away); darkBehind sits in the beam, so it is not dark-readable.
    const ids = marksToRecord(ground, [litFar, darkBehind, litAhead], fp, [], [], new Set());
    expect(ids).toEqual(['ahead']);
  });
});

describe('isPointLit without a lamp', () => {
  it('is dark when there are no footprints', () => {
    expect(isPointLit({ x: 0, y: 0 }, [], [])).toBe(false);
  });
});
