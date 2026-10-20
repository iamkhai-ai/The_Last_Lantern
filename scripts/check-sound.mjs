// Procedural sound checks. Run: node scripts/check-sound.mjs
// The game has no audio files: every effect, footstep and ambience is built with Web Audio. These checks run the real
// SoundSystem against a recording fake AudioContext and cover: every cue makes sound, mute gating, soft and varied
// footsteps that follow the feet, one ambience theme at a time with every timer released, a theme for every level, and
// that no audio files or loaders have crept back in.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (file) => readFileSync(path.join(root, file), 'utf8');

class FakeParam {
  constructor() { this.value = 0; this.sets = []; this.ramps = []; }
  setValueAtTime(value, time) { this.value = value; this.sets.push([value, time]); return this; }
  linearRampToValueAtTime(value, time) { this.ramps.push([value, time]); return this; }
  exponentialRampToValueAtTime(value, time) { this.ramps.push([value, time]); return this; }
  cancelScheduledValues() { return this; }
}

class FakeNode {
  constructor(kind, ctx) {
    this.kind = kind;
    this.ctx = ctx;
    this.frequency = new FakeParam();
    this.gain = new FakeParam();
    this.Q = new FakeParam();
    this.started = false;
    this.stopped = false;
    this.disconnected = false;
  }
  connect() { return this; }
  disconnect() { this.disconnected = true; }
  start() { this.started = true; this.ctx.starts += 1; }
  stop() { this.stopped = true; }
}

class FakeAudioContext {
  static last = null;
  constructor() {
    FakeAudioContext.last = this;
    this.state = 'running';
    this.currentTime = 0;
    this.sampleRate = 48000;
    this.destination = {};
    this.starts = 0;
    this.oscillators = [];
    this.sources = [];
    this.gains = [];
  }
  resume() { return Promise.resolve(); }
  createBuffer(_channels, length) { return { getChannelData: () => new Float32Array(Math.min(length, 16)) }; }
  createOscillator() { const node = new FakeNode('osc', this); this.oscillators.push(node); return node; }
  createBufferSource() { const node = new FakeNode('source', this); this.sources.push(node); return node; }
  createGain() { const node = new FakeNode('gain', this); this.gains.push(node); return node; }
  createBiquadFilter() { return new FakeNode('filter', this); }
  createDynamicsCompressor() { const node = new FakeNode('compressor', this); node.threshold = new FakeParam(); node.knee = new FakeParam(); node.ratio = new FakeParam(); node.attack = new FakeParam(); node.release = new FakeParam(); return node; }
  /** The gains that carry an envelope (a tone or a noise burst), in creation order. */
  get envelopes() { return this.gains.filter((g) => g.gain.ramps.length > 0); }
}

globalThis.window = { AudioContext: FakeAudioContext };

let fresh = 0;
async function loadSoundSystem() {
  const url = new URL('../src/systems/SoundSystem.ts', import.meta.url);
  url.search = `?fresh=${++fresh}`;
  return (await import(url.href)).SoundSystem;
}

const results = [];
async function test(name, run) {
  try {
    await run();
    results.push({ name, status: 'PASS' });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, status: 'FAIL' });
    console.log(`FAIL ${name}`);
    for (const line of String(error.stack ?? error).split('\n').slice(0, 6)) console.log(`      ${line}`);
  }
}
const withRandom = (value, run) => {
  const original = Math.random;
  Math.random = () => value;
  try { return run(); } finally { Math.random = original; }
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- every cue makes sound -----------------------------------------------------------------------------------------

const CUES = [
  ['playLanternToggle', [true]], ['playLanternToggle', [false]], ['playLightPulse', []], ['playRuneActivate', [1]],
  ['playRuneActivate', [3]], ['playPuzzleError', []], ['playMirrorRotate', []], ['playPuzzleSolved', []],
  ['playCrystalPickup', []], ['playDialogueTick', ['Nhinh']], ['playDialogueTick', ['Lumo']], ['playDialogueTick', ['Shadow']],
  ['playEndingCue', ['cricket']], ['playEndingCue', ['answer']], ['playEndingCue', ['water']], ['playDawnChord', []],
  ['playUiClick', []], ['playUiCancel', []], ['playUiSuccess', []], ['playUiLevelUp', []], ['playUiItemGet', []],
  ['playUiItemGet2', []], ['playDoorOpen', []], ['playDoorClose', []], ['playGateOpen', []],
];

await test('every cue schedules sound on the audio clock', async () => {
  for (const [name, args] of CUES) {
    const Sound = await loadSoundSystem();
    Sound[name](...args);
    const ctx = FakeAudioContext.last;
    assert.ok(ctx.starts > 0, `${name}(${args.join(',')}) started no voice`);
    assert.ok(ctx.envelopes.length > 0, `${name} has no envelope`);
    for (const g of ctx.envelopes) {
      const peak = g.gain.ramps[0][0];
      assert.ok(peak > 0 && peak <= 0.2, `${name} peak ${peak} stays within range before the master chain`);
    }
  }
});

await test('muting stops new cues and footsteps, and unmuting brings them back', async () => {
  const Sound = await loadSoundSystem();
  Sound.playUiClick();
  const ctx = FakeAudioContext.last;
  const before = ctx.starts;
  assert.equal(Sound.toggleMute(), true);
  assert.equal(Sound.isMuted(), true);
  Sound.playLanternToggle(true);
  Sound.playFootstep(false);
  assert.equal(ctx.starts, before, 'nothing is scheduled while muted');
  assert.equal(ctx.gains[0].gain.ramps.at(-1)[0], 0, 'the master gain ramps to silence');
  assert.equal(Sound.toggleMute(), false);
  Sound.playUiClick();
  assert.ok(ctx.starts > before, 'sound is back after unmuting');
  assert.equal(ctx.gains[0].gain.ramps.at(-1)[0], 1, 'the master gain ramps back to full');
});

// --- footsteps -------------------------------------------------------------------------------------------------------

await test('a footstep is one short, soft voice with no loop and no timer', async () => {
  const Sound = await loadSoundSystem();
  Sound.playFootstep(false);
  const ctx = FakeAudioContext.last;
  assert.equal(ctx.oscillators.length, 1, 'one low thump');
  assert.equal(ctx.sources.length, 1, 'plus one very short filtered touch');
  assert.ok(ctx.sources.every((s) => s.stopped), 'the noise is scheduled to end');
  const [thumpPeak] = ctx.envelopes[0].gain.ramps[0];
  const [noisePeak] = ctx.envelopes[1].gain.ramps[0];
  assert.ok(thumpPeak <= 0.08, `soft thump (${thumpPeak})`);
  assert.ok(noisePeak < thumpPeak * 0.5, `the noise stays under the tone (${noisePeak} vs ${thumpPeak})`);
});

await test('footsteps alternate feet and differ by surface and by running', async () => {
  const frequencyOf = async (surface, running, steps) => {
    const Sound = await loadSoundSystem();
    Sound.setFootstepSurface(surface);
    const ctx = (Sound.playFootstep(running), FakeAudioContext.last);
    const first = ctx.oscillators[0].frequency.sets[0][0];
    let second = null;
    withRandom(0.5, () => { Sound.playFootstep(running); second = ctx.oscillators[1].frequency.sets[0][0]; });
    return { first, second, peak: ctx.envelopes[0].gain.ramps[0][0] };
  };
  const original = Math.random;
  Math.random = () => 0.5;
  try {
    const grass = await frequencyOf('grass', false);
    const soil = await frequencyOf('soil', false);
    const run = await frequencyOf('grass', true);
    assert.ok(grass.first / grass.second > 1.03 && grass.first / grass.second < 1.09, 'the two feet differ by about six percent');
    assert.ok(soil.first < grass.first, 'soil is lower than grass');
    assert.ok(run.first > grass.first, 'running is higher');
    assert.ok(run.peak > grass.peak, 'running is a little firmer');
    assert.ok(run.peak < 0.12, 'and still light');
  } finally { Math.random = original; }
});

await test('footsteps follow the level surface and shutdown is harmless', async () => {
  const Sound = await loadSoundSystem();
  Sound.setFootstepSurface('soil');
  Sound.playFootstep(false);
  Sound.setFootstepSurface('grass');
  Sound.playFootstep(false);
  Sound.stopFootsteps();
  Sound.playFootstep(true);
  assert.equal(FakeAudioContext.last.oscillators.length, 3, 'each step is its own voice, before and after shutdown');
});

// --- ambience --------------------------------------------------------------------------------------------------------

await test('one ambience theme at a time, fading in, and asking again changes nothing', async () => {
  const Sound = await loadSoundSystem();
  Sound.startAmbient('library');
  const ctx = FakeAudioContext.last;
  const nodes = ctx.oscillators.length + ctx.sources.length;
  assert.ok(nodes > 3, 'the library bed builds its layers');
  Sound.startAmbient('library');
  assert.equal(ctx.oscillators.length + ctx.sources.length, nodes, 'the same theme is not rebuilt');
  const library = [...ctx.oscillators];
  Sound.startAmbient('creek');
  assert.ok(ctx.oscillators.length + ctx.sources.length > nodes, 'a new theme builds its own layers');
  await wait(1100);
  assert.ok(library.every((osc) => osc.stopped), 'the old theme releases every oscillator after its fade');
  Sound.stopAmbient(0);
  await wait(200);
});

await test('ambience timers stop with the theme and sparse events only play while it lives', async () => {
  const Sound = await loadSoundSystem();
  const original = Math.random;
  Math.random = () => 0.1;
  try {
    Sound.startAmbient('forest');
    const ctx = FakeAudioContext.last;
    const started = ctx.oscillators.length;
    await wait(850);
    assert.ok(ctx.oscillators.length > started, 'crickets chirp while the forest plays');
    Sound.stopAmbient(0);
    await wait(250);
    const after = ctx.oscillators.length;
    await wait(850);
    assert.equal(ctx.oscillators.length, after, 'no event is scheduled after the theme is stopped');
  } finally { Math.random = original; }
});

await test('muted ambience keeps running silently and returns with the sound', async () => {
  const Sound = await loadSoundSystem();
  Sound.toggleMute();
  Sound.startAmbient('wind');
  const ctx = FakeAudioContext.last;
  assert.ok(ctx.sources.length > 0, 'the bed exists while muted');
  assert.equal(ctx.gains[0].gain.value, 0, 'but the master gain is silent');
  Sound.toggleMute();
  assert.equal(ctx.gains[0].gain.ramps.at(-1)[0], 1, 'unmuting restores it');
  Sound.stopAmbient(0);
  await wait(200);
});

// --- call sites and repo hygiene ------------------------------------------------------------------------------------

await test('the player plays a step when the body really moves, then on every other animation phase', () => {
  const player = read('src/actors/Player.ts');
  assert.ok(!/setWalking/.test(player), 'no looping bed');
  assert.ok(/SoundSystem\.playFootstep\(isRunning\)/.test(player), 'steps carry the running state');
  assert.ok(/if \(!moved\) this\.stepping = false;[\s\S]{0,200}SoundSystem\.playFootstep/.test(player), 'a first step once the body moves');
  assert.ok(/this\.stepTick >= 2[\s\S]{0,120}if \(moved\) SoundSystem\.playFootstep/.test(player), 'then one every two phases, only while moving');
  assert.ok(/lastX/.test(player) && /lastY/.test(player), 'real displacement is measured');
});

await test('every level has an ambience theme and the scene owns ambience and the surface', () => {
  const scene = read('src/scenes/CampaignScene.ts');
  const table = scene.match(/AMBIENCE_BY_LEVEL: readonly AmbienceTheme\[\] = \[([^\]]*)\]/);
  assert.ok(table, 'a level -> theme table exists');
  const themes = [...table[1].matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
  assert.equal(themes.length, 10, 'one theme per level');
  const known = ['forest', 'library', 'creek', 'wind', 'drone', 'heart'];
  assert.ok(themes.every((t) => known.includes(t)), 'every theme exists');
  assert.equal(themes[2], 'library');
  assert.equal(themes[3], 'creek');
  assert.ok(/SoundSystem\.startAmbient\(AMBIENCE_BY_LEVEL\[this\.progress\.level\]/.test(scene), 'the level theme starts on build');
  assert.ok(/setFootstepSurface/.test(scene), 'surface chosen per level');
  assert.ok(/Phaser\.Scenes\.Events\.SHUTDOWN[\s\S]{0,300}stopFootsteps/.test(scene), 'shutdown releases footsteps');
  assert.ok(/Phaser\.Scenes\.Events\.SHUTDOWN[\s\S]{0,300}stopAmbient/.test(scene), 'shutdown fades the ambience out');
});

await test('no audio files and no audio loader remain', () => {
  assert.ok(!existsSync(path.join(root, 'src/assets/sfx')), 'src/assets/sfx is gone');
  assert.ok(!existsSync(path.join(root, 'scripts/download-sfx.ps1')), 'the download script is gone');
  assert.ok(!/load\.audio|glob\([^)]*(mp3|ogg|wav)/.test(read('src/scenes/BootScene.ts')), 'the boot scene loads no audio');
  const walk = (dir) => readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
  const audioFiles = walk(path.join(root, 'src')).concat(walk(path.join(root, 'assets'))).filter((f) => /\.(mp3|ogg|wav|flac|m4a)$/i.test(f));
  assert.deepEqual(audioFiles, [], 'no audio file ships in src/ or assets/');
});

const failed = results.filter((r) => r.status === 'FAIL').length;
console.log(`\n${results.length - failed}/${results.length} sound checks passed.`);
if (failed) process.exit(1);
