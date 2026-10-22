/**
 * Opening prologue — data, presentation, input and fresh-campaign routing checks.
 *
 * Run with:  node scripts/check-prologue.mjs
 *
 * The renderer and the browser are stubbed, but the shipped code is not:
 *
 *  - the four-panel narration/dialogue copy is the data module itself, and the expected
 *    strings below are the approved spec copy, not a copy of the module;
 *  - PrologueScene.ts is transpiled and its class instantiated, so init(),
 *    preload(), create(), update(), advance(), showPanel(), showLine(), finish()
 *    and cleanup() are the real shipped methods — the fake Phaser boundary only
 *    supplies `add`, `load`, `textures`, `input`, `events`, `scene.start` and a
 *    deterministic scene clock;
 *  - routing cases extract the shipped MenuScene/CampaignScene/PauseMenu method
 *    bodies and registered callbacks with the TypeScript compiler API (the same
 *    approach as check-campaign-ending.mjs) and run them against recording
 *    stubs for the save/sound/scene ports;
 *  - gameConfig.ts and CampaignScene.ts are read as syntax, so the scene
 *    registration order and "CampaignScene must not intercept newGame into the
 *    prologue" are asserted against the shipped source, not a re-implementation.
 *
 * Fake time is explicit: update(0, delta) steps the typewriter and the 450 ms
 * panel transition / 350 ms finish fade. No sleep loops are used.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { PROLOGUE_PANELS } from '../src/data/prologue.ts';
import { consumeCampaignNewGameIntent } from '../src/systems/CampaignStartIntent.ts';
import { RELEASE_POLICY } from '../src/config/releaseConfig.ts';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCENE_FILE = join(rootDir, 'src/scenes/PrologueScene.ts');
const MENU_FILE = join(rootDir, 'src/scenes/MenuScene.ts');
const CAMPAIGN_FILE = join(rootDir, 'src/scenes/CampaignScene.ts');
const PAUSE_FILE = join(rootDir, 'src/ui/PauseMenu.ts');
const CONFIG_FILE = join(rootDir, 'src/config/gameConfig.ts');

const panelRect = { x: 24, y: 274, width: 592, height: 78 };
const PANEL_FADE_MS = 450;
const FINISH_FADE_MS = 350;
const TYPE_MS = 24;
const POINTER_DEBOUNCE_MS = 140;

const EXPECTED_PANELS = [
  {
    id: '01-road-home',
    textureKey: 'prologue-01-road-home',
    lines: [
      { speaker: 'Lời dẫn', text: 'Chiều xuống trên con đường ven rừng. Dưới thung lũng, những ô cửa trong làng đã bắt đầu sáng đèn.' },
      { speaker: 'Nhinh', text: 'Mọi người thắp đèn cả rồi. Hôm nay mình về muộn quá.' },
      { speaker: 'Lời dẫn', text: 'Cậu kéo lại chiếc khăn, rảo bước về phía những mái nhà quen thuộc. Chỉ cần đi hết đoạn đường này, cậu sẽ về tới nhà.' },
      { speaker: 'Nhinh', text: 'May mà vẫn còn nhìn rõ đường.' },
    ],
  },
  {
    id: '02-voice-in-trees',
    textureKey: 'prologue-02-voice-in-trees',
    lines: [
      { speaker: 'Lời dẫn', text: 'Giữa tiếng lá xào xạc, một giọng nói rất khẽ vang lên. Nhinh dừng chân, lắng nghe.' },
      { speaker: 'Tiếng gọi', text: 'Có ai… nghe thấy tôi không?' },
      { speaker: 'Nhinh', text: 'Ai đấy? Bạn đang ở đâu?' },
      { speaker: 'Lời dẫn', text: 'Một đốm sáng vàng hiện lên giữa những thân cây, rồi khuất sau tán lá. Không có tiếng trả lời.' },
      { speaker: 'Nhinh', text: 'Bạn bị lạc à?' },
      { speaker: 'Lời dẫn', text: 'Nhinh ngoái nhìn về phía làng. Trời sắp tối. Cậu biết mình nên về — nhưng người kia có thể vẫn đang chờ một tiếng đáp.' },
      { speaker: 'Nhinh', text: 'Tôi nghe thấy rồi. Bạn cứ ở yên đó nhé.' },
      { speaker: 'Nhinh', text: 'Tôi sẽ tìm bạn, rồi mình cùng ra ngoài.' },
    ],
  },
  {
    id: '03-path-disappears',
    textureKey: 'prologue-03-path-disappears',
    lines: [
      { speaker: 'Lời dẫn', text: 'Sương dày lên quanh những gốc cây. Nhinh đi thêm một quãng, nhưng không còn thấy đốm sáng. Tiếng gọi cũng im bặt.' },
      { speaker: 'Nhinh', text: 'Tôi tới rồi đây. Bạn còn ở đó không?' },
      { speaker: 'Lời dẫn', text: 'Cậu đứng đợi. Chỉ có tiếng nước nhỏ từ những chiếc lá.' },
      { speaker: 'Nhinh', text: 'Vừa nãy rõ ràng là phía này mà…' },
      { speaker: 'Lời dẫn', text: 'Nhinh quay lại tìm lối cũ. Những ô cửa sáng đèn đã khuất. Giữa lớp sương, thân cây nào trông cũng giống thân cây cậu vừa đi qua.' },
      { speaker: 'Nhinh', text: 'Mình rẽ ở gốc cây kia… hay là chỗ này?' },
      { speaker: 'Nhinh', text: 'Bình tĩnh. Cứ quay lại từng đoạn một thôi.' },
      { speaker: 'Lời dẫn', text: 'Nhưng sau một hồi tìm kiếm, cậu vẫn không nhận ra chỗ rẽ ban đầu.' },
    ],
  },
  {
    id: '04-waiting-for-morning',
    textureKey: 'prologue-04-waiting-for-morning',
    lines: [
      { speaker: 'Lời dẫn', text: 'Khi đôi chân đã mỏi, Nhinh dừng dưới một gốc cây lớn. Bên cạnh đám rễ có một bia đá phủ rêu và chiếc đèn cũ không cháy.' },
      { speaker: 'Nhinh', text: 'Đi tiếp thế này chỉ lạc xa hơn thôi.' },
      { speaker: 'Lời dẫn', text: 'Cậu ngồi xuống, kéo chiếc khăn sát cổ. Trong rừng không còn tiếng bước chân nào ngoài tiếng của chính mình.' },
      { speaker: 'Nhinh', text: 'Người gọi lúc nãy… không biết đã tìm được đường ra chưa.' },
      { speaker: 'Lời dẫn', text: 'Nhinh lắng nghe thêm một lần nữa, rồi tựa lưng vào gốc cây.' },
      { speaker: 'Nhinh', text: 'Mình nghỉ một lát thôi. Đợi sương tan đã.' },
      { speaker: 'Nhinh', text: 'Sáng lên rồi mình sẽ tìm được đường về.' },
      { speaker: 'Lời dẫn', text: 'Cậu nhắm mắt. Trong đầu Nhinh, những ô cửa ở làng vẫn còn sáng.' },
    ],
  },
];

/* ------------------------------------------------------------------ *
 * 1. Load PrologueScene as the shipped class, with a Phaser boundary
 * ------------------------------------------------------------------ */

class FakePhaserScene {
  constructor(config = {}) {
    this.key = config.key;
    this.sys = { settings: { data: config.data } };
  }
}

const FAKE_PHASER = {
  Scene: FakePhaserScene,
  Math: { Clamp: (value, min, max) => Math.min(Math.max(value, min), max) },
};

const loadedScene = (() => {
  const source = readFileSync(SCENE_FILE, 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      useDefineForClassFields: false,
    },
  }).outputText;
  const module = { exports: {} };
  const required = [];
  const require = (id) => {
    required.push(id);
    if (id === 'phaser') return FAKE_PHASER;
    if (id === '../data/prologue' || id === '../data/prologue.ts') return { PROLOGUE_PANELS };
    // Identity i18n: these checks assert the authored Vietnamese copy, which is the catalogue key.
    if (id === '../i18n/catalog' || id === '../i18n/catalog.ts') return { tr: (text) => text, speakerLabel: (speaker) => speaker };
    if (/\.png$/.test(id)) return `asset://${id}`;
    throw new Error(`PrologueScene imports an unexpected module: ${id}`);
  };
  new Function('module', 'exports', 'require', js)(module, module.exports, require);
  assert.equal(typeof module.exports.PrologueScene, 'function', 'PrologueScene.ts still exports the scene class');
  return { PrologueScene: module.exports.PrologueScene, required };
})();

/* ------------------------------------------------------------------ *
 * 2. A recording Phaser boundary with fake time
 * ------------------------------------------------------------------ */

const KEY_CODES = { E: 'KeyE', ENTER: 'Enter', SPACE: 'Space', ESC: 'Escape' };

function makeKeyboard() {
  const registry = new Map();
  const physicallyDown = new Set();
  const delivered = [];
  const emit = (event, payload) => {
    delivered.push({ event, repeat: payload?.repeat === true });
    for (const handler of [...(registry.get(event) ?? [])]) handler(payload);
  };
  return {
    on(event, handler) {
      if (!registry.has(event)) registry.set(event, []);
      registry.get(event).push(handler);
    },
    off(event, handler) {
      const list = registry.get(event);
      if (!list) return;
      const index = list.indexOf(handler);
      if (index >= 0) list.splice(index, 1);
    },
    count(event) { return (registry.get(event) ?? []).length; },
    total() { let total = 0; for (const list of registry.values()) total += list.length; return total; },
    events() { return [...registry.keys()]; },
    emit,
    domHoldDown(name) { physicallyDown.add(name); },
    domKeydown(name) {
      const repeat = physicallyDown.has(name);
      physicallyDown.add(name);
      emit(`keydown-${name}`, { code: KEY_CODES[name] ?? name, repeat });
    },
    domKeyup(name) {
      physicallyDown.delete(name);
      emit(`keyup-${name}`, { code: KEY_CODES[name] ?? name, repeat: false });
    },
    delivered() { return delivered.map((entry) => ({ ...entry })); },
    removeAllListeners() { throw new Error('the prologue must never call keyboard.removeAllListeners()'); },
  };
}

function makeInput(keyboard) {
  const registry = new Map();
  return {
    keyboard,
    on(event, handler) {
      if (!registry.has(event)) registry.set(event, []);
      registry.get(event).push(handler);
    },
    off(event, handler) {
      const list = registry.get(event);
      if (!list) return;
      const index = list.indexOf(handler);
      if (index >= 0) list.splice(index, 1);
    },
    count(event) { return (registry.get(event) ?? []).length; },
    emitPointer(pointer) {
      for (const handler of [...(registry.get('pointerdown') ?? [])]) handler(pointer);
    },
    removeAllListeners() { throw new Error('the prologue must never call input.removeAllListeners()'); },
  };
}

function makeEvents() {
  const registry = new Map();
  const list = (event) => {
    if (!registry.has(event)) registry.set(event, []);
    return registry.get(event);
  };
  const api = {
    on(event, handler, context) { list(event).push({ handler, context, once: false }); },
    once(event, handler, context) { list(event).push({ handler, context, once: true }); },
    off(event, handler, context) {
      if (!registry.has(event)) return;
      if (handler === undefined) { registry.delete(event); return; }
      registry.set(event, list(event).filter((entry) => entry.handler !== handler
        || (context !== undefined && entry.context !== context)));
    },
    emit(event, ...args) {
      const snapshot = [...list(event)];
      for (const entry of snapshot) if (entry.once) api.off(event, entry.handler, entry.context);
      for (const entry of snapshot) entry.handler(...args);
    },
    count(event) { return list(event).length; },
    removeAllListeners() { throw new Error('the prologue must never call events.removeAllListeners()'); },
  };
  return api;
}

function makeBaseObject(kind, calls) {
  const object = {
    kind,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    text: '',
    style: null,
    textureKey: null,
    fillColor: null,
    fillAlpha: 1,
    alpha: 1,
    depth: 0,
    visible: true,
    interactive: false,
    originX: 0.5,
    originY: 0.5,
    displayWidth: 0,
    displayHeight: 0,
    handlers: {},
    rects: [],
    destroyed: false,
    setOrigin(x, y) { object.originX = x; object.originY = y; return object; },
    setDisplaySize(width, height) { object.displayWidth = width; object.displayHeight = height; return object; },
    setDepth(depth) { object.depth = depth; return object; },
    setAlpha(alpha) { object.alpha = alpha; return object; },
    setText(text) { object.text = text; calls.setTexts.push({ object, text }); return object; },
    setColor(color) { object.color = color; return object; },
    setFontSize(size) { object.fontSize = size; return object; },
    setVisible(visible) { object.visible = visible; return object; },
    setInteractive() { object.interactive = true; return object; },
    disableInteractive() { object.interactive = false; return object; },
    on(event, handler) {
      if (!object.handlers[event]) object.handlers[event] = [];
      object.handlers[event].push(handler);
      return object;
    },
    off(event, handler) {
      const list = object.handlers[event];
      if (!list) return object;
      const index = list.indexOf(handler);
      if (index >= 0) list.splice(index, 1);
      return object;
    },
    emit(event, ...args) {
      for (const handler of [...(object.handlers[event] ?? [])]) handler(...args);
    },
    destroy() { object.destroyed = true; calls.destroyed.push(object); },
    fillStyle(color, alpha) { object.fillColor = color; object.fillAlpha = alpha; return object; },
    lineStyle() { return object; },
    fillRect(x, y, width, height) { object.rects.push({ x, y, width, height }); return object; },
    fillRoundedRect(x, y, width, height, radius) {
      object.rects.push({ x, y, width, height, radius });
      return object;
    },
    strokeRoundedRect() { return object; },
  };
  return object;
}

function makeScene({ missing = [] } = {}) {
  const textures = new Set(PROLOGUE_PANELS.map((panel) => panel.textureKey).filter((key) => !missing.includes(key)));
  const calls = {
    texts: [], setTexts: [], images: [], rectangles: [], graphics: [], queued: [], started: [], destroyed: [],
  };
  const keyboard = makeKeyboard();
  const input = makeInput(keyboard);
  const events = makeEvents();

  const scene = new loadedScene.PrologueScene();
  scene.add = {
    image(x, y, textureKey) {
      const object = makeBaseObject('image', calls);
      object.x = x;
      object.y = y;
      object.textureKey = textureKey;
      calls.images.push(object);
      return object;
    },
    rectangle(x, y, width, height, fillColor) {
      const object = makeBaseObject('rectangle', calls);
      object.x = x;
      object.y = y;
      object.width = width;
      object.height = height;
      object.fillColor = fillColor;
      calls.rectangles.push(object);
      return object;
    },
    graphics() {
      const object = makeBaseObject('graphics', calls);
      calls.graphics.push(object);
      return object;
    },
    text(x, y, text, style) {
      const object = makeBaseObject('text', calls);
      object.x = x;
      object.y = y;
      object.text = text;
      object.style = style;
      calls.texts.push(object);
      return object;
    },
  };
  scene.load = {
    image(textureKey, url) { calls.queued.push({ textureKey, url }); },
  };
  scene.textures = {
    exists(textureKey) { return textures.has(textureKey); },
  };
  scene.input = input;
  scene.events = events;
  scene.scene = {
    start(key, data) { calls.started.push({ key, data }); },
  };

  const bundle = {
    scene, calls, keyboard, input, events, textures,
    boot() {
      scene.init();
      scene.preload();
      scene.create();
      return bundle;
    },
    update(delta) { scene.update(0, delta); return bundle; },
    press(name) {
      keyboard.emit(`keydown-${name}`, { code: KEY_CODES[name], repeat: false });
      return bundle;
    },
    release(name) {
      keyboard.emit(`keyup-${name}`, { code: KEY_CODES[name], repeat: false });
      return bundle;
    },
    textAt(y) { return calls.texts.findLast((object) => object.y === y && object.kind === 'text'); },
    skipButton() { return calls.texts.findLast((object) => object.text === '[Esc] Bỏ qua'); },
    background() { return scene.background; },
  };
  return bundle;
}

function typeOut(bundle) {
  bundle.update(5000);
  return bundle;
}

function finishCurrentLine(bundle) {
  bundle.press('E');
  return bundle;
}

/* ------------------------------------------------------------------ *
 * 3. Shipped-method extraction for the routing cases
 * ------------------------------------------------------------------ */

const menuSource = ts.createSourceFile(MENU_FILE, readFileSync(MENU_FILE, 'utf8'), ts.ScriptTarget.Latest, true);
const campaignSource = ts.createSourceFile(CAMPAIGN_FILE, readFileSync(CAMPAIGN_FILE, 'utf8'), ts.ScriptTarget.Latest, true);
const pauseSource = ts.createSourceFile(PAUSE_FILE, readFileSync(PAUSE_FILE, 'utf8'), ts.ScriptTarget.Latest, true);
const configSource = ts.createSourceFile(CONFIG_FILE, readFileSync(CONFIG_FILE, 'utf8'), ts.ScriptTarget.Latest, true);

const nodeText = (node) => node.getText(node.getSourceFile());

function walk(node, visit) {
  visit(node);
  node.forEachChild((child) => walk(child, visit));
}

function findNode(root, predicate) {
  let found = null;
  walk(root, (node) => { if (!found && predicate(node)) found = node; });
  return found;
}

function methodUnit(file, methodName, owner) {
  const method = findNode(file, (node) => ts.isMethodDeclaration(node) && nodeText(node.name) === methodName);
  assert.ok(method, `${owner} still declares ${methodName}()`);
  assert.ok(method.body, `${methodName}() still has a body`);
  return { params: method.parameters.map((parameter) => nodeText(parameter)), body: nodeText(method.body) };
}

function bindMethod(unit, symbols, label) {
  const names = Object.keys(symbols);
  const vals = names.map((name) => symbols[name]);
  let compiled;
  try {
    const js = ts.transpileModule(`const __unit = function (${unit.params.join(', ')}) ${unit.body};`, {
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
    }).outputText;
    compiled = new Function(...names, `"use strict";\n${js}\nreturn __unit;`)(...vals);
  } catch (error) {
    throw new Error(`could not compile ${label}: ${error.message}`);
  }
  return function (...args) { return compiled.call(this, ...args); };
}

function bindArrow(source, symbols, label) {
  const names = Object.keys(symbols);
  const vals = names.map((name) => symbols[name]);
  let compiled;
  try {
    const js = ts.transpileModule(`const __unit = function () { return (${source}); };`, {
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
    }).outputText;
    compiled = new Function(...names, `"use strict";\n${js}\nreturn __unit;`)(...vals);
  } catch (error) {
    throw new Error(`could not compile ${label}: ${error.message}`);
  }
  return (self, ...args) => compiled.call(self)(...args);
}

function registeredArrows(file) {
  const map = new Map();
  walk(file, (node) => {
    if (!ts.isCallExpression(node)) return;
    const [first, second] = node.arguments;
    if (!first || !ts.isStringLiteral(first) || !second || !ts.isArrowFunction(second)) return;
    if (!/^(keydown-|keyup-|pointer)/.test(first.text)) return;
    assert.ok(!map.has(first.text), `more than one ${first.text} handler is registered; the check cannot choose`);
    map.set(first.text, nodeText(second));
  });
  return map;
}

/* ------------------------------------------------------------------ *
 * 4. Cases
 * ------------------------------------------------------------------ */

const CASES = [
  {
    name: 'data_has_four_panels_and_twenty_eight_exact_turns',
    run: () => {
      assert.equal(PROLOGUE_PANELS.length, 4, 'exactly four panels');
      assert.deepEqual(PROLOGUE_PANELS.map((panel) => panel.id), EXPECTED_PANELS.map((panel) => panel.id),
        'panel ids match the four runtime basenames, in order');
      assert.deepEqual(PROLOGUE_PANELS.map((panel) => panel.textureKey), EXPECTED_PANELS.map((panel) => panel.textureKey),
        "every texture key is 'prologue-' + id");
      assert.deepEqual(PROLOGUE_PANELS.map((panel) => panel.lines.length), [4, 8, 8, 8], '4 + 8 + 8 + 8 narration/dialogue turns');
      assert.deepEqual(
        PROLOGUE_PANELS.flatMap((panel) => panel.lines.map((line) => `${line.speaker}: ${line.text}`)),
        EXPECTED_PANELS.flatMap((panel) => panel.lines.map((line) => `${line.speaker}: ${line.text}`)),
        'the approved Vietnamese copy is verbatim',
      );
      const lines = PROLOGUE_PANELS.flatMap((panel) => panel.lines);
      assert.equal(lines.length, 28, 'exactly twenty-eight approved turns');
      assert.equal(lines.some((line) => line.text === 'Trời vẫn chưa sáng sao?'), false,
        'the prologue does not replay the Level 01 opening lines');
    },
  },
  {
    name: 'scene_imports_exactly_the_four_runtime_pngs_and_no_save_or_sound_module',
    run: () => {
      const pngs = loadedScene.required.filter((id) => /\.png$/.test(id));
      assert.equal(pngs.length, 4, 'four explicit runtime PNG imports');
      assert.deepEqual(pngs.map((id) => id.split('/').pop()).sort(),
        EXPECTED_PANELS.map((panel) => `${panel.id}.png`).sort(), 'the four imports are the runtime basenames');
      assert.equal(pngs.some((id) => /master|storyboard|contact/i.test(id)), false,
        'no master/storyboard/contact sheet is imported');
      for (const forbidden of ['SoundSystem', 'SaveSystem', 'CampaignSaveSystem']) {
        assert.equal(loadedScene.required.some((id) => id.includes(forbidden)), false,
          `PrologueScene must not import ${forbidden}`);
      }
    },
  },
  {
    name: 'preload_queues_only_the_missing_textures',
    run: () => {
      const all = makeScene();
      all.scene.init();
      all.scene.preload();
      assert.deepEqual(all.calls.queued, [], 'with every texture present, preload queues nothing');

      const one = makeScene({ missing: ['prologue-02-voice-in-trees'] });
      one.scene.init();
      one.scene.preload();
      assert.deepEqual(one.calls.queued.map((entry) => entry.textureKey), ['prologue-02-voice-in-trees'],
        'only the missing texture is queued');
      assert.ok(one.calls.queued[0].url.endsWith('02-voice-in-trees.png'),
        'the queued URL is the imported runtime PNG');
    },
  },
  {
    name: 'create_shows_panel_one_with_the_authored_layout',
    run: () => {
      const bundle = makeScene().boot();
      assert.equal(bundle.scene.panelIndex, 0, 'panel 01 is active');
      assert.equal(bundle.scene.lineIndex, 0, 'line 1 is active');
      const speaker = bundle.textAt(282);
      const body = bundle.textAt(300);
      const hint = bundle.textAt(344);
      assert.ok(speaker && body && hint, 'speaker/body/hint text objects exist at their authored y positions');
      assert.equal(speaker.text, 'Lời dẫn', 'the opening narration is labelled');
      assert.equal(body.text, '', 'the body starts empty for the typewriter reveal');
      assert.equal(body.style.fontFamily, 'Segoe UI, sans-serif');
      assert.equal(body.style.fontSize, '12px');
      assert.equal(body.style.wordWrap.width, 552, 'body wraps at 552px');
      assert.equal(body.style.maxLines, 2, 'body is limited to two lines');
      assert.equal(hint.style.fontSize, '9px', 'the hint is 9px');

      const panel = bundle.calls.graphics[0];
      const drawn = panel.rects[0];
      assert.deepEqual({ x: drawn.x, y: drawn.y, width: drawn.width, height: drawn.height }, panelRect,
        'the dialogue panel is drawn at x24 y274 w592 h78');

      const background = bundle.background();
      assert.equal(background.kind, 'image');
      assert.equal(background.textureKey, 'prologue-01-road-home');
      assert.deepEqual([background.originX, background.originY], [0, 0], 'the art fills from the top-left');
      assert.deepEqual([background.displayWidth, background.displayHeight], [640, 360], 'the art fills the 640x360 viewport');

      const skip = bundle.skipButton();
      assert.ok(skip, "the visible skip control is '[Esc] Bỏ qua'");
      assert.equal(skip.originX, 1, 'the skip control is right-aligned in the top-right');
      assert.equal(skip.interactive, true, 'the skip control is interactive');
    },
  },
  {
    name: 'typewriter_reveals_one_character_every_24ms',
    run: () => {
      const bundle = makeScene().boot();
      const body = bundle.textAt(300);
      bundle.update(23);
      assert.equal(body.text.length, 0, 'nothing is revealed before 24ms');
      bundle.update(1);
      assert.equal(body.text.length, 1, 'the first character lands at 24ms');
      bundle.update(48);
      assert.equal(body.text.length, 3, 'two more characters land over the next 48ms');
      bundle.update(5000);
      assert.equal(body.text, EXPECTED_PANELS[0].lines[0].text, 'the full line is revealed');
    },
  },
  {
    name: 'advance_completes_the_line_then_moves_to_the_next',
    run: () => {
      const bundle = makeScene().boot();
      const body = bundle.textAt(300);
      bundle.update(TYPE_MS);
      assert.equal(body.text.length, 1, 'the line is still typing');
      bundle.press('E');
      assert.equal(body.text, EXPECTED_PANELS[0].lines[0].text, 'the first advance completes the current line');
      assert.equal(bundle.scene.lineIndex, 0, 'completing the text does not skip the line');
      bundle.press('E');
      assert.equal(bundle.scene.lineIndex, 1, 'the next advance opens the next turn in panel 01');
      assert.equal(bundle.scene.panelIndex, 0, 'the panel stays until its final turn');
      assert.equal(bundle.textAt(282).text, 'Nhinh');
      for (let line = 1; line < EXPECTED_PANELS[0].lines.length; line++) {
        typeOut(bundle);
        bundle.press('E');
      }
      bundle.update(PANEL_FADE_MS - 1);
      assert.equal(bundle.scene.panelIndex, 0, 'the final advance waits for the crossfade');
      bundle.update(1);
      assert.equal(bundle.scene.panelIndex, 1, 'the 450ms crossfade ends on panel 02');
      assert.equal(bundle.scene.lineIndex, 0);
      assert.equal(bundle.textAt(282).text, 'Lời dẫn');
      typeOut(bundle);
      assert.equal(bundle.textAt(300).text, EXPECTED_PANELS[1].lines[0].text);
    },
  },
  {
    name: 'panel_switch_only_happens_on_the_last_line',
    run: () => {
      const bundle = makeScene().boot();
      bundle.scene.showPanel(1);
      for (let line = 0; line < EXPECTED_PANELS[1].lines.length; line++) {
        assert.equal(bundle.scene.lineIndex, line, 'every approved turn is visited in order');
        assert.equal(bundle.scene.panelIndex, 1, 'the panel stays active through every turn');
        assert.equal(bundle.textAt(282).text, EXPECTED_PANELS[1].lines[line].speaker);
        typeOut(bundle);
        assert.equal(bundle.textAt(300).text, EXPECTED_PANELS[1].lines[line].text);
        bundle.press('E');
        assert.equal(Boolean(bundle.scene.transition), line === EXPECTED_PANELS[1].lines.length - 1,
          'only the final turn starts a transition');
      }
      bundle.update(PANEL_FADE_MS);
      assert.equal(bundle.scene.panelIndex, 2, 'only the last line advances the panel');
    },
  },
  {
    name: 'crossfade_lasts_450ms_and_ignores_advance_but_allows_skip',
    run: () => {
      const bundle = makeScene().boot();
      bundle.scene.showPanel(1);
      bundle.scene.showLine(EXPECTED_PANELS[1].lines.length - 1);
      typeOut(bundle);
      bundle.press('E');
      bundle.update(449);
      assert.equal(bundle.scene.panelIndex, 1, 'the crossfade has not switched panels before 450ms');
      assert.ok(bundle.scene.transition, 'the 450ms transition is still running at 449ms');
      bundle.press('E');
      assert.equal(bundle.scene.lineIndex, EXPECTED_PANELS[1].lines.length - 1, 'advance input is ignored during the crossfade');
      bundle.update(1);
      assert.equal(bundle.scene.transition, null, 'the transition ends at exactly 450ms');
      assert.equal(bundle.scene.panelIndex, 2, 'and the crossfade lands on the next panel');

      const skipped = makeScene().boot();
      skipped.scene.showPanel(1);
      skipped.scene.showLine(2);
      typeOut(skipped);
      skipped.press('E');
      skipped.update(100);
      skipped.press('ESC');
      assert.equal(skipped.scene.finishing, true, 'skip works during the crossfade');
      skipped.update(FINISH_FADE_MS);
      assert.equal(skipped.calls.started.length, 1, 'skip during the crossfade starts the campaign once');
      assert.deepEqual(skipped.calls.started[0], { key: 'CampaignScene', data: { newGame: true } });
    },
  },
  {
    name: 'finish_fades_350ms_then_starts_the_campaign_once',
    run: () => {
      const bundle = makeScene().boot();
      bundle.scene.showPanel(3);
      bundle.scene.showLine(EXPECTED_PANELS[3].lines.length - 1);
      typeOut(bundle);
      bundle.press('E');
      assert.equal(bundle.scene.finishing, true, 'the last line finishes the prologue');
      assert.equal(bundle.calls.started.length, 0, 'the campaign does not start before the fade completes');
      bundle.press('E');
      assert.equal(bundle.calls.started.length, 0, 'advance is ignored during the finish fade');
      bundle.update(FINISH_FADE_MS - 1);
      assert.equal(bundle.calls.started.length, 0, 'the fade is not complete at 349ms');
      bundle.update(1);
      assert.deepEqual(bundle.calls.started, [{ key: 'CampaignScene', data: { newGame: true } }],
        'exactly one CampaignScene start with the new-game intent');
      bundle.press('E');
      bundle.keyboard.emit('keydown-ESC', { code: 'Escape', repeat: false });
      bundle.update(FINISH_FADE_MS);
      assert.equal(bundle.calls.started.length, 1, 'post-finish input never starts the campaign twice');
    },
  },
  {
    name: 'skip_works_while_typing_and_repeated_skip_starts_once',
    run: () => {
      const bundle = makeScene().boot();
      bundle.press('E');
      bundle.update(10);
      bundle.press('ESC');
      assert.equal(bundle.scene.finishing, true, 'Esc skips during the typewriter');
      bundle.press('ESC');
      bundle.scene.finish();
      assert.equal(bundle.calls.started.length, 0, 'a repeated skip does not start early or twice');
      bundle.update(FINISH_FADE_MS);
      assert.equal(bundle.calls.started.length, 1, 'the one finish path starts the campaign once');
    },
  },
  {
    name: 'double_finish_and_finish_after_start_are_no_ops',
    run: () => {
      const bundle = makeScene().boot();
      bundle.scene.finish();
      bundle.scene.finish();
      bundle.update(FINISH_FADE_MS);
      assert.equal(bundle.calls.started.length, 1);
      bundle.scene.finish();
      bundle.keyboard.emit('keydown-ESC', { code: 'Escape', repeat: false });
      bundle.update(FINISH_FADE_MS);
      assert.equal(bundle.calls.started.length, 1, 'a finished prologue cannot start a second campaign');
    },
  },
  {
    name: 'init_and_create_after_a_completed_run_reset_cursor_and_guards',
    run: () => {
      const bundle = makeScene().boot();
      bundle.scene.showPanel(3);
      bundle.scene.showLine(EXPECTED_PANELS[3].lines.length - 1);
      typeOut(bundle);
      bundle.press('E');
      bundle.update(FINISH_FADE_MS);
      assert.equal(bundle.calls.started.length, 1);

      bundle.scene.init();
      bundle.scene.preload();
      bundle.scene.create();
      assert.equal(bundle.scene.panelIndex, 0, 'a reused scene starts on panel 01 again');
      assert.equal(bundle.scene.lineIndex, 0, 'and on its first line');
      assert.equal(bundle.textAt(300).text, '', 'the new run starts with a blank typewriter line');
      assert.equal(bundle.scene.finishing, false, 'the finishing guard is reset');
      assert.equal(bundle.scene.started, false, 'the scene-start guard is reset');
      assert.equal(bundle.scene.heldKeys.size, 0, 'the entry-key gate is reset');
      assert.equal(bundle.keyboard.count('keydown-E'), 1, 'the reused scene has exactly one advance listener');

      bundle.press('E');
      assert.equal(bundle.textAt(300).text, EXPECTED_PANELS[0].lines[0].text, 'the first press acts');
      bundle.update(FINISH_FADE_MS);
      assert.equal(bundle.calls.started.length, 1, 'the fresh run has not started anything yet');
      bundle.scene.finish();
      bundle.update(FINISH_FADE_MS);
      assert.equal(bundle.calls.started.length, 2, 'a later run can finish once more');
      assert.deepEqual(bundle.calls.started[1], { key: 'CampaignScene', data: { newGame: true } });
    },
  },
  {
    name: 'held_menu_key_needs_a_real_release_before_it_can_advance',
    run: () => {
      for (const name of ['E', 'ENTER', 'SPACE']) {
        const bundle = makeScene();
        bundle.scene.init();
        bundle.scene.preload();
        // The menu was activated by this key and it is still physically down when
        // the prologue scene creates its handlers.
        bundle.keyboard.domHoldDown(name);
        bundle.scene.create();

        bundle.keyboard.domKeydown(name);
        bundle.keyboard.domKeydown(name);
        bundle.update(200);
        assert.equal(bundle.scene.lineIndex, 0, `${name} held at entry must not advance the line`);
        assert.ok(bundle.scene.revealedChars < bundle.scene.fullLine.length,
          `${name} held at entry must not complete the typewriter reveal`);

        // Even a keydown that lost its DOM repeat flag is still ignored until the
        // physical release: the release gate is real, not a repeat-flag formality.
        bundle.keyboard.emit(`keydown-${name}`, { code: KEY_CODES[name], repeat: false });
        assert.equal(bundle.scene.lineIndex, 0, `${name} cannot act without a release`);
        assert.ok(bundle.scene.revealedChars < bundle.scene.fullLine.length,
          `${name} did not complete the line without a release`);

        bundle.keyboard.domKeyup(name);
        bundle.keyboard.domKeydown(name);
        assert.equal(bundle.textAt(300).text, EXPECTED_PANELS[0].lines[0].text,
          `${name} advances after a real release and a fresh press`);
      }
    },
  },
  {
    name: 'repeated_scene_start_rearms_the_entry_release_gate',
    run: () => {
      const bundle = makeScene().boot();
      bundle.keyboard.domHoldDown('E');
      bundle.keyboard.domKeydown('E');
      assert.equal(bundle.textAt(300).text, '');
      bundle.keyboard.domKeyup('E');
      bundle.keyboard.domKeydown('E');
      assert.equal(bundle.textAt(300).text, EXPECTED_PANELS[0].lines[0].text);

      bundle.scene.init();
      bundle.scene.preload();
      bundle.scene.create();
      bundle.keyboard.domHoldDown('E');
      bundle.keyboard.domKeydown('E');
      assert.equal(bundle.textAt(300).text, '', 'the revisit still gates a held E');
      bundle.keyboard.domKeyup('E');
      bundle.keyboard.domKeydown('E');
      assert.equal(bundle.textAt(300).text, EXPECTED_PANELS[0].lines[0].text, 'and accepts the release press');
    },
  },
  {
    name: 'auto_repeat_is_ignored',
    run: () => {
      const bundle = makeScene().boot();
      for (const name of ['E', 'ENTER', 'SPACE']) {
        bundle.keyboard.emit(`keydown-${name}`, { code: KEY_CODES[name], repeat: true });
      }
      bundle.update(200);
      assert.equal(bundle.scene.lineIndex, 0, 'auto-repeated advance keys never advance the line');
      assert.ok(bundle.scene.revealedChars < bundle.scene.fullLine.length,
        'auto-repeated advance keys never complete the typewriter reveal');
    },
  },
  {
    name: 'click_advances_only_inside_the_dialogue_area_after_the_entry_gate',
    run: () => {
      const bundle = makeScene().boot();
      bundle.input.emitPointer({ x: 100, y: 300, event: { timeStamp: 1 } });
      bundle.update(POINTER_DEBOUNCE_MS);
      assert.ok(bundle.scene.revealedChars < bundle.scene.fullLine.length,
        'a click delivered with the menu activation is ignored (the typewriter is still revealing)');
      bundle.input.emitPointer({ x: 100, y: 100, event: { timeStamp: 2 } });
      assert.ok(bundle.scene.revealedChars < bundle.scene.fullLine.length,
        'a click outside the dialogue area never advances');
      bundle.input.emitPointer({ x: 100, y: 300, event: { timeStamp: 3 } });
      assert.equal(bundle.textAt(300).text, EXPECTED_PANELS[0].lines[0].text,
        'a click inside the dialogue area advances after the entry gate');
    },
  },
  {
    name: 'double_click_is_debounced_for_at_least_140ms',
    run: () => {
      const bundle = makeScene().boot();
      bundle.scene.showPanel(1);
      bundle.update(POINTER_DEBOUNCE_MS);
      bundle.input.emitPointer({ x: 100, y: 300, event: { timeStamp: 1 } });
      assert.equal(bundle.textAt(300).text, EXPECTED_PANELS[1].lines[0].text, 'the first click completes the line');
      bundle.input.emitPointer({ x: 100, y: 300, event: { timeStamp: 2 } });
      assert.equal(bundle.scene.lineIndex, 0, 'the double-click inside 140ms does not advance');
      bundle.update(100);
      bundle.input.emitPointer({ x: 100, y: 300, event: { timeStamp: 3 } });
      assert.equal(bundle.scene.lineIndex, 0, 'still debounced at 100ms');
      bundle.update(40);
      bundle.input.emitPointer({ x: 100, y: 300, event: { timeStamp: 4 } });
      assert.equal(bundle.scene.lineIndex, 1, 'a click at 140ms advances exactly once');
    },
  },
  {
    name: 'skip_control_does_not_bubble_the_same_click_into_advance',
    run: () => {
      const bundle = makeScene().boot();
      const skip = bundle.skipButton();
      const pointer = { x: 600, y: 12, event: { timeStamp: 1 } };
      skip.emit('pointerdown', pointer);
      bundle.input.emitPointer(pointer);
      assert.equal(bundle.scene.finishing, true, 'the skip control starts the one finish path');
      assert.equal(bundle.scene.panelIndex, 0, 'the same click did not advance the panel');
      assert.equal(bundle.scene.lineIndex, 0, 'the same click did not advance the line');
      bundle.update(FINISH_FADE_MS);
      assert.equal(bundle.calls.started.length, 1, 'the skip click starts the campaign once');
    },
  },
  {
    name: 'one_missing_texture_falls_back_to_the_background_and_keeps_navigating',
    run: () => {
      const missing = 'prologue-02-voice-in-trees';
      const bundle = makeScene({ missing: [missing] }).boot();
      assert.equal(bundle.background().kind, 'image', 'panel 01 keeps its valid image');

      bundle.scene.showPanel(1);
      assert.equal(bundle.background().kind, 'rectangle', 'the panel with the missing texture falls back');
      assert.equal(bundle.background().fillColor, 0x081d26, 'the fallback is the authored #081d26');
      assert.deepEqual([bundle.background().width, bundle.background().height], [640, 360]);

      bundle.scene.showPanel(2);
      assert.equal(bundle.background().kind, 'image', 'the remaining panels keep using their images');
      assert.equal(bundle.background().textureKey, 'prologue-03-path-disappears');

      bundle.scene.showPanel(1);
      for (let line = 0; line < EXPECTED_PANELS[1].lines.length; line++) {
        typeOut(bundle);
        bundle.press('E');
      }
      bundle.update(PANEL_FADE_MS);
      assert.equal(bundle.scene.panelIndex, 2, 'the missing-image panel still advances to the next panel');
      bundle.scene.finish();
      bundle.update(FINISH_FADE_MS);
      assert.equal(bundle.calls.started.length, 1, 'and still finishes into the campaign');
    },
  },
  {
    name: 'all_textures_missing_still_allows_skip_into_gameplay',
    run: () => {
      const bundle = makeScene({ missing: EXPECTED_PANELS.map((panel) => panel.textureKey) }).boot();
      assert.equal(bundle.background().kind, 'rectangle');
      assert.equal(bundle.background().fillColor, 0x081d26);
      bundle.keyboard.emit('keydown-ESC', { code: 'Escape', repeat: false });
      bundle.update(FINISH_FADE_MS);
      assert.equal(bundle.calls.started.length, 1, 'a textureless prologue is still skippable into Level 01');
    },
  },
  {
    name: 'cleanup_removes_only_this_scenes_listeners_and_rearms_once',
    run: () => {
      const bundle = makeScene().boot();
      const foreignKey = () => undefined;
      const foreignPointer = () => undefined;
      const foreignShutdown = () => undefined;
      bundle.keyboard.on('keydown-X', foreignKey);
      bundle.input.on('pointerdown', foreignPointer);
      bundle.events.on('shutdown', foreignShutdown);
      const ownKeyboard = bundle.keyboard.total() - 1;
      const ownPointer = bundle.input.count('pointerdown') - 1;
      assert.equal(bundle.events.count('shutdown'), 2, 'the scene owns one shutdown hook');

      bundle.scene.cleanup();
      assert.equal(bundle.keyboard.count('keydown-E'), 0, 'cleanup removes the advance listener');
      assert.equal(bundle.keyboard.count('keydown-ESC'), 0, 'cleanup removes the skip listener');
      assert.equal(bundle.keyboard.count('keyup-E'), 0, 'cleanup removes the release listener');
      assert.equal(bundle.keyboard.total(), 1, 'only the foreign listener remains');
      assert.equal(bundle.input.count('pointerdown'), 1, 'only the foreign pointer listener remains');
      assert.equal(bundle.events.count('shutdown'), 1, 'only the foreign shutdown listener remains');
      assert.equal(bundle.skipButton().handlers.pointerdown.length, 0, 'the skip control listener is removed by identity');

      bundle.scene.create();
      assert.equal(bundle.keyboard.total(), ownKeyboard + 1, 're-entry leaves exactly one set of listeners');
      assert.equal(bundle.input.count('pointerdown'), ownPointer + 1, 're-entry leaves exactly one pointer listener');
      bundle.events.emit('shutdown');
      assert.equal(bundle.keyboard.total(), 1, 'shutdown removes every listener the scene registered');
      assert.equal(bundle.input.count('pointerdown'), 1, 'shutdown leaves the foreign pointer listener');
      assert.equal(bundle.events.count('shutdown'), 1, 'shutdown leaves the foreign shutdown listener');
    },
  },
  {
    name: 'menu_new_game_clears_both_saves_once_and_routes_to_the_prologue',
    run: () => {
      const arrows = registeredArrows(menuSource);
      for (const name of ['ENTER', 'SPACE', 'E']) {
        const scene = makeMenuScene();
        const { calls } = scene;
        const handler = bindArrow(arrows.get(`keydown-${name}`), {}, `MenuScene keydown-${name}`);
        const keyboard = makeKeyboard();
        keyboard.on(`keydown-${name}`, (event) => handler(scene, event));
        keyboard.emit(`keydown-${name}`, { repeat: false });
        assert.equal(calls.campaignCleared, 1, `${name}: New Game clears the campaign save once`);
        assert.equal(calls.legacyCleared, 1, `${name}: New Game clears the legacy save once`);
        assert.deepEqual(calls.started, [{ key: 'PrologueScene', data: undefined }],
          `${name}: New Game starts the prologue, not the campaign`);
        keyboard.emit(`keydown-${name}`, { repeat: false });
        assert.equal(calls.campaignCleared, 1, `${name}: a repeated activation does not clear again`);
        assert.equal(calls.legacyCleared, 1, `${name}: a repeated activation does not clear the legacy save again`);
        assert.equal(calls.started.length, 1, `${name}: a repeated activation does not start a second scene`);
      }

      const scene = makeMenuScene();
      const { calls } = scene;
      const pointer = bindArrow(registeredArrows(menuSource).get('pointerdown'), { idx: 0 }, 'MenuScene pointerdown');
      pointer(scene);
      assert.equal(calls.campaignCleared, 1, 'a click on New Game clears the campaign save once');
      assert.equal(calls.legacyCleared, 1, 'a click on New Game clears the legacy save once');
      assert.equal(calls.started[0].key, 'PrologueScene', 'a click on New Game routes through the prologue');
      pointer(scene);
      assert.equal(calls.campaignCleared, 1, 'a double-click does not clear a second time');
      assert.equal(calls.started.length, 1, 'a double-click does not start a second scene');
    },
  },
  {
    name: 'continue_even_completed_or_legacy_still_bypasses_the_prologue',
    run: () => {
      const normal = makeMenuScene({ completed: false, campaignSave: true, legacy: null });
      normal.continueGame();
      assert.deepEqual(normal.calls.started, [{ key: 'CampaignScene', data: undefined }],
        'Continue on a normal campaign goes straight to CampaignScene');
      assert.equal(normal.calls.campaignCleared, 0, 'Continue clears nothing');

      const completed = makeMenuScene({ completed: true, campaignSave: true, legacy: null });
      completed.continueGame();
      assert.deepEqual(completed.calls.started, [{ key: 'EndingScene', data: { campaign: true } }],
        'completed Continue still opens the campaign credits');
      assert.equal(completed.calls.campaignCleared, 0, 'completed Continue clears nothing');

      const legacyVictory = makeMenuScene({ completed: false, campaignSave: false, legacy: { stage: 'victory' } });
      legacyVictory.continueGame();
      assert.deepEqual(legacyVictory.calls.started, [{ key: 'EndingScene', data: undefined }],
        'a legacy victory still opens the legacy ending');

      const legacyRun = makeMenuScene({ completed: false, campaignSave: false, legacy: { stage: 'hub_initial' } });
      legacyRun.continueGame();
      assert.deepEqual(legacyRun.calls.started, [{ key: 'WorldScene', data: { progress: { stage: 'hub_initial' } } }],
        'a legacy save still resumes the legacy world');

      for (const bundle of [normal, completed, legacyVictory, legacyRun]) {
        assert.equal(bundle.calls.legacyCleared, 0, 'Continue never clears the legacy save');
        assert.equal(bundle.calls.started.some((entry) => entry.key === 'PrologueScene'), false,
          'Continue never routes through the prologue');
      }
    },
  },
  {
    name: 'confirmed_campaign_restart_clears_once_and_routes_to_the_prologue',
    run: () => {
      const source = findNode(campaignSource, (node) => ts.isPropertyAssignment(node)
        && nodeText(node.name) === 'onRestart' && ts.isArrowFunction(node.initializer));
      assert.ok(source, 'CampaignScene still passes an onRestart callback to the pause menu');
      const calls = { cleared: 0, started: [] };
      const scene = { scene: { start(key, data) { calls.started.push({ key, data }); } } };
      const restart = bindArrow(nodeText(source.initializer), {
        CampaignSaveSystem: { clear() { calls.cleared += 1; } },
      }, 'CampaignScene onRestart');
      restart(scene);
      assert.equal(calls.cleared, 1, 'the confirmed restart clears the campaign save once');
      assert.deepEqual(calls.started, [{ key: 'PrologueScene', data: undefined }],
        'the confirmed restart routes through the prologue instead of restarting CampaignScene');
    },
  },
  {
    name: 'pause_restart_confirmation_and_cancel_are_preserved',
    run: () => {
      const calls = { restart: 0, resume: 0, refresh: 0 };
      const scene = {
        active: true,
        selectedIndex: 1,
        confirmRestart: false,
        actions: ['resume', 'restart', 'sound', 'menu'],
        items: [{}, {}, {}, {}],
        onRestart() { calls.restart += 1; },
        onResume() { calls.resume += 1; },
        onMainMenu() { throw new Error('not used'); },
        refreshHighlight() { calls.refresh += 1; },
        container: { setVisible() {} },
      };
      const symbols = { SoundSystem: { toggleMute() {}, playUiClick() {}, playUiCancel() {} } };
      scene.triggerSelected = bindMethod(methodUnit(pauseSource, 'triggerSelected', 'PauseMenu'), symbols, 'PauseMenu.triggerSelected()');
      scene.moveSelection = bindMethod(methodUnit(pauseSource, 'moveSelection', 'PauseMenu'), symbols, 'PauseMenu.moveSelection()');
      scene.close = bindMethod(methodUnit(pauseSource, 'close', 'PauseMenu'), symbols, 'PauseMenu.close()');

      scene.triggerSelected();
      assert.equal(scene.confirmRestart, true, 'the first restart press only asks for confirmation');
      assert.equal(calls.restart, 0, 'the first press never restarts');
      scene.triggerSelected();
      assert.equal(calls.restart, 1, 'the confirmed restart runs exactly once');

      const cancelled = {
        active: true, selectedIndex: 1, confirmRestart: false, actions: ['resume', 'restart', 'sound', 'menu'], items: [{}, {}, {}, {}],
        onRestart() { calls.restart += 1; }, onResume() { calls.resume += 1; },
        onMainMenu() {}, refreshHighlight() {}, container: { setVisible() {} },
      };
      cancelled.triggerSelected = scene.triggerSelected;
      cancelled.moveSelection = scene.moveSelection;
      cancelled.close = scene.close;
      const before = calls.restart;
      cancelled.triggerSelected();
      cancelled.moveSelection(-1);
      cancelled.triggerSelected();
      assert.equal(calls.restart, before, 'moving away from the restart row cancels it without a restart');
      assert.equal(cancelled.confirmRestart, false, 'the cancel clears the confirmation state');
    },
  },
  {
    name: 'game_config_registers_the_prologue_after_boot_and_menu',
    run: () => {
      const sceneProperty = findNode(configSource, (node) => ts.isPropertyAssignment(node)
        && nodeText(node.name) === 'scene' && ts.isArrayLiteralExpression(node.initializer));
      assert.ok(sceneProperty, 'gameConfig.ts still declares the scene array');
      const names = sceneProperty.initializer.elements.map((element) => nodeText(element));
      assert.deepEqual(names.slice(0, 2), ['BootScene', 'MenuScene'], 'Boot/Menu ordering is unchanged');
      assert.ok(names.includes('PrologueScene'), 'PrologueScene is registered');
      assert.ok(names.indexOf('PrologueScene') >= 2, 'PrologueScene does not displace Boot or Menu');
    },
  },
  {
    name: 'campaign_scene_never_intercepts_new_game_into_the_prologue',
    run: () => {
      const create = findNode(campaignSource, (node) => ts.isMethodDeclaration(node) && nodeText(node.name) === 'create');
      assert.ok(create?.body, 'CampaignScene still declares create()');
      const createText = nodeText(create.body);
      assert.ok(/consumeCampaignNewGameIntent/.test(createText),
        'CampaignScene.create still consumes the new-game intent');
      const newGameBranch = findNode(create.body, (node) => ts.isIfStatement(node)
        && nodeText(node.expression) === 'newGameRequested');
      assert.ok(newGameBranch, 'CampaignScene.create still has its newGameRequested branch');
      assert.equal(/PrologueScene/.test(nodeText(newGameBranch.thenStatement)), false,
        'the newGame branch must not route into the prologue: the prologue finish passes newGame:true and would loop');
    },
  },
  {
    name: 'post_prologue_new_game_intent_is_one_shot',
    run: () => {
      const startData = { newGame: true };
      assert.equal(consumeCampaignNewGameIntent(startData, undefined), true,
        'the prologue handoff is consumed as a new game');
      assert.equal('newGame' in startData, false, 'and the intent is deleted so it cannot be replayed');
      assert.equal(consumeCampaignNewGameIntent(startData, undefined), false, 'a second consume is not a new game');
      assert.equal(consumeCampaignNewGameIntent(undefined, undefined), false,
        'a direct/debug CampaignScene start without the intent stays a normal load');
    },
  },
];

/* ------------------------------------------------------------------ *
 * 5. MenuScene stand-in (shipped methods only)
 * ------------------------------------------------------------------ */

function makeMenuScene({ completed = false, campaignSave = false, legacy = null } = {}) {
  const calls = { campaignCleared: 0, legacyCleared: 0, started: [], lantern: 0 };
  const scene = {
    selectedIndex: 0,
    menuButtons: [{}, {}],
    actions: [],
    starting: false,
    hasSavedGame: campaignSave || legacy !== null,
    calls,
    refreshMenuHighlight() {},
    scene: {
      start(key, data) { calls.started.push({ key, data }); },
    },
  };
  scene.completed = completed;
  scene.campaignSave = campaignSave;
  scene.legacy = legacy;
  const symbols = {
    // The checks run against the default full build: no VITE_BUILD_FLAVOR is
    // set, so the demo confirmation/new-game branches stay dormant here and the
    // bounded demo slice is covered by scripts/check-demo-release.mjs.
    RELEASE_POLICY,
    NEW_GAME_CONFIRM_TEXT: 'Chơi mới sẽ xóa tiến trình đang lưu. Bạn có muốn tiếp tục?',
    CONFIRM_LABELS: ['HỦY', 'CHƠI MỚI'],
    CampaignSaveSystem: {
      clear() { calls.campaignCleared += 1; },
      isCompleted() { return scene.completed === true; },
      hasSave() { return scene.campaignSave === true; },
      load() { return { version: 1, level: scene.campaignLevel ?? 0, flags: {}, counters: {}, lanternOn: false, lanternPickedUp: false }; },
    },
    SaveSystem: {
      clear() { calls.legacyCleared += 1; },
      load() { return scene.legacy ?? { stage: 'hub_initial' }; },
      hasSave() { return scene.legacy !== null; },
    },
    SoundSystem: { playLanternToggle() { calls.lantern += 1; }, playMirrorRotate() {}, playUiClick() {}, playUiCancel() {}, isMuted() { return false; } },
  };
  scene.startNewGame = bindMethod(methodUnit(menuSource, 'startNewGame', 'MenuScene'), symbols, 'MenuScene.startNewGame()');
  scene.hasAnySave = bindMethod(methodUnit(menuSource, 'hasAnySave', 'MenuScene'), symbols, 'MenuScene.hasAnySave()');
  scene.beginNewGame = bindMethod(methodUnit(menuSource, 'beginNewGame', 'MenuScene'), symbols, 'MenuScene.beginNewGame()');
  scene.continueGame = bindMethod(methodUnit(menuSource, 'continueGame', 'MenuScene'), symbols, 'MenuScene.continueGame()');
  scene.triggerSelected = bindMethod(methodUnit(menuSource, 'triggerSelected', 'MenuScene'), symbols, 'MenuScene.triggerSelected()');
  scene.actions = [() => scene.startNewGame()];
  return scene;
}

/* ------------------------------------------------------------------ *
 * 6. Runner
 * ------------------------------------------------------------------ */

const failures = [];
for (const testCase of CASES) {
  try {
    testCase.run();
    console.log(`PASS  ${testCase.name}`);
  } catch (error) {
    failures.push(testCase.name);
    console.log(`FAIL  ${testCase.name}`);
    for (const line of String(error.message).split('\n')) console.log(`        ${line}`);
  }
}
console.log(`\nprologue: ${CASES.length - failures.length}/${CASES.length} cases passed`);
if (failures.length) {
  console.log(`failed: ${failures.join(', ')}`);
  process.exit(1);
}
