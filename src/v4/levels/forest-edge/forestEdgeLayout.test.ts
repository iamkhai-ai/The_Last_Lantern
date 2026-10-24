import { describe, it, expect } from 'vitest';
import { footRectAt } from '../../core/body';
import { pointInRect, rectsOverlap } from '../../core/geometry';
import type { Rect } from '../../core/geometry';
import { HALO_RADIUS, canSeeMark, groundPoint, isMarkReadable, lanternFootprints } from '../../core/light';
import { initialLantern } from '../../core/lantern';
import { hasAimArea } from '../../core/lightAudit';
import type { AimInput } from '../../core/lightAudit';
import { isInReach, rectGap } from '../../core/reach';
import { auditReach, canReachItem, isFootWalkable, reachableFeet } from '../../core/reachAudit';
import type { AuditInput } from '../../core/reachAudit';
import { HUD_BANDS } from '../../../ui/hudLayout';

/** The pulse radius of the lantern (LanternSystem.PULSE_MAX_RADIUS). Kept here so the test stays free of Phaser. */
const PULSE_MAX_RADIUS = 195;
import {
  FOREST_EDGE,
  FOREST_EDGE_ITEMS,
  FOREST_EDGE_LIGHT_MARKS,
  FOREST_EDGE_PULSE_MARKS,
  FOREST_EDGE_ROOMS,
  MIDDLE_CHECKPOINT_ID,
  S1_ID,
  S2_ID,
  YARD_CHECKPOINT_ID,
  SPROUT_ID,
} from './forestEdgeLayout';
import { forestBlockers, forestSolids, INITIAL_FOREST_LIVE } from './forestEdgeLogic';
import type { ForestEdgeLive } from './forestEdgeLogic';

/** Both doors closed: the level as a new game starts. */
const CLOSED: ForestEdgeLive = INITIAL_FOREST_LIVE;
/** Door A open, gate B closed: the state after the first crossing. */
const A_OPEN: ForestEdgeLive = { doorAOpen: true, gateBOpen: false };
/** Gate B open, door A closed. */
const B_OPEN: ForestEdgeLive = { doorAOpen: false, gateBOpen: true };
/** Both open: the most permissive state, used to check thresholds. */
const BOTH_OPEN: ForestEdgeLive = { doorAOpen: true, gateBOpen: true };

function spawnOf(id: string) {
  const checkpoint = FOREST_EDGE.checkpoints.find(c => c.id === id);
  if (!checkpoint) throw new Error(`no checkpoint ${id}`);
  return checkpoint.spawn;
}

function item(id: string) {
  const found = FOREST_EDGE_ITEMS.find(i => i.id === id);
  if (!found) throw new Error(`no item ${id}`);
  return found;
}

function walk(live: ForestEdgeLive) {
  return { world: FOREST_EDGE.world, solids: forestSolids(live) };
}

function aimInput(start: { x: number; y: number }, live: ForestEdgeLive): AimInput {
  return { world: FOREST_EDGE.world, solids: forestSolids(live), blockers: forestBlockers(live), start };
}

/** Every foot rect overlapping a zone, on the 1px grid, that walks in the given solids. */
function footsOverlapping(zone: Rect, live: ForestEdgeLive): { x: number; y: number }[] {
  const solids = forestSolids(live);
  const found: { x: number; y: number }[] = [];
  for (let y = zone.y - 6; y < zone.y + zone.height; y++) {
    for (let x = zone.x - 14; x < zone.x + zone.width; x++) {
      const foot = { x, y, width: 14, height: 6 };
      if (!rectsOverlap(foot, zone)) continue;
      if (!isFootWalkable(foot, { world: FOREST_EDGE.world, solids })) continue;
      found.push({ x: x + 7, y: y - 16 });
    }
  }
  return found;
}

describe('forest edge reach audit', () => {
  it('is clean with both doors closed', () => {
    const input: AuditInput = { ...walk(CLOSED), hudBands: HUD_BANDS, items: FOREST_EDGE_ITEMS };
    expect(auditReach(input)).toEqual([]);
  });

  it('is clean with door A open', () => {
    const input: AuditInput = { ...walk(A_OPEN), hudBands: HUD_BANDS, items: FOREST_EDGE_ITEMS };
    expect(auditReach(input)).toEqual([]);
  });

  it('is clean with gate B open', () => {
    const input: AuditInput = { ...walk(B_OPEN), hudBands: HUD_BANDS, items: FOREST_EDGE_ITEMS };
    expect(auditReach(input)).toEqual([]);
  });

  it('is clean with both doors open', () => {
    const input: AuditInput = { ...walk(BOTH_OPEN), hudBands: HUD_BANDS, items: FOREST_EDGE_ITEMS };
    expect(auditReach(input)).toEqual([]);
  });
});

describe('forest edge reachability', () => {
  it('reaches S1 and the hinge from the yard spawn with the doors closed', () => {
    const start = spawnOf(YARD_CHECKPOINT_ID);
    expect(canReachItem(start, item(S1_ID), walk(CLOSED))).toBe(true);
    expect(canReachItem(start, item('hinge'), walk(CLOSED))).toBe(true);
  });

  it('keeps the yards apart while door A is closed', () => {
    const reach = reachableFeet(spawnOf(YARD_CHECKPOINT_ID), walk(CLOSED));
    for (const key of reach) {
      const [x] = key.split(',').map(Number);
      expect(x).toBeLessThan(312);
    }
    expect(canReachItem(spawnOf(YARD_CHECKPOINT_ID), item('latchA'), walk(CLOSED))).toBe(false);
  });

  it('reaches latch A from the yard spawn once door A is open', () => {
    expect(canReachItem(spawnOf(YARD_CHECKPOINT_ID), item('latchA'), walk(A_OPEN))).toBe(true);
  });

  it('reaches latch A and S2 and brace B from the middle spawn while gate B is closed', () => {
    const start = spawnOf(MIDDLE_CHECKPOINT_ID);
    expect(canReachItem(start, item('latchA'), walk(CLOSED))).toBe(true);
    expect(canReachItem(start, item(S2_ID), walk(CLOSED))).toBe(true);
    expect(canReachItem(start, item('braceB'), walk(CLOSED))).toBe(true);
  });

  it('reaches the exit zone from the middle spawn only with gate B open', () => {
    const start = spawnOf(MIDDLE_CHECKPOINT_ID);
    const exitFoot = (live: ForestEdgeLive) =>
      [...reachableFeet(start, walk(live))].some(key => {
        const [x, y] = key.split(',').map(Number);
        return rectsOverlap(footRectAt({ x, y }), FOREST_EDGE.exitZone);
      });
    expect(exitFoot(B_OPEN)).toBe(true);
    expect(exitFoot(CLOSED)).toBe(false);
  });
});

describe('forest edge pedestals and thresholds', () => {
  it('keeps S1 out of reach from every foot position inside threshold A', () => {
    const feet = footsOverlapping(FOREST_EDGE.thresholdA, BOTH_OPEN);
    expect(feet.length).toBeGreaterThan(0);
    for (const centre of feet) {
      expect(isInReach(footRectAt(centre), item(S1_ID).reach)).toBe(false);
    }
  });

  it('keeps S2 out of reach from every foot position inside threshold B', () => {
    const feet = footsOverlapping(FOREST_EDGE.thresholdB, BOTH_OPEN);
    expect(feet.length).toBeGreaterThan(0);
    for (const centre of feet) {
      expect(isInReach(footRectAt(centre), item(S2_ID).reach)).toBe(false);
    }
  });

  it('keeps every pedestal and sealed socket clear of the light marks and their halos', () => {
    for (const pedestal of [FOREST_EDGE.s1, FOREST_EDGE.s2]) {
      for (const mark of FOREST_EDGE_LIGHT_MARKS) {
        expect(rectGap(mark.rect, pedestal)).toBeGreaterThan(HALO_RADIUS);
      }
    }
  });

  it('places the door leaves in the wall gaps and the thresholds over them', () => {
    for (const [leaf, threshold] of [[FOREST_EDGE.doorA, FOREST_EDGE.thresholdA], [FOREST_EDGE.gateB, FOREST_EDGE.thresholdB]] as const) {
      expect(FOREST_EDGE.walls.some(wall => rectsOverlap(wall, leaf))).toBe(false);
      expect(rectsOverlap(threshold, leaf)).toBe(true);
    }
  });

  it('keeps every pedestal and socket off the threshold they are not meant to power', () => {
    expect(rectsOverlap(FOREST_EDGE.s1, FOREST_EDGE.thresholdA)).toBe(false);
    expect(rectsOverlap(FOREST_EDGE.s2, FOREST_EDGE.thresholdB)).toBe(false);
  });
});

describe('forest edge checkpoints and geometry', () => {
  it('keeps both spawns on walkable feet inside their zones, in every door state', () => {
    for (const live of [CLOSED, A_OPEN, B_OPEN, BOTH_OPEN]) {
      for (const c of FOREST_EDGE.checkpoints) {
        expect(pointInRect(c.spawn, c.zone)).toBe(true);
        expect(isFootWalkable(footRectAt(c.spawn), walk(live))).toBe(true);
      }
    }
  });

  it('keeps checkpoints out of both thresholds', () => {
    for (const c of FOREST_EDGE.checkpoints) {
      expect(rectsOverlap(c.zone, FOREST_EDGE.thresholdA)).toBe(false);
      expect(rectsOverlap(c.zone, FOREST_EDGE.thresholdB)).toBe(false);
      expect(rectsOverlap(footRectAt(c.spawn), FOREST_EDGE.thresholdA)).toBe(false);
      expect(rectsOverlap(footRectAt(c.spawn), FOREST_EDGE.thresholdB)).toBe(false);
    }
  });

  it('puts the exit zone beyond gate B', () => {
    expect(FOREST_EDGE.exitZone.x).toBeGreaterThanOrEqual(FOREST_EDGE.gateB.x + FOREST_EDGE.gateB.width);
  });

  it('keeps every solid and every interactable out of the HUD bands', () => {
    for (const item of FOREST_EDGE_ITEMS) {
      expect(HUD_BANDS.some(band => rectsOverlap(item.reach.rect, band))).toBe(false);
    }
    for (const mark of FOREST_EDGE_LIGHT_MARKS) {
      expect(HUD_BANDS.some(band => rectsOverlap(mark.rect, band))).toBe(false);
    }
  });

  it('keeps the interactables clear of the sealed gaps they are not meant to block', () => {
    for (const item of FOREST_EDGE_ITEMS) {
      expect(rectsOverlap(item.reach.rect, FOREST_EDGE.doorA)).toBe(false);
      expect(rectsOverlap(item.reach.rect, FOREST_EDGE.gateB)).toBe(false);
    }
  });
});

describe('forest edge light marks and pulse', () => {
  it('lets the handheld lantern at the start spot read the sprout', () => {
    const start = spawnOf(YARD_CHECKPOINT_ID);
    const sprout = FOREST_EDGE_LIGHT_MARKS.find(m => m.id === SPROUT_ID)!;
    expect(hasAimArea({ hit: [sprout.rect], avoid: [] }, aimInput(start, CLOSED))).toBe(true);
  });

  it('lets every dark mark be read with the lantern in hand from a reachable spot out of its circle, and seen from there', () => {
    const blockers = forestBlockers(CLOSED);
    for (const mark of FOREST_EDGE_LIGHT_MARKS) {
      if (mark.kind !== 'dark') continue;
      const room = FOREST_EDGE_ROOMS.find(r => pointInRect({ x: mark.rect.x, y: mark.rect.y }, r.rect));
      const start = room?.id === 'middle' ? spawnOf(MIDDLE_CHECKPOINT_ID) : spawnOf(YARD_CHECKPOINT_ID);
      const grounds = [...reachableFeet(start, walk(CLOSED))].map(key => {
        const [x, y] = key.split(',').map(Number);
        return groundPoint({ x, y });
      });
      const found = grounds.some(ground => {
        const footprints = lanternFootprints(initialLantern(), ground, () => null);
        return isMarkReadable(mark, footprints, blockers) && canSeeMark(ground, mark, blockers, FOREST_EDGE_ROOMS);
      });
      expect(found, mark.id).toBe(true);
    }
  });

  it('keeps the pulse marks in reach of a pulse at the stele', () => {
    const stele = FOREST_EDGE.stele;
    const origin = { x: stele.x + stele.width / 2, y: stele.y + stele.height / 2 };
    for (const mark of FOREST_EDGE_PULSE_MARKS) {
      const dx = mark.x - origin.x;
      const dy = mark.y - origin.y;
      expect(Math.hypot(dx, dy)).toBeLessThanOrEqual(PULSE_MAX_RADIUS);
    }
  });
});
