import { describe, it, expect } from 'vitest';
import { footRectAt, FOOT_BODY } from '../../core/body';
import { pointInRect, rectsOverlap } from '../../core/geometry';
import type { Point, Rect } from '../../core/geometry';
import { placeLantern, initialLantern } from '../../core/lantern';
import type { LanternState } from '../../core/lantern';
import { groundPoint, HALO_RADIUS, isMarkReadable, canSeeMark, segmentBlocked } from '../../core/light';
import type { Footprint } from '../../core/light';
import { auditReach, canReachItem, reachableFeet, isFootWalkable } from '../../core/reachAudit';
import type { AuditInput } from '../../core/reachAudit';
import { HUD_BANDS } from '../../../ui/hudLayout';
import {
  DIAGRAM_ID,
  ISLAND_CHECKPOINT_ID,
  MOONLIT_CREEK,
  MOONLIT_ITEMS,
  MOONLIT_LIGHT_MARKS,
  MOONLIT_PULSE_MARKS,
  MOONLIT_ROOMS,
  PEDESTAL_S_ID,
  PIPE_BEN_RAY_ID,
  PIPE_RE_RAY_ID,
  START_CHECKPOINT_ID,
  S_CENTRE,
  G1_CENTRE,
  G2_CENTRE,
  RAY_WIDTH,
} from './moonlitCreekLayout';
import {
  INITIAL_CROSSINGS,
  deriveMoonlit,
  defaultMoonlitState,
  moonlitBlockers,
  moonlitSolids,
  raySegmentStrip,
  raySegments,
  rayFootprints,
} from './moonlitCreekLogic';
import type { CrossingLive, MoonlitState } from './moonlitCreekLogic';

const LANTERN_HAND: LanternState = initialLantern();
const LANTERN_ON_S: LanternState = placeLantern(initialLantern(), PEDESTAL_S_ID)!;
const LANTERN_OFF_S: LanternState = { location: { at: 'pedestal', pedestalId: PEDESTAL_S_ID }, on: false };

const NONE: CrossingLive = INITIAL_CROSSINGS;
const BOTH: CrossingLive = { a: true, b: true };
const A_ONLY: CrossingLive = { a: true, b: false };

/** Every rect of the level that a foot can be blocked by, in a given crossing state. */
function solidsOf(c: CrossingLive): Rect[] {
  return moonlitSolids(c);
}

function auditInput(c: CrossingLive): AuditInput {
  return { world: MOONLIT_CREEK.world, solids: solidsOf(c), hudBands: HUD_BANDS, items: MOONLIT_ITEMS };
}

function spawnOf(id: string): Point {
  const found = MOONLIT_CREEK.checkpoints.find(c => c.id === id);
  if (!found) throw new Error(`no checkpoint ${id}`);
  return found.spawn;
}

function reachedItems(start: Point, c: CrossingLive): string[] {
  const input = { world: MOONLIT_CREEK.world, solids: solidsOf(c) };
  return MOONLIT_ITEMS.filter(item => canReachItem(start, item, input, 2)).map(item => item.id);
}

/** The lantern's state with the mirror network's view for a given route set. */
function stateWith(p: Partial<MoonlitState>): MoonlitState {
  return { ...defaultMoonlitState(), ...p };
}

describe('moonlit creek reach audit', () => {
  it('is clean with both bridges closed', () => {
    expect(auditReach(auditInput(NONE))).toEqual([]);
  });

  it('is clean with both bridges open', () => {
    expect(auditReach(auditInput(BOTH))).toEqual([]);
  });
});

describe('moonlit creek reachability from the spawns', () => {
  it('reaches only the West pieces from the West spawn while both bridges are closed', () => {
    const got = reachedItems(spawnOf(START_CHECKPOINT_ID), NONE);
    expect(got.sort()).toEqual(['restoreA', 'S'].sort());
  });

  it('reaches the island drive cranks from the West spawn once bridge A is open', () => {
    const got = reachedItems(spawnOf(START_CHECKPOINT_ID), A_ONLY);
    expect(got).toEqual(expect.arrayContaining(['S', 'restoreA', 'crankG1', 'crankG2']));
    expect(got).not.toContain('latchA');
    expect(got).not.toContain('testT');
  });

  it('reaches every interactable from the West spawn with both bridges open', () => {
    const got = reachedItems(spawnOf(START_CHECKPOINT_ID), BOTH);
    expect(got.sort()).toEqual(MOONLIT_ITEMS.map(i => i.id).sort());
  });

  it('reaches the exit steps with both bridges open', () => {
    const input = { world: MOONLIT_CREEK.world, solids: solidsOf(BOTH) };
    const feet = reachableFeet(spawnOf(START_CHECKPOINT_ID), input, 2);
    const exit = MOONLIT_CREEK.exitZone;
    const reached = [...feet].some(key => {
      const [x, y] = key.split(',').map(Number);
      return rectsOverlap(footRectAt({ x, y }), exit);
    });
    expect(reached).toBe(true);
  });

  it('keeps the island checkpoint reachable from the West spawn once bridge A is open', () => {
    const input = { world: MOONLIT_CREEK.world, solids: solidsOf(A_ONLY) };
    const feet = reachableFeet(spawnOf(START_CHECKPOINT_ID), input, 2);
    expect(feet.has(`${spawnOf(ISLAND_CHECKPOINT_ID).x},${spawnOf(ISLAND_CHECKPOINT_ID).y}`)).toBe(true);
  });
});

describe('moonlit creek checkpoints', () => {
  it('keeps every spawn on walkable feet inside its zone, in every crossing state', () => {
    for (const c of [NONE, A_ONLY, BOTH]) {
      const solids = solidsOf(c);
      for (const cp of MOONLIT_CREEK.checkpoints) {
        expect(pointInRect(cp.spawn, cp.zone)).toBe(true);
        expect(isFootWalkable(footRectAt(cp.spawn), { world: MOONLIT_CREEK.world, solids })).toBe(true);
      }
    }
  });

  it('keeps every checkpoint zone off both decks, so no spawn is inside a bridge threshold', () => {
    for (const cp of MOONLIT_CREEK.checkpoints) {
      expect(rectsOverlap(cp.zone, MOONLIT_CREEK.deckA)).toBe(false);
      expect(rectsOverlap(cp.zone, MOONLIT_CREEK.deckB)).toBe(false);
    }
  });
});

describe('moonlit creek mirror network geometry', () => {
  /** Every segment the network can draw, in every route set. */
  function everySegment() {
    const out: { from: Point; to: Point }[] = [];
    for (const g1 of ['A', 'G2'] as const) {
      for (const g2 of ['B', 'T'] as const) {
        const view = deriveMoonlit(stateWith({ g1, g2 }), LANTERN_ON_S);
        out.push(...raySegments(stateWith({ g1, g2 }), view));
      }
    }
    return out;
  }

  it('draws no ray without the lantern on S and lit', () => {
    expect(raySegments(stateWith({}), deriveMoonlit(stateWith({}), LANTERN_HAND))).toEqual([]);
    expect(raySegments(stateWith({}), deriveMoonlit(stateWith({}), LANTERN_OFF_S))).toEqual([]);
  });

  it('never lets a ray segment cross a wall', () => {
    const walls = moonlitBlockers();
    for (const seg of everySegment()) {
      expect(segmentBlocked(seg.from, seg.to, walls)).toBe(false);
    }
  });

  it('makes each strip 6px wide, centred on its segment', () => {
    for (const seg of everySegment()) {
      const strip = raySegmentStrip(seg);
      expect(strip).toHaveLength(4);
      const width = Math.hypot(strip[0].x - strip[3].x, strip[0].y - strip[3].y);
      expect(width).toBeCloseTo(RAY_WIDTH, 6);
      const mid = { x: (strip[0].x + strip[2].x) / 2, y: (strip[0].y + strip[2].y) / 2 };
      expect(mid.x).toBeCloseTo((seg.from.x + seg.to.x) / 2, 6);
      expect(mid.y).toBeCloseTo((seg.from.y + seg.to.y) / 2, 6);
    }
  });

  it('ends bridge A, bridge B and T on their own eyes', () => {
    const m = MOONLIT_CREEK;
    expect(m.eyeA.x).toBe(m.deckA.x);
    expect(m.eyeA.y).toBeGreaterThanOrEqual(m.deckA.y);
    expect(m.eyeA.y).toBeLessThanOrEqual(m.deckA.y + m.deckA.height);
    expect(m.eyeB.x).toBe(m.deckB.x);
    expect(m.eyeB.y).toBeGreaterThanOrEqual(m.deckB.y);
    expect(m.eyeB.y).toBeLessThanOrEqual(m.deckB.y + m.deckB.height);
    expect(m.eyeT.x).toBe(m.testT.x);
    expect(m.eyeT.y).toBeGreaterThanOrEqual(m.testT.y);
    expect(m.eyeT.y).toBeLessThanOrEqual(m.testT.y + m.testT.height);
  });

  it('draws the rays along the active route only', () => {
    const onA = raySegments(stateWith({ g1: 'A' }), deriveMoonlit(stateWith({ g1: 'A' }), LANTERN_ON_S));
    expect(onA).toHaveLength(2);
    const onT = raySegments(stateWith({ g1: 'G2', g2: 'T' }), deriveMoonlit(stateWith({ g1: 'G2', g2: 'T' }), LANTERN_ON_S));
    expect(onT).toHaveLength(3);
    expect(onT[2].to).toEqual(MOONLIT_CREEK.eyeT);
  });

  it('returns area footprints with a null origin, so they are never clipped', () => {
    const fp: Footprint[] = rayFootprints(stateWith({ g1: 'G2', g2: 'B' }), deriveMoonlit(stateWith({ g1: 'G2', g2: 'B' }), LANTERN_ON_S));
    expect(fp.length).toBe(3);
    for (const f of fp) {
      expect(f.kind).toBe('area');
      if (f.kind === 'area') expect(f.origin).toBeNull();
    }
  });

  it('keeps the mirrors and S apart from the bridge decks they feed', () => {
    expect(S_CENTRE.x).toBeLessThan(MOONLIT_CREEK.deckA.x);
    expect(G1_CENTRE.x).toBeLessThan(MOONLIT_CREEK.deckA.x);
    expect(G2_CENTRE.x).toBeLessThan(MOONLIT_CREEK.deckB.x);
  });
});

describe('moonlit creek pedestal S reach', () => {
  it('keeps S out of E reach from every foot position on bridge A\'s deck', () => {
    const S = MOONLIT_CREEK.pedestalS;
    const deck = MOONLIT_CREEK.deckA;
    let checked = 0;
    for (let fy = deck.y - FOOT_BODY.height; fy <= deck.y + deck.height; fy++) {
      for (let fx = deck.x - FOOT_BODY.width; fx <= deck.x + deck.width; fx++) {
        const foot = { x: fx, y: fy, width: FOOT_BODY.width, height: FOOT_BODY.height };
        if (!rectsOverlap(foot, deck)) continue;
        checked++;
        const gap = Math.hypot(
          Math.max(foot.x - (S.x + S.width), S.x - (foot.x + foot.width), 0),
          Math.max(foot.y - (S.y + S.height), S.y - (foot.y + foot.height), 0),
        );
        expect(gap).toBeGreaterThan(8);
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('keeps S out of E reach from every foot position on bridge B\'s deck', () => {
    const S = MOONLIT_CREEK.pedestalS;
    const deck = MOONLIT_CREEK.deckB;
    for (let fy = deck.y - FOOT_BODY.height; fy <= deck.y + deck.height; fy++) {
      for (let fx = deck.x - FOOT_BODY.width; fx <= deck.x + deck.width; fx++) {
        const foot = { x: fx, y: fy, width: FOOT_BODY.width, height: FOOT_BODY.height };
        if (!rectsOverlap(foot, deck)) continue;
        const gap = Math.hypot(
          Math.max(foot.x - (S.x + S.width), S.x - (foot.x + foot.width), 0),
          Math.max(foot.y - (S.y + S.height), S.y - (foot.y + foot.height), 0),
        );
        expect(gap).toBeGreaterThan(8);
      }
    }
  });
});

describe('moonlit creek light marks', () => {
  const blockers = moonlitBlockers();
  const ground = (p: Point) => groundPoint(p);

  it('keeps every dark mark clear of the pedestal halo', () => {
    for (const mark of MOONLIT_LIGHT_MARKS) {
      const r = mark.rect;
      const nearestX = Math.max(r.x, Math.min(S_CENTRE.x, r.x + r.width));
      const nearestY = Math.max(r.y, Math.min(S_CENTRE.y, r.y + r.height));
      expect(Math.hypot(nearestX - S_CENTRE.x, nearestY - S_CENTRE.y)).toBeGreaterThan(HALO_RADIUS);
    }
  });

  it('gives every dark mark a standing spot in the full-open state that reads it with no light', () => {
    const feet = reachableFeet(spawnOf(START_CHECKPOINT_ID), { world: MOONLIT_CREEK.world, solids: solidsOf(BOTH) }, 2);
    for (const mark of MOONLIT_LIGHT_MARKS) {
      let found = false;
      for (const key of feet) {
        const [x, y] = key.split(',').map(Number);
        if (canSeeMark(ground({ x, y }), mark, blockers, MOONLIT_ROOMS) && isMarkReadable(mark, [], blockers)) {
          found = true;
          break;
        }
      }
      expect(found, `mark ${mark.id} has no standing spot`).toBe(true);
    }
  });

  it('hides the marks under a ray while the lantern feeds the network', () => {
    const rays = rayFootprints(stateWith({ g1: 'A' }), deriveMoonlit(stateWith({ g1: 'A' }), LANTERN_ON_S));
    const ben = MOONLIT_LIGHT_MARKS.find(m => m.id === PIPE_BEN_RAY_ID)!;
    expect(isMarkReadable(ben, rays, blockers)).toBe(false);
    expect(isMarkReadable(ben, [], blockers)).toBe(true);

    const raysG2 = rayFootprints(stateWith({ g1: 'G2', g2: 'T' }), deriveMoonlit(stateWith({ g1: 'G2', g2: 'T' }), LANTERN_ON_S));
    const re = MOONLIT_LIGHT_MARKS.find(m => m.id === PIPE_RE_RAY_ID)!;
    expect(isMarkReadable(re, raysG2, blockers)).toBe(false);
    expect(isMarkReadable(re, [], blockers)).toBe(true);
  });

  it('places the diagram point on the West bank, reachable from the spawn', () => {
    const d = MOONLIT_PULSE_MARKS.find(p => p.id === DIAGRAM_ID);
    expect(d).toBeDefined();
    expect(d!.x).toBeLessThan(208);
    const feet = reachableFeet(spawnOf(START_CHECKPOINT_ID), { world: MOONLIT_CREEK.world, solids: solidsOf(NONE) }, 2);
    let near = false;
    for (const key of feet) {
      const [x, y] = key.split(',').map(Number);
      const g = groundPoint({ x, y });
      if (Math.hypot(g.x - d!.x, g.y - d!.y) <= 40) near = true;
    }
    expect(near).toBe(true);
  });
});

describe('moonlit creek geometry sanity', () => {
  it('keeps the two decks on the channels, not on the banks', () => {
    expect(MOONLIT_CREEK.deckA.x).toBe(MOONLIT_CREEK.chasmANorth.x);
    expect(MOONLIT_CREEK.deckB.x).toBe(MOONLIT_CREEK.chasmBNorth.x);
  });

  it('keeps every interactable out of the HUD bands', () => {
    for (const item of MOONLIT_ITEMS) {
      for (const band of HUD_BANDS) expect(rectsOverlap(item.reach.rect, band)).toBe(false);
    }
  });

  it('keeps the drive cranks and the mirror apart by more than 16px', () => {
    const rects: Rect[] = [MOONLIT_CREEK.crankG1, MOONLIT_CREEK.crankG2, MOONLIT_CREEK.mirrorG2];
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i];
        const b = rects[j];
        const dx = Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width), 0);
        const dy = Math.max(a.y - (b.y + b.height), b.y - (a.y + a.height), 0);
        expect(Math.hypot(dx, dy)).toBeGreaterThan(16);
      }
    }
  });
});
