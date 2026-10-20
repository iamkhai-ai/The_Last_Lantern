import assert from 'node:assert/strict';
import { bodyRect, canApproach, canCompleteCreek, creekCenterWalkable, deriveCreekState, migrateV1Creek, reflect, resolveCreekSpawn, SHATTERED_CREEK, traceRay, unsafePowerChange } from '../src/data/shatteredCreekLayout.ts';

const base = { source: 'main', lanternOn: true, g1: 2, g2: 1, g3: 2, practice: 2, practiceComplete: true, latchA: false, latchB: false, memo: false, lanternRetrieved: false };
assert.deepEqual(['east', 'north', 'west', 'south'].map((d) => reflect(d, 0)), [null, 'south', null, 'north']);
assert.deepEqual(['east', 'north', 'west', 'south'].map((d) => reflect(d, 1)), ['south', 'west', 'north', 'east']);
assert.deepEqual(['east', 'north', 'west', 'south'].map((d) => reflect(d, 2)), ['north', 'east', 'south', 'west']);

const a = deriveCreekState(base); assert.equal(a.eyeA, true); assert.equal(a.eyeB, false); assert.equal(a.bridgeA, true); assert.equal(a.bridgeB, false);
assert.deepEqual(a.mainSegments.map((s) => s.hit), ['g1', 'g2', 'eyeA']);
const b = deriveCreekState({ ...base, g2: 2 }); assert.equal(b.eyeA, false); assert.equal(b.eyeB, true); assert.deepEqual(b.mainSegments.map((s) => s.hit), ['g1', 'g2', 'g3', 'eyeB']);
assert.equal(deriveCreekState({ ...base, g1: 0, g2: 2 }).eyeB, false, 'B route must pass through G1');
assert.equal(deriveCreekState({ ...base, source: null }).eyeA, false);
assert.equal(deriveCreekState({ ...base, lanternOn: false }).eyeA, false);
const practice = deriveCreekState({ ...base, source: 'practice', practice: 2, practiceComplete: false }); assert.equal(practice.practiceLit, true); assert.equal(practice.eyeA, false);
assert.equal(deriveCreekState({ ...base, source: 'practice', practice: 1 }).practiceLit, false);
assert.deepEqual(deriveCreekState({ ...base, source: null }).practiceSegments, []);

const walkLive = { ...a, bridgeA: true, bridgeB: true };
for (const centerY of [214, 229, 244]) {
  assert.equal(creekCenterWalkable({ x: 274, y: centerY }, walkLive), true, `A crossing body center y=${centerY}`);
  assert.equal(creekCenterWalkable({ x: 426, y: centerY }, walkLive), true, `B crossing body center y=${centerY}`);
}
assert.equal(creekCenterWalkable({ x: 274, y: 212 }, walkLive), false, 'cannot step around A north end');
assert.equal(creekCenterWalkable({ x: 426, y: 245 }, walkLive), false, 'cannot step around B south end');
assert.equal(creekCenterWalkable({ x: 274, y: 229 }, { ...walkLive, bridgeA: false }), false);
assert.equal(creekCenterWalkable({ x: 426, y: 229 }, { ...walkLive, bridgeB: false }), false);
assert.equal(creekCenterWalkable({ x: 350, y: 100 }, a), true);
assert.equal(creekCenterWalkable({ x: 350, y: 100 }, a, [{ x: 345, y: 100, width: 10, height: 20 }]), false);
assert.equal(creekCenterWalkable({ x: 18, y: 100 }, walkLive), false, 'whole body must remain inside left bounds');
assert.equal(creekCenterWalkable({ x: 622, y: 100 }, walkLive), false, 'whole body must remain inside right bounds');
assert.deepEqual(bodyRect({ x: 274, y: 229 }), { x: 267, y: 245, width: 14, height: 6 });
assert.equal(creekCenterWalkable({ x: 540, y: 264 }, walkLive), false, 'body cannot overlap exit sidepost');

for (const stand of [SHATTERED_CREEK.spawn, ...Object.values(SHATTERED_CREEK.objects).filter((o) => 'stand' in o).map((o) => o.stand)]) {
  assert.equal(creekCenterWalkable(stand, walkLive), true, `walkable authored stand ${JSON.stringify(stand)}`);
}
assert.equal(canApproach({ x: 68, y: 286 }, SHATTERED_CREEK.objects.practiceSource.stand, 'west'), true);
assert.equal(canApproach({ x: 68, y: 286 }, SHATTERED_CREEK.objects.source.stand, 'west'), false, 'initial E zone selects only practice source');
assert.equal(canApproach({ x: 350, y: 150 }, SHATTERED_CREEK.objects.latchA.stand, 'west'), false);
for (const x of [251, 259, 267, 275, 283, 291, 297]) {
  assert.equal(creekCenterWalkable({ x, y: 244 }, walkLive), true, `sampled A crossing center x=${x}`);
  assert.equal(creekCenterWalkable({ x: x + 152, y: 244 }, walkLive), true, `sampled B crossing center x=${x + 152}`);
}
const pathIsWalkable = (waypoints) => waypoints.slice(1).every((to, i) => {
  const from = waypoints[i]; const steps = Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 4);
  return Array.from({ length: steps + 1 }, (_, n) => ({ x: from.x + (to.x - from.x) * n / steps, y: from.y + (to.y - from.y) * n / steps })).every((center) => creekCenterWalkable(center, walkLive));
});
assert.equal(pathIsWalkable([{ x: 68, y: 286 }, { x: 100, y: 288 }, { x: 100, y: 229 }, { x: 76, y: 229 }, SHATTERED_CREEK.objects.source.stand]), true, 'practice-to-main detour clears the pedestal');
assert.equal(pathIsWalkable([{ x: 76, y: 229 }, { x: 202, y: 229 }, SHATTERED_CREEK.objects.g1.stand, { x: 168, y: 205 }, { x: 168, y: 139 }, SHATTERED_CREEK.objects.g2.stand, { x: 168, y: 139 }, { x: 168, y: 205 }, { x: 224, y: 205 }, SHATTERED_CREEK.objects.latchA.stand]), true, 'west puzzle route clears G1 and reaches latch A');
assert.equal(pathIsWalkable([SHATTERED_CREEK.objects.latchA.stand, { x: 228, y: 229 }, { x: 350, y: 229 }, { x: 320, y: 229 }, { x: 320, y: 139 }, SHATTERED_CREEK.objects.g3.stand, { x: 320, y: 139 }, { x: 320, y: 229 }, { x: 350, y: 229 }, SHATTERED_CREEK.objects.latchB.stand]), true, 'island route clears bridge and G3/receiver bases');
// The relief panel and the exit arch are solid: the route reads the relief from its south face, then goes around the
// arch through the strip in front of it (the arch body can no longer be walked through) and up to the steps.
assert.equal(pathIsWalkable([SHATTERED_CREEK.objects.latchB.stand, { x: 374, y: 229 }, { x: 480, y: 229 }, { x: 480, y: 188 }, SHATTERED_CREEK.objects.relief.stand, { x: 500, y: 188 }, { x: 500, y: 288 }, { x: 568, y: 288 }, SHATTERED_CREEK.objects.exit.stand]), true, 'east route clears relief and reaches the exit steps from the front strip');
assert.equal(creekCenterWalkable({ x: 546, y: 140 }, walkLive), false, 'the relief panel blocks its whole footprint');
assert.equal(creekCenterWalkable({ x: 546, y: 188 }, walkLive), true, 'the relief stand in front of the panel stays walkable');
assert.equal(creekCenterWalkable({ x: 568, y: 240 }, walkLive), false, 'the exit arch body cannot be walked into');
assert.equal(pathIsWalkable([{ x: 568, y: 188 }, { x: 568, y: 286 }]), false, 'the exit cannot be reached by walking through the arch');
assert.equal(creekCenterWalkable(SHATTERED_CREEK.objects.exit.stand, walkLive), true, 'the exit stand in front of the steps stays walkable');

const noA = deriveCreekState({ ...base, lanternOn: false });
assert.equal(unsafePowerChange({ x: 274, y: 229 }, a, noA), 'occupied-bridge');
assert.equal(unsafePowerChange({ x: 426, y: 229 }, { ...a, bridgeB: true }, { ...noA, bridgeB: false }), 'occupied-bridge');
assert.equal(unsafePowerChange({ x: 350, y: 150 }, { ...a, bridgeA: true }, { ...a, bridgeA: false }), 'stranded-island');
assert.equal(unsafePowerChange({ x: 500, y: 150 }, { ...a, bridgeA: true }, { ...a, bridgeA: false }), 'stranded-east', 'B cannot mask loss of west return');
assert.equal(unsafePowerChange({ x: 500, y: 150 }, { ...a, bridgeB: true }, { ...a, bridgeB: false }), 'stranded-east', 'A cannot mask loss of east return');
assert.equal(unsafePowerChange({ x: 100, y: 150 }, a, noA), null, 'safe west toggles remain allowed');

assert.deepEqual(resolveCreekSpawn({ x: 274, y: 240 }, noA), SHATTERED_CREEK.spawn);
assert.deepEqual(resolveCreekSpawn({ x: 350, y: 150 }, noA), SHATTERED_CREEK.spawn, 'stale island save without A returns west');
assert.deepEqual(resolveCreekSpawn({ x: 500, y: 150 }, noA), SHATTERED_CREEK.spawn, 'stale east save without bridges returns west');
const committedA = deriveCreekState({ ...base, source: null, latchA: true });
assert.deepEqual(resolveCreekSpawn({ x: 350, y: 150 }, committedA), { x: 350, y: 150 });
const committedBoth = deriveCreekState({ ...base, source: null, latchA: true, latchB: true });
assert.ok(resolveCreekSpawn({ x: 500, y: 150 }, committedBoth).x >= 456, 'completed east save resolves to a safe east checkpoint');
assert.notDeepEqual(resolveCreekSpawn({ x: 540, y: 264 }, committedBoth), { x: 540, y: 264 }, 'completed save inside an exit post is relocated');

const oldPractice = { flags: { 'l3-lantern-placed': true, 'l3-lamp-source': 'practice', 'l3-lantern-retrieved': false }, counters: { g2: 3, 'l3-practice': 2 }, lanternOn: false };
assert.equal(migrateV1Creek(oldPractice).source, 'practice'); assert.equal(migrateV1Creek(oldPractice).lanternOn, false); assert.equal(migrateV1Creek(oldPractice).g2, 2);
oldPractice.counters.g2 = 2; assert.equal(migrateV1Creek(oldPractice).g2, 2, 'migration is idempotent');
const oldMain = { flags: { 'l3-lantern-placed': true }, counters: { g2: 2 }, lanternOn: true }; assert.equal(migrateV1Creek(oldMain).source, 'main');
const oldRetrieved = { flags: { 'l3-lantern-placed': true, 'l3-lantern-retrieved': true }, counters: {}, lanternOn: true }; assert.equal(migrateV1Creek(oldRetrieved).source, null);
const oldMiss = { flags: {}, counters: { g2: 2 }, lanternOn: true }; assert.equal(migrateV1Creek(oldMiss).g2, 0); assert.equal(migrateV1Creek(oldMiss).g2, 0);

const complete = { ...base, source: null, latchA: true, latchB: true, lanternRetrieved: true, memo: true };
assert.equal(canCompleteCreek(complete), true);
for (const change of [{ source: 'main' }, { source: 'practice' }, { latchA: false }, { latchB: false }, { lanternRetrieved: false }, { memo: false }]) assert.equal(canCompleteCreek({ ...complete, ...change }), false, `completion gate rejects ${JSON.stringify(change)}`);
assert.equal(deriveCreekState({ ...base, latchA: true, latchB: true }).step, 'retrieve');
assert.equal(deriveCreekState({ ...base, source: 'practice', practiceComplete: true }).step, 'pickup');
assert.equal(deriveCreekState({ ...base, source: null, lanternRetrieved: true, latchA: true }).step, 'main');
assert.equal(deriveCreekState({ ...base, source: 'practice', latchA: true, lanternRetrieved: true }).step, 'pickup', 'practice lamp must be retrieved before main routing resumes');
assert.equal(deriveCreekState({ ...base, source: null, latchA: true, lanternRetrieved: true }).step, 'main', 'held lamp must be placed back on the main source before rerouting');
assert.equal(deriveCreekState({ ...base, source: 'main', latchA: true, lanternRetrieved: false }).step, 'reroute', 'main source identity resumes the reroute stage');
assert.notEqual(deriveCreekState({ ...base, latchA: true, source: 'main' }).step, 'practice', 'latched partial saves must not fall back to tutorial');
console.log('Shattered Creek geometry, route, state, migration, spawn and completion checks passed');
