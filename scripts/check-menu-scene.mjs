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

const STORAGE = { name: 'local-storage' };

/**
 * A fixture for the V4 menu. `saveExists` is the V4 save as the store sees it; `store.clear()` removes it and
 * is counted, so the tests can prove a destructive action touched the store exactly as often as intended.
 */
function fixture({ saveExists = false, flavor = 'full' } = {}) {
  const objects = [], starts = [], tweens = [], stores = [];
  const state = { saveExists, clears: 0, muted: false };
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
      this.scene = { start: (...args) => starts.push(args), restart: (...args) => starts.push(['restart', ...args]) };
    }
  }
  // Stands in for the V4 store: it reports the live save state and counts clears.
  class V4SaveStore {
    constructor(storage) { stores.push(storage); }
    hasSave() { return state.saveExists; }
    clear() { state.saveExists = false; state.clears++; }
  }
  const SoundSystem = {
    isMuted: () => state.muted, toggleMute: () => { state.muted = !state.muted; },
    playLanternToggle() {}, playUiClick() {}, playUiCancel() {},
  };
  const MenuScene = new Function('Phaser', 'V4SaveStore', 'safeLocalStorage', 'SoundSystem', 'RELEASE_POLICY', 'tr', 'getLocale', 'otherLocale', 'setLocale', `${js}\nreturn MenuScene;`)(
    { Scene }, V4SaveStore, () => STORAGE, SoundSystem, createReleasePolicy(flavor),
    (text, params) => (params ? text.replace(/\{(\w+)\}/g, (match, key) => (key in params ? String(params[key]) : match)) : text),
    () => 'vi', () => 'en', () => {},
  );
  const scene = new MenuScene(); scene.create();
  return {
    scene, objects, starts, tweens, stores,
    clears: () => state.clears,
    muted: () => state.muted,
    setSave: (exists) => { state.saveExists = exists; },
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

// The labels a visible menu row shows, top to bottom.
const rows = f => f.scene.menuButtons.map(b => b.text);

// Fresh install: no Continue row, New Game starts at once and clears the (absent) save once.
const fresh = fixture();
assert.equal(fresh.text('Tiếp tục'), undefined, 'no Continue without a V4 save');
assert.deepEqual(rows(fresh), ['Hành trình mới', 'Âm thanh: Bật', 'Ngôn ngữ: Tiếng Việt'], 'fresh menu rows');
fresh.key('Enter');
assert.deepEqual(fresh.starts, [['V4Scene', { newGame: true }]], 'New Game without a save starts immediately');
assert.equal(fresh.clears(), 1, 'New Game clears the V4 save once');
assert.equal(fresh.stores[0], STORAGE, 'the store is built on safeLocalStorage()');

// With a save: Continue is the first and default row and starts V4Scene with no new-game flag.
const saved = fixture({ saveExists: true });
assert.deepEqual(rows(saved), ['Tiếp tục', 'Hành trình mới', 'Âm thanh: Bật', 'Ngôn ngữ: Tiếng Việt'], 'Continue row above New Game');
assert.equal(saved.scene.selectedIndex, 0, 'Continue is the default row');
saved.key('Enter');
assert.deepEqual(saved.starts, [['V4Scene']], 'Continue starts V4Scene without newGame');
assert.equal(saved.clears(), 0, 'Continue never clears the save');

// Opening the New Game confirmation, cancelling it, and modal isolation never touch the save.
const confirm = fixture({ saveExists: true });
confirm.scene.startNewGame();
assert.equal(confirm.clears(), 0, 'opening confirmation does not clear the save');
assert.equal(confirm.starts.length, 0, 'opening confirmation does not start the scene');
confirm.text('Bắt đầu lại').emit('pointerover');
assert.equal(confirm.scene.confirmSelectedIndex, 0, 'cursor resting over delete does not change the safe default');
confirm.key('Enter');
assert.equal(confirm.clears(), 0, 'Enter defaults to safe cancel');
assert.equal(confirm.scene.menuMode, 'menu');
confirm.scene.startNewGame(); confirm.key('Escape');
assert.equal(confirm.clears(), 0, 'Escape preserves the save');
confirm.scene.startNewGame();
const selected = confirm.scene.selectedIndex;
confirm.text('Âm thanh: Bật').emit('pointerdown');
assert.equal(confirm.muted(), false, 'background mouse action blocked during modal');
confirm.text('Tiếp tục').emit('pointerover');
assert.equal(confirm.scene.selectedIndex, selected, 'background hover blocked');
confirm.key('ArrowRight'); confirm.key('Enter', true);
assert.equal(confirm.clears(), 0, 'held key cannot confirm');
confirm.key('Enter');
assert.equal(confirm.clears(), 1, 'explicit confirmation clears the save once');
assert.deepEqual(confirm.starts, [['V4Scene', { newGame: true }]], 'confirmed New Game starts a fresh V4Scene');

// A key held down from the New Game row cannot confirm until its own release arms it.
const held = fixture({ saveExists: true });
held.key('ArrowDown'); held.key('Enter'); held.key('ArrowRight');
held.keyUp('KeyE'); held.key('Enter');
assert.equal(held.clears(), 0, 'releasing another key cannot arm a held activation key');
held.keyUp('Enter'); held.key('Enter');
assert.equal(held.clears(), 1, 'release of the activation key permits a fresh confirmation');

// Mouse: cancel keeps the save; the second New Game click confirms once.
const mouse = fixture({ saveExists: true });
mouse.text('Hành trình mới').emit('pointerdown');
mouse.text('Quay lại').emit('pointerdown');
assert.equal(mouse.clears(), 0, 'mouse cancel keeps the save');
mouse.text('Hành trình mới').emit('pointerdown');
mouse.text('Bắt đầu lại').emit('pointerdown');
assert.equal(mouse.clears(), 1, 'mouse confirm clears the save once');
assert.equal(mouse.starts.length, 1, 'mouse confirm starts once');

// A save written after the menu was built is still seen when New Game is pressed.
const late = fixture();
late.setSave(true);
late.scene.startNewGame();
assert.equal(late.scene.menuMode, 'confirm-new-game', 'the destructive action re-queries the save');

// Sound toggle still works from the menu row.
const sound = fixture();
const xsBefore = sound.scene.menuButtons.map(b => b.x);
sound.key('ArrowDown'); sound.key('Enter');
assert.equal(sound.muted(), true);
assert.ok(sound.text('Âm thanh: Tắt'), 'sound label redraws from live state');
assert.deepEqual(sound.scene.menuButtons.map(b => b.x), xsBefore, 'selection never shifts text');
assert.ok(sound.scene.menuButtons.every(b => !b.text.startsWith('▸')));

// Presentation: the golden dawn illustration, the display logo, Bitter menu text and the release tag.
const ui = fixture({ saveExists: true });
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
assert.ok(ui.scene.input.keyboard.eventNames().length > 0, 'menu registered its named keyboard handlers');
ui.scene.events.emit('shutdown');
assert.equal(ui.scene.input.keyboard.eventNames().length, 0, 'all owned keyboard handlers removed at shutdown');

console.log('PASS: V4 menu with and without a save, Continue routing, save-safe New Game confirmation, modal isolation, sound toggle, presentation and shutdown cleanup');
