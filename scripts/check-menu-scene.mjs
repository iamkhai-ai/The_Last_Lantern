// Exercise the shipped scene with recording Phaser ports, matching the repo's runtime checks.
// Run: node scripts/check-menu-scene.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EventEmitter } from 'node:events';
import ts from 'typescript';
import { createReleasePolicy } from '../src/config/releaseConfig.ts';

const source = readFileSync(new URL('../src/scenes/MenuScene.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source.replace(/^import .*;\r?\n/gm, '').replace('export class', 'class'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;

function fixture({ campaign = false, legacy = false, completed = false, victory = false, flavor = 'full', level = 0 } = {}) {
  const objects = [], starts = [], tweens = [];
  let clears = 0, muted = false;
  class Display extends EventEmitter {
    constructor(x = 0, y = 0, text = '') { super(); Object.assign(this, { x, y, text, active: true }); objects.push(this); }
    setDepth(v) { this.depth = v; return this; }
    setOrigin() { return this; }
    setScale() { return this; }
    setAlpha() { return this; }
    setDisplaySize() { return this; }
    setName(v) { this.name = v; return this; }
    setColor(v) { this.color = v; return this; }
    setText(v) { this.text = v; return this; }
    setPosition(x, y) { this.x = x; this.y = y; return this; }
    setVisible(v) { this.visible = v; return this; }
    setInteractive() { this.interactive = true; return this; }
    disableInteractive() { this.interactive = false; return this; }
    fillStyle() { return this; }
    lineStyle() { return this; }
    fillRect() { return this; }
    fillRoundedRect() { return this; }
    strokeRoundedRect() { return this; }
    fillCircle() { return this; }
    beginPath() { return this; }
    moveTo() { return this; }
    lineTo() { return this; }
    closePath() { return this; }
    fillPath() { return this; }
    destroy() { this.active = false; this.removeAllListeners(); }
  }
  class Keyboard extends EventEmitter {
    bindings = new Map();
    on(event, listener, context) {
      const bound = context ? listener.bind(context) : listener;
      this.bindings.set(listener, bound);
      return super.on(event, bound);
    }
    off(event, listener) { return super.off(event, this.bindings.get(listener) ?? listener); }
  }
  class Scene {
    constructor() {
      this.add = {
        image: (x, y, key) => Object.assign(new Display(x, y), { key }),
        sprite: (x, y, key) => Object.assign(new Display(x, y), { key }),
        text: (x, y, text, style) => Object.assign(new Display(x, y, text), { style }),
        graphics: () => new Display(),
        rectangle: (x, y) => new Display(x, y),
        circle: (x, y) => new Display(x, y),
      };
      this.input = { keyboard: new Keyboard(), setTopOnly() {} };
      this.events = new EventEmitter();
      this.textures = { exists: () => true };
      this.tweens = { add: config => tweens.push(config) };
      this.scene = { start: (...args) => starts.push(args) };
    }
  }
  const CampaignSaveSystem = { load: () => ({ level }), hasSave: () => campaign, isCompleted: () => completed, clear: () => { campaign = false; clears++; } };
  const SaveSystem = { hasSave: () => legacy, load: () => ({ stage: victory ? 'victory' : 'woods' }), clear: () => { legacy = false; clears++; } };
  const SoundSystem = { isMuted: () => muted, toggleMute: () => { muted = !muted; }, playLanternToggle() {}, playMirrorRotate() {}, playUiClick() {}, playUiCancel() {} };
  const MenuScene = new Function('Phaser', 'getLevelArtKey', 'getNhinhTexture', 'EffectsSystem', 'SaveSystem', 'SoundSystem', 'WorldFactory', 'CampaignSaveSystem', 'RELEASE_POLICY', `${js}\nreturn MenuScene;`)(
    { Scene }, () => 'backdrop', () => 'nhinh', class { setupZoneEffects() {} update() {} }, SaveSystem, SoundSystem, {}, CampaignSaveSystem, createReleasePolicy(flavor),
  );
  const scene = new MenuScene(); scene.create();
  return { scene, objects, starts, tweens, clears: () => clears, muted: () => muted,
    key: (code, repeat = false) => {
      let prevented = false;
      const event = { code, repeat, preventDefault: () => { prevented = true; } };
       scene.input.keyboard.emit('keydown', event);
       const name = { ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', KeyW: 'W', KeyS: 'S', Enter: 'ENTER', Space: 'SPACE', KeyE: 'E', Escape: 'ESC' }[code];
       scene.input.keyboard.emit(`keydown-${name}`, event);
      return prevented;
    },
    keyUp: code => scene.input.keyboard.emit(`keyup-${{ Enter: 'ENTER', Space: 'SPACE', KeyE: 'E' }[code]}`, { code }),
    text: label => objects.find(o => o.active && o.visible !== false && o.text === label),
  };
}

// Opening and cancelling a destructive action must not touch either save store.
for (const save of [{ campaign: true }, { legacy: true }]) {
  const f = fixture(save);
  f.scene.startNewGame();
  assert.equal(f.clears(), 0, 'opening confirmation does not clear saves');
  assert.equal(f.starts.length, 0, 'opening confirmation does not start campaign');
  f.text('Bắt đầu lại').emit('pointerover');
  assert.equal(f.scene.confirmSelectedIndex, 0, 'cursor resting over delete does not change the safe default');
  f.key('Enter');
  assert.equal(f.clears(), 0, 'Enter defaults to safe cancel');
  assert.equal(f.scene.menuMode, 'menu');
  f.scene.startNewGame(); f.key('Escape');
  assert.equal(f.clears(), 0, 'Escape preserves saves');
  f.scene.startNewGame();
  const selected = f.scene.selectedIndex;
  f.text('Âm thanh: Bật').emit('pointerdown');
  assert.equal(f.muted(), false, 'background mouse action blocked during modal');
  f.text('Tiếp tục').emit('pointerover');
  assert.equal(f.scene.selectedIndex, selected, 'background hover blocked');
  f.key('ArrowRight'); f.key('Enter', true);
  assert.equal(f.clears(), 0, 'held key cannot confirm');
  f.key('Enter');
  assert.equal(f.clears(), 2, 'explicit confirmation clears both stores once');
  assert.deepEqual(f.starts, [['PrologueScene']]);
}
const held = fixture({ campaign: true });
held.key('ArrowDown'); held.key('Enter'); held.key('ArrowRight');
held.keyUp('KeyE'); held.key('Enter');
assert.equal(held.clears(), 0, 'releasing another key cannot arm a held activation key');
held.keyUp('Enter'); held.key('Enter');
assert.equal(held.clears(), 2, 'release of the activation key permits a fresh confirmation');
const mouse = fixture({ campaign: true });
mouse.text('Hành trình mới').emit('pointerdown');
mouse.text('Quay lại').emit('pointerdown');
assert.equal(mouse.clears(), 0);
mouse.text('Hành trình mới').emit('pointerdown');
mouse.text('Bắt đầu lại').emit('pointerdown');
assert.equal(mouse.clears(), 2);
assert.equal(mouse.starts.length, 1);

const fresh = fixture();
assert.equal(fresh.text('Tiếp tục'), undefined);
fresh.key('Enter');
assert.deepEqual(fresh.starts, [['PrologueScene']]);
for (const [save, expected] of [
  [{ campaign: true }, ['CampaignScene']],
  [{ campaign: true, completed: true }, ['EndingScene', { campaign: true }]],
  [{ legacy: true }, ['WorldScene', { progress: { stage: 'woods' } }]],
  [{ legacy: true, victory: true }, ['EndingScene']],
]) {
  const f = fixture(save); f.key('Enter'); assert.deepEqual(f.starts, [expected], 'continue route preserved');
}
const ui = fixture({ campaign: true });
const positions = ui.scene.menuButtons.map(b => b.x);
ui.key('ArrowDown'); ui.key('ArrowDown'); ui.key('Enter');
assert.equal(ui.muted(), true);
assert.ok(ui.text('Âm thanh: Tắt'));
assert.deepEqual(ui.scene.menuButtons.map(b => b.x), positions, 'selection never shifts text');
assert.ok(ui.scene.menuButtons.every(b => !b.text.startsWith('▸')));
assert.ok(ui.objects.some(o => o.key === 'menu_dawn'), 'menu uses the existing golden dawn illustration');
assert.equal(ui.objects.some(o => ['nhinh', 'lumo_0', 'light_radial', 'particle_firefly'].includes(o.key)), false, 'no detached characters or lights over the illustrated scene');
assert.equal(ui.tweens.length, 0, 'illustrated menu remains static');
const logo = ui.objects.find(o => o.text === 'THE LAST\nLANTERN');
assert.equal(logo.style.fontFamily, 'Georgia, serif', 'logo keeps its display face');
const subtitle = ui.text('Khu rừng ánh sáng');
assert.equal(subtitle.style.fontFamily, 'Bitter, serif');
assert.equal(subtitle.style.fontStyle, '500');
assert.ok(subtitle.style.shadow, 'menu text stays legible over the bright illustration');
assert.ok(ui.scene.menuButtons.every(b => b.style.fontFamily === 'Bitter, serif' && b.style.fontStyle === '500'));
assert.ok(ui.text(createReleasePolicy('full').buildTag), 'full tag comes from release policy');
const demo = fixture({ flavor: 'demo', campaign: true, level: 5 });
demo.key('Enter');
assert.deepEqual(demo.starts, [['ComingSoonScene', { mode: 'demo-save-blocked' }]]);
assert.equal(demo.clears(), 0, 'redesigned menu preserves an out-of-demo save');
assert.ok(demo.text(createReleasePolicy('demo').buildTag));
assert.ok(ui.scene.input.keyboard.eventNames().length > 0, 'menu registered its named keyboard handlers');
ui.scene.events.emit('shutdown');
assert.equal(ui.scene.input.keyboard.eventNames().length, 0, 'all owned keyboard handlers removed at shutdown');
console.log('PASS: menu presentation, save-safe keyboard/mouse confirmation, modal isolation, continue routes, and shutdown cleanup');
