// Shipped method checks for dialogue timing and the tower/garden sound transitions.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { deriveTowerLive, migrateTowerProgress, resolveTowerSpawn, TOWER } from '../src/data/towerLayout.ts';
import { GARDEN_ACTOR, nearestSafeGardenSpawn, NO_HELD_SPANS, readGardenState } from '../src/data/sleepingGardenLayout.ts';
import { observatoryAudioChanges, observatoryAudioState } from '../src/systems/ObservatoryAudio.ts';
import { OBSERVATORY_SHADOW } from '../src/data/observatoryLayout.ts';
import { OBSERVATORY_MEMORY_RECORDING, OBSERVATORY_MEMORY_LUMO, OBSERVATORY_MEMORY_SHADOW,
  OBSERVATORY_MEMORY_CAPTION, OBSERVATORY_MEMORY_MERGE_CAPTION } from '../src/data/observatoryStory.ts';

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
  const js = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None } }).outputText;
  return new Function(...Object.keys(symbols), `${js}\nreturn unit;`)(...Object.values(symbols));
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

const quietObservatory = {
  supply: false, split: false, roots: 'dormant', bridge: false, doorA: false, sunDoor: false, finalDoor: false, returnLoop: false,
};
test('observatory restore and identical frame/room refreshes cannot replay transition sounds', () => {
  const restored = { ...quietObservatory, supply: true, split: true, bridge: true, roots: 'bridge', sunDoor: true };
  assert.deepEqual(observatoryAudioChanges(null, restored), []);
  assert.deepEqual(observatoryAudioChanges(restored, { ...restored }), []);
  assert.deepEqual(observatoryAudioChanges(restored, { ...restored }), []);
});

test('observatory supply, split, roots and doors sound only on their actual state edges', () => {
  const live = { ...quietObservatory, supply: true, split: true, roots: 'lit', doorA: true, sunDoor: true };
  assert.deepEqual(observatoryAudioChanges(quietObservatory, live), ['tubeOn', 'lightPulse', 'rootsWarm', 'doorOpen']);
  const bridge = { ...live, bridge: true, roots: 'bridge' };
  assert.deepEqual(observatoryAudioChanges(live, bridge), ['rootBridgeGrow']);
  const loop = { ...bridge, returnLoop: true };
  assert.deepEqual(observatoryAudioChanges(bridge, loop), ['stoneRing']);
  const off = { ...loop, supply: false, split: false, bridge: false, roots: 'retracted-dark', doorA: false };
  assert.deepEqual(observatoryAudioChanges(loop, off), ['tubeOff', 'rootBridgeRetract', 'doorClose']);
  assert.deepEqual(observatoryAudioChanges(off, off), []);
  const final = { ...off, finalDoor: true };
  assert.deepEqual(observatoryAudioChanges(off, final), ['doorOpen']);
  assert.deepEqual(observatoryAudioChanges(final, { ...final }), []);
});

test('root retraction waits for the same safety hold as the visible bridge, while the supply stops immediately', () => {
  const world = { supplyLive: false, bridgeEligible: false, rootState: 'retracted-dark',
    doorAUnlocked: false, doorALatched: true, sunDoorUnlocked: false, sunDoorLatched: true, returnLoopOpen: true };
  const state = { activeBeamPath: { routeId: 'off' } };
  const held = observatoryAudioState(world, state, true);
  const previous = { ...held, supply: true, split: true, roots: 'bridge' };
  assert.deepEqual(observatoryAudioChanges(previous, held), ['tubeOff']);
  const retracted = observatoryAudioState(world, state, false);
  assert.deepEqual(observatoryAudioChanges(held, retracted), ['rootBridgeRetract']);
  assert.equal(retracted.doorA, true, 'latched doors remain open silently after the light stops');
  assert.equal(retracted.sunDoor, true);
});

const observatoryFile = 'src/scenes/CampaignScene.ts';
function memoryHarness() {
  const calls = [], dialogue = [], timers = [];
  const SoundSystem = {
    setMusicLevel: (...args) => calls.push(['music', ...args]),
    playObservatoryCue: cue => calls.push([cue]),
    startObservatoryMemoryWeather: () => { calls.push(['weather']); return () => calls.push(['stopWeather']); },
  };
  const scene = {
    activeObservatoryRoom: 'observatory', observatoryMemoryPlaying: false,
    observatoryMemoryGeneration: 0, observatoryMemoryTimers: [], roomObjects: [],
    textures: { exists: () => false }, cameras: { main: { flash: () => calls.push(['flash']) } },
    time: { delayedCall(delay, callback) {
      const event = { delay, callback, removed: false, remove() { this.removed = true; } }; timers.push(event); return event;
    } },
    showObservatoryCaption() {}, say(lines, done) { dialogue.push({ lines, done }); },
    cancelObservatoryMemory: method(observatoryFile, 'cancelObservatoryMemory', { SoundSystem }),
  };
  const play = method(observatoryFile, 'playObservatoryMemory', {
    SoundSystem, getShadowArtKey: () => null, OBSERVATORY_MEMORY_RECORDING, OBSERVATORY_MEMORY_LUMO,
    OBSERVATORY_MEMORY_SHADOW, OBSERVATORY_MEMORY_CAPTION, OBSERVATORY_MEMORY_MERGE_CAPTION, OBSERVATORY_SHADOW,
  });
  const advance = delay => {
    const timer = timers.find(timer => timer.delay === delay && !timer.removed);
    assert.ok(timer, `the ${delay}ms scene beat exists`); timer.removed = true; timer.callback();
  };
  return { scene, calls, dialogue, timers, play, advance };
}

test('recording sounds follow the memory sequence and the final answer holds 3.2 seconds without music', () => {
  const { scene, calls, dialogue, play, advance } = memoryHarness();
  play.call(scene);
  assert.equal(scene.observatoryMemoryPlaying, true);
  assert.deepEqual(calls, [['music', 0.2], ['weather']]);
  dialogue[0].done();
  assert.deepEqual(calls.at(-1), ['memoryImpact']);
  advance(650); advance(2500); advance(3700);
  assert.deepEqual(calls.slice(-5), [['memoryWaterFade'], ['memoryCracks'], ['stopWeather'], ['memoryFlash'], ['flash']]);
  assert.equal(dialogue.length, 1, 'Lumo does not speak over the flash');
  advance(5200);
  assert.deepEqual(dialogue[1].lines, OBSERVATORY_MEMORY_LUMO);
  dialogue[1].done();
  assert.deepEqual(calls.at(-1), ['memoryMerge']);
  advance(2200);
  assert.deepEqual(dialogue[2].lines, OBSERVATORY_MEMORY_SHADOW);
  dialogue[2].done();
  assert.deepEqual(calls.at(-1), ['music', 0]);
  assert.equal(scene.observatoryMemoryPlaying, true, 'the rest keeps movement and interactions locked');
  advance(3200);
  assert.equal(scene.observatoryMemoryPlaying, false);
  assert.deepEqual(calls.at(-1), ['music', 1, 0.6]);
  assert.equal(scene.observatoryMemoryTimers.length, 0);
});

test('tearing down a recording cancels timed cues, stale dialogue callbacks and its music duck', () => {
  const { scene, calls, dialogue, timers, play } = memoryHarness();
  play.call(scene);
  dialogue[0].done();
  scene.cancelObservatoryMemory();
  const after = calls.length;
  for (const timer of timers) {
    assert.equal(timer.removed, true);
    timer.callback();
  }
  dialogue[0].done();
  assert.equal(calls.length, after, 'even a stale callback delivered after removal is harmless');
  assert.deepEqual(calls.slice(-2), [['stopWeather'], ['music', 1, 0.6]]);
  assert.equal(scene.observatoryMemoryPlaying, false);
  assert.equal(scene.observatoryMemoryTimers.length, 0);
});

console.log(`\n${count - failures}/${count} audio feedback checks passed.`);
if (failures) process.exitCode = 1;
