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
  start(time = 0) { this.started = true; this.startedAt = time; this.ctx.starts += 1; }
  stop(time = 0) { this.stopped = true; this.stoppedAt = time; }
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
    this.filters = [];
  }
  resume() { return Promise.resolve(); }
  createBuffer(_channels, length) { return { getChannelData: () => new Float32Array(Math.min(length, 16)) }; }
  createOscillator() { const node = new FakeNode('osc', this); this.oscillators.push(node); return node; }
  createBufferSource() { const node = new FakeNode('source', this); this.sources.push(node); return node; }
  createGain() { const node = new FakeNode('gain', this); this.gains.push(node); return node; }
  createBiquadFilter() { const node = new FakeNode('filter', this); this.filters.push(node); return node; }
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
  ['playMechanismLatch', []], ['playWaterRelease', []],
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

await test('forest footsteps are quiet, unpitched contacts with a bounded tail', async () => {
  const Sound = await loadSoundSystem();
  Sound.playFootstep(false);
  const ctx = FakeAudioContext.last;
  assert.equal(ctx.oscillators.length, 0, 'no pitched oscillator can turn the forest step into a beep');
  assert.ok(ctx.sources.length > 0, 'the step has an earth and leaf texture');
  assert.ok(ctx.sources.every((s) => s.stopped && s.stoppedAt < 0.18), 'every layer ends before the next running footfall');
  assert.ok(ctx.envelopes.every((g) => g.gain.ramps[0][0] <= 0.09), 'all contacts stay soft');
});

await test('indoor footsteps use a short unpitched sole contact without the forest leaf tail', async () => {
  const Sound = await loadSoundSystem();
  Sound.setFootstepSurface('soil');
  Sound.playFootstep(true);
  const ctx = FakeAudioContext.last;
  assert.equal(ctx.oscillators.length, 0, 'no pitched indoor tap remains');
  assert.ok(ctx.sources.length > 0, 'the sole contact is audible');
  assert.ok(ctx.sources.every(s => s.stopped && s.stoppedAt < 0.12), 'the indoor contact is shorter than the forest rustle');
  assert.ok(ctx.envelopes.every(g => g.gain.ramps[0][0] <= 0.1), 'running stays soft');
});

await test('footsteps alternate feet and differ by surface and by running', async () => {
  const frequencyOf = async (surface, running) => {
    const Sound = await loadSoundSystem();
    Sound.setFootstepSurface(surface);
    const ctx = (Sound.playFootstep(running), FakeAudioContext.last);
    const first = ctx.filters[0].frequency.value;
    const texture = ctx.filters.map((f) => f.type).join(',');
    const voiceCount = ctx.filters.length;
    let second = null;
    withRandom(0.5, () => { Sound.playFootstep(running); second = ctx.filters[voiceCount].frequency.value; });
    return { first, second, texture, peak: ctx.envelopes[0].gain.ramps[0][0] };
  };
  const original = Math.random;
  Math.random = () => 0.5;
  try {
    const grass = await frequencyOf('grass', false);
    const soil = await frequencyOf('soil', false);
    const run = await frequencyOf('grass', true);
    assert.ok(grass.first / grass.second > 1.03 && grass.first / grass.second < 1.09, 'the two feet differ by about six percent');
    assert.notEqual(soil.texture, grass.texture, 'indoor soil and forest leaves have different textures');
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
  assert.equal(FakeAudioContext.last.oscillators.length, 0, 'neither surface uses a pitched contact');
  assert.ok(FakeAudioContext.last.sources.every((s) => s.stopped), 'all three steps end, including after shutdown');
});

// --- ambience --------------------------------------------------------------------------------------------------------

await test('music stays on the audio clock through suspension and a loop boundary, without replaying a backlog', async () => {
  const { startMusic, MUSIC_LOOP_SECONDS } = await import('../src/audio/music.ts');
  const originalSet = globalThis.setInterval;
  const originalClear = globalThis.clearInterval;
  let pump;
  let cleared = false;
  const token = {};
  globalThis.setInterval = (callback) => { pump = callback; return token; };
  globalThis.clearInterval = (id) => { assert.equal(id, token); cleared = true; };
  try {
    const ctx = new FakeAudioContext();
    const stop = startMusic(ctx, ctx.destination);
    const initial = ctx.starts;
    assert.ok(initial > 0, 'the opening chord is scheduled');
    for (let i = 0; i < 20; i++) pump();
    assert.equal(ctx.starts, initial, 'a suspended audio clock schedules no duplicates');
    ctx.currentTime = MUSIC_LOOP_SECONDS - 0.1;
    pump();
    const loopVoices = ctx.oscillators.slice(initial);
    assert.ok(loopVoices.length > 0, 'the next opening chord crosses the loop boundary');
    assert.ok(loopVoices.every((osc) => Math.abs(osc.startedAt - (MUSIC_LOOP_SECONDS + 0.05)) < 0.001), 'the loop remains on the original musical grid');
    const beforeSkip = ctx.starts;
    ctx.currentTime = MUSIC_LOOP_SECONDS * 5 + 0.8;
    pump();
    const afterSkip = ctx.oscillators.slice(beforeSkip);
    assert.ok(afterSkip.length < initial, 'a late timer does not replay five loops');
    assert.ok(afterSkip.every((osc) => osc.startedAt >= ctx.currentTime), 'no voice is scheduled in the past');
    stop();
    assert.equal(cleared, true, 'stopping music releases its scheduler');
  } finally {
    globalThis.setInterval = originalSet;
    globalThis.clearInterval = originalClear;
  }
});

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

await test('garden insects return only after watering, and all story themes stop their timers', async () => {
  const originalSet = globalThis.setInterval;
  const originalClear = globalThis.clearInterval;
  const timers = new Map();
  globalThis.setInterval = (callback, interval) => { const token = {}; timers.set(token, { callback, interval }); return token; };
  globalThis.clearInterval = token => timers.delete(token);
  try {
    const Sound = await loadSoundSystem();
    Sound.startAmbient('garden');
    let ctx = FakeAudioContext.last;
    assert.equal(ctx.oscillators.some(osc => osc.frequency.sets.some(([freq]) => freq > 3000)), false, 'no insects are scheduled in the bright garden');
    assert.deepEqual([...timers.values()].map(t => t.interval), [100], 'only the existing music scheduler runs before watering');
    Sound.startAmbient('garden-restored');
    assert.ok(ctx.oscillators.some(osc => osc.frequency.sets.some(([freq]) => freq > 4000)), 'the restored garden schedules the first cricket');
    assert.ok(ctx.oscillators.some(osc => osc.frequency.sets.some(([freq]) => freq > 3400 && freq < 4000)), 'a lower cricket answers');
    const afterStart = ctx.starts;
    Sound.startAmbient('garden-restored');
    assert.equal(ctx.starts, afterStart, 'restoring the same theme does not duplicate it');
    Sound.startAmbient('tower');
    const motors = ctx.oscillators.filter(osc => osc.frequency.value === 110 && osc.type === 'triangle');
    assert.equal(motors.length, 1, 'one motor runs before the tower returns water');
    Sound.startAmbient('tower-restored');
    await wait(1100);
    assert.ok(motors.every(osc => osc.stopped), 'the motor releases after switching to water');
    assert.equal([...timers.values()].some(t => t.interval === 6500), false, 'garden insects cannot carry into the tower');
    Sound.stopAmbient(0);
    assert.equal(timers.size, 0, 'shutdown clears every story theme scheduler');
    await wait(200);
  } finally { globalThis.setInterval = originalSet; globalThis.clearInterval = originalClear; }
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
  const known = ['forest', 'library', 'creek', 'wind', 'drone', 'heart', 'tower', 'garden'];
  assert.ok(themes.every((t) => known.includes(t)), 'every theme exists');
  assert.equal(themes[2], 'library');
  assert.equal(themes[3], 'creek');
  assert.equal(themes[5], 'tower');
  assert.equal(themes[6], 'garden');
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
