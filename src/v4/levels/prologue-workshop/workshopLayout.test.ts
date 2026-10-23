import { describe, it, expect } from 'vitest';
import { HUD_BANDS } from '../../../ui/hudLayout';
import { pointInRect, rectsOverlap } from '../../core/geometry';
import type { Rect } from '../../core/geometry';
import { WORKSHOP, WORKSHOP_ITEMS, WORKSHOP_SPAWN, BENCH_ID, BOATMAN_ID, MOTHER_ID, PANEL_ID, START_CHECKPOINT_ID, TRAY_ID } from './workshopLayout';

function inside(inner: Rect, outer: Rect): boolean {
  return inner.x >= outer.x
    && inner.y >= outer.y
    && inner.x + inner.width <= outer.x + outer.width
    && inner.y + inner.height <= outer.y + outer.height;
}

describe('workshop layout', () => {
  it('keeps the floor at the design rectangle', () => {
    expect(WORKSHOP.world).toEqual({ x: 74, y: 98, width: 486, height: 206 });
  });

  it('keeps every wall outside the walkable floor', () => {
    for (const wall of WORKSHOP.walls) {
      expect(rectsOverlap(wall, WORKSHOP.world)).toBe(false);
    }
  });

  it('keeps the bench, tray, Mẹ, the boatman and the south door inside the floor bounds', () => {
    for (const r of [WORKSHOP.bench, WORKSHOP.tray, WORKSHOP.mother, WORKSHOP.boatman, WORKSHOP.southDoor]) {
      expect(inside(r, WORKSHOP.world)).toBe(true);
    }
  });

  it('places the south door across the floor edge, leaving the gap in the south wall', () => {
    const { southDoor, world } = WORKSHOP;
    expect(southDoor.y + southDoor.height).toBe(world.y + world.height);
    const wallGap = WORKSHOP.walls.filter(w => w.y === world.y + world.height);
    expect(wallGap.some(w => w.x + w.width === southDoor.x)).toBe(true);
    expect(wallGap.some(w => w.x === southDoor.x + southDoor.width)).toBe(true);
  });

  it('keeps every object clear of the HUD bands', () => {
    const rects: Rect[] = [WORKSHOP.bench, WORKSHOP.tray, WORKSHOP.panel, WORKSHOP.mother, WORKSHOP.boatman, WORKSHOP.southDoor];
    for (const r of rects) {
      expect(HUD_BANDS.some(band => rectsOverlap(r, band))).toBe(false);
    }
  });

  it('starts Nhinh at the centre of the floor, inside the start checkpoint zone', () => {
    const start = WORKSHOP.checkpoints.find(c => c.id === START_CHECKPOINT_ID);
    expect(start).toBeDefined();
    expect(start!.spawn).toEqual(WORKSHOP_SPAWN);
    expect(pointInRect(WORKSHOP_SPAWN, start!.zone)).toBe(true);
    expect(WORKSHOP_SPAWN).toEqual({ x: 300, y: 250 });
  });

  it('lists the five interactables once each, with block reach on their collision rects', () => {
    const ids = WORKSHOP_ITEMS.map(i => i.id);
    expect(ids.sort()).toEqual([BENCH_ID, BOATMAN_ID, MOTHER_ID, PANEL_ID, TRAY_ID].sort());
    for (const item of WORKSHOP_ITEMS) {
      expect(item.reach.kind).toBe('block');
    }
  });

  it('keeps the design rectangles for the bench, tray, panel, Mẹ and the boatman', () => {
    expect(WORKSHOP.bench).toEqual({ x: 272, y: 172, width: 58, height: 34 });
    expect(WORKSHOP.tray).toEqual({ x: 95, y: 214, width: 34, height: 22 });
    expect(WORKSHOP.panel).toEqual({ x: 541, y: 150, width: 22, height: 22 });
    expect(WORKSHOP.mother).toEqual({ x: 516, y: 208, width: 16, height: 6 });
    expect(WORKSHOP.boatman).toEqual({ x: 224, y: 282, width: 16, height: 6 });
    expect(WORKSHOP.southDoor).toEqual({ x: 264, y: 298, width: 100, height: 6 });
  });
});
