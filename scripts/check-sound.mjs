// Sound Effect Lab integration checks. Run: node scripts/check-sound.mjs
// Covers the SFX manifest, the procedural fallback order, mute gating and the
// single-step footsteps (cut from the recorded beds and played on the footfalls) and the ambience loop.
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
    this.markers = [];
    this.played = [];
  }
  addMarker(marker) { this.markers.push(marker); return true; }
  play(marker, config) { this.isPlaying = true; this.plays += 1; if (marker !== undefined) this.played.push({ marker, config }); return true; }
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

await test('a footstep is one cut step, not a loop, and never repeats back to back', () => {
  const Sound = loadSoundSystem();
  const manager = new FakeManager();
  Sound.setSoundManager(manager);
  Sound.registerLoadedKey('footstep_grass');
  Sound.registerLoadedKey('footstep_soil');

  Sound.playFootstep();
  assert.equal(manager.added.length, 3, 'a small pool of voices, built once');
  assert.ok(manager.added.every(v => v.key === 'footstep_grass' && v.loop === false), 'grass voices, no loop');
  assert.ok(manager.added.every(v => v.markers.length > 8), 'every voice knows every cut step');
  assert.ok(manager.added.every(v => v.markers.every(m => m.duration > 0.2 && m.duration < 0.5 && m.start >= 0)), 'steps are short slices');
  const played = () => manager.added.flatMap(v => v.played);
  assert.equal(played().length, 1, 'one call plays exactly one step');
  assert.match(played()[0].marker, /^step\d+$/);

  for (let i = 0; i < 40; i += 1) Sound.playFootstep(i % 2 === 0);
  assert.equal(manager.added.length, 3, 'many steps never add voices');
  const sequence = manager.added.flatMap(v => v.played.map(p => p.marker));
  assert.equal(played().length, 41);
  const voicesUsed = manager.added.filter(v => v.played.length > 0).length;
  assert.equal(voicesUsed, 3, 'steps rotate over the voices so a quick step keeps the previous tail');
  const byTime = []; // reconstruct the call order from the rotation: voice k plays calls k, k+3, k+6, ...
  for (let call = 0; call < 41; call += 1) byTime.push(manager.added[call % 3].played[Math.floor(call / 3)].marker);
  for (let i = 1; i < byTime.length; i += 1) assert.notEqual(byTime[i], byTime[i - 1], 'the same cut step never plays twice in a row');
  assert.ok(new Set(sequence).size > 4, 'steps vary');
});

await test('walking is softer and lower than running, and both stay audible', () => {
  const Sound = loadSoundSystem();
  const manager = new FakeManager();
  Sound.setSoundManager(manager);
  Sound.registerLoadedKey('footstep_grass');
  const volumes = { walk: [], run: [] };
  const rates = { walk: [], run: [] };
  for (let i = 0; i < 60; i += 1) {
    for (const mode of ['walk', 'run']) {
      Sound.playFootstep(mode === 'run');
      const last = manager.added.flatMap(v => v.played).at(-1);
      volumes[mode].push(last.config.volume);
      rates[mode].push(last.config.rate);
    }
  }
  const mean = list => list.reduce((a, b) => a + b, 0) / list.length;
  assert.ok(mean(volumes.run) > mean(volumes.walk), 'running is louder');
  assert.ok(mean(rates.run) > mean(rates.walk), 'running is higher in pitch');
  assert.ok(Math.min(...volumes.walk) > 0.3, 'a walking step is never nearly silent');
  assert.ok(Math.max(...volumes.run) <= 1, 'volumes stay within range');
});

await test('footsteps follow the level surface', () => {
  const Sound = loadSoundSystem();
  const manager = new FakeManager();
  Sound.setSoundManager(manager);
  Sound.registerLoadedKey('footstep_grass');
  Sound.registerLoadedKey('footstep_soil');

  Sound.playFootstep();
  Sound.setFootstepSurface('soil');
  Sound.playFootstep();
  assert.equal(manager.added.length, 6, 'a pool per surface');
  assert.equal(manager.added.filter(v => v.key === 'footstep_soil').length, 3);
  Sound.setFootstepSurface('grass');
  Sound.playFootstep();
  assert.equal(manager.added.length, 6, 'going back reuses the grass pool');
});

await test('footsteps stay silent without the surface file, when muted, and after shutdown release', () => {
  const Sound = loadSoundSystem();
  const manager = new FakeManager();
  Sound.setSoundManager(manager);
  Sound.playFootstep();
  assert.equal(manager.added.length, 0, 'nothing without footstep_grass');

  Sound.registerLoadedKey('footstep_grass');
  Sound.playFootstep();
  const voices = [...manager.added];
  assert.equal(voices.length, 3);
  Sound.stopFootsteps();
  assert.ok(voices.every(v => v.destroyed), 'shutdown releases every voice');
  Sound.playFootstep();
  assert.equal(manager.added.length, 6, 'the next step rebuilds the voices');

  Sound.toggleMute();
  Sound.playFootstep();
  assert.equal(manager.added.length, 6, 'muted: no new step');
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

await test('player plays a step when the body really moves, then on every other animation phase', () => {
  const playerSource = readFileSync(path.join(root, 'src/actors/Player.ts'), 'utf8');
  assert.ok(!/setWalking/.test(playerSource), 'the looping bed is gone');
  assert.ok(/SoundSystem\.playFootstep\(isRunning\)/.test(playerSource), 'steps carry the running state');
  assert.ok(/if \(!moved\) this\.stepping = false;[\s\S]{0,200}SoundSystem\.playFootstep/.test(playerSource), 'a first step once the body moves');
  assert.ok(/this\.stepTick >= 2[\s\S]{0,120}if \(moved\) SoundSystem\.playFootstep/.test(playerSource), 'then one every two phases, only while moving');
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
