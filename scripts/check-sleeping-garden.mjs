// Pure checks for Level 07 (The Sleeping Garden, campaign index 6).
// Covers: state derive/sanitize, body math, light model, held spans, crossings, per-stage
// collision-aware reachability from the entry, prompt-side rules, safe restore (safe AND
// still connected to the entry), art/footprint correspondence, icons clear of pot art and
// of the bottom HUD band, and the exit gating. No Phaser, no browser.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  GARDEN_BAR_BEAM, GARDEN_BOUNDS, GARDEN_BRIDGE, GARDEN_ICONS, GARDEN_MODULES, GARDEN_REACH_ORIGIN, GARDEN_REACH_STEP,
  GARDEN_SIDE_PATH, GARDEN_SIDE_STRIP, GARDEN_SPANS, GARDEN_SPAWN, GARDEN_STAGE_ANCHORS, GARDEN_STANDS,
  GARDEN_STATIC_SOLIDS, GARDEN_WATER, NO_HELD_SPANS, barRaised, bridgeWalkable, crossingSideFor, crossedToFarBank,
  effectiveLight, gardenActorBody, gardenActorDepth, gardenCellCenter, gardenCellOf, gardenCompletionBlock,
  gardenDrainEnabled, gardenExitReady, gardenHandleEnabled, gardenLatchEastEnabled, gardenLatchWestEnabled,
  gardenPropDepth, gardenReachableRegion, gardenRegionReaches, inGateCorridor, isGardenPositionSafe,
  nearestSafeGardenSpawn, onGardenBridge, readGardenState, rectsOverlap, rootsDeployed, sanitizeGardenState,
  sidePathOpen, sunOpen, updateHeldSpans, GARDEN_BAR_BEAM_ROWS, GARDEN_BAR_POSTS, GARDEN_BAR_SPRITE, GARDEN_OBSERVATION_ZONE,
  GARDEN_SHADOW_PATH, inGardenObservationZone, practiceLessonArmed, practiceLessonDue,
} from '../src/data/sleepingGardenLayout.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const HUD_TOP = 58;      // shared top HUD band (CampaignScene: title y13 / objective y42 panels)
const HUD_BOTTOM = 320;  // shared bottom status/help strip starts here (statusText y320, controls y344)

const stateOf = (o) => sanitizeGardenState({ canopyShut: false, sunLatched: false, waterFlowing: false, returnLatched: false, lumoRealized: false, bridgeCrossed: false, crossingSide: null, ...o });

// ---------------------------------------------------------------- state model
assert.deepEqual(readGardenState({ 'l6-canopy-shut': true, 'l6-crossing-side': 'west' }).crossingSide, null, 'crossing side without a completed crossing is dropped');
assert.equal(readGardenState({ 'l6-return-latched': true }).waterFlowing, true, 'return latch implies water');
assert.equal(readGardenState({ 'l6-water-flowing': true, 'l6-sun-latched': true }).canopyShut, true, 'sun latch implies a closed canopy');
assert.equal(readGardenState({ 'l6-moon-open': true }).canopyShut, false, 'compat moon flag alone does not close the canopy');
// live conditions are never derived from stale/legacy arrival flags
const legacy = readGardenState({ 'l6-at-nursery': true, 'l6-solved': true, 'l6-at-bridge': true, 'l5-power': true, 'l6-sun-open': true });
assert.deepEqual(
  [legacy.canopyShut, legacy.sunLatched, legacy.waterFlowing, legacy.returnLatched, legacy.lumoRealized],
  [false, false, false, false, false],
  'foreign/legacy flags never gate a garden mechanism',
);
assert.equal(gardenExitReady(legacy), false, 'legacy arrival flags cannot open the exit');

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
assert.deepEqual(updateHeldSpans(heldBoth, shut, true, gardenActorBody({ x: 330, y: 220 })), { s1: true, s2: false }, 'held span persists while overlapping');
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

// ---------------------------------------------------------------- mechanism gating (live state, exclusive targets)
assert.equal(inGateCorridor({ x: 132, y: 134 }), true);
assert.equal(inGateCorridor({ x: 140, y: 132 }), true);
assert.equal(inGateCorridor({ x: 142, y: 144 }), false, 'body-space corridor coordinates are not player centers');
assert.equal(inGateCorridor({ x: 142, y: 160 }), false, 'standing south of the wall is not in the gap');
for (const canopy of [false, true]) for (const sun of [false, true]) for (const lanternOn of [true, false]) {
  const state = stateOf({ canopyShut: canopy, sunLatched: sun });
  const handle = gardenHandleEnabled(state);
  const latch = gardenLatchWestEnabled(state, lanternOn);
  assert.equal(handle && latch, false, `handle and west latch are never both live (${JSON.stringify({ canopy, sun, lanternOn })})`);
  assert.equal(handle, !state.canopyShut, 'the shutter handle is live exactly while the canopy is open');
  assert.equal(latch, canopy && !sun && barRaised(state, lanternOn), 'the west latch needs a shut canopy and a raised bar');
}
assert.equal(gardenLatchWestEnabled(shut, true), true, 'latch live with the lantern on and the bar raised');
assert.equal(gardenLatchWestEnabled(shut, false), false, 'latch dead with the bar lowered');
assert.equal(gardenDrainEnabled(stateOf({ canopyShut: true, sunLatched: true })), false, 'a latched bar alone does not open the drain');
assert.equal(gardenDrainEnabled(stateOf({ canopyShut: true, sunLatched: true, bridgeCrossed: true })), true, 'the drain needs a completed crossing');
assert.equal(gardenDrainEnabled(stateOf({ canopyShut: true, sunLatched: true, returnLatched: true })), false, 'the committed side path already implies water, so the drain reads as open');
assert.equal(gardenDrainEnabled(stateOf({ canopyShut: true, sunLatched: true, bridgeCrossed: true, waterFlowing: true })), false, 'the drain opens once');
assert.equal(gardenLatchEastEnabled(stateOf({ canopyShut: true, sunLatched: true })), false, 'the east latch needs water first');
assert.equal(gardenLatchEastEnabled(stateOf({ canopyShut: true, sunLatched: true, waterFlowing: true })), true);
assert.equal(gardenLatchEastEnabled(stateOf({ canopyShut: true, sunLatched: true, waterFlowing: true, returnLatched: true })), false, 'the east latch commits once');

// ---------------------------------------------------------------- reachability from the entry
function region(state, lanternOn, held = NO_HELD_SPANS, start = GARDEN_SPAWN) {
  return gardenReachableRegion(state, lanternOn, held, start);
}
const near = (r, p, radius, pred) => gardenRegionReaches(r, p, radius, pred);
const reachable = (state, lanternOn, point, held = NO_HELD_SPANS, start = GARDEN_SPAWN) =>
  region(state, lanternOn, held, start).has(`${gardenCellOf(point).i}:${gardenCellOf(point).j}`);

const spawnSafe = (state, lanternOn, held) => isGardenPositionSafe(state, lanternOn, held, GARDEN_SPAWN);
for (const canopy of [false, true]) for (const sun of [false, true]) for (const water of [false, true]) for (const ret of [false, true]) for (const lanternOn of [true, false]) {
  assert.equal(spawnSafe(stateOf({ canopyShut: canopy, sunLatched: sun, waterFlowing: water, returnLatched: ret }), lanternOn, NO_HELD_SPANS), true, 'the entry is walkable in every state');
}

const freshRegion = region(fresh, true);
assert.equal(near(freshRegion, GARDEN_STANDS.handle, GARDEN_STANDS.handle.radius, inGateCorridor), true, 'handle zone reachable before the canopy is shut');
assert.equal(near(freshRegion, GARDEN_STANDS.drain, 30), false, 'the nursery is sealed off while the canopy is open');
assert.equal(near(freshRegion, GARDEN_STANDS.exit, GARDEN_STANDS.exit.radius), false, 'the shrine arch is out of reach before the puzzle is solved');
assert.equal(near(freshRegion, GARDEN_STANDS.latchWest, GARDEN_STANDS.latchWest.radius, inGateCorridor), true, 'the gap is walkable before the canopy is shut, but the latch prompt is suppressed by its live guard');
assert.equal(gardenLatchWestEnabled(fresh, true), false, 'the west latch cannot be worked before the canopy is shut');
assert.equal(reachable(fresh, true, GARDEN_STAGE_ANCHORS[0]), true, 'the entry anchor belongs to its own region');

const shutLight = region(shut, true);
assert.equal(near(shutLight, GARDEN_STANDS.latchWest, GARDEN_STANDS.latchWest.radius, inGateCorridor), true, 'latch zone reachable with the lantern on');
assert.equal(near(shutLight, GARDEN_STANDS.drain, 30), false, 'lantern light alone must not open the canal crossing');

const deployed = region(shut, false);
assert.equal(near(deployed, GARDEN_STANDS.latchWest, GARDEN_STANDS.latchWest.radius, inGateCorridor), false, 'the lowered bar seals the gap while roots are out');
assert.equal(near(deployed, GARDEN_STANDS.drain, GARDEN_STANDS.drain.radius), true, 'deployed roots carry the player to the drain');
for (let x = 312; x <= 356; x += GARDEN_REACH_STEP) {
  assert.equal(isGardenPositionSafe(shut, false, NO_HELD_SPANS, { x, y: 220 }), true, `bridge crossing open at x=${x}`);
  assert.equal(isGardenPositionSafe(shut, true, NO_HELD_SPANS, { x, y: 220 }), false, `retracted spans seal the crossing at x=${x}`);
}
assert.equal(isGardenPositionSafe(shut, false, NO_HELD_SPANS, { x: 334, y: 260 }), false, 'canal water stays lethal below the bridge');

const latchedRegion = region(latched, false);
assert.equal(near(latchedRegion, GARDEN_STANDS.latchWest, GARDEN_STANDS.latchWest.radius, inGateCorridor), true, 'held bar keeps the gap walkable in the dark');
assert.equal(near(latchedRegion, GARDEN_STANDS.drain, GARDEN_STANDS.drain.radius), true, 'held bar and roots together connect both approaches');
assert.equal(near(latchedRegion, GARDEN_STANDS.sprout, GARDEN_STANDS.sprout.radius), true, 'the sprout is inspectable while the nursery is dark');

const sideClosed = stateOf({ canopyShut: true, sunLatched: true, waterFlowing: true });
const sideClosedRegion = region(sideClosed, true);
assert.equal(near(sideClosedRegion, GARDEN_STANDS.drain, 30), false, 'with light on and no side path the nursery is out of reach');
assert.equal(near(sideClosedRegion, GARDEN_STANDS.exit, GARDEN_STANDS.exit.radius), false, 'the arch stays out of reach while the side path is shut');

const sideOpen = stateOf({ canopyShut: true, sunLatched: true, waterFlowing: true, returnLatched: true });
const sideOpenRegion = region(sideOpen, true);
assert.equal(near(sideOpenRegion, GARDEN_STANDS.latchEast, GARDEN_STANDS.latchEast.radius), true, 'side path connects the nursery back to the lawn');
assert.equal(near(sideOpenRegion, GARDEN_STANDS.exit, GARDEN_STANDS.exit.radius), true, 'the shrine gate is reachable once the garden is restored');
assert.equal(near(sideOpenRegion, GARDEN_STANDS.handle, GARDEN_STANDS.handle.radius), true, 'the old approach stays walkable after restoration');
assert.equal(near(region(sideOpen, true, NO_HELD_SPANS, { x: 500, y: 280 }), GARDEN_SPAWN, 30), true, 'the side path is a true two-way return');

// the 80x32 plank covers the canal and still separates the banks while closed
assert.equal(GARDEN_SIDE_PATH.width, 80, 'the closed plank solid is the visible plank art width');
assert.equal(GARDEN_SIDE_PATH.height, 32, 'the closed plank solid is the visible plank art height');
assert.equal(GARDEN_SIDE_PATH.y + GARDEN_SIDE_PATH.height, 316);
for (const wall of [GARDEN_STATIC_SOLIDS.find((s) => s.id === 'canal-west-wall-b').rect, GARDEN_STATIC_SOLIDS.find((s) => s.id === 'canal-east-wall-b').rect]) {
  assert.equal(rectsOverlap(GARDEN_SIDE_PATH, { ...wall, y: 248, height: 36 }), false, 'the plank never overlaps the canal side walls');
}
for (let x = 308; x <= 380; x += GARDEN_REACH_STEP) {
  assert.equal(isGardenPositionSafe(sideClosed, true, NO_HELD_SPANS, { x, y: 280 }), false, `closed plank blocks the side strip at x=${x}`);
  assert.equal(isGardenPositionSafe(sideOpen, true, NO_HELD_SPANS, { x, y: 280 }), true, `opened plank clears the side strip at x=${x}`);
}
assert.equal(reachable(sideClosed, true, { x: 288, y: 280 }), true, 'the west bank of the side strip is reachable with the plank closed');
assert.equal(reachable(sideClosed, true, { x: 392, y: 280 }), false, 'the east landing is NOT reachable with the plank closed (no 12px leak past the plank)');
assert.equal(reachable(sideOpen, true, { x: 392, y: 280 }), true, 'the east landing opens with the plank');
assert.equal(isGardenPositionSafe(sideOpen, true, NO_HELD_SPANS, { x: 392, y: 280 }), true);

// ---------------------------------------------------------------- prompt side rule (RULE_GAMES 1)
const STAND_OBJECTS = [
  { id: 'shutter-handle', stand: GARDEN_STANDS.handle, rect: GARDEN_STATIC_SOLIDS.find((s) => s.id === 'shutter-handle').rect },
  { id: 'latch-west', stand: GARDEN_STANDS.latchWest, rect: GARDEN_STATIC_SOLIDS.find((s) => s.id === 'latch-west').rect },
  { id: 'drain', stand: GARDEN_STANDS.drain, rect: GARDEN_STATIC_SOLIDS.find((s) => s.id === 'drain').rect },
  { id: 'latch-east', stand: GARDEN_STANDS.latchEast, rect: GARDEN_STATIC_SOLIDS.find((s) => s.id === 'latch-east').rect },
  { id: 'sprout', stand: GARDEN_STANDS.sprout, rect: GARDEN_MODULES.find((m) => m.id === 'sprout').rect },
];
for (const { id, stand, rect } of STAND_OBJECTS) {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  assert.ok(stand.y > rect.y + rect.height, `${id}: stand sits on the south side of the object`);
  assert.ok(stand.x >= rect.x && stand.x <= rect.x + rect.width, `${id}: stand is inside the object's x span`);
  assert.ok(stand.y - (rect.y + rect.height) <= 20, `${id}: stand hugs the south edge (<=20px gap)`);
  const probes = { north: { x: cx, y: rect.y - 12 }, east: { x: rect.x + rect.width + 12, y: cy }, west: { x: rect.x - 12, y: cy } };
  for (const [side, probe] of Object.entries(probes)) {
    assert.ok(Math.hypot(probe.x - stand.x, probe.y - stand.y) > stand.radius, `${id}: standing at the ${side} face is outside the prompt radius`);
  }
  assert.ok(stand.y + stand.radius < HUD_BOTTOM, `${id}: the prompt zone stays clear of the bottom HUD strip`);
}
// documented gate-arch exception (RULE_GAMES 3): trigger under the arch, approached from inside
assert.equal(GARDEN_STANDS.exit.x > 552 && GARDEN_STANDS.exit.x < 596, true, 'arch trigger sits inside the gate opening');
assert.equal(GARDEN_STANDS.exit.y < 96, true, 'arch trigger sits under the arch');

// ---------------------------------------------------------------- every solid blocks the 14x6 foot body from all four sides
function approachCenters(rect) {
  const cx = rect.x + rect.width / 2;
  const midY = rect.y + rect.height / 2 - 19;
  return {
    north: { x: cx, y: rect.y - 21 },
    south: { x: cx, y: rect.y + rect.height - 17 },
    west: { x: rect.x - 6, y: midY },
    east: { x: rect.x + rect.width + 6, y: midY },
  };
}
function overlapsAny(rects, center) {
  const body = gardenActorBody(center);
  return rects.filter((r) => rectsOverlap(body, r));
}
const dynamicSolids = (state, lanternOn, held) => [
  { id: 'bar-beam', rect: GARDEN_BAR_BEAM, enabled: !barRaised(state, lanternOn) },
  { id: 'side-plank', rect: GARDEN_SIDE_PATH, enabled: !sidePathOpen(state) },
  { id: 'bridge-s1', rect: GARDEN_SPANS.s1, enabled: !rootsDeployed(state, lanternOn) && !held.s1 },
  { id: 'bridge-s2', rect: GARDEN_SPANS.s2, enabled: !rootsDeployed(state, lanternOn) && !held.s2 },
];
let blockDirections = 0;
let isolatedDirections = 0;
function assertSolidBlocks(id, rect, state, lanternOn, held, relaxed = false) {
  let isolated = 0;
  for (const [dir, center] of Object.entries(approachCenters(rect))) {
    const inBounds = center.x >= GARDEN_BOUNDS.minX && center.x <= GARDEN_BOUNDS.maxX && center.y >= GARDEN_BOUNDS.minY && center.y <= GARDEN_BOUNDS.maxY;
    if (!inBounds) continue; // the approach face lies outside the world; nothing to block
    blockDirections += 1;
    assert.equal(rectsOverlap(gardenActorBody(center), rect), true, `${id} ${dir}: the foot body really presses into the prop`);
    assert.equal(isGardenPositionSafe(state, lanternOn, held, center), false, `${id} blocks the 14x6 foot body from the ${dir}`);
    // the ONLY reason this cell is unsafe should be this solid (otherwise the test proves nothing)
    const rest = GARDEN_STATIC_SOLIDS.filter((s) => s.id !== id).map((s) => s.rect)
      .concat(GARDEN_WATER)
      .concat(dynamicSolids(state, lanternOn, held).filter((d) => d.enabled).map((d) => d.rect))
      .filter((r) => r !== rect);
    if (overlapsAny(rest, center).length === 0) isolated += 1;
  }
  if (!relaxed) assert.ok(isolated >= 1, `${id}: proves it is the blocker on at least one side (isolated faces: ${isolated})`);
  isolatedDirections += isolated;
}
// Stand-alone props must be provably the blocker on at least one face. The world bands/walls
// and controls that are deliberately packed together (handle beside the stone latch, posts in
// the gate wall, wall hugging the south band) may share their approach cells.
const WORLD_EDGE_IDS = new Set(['band-north-a', 'band-north-b', 'band-west', 'band-south-west', 'band-south-east', 'south-east-band',
  'east-band', 'pond-railing', 'gate-west-wall', 'gate-east-wall', 'wall-nw', 'wall-nw-east', 'wall-lawn-north-west',
  'wall-lawn-north-east-a', 'wall-lawn-north-east-b', 'wall-canal-north', 'wall-walkway-west', 'balu-south', 'canal-west-wall-a',
  'canal-west-wall-b', 'canal-west-wall-c', 'canal-east-wall-a', 'canal-east-wall-b', 'canal-east-wall-c', 'tree-trunk-sw',
  'wall-lawn-south-west', 'bar-post-west', 'bar-post-east', 'shutter-handle', 'platform-stone']);
for (const solid of GARDEN_STATIC_SOLIDS) assertSolidBlocks(solid.id, solid.rect, fresh, true, NO_HELD_SPANS, WORLD_EDGE_IDS.has(solid.id));
for (const d of dynamicSolids(shut, false, NO_HELD_SPANS)) if (d.enabled) assertSolidBlocks(`${d.id}(live)`, d.rect, shut, false, NO_HELD_SPANS);
for (const d of dynamicSolids(sideClosed, true, NO_HELD_SPANS)) if (d.id === 'side-plank' && d.enabled) assertSolidBlocks('side-plank(closed)', d.rect, sideClosed, true, NO_HELD_SPANS);
for (const d of dynamicSolids(fresh, true, NO_HELD_SPANS)) if (d.id.startsWith('bridge') && d.enabled) assertSolidBlocks(`${d.id}(retracted)`, d.rect, fresh, true, NO_HELD_SPANS);
for (const d of dynamicSolids(shut, false, NO_HELD_SPANS)) if (d.id === 'bar-beam' && d.enabled) assertSolidBlocks('bar-beam(lowered)', d.rect, shut, false, NO_HELD_SPANS);
assert.ok(blockDirections >= 140, `four-direction blocking tested ${blockDirections} approach cells`);
assert.ok(isolatedDirections >= 40, `four-direction blocking proved ${isolatedDirections} isolated (non-vacuous) approach cells`);

// ---------------------------------------------------------------- eject targets
const ejectNorth = { x: 132, y: GARDEN_BAR_BEAM.y - 24 };
const ejectSouth = { x: 132, y: GARDEN_BAR_BEAM.y + GARDEN_BAR_BEAM.height + 8 };
assert.equal(isGardenPositionSafe(shut, false, NO_HELD_SPANS, ejectNorth), true, 'north eject target is safe');
assert.equal(isGardenPositionSafe(shut, false, NO_HELD_SPANS, ejectSouth), true, 'south eject target is safe');
assert.equal(isGardenPositionSafe(shut, false, NO_HELD_SPANS, { x: 132, y: 134 }), false, 'corridor itself is sealed for the eject to matter');
assert.equal(reachable(shut, false, ejectSouth), true, 'the south eject target stays connected to the entry');
// ejected north of the beam the player lands in the nook pocket, which the lowered bar seals:
// the recovery is the lantern toggle the player always owns, so the pocket must reopen then.
assert.equal(reachable(shut, true, ejectNorth), true, 'the north eject target is reachable again as soon as the lantern raises the bar');
assert.equal(isGardenPositionSafe(shut, true, NO_HELD_SPANS, ejectNorth), true, 'the north eject target stays collision-free with the bar raised');
assert.equal(reachable(stateOf({ canopyShut: true, sunLatched: true }), false, ejectNorth), true, 'a latched bar leaves the north eject target reachable in the dark too');
assert.equal(reachable(shut, false, ejectNorth), false, 'with the bar down and roots out the nook pocket is sealed (reopened by F, tested above)');

for (const anchor of GARDEN_STAGE_ANCHORS) {
  const combos = [[fresh, true], [shut, true], [shut, false], [latched, false], [latched, true], [sideClosed, true], [sideClosed, false], [sideOpen, true], [sideOpen, false]];
  assert.equal(combos.some(([state, lanternOn]) => isGardenPositionSafe(state, lanternOn, NO_HELD_SPANS, anchor)), true, `anchor ${anchor.x},${anchor.y} is safe somewhere`);
  assert.equal(combos.some(([state, lanternOn]) => reachable(state, lanternOn, anchor)), true, `anchor ${anchor.x},${anchor.y} is reachable from the entry in some state`);
}

// ---------------------------------------------------------------- safe restore: safe AND still connected to the entry
const savedPoints = [
  { x: 327, y: 232 },   // mid bridge
  { x: 460, y: 240 },   // inside the drain
  { x: 130, y: 134 },   // the wall gap
  { x: 160, y: 112 },   // the nook
  { x: 574, y: 64 },    // the shrine arch
  { x: 238, y: 300 },   // the entry
  { x: 450, y: 280 },   // nursery floor, east of the canal
  { x: 576, y: 150 },   // the walkway
  { x: 600, y: 300 },   // east band water
  { x: 20, y: 40 },     // north-west wood
];
const STAGE_STATES = [
  ['fresh', fresh, true], ['canopy-shut', shut, true], ['dark', shut, false], ['latched-dark', latched, false],
  ['latched-light', latched, true], ['watered', sideClosed, true], ['watered-dark', sideClosed, false],
  ['restored', sideOpen, true], ['restored-dark', sideOpen, false],
];
let restoreCases = 0;
for (const [label, state, lanternOn] of STAGE_STATES) {
  const entryRegion = region(state, lanternOn);
  for (const saved of savedPoints) {
    const resolved = nearestSafeGardenSpawn(state, lanternOn, NO_HELD_SPANS, saved);
    restoreCases += 1;
    assert.equal(isGardenPositionSafe(state, lanternOn, NO_HELD_SPANS, resolved), true, `${label}: resolved spawn ${resolved.x},${resolved.y} is not inside a solid/water`);
    assert.equal(entryRegion.has(`${gardenCellOf(resolved).i}:${gardenCellOf(resolved).j}`), true,
      `${label}: resolved spawn ${resolved.x},${resolved.y} must be reachable from the level entry (stale save from ${saved.x},${saved.y})`);
    assert.ok(resolved.y < HUD_BOTTOM - 4, `${label}: resolved spawn ${resolved.x},${resolved.y} is not hidden under the bottom HUD`);
    assert.ok(resolved.y > HUD_TOP, `${label}: resolved spawn ${resolved.x},${resolved.y} is not hidden under the top HUD`);
  }
}
// a legacy save parked in the nursery while the garden is still lit must fall back to the west lawn
assert.deepEqual(nearestSafeGardenSpawn(fresh, true, NO_HELD_SPANS, { x: 450, y: 280 }), GARDEN_STAGE_ANCHORS[0], 'a sealed nursery save restores to the lawn');
assert.deepEqual(nearestSafeGardenSpawn(fresh, true, NO_HELD_SPANS, { x: 576, y: 150 }), GARDEN_STAGE_ANCHORS[0], 'a sealed walkway save restores to the lawn');
assert.deepEqual(nearestSafeGardenSpawn(fresh, true, NO_HELD_SPANS, { x: 574, y: 64 }), GARDEN_STAGE_ANCHORS[0], 'a save past the closed shrine gate restores to the lawn');
// …but a save in the nursery with the crossing committed stays where the player was
assert.deepEqual(nearestSafeGardenSpawn(sideOpen, true, NO_HELD_SPANS, { x: 450, y: 280 }), { x: 450, y: 280 }, 'a reachable nursery save is kept');
assert.deepEqual(nearestSafeGardenSpawn(restoreMidBridgeState(), true, NO_HELD_SPANS, { x: 327, y: 232 }), { x: 238, y: 300 }, 'mid-bridge stale save returns to the lawn');
function restoreMidBridgeState() { return shut; }

// ---------------------------------------------------------------- exit gating
assert.equal(gardenExitReady(fresh), false, 'exit locked before the garden is touched');
assert.equal(gardenExitReady(shut), false, 'exit locked before the bar is latched');
assert.equal(gardenExitReady(stateOf({ canopyShut: true, sunLatched: true })), false, 'exit locked before the nursery is watered');
assert.equal(gardenExitReady(stateOf({ canopyShut: true, sunLatched: true, waterFlowing: true })), false, 'exit locked before the side path is latched');
assert.equal(gardenExitReady(stateOf({ canopyShut: true, sunLatched: true, waterFlowing: true, returnLatched: true })), false, 'exit locked before Lumo realizes');
assert.equal(gardenExitReady(stateOf({ canopyShut: true, sunLatched: true, waterFlowing: true, returnLatched: true, lumoRealized: true })), true, 'exit opens only on full completion');
assert.equal(gardenExitReady(latched), false, 'a latched bar alone never opens the exit');
assert.equal(near(region(stateOf({ canopyShut: true, sunLatched: true }), true), GARDEN_STANDS.exit, GARDEN_STANDS.exit.radius), false, 'the shrine gate stand is unreachable while both canal crossings are closed in the light');

// ---------------------------------------------------------------- art / footprint correspondence
// Every module art is drawn at native size: the placement rect IS the art box, so nothing is
// squeezed. Also asserts the layout table is truthful for the shipped initial variant and that
// a state change (moon extended) never shifts the pot sideways.
function pngSize(file) {
  const candidates = [
    path.join(ROOT, 'assets/levels/07-the-sleeping-garden/sprites', `${file}.png`),
    path.join(ROOT, 'assets/levels/shared/garden-mechanisms', `${file}.png`),
    path.join(ROOT, 'assets/levels/shared/mechanisms', `${file}.png`),
  ];
  const found = candidates.find((c) => fs.existsSync(c));
  assert.ok(found, `art file for "${file}" exists`);
  const buf = fs.readFileSync(found);
  assert.equal(buf.readUInt32BE(0), 0x89504e47, `${file}: real PNG header`);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}
function artBox(spec, variantKey, png) {
  const rect = variantKey === 'extended' && spec.extendedRect ? spec.extendedRect : spec.rect;
  if (spec.origin === 'topleft') return { x: rect.x, y: rect.y, width: png.width, height: png.height };
  if (spec.origin === 'bottom') return { x: rect.x + rect.width / 2 - png.width / 2, y: rect.y + rect.height - png.height, width: png.width, height: png.height };
  return { x: rect.x + rect.width / 2 - png.width / 2, y: rect.y + rect.height / 2 - png.height / 2, width: png.width, height: png.height };
}
let artChecks = 0;
for (const spec of GARDEN_MODULES) {
  const entries = Object.entries(spec.variants);
  for (const [variantKey, variant] of entries) {
    const png = pngSize(variant.file);
    const box = artBox(spec, variantKey, png);
    const declared = variantKey === 'extended' && spec.extendedRect ? spec.extendedRect : spec.rect;
    artChecks += 1;
    if (variantKey !== 'extended') {
      assert.deepEqual({ x: box.x, y: box.y, width: box.width, height: box.height }, { x: declared.x, y: declared.y, width: declared.width, height: declared.height },
        `${spec.id}/${variantKey}: declared art box equals the drawn native box (no stretch/squeeze)`);
    } else {
      assert.equal(box.width, png.width, `${spec.id}/${variantKey}: extended art keeps its native width`);
      assert.equal(box.x + box.width / 2, declared.x + declared.width / 2, `${spec.id}/${variantKey}: extended art stays centred on the pot`);
    }
    if (!spec.floorArt) continue;
    assert.ok(box.y + box.height <= GARDEN_BOUNDS.maxY + 12, `${spec.id}: floor art stays inside the world`);
  }
}
for (const icon of Object.values(GARDEN_ICONS)) assert.deepEqual(pngSize(icon.file), { width: 16, height: 16 }, `${icon.file} is a 16x16 state sticker`);
assert.ok(artChecks >= 24, `art/native-size checks ran ${artChecks} times`);
assert.deepEqual(pngSize('root-bridge-off'), { width: 48, height: 32 }, 'the retracted bridge stub art is 48x32');
assert.deepEqual(pngSize('side-stone-path-closed'), { width: 80, height: 32 }, 'the closed plank art is 80x32, matching GARDEN_SIDE_PATH');

// state stickers must be visible in the dark: inside their pot's clear floor, off the pot art
const iconHosts = [
  { module: 'sun-main', pot: ['sun-main'] },
  { module: 'moon-main', pot: ['moon-main'] },
  { module: 'practice-sun', pot: ['practice-sun'] },
  { module: 'practice-moon', pot: ['practice-moon'] },
];
for (const host of iconHosts) {
  const spec = GARDEN_MODULES.find((m) => m.id === host.module);
  assert.ok(spec.icon, `${host.module} declares a state sticker`);
  const box = { x: spec.icon.x - 8, y: spec.icon.y - 8, width: 16, height: 16 };
  const artBoxes = [];
  for (const id of host.pot) {
    const pot = GARDEN_MODULES.find((m) => m.id === id);
    for (const [variantKey, variant] of Object.entries(pot.variants)) {
      const png = pngSize(variant.file);
      artBoxes.push(artBox(pot, variantKey, png));
    }
  }
  for (const art of artBoxes) {
    const overlap = Math.max(0, Math.min(box.x + box.width, art.x + art.width) - Math.max(box.x, art.x))
      * Math.max(0, Math.min(box.y + box.height, art.y + art.height) - Math.max(box.y, art.y));
    assert.equal(overlap, 0, `${spec.id} state sticker never sits under its own pot art (${overlap}px)`);
  }
  assert.ok(box.y + box.height <= HUD_BOTTOM, `${spec.id} state sticker stays above the bottom HUD strip`);
  assert.ok(box.y > HUD_TOP, `${spec.id} state sticker stays below the top HUD strip`);
  // and it must sit on open floor, not on a wall / canal / obstacle footprint
  const solidsAtRest = GARDEN_STATIC_SOLIDS.map((s) => s.rect).concat(GARDEN_WATER)
    .concat(dynamicSolids(fresh, true, NO_HELD_SPANS).filter((d) => d.enabled).map((d) => d.rect));
  for (const solidRect of solidsAtRest) {
    assert.equal(rectsOverlap(box, solidRect), false, `${spec.id} state sticker is drawn on open floor, not on a solid`);
  }
}
// the practice demo pair is a side lesson: the test gap stays walkable and the lawn route around it is never blocked
assert.equal(isGardenPositionSafe(fresh, true, NO_HELD_SPANS, { x: 126, y: 306 }), true, 'the teaching gap between the practice pots is walkable (14px body fits the 22px gap)');
assert.equal(isGardenPositionSafe(fresh, true, NO_HELD_SPANS, { x: 106, y: 268 }), true, 'the lawn north of the practice pots stays open');
assert.equal(isGardenPositionSafe(fresh, true, NO_HELD_SPANS, { x: 206, y: 268 }), true, 'the lawn route past the pots stays open');
assert.equal(isGardenPositionSafe(fresh, true, NO_HELD_SPANS, { x: 206, y: 304 }), true, 'the teaching bridge line is walkable');
assert.equal(isGardenPositionSafe(fresh, true, NO_HELD_SPANS, { x: 196, y: 336 }), false, 'the wall west of the entry mouth stays solid');

// ---------------------------------------------------------------- HUD / floor contract
for (const anchor of [GARDEN_SPAWN, ...GARDEN_STAGE_ANCHORS]) {
  assert.ok(anchor.y > HUD_TOP && anchor.y < HUD_BOTTOM, `anchor ${anchor.x},${anchor.y} sits in the playable band`);
}
for (const stand of Object.values(GARDEN_STANDS)) {
  assert.ok(stand.y > HUD_TOP && stand.y < HUD_BOTTOM, `stand ${stand.x},${stand.y} sits in the playable band`);
}
assert.equal(isGardenPositionSafe(fresh, true, NO_HELD_SPANS, { x: 238, y: 342 }), true, 'the spawn mouth is walkable');
assert.equal(isGardenPositionSafe(fresh, true, NO_HELD_SPANS, { x: 640, y: 180 }), false, 'east boundary holds');
assert.equal(isGardenPositionSafe(fresh, true, NO_HELD_SPANS, { x: 574, y: 20 }), true, 'the gate opening is the way out to the north edge');
assert.equal(isGardenPositionSafe(fresh, true, NO_HELD_SPANS, { x: 546, y: 20 }), false, 'the bands flanking the gate stay solid');
assert.equal(barRaised(latched, true) && rootsDeployed(latched, true), false, 'bar up and roots out never coexist while the lantern is on');

console.log(`Sleeping Garden checks passed (${restoreCases} restore cases, ${artChecks} art boxes, ${blockDirections} 4-way block cells, ${GARDEN_REACH_STEP}px reach grid from ${GARDEN_REACH_ORIGIN.x},${GARDEN_REACH_ORIGIN.y})`);

// ---------------------------------------------------------------- repair T08
const pngDims = (file) => { const b = fs.readFileSync(path.join(ROOT, file)); return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) }; };
// practice lesson: any light change after the canopy shuts arms it; it plays only where the pots can be read; once.
assert.equal(practiceLessonArmed(true, false), true, 'armed by either direction once the canopy is shut');
assert.equal(practiceLessonArmed(false, false), false, 'an open canopy never arms it');
assert.equal(practiceLessonArmed(true, true), false, 'a committed lesson never repeats');
const farFromPots = { x: 140, y: 120 }; const atPots = { x: 120, y: 306 };
assert.equal(inGardenObservationZone(farFromPots), false); assert.equal(inGardenObservationZone(atPots), true);
assert.equal(practiceLessonDue(true, true, false, farFromPots), false, 'toggling at the gate queues the lesson instead of talking about distant plants');
assert.equal(practiceLessonDue(true, true, false, atPots), true, 'returning to the lawn plays the queued lesson');
assert.equal(practiceLessonDue(false, true, false, atPots), false, 'nothing queued, nothing plays');
assert.equal(practiceLessonDue(true, true, true, atPots), false, 'reload after the beat does not repeat it');
assert.equal(inGardenObservationZone(GARDEN_SPAWN), true, 'the entry stands inside the observation zone');
const solvedShut = stateOf({ canopyShut: true, sunLatched: true, waterFlowing: true, returnLatched: true, lumoRealized: true, bridgeCrossed: true });
const lawnRegion = gardenReachableRegion(stateOf({ canopyShut: true }), false, NO_HELD_SPANS, GARDEN_SPAWN);
assert.equal(gardenRegionReaches(lawnRegion, { x: 120, y: 306 }, 8), true, 'pots are reachable from the entry in the shut-canopy state');
// guided route both directions: leaving the lawn to the gate and coming back crosses the observation zone (sluice -> lawn -> forecourt).
const gateRegion = gardenReachableRegion(stateOf({ canopyShut: true }), true, NO_HELD_SPANS, GARDEN_SPAWN);
assert.equal(gardenRegionReaches(gateRegion, { x: 132, y: 132 }, 6), true, 'gate corridor reachable from the entry');
assert.ok(GARDEN_OBSERVATION_ZONE.y + GARDEN_OBSERVATION_ZONE.height <= HUD_BOTTOM + 28 && GARDEN_OBSERVATION_ZONE.y > HUD_TOP, 'zone sits between the HUD rows');
// gate bar: posts sort by their feet, only the beam is overhead while raised.
const postSolids = ['bar-post-west', 'bar-post-east'].map((id) => GARDEN_STATIC_SOLIDS.find((s) => s.id === id).rect);
assert.equal(GARDEN_BAR_POSTS.length, 2);
for (const [i, post] of GARDEN_BAR_POSTS.entries()) {
  const solid = postSolids[i];
  assert.ok(solid.x - GARDEN_BAR_SPRITE.x >= post.crop.x && solid.x + solid.width - GARDEN_BAR_SPRITE.x <= post.crop.x + post.crop.width, `post crop ${post.id} covers its solid column`);
  assert.equal(solid.y + solid.height, GARDEN_BAR_SPRITE.y + GARDEN_BAR_SPRITE.height, 'post solid bottom = sprite bottom = depth anchor');
  assert.equal(post.crop.y, GARDEN_BAR_BEAM_ROWS, 'post crop starts under the beam rows');
}
assert.deepEqual(pngDims('assets/levels/07-the-sleeping-garden/sprites/gate-bar-raised.png'), { width: GARDEN_BAR_SPRITE.width, height: GARDEN_BAR_SPRITE.height }, 'gate bar sprite matches its authored rect');
// retracted gap art and Shadow poses exist at their native sizes (no stretching).
assert.deepEqual(pngDims('assets/levels/shared/garden-mechanisms/root-bridge-missing.png'), { width: 48, height: 32 });
for (const pose of ['walk-right', 'shielding']) assert.deepEqual(pngDims(`assets/levels/shared/characters/the-shadow/sprites/${pose}.png`), { width: 48, height: 64 }, `${pose} native size`);
// scenario §7 silhouette: every waypoint is open floor in the solved state, ends near the seedlings, and fades by the gate pillar.
const shadowPoints = [GARDEN_SHADOW_PATH.appear, ...GARDEN_SHADOW_PATH.toSeedlings, ...GARDEN_SHADOW_PATH.back];
for (const point of shadowPoints) assert.equal(isGardenPositionSafe(solvedShut, true, NO_HELD_SPANS, point), true, `shadow waypoint ${JSON.stringify(point)} is open floor`);
const stop = GARDEN_SHADOW_PATH.toSeedlings.at(-1);
assert.ok(Math.hypot(stop.x - 500, stop.y - 264) <= 36, 'the silhouette stops beside the seedlings');
assert.ok(Math.hypot(GARDEN_SHADOW_PATH.appear.x - GARDEN_STANDS.exit.x, GARDEN_SHADOW_PATH.appear.y - GARDEN_STANDS.exit.y) <= 40, 'it appears at the shrine gate');
console.log('Sleeping Garden T08 checks passed (lesson timing, bar posts, gap art, silhouette path)');
