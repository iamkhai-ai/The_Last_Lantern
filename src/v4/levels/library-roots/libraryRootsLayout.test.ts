import { describe, it, expect } from 'vitest';
import { footRectAt } from '../../core/body';
import { pointInRect, rectsOverlap } from '../../core/geometry';
import type { Rect } from '../../core/geometry';
import { canSeeMark, groundPoint, isMarkReadable, lanternFootprints } from '../../core/light';
import type { LightMark } from '../../core/light';
import { hasAimArea } from '../../core/lightAudit';
import type { AimInput } from '../../core/lightAudit';
import { initialLantern } from '../../core/lantern';
import { auditReach, canReachItem, reachableFeet } from '../../core/reachAudit';
import type { AuditInput } from '../../core/reachAudit';
import { HUD_BANDS } from '../../../ui/hudLayout';
import {
  BACK_CHECKPOINT_ID,
  LIBRARY,
  LIBRARY_ITEMS,
  LIBRARY_PRACTICE_MARKS,
  LIBRARY_ROOMS,
  RACK_IDS,
  SOCKET_IDS,
  WELL_CHECKPOINT_ID,
  tabletRect,
} from './libraryRootsLayout';
import { librarySolids, libraryBlockers } from './libraryRootsLogic';

const START = LIBRARY.checkpoints.find((c) => c.id === WELL_CHECKPOINT_ID)!.spawn;
const BACK = LIBRARY.checkpoints.find((c) => c.id === BACK_CHECKPOINT_ID)!.spawn;

function auditInput(open: boolean): AuditInput {
  return { world: LIBRARY.world, solids: librarySolids(open), hudBands: HUD_BANDS, items: LIBRARY_ITEMS };
}

function walkInput(open: boolean) {
  return { world: LIBRARY.world, solids: librarySolids(open) };
}

function item(id: string) {
  const found = LIBRARY_ITEMS.find((i) => i.id === id);
  if (!found) throw new Error(`no item ${id}`);
  return found;
}

/** Lit mark for a holder: the tablet's rect on it. */
function litAt(rect: Rect, id: string): LightMark {
  return { id, kind: 'lit', rect: tabletRect(rect) };
}

function darkAt(rect: Rect, id: string): LightMark {
  return { id, kind: 'dark', rect: tabletRect(rect) };
}

/** Holders: every rack hook and socket, each a place a tablet can rest. */
const HOLDERS: { id: string; rect: Rect }[] = [
  ...LIBRARY.rack.map((rect, i) => ({ id: RACK_IDS[i], rect })),
  ...LIBRARY.sockets.map((rect, i) => ({ id: SOCKET_IDS[i], rect })),
];

/** Ground points of every walkable actor position reachable from `start`, with the door in the given state. */
function groundsFrom(start: { x: number; y: number }, open: boolean): { x: number; y: number }[] {
  return [...reachableFeet(start, walkInput(open))].map((key) => {
    const [x, y] = key.split(',').map(Number);
    return groundPoint({ x, y });
  });
}

describe('library reach audit', () => {
  it('is clean with the door closed (the new game)', () => {
    expect(auditReach(auditInput(false))).toEqual([]);
  });

  it('is clean with the door open (after the ring is correct)', () => {
    expect(auditReach(auditInput(true))).toEqual([]);
  });
});

describe('library reachability', () => {
  it('reaches the front-room items from the well checkpoint while the door is closed', () => {
    const solids = librarySolids(false);
    for (const id of [...RACK_IDS, ...SOCKET_IDS, 'well', 'desk']) {
      expect(canReachItem(START, item(id), { world: LIBRARY.world, solids }), id).toBe(true);
    }
  });

  it('does not reach the model room while the door is closed', () => {
    const solids = librarySolids(false);
    for (const id of ['valve0', 'wheel', 'lever', 'crystal']) {
      expect(canReachItem(START, item(id), { world: LIBRARY.world, solids }), id).toBe(false);
    }
  });

  it('reaches every model-room item from the well checkpoint once the door is open', () => {
    const solids = librarySolids(true);
    for (const id of ['valve0', 'valve1', 'valve2', 'valve3', 'wheel', 'lever', 'crystal']) {
      expect(canReachItem(START, item(id), { world: LIBRARY.world, solids }), id).toBe(true);
    }
  });

  it('reaches the back checkpoint and the exit zone once the door is open', () => {
    const solids = librarySolids(true);
    const walkable = reachableFeet(START, { world: LIBRARY.world, solids });
    expect(walkable.has(`${BACK.x},${BACK.y}`)).toBe(true);
    const exitReached = [...walkable].some((key) => {
      const [x, y] = key.split(',').map(Number);
      return rectsOverlap(footRectAt({ x, y }), LIBRARY.exitZone);
    });
    expect(exitReached).toBe(true);
  });
});

describe('library geometry', () => {
  it('keeps both checkpoints walkable, inside their zones, and outside the door threshold', () => {
    for (const open of [false, true]) {
      const solids = librarySolids(open);
      for (const c of LIBRARY.checkpoints) {
        expect(pointInRect(c.spawn, c.zone)).toBe(true);
        expect(isFootWalkable(c.spawn, solids)).toBe(true);
        expect(rectsOverlap(footRectAt(c.spawn), LIBRARY.door)).toBe(false);
      }
    }
  });

  it('keeps the door gap where the leaf closes it, between two walls', () => {
    expect(LIBRARY.door.y).toBe(200);
    expect(LIBRARY.door.y + LIBRARY.door.height).toBe(240);
    expect(LIBRARY.walls.some((wall) => rectsOverlap(wall, LIBRARY.door))).toBe(false);
  });

  it('puts the exit zone inside the model room, away from every solid', () => {
    const solids = librarySolids(true);
    expect(LIBRARY.exitZone.x).toBeGreaterThanOrEqual(352);
    expect(solids.some((solid) => rectsOverlap(solid, LIBRARY.exitZone))).toBe(false);
  });

  it('blocks light only with walls and, while closed, the door leaf', () => {
    expect(libraryBlockers(true)).toEqual([...LIBRARY.walls]);
    expect(libraryBlockers(false)).toContainEqual(LIBRARY.door);
  });
});

describe('library light: lit marks at each holder', () => {
  // Every holder can carry a tablet, so each one needs an aim area for its lit layer from the start.
  for (const holder of HOLDERS) {
    it(`lets Nhinh read the lit layer on ${holder.id} from the well room`, () => {
      const mark = litAt(holder.rect, `${holder.id}:lit`);
      const input: AimInput = {
        world: LIBRARY.world,
        solids: librarySolids(false),
        blockers: libraryBlockers(false),
        start: START,
      };
      expect(hasAimArea({ hit: [mark.rect], avoid: [], seen: mark, rooms: LIBRARY_ROOMS }, input)).toBe(true);
    });
  }
});

describe('library light: dark marks at each holder', () => {
  // A dark layer reads only outside every footprint, so it needs a standing spot that is out of the lantern's
  // circle, within the seen radius, in the same room, and not behind the wall.
  for (const holder of HOLDERS) {
    it(`lets Nhinh read the dark layer on ${holder.id} from the well room`, () => {
      const mark = darkAt(holder.rect, `${holder.id}:dark`);
      const blockers = libraryBlockers(false);
      const readable = groundsFrom(START, false).some((ground) => {
        const lantern = lanternFootprints(initialLantern(), ground, () => null);
        return isMarkReadable(mark, lantern, blockers) && canSeeMark(ground, mark, blockers, LIBRARY_ROOMS);
      });
      expect(readable).toBe(true);
    });
  }
});

describe('library light: practice sheet', () => {
  it('lets Nhinh read both practice layers from the well room', () => {
    const blockers = libraryBlockers(false);
    for (const mark of LIBRARY_PRACTICE_MARKS) {
      const found = groundsFrom(START, false).some((ground) => {
        const lantern = lanternFootprints(initialLantern(), ground, () => null);
        return isMarkReadable(mark, lantern, blockers) && canSeeMark(ground, mark, blockers, LIBRARY_ROOMS);
      });
      expect(found, mark.id).toBe(true);
    }
  });
});

function isFootWalkable(center: { x: number; y: number }, solids: readonly Rect[]): boolean {
  const foot = footRectAt(center);
  const inside = foot.x >= LIBRARY.world.x && foot.y >= LIBRARY.world.y
    && foot.x + foot.width <= LIBRARY.world.x + LIBRARY.world.width
    && foot.y + foot.height <= LIBRARY.world.y + LIBRARY.world.height;
  return inside && !solids.some((solid) => rectsOverlap(foot, solid));
}
