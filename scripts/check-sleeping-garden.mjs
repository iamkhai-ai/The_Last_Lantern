import assert from 'node:assert/strict';
import {
  GARDEN_BAR_BEAM, GARDEN_BRIDGE, GARDEN_SIDE_PATH, GARDEN_SPANS, GARDEN_SPAWN, GARDEN_STAGE_ANCHORS, GARDEN_STANDS,
  NO_HELD_SPANS, barRaised, bridgeWalkable, crossingSideFor, crossedToFarBank, effectiveLight, gardenActorBody,
  gardenActorDepth, gardenCompletionBlock, gardenPropDepth, inGateCorridor, isGardenPositionSafe,
  nearestSafeGardenSpawn, onGardenBridge, readGardenState, rectsOverlap, rootsDeployed, sanitizeGardenState,
  sidePathOpen, sunOpen, updateHeldSpans,
} from '../src/data/sleepingGardenLayout.ts';

const stateOf = (o) => sanitizeGardenState({ canopyShut: false, sunLatched: false, waterFlowing: false, returnLatched: false, lumoRealized: false, bridgeCrossed: false, crossingSide: null, ...o });

assert.deepEqual(readGardenState({ 'l6-canopy-shut': true, 'l6-crossing-side': 'west' }).crossingSide, null, 'crossing side without a completed crossing is dropped');
assert.equal(readGardenState({ 'l6-return-latched': true }).waterFlowing, true, 'return latch implies water');
assert.equal(readGardenState({ 'l6-water-flowing': true, 'l6-sun-latched': true }).canopyShut, true, 'sun latch implies a closed canopy');
assert.equal(readGardenState({ 'l6-moon-open': true }).canopyShut, false, 'compat moon flag alone does not close the canopy');

assert.deepEqual(gardenActorBody({ x: 274, y: 229 }), { x: 267, y: 245, width: 14, height: 6 });
assert.equal(rectsOverlap(gardenActorBody({ x: 330, y: 220 }), GARDEN_BRIDGE), true);
assert.equal(rectsOverlap(gardenActorBody({ x: 330, y: 200 }), GARDEN_BRIDGE), false);

const fresh = stateOf({});
assert.equal(effectiveLight(fresh, true), true);
assert.equal(sunOpen(fresh, false), true, 'open canopy keeps the sun flower open even with the lantern off');
assert.equal(barRaised(fresh, false), true);
assert.equal(rootsDeployed(fresh, false), false, 'roots only deploy once the canopy is shut');
const shut = stateOf({ canopyShut: true });
assert.equal(effectiveLight(shut, false), false);
assert.equal(rootsDeployed(shut, false), true);
assert.equal(barRaised(shut, false), false);
assert.equal(barRaised(shut, true), true);
const latched = stateOf({ canopyShut: true, sunLatched: true });
assert.equal(barRaised(latched, false), true, 'the stone latch holds the bar up without light');
assert.equal(sidePathOpen(latched), false);
assert.equal(sidePathOpen(stateOf({ canopyShut: true, sunLatched: true, returnLatched: true })), true);

assert.equal(bridgeWalkable('s1', latched, false, NO_HELD_SPANS), true);
assert.equal(bridgeWalkable('s1', shut, true, NO_HELD_SPANS), false);
const heldBoth = updateHeldSpans(NO_HELD_SPANS, shut, true, gardenActorBody({ x: 330, y: 220 }));
assert.deepEqual(heldBoth, { s1: true, s2: false }, 'only the overlapped span is held');
const heldBoth2 = updateHeldSpans(heldBoth, shut, true, gardenActorBody({ x: 330, y: 220 }));
assert.deepEqual(heldBoth2, { s1: true, s2: false }, 'held span persists while overlapping');
assert.deepEqual(updateHeldSpans(heldBoth, shut, true, gardenActorBody({ x: 460, y: 260 })), { s1: false, s2: false }, 'held span releases after leaving');
assert.deepEqual(updateHeldSpans({ s1: true, s2: true }, shut, false, gardenActorBody({ x: 460, y: 260 })), { s1: false, s2: false }, 'deployed roots clear held spans');
assert.equal(bridgeWalkable('s1', shut, true, heldBoth), true, 'held span stays walkable with the lantern on');
assert.equal(bridgeWalkable('s2', shut, true, heldBoth), false);

assert.equal(onGardenBridge({ x: 330, y: 220 }), true);
assert.equal(onGardenBridge({ x: 396, y: 220 }), true, 'bridge bounds extend to the east landing');
assert.equal(onGardenBridge({ x: 298, y: 220 }), true, 'a toe on the west mouth counts as on-bridge');
assert.equal(onGardenBridge({ x: 288, y: 220 }), false);
assert.equal(crossedToFarBank('west', { x: 400, y: 240 }), true);
assert.equal(crossedToFarBank('west', { x: 380, y: 240 }), false);
assert.equal(crossedToFarBank('east', { x: 300, y: 220 }), false, 'still on the bridge is never a completed crossing');
assert.equal(crossingSideFor({ x: 325, y: 220 }), 'west');
assert.equal(crossingSideFor({ x: 360, y: 220 }), 'east');

assert.equal(gardenCompletionBlock(fresh), 'canopy');
assert.equal(gardenCompletionBlock(shut), 'bar');
assert.equal(gardenCompletionBlock(stateOf({ canopyShut: true, sunLatched: true })), 'drain');
assert.equal(gardenCompletionBlock(stateOf({ canopyShut: true, sunLatched: true, waterFlowing: true })), 'side');
assert.equal(gardenCompletionBlock(stateOf({ canopyShut: true, sunLatched: true, waterFlowing: true, returnLatched: true })), 'scene');
assert.equal(gardenCompletionBlock(stateOf({ canopyShut: true, sunLatched: true, waterFlowing: true, returnLatched: true, lumoRealized: true })), null);

assert.ok(gardenPropDepth(300) < gardenPropDepth(310));
assert.ok(gardenActorDepth(280) > gardenPropDepth(290), 'actor standing below a prop draws in front of it');

assert.equal(inGateCorridor({ x: 132, y: 134 }), true);
assert.equal(inGateCorridor({ x: 140, y: 132 }), true);
assert.equal(inGateCorridor({ x: 142, y: 144 }), false, 'body-space corridor coordinates are not player centers');
assert.equal(inGateCorridor({ x: 142, y: 160 }), false, 'standing south of the wall is not in the gap');
assert.ok(Math.hypot(132 - GARDEN_STANDS.handle.x, 134 - GARDEN_STANDS.handle.y) <= GARDEN_STANDS.handle.radius, 'handle zone reachable from the gap');
assert.ok(Math.hypot(140 - GARDEN_STANDS.latchWest.x, 132 - GARDEN_STANDS.latchWest.y) <= GARDEN_STANDS.latchWest.radius, 'latch zone reachable from the gap');
assert.ok(Math.hypot(150 - GARDEN_STANDS.latchWest.x, 120 - GARDEN_STANDS.latchWest.y) > GARDEN_STANDS.latchWest.radius, 'latch cannot be worked from the reservoir nook');

const STEP = 4;
const gridX0 = 14;
const gridY0 = 12;
const key = (x, y) => `${x}:${y}`;
function flood(state, lanternOn, held, start = GARDEN_SPAWN) {
  const startKey = key(Math.round((start.x - gridX0) / STEP), Math.round((start.y - gridY0) / STEP));
  const seen = new Set([startKey]);
  const queue = [[Math.round((start.x - gridX0) / STEP), Math.round((start.y - gridY0) / STEP)]];
  while (queue.length) {
    const [i, j] = queue.pop();
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di; const nj = j + dj;
      const center = { x: gridX0 + ni * STEP, y: gridY0 + nj * STEP };
      if (center.x < 14 || center.x > 626 || center.y < 12 || center.y > 348) continue;
      const k = key(ni, nj);
      if (seen.has(k)) continue;
      if (!isGardenPositionSafe(state, lanternOn, held, center)) continue;
      seen.add(k); queue.push([ni, nj]);
    }
  }
  return {
    size: seen.size,
    near(p, radius, pred) {
      for (const k of seen) {
        const [i, j] = k.split(':').map(Number);
        const center = { x: gridX0 + i * STEP, y: gridY0 + j * STEP };
        if (Math.hypot(center.x - p.x, center.y - p.y) <= radius && (!pred || pred(center))) return true;
      }
      return false;
    },
  };
}

const spawnSafe = (state, lanternOn, held) => isGardenPositionSafe(state, lanternOn, held, GARDEN_SPAWN);
assert.equal(spawnSafe(fresh, true, NO_HELD_SPANS), true, 'spawn is valid in every queried state');

const freshFlood = flood(fresh, true, NO_HELD_SPANS);
assert.equal(freshFlood.near(GARDEN_STANDS.handle, GARDEN_STANDS.handle.radius, inGateCorridor), true, 'handle zone reachable before the canopy is shut');
assert.equal(freshFlood.near(GARDEN_STANDS.drain, 30), false, 'the nursery is sealed off while the canopy is open');

const shutLight = flood(shut, true, NO_HELD_SPANS);
assert.equal(shutLight.near(GARDEN_STANDS.latchWest, GARDEN_STANDS.latchWest.radius, inGateCorridor), true, 'latch zone reachable with the lantern on');
assert.equal(shutLight.near(GARDEN_STANDS.drain, 30), false, 'lantern light alone must not open the canal crossing');

const deployed = flood(shut, false, NO_HELD_SPANS);
assert.equal(deployed.near(GARDEN_STANDS.latchWest, GARDEN_STANDS.latchWest.radius, inGateCorridor), false, 'the lowered bar seals the gap while roots are out');
assert.equal(deployed.near(GARDEN_STANDS.drain, GARDEN_STANDS.drain.radius), true, 'deployed roots carry the player to the drain');
for (let x = 312; x <= 356; x += STEP) {
  assert.equal(isGardenPositionSafe(shut, false, NO_HELD_SPANS, { x, y: 220 }), true, `bridge crossing open at x=${x}`);
  assert.equal(isGardenPositionSafe(shut, true, NO_HELD_SPANS, { x, y: 220 }), false, `retracted spans seal the crossing at x=${x}`);
}
assert.equal(isGardenPositionSafe(shut, false, NO_HELD_SPANS, { x: 334, y: 260 }), false, 'canal water stays lethal below the bridge');

const latchedFlood = flood(latched, false, NO_HELD_SPANS);
assert.equal(latchedFlood.near(GARDEN_STANDS.latchWest, GARDEN_STANDS.latchWest.radius, inGateCorridor), true, 'held bar keeps the gap walkable in the dark');
assert.equal(latchedFlood.near(GARDEN_STANDS.drain, GARDEN_STANDS.drain.radius), true, 'held bar and roots together connect both approaches');

const sideClosed = stateOf({ canopyShut: true, sunLatched: true, waterFlowing: true });
const sideClosedFlood = flood(sideClosed, true, NO_HELD_SPANS);
assert.equal(sideClosedFlood.near(GARDEN_STANDS.drain, 30), false, 'with light on and no side path the nursery is out of reach');

const sideOpen = stateOf({ canopyShut: true, sunLatched: true, waterFlowing: true, returnLatched: true });
const sideOpenFlood = flood(sideOpen, true, NO_HELD_SPANS);
assert.equal(sideOpenFlood.near(GARDEN_STANDS.latchEast, GARDEN_STANDS.latchEast.radius), true, 'side path connects the nursery back to the lawn');
assert.equal(sideOpenFlood.near(GARDEN_STANDS.exit, GARDEN_STANDS.exit.radius), true, 'the shrine gate is reachable once the garden is restored');
assert.equal(sideOpenFlood.near(GARDEN_STANDS.handle, GARDEN_STANDS.handle.radius), true, 'the old approach stays walkable after restoration');
const westFromSide = flood(sideOpen, true, NO_HELD_SPANS, { x: 500, y: 280 });
assert.equal(westFromSide.near(GARDEN_SPAWN, 30), true, 'the side path is a true two-way return');

for (let x = 308; x <= 392; x += STEP) {
  assert.equal(isGardenPositionSafe(sideClosed, true, NO_HELD_SPANS, { x, y: 280 }), false, `closed plank blocks the side strip at x=${x}`);
  assert.equal(isGardenPositionSafe(sideOpen, true, NO_HELD_SPANS, { x, y: 280 }), true, `opened plank clears the side strip at x=${x}`);
}
const sideOpenState = sideOpen;
assert.equal(isGardenPositionSafe(sideClosed, true, NO_HELD_SPANS, { x: 310, y: 280 }), false, 'west mouth of the closed plank is blocked');
assert.equal(isGardenPositionSafe(sideOpenState, true, NO_HELD_SPANS, { x: 310, y: 280 }), true, 'west mouth opens with the plank');
assert.equal(isGardenPositionSafe(sideClosed, true, NO_HELD_SPANS, { x: 390, y: 280 }), false, 'east mouth of the closed plank is blocked');
assert.equal(isGardenPositionSafe(sideOpenState, true, NO_HELD_SPANS, { x: 390, y: 280 }), true, 'east mouth opens with the plank');

const ejectNorth = { x: 132, y: GARDEN_BAR_BEAM.y - 24 };
const ejectSouth = { x: 132, y: GARDEN_BAR_BEAM.y + GARDEN_BAR_BEAM.height + 8 };
assert.equal(isGardenPositionSafe(shut, false, NO_HELD_SPANS, ejectNorth), true, 'north eject target is safe');
assert.equal(isGardenPositionSafe(shut, false, NO_HELD_SPANS, ejectSouth), true, 'south eject target is safe');
assert.equal(isGardenPositionSafe(shut, false, NO_HELD_SPANS, { x: 132, y: 134 }), false, 'corridor itself is sealed for the eject to matter');

for (const anchor of GARDEN_STAGE_ANCHORS) {
  const comboStates = [
    [fresh, true], [shut, true], [shut, false], [latched, false], [latched, true],
    [sideClosed, true], [sideClosed, false], [sideOpen, true], [sideOpen, false],
  ];
  assert.equal(comboStates.some(([state, lanternOn]) => isGardenPositionSafe(state, lanternOn, NO_HELD_SPANS, anchor)), true, `anchor ${anchor.x},${anchor.y} is safe somewhere`);
}

const savedPoints = [{ x: 327, y: 232 }, { x: 460, y: 240 }, { x: 130, y: 134 }, { x: 160, y: 112 }, { x: 574, y: 64 }, { x: 238, y: 336 }];
for (const canopy of [false, true]) for (const sun of [false, true]) for (const water of [false, true]) for (const ret of [false, true]) for (const lanternOn of [true, false]) {
  const state = stateOf({ canopyShut: canopy, sunLatched: sun, waterFlowing: water, returnLatched: ret });
  for (const saved of savedPoints) {
    const resolved = nearestSafeGardenSpawn(state, lanternOn, NO_HELD_SPANS, saved);
    assert.equal(isGardenPositionSafe(state, lanternOn, NO_HELD_SPANS, resolved), true, `resolved spawn ${resolved.x},${resolved.y} safe for ${JSON.stringify({ canopy, sun, water, ret, lanternOn })}`);
  }
}
assert.deepEqual(nearestSafeGardenSpawn(shut, true, NO_HELD_SPANS, { x: 327, y: 232 }), GARDEN_STAGE_ANCHORS[0], 'mid-bridge stale save returns to the west lawn');

const latchedNoWater = stateOf({ canopyShut: true, sunLatched: true });
const crossFlood = flood(latchedNoWater, false, NO_HELD_SPANS);
assert.equal(crossFlood.near(GARDEN_STANDS.drain, 30), true, 'pre-water crossing still lands in the nursery');
assert.equal(crossFlood.near(GARDEN_STANDS.sprout, GARDEN_STANDS.sprout.radius), true, 'the sprout is inspectable while the nursery is dark');

assert.equal(isGardenPositionSafe(fresh, true, NO_HELD_SPANS, { x: 238, y: 342 }), true, 'spawn mouth is walkable');
assert.equal(isGardenPositionSafe(fresh, true, NO_HELD_SPANS, { x: 640, y: 180 }), false, 'east boundary holds');
assert.equal(isGardenPositionSafe(fresh, true, NO_HELD_SPANS, { x: 574, y: 64 }), true, 'gate opening is empty before completion');
assert.equal(isGardenPositionSafe(fresh, true, NO_HELD_SPANS, { x: 574, y: 20 }), true, 'the gate opening is the way out to the north edge');
assert.equal(isGardenPositionSafe(fresh, true, NO_HELD_SPANS, { x: 546, y: 20 }), false, 'the bands flanking the gate stay solid');

assert.equal(GARDEN_SIDE_PATH.y + GARDEN_SIDE_PATH.height, 308);
assert.equal(barRaised(latched, true) && rootsDeployed(latched, true), false, 'bar up and roots out never coexist while the lantern is on');
console.log('Sleeping Garden state, geometry, reachability, held-span, eject, spawn and completion checks passed');
