// Exercise the shipped scene with recording Phaser ports, matching the repo's runtime checks.
// Run: node scripts/check-menu-scene.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EventEmitter } from 'node:events';
import ts from 'typescript';

const source = readFileSync(new URL('../src/scenes/MenuScene.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source.replace(/^import .*;\r?\n/gm, '').replace('export class', 'class'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;

function fixture({ campaign = false, legacy = false, completed = false, victory = false } = {}) {
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
  const CampaignSaveSystem = { hasSave: () => campaign, isCompleted: () => completed, clear: () => { campaign = false; clears++; } };
  const SaveSystem = { hasSave: () => legacy, load: () => ({ stage: victory ? 'victory' : 'woods' }), clear: () => { legacy = false; clears++; } };
  const SoundSystem = { isMuted: () => muted, toggleMute: () => { muted = !muted; }, playLanternToggle() {}, playMirrorRotate() {} };
  const MenuScene = new Function('Phaser', 'getLevelArtKey', 'getNhinhTexture', 'EffectsSystem', 'SaveSystem', 'SoundSystem', 'WorldFactory', 'CampaignSaveSystem', `${js}\nreturn MenuScene;`)(
    { Scene }, () => 'backdrop', () => 'nhinh', class { setupZoneEffects() {} update() {} }, SaveSystem, SoundSystem, {}, CampaignSaveSystem,
  );
  const scene = new MenuScene(); scene.create();
  return { scene, objects, starts, tweens, clears: () => clears, muted: () => muted,
    key: (code, repeat = false) => {
      let prevented = false;
      scene.input.keyboard.emit('keydown', { code, repeat, preventDefault: () => { prevented = true; } });
      return prevented;
    },
    text: label => objects.find(o => o.active && o.text === label),
  };
}

// Opening and cancelling a destructive action must not touch either save store.
for (const save of [{ campaign: true }, { legacy: true }]) {
  const f = fixture(save);
  f.scene.startNewGame();
  assert.equal(f.clears(), 0, 'opening confirmation does not clear saves');
  assert.equal(f.starts.length, 0, 'opening confirmation does not start campaign');
  f.text('Bắt đầu lại').emit('pointerover');
  assert.equal(f.scene.confirmationIndex, 0, 'cursor resting over delete does not change the safe default');
  f.key('Enter');
  assert.equal(f.clears(), 0, 'Enter defaults to safe cancel');
  assert.equal(f.scene.confirmationOpen, false);
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
  assert.deepEqual(f.starts, [['CampaignScene', { newGame: true }]]);
}
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
assert.deepEqual(fresh.starts, [['CampaignScene', { newGame: true }]]);
for (const [save, expected] of [
  [{ campaign: true }, ['CampaignScene']],
  [{ campaign: true, completed: true }, ['EndingScene', { showCredits: true, campaign: true }]],
  [{ legacy: true }, ['WorldScene', { progress: { stage: 'woods' } }]],
  [{ legacy: true, victory: true }, ['EndingScene']],
]) {
  const f = fixture(save); f.key('Enter'); assert.deepEqual(f.starts, [expected], 'continue route preserved');
}
const ui = fixture({ campaign: true });
const positions = ui.scene.menuButtons.map(b => b.x);
assert.equal(ui.text('THE LAST\nLANTERN').style.fontFamily, 'Georgia, serif', 'logo typography remains unchanged');
for (const object of ui.objects.filter(o => o.text && o.text !== 'THE LAST\nLANTERN')) {
  assert.equal(object.style.fontFamily, 'Bitter, serif', 'menu and supporting text use embedded Bitter');
  assert.equal(object.style.fontStyle, '500', 'Bitter uses Medium weight');
  assert.equal(object.style.shadow.color, '#10180f', 'thin moss-black shadow separates text from the art');
  assert.equal(object.style.shadow.blur, 1);
}
assert.equal(ui.text('Tiếp tục').color, '#e8c777', 'selected item uses honey gold');
assert.equal(ui.text('Hành trình mới').color, '#efe6cf', 'inactive item uses warm ivory');
ui.key('ArrowDown'); ui.key('ArrowDown'); ui.key('Enter');
assert.equal(ui.muted(), true);
assert.ok(ui.text('Âm thanh: Tắt'));
assert.deepEqual(ui.scene.menuButtons.map(b => b.x), positions, 'selection never shifts text');
assert.ok(ui.scene.menuButtons.every(b => !b.text.startsWith('▸')));
assert.ok(ui.objects.some(o => o.key === 'menu_dawn'), 'menu uses the existing golden dawn illustration');
assert.equal(ui.objects.some(o => ['nhinh', 'lumo_0', 'light_radial', 'particle_firefly'].includes(o.key)), false, 'no detached characters or lights over the illustrated scene');
assert.equal(ui.tweens.length, 0, 'illustrated menu remains static');
assert.equal(ui.objects.filter(o => /Bản chơi thử/.test(o.text)).length, 1);
ui.scene.events.emit('shutdown');
assert.equal(ui.scene.input.keyboard.listenerCount('keydown'), 0, 'keyboard handlers removed at shutdown');
console.log('PASS: menu presentation, save-safe keyboard/mouse confirmation, modal isolation, continue routes, and shutdown cleanup');
