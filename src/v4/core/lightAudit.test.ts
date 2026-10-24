import { describe, it, expect } from 'vitest';
import type { Rect } from './geometry';
import { AIM_AREA, findAimAreas, hasAimArea } from './lightAudit';
import type { AimGoal, AimInput } from './lightAudit';

const WORLD: Rect = { x: 0, y: 0, width: 200, height: 200 };

describe('findAimAreas and hasAimArea', () => {
  it('finds an aim area for a target 30px north of the start in an empty room', () => {
    // Start actor centre (100,150); the hit rect is centred at (100,120), 30px north.
    const input: AimInput = { world: WORLD, solids: [], blockers: [], start: { x: 100, y: 150 } };
    const goal: AimGoal = { hit: [{ x: 98, y: 116, width: 4, height: 8 }], avoid: [] };
    expect(hasAimArea(goal, input)).toBe(true);
    const areas = findAimAreas(goal, input);
    expect(areas.length).toBeGreaterThan(0);
    expect(AIM_AREA).toBe(8);
  });

  it('finds no aim area when an avoid rect contains the hit rect', () => {
    const input: AimInput = { world: WORLD, solids: [], blockers: [], start: { x: 100, y: 150 } };
    const hit: Rect = { x: 98, y: 116, width: 4, height: 8 };
    const avoid: Rect = { x: 90, y: 100, width: 30, height: 40 };
    expect(hasAimArea({ hit: [hit], avoid: [avoid] }, input)).toBe(false);
  });

  it('finds no aim area when the target is reachable only through a 16px pocket', () => {
    // Two full-height walls leave a 16px corridor at x 92..108. The foot is 14px wide, so only one
    // column of standing positions fits: no 8x8 block can form.
    const walls: Rect[] = [
      { x: 0, y: 0, width: 92, height: 200 },
      { x: 108, y: 0, width: 92, height: 200 },
    ];
    const input: AimInput = { world: WORLD, solids: walls, blockers: walls, start: { x: 100, y: 100 } };
    const goal: AimGoal = { hit: [{ x: 98, y: 60, width: 4, height: 4 }], avoid: [] };
    expect(hasAimArea(goal, input)).toBe(false);
  });

  it('finds an aim area for a dark mark, which is read from outside the circle', () => {
    // A dark mark is readable only when no footprint reaches it, so every standing position that reads it
    // has its ground point more than 40px away, and it is seen only within 64px.
    const input: AimInput = { world: WORLD, solids: [], blockers: [], start: { x: 100, y: 150 } };
    const mark = { id: 'spores', kind: 'dark' as const, rect: { x: 98, y: 40, width: 4, height: 4 } };
    expect(hasAimArea({ hit: [], avoid: [mark.rect], seen: mark }, input)).toBe(true);
  });

  it('finds an aim area for a dark mark in the middle of an open room', () => {
    // The mark centre is 60px from the start-side wall; the ring 40..64px around it is open floor.
    const room: Rect = { x: 0, y: 0, width: 320, height: 240 };
    const input: AimInput = { world: room, solids: [], blockers: [], start: { x: 60, y: 200 } };
    const mark = { id: 'spores', kind: 'dark' as const, rect: { x: 157, y: 117, width: 6, height: 6 } };
    expect(hasAimArea({ hit: [], avoid: [mark.rect], seen: mark, rooms: [{ id: 'room', rect: room }] }, input)).toBe(true);
  });

  it('finds no aim area for a dark mark whose 40..64px ring is solid', () => {
    // A square frame of solids surrounds the mark: its pocket (half-size 30) is closed, and the open
    // floor outside the frame is farther than 64px. Feet in the pocket are closer than 40px or cannot fit an 8x8 block.
    const room: Rect = { x: 0, y: 0, width: 320, height: 240 };
    const frame: Rect[] = [
      { x: 88, y: 48, width: 144, height: 42 },
      { x: 88, y: 150, width: 144, height: 42 },
      { x: 88, y: 90, width: 42, height: 60 },
      { x: 190, y: 90, width: 42, height: 60 },
    ];
    const input: AimInput = { world: room, solids: frame, blockers: frame, start: { x: 40, y: 200 } };
    const mark = { id: 'spores', kind: 'dark' as const, rect: { x: 157, y: 117, width: 6, height: 6 } };
    expect(hasAimArea({ hit: [], avoid: [mark.rect], seen: mark, rooms: [{ id: 'room', rect: room }] }, input)).toBe(false);
  });

  it('returns no areas when the goal has no anchor', () => {
    const input: AimInput = { world: WORLD, solids: [], blockers: [], start: { x: 100, y: 150 } };
    expect(findAimAreas({ hit: [], avoid: [] }, input)).toEqual([]);
  });
});
