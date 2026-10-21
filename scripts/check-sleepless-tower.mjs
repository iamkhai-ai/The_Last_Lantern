import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { canCompleteTower, deriveTowerLive, getTowerExitBlock, isLumoAtSeal, migrateTowerProgress, overlaps, resolveTowerSpawn, towerBodyRect, towerCanApproach, towerCanApproachFront, towerCenterWalkable, TOWER, TOWER_SOLIDS } from '../src/data/towerLayout.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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
// Flood-fill the actual foot body against solids expanded by 1px. A route that only
// threads an exact centre line through a body-width gap is deliberately rejected.
const clearance = 1;
const clearSolids = TOWER_SOLIDS.map((solid) => ({
  x: solid.x - clearance, y: solid.y - clearance,
  width: solid.width + clearance * 2, height: solid.height + clearance * 2,
}));
const stride = TOWER.bounds.x + TOWER.bounds.width + 1;
const keyOf = ({ x, y }) => y * stride + x;
const reachable = new Uint8Array(stride * (TOWER.bounds.y + TOWER.bounds.height + 1));
const queue = [keyOf(TOWER.objects.chamber.stand)];
reachable[queue[0]] = 1;
for (let head = 0; head < queue.length; head++) {
  const key = queue[head];
  const center = { x: key % stride, y: Math.floor(key / stride) };
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const next = { x: center.x + dx, y: center.y + dy };
    if (!towerCenterWalkable(next, clearSolids)) continue;
    const nextKey = keyOf(next);
    if (!reachable[nextKey]) { reachable[nextKey] = 1; queue.push(nextKey); }
  }
}
const recordStand = TOWER.objects.record.stand;
assert.equal(reachable[keyOf(recordStand)], 1, 'record stand is flood-fill reachable from chamber with 1px clearance');
const slitCenter = (TOWER.objects.lever.base.x + TOWER.objects.lever.base.width + TOWER.objects.chamber.solid.x) / 2;
assert.ok(Math.abs(recordStand.x - slitCenter) <= TOWER.interactionRange, 'relocated stand stays inside the previous record prompt region');
let clearPromptCells = 0;
for (let x = recordStand.x - TOWER.interactionRange; x <= recordStand.x + TOWER.interactionRange; x++) {
  for (let y = recordStand.y - TOWER.interactionRange; y <= recordStand.y + TOWER.interactionRange; y++) {
    const point = { x, y };
    if (!towerCanApproach(point, recordStand, clearSolids)) continue;
    assert.equal(reachable[keyOf(point)], 1, 'every clear record prompt cell connects to the chamber stand');
    clearPromptCells++;
  }
}
const foot = towerBodyRect(recordStand);
const westApproachX = TOWER.objects.lever.base.x - foot.width / 2 - clearance - 3;
for (const offset of [-3, 0, 3]) {
  // Equivalent for option (b): approach west of the lever rather than demanding the
  // old exact x in the lever/chamber slit. The whole vertical approach tolerates drift.
  for (let y = recordStand.y; y <= TOWER.objects.chamber.stand.y; y++) {
    const point = { x: westApproachX + offset, y };
    assert.equal(towerCenterWalkable(point, clearSolids), true, `west record approach tolerates x offset ${offset} at y=${y}`);
    assert.equal(reachable[keyOf(point)], 1, 'west approach is connected to the chamber');
  }
  const point = { x: recordStand.x + offset, y: recordStand.y };
  assert.equal(reachable[keyOf(point)], 1, `record stand tolerates x offset ${offset}`);
  assert.equal(towerCanApproach(point, recordStand), true, 'clear approach stays within the record prompt');
}
console.log(`Sleepless Tower record clearance passed (${queue.length} reachable cells; ${clearPromptCells} clear prompt cells; west approach tolerates +/-3px).`);
assert.equal(sampled([{ x: 135, y: 272 }, { x: 60, y: 272 }, { x: 60, y: 205 }, TOWER.objects.benchSource.stand]), true, 'spawn reaches the bench source');
assert.equal(sampled([{ x: 135, y: 272 }, { x: 60, y: 272 }, { x: 60, y: 205 }, TOWER.objects.benchMirror.stand]), true, 'bench mirror is approachable along the west lane');
assert.equal(sampled([{ x: 135, y: 272 }, TOWER.objects.source.stand, TOWER.objects.g0.stand]), true, 'main lamp and G0 stands connect');
assert.equal(sampled([TOWER.objects.g0.stand, TOWER.objects.g1.stand]), true, 'G1 stand is reachable without entering the prism base');
assert.equal(sampled([TOWER.objects.g1.stand, { x: 275, y: 246 }, { x: 330, y: 246 }, { x: 330, y: 282 }, TOWER.objects.g2.stand]), true, 'G2 stand is reachable past the call pedestal');
assert.equal(sampled([TOWER.objects.g2.stand, { x: 340, y: 285 }, { x: 500, y: 285 }, TOWER.objects.lever.stand]), true, 'lever is reachable around receiver B');
assert.equal(sampled([TOWER.objects.lever.stand, { x: 545, y: 275 }, { x: 570, y: 285 }, TOWER.objects.chamber.stand]), true, 'chamber stand is reachable through the south lane');
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
const chamber = TOWER.objects.chamber;
assert.equal(towerCanApproachFront({ x: chamber.stand.x, y: chamber.solid.y - 22 }, chamber.stand, chamber.solid), false, 'chamber does not answer from the north');
assert.equal(towerCanApproachFront({ x: chamber.solid.x - 7, y: chamber.stand.y }, chamber.stand, chamber.solid), false, 'chamber does not answer from the west');
assert.equal(towerCanApproachFront({ x: chamber.solid.x + chamber.solid.width + 7, y: chamber.stand.y }, chamber.stand, chamber.solid), false, 'chamber does not answer from the east');
assert.equal(towerCanApproachFront(chamber.stand, chamber.stand, chamber.solid), true, 'chamber answers from the south stand');
assert.equal(towerCanApproach({ x: TOWER.objects.record.stand.x, y: TOWER.objects.record.stand.y }, TOWER.objects.record.stand), true, 'record wall control answers within range');
assert.equal(towerCanApproach({ x: TOWER.objects.record.stand.x + 25, y: TOWER.objects.record.stand.y }, TOWER.objects.record.stand), false, 'record wall control stays local');
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
// Lever now sits at x=515 with base x=504..526; its south face rule keeps side probes closed.
const lever = TOWER.objects.lever;
assert.equal(towerCanApproach({ x: 529, y: 240 }, lever.stand), true, 'lever east side spot is in range and walkable');
assert.equal(towerCanApproachFront({ x: 529, y: 240 }, lever.stand, lever.base), false, 'lever E is closed from the east side');
assert.equal(towerCanApproachFront({ x: 527, y: 240 }, lever.stand, lever.base), true, 'lever E answers at the 1px east edge');
assert.equal(towerCanApproachFront({ x: 502, y: 240 }, lever.stand, lever.base), false, 'lever E is closed from the west side');
// usable standing space in front of G2: at least 24px of walkable depth between its front edge and the south bound (layout contract).
const southBound = TOWER.bounds.y + TOWER.bounds.height;
assert.ok(southBound - baseBottom >= 24 + towerBodyRect(g2.stand).height, 'G2 keeps 24px of standing space in front of it');
const frontCenters = [];
for (let y = baseBottom - 22; y <= southBound; y += 1) if (towerCenterWalkable({ x: g2.stand.x, y }) && g2Probe({ x: g2.stand.x, y })) frontCenters.push(y);
assert.ok(frontCenters.length >= 12, `G2 front window is usable (${frontCenters.length}px)`);
// optics relation is preserved after the lift: branch B stays on one row with receiver B, directly under the prism right port.
assert.equal(g2.optical.x, TOWER.objects.prism.right.x, 'G2 sits under the prism right port');
assert.equal(g2.optical.y, TOWER.objects.eyeB.optical.y, 'G2 and receiver B share the beam row');
// Record panel: its authored center is (565,156), and the stand clears the chamber body and lever base.
const record = TOWER.objects.record.stand;
assert.equal(towerCenterWalkable(record), true, 'record stand walkable');
assert.ok(towerBodyRect(record).y > TOWER.objects.record.center.y + 16, 'record prompt sits in front of panel art');
assert.equal(towerCanApproach({ x: record.x, y: record.y }, record), true);
assert.equal(reachable[keyOf(record)], 1, 'record stand reachable without the exact-width slit');
assert.deepEqual(TOWER.objects.chamber.ground, { x: 580, y: 284 });
assert.deepEqual(TOWER.objects.chamber.solid, { x: 540, y: 180, width: 80, height: 104 });
assert.deepEqual(TOWER.objects.chamber.crystal, { x: 580, y: 232 });
assert.deepEqual(TOWER.objects.window.center, { x: 565, y: 92 });
assert.deepEqual(TOWER.objects.record.center, { x: 565, y: 156 });
assert.deepEqual(TOWER.objects.lever.ground, { x: 515, y: 232 });
assert.deepEqual(TOWER.objects.lever.base, { x: 504, y: 222, width: 22, height: 10 });
assert.deepEqual(TOWER.objects.lever.stand, { x: 515, y: 254 });
assert.deepEqual(TOWER.objects.rings, { a: { x: 283, y: 120 }, b: { x: 307, y: 120 }, c: { x: 331, y: 120 } });
console.log('Sleepless Tower optics, seal, steps, gates, geometry, routes, spawn and migration checks passed');

// ---------------------------------------------------------------- H ladder is the scenario text (scenario 06 §6)
// The placing step and the main puzzle (place, main, call, switch) share one ladder: scenario Mức 1-3, verbatim and in
// order; repeated presses hold Mức 3. The bench (practice) keeps its own optional-bench ladder. The level file imports
// Phaser, so its authored constants and methods are read from the TypeScript source and bound to a fake level.
{
  const scenario = readFileSync(path.join(ROOT, 'docs/scenario/06-the-sleepless-tower.md'), 'utf8');
  const hits = [...scenario.matchAll(/^- \*\*Mức (\d)[^\n]*?\*\*:?\s*“([^”\n]+)”/gmu)].slice(0, 3);
  assert.deepEqual(hits.map((m) => Number(m[1])), [1, 2, 3], '06 §6 lists Mức 1, 2, 3 in order');
  const MUC = hits.map((m) => m[2].normalize('NFC'));

  const levelFile = path.join(ROOT, 'src/levels/SleeplessTowerLevel.ts');
  const levelAst = ts.createSourceFile(levelFile, readFileSync(levelFile, 'utf8'), ts.ScriptTarget.Latest, true);
  const COMPILER = { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } };
  const find = (predicate) => {
    let found;
    const visit = (node) => { if (found) return; if (predicate(node)) { found = node; return; } ts.forEachChild(node, visit); };
    visit(levelAst);
    return found;
  };
  const constantOf = (name, symbols = {}) => {
    const decl = find((node) => ts.isVariableDeclaration(node) && node.name.getText(levelAst) === name);
    assert.ok(decl?.initializer, `SleeplessTowerLevel still authors ${name}`);
    const js = ts.transpileModule(`const __value = (${decl.initializer.getText(levelAst)});`, COMPILER).outputText;
    return new Function(...Object.keys(symbols), `"use strict";\n${js}\nreturn __value;`)(...Object.values(symbols));
  };
  const methodOf = (name, symbols = {}) => {
    const method = find((node) => ts.isMethodDeclaration(node) && node.name.getText(levelAst) === name);
    assert.ok(method?.body, `SleeplessTowerLevel still authors ${name}()`);
    const params = method.parameters.map((p) => p.name.getText(levelAst));
    const js = ts.transpileModule(`const __unit = function (${params.join(', ')}) ${method.body.getText(levelAst)};`, COMPILER).outputText;
    return new Function(...Object.keys(symbols), `"use strict";\n${js}\nreturn __unit;`)(...Object.values(symbols));
  };
  // Exercise the actual registered call action and prompt, not a copy of its rule.
  const CALL_C = constantOf('CALL_C');
  const useCall = methodOf('useCall', { TOWER, CALL_C });
  const registerActions = methodOf('registerActions', { TOWER, towerCanApproach, towerCanApproachFront, canCompleteTower });
  const callPrompt = methodOf('callPrompt');
  const callFixture = (waterReturned, lumoAssign, reunited = false) => {
    const configs = new Map(); const spoken = [];
    const level = {
      state: { ...base, waterReturned, lumoAssign, reunited },
      route: [], routeIndex: 0, visuals: new Map(),
      point: () => TOWER.objects.call.stand,
      saveState() {}, useCall, callPrompt,
      ctx: { lumo: { sprite: { ...TOWER.lumo.seal } }, progress: { flags: {} },
        say: (lines) => spoken.push(lines), interactions: { register: (config) => configs.set(config.id, config) } },
    };
    registerActions.call(level);
    return { level, call: configs.get('tower-call'), spoken };
  };
  for (const reunited of [false, true]) {
    const { level, call, spoken } = callFixture(true, 'follow', reunited);
    assert.doesNotMatch(call.getPrompt(), /Gọi Lumo tới ấn C/, 'after Return Flow the call prompt cannot offer C');
    assert.match(call.getPrompt(), reunited ? /Lumo đang ở bên Nhinh/ : /Lumo đang bay về/, 'prompt reflects the real reunion state');
    const before = structuredClone(level.state);
    for (let press = 0; press < 3; press++) call.onInteract();
    assert.deepEqual(level.state, before, 'post-switch repeated calls never send Lumo or clear reunion');
    assert.equal(spoken.length, 0, 'post-switch call adds no dialogue');
  }
  for (const waterReturned of [false, true]) {
    for (const assignment of ['to-c', 'at-c']) {
      const { level, call } = callFixture(waterReturned, assignment);
      assert.equal(call.getPrompt(), 'E · Gọi Lumo về');
      call.onInteract();
      assert.equal(level.state.lumoAssign, 'follow', 'a sent or holding Lumo can still be recalled');
      assert.equal(level.ctx.progress.flags['l5-return-called'], true);
      assert.deepEqual(level.route, []);
    }
  }
  const beforeSwitch = callFixture(false, 'follow');
  assert.equal(beforeSwitch.call.getPrompt(), 'E · Gọi Lumo tới ấn C');
  beforeSwitch.call.onInteract();
  assert.equal(beforeSwitch.level.state.lumoAssign, 'to-c', 'pre-switch send is preserved');
  assert.equal(beforeSwitch.level.route.length, TOWER.lumo.route.length + 1);
  assert.deepEqual(beforeSwitch.spoken, [CALL_C], 'pre-switch approved dialogue is unchanged');
  console.log('Sleepless Tower call regression passed (pre-switch send/recall; post-switch recall/follow/reunion).');
  const PUZZLE_HINTS = constantOf('PUZZLE_HINTS');
  const PUZZLE_STEPS = constantOf('PUZZLE_STEPS');
  const hintLadderOf = constantOf('hintLadderOf', { PUZZLE_STEPS });
  const HINTS = constantOf('HINTS', { PUZZLE_HINTS });
  const RECALL_FOLLOWING = constantOf('RECALL_FOLLOWING');
  const showHint = methodOf('showHint', { deriveTowerLive: (state) => ({ step: state.step }), hintLadderOf });
  const hintsFor = methodOf('hintsFor', { HINTS, RECALL_FOLLOWING });
  assert.deepEqual(PUZZLE_HINTS.map((line) => line.text.normalize('NFC')), MUC, 'PUZZLE_HINTS is the 06 §6 Mức 1-3 verbatim');
  // Presses on a fake level, one per step name in `steps`, as the H key would press them.
  const presses = (steps, lumoAssign = 'at-c') => {
    const spoken = [];
    const level = {
      state: { step: '', lumoAssign }, stepKey: '', hintIndex: 0, lumoPoint: () => seal,
      ctx: { say(lines) { spoken.push(lines[0].text.normalize('NFC')); } },
    };
    level.hintsFor = hintsFor;
    level.showHint = showHint;
    for (const step of steps) { level.state = { step, lumoAssign }; level.showHint(); }
    return spoken;
  };
  for (const step of ['place', 'main', 'call', 'switch']) {
    assert.deepEqual(presses([step, step, step, step]), [MUC[0], MUC[1], MUC[2], MUC[2]], `${step}: presses give Mức 1, 2, 3 verbatim, then hold Mức 3`);
  }
  assert.deepEqual(presses(['place', 'main', 'call', 'switch']), [MUC[0], MUC[1], MUC[2], MUC[2]], 'the puzzle steps share one ladder, so presses keep their order across them');
  assert.deepEqual(presses(['practice', 'main']), [HINTS.practice[0].text.normalize('NFC'), MUC[0]], 'leaving the bench starts the puzzle ladder at Mức 1');
  assert.equal(HINTS.practice.some((line) => MUC.includes(line.text.normalize('NFC'))), false, 'the bench keeps its own optional-bench ladder');
  assert.deepEqual(presses(['retrieve']), [HINTS.retrieve[0].text.normalize('NFC')], 'after the switch the lines are the stage-specific guidance');
  assert.deepEqual(presses(['recall'], 'follow'), [RECALL_FOLLOWING[0].text.normalize('NFC')], 'a following Lumo keeps the recall guidance');
}

console.log('Sleepless Tower H ladder checks passed (place, main, call, switch are the scenario Mức 1-3 verbatim, in order).');
