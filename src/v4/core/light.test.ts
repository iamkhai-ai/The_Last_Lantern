import { describe, it, expect } from 'vitest';
import type { Point, Rect } from './geometry';
import type { LanternState } from './lantern';
import {
  HALO_RADIUS,
  LANTERN_RADIUS,
  canSeeMark,
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

const hand = (on = true): LanternState => ({ location: { at: 'hand' }, on });

/** The handheld circle for a lamp at `centre`. */
function handFootprints(centre: Point): Footprint[] {
  return [{ kind: 'circle', center: centre, radius: LANTERN_RADIUS }];
}

describe('groundPoint', () => {
  it('is the centre of the foot body, 19px below the actor centre', () => {
    expect(groundPoint({ x: 100, y: 100 })).toEqual({ x: 100, y: 119 });
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
  const centre = { x: 100, y: 200 };

  it('lights the circle out to its radius and not beyond, in every direction', () => {
    const fp = handFootprints(centre);
    expect(isPointLit({ x: 140, y: 200 }, fp, [])).toBe(true);
    expect(isPointLit({ x: 141, y: 200 }, fp, [])).toBe(false);
    expect(isPointLit({ x: 100, y: 160 }, fp, [])).toBe(true);
    expect(isPointLit({ x: 100, y: 159 }, fp, [])).toBe(false);
    expect(isPointLit({ x: 60, y: 200 }, fp, [])).toBe(true);
    expect(isPointLit({ x: 100, y: 240 }, fp, [])).toBe(true);
  });

  it('is cut by a wall between the lamp and the point', () => {
    const wall: Rect = { x: 118, y: 190, width: 4, height: 20 };
    const fp = handFootprints(centre);
    expect(isPointLit({ x: 130, y: 200 }, fp, [wall])).toBe(false);
    expect(isPointLit({ x: 100, y: 170 }, fp, [wall])).toBe(true);
  });

  it('clips the circle at a blocker', () => {
    const wall: Rect = { x: 95, y: 195, width: 10, height: 2 };
    const halo: Footprint[] = [{ kind: 'circle', center: centre, radius: HALO_RADIUS }];
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
    expect(lanternFootprints(hand(false), ground, noPedestal)).toEqual([]);
  });

  it('gives one circle of LANTERN_RADIUS at the ground point in hand', () => {
    expect(LANTERN_RADIUS).toBe(40);
    expect(lanternFootprints(hand(), ground, noPedestal)).toEqual([
      { kind: 'circle', center: ground, radius: LANTERN_RADIUS },
    ]);
  });

  it('gives a halo at the pedestal plus only that pedestal\'s spills', () => {
    const lantern: LanternState = { location: { at: 'pedestal', pedestalId: 'a' }, on: true };
    const pedestals: Record<string, Point> = { a: { x: 50, y: 50 }, b: { x: 200, y: 50 } };
    const spills = [
      { pedestalId: 'a', points: [{ x: 60, y: 40 }, { x: 70, y: 40 }, { x: 70, y: 60 }] },
      { pedestalId: 'b', points: [{ x: 210, y: 40 }, { x: 220, y: 40 }, { x: 220, y: 60 }] },
    ];
    const fps = lanternFootprints(lantern, ground, id => pedestals[id] ?? null, spills);
    expect(fps).toHaveLength(2);
    expect(fps[0]).toEqual({ kind: 'circle', center: { x: 50, y: 50 }, radius: HALO_RADIUS });
    expect(fps[1]).toEqual({ kind: 'area', points: spills[0].points, origin: { x: 50, y: 50 } });
  });

  it('gives a placed lantern a circle of radius 12 only, with no spills declared', () => {
    const lantern: LanternState = { location: { at: 'pedestal', pedestalId: 'a' }, on: true };
    expect(lanternFootprints(lantern, ground, id => (id === 'a' ? { x: 50, y: 50 } : null)))
      .toEqual([{ kind: 'circle', center: { x: 50, y: 50 }, radius: 12 }]);
  });

  it('gives nothing for a pedestal with no position', () => {
    const lantern: LanternState = { location: { at: 'pedestal', pedestalId: 'missing' }, on: true };
    expect(lanternFootprints(lantern, ground, noPedestal)).toEqual([]);
  });
});

describe('circle from the ground point', () => {
  it('lights the circle around a ground point at (100,200) with radius 40', () => {
    const fp = lanternFootprints(hand(), { x: 100, y: 200 }, () => null);
    expect(isPointLit({ x: 140, y: 200 }, fp, [])).toBe(true);
    expect(isPointLit({ x: 141, y: 200 }, fp, [])).toBe(false);
    expect(isPointLit({ x: 100, y: 160 }, fp, [])).toBe(true);
  });

  it('is cut by a wall at {118,190,4,20}, but not at the same distance in another direction', () => {
    const fp = lanternFootprints(hand(), { x: 100, y: 200 }, () => null);
    const wall: Rect = { x: 118, y: 190, width: 4, height: 20 };
    expect(isPointLit({ x: 130, y: 200 }, fp, [wall])).toBe(false);
    expect(isPointLit({ x: 100, y: 170 }, fp, [wall])).toBe(true);
  });

  it('gives a placed lantern a circle of radius 12 only', () => {
    const lantern: LanternState = { location: { at: 'pedestal', pedestalId: 'a' }, on: true };
    const fp = lanternFootprints(lantern, { x: 100, y: 200 }, id => (id === 'a' ? { x: 100, y: 200 } : null));
    expect(isPointLit({ x: 112, y: 200 }, fp, [])).toBe(true);
    expect(isPointLit({ x: 113, y: 200 }, fp, [])).toBe(false);
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
    const fp: Footprint[] = [{ kind: 'circle', center: { x: 100, y: 200 }, radius: HALO_RADIUS }];
    expect(isRectLit({ x: 112, y: 200, width: 2, height: 2 }, fp, [])).toBe(true);
  });

  it('is not lit when the rect lies fully outside', () => {
    const fp = handFootprints({ x: 100, y: 200 });
    expect(isRectLit({ x: 200, y: 0, width: 10, height: 10 }, fp, [])).toBe(false);
  });
});

describe('isMarkReadable', () => {
  const rect: Rect = { x: 98, y: 158, width: 4, height: 4 };
  const fp = handFootprints({ x: 100, y: 200 });

  it('reads a lit mark under the circle and not without light', () => {
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
  const fp = handFootprints({ x: 100, y: 200 });
  const ground = { x: 100, y: 200 };
  const litAhead: LightMark = { id: 'ahead', kind: 'lit', rect: { x: 98, y: 158, width: 4, height: 4 } };
  const litFar: LightMark = { id: 'far', kind: 'lit', rect: { x: 98, y: 98, width: 4, height: 4 } };
  const darkBehind: LightMark = { id: 'dark', kind: 'dark', rect: { x: 98, y: 178, width: 4, height: 4 } };
  const litAheadSecond: LightMark = { id: 'ahead2', kind: 'lit', rect: { x: 96, y: 170, width: 4, height: 4 } };

  it('keeps list order and skips ids already found', () => {
    const ids = marksToRecord(ground, [litAhead, litAheadSecond], fp, [], [], new Set(['ahead']));
    expect(ids).toEqual(['ahead2']);
  });

  it('skips marks that are unreadable or unseen', () => {
    // litFar is not seen (more than 64px away); darkBehind sits in the circle, so it is not dark-readable.
    const ids = marksToRecord(ground, [litFar, darkBehind, litAhead], fp, [], [], new Set());
    expect(ids).toEqual(['ahead']);
  });
});

describe('isPointLit without a lamp', () => {
  it('is dark when there are no footprints', () => {
    expect(isPointLit({ x: 0, y: 0 }, [], [])).toBe(false);
  });
});
