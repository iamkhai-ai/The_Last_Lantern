import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source = fs.readFileSync(process.env.PLAYER_SOURCE_FILE ?? new URL('../src/actors/Player.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
});
const requestedFrames = [];
const Phaser = { Input: { Keyboard: { KeyCodes: Object.fromEntries(['W', 'A', 'S', 'D', 'SHIFT'].map(k => [k, k])) } } };
const mod = { exports: {} };
new Function('require', 'module', 'exports', outputText)(name => {
  if (name === 'phaser') return Phaser;
  if (name.endsWith('/CampaignArt')) return {
    getNhinhTexture(state, direction, frame) {
      const key = `nhinh_${direction}_${state}_${frame}`;
      assert.ok(fs.existsSync(new URL(`../assets/character/${key}.png`, import.meta.url)), `real shipped texture ${key}`);
      requestedFrames.push({ state, direction, frame });
      return key;
    },
  };
  if (name.endsWith('/SoundSystem')) return { SoundSystem: { playFootstepGrass() {}, setWalking() {} } };
  throw new Error(`Unexpected dependency ${name}`);
}, mod, mod.exports);
const { Player } = mod.exports;

function fixture() {
  const controls = Object.fromEntries(['left', 'right', 'up', 'down', 'shift', 'W', 'A', 'S', 'D', 'SHIFT'].map(k => [k, { isDown: false }]));
  const body = { setSize() {}, setOffset() {}, setVelocity(x, y) { this.vx = x; this.vy = y; } };
  const sprite = {
    x: 320, y: 180, depth: 20, body, texture: { key: '' },
    setDepth(value) { this.depth = value; }, setCollideWorldBounds() {},
    setPosition(x, y) { this.x = x; this.y = y; },
    setTexture(key) { this.texture.key = key; },
  };
  const scene = {
    physics: { add: { sprite(_x, _y, key) { sprite.texture.key = key; return sprite; } } },
    add: { image() { return { setDepth() {}, setPosition() {} }; } },
    input: { keyboard: { createCursorKeys() { return controls; }, addKey(code) { return controls[code]; } } },
    textures: { exists() { return true; } },
  };
  return { player: new Player(scene, 320, 180), controls, sprite, body };
}

function samples(f, hasLamp, lit, count = 5) {
  const frames = [];
  for (let i = 0; i < count; i++) {
    f.player.update(i ? 150 : 0, true, hasLamp, lit);
    frames.push(requestedFrames.at(-1));
  }
  return frames;
}

let cases = 0;
for (const direction of ['left', 'right']) {
  for (const running of [false, true]) {
    for (const [hasLamp, lit, suffix] of [[false, false, '_nolamp'], [true, false, ''], [true, true, '_lit']]) {
      const f = fixture(); f.controls[direction].isDown = true; f.controls.SHIFT.isDown = running;
      const observations = samples(f, hasLamp, lit);
      assert.deepEqual(observations.map(x => x.frame), [0, 1, 2, 1, 0], `${direction}/${running}/${suffix} alternates strides through passing`);
      assert.ok(observations.every(x => x.state === `${running ? 'run' : 'walk'}${suffix}` && x.direction === direction));
      assert.equal(Math.hypot(f.body.vx, f.body.vy), running ? 150 : 105);
      f.controls[direction].isDown = false; f.player.update(0, true, hasLamp, lit);
      assert.equal(requestedFrames.at(-1).state, `idle${suffix}`);
      f.controls[direction].isDown = true; f.player.update(0, true, hasLamp, lit);
      assert.equal(requestedFrames.at(-1).frame, 0, 'stopping resets stride');
      cases++;
    }
  }
}

for (const direction of ['up', 'down', 'upleft', 'upright', 'downleft', 'downright']) {
  const f = fixture();
  for (const key of ['up', 'down', 'left', 'right']) f.controls[key].isDown = direction.includes(key);
  assert.deepEqual(samples(f, true, false).map(x => x.frame), [0, 1, 2, 0, 1], `${direction} keeps three-frame gait`);
  cases++;
}

// Turning on the returning passing phase must never request non-existent frame 3.
for (const direction of ['up', 'down', 'upleft', 'upright', 'downleft', 'downright']) {
  const f = fixture(); f.controls.left.isDown = true;
  samples(f, true, false, 4);
  for (const key of ['up', 'down', 'left', 'right']) f.controls[key].isDown = direction.includes(key);
  f.player.update(0, true, true, false);
  assert.equal(requestedFrames.at(-1).frame, 0, `${direction} safely maps horizontal phase 3`);
  cases++;
}

const action = fixture(); action.controls.right.isDown = true;
samples(action, true, true, 4);
action.player.playPulseAction(); action.player.update(110, true, true, true);
assert.equal(requestedFrames.at(-1).state, 'pulse');
assert.equal(requestedFrames.at(-1).frame, 1);
action.player.update(220, false, true, true);
assert.equal(requestedFrames.at(-1).state, 'idle_lit');
assert.equal(action.body.vx, 0);
assert.equal(action.body.vy, 0);
cases++;
console.log(`PASS: ${cases} player gait cases; side strides, all lamp states, speed, stop/reset, turns and action priority`);
