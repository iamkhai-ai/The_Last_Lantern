import { describe, it, expect } from 'vitest';
import { HUD_BANDS } from '../../ui/hudLayout';
import type { Rect } from './geometry';
import type { AuditInput, AuditItem } from './reachAudit';
import { auditReach, canReachItem, isFootWalkable, reachableFeet } from './reachAudit';

const WORLD: Rect = { x: 0, y: 0, width: 640, height: 360 };

const block = (id: string, rect: Rect): AuditItem => ({ id, reach: { kind: 'block', rect } });

function input(partial: Partial<AuditInput> & Pick<AuditInput, 'items'>): AuditInput {
  return { world: WORLD, solids: [], hudBands: HUD_BANDS, ...partial };
}

describe('auditReach', () => {
  it('returns no problems for a clean room', () => {
    const items = [block('pedestal', { x: 300, y: 160, width: 20, height: 20 })];
    expect(auditReach(input({ items }))).toEqual([]);
  });

  it('reports an item whose rect sits under the top HUD band', () => {
    const problems = auditReach(input({ items: [block('high', { x: 100, y: 40, width: 20, height: 20 })] }));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/HUD band/);
  });

  it('reports an item boxed in by solids', () => {
    // A solid that covers the item and every foot position within 12px of it.
    const solids: Rect[] = [{ x: 60, y: 60, width: 120, height: 120 }];
    const problems = auditReach(input({ solids, items: [block('boxed', { x: 100, y: 100, width: 20, height: 20 })] }));
    expect(problems).toEqual(['item "boxed": no walkable foot position in reach']);
  });

  it('accepts a wall-mounted control reached only from its listed face', () => {
    const solids: Rect[] = [{ x: 100, y: 0, width: 10, height: 300 }];
    const items: AuditItem[] = [{ id: 'lever', reach: { kind: 'faces', rect: { x: 100, y: 50, width: 10, height: 20 }, faces: ['east'] } }];
    expect(auditReach(input({ solids, items, hudBands: [] }))).toEqual([]);
  });
});

describe('isFootWalkable', () => {
  const room = { world: { x: 0, y: 0, width: 100, height: 100 }, solids: [{ x: 40, y: 40, width: 20, height: 20 }] };

  it('rejects a foot outside the world', () => {
    expect(isFootWalkable({ x: -1, y: 10, width: 14, height: 6 }, room)).toBe(false);
    expect(isFootWalkable({ x: 90, y: 10, width: 14, height: 6 }, room)).toBe(false);
  });

  it('rejects a foot that overlaps a solid', () => {
    expect(isFootWalkable({ x: 50, y: 50, width: 14, height: 6 }, room)).toBe(false);
  });

  it('accepts a foot that only touches a solid along an edge', () => {
    expect(isFootWalkable({ x: 60, y: 40, width: 14, height: 6 }, room)).toBe(true);
  });
});

describe('reachableFeet and canReachItem', () => {
  // A 200x200 room with a wall at x 96..104 whose gap (y 90..110) is open or closed by a leaf.
  const wall: Rect = { x: 96, y: 0, width: 8, height: 90 };
  const lowerWall: Rect = { x: 96, y: 110, width: 8, height: 90 };
  const leaf: Rect = { x: 96, y: 90, width: 8, height: 20 };
  const item = block('far', { x: 150, y: 95, width: 16, height: 16 });
  const start = { x: 40, y: 100 };

  it('is empty when the start foot is not walkable', () => {
    const blocked = { world: WORLD, solids: [{ x: 0, y: 0, width: 640, height: 360 }] };
    expect(reachableFeet(start, blocked).size).toBe(0);
  });

  it('includes the start position and never a position inside a solid', () => {
    const solids = [wall, lowerWall];
    const reached = reachableFeet(start, { world: { x: 0, y: 0, width: 200, height: 200 }, solids });
    expect(reached.has('40,100')).toBe(true);
    expect(reached.has('100,100')).toBe(false);
  });

  it('cannot reach an item across a closed wall', () => {
    const solids = [wall, lowerWall, leaf];
    expect(canReachItem(start, item, { world: { x: 0, y: 0, width: 200, height: 200 }, solids })).toBe(false);
  });

  it('reaches an item through an open gap', () => {
    const solids = [wall, lowerWall];
    expect(canReachItem(start, item, { world: { x: 0, y: 0, width: 200, height: 200 }, solids })).toBe(true);
  });
});
