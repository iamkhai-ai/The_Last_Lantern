// Sound Effect Lab integration checks. Run: node scripts/check-sound.mjs
// Covers the SFX manifest, the procedural fallback order, mute gating and the
// single-instance footstep/ambience loops that replaced the per-step playback.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import ts from 'typescript';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const soundSource = readFileSync(path.join(root, 'src/systems/SoundSystem.ts'), 'utf8');
const bootSource = readFileSync(path.join(root, 'src/scenes/BootScene.ts'), 'utf8');
const sfxDir = path.join(root, 'src/assets/sfx');

const transpile = source => ts.transpileModule(
  source.replace(/^import .*;\r?\n/gm, '').replace(/\bexport /g, ''),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } },
).outputText;
const compiled = transpile(soundSource);

class FakeParam {
  setValueAtTime() { return this; }
  linearRampToValueAtTime() { return this; }
  exponentialRampToValueAtTime() { return this; }
}

class FakeNode {
  constructor(ctx) {
    this.ctx = ctx;
    this.frequency = new FakeParam();
    this.gain = new FakeParam();
  }
  connect() { return this; }
  start() {}
  stop() {}
}

class FakeAudioContext {
  static instances = [];
  constructor() {
    FakeAudioContext.instances.push(this);
    this.state = 'running';
    this.currentTime = 0;
    this.destination = {};
    this.oscillators = 0;
  }
  createOscillator() { this.oscillators += 1; return new FakeNode(this); }
  createGain() { return new FakeNode(this); }
  resume() { this.state = 'running'; return Promise.resolve(); }
}

class FakeSound {
  constructor(key, config = {}) {
    this.key = key;
    this.config = config;
    this.loop = config.loop === true;
    this.volume = config.volume;
    this.isPlaying = false;
    this.destroyed = false;
    this.plays = 0;
    this.stops = 0;
  }
  play() { this.isPlaying = true; this.plays += 1; return true; }
  stop() { this.isPlaying = false; this.stops += 1; return this; }
  destroy() { this.isPlaying = false; this.destroyed = true; return this; }
}

class FakeManager {
  constructor() { this.mute = false; this.volume = 1; this.added = []; this.plays = []; }
  add(key, config) { const sound = new FakeSound(key, config); this.added.push(sound); return sound; }
  play(key, config) { const sound = new FakeSound(key, config); sound.play(); this.plays.push({ key, config }); return sound; }
}

/** Fresh class per case: the real SoundSystem keeps its state in statics. */
const loadSoundSystem = () => {
  const window = { AudioContext: FakeAudioContext };
  return new Function('window', `${compiled}\nreturn SoundSystem;`)(window);
};

const tick = () => new Promise(resolve => setTimeout(resolve, 5));
const results = [];
const test = async (name, fn) => {
  try {
    await fn();
    results.push({ name, status: 'PASS' });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, status: 'FAIL', error: String(error && error.stack || error) });
    console.error(`FAIL ${name}\n${error && error.stack || error}`);
    process.exitCode = 1;
  }
};

// --- Manifest vs files -------------------------------------------------------

await test('every manifest entry points at a real, distinct SFX file', () => {
  const entries = [...bootSource.matchAll(/key: '([^']+)', file: '([^']+)'/g)].map(m => ({ key: m[1], file: m[2] }));
  assert.ok(entries.length >= 20, `manifest has entries: ${entries.length}`);
  const keys = new Set();
  const files = new Set();
  for (const entry of entries) {
    assert.ok(!keys.has(entry.key), `duplicate manifest key ${entry.key}`);
    keys.add(entry.key);
    assert.ok(!files.has(entry.file), `duplicate manifest file ${entry.file}`);
    files.add(entry.file);
    assert.ok(existsSync(path.join(sfxDir, entry.file)), `missing file ${entry.file}`);
  }
  const helpers = [...soundSource.matchAll(/playSfx\('([^']+)'/g)].map(m => m[1]);
  assert.ok(helpers.length > 0, 'SoundSystem references SFX keys');
  for (const key of helpers) assert.ok(keys.has(key), `helper key ${key} is in the manifest`);
});

// --- playSfx / mute ----------------------------------------------------------

await test('playSfx is a no-op without a manager or a registered key', () => {
  const Sound = loadSoundSystem();
  assert.equal(Sound.playSfx('ui_click', 0.4), false, 'no manager yet');
  const manager = new FakeManager();
  Sound.setSoundManager(manager);
  assert.equal(Sound.playSfx('ui_click', 0.4), false, 'file not registered');
  assert.equal(manager.plays.length, 0);
  Sound.registerLoadedKey('ui_click');
  assert.equal(Sound.playSfx('ui_click', 0.4), true, 'registered key plays');
  assert.deepEqual(manager.plays[0], { key: 'ui_click', config: { volume: 0.4 } });
});

await test('mute stops new one-shots and silences the manager', () => {
  const Sound = loadSoundSystem();
  const manager = new FakeManager();
  Sound.setSoundManager(manager);
  Sound.registerLoadedKey('ui_click');
  assert.equal(Sound.toggleMute(), true);
  assert.equal(manager.mute, true, 'manager muted');
  assert.equal(Sound.playSfx('ui_click'), false, 'muted blocks playback');
  assert.equal(manager.plays.length, 0);
  assert.equal(Sound.toggleMute(), false);
  assert.equal(manager.mute, false, 'manager unmuted');
  assert.equal(Sound.playSfx('ui_click'), true, 'playback resumes');
});

// --- fallback order ----------------------------------------------------------

await test('one-shots fall back to a procedural tone when the file is unavailable', async () => {
  FakeAudioContext.instances = [];
  const Sound = loadSoundSystem();
  Sound.setSoundManager(new FakeManager());
  const manager = new FakeManager();
  Sound.setSoundManager(manager);
  Sound.playUiClick();
  await tick();
  assert.equal(manager.plays.length, 0, 'no file playback attempt registered');
  const ctx = FakeAudioContext.instances[0];
  assert.ok(ctx, 'procedural AudioContext created');
  assert.ok(ctx.oscillators > 0, `fallback tone played (${ctx.oscillators} oscillators)`);
});

await test('one-shots prefer the loaded file and skip the procedural tone', async () => {
  FakeAudioContext.instances = [];
  const Sound = loadSoundSystem();
  const manager = new FakeManager();
  Sound.setSoundManager(manager);
  for (const key of ['ui_click', 'ui_cancel', 'gate_open', 'ui_item_get']) Sound.registerLoadedKey(key);
  Sound.playUiClick();
  Sound.playUiCancel();
  Sound.playGateOpen();
  Sound.playUiItemGet();
  await tick();
  assert.deepEqual(manager.plays.map(p => p.key), ['ui_click', 'ui_cancel', 'gate_open', 'ui_item_get']);
  assert.equal(FakeAudioContext.instances.length, 0, 'no procedural context needed');
});

// --- footsteps ---------------------------------------------------------------

await test('footsteps are one looping instance that follows movement', () => {
  const Sound = loadSoundSystem();
  const manager = new FakeManager();
  Sound.setSoundManager(manager);
  Sound.registerLoadedKey('footstep_grass');
  Sound.registerLoadedKey('footstep_soil');

  Sound.setWalking(true);
  assert.equal(manager.added.length, 1, 'one footstep instance');
  assert.equal(manager.added[0].key, 'footstep_grass');
  assert.equal(manager.added[0].loop, true, 'footstep bed loops');
  assert.equal(manager.added[0].isPlaying, true);

  Sound.setWalking(true);
  Sound.setWalking(true);
  assert.equal(manager.added.length, 1, 'repeated walking frames do not stack voices');

  Sound.setWalking(false);
  assert.equal(manager.added[0].isPlaying, false, 'stopping player stops the bed');
  assert.equal(manager.added[0].destroyed, true, 'instance released');
  Sound.setWalking(false);
  assert.equal(manager.added.length, 1, 'idle frames stay quiet');
});

await test('footstep surface swap rebuilds the bed exactly once', () => {
  const Sound = loadSoundSystem();
  const manager = new FakeManager();
  Sound.setSoundManager(manager);
  Sound.registerLoadedKey('footstep_grass');
  Sound.registerLoadedKey('footstep_soil');

  Sound.setWalking(true);
  Sound.setFootstepSurface('soil');
  assert.equal(manager.added.length, 2, 'grass bed replaced by soil bed');
  assert.equal(manager.added[0].isPlaying, false, 'grass bed stopped');
  assert.equal(manager.added[1].key, 'footstep_soil');
  assert.equal(manager.added[1].isPlaying, true, 'soil bed playing while walking');

  Sound.setWalking(false);
  Sound.setFootstepSurface('grass');
  assert.equal(manager.added.length, 2, 'surface change while idle starts nothing');
});

await test('footsteps stay silent without the surface file', () => {
  const Sound = loadSoundSystem();
  const manager = new FakeManager();
  Sound.setSoundManager(manager);
  Sound.setWalking(true);
  assert.equal(manager.added.length, 0, 'no bed when footstep_grass is missing');
});

// --- ambience ----------------------------------------------------------------

await test('creek ambience is one looping instance and stops on demand', () => {
  const Sound = loadSoundSystem();
  const manager = new FakeManager();
  Sound.setSoundManager(manager);
  Sound.registerLoadedKey('ambient_creek');

  Sound.startAmbientCreek();
  Sound.startAmbientCreek();
  assert.equal(manager.added.length, 1, 're-entering the level does not stack ambience');
  assert.equal(manager.added[0].loop, true, 'ambience loops');
  assert.equal(manager.added[0].volume, 0.4);

  Sound.stopAmbient();
  assert.equal(manager.added[0].isPlaying, false, 'leaving the level stops ambience');
  assert.equal(manager.added[0].destroyed, true, 'ambience instance released');
  Sound.stopAmbient();
  assert.equal(manager.added.length, 1, 'stopping twice is safe');

  Sound.startAmbientCreek();
  assert.equal(manager.added.length, 2, 'ambience can start again later');
  assert.equal(manager.added[1].isPlaying, true);
});

await test('ambience without its file stays silent instead of throwing', () => {
  const Sound = loadSoundSystem();
  const manager = new FakeManager();
  Sound.setSoundManager(manager);
  Sound.startAmbientCreek();
  Sound.stopAmbient();
  assert.equal(manager.added.length, 0);
});

// --- call sites --------------------------------------------------------------

await test('player drives footsteps from movement and stops them when blocked', () => {
  const playerSource = readFileSync(path.join(root, 'src/actors/Player.ts'), 'utf8');
  assert.ok(!/playFootstep/.test(playerSource), 'per-step playback removed');
  assert.ok(/SoundSystem\.setWalking\(moved\)/.test(playerSource), 'movement drives the bed');
  assert.ok(/SoundSystem\.setWalking\(false\)/.test(playerSource), 'locked input stops the bed');
  assert.ok(/lastX/.test(playerSource) && /lastY/.test(playerSource), 'real displacement is measured');
});

await test('campaign scene owns ambience and footstep surface per level', () => {
  const sceneSource = readFileSync(path.join(root, 'src/scenes/CampaignScene.ts'), 'utf8');
  assert.ok(/SoundSystem\.stopAmbient\(\)/.test(sceneSource), 'ambience cleared per build');
  assert.ok(/SoundSystem\.startAmbientCreek\(\)/.test(sceneSource), 'creek starts its ambience');
  assert.ok(/setFootstepSurface/.test(sceneSource), 'surface chosen per level');
  assert.ok(/Phaser\.Scenes\.Events\.SHUTDOWN[\s\S]{0,300}stopFootsteps/.test(sceneSource), 'shutdown releases loops');
});

console.log(`\n${results.filter(r => r.status === 'PASS').length}/${results.length} sound checks passed.`);
