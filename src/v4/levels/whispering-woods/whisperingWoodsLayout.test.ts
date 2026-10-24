import { describe, it, expect } from 'vitest';
import { footRectAt } from '../../core/body';
import { pointInRect, rectsOverlap } from '../../core/geometry';
import type { Point, Rect } from '../../core/geometry';
import { initialLantern } from '../../core/lantern';
import { canSeeMark, groundPoint, isMarkReadable, lanternFootprints } from '../../core/light';
import type { LightMark } from '../../core/light';
import { auditReach, canReachItem, isFootWalkable, reachableFeet } from '../../core/reachAudit';
import type { AuditInput } from '../../core/reachAudit';
import { HUD_BANDS } from '../../../ui/hudLayout';
import { defaultWhisperingWoodsState, deriveWhisperingWoods, whisperingWoodsBlockers, whisperingWoodsSolids } from './whisperingWoodsLogic';
import type { WhisperingWoodsState, WhisperingWoodsView } from './whisperingWoodsLogic';
import {
  START_CHECKPOINT_ID,
  SOUTH_CHECKPOINT_ID,
  WHISPERING_WOODS,
  WHISPERING_WOODS_ITEMS,
  WHISPERING_WOODS_LIGHT_MARKS,
  WHISPERING_WOODS_PULSE_MARKS,
} from './whisperingWoodsLayout';

/** LanternSystem.PULSE_MAX_RADIUS, repeated here because the Phaser system cannot load in a node test. */
const PULSE_MAX_RADIUS = 195;

/** The gate closed: the grove as a new game starts. */
const CLOSED: WhisperingWoodsView = deriveWhisperingWoods(defaultWhisperingWoodsState());

/** Every ring faces its mouth: the gate is open. */
const GOAL_STATE: WhisperingWoodsState = { x: 2, y: 1, z: 2, gateCatch: true };
const OPEN: WhisperingWoodsView = deriveWhisperingWoods(GOAL_STATE);

function spawnOf(id: string): Point {
  const checkpoint = WHISPERING_WOODS.checkpoints.find(c => c.id === id);
  if (!checkpoint) throw new Error(`no checkpoint ${id}`);
  return checkpoint.spawn;
}

function auditInput(v: WhisperingWoodsView): AuditInput {
  return { world: WHISPERING_WOODS.world, solids: whisperingWoodsSolids(v), hudBands: HUD_BANDS, items: WHISPERING_WOODS_ITEMS };
}

function walkInput(v: WhisperingWoodsView) {
  return { world: WHISPERING_WOODS.world, solids: whisperingWoodsSolids(v) };
}

describe('whispering woods reach audit', () => {
  it('is clean with the gate closed', () => {
    expect(auditReach(auditInput(CLOSED))).toEqual([]);
  });

  it('is clean with the gate open', () => {
    expect(auditReach(auditInput(OPEN))).toEqual([]);
  });
});

describe('whispering woods reachability from the spawns', () => {
  it('reaches every stele and crank from the start spawn in both gate states', () => {
    for (const v of [CLOSED, OPEN]) {
      for (const item of WHISPERING_WOODS_ITEMS) {
        expect(canReachItem(spawnOf(START_CHECKPOINT_ID), item, walkInput(v))).toBe(true);
      }
    }
  });

  it('reaches every stele and crank from the south checkpoint in both gate states', () => {
    for (const v of [CLOSED, OPEN]) {
      for (const item of WHISPERING_WOODS_ITEMS) {
        expect(canReachItem(spawnOf(SOUTH_CHECKPOINT_ID), item, walkInput(v))).toBe(true);
      }
    }
  });

  it('does not walk through the closed gate, but does after it opens', () => {
    const reachEast = (v: WhisperingWoodsView) => reachableFeet(spawnOf(START_CHECKPOINT_ID), walkInput(v), 2);
    const east = (keys: Set<string>) => [...keys].some(k => Number(k.split(',')[0]) >= WHISPERING_WOODS.gate.x);
    expect(east(reachEast(CLOSED))).toBe(false);
    expect(east(reachEast(OPEN))).toBe(true);
  });
});

describe('whispering woods geometry', () => {
  it('keeps both checkpoints on walkable feet inside their zones, in both gate states', () => {
    for (const v of [CLOSED, OPEN]) {
      const solids = whisperingWoodsSolids(v);
      for (const c of WHISPERING_WOODS.checkpoints) {
        expect(pointInRect(c.spawn, c.zone)).toBe(true);
        expect(isFootWalkable(footRectAt(c.spawn), { world: WHISPERING_WOODS.world, solids })).toBe(true);
      }
    }
  });

  it('keeps every stele and crank inside the walkable grove and off the HUD bands', () => {
    const pieces: Rect[] = [
      ...Object.values(WHISPERING_WOODS.steles),
      ...Object.values(WHISPERING_WOODS.cranks),
    ];
    for (const r of pieces) {
      expect(rectsOverlap(r, WHISPERING_WOODS.world)).toBe(true);
      expect(HUD_BANDS.some(band => rectsOverlap(r, band))).toBe(false);
    }
  });

  it('closes the gate across the east wall gap and puts the exit zone beyond it', () => {
    const { gate, exitZone, walls } = WHISPERING_WOODS;
    expect(gate.y).toBe(190);
    expect(gate.y + gate.height).toBe(230);
    expect(walls.some(w => rectsOverlap(w, gate))).toBe(false);
    expect(exitZone.x).toBeGreaterThanOrEqual(gate.x + gate.width);
  });

  it('keeps the light marks on the floor, clear of every solid', () => {
    const solids = whisperingWoodsSolids(CLOSED);
    for (const mark of WHISPERING_WOODS_LIGHT_MARKS) {
      expect(solids.some(s => rectsOverlap(s, mark.rect))).toBe(false);
      expect(HUD_BANDS.some(band => rectsOverlap(mark.rect, band))).toBe(false);
    }
  });
});

/**
 * True when an 8×8 block of standing positions (on the 2px grid, reachable from the start) reads a dark mark with the
 * handheld lantern in hand and lit, and sees it. Written here rather than through lightAudit.hasAimArea, whose
 * candidate ring is capped at lantern radius + 8 and so cannot hold a dark mark's 44–64px band.
 */
function darkMarkStandingBlock(mark: LightMark, v: WhisperingWoodsView): boolean {
  const blockers = whisperingWoodsBlockers(v);
  const reach = reachableFeet(spawnOf(START_CHECKPOINT_ID), { world: WHISPERING_WOODS.world, solids: whisperingWoodsSolids(v) }, 2);
  const good = new Set<string>();
  for (const key of reach) {
    const [x, y] = key.split(',').map(Number);
    const ground = groundPoint({ x, y });
    const footprints = lanternFootprints(initialLantern(), ground, () => null);
    if (isMarkReadable(mark, footprints, blockers) && canSeeMark(ground, mark, blockers, [])) good.add(key);
  }
  const offsets = [0, 2, 4, 6, 8];
  for (const key of good) {
    const [x, y] = key.split(',').map(Number);
    if (offsets.every(dy => offsets.every(dx => good.has(`${x + dx},${y + dy}`)))) return true;
  }
  return false;
}

describe('whispering woods light marks', () => {
  it('gives every mouth an 8px standing block where the lantern misses it and the mouth is seen', () => {
    for (const v of [CLOSED, OPEN]) {
      for (const mark of WHISPERING_WOODS_LIGHT_MARKS) {
        expect(darkMarkStandingBlock(mark, v), mark.id).toBe(true);
      }
    }
  });
});

describe('whispering woods Pulse marks', () => {
  it('places every Pulse mark within the Pulse radius of some spot reachable from the start spawn', () => {
    const reach = reachableFeet(spawnOf(START_CHECKPOINT_ID), walkInput(CLOSED), 2);
    for (const mark of WHISPERING_WOODS_PULSE_MARKS) {
      const near = [...reach].some(key => {
        const [x, y] = key.split(',').map(Number);
        return Math.hypot(mark.x - x, mark.y - y) <= PULSE_MAX_RADIUS;
      });
      expect(near, mark.id).toBe(true);
    }
  });
});
