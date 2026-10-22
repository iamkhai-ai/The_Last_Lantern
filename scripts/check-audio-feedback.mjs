// Shipped method checks for dialogue timing and the tower/garden sound transitions.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { deriveTowerLive, migrateTowerProgress, resolveTowerSpawn, TOWER } from '../src/data/towerLayout.ts';
import { GARDEN_ACTOR, nearestSafeGardenSpawn, NO_HELD_SPANS, readGardenState } from '../src/data/sleepingGardenLayout.ts';

function source(file) {
  return ts.createSourceFile(file, readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true);
}
function find(ast, predicate) {
  let found;
  const visit = node => { if (found) return; if (predicate(node)) found = node; else ts.forEachChild(node, visit); };
  visit(ast);
  assert.ok(found, 'the shipped declaration exists');
  return found;
}
function compile(code, symbols = {}) {
  // Identity i18n: these checks assert sound behaviour, not language.
  const bound = { tr: (text, params) => (params ? text.replace(/\{(\w+)\}/g, (match, key) => (key in params ? String(params[key]) : match)) : text), ...symbols };
  const js = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None } }).outputText;
  return new Function(...Object.keys(bound), `${js}\nreturn unit;`)(...Object.values(bound));
}
function method(file, name, symbols = {}) {
  const ast = source(file);
  const node = find(ast, node => ts.isMethodDeclaration(node) && node.name.getText(ast) === name);
  return compile(`const unit = function (${node.parameters.map(p => p.name.getText(ast)).join(', ')}) ${node.body.getText(ast)};`, symbols);
}
function constant(file, name) {
  const ast = source(file);
  const node = find(ast, node => ts.isVariableDeclaration(node) && node.name.getText(ast) === name);
  return compile(`const unit = ${node.initializer.getText(ast)};`);
}

let failures = 0, count = 0;
function test(name, run) {
  count++;
  try { run(); console.log(`PASS ${name}`); }
  catch (error) { failures++; console.log(`FAIL ${name}\n${error.stack}`); }
}

test('dialogue text and ticks advance equally at 30, 60, 120 and 144 FPS', () => {
  const outcomes = [];
  for (const fps of [30, 60, 120, 144]) {
    let ticks = 0;
    const update = method('src/systems/DialogueSystem.ts', 'update', { SoundSystem: { playDialogueTick() { ticks++; } } });
    const dialogue = { active: true, fullLineText: 'a'.repeat(1000), visibleChars: 0, charTimer: 0, bodyText: { setText() {} }, queue: [{ speaker: 'Nhinh' }], currentIndex: 0 };
    for (let i = 0; i < fps; i++) update.call(dialogue, 1000 / fps);
    outcomes.push({ characters: dialogue.visibleChars, ticks });
    assert.ok(dialogue.charTimer >= 0 && dialogue.charTimer < 16, 'the fractional frame time is preserved');
    const before = ticks;
    dialogue.visibleChars = dialogue.fullLineText.length;
    update.call(dialogue, 1000);
    dialogue.active = false;
    update.call(dialogue, 1000);
    assert.equal(ticks, before, 'completed or inactive dialogue stays silent');
  }
  assert.deepEqual(outcomes, Array(4).fill({ characters: 62, ticks: 10 }));
});

test('a stalled frame produces one dialogue tick, and advancing past typing does not play the skipped text', () => {
  let ticks = 0;
  const file = 'src/systems/DialogueSystem.ts';
  const dialogue = { active: true, fullLineText: 'a'.repeat(1000), visibleChars: 0, charTimer: 0, bodyText: { setText() {} }, queue: [{ speaker: 'Nhinh' }], currentIndex: 0, lastInputTime: 0 };
  const update = method(file, 'update', { SoundSystem: { playDialogueTick() { ticks++; } } });
  update.call(dialogue, 0);
  assert.equal(ticks, 0);
  assert.equal(dialogue.visibleChars, 0);
  update.call(dialogue, 1000);
  assert.equal(ticks, 1, 'missed ticks are not replayed in a burst');
  method(file, 'handleAdvanceInput').call(dialogue, 2000);
  update.call(dialogue, 1000);
  assert.equal(ticks, 1, 'skipping typing is silent');
});

function soundSpy() {
  const calls = [];
  const SoundSystem = Object.fromEntries(['startAmbient', 'playMirrorRotate', 'playMechanismLatch', 'playWaterRelease', 'playCrystalPickup', 'playEndingCue']
    .map(name => [name, (...args) => calls.push([name, ...args])]));
  return { calls, SoundSystem };
}

const towerFile = 'src/levels/SleeplessTowerLevel.ts';
test('tower lever changes machine to water exactly once; failed use and empty crystal chamber make no success sound', () => {
  const { calls, SoundSystem } = soundSpy();
  const level = {
    state: { source: 'main', lanternOn: true, g0: 0, g1: 2, g2: 1, practice: 1, waterReturned: false, crystal: false, lumoAssign: 'at-c' },
    ctx: { say() {}, scene: { cameras: { main: { shake() {} } } } },
    lumoPoint: () => ({ x: 350, y: 290 }), saveState() {}, caption() {}, visuals: new Map(),
  };
  const useLever = method(towerFile, 'useLever', {
    deriveTowerLive, SoundSystem, SWITCH_CAPTION: constant(towerFile, 'SWITCH_CAPTION'), SWITCHED: constant(towerFile, 'SWITCHED'),
  });
  const useChamber = method(towerFile, 'useChamber', { SoundSystem });
  useChamber.call(level);
  assert.equal(calls.length, 0, 'the locked crystal chamber is silent');
  level.state.g1 = 0;
  useLever.call(level);
  assert.equal(calls.length, 0, 'an incomplete circuit cannot sound like success');
  level.state.g1 = 2;
  useLever.call(level);
  assert.deepEqual(calls, [['playMechanismLatch'], ['playWaterRelease'], ['startAmbient', 'tower-restored']]);
  useLever.call(level);
  assert.equal(calls.length, 3, 'the completed lever cannot replay its sound');
  useChamber.call(level);
  useChamber.call(level);
  assert.deepEqual(calls.slice(3), [['playCrystalPickup']], 'the crystal cue plays only on the actual pickup');
});

test('each tower mirror produces one rotation cue', () => {
  const { calls, SoundSystem } = soundSpy();
  const level = { state: { practice: 0, g0: 0, g1: 0, g2: 0 }, saveState() {} };
  method(towerFile, 'rotateBench', { SoundSystem }).call(level);
  method(towerFile, 'rotateG0', { SoundSystem }).call(level);
  const rotate = method(towerFile, 'rotateBranch', { SoundSystem });
  rotate.call(level, 'g1'); rotate.call(level, 'g2');
  assert.deepEqual(calls, Array.from({ length: 4 }, () => ['playMirrorRotate']));
});

test('tower restore derives its ambient theme from normalized puzzle state, including legacy saves', () => {
  for (const [flags, expected] of [[{}, 'tower'], [{ 'l5-power': true }, 'tower-restored']]) {
    const { calls, SoundSystem } = soundSpy();
    const noop = () => {};
    const level = {
      ctx: {
        progress: { flags: { 'intro-5': true, ...flags }, counters: {}, lanternOn: true },
        lantern: { placeLanternAt: noop }, lumo: { sprite: { x: 0, y: 0, setPosition: noop }, setVisible: noop },
        player: { setFootPlacement: noop, setPosition: noop }, save: noop,
      },
      drawBackdrop: noop, drawMachine: noop, addSolids: noop, registerActions: noop, updateVisuals: noop,
      saveState: noop, lumoPoint: () => ({ x: 350, y: 290 }),
    };
    method(towerFile, 'build', { SoundSystem, migrateTowerProgress, TOWER, resolveTowerSpawn, deriveTowerLive }).call(level);
    assert.deepEqual(calls, [['startAmbient', expected]], 'loading a save never replays lever or crystal one-shots');
  }
});

const gardenFile = 'src/levels/SleepingGardenLevel.ts';
function gardenHarness() {
  const spy = soundSpy();
  const beats = [];
  const level = {
    destroyed: false,
    state: { canopyShut: false, sunLatched: false, waterFlowing: false, returnLatched: false },
    progress: { flags: {}, counters: {} }, held: { ...NO_HELD_SPANS }, save() {}, pulsePlants() {},
    say(lines, done) { beats.push({ lines, done }); }, queueBeat(lines, done) { beats.push({ lines, done }); },
  };
  return { ...spy, beats, level };
}

test('the first garden cricket follows the canopy dialogue, does not repeat, and is canceled by teardown', () => {
  const { level, calls, SoundSystem, beats } = gardenHarness();
  const pull = method(gardenFile, 'pullHandle', { SoundSystem, NO_HELD_SPANS, CANOPY_BEAT: constant(gardenFile, 'CANOPY_BEAT') });
  pull.call(level);
  assert.deepEqual(calls, [['playMechanismLatch']], 'no premature cricket under the canopy lines');
  beats[0].done();
  assert.deepEqual(calls.at(-1), ['playEndingCue', 'cricket']);
  pull.call(level);
  assert.equal(beats.length, 1, 'a closed canopy does not enqueue another chirp');
  const after = calls.length;
  level.destroyed = true;
  beats[0].done();
  assert.equal(calls.length, after, 'a stale dialogue callback cannot chirp in the next level');
});

test('garden watering and latches sound only on the actual change, with no stale isolated cricket after restoration', () => {
  const { level, calls, SoundSystem, beats } = gardenHarness();
  method(gardenFile, 'pullHandle', { SoundSystem, NO_HELD_SPANS, CANOPY_BEAT: constant(gardenFile, 'CANOPY_BEAT') }).call(level);
  calls.length = 0;
  const west = method(gardenFile, 'latchWest', { SoundSystem });
  west.call(level); west.call(level);
  assert.deepEqual(calls, [['playMechanismLatch']]);
  const drain = method(gardenFile, 'openDrain', { SoundSystem, NURSERY_SCENE: constant(gardenFile, 'NURSERY_SCENE') });
  drain.call(level); drain.call(level);
  assert.deepEqual(calls.slice(1), [['playMechanismLatch'], ['playWaterRelease'], ['startAmbient', 'garden-restored']]);
  const before = calls.length;
  beats[0].done();
  assert.equal(calls.length, before, 'the restored ambience owns the insect pair');
  const east = method(gardenFile, 'latchEast', { SoundSystem, SIDE_LATCHED: constant(gardenFile, 'SIDE_LATCHED') });
  east.call(level); east.call(level);
  assert.equal(calls.length, before + 1);
  assert.deepEqual(calls.at(-1), ['playMechanismLatch']);
});

test('garden save restore chooses dry or living ambience without replaying story one-shots', () => {
  for (const [flags, expected] of [[{}, 'garden'], [{ 'l6-return-latched': true }, 'garden-restored']]) {
    const { level, calls, SoundSystem } = gardenHarness();
    const noop = () => {};
    level.progress.flags = { ...flags };
    Object.assign(level, {
      lanternOn: true,
      player: { setFootPlacement: noop, setPosition: noop, sprite: { body: { updateFromGameObject: noop } } },
      lumo: { sprite: { setPosition: noop }, setVisible: noop },
      drawStatic: noop, createSolids: noop, registerInteractions: noop, updateLightState: noop, refresh: noop,
      readState: method(gardenFile, 'readState', { readGardenState }),
    });
    method(gardenFile, 'build', { SoundSystem, GARDEN_ACTOR, nearestSafeGardenSpawn }).call(level);
    assert.deepEqual(calls, [['startAmbient', expected]]);
  }
});

console.log(`\n${count - failures}/${count} audio feedback checks passed.`);
if (failures) process.exitCode = 1;
