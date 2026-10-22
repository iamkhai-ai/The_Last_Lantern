import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { canCompleteTower, deriveTowerLive, getTowerExitBlock, isLumoAtSeal, migrateTowerProgress, overlaps, resolveTowerSpawn, towerBodyRect, towerCanApproach, towerCanReach, towerCenterWalkable, towerFootGap, towerReachOwner, TOWER, TOWER_REACH_GAP, TOWER_SOLIDS } from '../src/data/towerLayout.ts';

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
assert.equal(sampled([{ x: 135, y: 272 }, { x: 60, y: 272 }, { x: 60, y: 205 }, TOWER.objects.benchSource.stand]), true, 'spawn reaches the bench source');
assert.equal(sampled([{ x: 135, y: 272 }, { x: 60, y: 272 }, { x: 60, y: 205 }, TOWER.objects.benchMirror.stand]), true, 'bench mirror is approachable along the west lane');
assert.equal(sampled([{ x: 135, y: 272 }, TOWER.objects.source.stand, TOWER.objects.g0.stand]), true, 'main lamp and G0 stands connect');
assert.equal(sampled([TOWER.objects.g0.stand, { x: 240, y: 250 }, { x: 250, y: 200 }, TOWER.objects.g1.stand]), true, 'G1 stand is reachable without entering the prism base');
assert.equal(sampled([TOWER.objects.g1.stand, { x: 250, y: 200 }, { x: 250, y: 246 }, { x: 330, y: 246 }, { x: 330, y: 282 }, TOWER.objects.g2.stand]), true, 'G2 stand is reachable past the call pedestal');
assert.equal(sampled([TOWER.objects.g2.stand, { x: 340, y: 285 }, { x: 500, y: 285 }, TOWER.objects.lever.stand]), true, 'lever is reachable around receiver B');
assert.equal(sampled([TOWER.objects.lever.stand, { x: 545, y: 275 }, { x: 570, y: 285 }, TOWER.objects.chamber.stand]), true, 'chamber stand is reachable through the south lane');
assert.equal(sampled([TOWER.objects.chamber.stand, { x: 520, y: 288 }, { x: 518, y: 196 }, TOWER.objects.record.stand]), true, 'record stand is reachable past the lever base');
assert.equal(sampled([{ x: 135, y: 272 }, { x: 340, y: 284 }, TOWER.objects.call.stand]), true, 'call pedestal is reachable along the south lane under the G2 base');
assert.equal(sampled([TOWER.objects.call.stand, { x: 340, y: 288 }, { x: 150, y: 288 }, TOWER.stairsStand]), true, 'stairs are reachable along the south lane');
assert.equal(sampled([{ x: 135, y: 272 }, TOWER.stairsStand]), true, 'stairs connect to spawn');
assert.equal(sampled([{ x: 135, y: 272 }, { x: 350, y: 272 }]), true, 'G2 front lane keeps the straight south lane open');
assert.equal(towerCanReach({ x: 350, y: 244 }, TOWER.objects.call.base), true, 'call answers from its south face, 8px from its footprint');
assert.equal(towerCanReach({ x: 100, y: 272 }, TOWER.objects.call.base), false, 'E range is local');

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

// T07 (RULE_GAMES §1, 2026-10-22): standing props answer E from every side within TOWER_REACH_GAP px of their footprint.
const g2 = TOWER.objects.g2;
const baseBottom = g2.base.y + g2.base.height;
const standingProps = [
  ['benchSource', TOWER.objects.benchSource.stand, TOWER.objects.benchSource.base],
  ['benchMirror', TOWER.objects.benchMirror.stand, TOWER.objects.benchMirror.base],
  ['source', TOWER.objects.source.stand, TOWER.objects.source.base],
  ['g0', TOWER.objects.g0.stand, TOWER.objects.g0.base],
  ['g1', TOWER.objects.g1.stand, TOWER.objects.g1.base],
  ['g2', g2.stand, g2.base],
  ['call', TOWER.objects.call.stand, TOWER.objects.call.base],
  ['lever', TOWER.objects.lever.stand, TOWER.objects.lever.base],
  ['chamber', TOWER.objects.chamber.stand, TOWER.objects.chamber.solid],
];
const footprints = Object.fromEntries(standingProps.map(([id, , rect]) => [id, rect]));
for (const [id, stand, rect] of standingProps) {
  assert.equal(towerCanReach(stand, rect), true, `${id} stand is walkable and answers E`);
  const mid = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  const probes = {
    north: (gap) => ({ x: mid.x, y: rect.y - gap - 22 }),
    south: (gap) => ({ x: mid.x, y: rect.y + rect.height + gap - 16 }),
    east: (gap) => ({ x: rect.x + rect.width + gap + 7, y: mid.y - 19 }),
    west: (gap) => ({ x: rect.x - gap - 7, y: mid.y - 19 }),
  };
  for (const [side, at] of Object.entries(probes)) {
    const near = at(TOWER_REACH_GAP);
    const far = at(TOWER_REACH_GAP + 2);
    assert.equal(towerFootGap(near, rect), TOWER_REACH_GAP, `${id}: the ${side} probe sits exactly ${TOWER_REACH_GAP}px from the footprint`);
    assert.ok(towerFootGap(far, rect) > TOWER_REACH_GAP, `${id}: the ${side} probe 2px beyond is outside reach`);
    // Overlapping zones (the lever and the chamber are 9px apart) resolve to one owner, which itself reaches the probe.
    const owners = Object.keys(footprints).filter((other) => towerReachOwner(other, near, footprints));
    assert.equal(owners.length, 1, `${id}: the ${side} probe has exactly one owner`);
    assert.ok(towerFootGap(near, footprints[owners[0]]) <= TOWER_REACH_GAP, `${id}: the ${side} probe's owner (${owners[0]}) reaches it`);
  }
}
// usable standing space in front of G2: at least 24px of walkable depth between its front edge and the south bound (layout contract).
const southBound = TOWER.bounds.y + TOWER.bounds.height;
assert.ok(southBound - baseBottom >= 24 + towerBodyRect(g2.stand).height, 'G2 keeps 24px of standing space in front of it');
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
