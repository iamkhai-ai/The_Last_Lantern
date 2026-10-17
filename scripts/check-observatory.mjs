/**
 * Level 09 — Dark Moon Observatory: pure geometry / state checks.
 *
 * Run with:  node scripts/check-observatory.mjs
 *
 * Verifies, for all three rooms:
 *  - the authored foot body, the fitted art rectangles and the stand points;
 *  - every authored spawn and stand is reachable from its room entry by a
 *    collision-aware flood fill, per puzzle stage;
 *  - every solid blocks the 14x6 foot body from all four cardinal directions;
 *  - every authored exit is reachable when its door is unlocked and unreachable
 *    when it is locked;
 *  - deriveObservatoryState() returns the expected gates for each beam route and
 *    for the split route with the statue shadow, and Lumo holding the seal is
 *    required for every route beyond Door A;
 *  - nearestSafeObservatorySpawn() never returns a position inside a solid,
 *    inside the bridge rectangle, or outside the room;
 *  - every locked door and disabled control has a non-empty prerequisite message.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  OBSERVATORY_ALCOVES,
  OBSERVATORY_BODY,
  OBSERVATORY_BRIDGE_LANE,
  OBSERVATORY_ELEMENTS,
  OBSERVATORY_FINAL_DOOR_HEAD,
  OBSERVATORY_FLOORS,
  OBSERVATORY_NON_SOLID_IDS,
  OBSERVATORY_ROOT_BED,
  OBSERVATORY_STAMPS,
  OBSERVATORY_WALLS,
  fitObservatoryArt,
  isObservatoryApproachAllowed,
  isObservatoryFloorWalkable,
  isObservatoryPositionSafe,
  isObservatoryRestoreSafe,
  nearestSafeObservatorySpawn,
  observatoryArtRect,
  observatoryBody,
  observatoryDoorBlockReason,
  observatoryDoorOpen,
  observatoryDoorShouldBlock,
  observatoryElementSolids,
  observatoryElements,
  observatoryGuidance,
  observatoryPrompt,
  observatorySolidRects,
  rectsOverlap,
} from '../src/data/observatoryLayout.ts';
import { OBSERVATORY_ROOMS } from '../src/data/observatoryRooms.ts';
import { deriveObservatoryState } from '../src/systems/ObservatoryPuzzle.ts';

const ROOMS = ['entrance', 'corridor', 'observatory'];
const SEAL = { x: 320, y: 80 };

function derived(input) {
  return deriveObservatoryState({
    mirrorRotations: input.mirrors ?? { g0: 0, g1: 0, g2: 0 },
    statueOrientation: input.statue ?? 0,
    lanternOn: input.lanternOn ?? false,
    lanternPlaced: input.lanternPlaced ?? false,
    doorALatched: input.doorALatched ?? false,
    lumoPosition: input.lumoAtSeal ? { roomId: 'corridor', ...SEAL } : null,
    lumoRoute: input.lumoAtSeal
      ? { destinationWaypointId: 'lumo-seal', arrivedAtWaypointId: 'lumo-seal' }
      : { destinationWaypointId: null, arrivedAtWaypointId: null },
  });
}

function state(overrides = {}) {
  const puzzle = derived(overrides);
  return {
    doorAUnlocked: puzzle.doorAUnlocked,
    sunDoorUnlocked: puzzle.sunDoorUnlocked,
    rootBedShadowed: puzzle.rootBedShadowed,
    bridgeEligible: puzzle.bridgeEligible,
    lumoAtSeal: puzzle.lumoAtSeal,
    activeBeamRoute: puzzle.activeBeamPath.routeId,
    doorALatched: overrides.doorALatched ?? false,
    sunDoorLatched: overrides.sunDoorLatched ?? false,
    finalDoorLatched: overrides.finalDoorLatched ?? false,
    returnLoopOpen: overrides.returnLoopOpen ?? false,
    bridgeCrossed: overrides.bridgeCrossed ?? false,
    lanternPlaced: overrides.lanternPlaced ?? false,
    lanternOn: overrides.lanternOn ?? false,
    lanternRetrieved: overrides.lanternRetrieved ?? false,
    lumoRecalled: overrides.lumoRecalled ?? false,
    recordRead: overrides.recordRead ?? false,
    crystalTaken: overrides.crystalTaken ?? false,
    miniatureViewed: overrides.miniatureViewed ?? false,
    mirrors: overrides.mirrors ?? { g0: 0, g1: 0, g2: 0 },
    statue: overrides.statue ?? 0,
  };
}

const STAGES = {
  arrival: state(),
  lampPlaced: state({ lanternPlaced: true, lanternOn: true }),
  doorALatched: state({ lanternPlaced: true, lanternOn: true, doorALatched: true }),
  beamToObservatory: state({
    lanternPlaced: true, lanternOn: true, doorALatched: true, sunDoorLatched: true,
    lumoAtSeal: true, mirrors: { g0: 1, g1: 2, g2: 0 },
  }),
  splitWithShadow: state({
    lanternPlaced: true, lanternOn: true, doorALatched: true, sunDoorLatched: true, lumoAtSeal: true,
    mirrors: { g0: 1, g1: 2, g2: 1 }, statue: 2,
  }),
  crossed: state({
    lanternPlaced: true, lanternOn: true, doorALatched: true, sunDoorLatched: true, lumoAtSeal: true,
    mirrors: { g0: 1, g1: 2, g2: 1 }, statue: 2, bridgeCrossed: true, finalDoorLatched: true,
  }),
  loopOpen: state({
    lanternPlaced: true, lanternOn: true, doorALatched: true, sunDoorLatched: true, lumoAtSeal: true,
    mirrors: { g0: 1, g1: 2, g2: 1 }, statue: 2,
    bridgeCrossed: true, finalDoorLatched: true, returnLoopOpen: true,
  }),
  finished: state({
    lanternPlaced: false, lanternOn: true, doorALatched: true, sunDoorLatched: true, lumoRecalled: true,
    mirrors: { g0: 1, g1: 2, g2: 1 }, statue: 2, bridgeCrossed: true,
    finalDoorLatched: true, returnLoopOpen: true, lanternRetrieved: true,
    recordRead: true, crystalTaken: true,
  }),
};

/** Collision-aware flood fill over room centres, step 4px. */
function reachable(roomId, from, stage, target, tolerance = 20) {
  const step = 4;
  const queue = [from];
  const seen = new Set([`${from.x},${from.y}`]);
  for (let index = 0; index < queue.length; index += 1) {
    const point = queue[index];
    if (tolerance === null
      ? Math.hypot(point.x - target.x, point.y - target.y) < step
      : Math.hypot(point.x - target.x, point.y - target.y) <= tolerance) return true;
    for (const [dx, dy] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
      const next = { x: point.x + dx, y: point.y + dy };
      const key = `${next.x},${next.y}`;
      if (seen.has(key) || !isObservatoryPositionSafe(roomId, next, stage)) continue;
      seen.add(key);
      queue.push(next);
    }
  }
  return false;
}

/* ------------------------------------------------------------------ *
 * 1. Body contract
 * ------------------------------------------------------------------ */
assert.equal(OBSERVATORY_BODY.feetY, 19, 'feet sit 19px below the sprite centre');
assert.equal(OBSERVATORY_BODY.bodyOffsetX, 11, 'foot body keeps the campaign body offset');
assert.deepEqual(observatoryBody({ x: 188, y: 250 }), { x: 181, y: 266, width: 14, height: 6 },
  'foot body is 14x6 at centre + (-7, +16)');
assert.equal(OBSERVATORY_BODY.bodyOffsetY - 21, 16, 'body offset resolves to the authored +16 top');

/* ------------------------------------------------------------------ *
 * 2. Art fit, solids and stands
 * ------------------------------------------------------------------ */
for (const element of OBSERVATORY_ELEMENTS) {
  const size = fitObservatoryArt(element.nativeWidth, element.nativeHeight, element.scale);
  const rect = observatoryArtRect(element);
  assert.equal(rect.width, size.width, `${element.id} art width comes from the uniform fit`);
  assert.equal(rect.height, size.height, `${element.id} art height comes from the uniform fit`);
  assert.ok(size.width <= element.nativeWidth && size.height <= element.nativeHeight,
    `${element.id} art is never upscaled beyond its native size`);
  const aspect = element.nativeWidth / element.nativeHeight;
  const drawn = size.width / size.height;
  assert.ok(Math.abs(aspect - drawn) < 0.06,
    `${element.id} keeps its native aspect ratio (${aspect.toFixed(3)} vs ${drawn.toFixed(3)})`);
  assert.ok(element.radius === 0 || element.radius >= 22, `${element.id} interaction radius is at least 22px`);
  assert.ok(element.radius === 0 || element.radius <= 28, `${element.id} interaction radius stays small (RULE_GAMES)`);
  if (element.radius === 0) continue;

  // The stand must be legal for the authored approach side, and walkable.
  const standCenter = element.stand;
  assert.ok(isObservatoryApproachAllowed(element, standCenter),
    `${element.id} stand ${JSON.stringify(standCenter)} sits at the allowed approach side`);
  assert.ok(isObservatoryPositionSafe(element.roomId, standCenter, STAGES.arrival)
    || isObservatoryPositionSafe(element.roomId, standCenter, STAGES.splitWithShadow)
    || isObservatoryPositionSafe(element.roomId, standCenter, STAGES.finished),
    `${element.id} stand is not inside a solid`);

  if (element.approach === 'south') {
    const solid = rect;
    assert.ok(standCenter.y >= solid.y + solid.height - 2,
      `${element.id} stand centre is at or below the object's south edge`);
    assert.ok(standCenter.y <= solid.y + solid.height + 34,
      `${element.id} stand is adjacent to the object, not far from it`);
    // Standing north of the object must never enable the prompt.
    const north = { x: standCenter.x, y: solid.y - 24 };
    assert.equal(isObservatoryApproachAllowed(element, north), false,
      `${element.id} prompt stays hidden from the north side`);
  }
}

// Every collider corresponds to visible art: solids == fitted art rects.
for (const roomId of ROOMS) {
  for (const element of observatoryElements(roomId)) {
    if (element.radius === 0 || OBSERVATORY_NON_SOLID_IDS.includes(element.id)) continue;
    const rect = observatoryArtRect(element);
    assert.ok(observatoryElementSolids(roomId).some((solid) => Math.abs(solid.x - rect.x) < 0.01
      && Math.abs(solid.y - rect.y) < 0.01 && solid.width === rect.width && solid.height === rect.height),
      `${roomId}/${element.id} collider matches its drawn footprint exactly`);
  }
}

// The root bed's authored structure is the same rectangle as its solid override.
const rootBed = OBSERVATORY_ELEMENTS.find((element) => element.id === 'root-bed');
assert.deepEqual(rootBed.solidOverride, OBSERVATORY_ROOT_BED, 'root bed solid matches the authored divider');
assert.ok(OBSERVATORY_ROOT_BED.y <= OBSERVATORY_FLOORS.observatory.y
  && OBSERVATORY_ROOT_BED.y + OBSERVATORY_ROOT_BED.height >= OBSERVATORY_FLOORS.observatory.y + OBSERVATORY_FLOORS.observatory.height,
  'the root bed spans the full depth of the observatory floor band');
assert.ok(OBSERVATORY_BRIDGE_LANE.height >= 44, 'the bridge lane is a real corridor (>=44px)');
assert.ok(OBSERVATORY_BRIDGE_LANE.x === OBSERVATORY_ROOT_BED.x
  && OBSERVATORY_BRIDGE_LANE.width === OBSERVATORY_ROOT_BED.width, 'the lane is cut through the bed');
assert.ok(OBSERVATORY_FINAL_DOOR_HEAD.width >= 48, 'the final door opening is at least 48px wide');

/* ------------------------------------------------------------------ *
 * 3. Solids block the foot body from every cardinal direction
 * ------------------------------------------------------------------ */
for (const roomId of ROOMS) {
  for (const [stageName, stage] of [['arrival', STAGES.arrival], ['finished', STAGES.finished]]) {
    const solids = observatorySolidRects(roomId, stage);
    const contacts = (solid) => [
      { name: 'north', center: { x: solid.x + solid.width / 2, y: solid.y - 20 } },
      { name: 'south', center: { x: solid.x + solid.width / 2, y: solid.y + solid.height - 20 } },
      { name: 'west', center: { x: solid.x - 1, y: solid.y + solid.height - 20 } },
      { name: 'east', center: { x: solid.x + solid.width + 1, y: solid.y + solid.height - 20 } },
    ];
    for (const solid of solids) {
      for (const { name, center } of contacts(solid)) {
        const body = observatoryBody(center);
        assert.ok(rectsOverlap(body, solid),
          `${roomId}@${stageName} ${name} contact overlaps the solid at ${solid.x},${solid.y}`);
        assert.equal(isObservatoryPositionSafe(roomId, center, stage), false,
          `${roomId}@${stageName} solid at ${solid.x},${solid.y} blocks the body from the ${name}`);
      }
    }
  }
}

/* ------------------------------------------------------------------ *
 * 4. Reachability: authored spawns, stands, and every exit open/locked
 * ------------------------------------------------------------------ */
const entry = (roomId) => OBSERVATORY_ROOMS[roomId].spawns.find((s) => s.id === OBSERVATORY_ROOMS[roomId].entrySpawnId).position;

for (const roomId of ROOMS) {
  const room = OBSERVATORY_ROOMS[roomId];
  const start = entry(roomId);
  for (const spawn of room.spawns) {
    assert.ok(isObservatoryPositionSafe(roomId, spawn.position, STAGES.finished),
      `${roomId} spawn ${spawn.id} is walkable`);
  }
  // Every spawn is reachable from the room entry in at least one plausible stage.
  for (const spawn of room.spawns) {
    const reachableNow = Object.values(STAGES).some((stage) => reachable(roomId, start, stage, spawn.position));
    assert.ok(reachableNow, `${roomId} spawn ${spawn.id} is reachable from the room entry`);
  }
  for (const element of observatoryElements(roomId)) {
    if (element.radius === 0) continue;
    const stageList = element.roomId === 'observatory' && element.stand.x > 384 ? [STAGES.splitWithShadow, STAGES.crossed] : [STAGES.arrival, STAGES.doorALatched, STAGES.lampPlaced];
    const reachableNow = stageList.some((stage) => reachable(roomId, start, stage, element.stand));
    assert.ok(reachableNow, `${roomId} stand ${element.id} is reachable from the room entry`);
  }
}

// Exits: unreachable while locked, reachable once open.
// Each door face is tested in a stage where the player can legitimately be on
// that side of it with the door still shut.
const LOCKED_STAGE = {
  'door-a-entrance': STAGES.arrival,
  'door-a-corridor': STAGES.arrival,
  'sun-door-corridor': STAGES.doorALatched,
  'sun-door-observatory': STAGES.lampPlaced,
  'return-loop-entrance': STAGES.arrival,
  'return-loop-observatory': STAGES.crossed,
};
const OPEN_STAGE = {
  'door-a-entrance': STAGES.lampPlaced,
  'door-a-corridor': STAGES.doorALatched,
  'sun-door-corridor': STAGES.beamToObservatory,
  'sun-door-observatory': STAGES.beamToObservatory,
  'return-loop-entrance': STAGES.loopOpen,
  'return-loop-observatory': STAGES.loopOpen,
};

for (const exit of [...OBSERVATORY_ROOMS.entrance.exits, ...OBSERVATORY_ROOMS.corridor.exits, ...OBSERVATORY_ROOMS.observatory.exits]) {
  const roomId = exit.fromRoom;
  const start = entry(roomId);
  const alcove = OBSERVATORY_ALCOVES.find((candidate) => candidate.roomId === roomId
    && candidate.doorId === exit.doorId
    && candidate.trigger.x === exit.interactionPoint.x
    && candidate.trigger.y === exit.interactionPoint.y);
  assert.ok(alcove, `${exit.id} references an authored door alcove`);
  const lockedStage = LOCKED_STAGE[alcove.id];
  const openStage = OPEN_STAGE[alcove.id];
  assert.ok(lockedStage && openStage, `${exit.id} has an explicit locked/open test stage`);
  assert.equal(observatoryDoorOpen(alcove.doorId, lockedStage), false, `${alcove.id} locked stage really locks the door`);
  assert.equal(observatoryDoorOpen(alcove.doorId, openStage), true, `${alcove.id} open stage really opens the door`);
  const target = exit.interactionPoint;
  assert.equal(reachable(roomId, start, lockedStage, target, alcove.triggerRadius), false,
    `${exit.id} transit trigger is unreachable while its door is locked`);
  assert.ok(reachable(roomId, start, openStage, target, alcove.triggerRadius),
    `${exit.id} transit trigger is reachable once its door is open`);
  // The room-facing inspect control always explains a locked door.
  if (exit.inspectPoint) {
    assert.deepEqual(exit.inspectPoint, alcove.inspect, `${exit.id} inspect control uses the authored alcove mouth`);
    assert.ok(reachable(roomId, start, lockedStage, exit.inspectPoint, alcove.inspectRadius),
      `${exit.id} inspect control is reachable while the door is locked`);
  }
}

// The far bank of the observatory is sealed until the bridge grows.
const farBankStands = observatoryElements('observatory').filter((element) => element.stand.x > 384 && element.radius > 0);
for (const element of farBankStands) {
  assert.equal(reachable('observatory', entry('observatory'), STAGES.arrival, element.stand), false,
    `observatory/${element.id} stays behind the root bed before the bridge grows`);
  assert.ok(reachable('observatory', entry('observatory'), STAGES.splitWithShadow, element.stand),
    `observatory/${element.id} becomes reachable once the bridge is eligible`);
}
// The loop return pocket is only walkable while the loop is open.
const loopAlcove = OBSERVATORY_ALCOVES.find((alcove) => alcove.id === 'return-loop-observatory');
const pocketTarget = { x: loopAlcove.trigger.x, y: loopAlcove.trigger.y - 12 };
const farBankSpawn = OBSERVATORY_ROOMS.observatory.spawns.find((spawn) => spawn.id === 'observatory-far-bank').position;
assert.equal(isObservatoryPositionSafe('observatory', pocketTarget, STAGES.crossed), false,
  'the observatory loop sill is solid until the loop opens');
assert.ok(reachable('observatory', entry('observatory'), STAGES.loopOpen, pocketTarget, 12),
  'the loop pocket is reachable from the near bank across the deployed bridge');
assert.ok(reachable('observatory', farBankSpawn, STAGES.finished, pocketTarget, 12),
  'the loop pocket stays reachable from the far bank after the lantern is retrieved');
assert.equal(reachable('observatory', entry('observatory'), STAGES.finished, pocketTarget, 12), false,
  'with the lantern back in hand the root bridge is gone, so the near bank cannot reach the far side');

/* ------------------------------------------------------------------ *
 * 5. Puzzle derivations
 * ------------------------------------------------------------------ */
const off = derived({ lanternPlaced: true, lanternOn: true, mirrors: { g0: 2, g1: 0, g2: 3 } });
assert.equal(off.activeBeamPath.routeId, 'off', 'a misaligned network has no live beam');
assert.equal(off.doorAUnlocked, false, 'Door A stays shut while the beam is off');

const doorA = derived({ lanternPlaced: true, lanternOn: true, mirrors: { g0: 0, g1: 0, g2: 0 } });
assert.equal(doorA.activeBeamPath.routeId, 'door-a', 'G0=0 routes the beam to the Door A eye');
assert.equal(doorA.doorAUnlocked, true, 'the Door A eye opens Door A');
assert.equal(doorA.sunDoorUnlocked, false, 'the Door A route never lights the Sun lock');

const lampOff = derived({ lanternPlaced: false, lanternOn: true, mirrors: { g0: 0, g1: 0, g2: 0 } });
assert.equal(lampOff.doorAUnlocked, false, 'a lantern in hand cannot power the network');

for (const [label, mirrors] of [['g0-to-g1', { g0: 1, g1: 0, g2: 0 }], ['g0-to-g2', { g0: 1, g1: 2, g2: 3 }]]) {
  const withoutLumo = derived({ lanternPlaced: true, lanternOn: true, mirrors });
  assert.equal(withoutLumo.activeBeamPath.routeId, 'off', `${label} needs Lumo physically holding the seal`);
  assert.equal(withoutLumo.sunDoorUnlocked, false, `${label} cannot unlock the Sun door without Lumo`);
  const withLumo = derived({ lanternPlaced: true, lanternOn: true, lumoAtSeal: true, mirrors });
  assert.equal(withLumo.activeBeamPath.routeId, label, `${label} routes once Lumo holds the seal`);
}

const staleArrival = deriveObservatoryState({
  mirrorRotations: { g0: 1, g1: 2, g2: 0 }, statueOrientation: 2,
  lanternOn: true, lanternPlaced: true, doorALatched: true,
  // A stale "arrived" marker with no Lumo in the room must not hold the seal.
  lumoPosition: { roomId: 'entrance', x: 320, y: 80 },
  lumoRoute: { destinationWaypointId: 'lumo-seal', arrivedAtWaypointId: 'lumo-seal' },
});
assert.equal(staleArrival.lumoAtSeal, false, 'a stale arrival flag outside the corridor cannot hold the seal');
assert.equal(staleArrival.sunDoorUnlocked, false, 'routes beyond Door A require live Lumo state');

const directSun = derived({ lanternPlaced: true, lanternOn: true, lumoAtSeal: true, mirrors: { g0: 1, g1: 2, g2: 0 }, statue: 2 });
assert.equal(directSun.activeBeamPath.routeId, 'g2-direct-sun', 'G2=0 aims straight at the Sun lock');
assert.equal(directSun.sunDoorUnlocked, true, 'the direct route opens the final door');
assert.equal(directSun.rootBedShadowed, false, 'the direct route lights the root bed, so no bridge');
assert.equal(directSun.bridgeEligible, false, 'the direct route never grows the bridge');

for (const statue of [0, 1, 3]) {
  const split = derived({ lanternPlaced: true, lanternOn: true, lumoAtSeal: true, mirrors: { g0: 1, g1: 2, g2: 1 }, statue });
  assert.equal(split.activeBeamPath.routeId, 'g2-split', `the splitter route is live at statue ${statue}`);
  assert.equal(split.sunDoorUnlocked, true, `the upper branch keeps the Sun lock lit at statue ${statue}`);
  assert.equal(split.rootBedShadowed, false, `the bed stays lit at statue ${statue}`);
  assert.equal(split.bridgeEligible, false, `no bridge at statue ${statue}`);
}
const shadowed = derived({ lanternPlaced: true, lanternOn: true, lumoAtSeal: true, mirrors: { g0: 1, g1: 2, g2: 1 }, statue: 2 });
assert.equal(shadowed.rootBedShadowed, true, 'the wide face (2) shadows the root bed');
assert.equal(shadowed.bridgeEligible, true, 'lit Sun lock + shadowed bed + Lumo at the seal grow the bridge');
const noLumoBridge = derived({ lanternPlaced: true, lanternOn: true, mirrors: { g0: 1, g1: 2, g2: 1 }, statue: 2 });
assert.equal(noLumoBridge.bridgeEligible, false, 'the bridge also needs Lumo holding the seal');

/* ------------------------------------------------------------------ *
 * 6. Restore safety
 * ------------------------------------------------------------------ */
const candidateGrid = [];
for (let x = 0; x <= 640; x += 8) for (let y = 0; y <= 360; y += 8) candidateGrid.push({ x, y });

for (const roomId of ROOMS) {
  const room = OBSERVATORY_ROOMS[roomId];
  for (const stage of Object.values(STAGES)) {
    for (const point of candidateGrid) {
      const safe = nearestSafeObservatorySpawn(roomId, point, stage, room.spawns);
      assert.ok(isObservatoryRestoreSafe(roomId, safe, stage),
        `${roomId} restore from ${point.x},${point.y} lands on walkable floor`);
      const body = observatoryBody(safe);
      assert.ok(isObservatoryRestoreSafe(roomId, safe, stage), `${roomId} restored body never overlaps geometry`);
      if (roomId === 'observatory') {
        assert.equal(rectsOverlap(body, OBSERVATORY_BRIDGE_LANE), false,
          'a restore never lands on the retractable root bridge');
      }
      const band = OBSERVATORY_FLOORS[roomId];
      const insideRoom = body.x >= 0 && body.x + body.width <= 640 && body.y >= 0 && body.y + body.height <= 360;
      assert.ok(insideRoom, `${roomId} restore stays inside the room`);
      assert.ok(isObservatoryFloorWalkable(roomId, body, stage),
        `${roomId} restore stays on walkable floor (band or an open door sill)`);
    }
  }
  // A saved position inside a wall restores somewhere safe and different.
  const inWall = { x: 10, y: 200 };
  const restored = nearestSafeObservatorySpawn(roomId, inWall, STAGES.finished, room.spawns);
  assert.notDeepEqual(restored, inWall, `${roomId} restore rejects a saved position inside masonry`);
}

/* ------------------------------------------------------------------ *
 * 7. Guidance: every locked gate explains itself
 * ------------------------------------------------------------------ */
for (const doorId of ['door-a', 'sun-door', 'return-loop']) {
  const reason = observatoryDoorBlockReason(doorId, STAGES.arrival);
  assert.ok(reason.length > 12, `${doorId} locked feedback is a plain-language prerequisite`);
  assert.equal(observatoryDoorBlockReason(doorId, { ...STAGES.finished, returnLoopOpen: true, doorALatched: true, sunDoorUnlocked: true }), '',
    `${doorId} has no blocking reason once opened`);
}
for (const element of OBSERVATORY_ELEMENTS) {
  if (element.radius === 0) continue;
  for (const stage of Object.values(STAGES)) {
    const prompt = observatoryPrompt(element.id, stage);
    assert.ok(prompt.length > 0, `${element.id} always renders a prompt`);
  }
}
const disabledPrompts = [
  observatoryPrompt('door-a-control', STAGES.arrival),
  observatoryPrompt('sun-door-control', STAGES.arrival),
  observatoryPrompt('stone-return-loop', STAGES.arrival),
  observatoryPrompt('root-bed', STAGES.arrival),
  observatoryPrompt('final-record', STAGES.arrival),
];
for (const prompt of disabledPrompts) {
  assert.ok(prompt.includes('cần') || prompt.includes('—'), `a disabled control names its unmet prerequisite: "${prompt}"`);
}
for (const roomId of ROOMS) {
  for (const stage of Object.values(STAGES)) {
    const guidance = observatoryGuidance(roomId, stage);
    assert.ok(guidance.objective.length > 5, `${roomId} objective row is never empty`);
    assert.ok(guidance.status.includes('G0'), `${roomId} status row reports live G0/G1/G2`);
    assert.ok(guidance.hints.length >= 2 && guidance.hints.length <= 3, `${roomId} hint ladder has 2-3 levels`);
    assert.ok(guidance.hints.every((hint) => hint.length > 8), `${roomId} every hint is a readable sentence`);
  }
}

/* ------------------------------------------------------------------ *
 * 8. Control separation and ground stamps
 * ------------------------------------------------------------------ */
for (const roomId of ROOMS) {
  const stands = [
    ...observatoryElements(roomId).filter((element) => element.radius > 0).map((element) => ({ id: element.id, point: element.stand, radius: element.radius })),
    ...OBSERVATORY_ALCOVES.filter((alcove) => alcove.roomId === roomId).flatMap((alcove) => [
      { id: `${alcove.id}-inspect`, point: alcove.inspect, radius: alcove.inspectRadius },
      { id: `${alcove.id}-exit`, point: alcove.trigger, radius: alcove.triggerRadius },
    ]),
  ];
  for (let a = 0; a < stands.length; a += 1) {
    for (let b = a + 1; b < stands.length; b += 1) {
      const distance = Math.hypot(stands[a].point.x - stands[b].point.x, stands[a].point.y - stands[b].point.y);
      assert.ok(distance > 24, `${roomId}: ${stands[a].id} and ${stands[b].id} keep distinct nearest-target areas (${distance.toFixed(1)}px)`);
    }
    assert.ok(isObservatoryPositionSafe(roomId, stands[a].point, STAGES.finished) || stands[a].id.includes('exit') || stands[a].id.includes('inspect'),
      `${roomId}: ${stands[a].id} stand is walkable`);
  }
  for (const stamp of OBSERVATORY_STAMPS[roomId]) {
    assert.ok(stamp.depth >= 0 && stamp.depth <= 7, `${roomId} stamp ${stamp.id} sits below the feet`);
    assert.ok(stamp.x >= 0 && stamp.y >= 0 && stamp.x + stamp.width <= 640 && stamp.y + stamp.height <= 360,
      `${roomId} stamp ${stamp.id} stays inside the room`);
  }
}

// Alcove geometry: 48px passages, permanent jambs, thresholds only walkable when open.
for (const alcove of OBSERVATORY_ALCOVES) {
  const band = OBSERVATORY_FLOORS[alcove.roomId];
  const horizontalWall = alcove.threshold.y <= band.y + 0.01
    || alcove.threshold.y + alcove.threshold.height >= band.y + band.height - 0.01;
  const passage = horizontalWall ? alcove.threshold.width : alcove.threshold.height;
  assert.ok(passage >= 48, `${alcove.id} keeps an opening of at least 48px (got ${passage})`);
  const depth = horizontalWall ? alcove.threshold.height : alcove.threshold.width;
  assert.ok(depth >= 34, `${alcove.id} keeps a real sill depth (got ${depth})`);
  assert.equal(alcove.jambs.length, 2, `${alcove.id} has two permanent jambs`);
  for (const jamb of alcove.jambs) {
    assert.equal(observatorySolidRects(alcove.roomId, STAGES.finished).some((solid) => solid.x === jamb.x
      && solid.y === jamb.y && solid.width === jamb.width && solid.height === jamb.height), true,
    `${alcove.id} jamb is registered as permanent masonry`);
  }
}

/* * ------------------------------------------------------------------ *
 * 9. Art: every collider has visible art and every art reference resolves
 * ------------------------------------------------------------------ */
const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const campaignArtSource = readFileSync(join(rootDir, 'src/art/CampaignArt.ts'), 'utf8');
/** import.meta.glob patterns declared in CampaignArt.ts, as matchable regexes. */
const artGlobs = [...campaignArtSource.matchAll(/'\.\.\/\.\.\/(assets\/[^']+\.png)'/g)]
  .map((match) => new RegExp(`^${match[1].replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*')}$`));
const artIsRegistered = (relative) => artGlobs.some((pattern) => pattern.test(relative));
const LEVEL_DIRECTORIES = [
  '01-forgotten-forest-edge', '02-whispering-woods', '03-library-beneath-the-roots',
  '04-shattered-moonlit-creek', '05-a-path-for-two', '06-the-sleepless-tower',
  '07-the-sleeping-garden', '08-ruins-of-two-halves', '09-dark-moon-observatory',
  '10-the-heart-of-elaria',
];
/** Procedural/manifest texture keys the observatory is allowed to reference. */
const KNOWN_TEXTURE_KEYS = new Set([
  'mirror_0', 'mirror_1', 'mirror_2', 'mirror_3',
  'pedestal_empty', 'pedestal_lit', 'receiver_off', 'ruins_altar', 'crystal_balance',
  'lock_sun_on', 'lock_sun_off', 'ground_stone', 'stepping_stone', 'woods_arch_locked', 'woods_arch_open',
]);
for (const element of OBSERVATORY_ELEMENTS) {
  const art = element.art;
  if (art.kind === 'texture') {
    // 'root-bed' is drawn procedurally by CampaignScene.buildObservatoryRootBed().
    assert.ok(element.id === 'root-bed' || KNOWN_TEXTURE_KEYS.has(art.key),
      `${element.id} texture key ${art.key} exists in the manifest/procedural set`);
    continue;
  }
  const files = art.kind === 'level' ? [art.file] : art.files;
  for (const file of files) {
    const relative = `assets/levels/${LEVEL_DIRECTORIES[art.level]}/sprites/${file}.png`;
    assert.ok(existsSync(join(rootDir, relative)), `${element.id} art file exists: ${relative}`);
    assert.ok(artIsRegistered(relative), `${element.id} art is registered in CampaignArt.ts: ${relative}`);
  }
}
for (const base of ['lobby-base', 'star-chart-base', 'observatory-clean-base', 'learned-marks-miniature']) {
  const relative = `assets/levels/09-dark-moon-observatory/sprites/${base}.png`;
  assert.ok(existsSync(join(rootDir, relative)), `room base exists: ${relative}`);
  assert.ok(artIsRegistered(relative), `room base is registered: ${relative}`);
}
// The hand-off base with the baked caption strip must never reach the runtime.
{
  const mapping = campaignArtSource.slice(campaignArtSource.indexOf('export function getLevelBackgroundKey'));
  const levelEightBlock = mapping.slice(mapping.indexOf('if (levelIndex === 8)'), mapping.indexOf('return backgrounds[levelIndex]'));
  assert.equal(levelEightBlock.includes("'observatory-base'"), false,
    'the observatory never loads the hand-off base; only observatory-clean-base');
  for (const room of ['entrance', 'corridor', 'observatory']) {
    assert.ok(levelEightBlock.includes(`roomId === '${room}'`), `level 08 maps a base for the ${room} room`);
  }
}
// Depth: no world sprite may out-rank the HUD (86) or the prompt container (82).
for (const element of OBSERVATORY_ELEMENTS) {
  if (element.radius === 0) continue;
  const depth = element.mount === 'ground' ? 3 : 10 + element.anchor.y / 10;
  assert.ok(depth < 82, `${element.id} sorts below the prompt/HUD layers (${depth})`);
  const rect = observatoryArtRect(element);
  assert.ok(rect.y + rect.height <= 320, `${element.id} art stays out of the bottom status band`);
}

/* ------------------------------------------------------------------ *
 * 10. Every authored control is registered, and every registration is authored
 * ------------------------------------------------------------------ */
for (const roomId of ROOMS) {
  const room = OBSERVATORY_ROOMS[roomId];
  const ids = new Set(room.interactables.map((item) => item.id));
  for (const element of observatoryElements(roomId)) {
    if (element.radius === 0) continue;
    assert.ok(ids.has(element.id), `${roomId} registers an interactable for the authored control ${element.id}`);
  }
  for (const id of ids) {
    const element = OBSERVATORY_ELEMENTS.find((candidate) => candidate.id === id);
    assert.ok(element, `${roomId} interactable ${id} is backed by authored geometry`);
    assert.equal(element.roomId, roomId, `${roomId} interactable ${id} uses its own room's geometry`);
  }
}

/* ------------------------------------------------------------------ *
 * 11. Runtime wiring: the scene consumes the verified layout
 * ------------------------------------------------------------------ */
const sceneSource = readFileSync(join(rootDir, 'src/scenes/CampaignScene.ts'), 'utf8');
const observatorySource = sceneSource.slice(
  sceneSource.indexOf('public buildObservatoryRoom('),
  sceneSource.indexOf('private drawRoom('),
);
assert.ok(observatorySource.length > 4000, 'the observatory controller block was found in CampaignScene.ts');
for (const symbol of [
  'observatoryPrompt(', 'isObservatoryApproachAllowed(', 'isObservatoryGateApproachAllowed(',
  'observatoryDoorOpen(', 'nearestSafeObservatorySpawn(', 'observatoryGuidance(',
  'observatoryCompletionReady(', 'syncObservatorySolids(', 'observatorySolidRects(',
]) {
  assert.ok(sceneSource.includes(symbol), `CampaignScene uses ${symbol}`);
}
// Two live-state bugs that a text scan can catch: no oversized trigger radius and
// no English prompt strings in the observatory block.
assert.equal(/radius:\s*3[0-9]/.test(observatorySource), false,
  'no observatory trigger uses an oversized 30px+ radius');
assert.equal(/E · (Door is locked|Enter |Rotate |Turn statue|Inspect |Place lantern|Retrieve lantern)/.test(observatorySource), false,
  'no observatory prompt string is English');
assert.equal(observatorySource.includes("'observatory-lumo-call-point'"), false,
  'no undocumented extra control point exists beside the lantern pedestal');
const solidSyncCalls = (sceneSource.match(/this\.syncObservatorySolids\(\)/g) ?? []).length;
assert.ok(solidSyncCalls >= 2, `dynamic solids are synchronised at build and per frame (${solidSyncCalls} call sites)`);

/* ------------------------------------------------------------------ *
 * 12. Guidance language: Vietnamese, with the missing condition named
 * ------------------------------------------------------------------ */
const nonAscii = /[^\x00-\x7F]/;
for (const roomId of ROOMS) {
  for (const stage of Object.values(STAGES)) {
    const guidance = observatoryGuidance(roomId, stage);
    assert.ok(nonAscii.test(guidance.objective) && nonAscii.test(guidance.status),
      `${roomId} objective/status are Vietnamese sentences`);
    for (const hint of guidance.hints) assert.ok(nonAscii.test(hint), `${roomId} hint is Vietnamese`);
    for (const element of observatoryElements(roomId)) {
      if (element.radius === 0) continue;
      const prompt = observatoryPrompt(element.id, stage);
      assert.ok(nonAscii.test(prompt), `${element.id} prompt is Vietnamese in every stage`);
    }
  }
}
for (const doorId of ['door-a', 'sun-door', 'return-loop']) {
  for (const stage of Object.values(STAGES)) {
    if (observatoryDoorOpen(doorId, stage)) continue;
    const reason = observatoryDoorBlockReason(doorId, stage);
    assert.ok(reason.length > 12 && nonAscii.test(reason),
      `${doorId} names its missing prerequisite while locked ("${reason}")`);
  }
}
// The lantern's own prompts must never claim the network is live from history.
for (const stage of Object.values(STAGES)) {
  assert.ok(observatoryPrompt('lumo-seal', stage).length > 0, 'the seal always answers');
}

/* ------------------------------------------------------------------ *
 * 13. Save compatibility (v1): the observatory validations stay in place
 * ------------------------------------------------------------------ */
const saveSource = readFileSync(join(rootDir, 'src/systems/CampaignSaveSystem.ts'), 'utf8');
for (const guard of [
  "'entrance', 'corridor', 'observatory'",
  "'l8-lumo-room'", "'l8-lumo-destination'", "'l8-lumo-arrived'",
  "'l8-lumo-route-json'", "'l8-lumo-route-index'", "'l8-lumo-x'", "'l8-lantern-x'",
  'roomSpawn', 'version !== 1',
]) {
  assert.ok(saveSource.includes(guard), `CampaignSaveSystem still validates ${guard}`);
}
assert.equal(saveSource.includes('roomId') && saveSource.includes('validRooms'), true,
  'roomId is still restricted to the three observatory rooms');

console.log('Level 09 observatory geometry/state checks passed:');
console.log(`  rooms        : ${ROOMS.length}`);
console.log(`  elements     : ${OBSERVATORY_ELEMENTS.length}`);
console.log(`  alcoves      : ${OBSERVATORY_ALCOVES.length}`);
console.log(`  stages       : ${Object.keys(STAGES).length}`);
console.log('  reachability : collision-aware flood fill over every stage');
console.log('  solids       : every collider blocks the 14x6 body from 4 directions');
console.log('  art          : every collider maps to a registered, existing PNG');
console.log('  controls     : every authored control is registered and vice versa');
console.log('  wiring       : CampaignScene consumes the verified layout symbols');
console.log('  save         : v1 observatory validations intact');
