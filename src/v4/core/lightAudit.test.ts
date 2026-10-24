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
    expect(areas.some(a => a.facing === 'up')).toBe(true);
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

  it('returns no areas when the goal has no anchor', () => {
    const input: AimInput = { world: WORLD, solids: [], blockers: [], start: { x: 100, y: 150 } };
    expect(findAimAreas({ hit: [], avoid: [] }, input)).toEqual([]);
  });
});
