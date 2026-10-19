import assert from 'node:assert/strict';
import { canCompleteTower, deriveTowerLive, getTowerExitBlock, isLumoAtSeal, migrateTowerProgress, overlaps, resolveTowerSpawn, towerBodyRect, towerCanApproach, towerCanApproachFront, towerCenterWalkable, TOWER, TOWER_SOLIDS } from '../src/data/towerLayout.ts';

const seal = { x: 350, y: 290 };
const base = { source: 'main', lanternOn: true, g0: 0, g1: 2, g2: 1, practice: 1, practiceDone: true, lanternRetrieved: false, waterReturned: false, crystal: false, recordRead: false, reunited: false, lumoAssign: 'at-c' };
const atSeal = (state) => deriveTowerLive(state, seal);

assert.deepEqual(towerBodyRect({ x: 350, y: 272 }), { x: 343, y: 288, width: 14, height: 6 });
assert.equal(TOWER_SOLIDS.length, 15, 'fourteen prop bases plus the chamber body');
assert.ok(TOWER_SOLIDS.some((solid) => solid.width === 80 && solid.height === 104), 'chamber body is solid');

const split = atSeal(base);
assert.equal(split.liveA, true); assert.equal(split.liveB, true); assert.equal(split.liveC, true); assert.equal(split.canSwitch, true);
assert.ok(split.beams.some((beam) => beam.live && beam.to.x === 460 && beam.to.y === 162), 'live beam reaches eye A');
assert.ok(split.beams.some((beam) => beam.live && beam.to.x === TOWER.objects.eyeB.optical.x && beam.to.y === TOWER.objects.eyeB.optical.y), 'live beam reaches eye B');
const directA = atSeal({ ...base, g0: 1 });
assert.equal(directA.liveA, true); assert.equal(directA.liveB, false); assert.equal(directA.canSwitch, false);
assert.ok(!directA.beams.some((beam) => beam.to.x === TOWER.objects.eyeB.optical.x && beam.to.y === TOWER.objects.eyeB.optical.y), 'direct A does not light B');
const directB = atSeal({ ...base, g0: 2 });
assert.equal(directB.liveB, true); assert.equal(directB.liveA, false);
assert.equal(atSeal({ ...base, g1: 1 }).liveA, false, 'splitter A requires G1 pose 2');
assert.equal(atSeal({ ...base, g2: 2 }).liveB, false, 'splitter B requires G2 pose 1');
assert.equal(atSeal({ ...base, source: null }).liveA, false);
assert.equal(atSeal({ ...base, lanternOn: false }).canSwitch, false);
assert.equal(atSeal({ ...base, waterReturned: true }).canSwitch, false, 'switch is one-time');
const dormant = atSeal({ ...base, waterReturned: true });
assert.equal(dormant.liveA, false, 'optics go dormant after Return Flow');
assert.equal(dormant.liveB, false, 'optics go dormant after Return Flow');
assert.ok(dormant.beams.length > 0 && dormant.beams.every((beam) => !beam.live), 'dormant optics keep the routing drawn but unlit');
assert.equal(atSeal({ ...base, source: 'practice', practice: 1, waterReturned: true }).practiceLit, false, 'the bench is dormant too');
assert.equal(deriveTowerLive({ ...base, lumoAssign: 'follow' }, seal).liveC, false, 'seal needs the assignment');
assert.equal(deriveTowerLive({ ...base, lumoAssign: 'to-c' }, seal).liveC, false, 'travelling Lumo does not seal');
assert.equal(deriveTowerLive({ ...base, lumoAssign: 'at-c' }, { x: 350, y: 282 }).liveC, true, 'edge of seal tolerance');
assert.equal(deriveTowerLive({ ...base, lumoAssign: 'at-c' }, { x: 350, y: 281 }).liveC, false, 'beyond seal tolerance');
assert.equal(deriveTowerLive({ ...base, lumoAssign: 'at-c' }, undefined).liveC, false);
assert.equal(isLumoAtSeal('at-c', { x: 358, y: 290 }), true); assert.equal(isLumoAtSeal('at-c', { x: 359, y: 290 }), false);

const benchOn = deriveTowerLive({ ...base, source: 'practice', practice: 1 }, undefined);
assert.equal(benchOn.practiceLit, true); assert.equal(benchOn.liveA, false);
assert.equal(benchOn.beams.filter((beam) => beam.kind === 'practice' && beam.live).length, 4, 'feed, input and both eyes');
assert.equal(deriveTowerLive({ ...base, source: 'practice', practice: 2 }, undefined).practiceLit, false);
assert.deepEqual(deriveTowerLive({ ...base, source: 'practice', practice: 2 }, undefined).beams.at(-1).to, { x: 140, y: 175 }, 'the dead bench stub follows the shown mirror toward its pedestal');
assert.equal(deriveTowerLive({ ...base, source: 'practice', practice: 0 }, undefined).beams.filter((beam) => beam.live).length, 1, 'misaligned input only feeds the mirror');
assert.equal(deriveTowerLive({ ...base, source: null }, undefined).beams.length, 0);

assert.equal(atSeal({ ...base, source: null, lanternRetrieved: true, practiceDone: false }).step, 'practice');
assert.equal(atSeal({ ...base, source: 'practice', practiceDone: false }).step, 'practice');
assert.equal(atSeal({ ...base, source: 'practice', practiceDone: true }).step, 'place');
assert.equal(atSeal({ ...base, source: null, lanternRetrieved: true, practiceDone: true }).step, 'place');
assert.equal(atSeal({ ...base, g1: 0 }).step, 'main');
assert.equal(atSeal({ ...base, lumoAssign: 'follow' }).step, 'call');
assert.equal(split.step, 'switch');
assert.equal(atSeal({ ...base, waterReturned: true }).step, 'retrieve');
assert.equal(atSeal({ ...base, waterReturned: true, source: null, lanternRetrieved: true }).step, 'crystal');
assert.equal(atSeal({ ...base, waterReturned: true, source: null, lanternRetrieved: true, crystal: true }).step, 'record');
assert.equal(atSeal({ ...base, waterReturned: true, source: null, lanternRetrieved: true, crystal: true, recordRead: true }).step, 'recall');
assert.equal(atSeal({ ...base, waterReturned: true, source: null, lanternRetrieved: true, crystal: true, recordRead: true, reunited: true }).step, 'exit');

const done = { source: null, lanternOn: true, g0: 0, g1: 0, g2: 0, practice: 0, practiceDone: true, lanternRetrieved: true, waterReturned: true, crystal: true, recordRead: true, reunited: true, lumoAssign: 'follow' };
assert.equal(canCompleteTower(done), true); assert.equal(getTowerExitBlock(done), null);
assert.equal(getTowerExitBlock({ ...done, waterReturned: false }), 'power');
assert.equal(getTowerExitBlock({ ...done, source: 'main', lanternRetrieved: false }), 'lamp');
assert.equal(getTowerExitBlock({ ...done, crystal: false }), 'crystal');
assert.equal(getTowerExitBlock({ ...done, recordRead: false }), 'record');
assert.equal(getTowerExitBlock({ ...done, reunited: false }), 'companion');
assert.equal(canCompleteTower({ ...done, source: 'practice' }), false);

for (const stand of [TOWER.spawn, TOWER.stairsStand, ...Object.values(TOWER.objects).filter((o) => 'stand' in o).map((o) => o.stand)]) {
  assert.equal(towerCenterWalkable(stand), true, `walkable authored stand ${JSON.stringify(stand)}`);
}
assert.equal(towerCenterWalkable({ x: 600, y: 250 }), false, 'chamber body blocks approach from the north');
assert.equal(towerCenterWalkable({ x: 309, y: 262 }), false, 'G2 base blocks its own footprint');
assert.equal(towerCenterWalkable({ x: 18, y: 150 }), false, 'west bound');
assert.equal(towerCenterWalkable({ x: 622, y: 150 }), false, 'east bound');
assert.equal(towerCenterWalkable({ x: 350, y: 100 }), true);
assert.equal(towerCenterWalkable({ x: 350, y: 100 }, [{ x: 344, y: 114, width: 12, height: 10 }]), false, 'injected obstacle blocks');
assert.equal(overlaps({ x: 0, y: 0, width: 2, height: 2 }, { x: 2, y: 0, width: 2, height: 2 }), false, 'touching edges do not overlap');

const sampled = (waypoints) => waypoints.slice(1).every((to, i) => {
  const from = waypoints[i]; const steps = Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 4);
  return Array.from({ length: steps + 1 }, (_, n) => ({ x: from.x + (to.x - from.x) * n / steps, y: from.y + (to.y - from.y) * n / steps })).every((center) => towerCenterWalkable(center));
});
assert.equal(sampled([{ x: 135, y: 272 }, { x: 60, y: 272 }, { x: 60, y: 205 }, TOWER.objects.benchSource.stand]), true, 'spawn reaches the bench source');
assert.equal(sampled([{ x: 135, y: 272 }, { x: 60, y: 272 }, { x: 60, y: 205 }, TOWER.objects.benchMirror.stand]), true, 'bench mirror is approachable along the west lane');
assert.equal(sampled([{ x: 135, y: 272 }, TOWER.objects.source.stand, TOWER.objects.g0.stand]), true, 'main lamp and G0 stands connect');
assert.equal(sampled([TOWER.objects.g0.stand, TOWER.objects.g1.stand]), true, 'G1 stand is reachable without entering the prism base');
assert.equal(sampled([TOWER.objects.g1.stand, { x: 275, y: 246 }, { x: 330, y: 246 }, { x: 330, y: 282 }, TOWER.objects.g2.stand]), true, 'G2 stand is reachable past the call pedestal');
assert.equal(sampled([TOWER.objects.g2.stand, { x: 340, y: 285 }, { x: 500, y: 285 }, TOWER.objects.lever.stand]), true, 'lever is reachable around receiver B');
assert.equal(sampled([TOWER.objects.lever.stand, { x: 545, y: 275 }, { x: 570, y: 285 }, TOWER.objects.chamber.stand]), true, 'chamber stand is reachable through the south lane');
assert.equal(sampled([TOWER.objects.chamber.stand, { x: 520, y: 288 }, { x: 518, y: 196 }, TOWER.objects.record.stand]), true, 'record stand is reachable past the lever base');
assert.equal(sampled([{ x: 135, y: 272 }, TOWER.objects.call.stand]), true, 'call pedestal is reachable along the south lane under the G2 base');
assert.equal(sampled([TOWER.objects.call.stand, { x: 340, y: 288 }, { x: 150, y: 288 }, TOWER.stairsStand]), true, 'stairs are reachable along the south lane');
assert.equal(sampled([{ x: 135, y: 272 }, TOWER.stairsStand]), true, 'stairs connect to spawn');
assert.equal(sampled([{ x: 135, y: 272 }, { x: 350, y: 272 }]), true, 'G2 front lane keeps the straight south lane open');
assert.equal(towerCanApproach({ x: 350, y: 272 }, TOWER.objects.call.stand), true);
assert.equal(towerCanApproach({ x: 100, y: 272 }, TOWER.objects.call.stand), false, 'E range is local');

assert.deepEqual(resolveTowerSpawn(undefined), TOWER.spawn);
assert.deepEqual(resolveTowerSpawn({ x: 200, y: 150 }), { x: 200, y: 150 });
assert.deepEqual(resolveTowerSpawn({ x: 600, y: 250 }), TOWER.spawn, 'a save inside the chamber relocates to spawn');

const legacy = { flags: { 'l5-lantern-placed': true, 'l5-called-high': true }, counters: { 'tower-g0': 2, 'tower-g1': 1, 'tower-g2': 3 }, lanternOn: true };
const migrated = migrateTowerProgress(legacy);
assert.equal(migrated.g0, 0); assert.equal(migrated.g1, 2); assert.equal(migrated.g2, 1);
assert.equal(migrated.source, 'main'); assert.equal(deriveTowerLive(migrated, seal).canSwitch, true, 'legacy working configuration resumes the seal');
const again = migrateTowerProgress(legacy);
assert.equal(again.g0, 0); assert.equal(again.g1, 2); assert.equal(again.g2, 1, 'migration is idempotent');
const partial = migrateTowerProgress({ flags: { 'l5-lantern-placed': true, 'l5-lantern-retrieved': false, 'l5-lamp-source': 'practice' }, counters: { 'tower-g0': 1, 'tower-g1': 0, 'tower-g2': 2 }, lanternOn: false });
assert.equal(partial.source, 'practice'); assert.equal(partial.g0, 0); assert.equal(partial.g1, 0); assert.equal(partial.g2, 0, 'unknown legacy poses normalize to neutral');
const switched = migrateTowerProgress({ flags: { 'l5-power': true, 'l5-called-high': true }, counters: {}, lanternOn: true });
assert.equal(switched.waterReturned, true); assert.equal(switched.lumoAssign, 'at-c');
assert.equal(migrateTowerProgress({ flags: {}, counters: {}, lanternOn: true }).waterReturned, false);
assert.equal(migrateTowerProgress({ flags: { 'l5-lantern-placed': true, 'l5-lantern-retrieved': true }, counters: {}, lanternOn: true }).source, null);

// T07: standing props answer E from their south face only (raw foot-body probes, all four sides).
const g2 = TOWER.objects.g2;
const g2Probe = (center) => towerCanApproachFront(center, g2.stand, g2.base);
const baseBottom = g2.base.y + g2.base.height;
const north = { x: g2.stand.x, y: g2.base.y - 22 };
const east = { x: g2.base.x + g2.base.width + 7, y: g2.base.y - 14 };
const west = { x: g2.base.x - 7, y: east.y };
const south = { x: g2.stand.x, y: baseBottom - 16 + 2 };
assert.equal(towerCenterWalkable(north) && towerCenterWalkable(east) && towerCenterWalkable(west) && towerCenterWalkable(south), true, 'all four G2 probes are real walkable positions');
assert.ok(towerBodyRect(north).y + towerBodyRect(north).height <= g2.base.y, 'north probe body sits above the base');
assert.ok(towerBodyRect(east).x >= g2.base.x + g2.base.width && towerBodyRect(east).y < baseBottom, 'east probe body is beside the base');
assert.ok(towerBodyRect(west).x + towerBodyRect(west).width <= g2.base.x && towerBodyRect(west).y < baseBottom, 'west probe body is beside the base');
assert.equal(towerCanApproach(north, g2.stand), true, 'range alone would accept the north probe, so the front rule is what blocks it');
assert.equal(g2Probe(north), false, 'G2 north does not answer E'); assert.equal(g2Probe(east), false, 'G2 east does not answer E'); assert.equal(g2Probe(west), false, 'G2 west does not answer E');
assert.equal(g2Probe(south), true, 'G2 south answers E'); assert.equal(g2Probe(g2.stand), true, 'G2 stand answers E');
// every prop with a footprint: the stand sits at or below the front edge, and its four-side probes behave the same way.
const standingProps = ['benchSource', 'benchMirror', 'source', 'g0', 'g1', 'g2', 'call', 'lever'].map((id) => [id, TOWER.objects[id]]);
standingProps.push(['chamber', { stand: TOWER.objects.chamber.stand, base: TOWER.objects.chamber.solid }]);
for (const [id, prop] of standingProps) {
  assert.equal(towerCanApproachFront(prop.stand, prop.stand, prop.base), true, `${id} stand answers E`);
  const n = { x: prop.stand.x, y: prop.base.y - 22 };
  if (towerCenterWalkable(n)) assert.equal(towerCanApproachFront(n, prop.stand, prop.base), false, `${id} north does not answer E`);
}
// RULE_GAMES §1 x-span: beside a standing prop (footprint centre +/- (width/2 + 10) at the stand's row) E stays closed.
// Obstacles are dropped so the front rule decides; where the probe is within E range, it must be walkable and in range first.
for (const [id, prop] of standingProps) {
  const reach = prop.base.width / 2 + 10;
  for (const x of [prop.stand.x - reach, prop.stand.x + reach]) {
    const probe = { x, y: prop.stand.y };
    if (reach <= TOWER.interactionRange) assert.equal(towerCanApproach(probe, prop.stand, []), true, `${id} side probe at x=${x} is in range and in bounds`);
    assert.equal(towerCanApproachFront(probe, prop.stand, prop.base, []), false, `${id} side probe at x=${x} does not answer E`);
  }
}
// lever side spot from the review: (553,240) is 2px past the footprint's east edge (x=551) and stays closed; the 1px edge (552) answers.
const lever = TOWER.objects.lever;
assert.equal(towerCanApproach({ x: 553, y: 240 }, lever.stand), true, 'lever side spot is in range and walkable');
assert.equal(towerCanApproachFront({ x: 553, y: 240 }, lever.stand, lever.base), false, 'lever E is closed from the east side at (553,240)');
assert.equal(towerCanApproachFront({ x: 552, y: 240 }, lever.stand, lever.base), true, 'lever E answers at the 1px east edge');
assert.equal(towerCanApproachFront({ x: 527, y: 240 }, lever.stand, lever.base), false, 'lever E is closed from the west side at (527,240)');
// usable standing space in front of G2: at least 24px of walkable depth between its front edge and the south bound (layout contract).
const southBound = TOWER.bounds.y + TOWER.bounds.height;
assert.ok(southBound - baseBottom >= 24 + towerBodyRect(g2.stand).height, 'G2 keeps 24px of standing space in front of it');
const frontCenters = [];
for (let y = baseBottom - 22; y <= southBound; y += 1) if (towerCenterWalkable({ x: g2.stand.x, y }) && g2Probe({ x: g2.stand.x, y })) frontCenters.push(y);
assert.ok(frontCenters.length >= 12, `G2 front window is usable (${frontCenters.length}px)`);
// optics relation is preserved after the lift: branch B stays on one row with receiver B, directly under the prism right port.
assert.equal(g2.optical.x, TOWER.objects.prism.right.x, 'G2 sits under the prism right port');
assert.equal(g2.optical.y, TOWER.objects.eyeB.optical.y, 'G2 and receiver B share the beam row');
// record panel: the stand clears the chamber body and the lever base and stays in front of the panel (panel art y140..172).
const record = TOWER.objects.record.stand;
assert.equal(towerCenterWalkable(record), true, 'record stand walkable');
assert.ok(towerBodyRect(record).y > 172, 'record prompt sits in front of the panel art');
assert.equal(towerCanApproach({ x: record.x, y: record.y }, record), true);
assert.equal(sampled([TOWER.objects.chamber.stand, { x: 520, y: 288 }, { x: 518, y: 196 }, record]), true, 'record stand reachable');
console.log('Sleepless Tower optics, seal, steps, gates, geometry, routes, spawn and migration checks passed');
