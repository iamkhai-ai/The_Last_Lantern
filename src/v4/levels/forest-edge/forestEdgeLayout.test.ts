import { describe, it, expect } from 'vitest';
import { footRectAt } from '../../core/body';
import { pointInRect, rectCenter, rectsOverlap } from '../../core/geometry';
import type { Rect } from '../../core/geometry';
import { HALO_RADIUS, canSeeMark, groundPoint, isMarkReadable, lanternFootprints } from '../../core/light';
import { initialLantern } from '../../core/lantern';
import { hasAimArea } from '../../core/lightAudit';
import type { AimInput } from '../../core/lightAudit';
import { isInReach, rectGap } from '../../core/reach';
import { auditReach, canReachItem, isFootWalkable, reachableFeet } from '../../core/reachAudit';
import type { AuditInput } from '../../core/reachAudit';
import { HUD_BANDS } from '../../../ui/hudLayout';
import LAYOUT_JSON from '../../../../docs/implementation/v4/01-forest-edge-layout.json';
import {
  FOREST_EDGE,
  FOREST_EDGE_ITEMS,
  FOREST_EDGE_LIGHT_MARKS,
  FOREST_EDGE_PULSE_MARKS,
  FOREST_EDGE_ROOMS,
  LAMP_REST_EXCEPTION,
  LAMP_REST_ID,
  LAMP_REST_REACH,
  MIDDLE_CHECKPOINT_ID,
  S1_ID,
  S2_ID,
  YARD_CHECKPOINT_ID,
  SPROUT_ID,
} from './forestEdgeLayout';
import { forestBlockers, forestSolids, INITIAL_FOREST_LIVE } from './forestEdgeLogic';
import type { ForestEdgeLive } from './forestEdgeLogic';

/** The pulse radius of the lantern (LanternSystem.PULSE_MAX_RADIUS). Kept here so the test stays free of Phaser. */
const PULSE_MAX_RADIUS = 195;

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
    const middle = FOREST_EDGE_ROOMS.find(r => r.id === 'middle')!.rect;
    const reach = reachableFeet(spawnOf(YARD_CHECKPOINT_ID), walk(CLOSED));
    for (const key of reach) {
      const [x, y] = key.split(',').map(Number);
      expect(pointInRect(rectCenter(footRectAt({ x, y })), middle), key).toBe(false);
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

  it('puts the exit zone at the north end of gate B, in the same opening', () => {
    expect(FOREST_EDGE.exitZone.x).toBe(FOREST_EDGE.gateB.x);
    expect(FOREST_EDGE.exitZone.width).toBe(FOREST_EDGE.gateB.width);
    expect(FOREST_EDGE.exitZone.y + FOREST_EDGE.exitZone.height).toBeLessThanOrEqual(FOREST_EDGE.gateB.y);
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

  it('lights the sprout on the first switch-on just south of the lamp, where the lamp is taken', () => {
    // Scenario 01 §1: the first switch-on with the lamp in hand covers the sprout Lumo hides.
    const foot = { x: 214, y: 242 };
    expect(pointInRect(foot, LAMP_REST_REACH)).toBe(true);
    const footRect = { x: foot.x - 7, y: foot.y - 3, width: 14, height: 6 };
    expect(isFootWalkable(footRect, { world: FOREST_EDGE.world, solids: forestSolids(CLOSED) })).toBe(true);
    const sprout = FOREST_EDGE_LIGHT_MARKS.find(m => m.id === SPROUT_ID)!;
    const lantern = lanternFootprints(initialLantern(), foot, () => null);
    expect(isMarkReadable(sprout, lantern, forestBlockers(CLOSED))).toBe(true);
  });

  it('lets every dark mark be read with the lantern in hand from a reachable spot out of its circle, and seen from there', () => {
    const blockers = forestBlockers(CLOSED);
    for (const mark of FOREST_EDGE_LIGHT_MARKS) {
      if (mark.kind !== 'dark') continue;
      const room = FOREST_EDGE_ROOMS.find(r => pointInRect(rectCenter(mark.rect), r.rect));
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

  it('gives every dark mark a seen aim area from the spawn of its room', () => {
    for (const mark of FOREST_EDGE_LIGHT_MARKS) {
      if (mark.kind !== 'dark') continue;
      const room = FOREST_EDGE_ROOMS.find(r => pointInRect(rectCenter(mark.rect), r.rect));
      const start = spawnOf(room?.id === 'middle' ? MIDDLE_CHECKPOINT_ID : YARD_CHECKPOINT_ID);
      const found = hasAimArea({ hit: [], avoid: [], seen: mark, rooms: FOREST_EDGE_ROOMS }, aimInput(start, CLOSED));
      expect(found, mark.id).toBe(true);
    }
  });

  it('keeps a standing spot in stele reach from which every pulse mark is in pulse range', () => {
    // The pulse starts at Nhinh's actor centre, not at the stele, so the origin is a reachable standing spot.
    const stele = { kind: 'block' as const, rect: FOREST_EDGE.stele };
    const origins = [...reachableFeet(spawnOf(YARD_CHECKPOINT_ID), walk(CLOSED))].map(key => {
      const [x, y] = key.split(',').map(Number);
      return { x, y };
    });
    const found = origins.some(
      origin =>
        isInReach(footRectAt(origin), stele) &&
        FOREST_EDGE_PULSE_MARKS.every(mark => Math.hypot(mark.x - origin.x, mark.y - origin.y) <= PULSE_MAX_RADIUS),
    );
    expect(found).toBe(true);
  });
});

describe('forest edge lamp on the ground', () => {
  it('reaches the lamp from the yard spawn, with both doors closed and open', () => {
    const start = spawnOf(YARD_CHECKPOINT_ID);
    expect(canReachItem(start, item(LAMP_REST_ID), walk(CLOSED))).toBe(true);
    expect(canReachItem(start, item(LAMP_REST_ID), walk(A_OPEN))).toBe(true);
  });

  it('keeps the lamp off the solids and out of the light blockers, so it casts nothing', () => {
    expect(forestSolids(CLOSED).some(rect => rectsOverlap(rect, FOREST_EDGE.lampRest))).toBe(false);
    expect(forestBlockers(CLOSED).some(rect => rectsOverlap(rect, FOREST_EDGE.lampRest))).toBe(false);
  });

  it('keeps the lamp out of the stele and the pedestal reach, so one E cannot take the wrong thing', () => {
    expect(rectsOverlap(FOREST_EDGE.lampRest, FOREST_EDGE.stele)).toBe(false);
    expect(rectsOverlap(FOREST_EDGE.lampRest, FOREST_EDGE.s1)).toBe(false);
  });

  it('shows the lamp control from a walkable spot beside the lamp, not only from on top of it', () => {
    const lamp = FOREST_EDGE.lampRest;
    expect(LAMP_REST_REACH).toEqual({ x: lamp.x - 8, y: lamp.y - 8, width: lamp.width + 16, height: lamp.height + 16 });
    const beside = [...reachableFeet(spawnOf(YARD_CHECKPOINT_ID), walk(CLOSED))].map(key => {
      const [x, y] = key.split(',').map(Number);
      return { x, y };
    });
    const found = beside.some(c => pointInRect(c, LAMP_REST_REACH) && !pointInRect(c, lamp));
    expect(found).toBe(true);
  });
});

describe('forest edge layout JSON matches the runtime', () => {
  const json = LAYOUT_JSON;
  const interactables = json.interactables as Record<string, { rect: Rect; solid: boolean; exception?: unknown }>;

  it('matches the world, the walls, the doors, the thresholds and the exit', () => {
    expect(json.world).toEqual(FOREST_EDGE.world);
    expect(Object.values(json.walls)).toEqual(FOREST_EDGE.walls);
    const { _note: _foliageNote, ...foliage } = json.foliage;
    expect(Object.values(foliage)).toEqual(FOREST_EDGE.foliage);
    expect(json.doorA).toEqual(FOREST_EDGE.doorA);
    expect(json.thresholdA).toEqual(FOREST_EDGE.thresholdA);
    expect(json.gateB).toEqual(FOREST_EDGE.gateB);
    expect(json.thresholdB).toEqual(FOREST_EDGE.thresholdB);
    expect(json.exitZone).toEqual(FOREST_EDGE.exitZone);
  });

  it('matches the interactables, their solid flags and the lamp exception', () => {
    expect(interactables.stele.rect).toEqual(FOREST_EDGE.stele);
    expect(interactables.hinge.rect).toEqual(FOREST_EDGE.hinge);
    expect(interactables.s1.rect).toEqual(FOREST_EDGE.s1);
    expect(interactables.latchA.rect).toEqual(FOREST_EDGE.latchA);
    expect(interactables.s2.rect).toEqual(FOREST_EDGE.s2);
    expect(interactables.braceB.rect).toEqual(FOREST_EDGE.braceB);
    expect(interactables.lampRest.rect).toEqual(FOREST_EDGE.lampRest);
    expect((interactables.lampRest as { reach?: Rect }).reach).toEqual(LAMP_REST_REACH);
    for (const it of FOREST_EDGE_ITEMS) {
      expect(interactables[it.id], it.id).toBeDefined();
      expect(interactables[it.id].solid, it.id).toBe(it.reach.kind === 'block');
    }
    expect(interactables.lampRest.exception).toEqual(LAMP_REST_EXCEPTION);
  });

  it('matches the rooms, the checkpoints, the sprout, the light marks and the pulse marks', () => {
    expect(json.rooms).toEqual(FOREST_EDGE_ROOMS);
    expect(json.checkpoints).toEqual(FOREST_EDGE.checkpoints);
    expect(json.sprout.rect).toEqual(FOREST_EDGE.sprout);
    expect(json.lightMarks).toEqual(FOREST_EDGE_LIGHT_MARKS);
    expect(json.pulseMarks.map(({ id, x, y }) => ({ id, x, y }))).toEqual(FOREST_EDGE_PULSE_MARKS);
  });
});
