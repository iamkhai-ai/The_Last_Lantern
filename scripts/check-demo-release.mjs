/**
 * Bounded demo slice (levels 01–04) — build flavor, campaign boundary, save
 * preservation, menu confirmation and teardown checks.
 *
 * Run with:  node scripts/check-demo-release.mjs
 *
 * This is a behavioral check, not a model of the intended behavior:
 *
 *  - the release policy is the shipped module (`src/config/releaseConfig.ts`),
 *    imported directly, so the accepted flavors, labels and cap are the real
 *    values the build consumes;
 *  - MenuScene and CampaignScene method bodies are pulled out of the shipped
 *    TypeScript with the compiler API (the approach already used by
 *    check-campaign-ending.mjs and check-prologue.mjs) and bound to recording
 *    stubs for their Phaser/save/sound ports. The demo and full policies are
 *    injected into the same shipped bodies, so both modes run the same logic;
 *  - the real CampaignSaveSystem and SaveSystem read and write a fake
 *    localStorage, and the raw strings are compared byte-for-byte before and
 *    after every blocked path — no re-implementation of save handling;
 *  - ComingSoonScene is transpiled and its shipped class instantiated against a
 *    small fake Phaser boundary, so the demo-end and blocked-save copy, the
 *    single Main Menu exit and the listener teardown are the shipped code;
 *  - the input emitters model Phaser's KeyboardPlugin (DOM `repeat` included),
 *    and `scene.sys.events` keeps eventemitter3's by-identity removal, so
 *    "held key", "auto-repeat" and "shutdown leaves Phaser's listeners alone"
 *    are tested against the semantics the game actually runs on.
 *
 * The single-source cases are only supplements: they check that the demo
 * boundary sits in the required order inside create() and that the shipped
 * labels/confirmation copy exist. Behavior is proven by the cases above.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { CAMPAIGN_LEVELS } from '../src/data/campaignLevels.ts';
import { CampaignSaveSystem } from '../src/systems/CampaignSaveSystem.ts';

/**
 * SaveSystem.ts imports its types without a `.ts` extension, which Node's ESM
 * resolver rejects on a direct `.ts` import. Transpile it the same way the
 * scene checks load scenes; the class itself is still the shipped one.
 */
const { SaveSystem } = (() => {
  const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src/systems/SaveSystem.ts'), 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      useDefineForClassFields: false,
    },
  }).outputText;
  const module = { exports: {} };
  new Function('module', 'exports', 'require', js)(module, module.exports, () => {
    throw new Error('SaveSystem.ts must not import a runtime module');
  });
  return module.exports;
})();

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const MENU_FILE = join(rootDir, 'src/scenes/MenuScene.ts');
const CAMPAIGN_FILE = join(rootDir, 'src/scenes/CampaignScene.ts');
const COMING_FILE = join(rootDir, 'src/scenes/ComingSoonScene.ts');

const CAMPAIGN_STORAGE_KEY = 'last-lantern-campaign-save-v1';
const CONFIRM_SENTENCE = 'Chơi mới sẽ xóa tiến trình đang lưu. Bạn có muốn tiếp tục?';
const DEMO_END_TITLE = 'BẢN CHƠI THỬ ĐẾN ĐÂY LÀ HẾT';
const DEMO_END_BODY = 'Cảm ơn bạn đã khám phá 4 màn đầu tiên. Hành trình của Nhinh và Lumo vẫn còn tiếp tục.';

let releaseModule = null;
let releaseError = null;
try {
  releaseModule = await import('../src/config/releaseConfig.ts');
} catch (error) {
  releaseError = error;
}

function requireRelease() {
  assert.ok(releaseModule,
    `src/config/releaseConfig.ts must ship the build flavor policy (load error: ${releaseError?.message ?? 'missing'})`);
  return releaseModule;
}

function policyFor(flavor) {
  return requireRelease().createReleasePolicy(flavor);
}

/* ------------------------------------------------------------------ *
 * 1. TypeScript source utilities
 * ------------------------------------------------------------------ */

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

function parse(file) {
  return ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
}

function methodUnit(file, methodName) {
  const source = parse(file);
  const method = findNode(source, (node) => ts.isMethodDeclaration(node) && nodeText(node.name) === methodName);
  assert.ok(method, `${file} still declares ${methodName}()`);
  assert.ok(method.body, `${methodName}() still has a body`);
  return {
    params: method.parameters.map((parameter) => nodeText(parameter)),
    body: nodeText(method.body),
  };
}

function methodUnitOrNull(file, methodName) {
  try {
    return methodUnit(file, methodName);
  } catch {
    return null;
  }
}

function bindUnit(unit, symbols, label) {
  const names = Object.keys(symbols);
  const values = names.map((name) => symbols[name]);
  let compiled;
  try {
    const js = ts.transpileModule(`const __unit = function (${unit.params.join(', ')}) ${unit.body};`, {
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
    }).outputText;
    compiled = new Function(...names, `"use strict";\n${js}\nreturn __unit;`)(...values);
  } catch (error) {
    throw new Error(`could not compile ${label}: ${error.message}`);
  }
  return function (...args) { return compiled.call(this, ...args); };
}

function bindMethod(file, methodName, symbols, label = methodName) {
  return bindUnit(methodUnit(file, methodName), symbols, label);
}

function bindArrow(arrowSource, symbols, label) {
  const names = Object.keys(symbols);
  const values = names.map((name) => symbols[name]);
  let unit;
  try {
    const js = ts.transpileModule(`const __unit = function () { return (${arrowSource}); };`, {
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
    }).outputText;
    unit = new Function(...names, `"use strict";\n${js}\nreturn __unit;`)(...values);
  } catch (error) {
    throw new Error(`could not compile ${label}: ${error.message}`);
  }
  return (self, ...args) => unit.call(self)(...args);
}

/* ------------------------------------------------------------------ *
 * 2. Phaser boundary stubs (keyboard, events, text, graphics)
 * ------------------------------------------------------------------ */

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
    domKeydown(name) {
      const repeat = physicallyDown.has(name);
      physicallyDown.add(name);
      emit(`keydown-${name}`, { repeat });
    },
    domKeyup(name) {
      physicallyDown.delete(name);
      emit(`keyup-${name}`, { repeat: false });
    },
    delivered() { return delivered.map((entry) => ({ ...entry })); },
    removeAllListeners() { throw new Error('the scene must never call keyboard.removeAllListeners()'); },
  };
}

/**
 * `scene.sys.events` with eventemitter3's semantics: `off(event)` with no
 * handler clears every listener for the event, while `off(event, handler,
 * context)` removes only the matching one. Phaser's scene plugins register
 * their teardown here, so the difference matters.
 */
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
    removeAllListeners() { throw new Error('the scene must never call events.removeAllListeners()'); },
  };
  return api;
}

function makeText(record = []) {
  const object = {
    text: '',
    visible: true,
    color: '',
    interactive: false,
    depth: 0,
    handlers: {},
    setText(value) { object.text = value; record.push(value); return object; },
    setColor(value) { object.color = value; return object; },
    setVisible(value) { object.visible = value; return object; },
    setInteractive() { object.interactive = true; return object; },
    disableInteractive() { object.interactive = false; return object; },
    setOrigin() { return object; },
    setDepth(value) { object.depth = value; return object; },
    on(event, handler) { (object.handlers[event] ??= []).push(handler); return object; },
    emit(event, ...args) { for (const handler of [...(object.handlers[event] ?? [])]) handler(...args); },
  };
  return object;
}

function makeGraphics(record = []) {
  const object = {
    visible: true,
    depth: 0,
    setDepth(value) { object.depth = value; return object; },
    setVisible(value) { object.visible = value; return object; },
    fillStyle() { return object; },
    lineStyle() { return object; },
    fillRect() { return object; },
    fillRoundedRect() { return object; },
    strokeRoundedRect() { return object; },
    lineBetween() { return object; },
  };
  record.push(object);
  return object;
}

function makeLocalStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  const ops = { get: 0, set: 0, remove: 0 };
  return {
    data,
    ops,
    getItem(key) { ops.get += 1; return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { ops.set += 1; data.set(key, String(value)); },
    removeItem(key) { ops.remove += 1; data.delete(key); },
    snapshot() { return new Map(data); },
  };
}

function assertStorageUntouched(storage, before) {
  const now = storage.snapshot();
  assert.deepEqual([...now.entries()].sort(), [...before.entries()].sort(),
    'the raw save strings are byte-for-byte unchanged');
  assert.equal(storage.ops.set, 0, 'no save write happened');
  assert.equal(storage.ops.remove, 0, 'no save delete happened');
}

/* ------------------------------------------------------------------ *
 * 3. MenuScene harness — shipped methods, injected policy, real saves
 * ------------------------------------------------------------------ */

const MENU_METHODS = [
  'startNewGame', 'beginNewGame', 'requestNewGameConfirmation', 'confirmNewGame',
  'cancelNewGame', 'activateConfirm', 'onConfirmPointer', 'triggerSelected',
  'moveSelection', 'refreshMenuHighlight', 'wireInput', 'armConfirm', 'onKey',
  'clearKeyListeners', 'registerShutdownGuard', 'clearShutdownGuard', 'teardownInput',
  'continueGame', 'openBlockedSaveMessage', 'setConfirmVisible', 'hasAnySave', 'soundLabel',
];

function makeMenuHarness({ policy, campaignLevel, campaignFlags = {}, legacyStage, noSave = false } = {}) {
  const storage = makeLocalStorage();
  globalThis.window = { localStorage: storage };

  if (campaignLevel !== undefined) {
    CampaignSaveSystem.save({
      ...CampaignSaveSystem.createDefaultProgress(),
      level: campaignLevel,
      flags: { ...campaignFlags },
    });
  }
  if (legacyStage !== undefined) {
    SaveSystem.save({ ...SaveSystem.createDefaultProgress(), stage: legacyStage });
  }
  const before = storage.snapshot();
  storage.ops.set = 0;
  storage.ops.remove = 0;

  const hasSavedGame = !noSave && (CampaignSaveSystem.hasSave() || SaveSystem.hasSave());
  const calls = {
    started: [], campaignCleared: 0, legacyCleared: 0, lantern: 0, mirror: 0,
  };
  const keyboard = makeKeyboard();
  const events = makeEvents();
  const scene = {
    selectedIndex: hasSavedGame ? 1 : 0,
    selectedIndexBeforeConfirm: hasSavedGame ? 1 : 0,
    menuMode: 'menu',
    confirmSelectedIndex: 0,
    confirmArmed: false,
    activationViaKey: false,
    starting: false,
    hasSavedGame,
    keyListeners: [],
    shutdownHandler: undefined,
    menuButtons: [makeText(), makeText(), makeText()],
    confirmButtons: [makeText(), makeText()],
    confirmText: makeText(),
    confirmBackdrop: makeText(),
    confirmDecorations: [],
    selectionDot: { setVisible() {}, setPosition() {} },
    input: { keyboard },
    events,
    calls,
    scene: {
      start(key, data) { calls.started.push({ key, data }); },
    },
    refreshMenuHighlight() { throw new Error('refreshMenuHighlight must be the shipped method'); },
  };
  const symbols = {
    RELEASE_POLICY: policy,
    NEW_GAME_CONFIRM_TEXT: CONFIRM_SENTENCE,
    CONFIRM_LABELS: ['Quay lại', 'Bắt đầu lại'],
    // Identity i18n: this harness asserts the Vietnamese copy, which is the catalogue key.
    tr: (text, params) => (params ? text.replace(/\{(\w+)\}/g, (match, key) => (key in params ? String(params[key]) : match)) : text),
    getLocale: () => 'vi',
    otherLocale: () => 'en',
    setLocale: () => {},
    CampaignSaveSystem: {
      load: (...args) => CampaignSaveSystem.load(...args),
      hasSave: () => CampaignSaveSystem.hasSave(),
      isCompleted: () => CampaignSaveSystem.isCompleted(),
      clear: () => {
        calls.campaignCleared += 1;
        CampaignSaveSystem.clear();
      },
    },
    SaveSystem: {
      load: () => SaveSystem.load(),
      hasSave: () => SaveSystem.hasSave(),
      clear: () => {
        calls.legacyCleared += 1;
        SaveSystem.clear();
      },
    },
    SoundSystem: {
      isMuted: () => false,
      playLanternToggle: () => { calls.lantern += 1; },
      playMirrorRotate: () => { calls.mirror += 1; },
      playUiClick: () => {},
      playUiCancel: () => {},
    },
  };
  for (const name of MENU_METHODS) {
    const unit = methodUnitOrNull(MENU_FILE, name);
    if (unit) scene[name] = bindUnit(unit, symbols, `MenuScene.${name}()`);
  }
  scene.actions = hasSavedGame
    ? [() => scene.continueGame(), () => scene.startNewGame(), () => undefined]
    : [() => scene.startNewGame(), () => undefined];
  return { scene, calls, keyboard, events, storage, before };
}

function menuArrows() {
  const source = parse(MENU_FILE);
  const map = new Map();
  walk(source, (node) => {
    if (!ts.isCallExpression(node)) return;
    const [first, second] = node.arguments;
    if (!first || !ts.isStringLiteral(first) || !second || !ts.isArrowFunction(second)) return;
    if (!/^(keydown-|keyup-|pointer)/.test(first.text)) return;
    const list = map.get(first.text) ?? [];
    list.push(nodeText(second));
    map.set(first.text, list);
  });
  return map;
}

/* ------------------------------------------------------------------ *
 * 4. CampaignScene nextLevel / create guard harness
 * ------------------------------------------------------------------ */

function makeNextLevelScene(policy, level) {
  const calls = { lines: null, callback: null, saves: 0, restarts: 0, started: [] };
  const scene = {
    progress: { level, lanternPickedUp: false, lanternOn: false, flags: {} },
    calls,
    say(lines, callback) { calls.lines = lines; calls.callback = callback; },
    save() { calls.saves += 1; },
    scene: {
      start(key, data) { calls.started.push({ key, data }); },
      restart() { calls.restarts += 1; },
    },
  };
  scene.nextLevel = bindMethod(CAMPAIGN_FILE, 'nextLevel', { RELEASE_POLICY: policy, SoundSystem: { playGateOpen() {} } }, 'CampaignScene.nextLevel()');
  return scene;
}

function makeGuardScene(policy, progress) {
  return {
    progress,
    isBlockedDemoResume: bindMethod(CAMPAIGN_FILE, 'isBlockedDemoResume', { RELEASE_POLICY: policy },
      'CampaignScene.isBlockedDemoResume()'),
  };
}

/* ------------------------------------------------------------------ *
 * 5. ComingSoonScene — the shipped class on a fake Phaser boundary
 * ------------------------------------------------------------------ */

class FakePhaserScene {
  constructor(config = {}) {
    this.key = config.key;
    this.sys = { settings: { data: config.data } };
  }
}

const loadedComingSoon = (() => {
  const source = readFileSync(COMING_FILE, 'utf8');
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
    if (id === 'phaser') return { Scene: FakePhaserScene };
    if (id === '../art/CampaignArt') return { getLevelArtKey: () => null };
    if (id === '../systems/EffectsSystem') {
      return { EffectsSystem: class { setupZoneEffects() {} update() {} } };
    }
    if (id === '../systems/SoundSystem') {
      return { SoundSystem: { playLanternToggle() {} } };
    }
    if (id === '../i18n/catalog' || id === '../i18n/catalog.ts') return { tr: (text, params) => (params ? text.replace(/\{(\w+)\}/g, (match, key) => (key in params ? String(params[key]) : match)) : text) };
    throw new Error(`ComingSoonScene imports an unexpected module: ${id}`);
  };
  new Function('module', 'exports', 'require', js)(module, module.exports, require);
  assert.equal(typeof module.exports.ComingSoonScene, 'function', 'ComingSoonScene.ts still exports the scene class');
  return { ComingSoonScene: module.exports.ComingSoonScene, required };
})();

function makeComingSoonHarness() {
  const calls = { texts: [], graphics: [], started: [] };
  const keyboard = makeKeyboard();
  const events = makeEvents();
  const scene = new loadedComingSoon.ComingSoonScene();
  scene.add = {
    image(x, y, key) {
      const object = makeText();
      object.kind = 'image';
      object.x = x;
      object.y = y;
      object.textureKey = key;
      object.setTint = () => object;
      return object;
    },
    graphics() { return makeGraphics(calls.graphics); },
    text(x, y, text, style) {
      const object = makeText();
      object.kind = 'text';
      object.x = x;
      object.y = y;
      object.text = text;
      object.style = style;
      calls.texts.push(object);
      return object;
    },
  };
  scene.input = { keyboard };
  scene.events = events;
  scene.scene = { start(key, data) { calls.started.push({ key, data }); } };
  return { scene, calls, keyboard, events };
}

function openComingSoon(mode) {
  const harness = makeComingSoonHarness();
  harness.scene.create(mode === undefined ? undefined : { mode });
  return harness;
}

/* ------------------------------------------------------------------ *
 * 6. Cases
 * ------------------------------------------------------------------ */

const CASES = [
  {
    name: 'default_flavor_is_full_and_keeps_all_ten_levels',
    run: () => {
      const R = requireRelease();
      assert.equal(R.resolveBuildFlavor(undefined), 'full', 'an absent flavor is full');
      assert.equal(R.resolveBuildFlavor(''), 'full', 'an empty flavor is full');
      assert.equal(R.resolveBuildFlavor('full'), 'full', 'an explicit full flavor is full');
      assert.equal(R.RELEASE_POLICY.isDemo, false,
        'the check runner has no VITE_BUILD_FLAVOR, so the shipped default is full');

      const full = R.createReleasePolicy('full');
      assert.equal(full.isDemo, false);
      assert.equal(full.lastPlayableLevelIndex, 9, 'full mode still reaches index 9 (level 10)');
      assert.equal(full.menuTag, 'PLAYTEST · MÀN 01–10', 'the full menu pill is unchanged');
      assert.equal(full.buildTag, 'PLAYTEST BUILD · MÀN 01–10', 'the full build tag is unchanged');
      assert.equal(R.FULL_LEVEL_COUNT, 10);
      assert.equal(CAMPAIGN_LEVELS.length, 10, 'the ten level definitions remain authored');
      for (let level = 0; level < 10; level += 1) {
        assert.equal(full.isOutOfRange(level, false), false, `full mode resumes level ${level}`);
      }
      assert.equal(full.isOutOfRange(9, true), false, 'full mode still resumes a completed campaign');
    },
  },
  {
    name: 'demo_flavor_caps_at_index_three_and_relabels_the_menu',
    run: () => {
      const demo = policyFor('demo');
      assert.equal(demo.isDemo, true);
      assert.equal(demo.lastPlayableLevelIndex, 3, 'the demo slice ends on Shattered Creek (index 3)');
      assert.equal(demo.menuTag, 'DEMO · MÀN 01–04');
      assert.equal(demo.buildTag, 'DEMO BUILD · MÀN 01–04');
      for (let level = 0; level <= 3; level += 1) {
        assert.equal(demo.isOutOfRange(level, false), false, `demo resumes level ${level}`);
      }
      assert.equal(demo.isOutOfRange(4, false), true, 'demo refuses a level-05 save');
      assert.equal(demo.isOutOfRange(9, false), true, 'demo refuses a level-10 save');
      assert.equal(demo.isOutOfRange(9, true), true, 'demo refuses a completed campaign');
    },
  },
  {
    name: 'invalid_nonempty_flavor_is_rejected_not_silently_treated_as_full',
    run: () => {
      const R = requireRelease();
      for (const raw of ['dem', 'Demo', 'DEMO', 'demo ', ' demo', '10', 'full,demo', 'true']) {
        assert.throws(() => R.resolveBuildFlavor(raw), /VITE_BUILD_FLAVOR/,
          `VITE_BUILD_FLAVOR=${JSON.stringify(raw)} must be rejected`);
      }
    },
  },
  {
    name: 'full_next_level_advances_three_to_four_and_saves_exactly_once',
    run: () => {
      const scene = makeNextLevelScene(policyFor('full'), 3);
      scene.nextLevel([{ speaker: 'Nhinh', text: 'Qua suối rồi.' }]);
      assert.equal(scene.calls.lines.length, 1, 'the authored creek exit lines run first');
      assert.equal(scene.calls.saves, 0, 'full mode saves only after the exit dialogue completes');
      assert.equal(scene.progress.level, 3, 'the level does not advance during the dialogue');
      scene.calls.callback();
      assert.equal(scene.progress.level, 4, 'full mode still increments index 3 to 4');
      assert.equal(scene.progress.lanternPickedUp, true);
      assert.equal(scene.progress.lanternOn, true);
      assert.equal(scene.progress.flags['pulse-used'], true);
      assert.equal(scene.calls.saves, 1, 'full mode saves the index-4 progress once');
      assert.equal(scene.calls.restarts, 1, 'full mode restarts into level 05');
      assert.deepEqual(scene.calls.started, [], 'full mode never opens the demo end screen');
    },
  },
  {
    name: 'demo_next_level_stops_after_the_authored_exit_without_progression',
    run: () => {
      const scene = makeNextLevelScene(policyFor('demo'), 3);
      scene.nextLevel([{ speaker: 'Nhinh', text: 'Qua suối rồi.' }]);
      assert.equal(scene.calls.lines.length, 1, 'the authored Shattered Creek exit dialogue still plays');
      assert.equal(scene.calls.saves, 0, 'nothing is saved before the exit dialogue completes');
      assert.equal(scene.progress.level, 3, 'nothing advances before the exit dialogue completes');

      scene.calls.callback();
      assert.equal(scene.progress.level, 3, 'the demo never saves progress as index 4');
      assert.equal(scene.progress.lanternPickedUp, false, 'the demo does not grant the next-level lantern');
      assert.equal(scene.progress.lanternOn, false, 'the demo does not switch on the next-level lantern');
      assert.deepEqual(scene.progress.flags, {}, 'the demo does not set the next-level pulse flag');
      assert.equal(scene.calls.saves, 0, 'the demo boundary writes no save');
      assert.equal(scene.calls.restarts, 0, 'the demo boundary does not restart into level 05');
      assert.deepEqual(scene.calls.started, [{ key: 'ComingSoonScene', data: { mode: 'demo-complete' } }],
        'after the authored exit callback the demo opens the demo-complete screen');

      scene.calls.callback();
      assert.equal(scene.calls.saves, 0, 'a re-fired exit callback still writes no save');
      assert.equal(scene.calls.started.length, 1, 'a re-fired exit callback never stacks screens');
      assert.equal(scene.progress.level, 3);
    },
  },
  {
    name: 'demo_still_advances_indices_zero_to_two_normally',
    run: () => {
      const demo = policyFor('demo');
      for (const level of [0, 1, 2]) {
        const scene = makeNextLevelScene(demo, level);
        scene.nextLevel([]);
        scene.calls.callback();
        assert.equal(scene.progress.level, level + 1, `demo advances index ${level} to ${level + 1}`);
        assert.equal(scene.calls.saves, 1, `demo saves the ${level + 1} progress once`);
        assert.equal(scene.calls.restarts, 1);
        assert.deepEqual(scene.calls.started, [], 'the demo end screen is only for index 3');
      }
    },
  },
  {
    name: 'full_next_level_still_stops_at_index_nine',
    run: () => {
      const scene = makeNextLevelScene(policyFor('full'), 9);
      scene.nextLevel([]);
      assert.equal(scene.calls.lines, null, 'index 9 does not play a next-level dialogue');
      assert.equal(scene.calls.saves, 0);
      assert.equal(scene.calls.restarts, 0);
      assert.deepEqual(scene.calls.started, []);
    },
  },
  {
    name: 'demo_campaign_resume_guard_blocks_only_out_of_range_or_completed_saves',
    run: () => {
      const demo = policyFor('demo');
      const full = policyFor('full');
      for (const level of [0, 1, 2, 3]) {
        assert.equal(makeGuardScene(demo, { level, flags: {} }).isBlockedDemoResume(false), false,
          `demo resumes index ${level}`);
      }
      for (const level of [4, 5, 9]) {
        assert.equal(makeGuardScene(demo, { level, flags: {} }).isBlockedDemoResume(false), true,
          `demo blocks index ${level}`);
      }
      assert.equal(makeGuardScene(demo, { level: 9, flags: { 'l9-complete': true } }).isBlockedDemoResume(false), true,
        'a completed campaign is blocked');
      assert.equal(makeGuardScene(demo, { level: 9, flags: { 'l9-complete': true } }).isBlockedDemoResume(true), false,
        'an explicit newGame start is never blocked');
      for (const level of [0, 3, 4, 9]) {
        assert.equal(makeGuardScene(full, { level, flags: {} }).isBlockedDemoResume(false), false,
          `full mode resumes index ${level}`);
      }
      assert.equal(makeGuardScene(full, { level: 9, flags: { 'l9-complete': true } }).isBlockedDemoResume(false), false,
        'full mode still resumes a completed campaign');
    },
  },
  {
    name: 'demo_campaign_create_guard_runs_before_ending_and_world_build',
    run: () => {
      const campaignSource = parse(CAMPAIGN_FILE);
      const create = findNode(campaignSource, (node) => ts.isMethodDeclaration(node) && nodeText(node.name) === 'create');
      assert.ok(create?.body, 'CampaignScene still declares create()');
      const body = nodeText(create.body);
      const loadAt = body.indexOf('CampaignSaveSystem.load()');
      const guardAt = body.indexOf('this.isBlockedDemoResume(newGameRequested)');
      const endingAt = body.indexOf("flags['l9-complete'] === true");
      const playerAt = body.indexOf('new Player(');
      assert.ok(loadAt >= 0, 'create() still loads the saved progress');
      assert.ok(guardAt >= 0, 'create() runs the demo resume guard after loading');
      assert.ok(endingAt >= 0, 'create() still dispatches the completed campaign ending');
      assert.ok(playerAt >= 0, 'create() still builds the world');
      assert.ok(loadAt < guardAt, 'the demo guard runs after the progress is loaded');
      assert.ok(guardAt < endingAt, 'the demo guard runs before the full ending dispatch');
      assert.ok(guardAt < playerAt, 'the demo guard runs before the world is built');

      const branch = findNode(create.body, (node) => ts.isIfStatement(node)
        && nodeText(node.expression).includes('isBlockedDemoResume'));
      assert.ok(branch, 'create() still has the demo guard branch');
      const thenText = nodeText(branch.thenStatement);
      assert.ok(thenText.includes("this.scene.start('ComingSoonScene'"), 'the guard routes to ComingSoonScene');
      assert.ok(thenText.includes("mode: 'demo-save-blocked'"), 'the guard requests the blocked-save copy');
      assert.ok(/return;/.test(thenText), 'the guard returns before creating the scene');
      assert.equal(/save\(/.test(thenText), false, 'the blocked branch writes no save');
    },
  },
  {
    name: 'demo_continue_resumes_valid_levels_zero_to_three_without_touching_storage',
    run: () => {
      const demo = policyFor('demo');
      for (const level of [0, 1, 2, 3]) {
        const harness = makeMenuHarness({ policy: demo, campaignLevel: level });
        harness.scene.continueGame();
        assert.deepEqual(harness.calls.started, [{ key: 'CampaignScene', data: undefined }],
          `demo Continue resumes index ${level}`);
        assert.equal(harness.calls.campaignCleared, 0);
        assert.equal(harness.calls.legacyCleared, 0);
        assertStorageUntouched(harness.storage, harness.before);
      }
    },
  },
  {
    name: 'demo_continue_blocks_higher_saves_without_rewriting_them',
    run: () => {
      const demo = policyFor('demo');
      for (const level of [4, 5, 9]) {
        const harness = makeMenuHarness({ policy: demo, campaignLevel: level });
        harness.scene.continueGame();
        assert.deepEqual(harness.calls.started, [{ key: 'ComingSoonScene', data: { mode: 'demo-save-blocked' } }],
          `demo Continue explains the out-of-range index-${level} save`);
        assert.equal(harness.calls.started.some((entry) => entry.key === 'CampaignScene'), false,
          'the blocked save never enters the campaign');
        assert.equal(harness.calls.started.some((entry) => entry.key === 'EndingScene'), false,
          'the blocked save never opens the full ending');
        assert.equal(harness.calls.campaignCleared, 0);
        assert.equal(harness.calls.legacyCleared, 0);
        assertStorageUntouched(harness.storage, harness.before);
      }
    },
  },
  {
    name: 'demo_continue_blocks_a_completed_campaign_before_the_full_ending',
    run: () => {
      const harness = makeMenuHarness({
        policy: policyFor('demo'),
        campaignLevel: 9,
        campaignFlags: { 'l9-complete': true },
      });
      assert.equal(CampaignSaveSystem.isCompleted(), true, 'the fixture is a completed campaign');
      harness.scene.continueGame();
      assert.deepEqual(harness.calls.started, [{ key: 'ComingSoonScene', data: { mode: 'demo-save-blocked' } }],
        'a completed campaign is outside the demo and does not dispatch EndingScene');
      assert.equal(harness.calls.started.some((entry) => entry.key === 'EndingScene'), false);
      assert.equal(harness.calls.campaignCleared, 0);
      assertStorageUntouched(harness.storage, harness.before);
    },
  },
  {
    name: 'demo_continue_blocks_legacy_saves_without_mutating_them',
    run: () => {
      for (const stage of ['intro', 'hub_initial', 'victory']) {
        const harness = makeMenuHarness({ policy: policyFor('demo'), legacyStage: stage });
        harness.scene.continueGame();
        assert.deepEqual(harness.calls.started, [{ key: 'ComingSoonScene', data: { mode: 'demo-save-blocked' } }],
          `a legacy ${stage} save is explained, not resumed`);
        assert.equal(harness.calls.started.some((entry) => entry.key === 'WorldScene'), false,
          'the demo never opens the legacy world campaign');
        assert.equal(harness.calls.started.some((entry) => entry.key === 'EndingScene'), false);
        assert.equal(harness.calls.legacyCleared, 0);
        assertStorageUntouched(harness.storage, harness.before);
      }
    },
  },
  {
    name: 'full_continue_keeps_every_existing_route',
    run: () => {
      const full = policyFor('full');

      const normal = makeMenuHarness({ policy: full, campaignLevel: 4 });
      normal.scene.continueGame();
      assert.deepEqual(normal.calls.started, [{ key: 'CampaignScene', data: undefined }]);
      assertStorageUntouched(normal.storage, normal.before);

      const completed = makeMenuHarness({ policy: full, campaignLevel: 9, campaignFlags: { 'l9-complete': true } });
      completed.scene.continueGame();
      assert.deepEqual(completed.calls.started, [{ key: 'EndingScene', data: { campaign: true } }]);
      assertStorageUntouched(completed.storage, completed.before);

      const legacyVictory = makeMenuHarness({ policy: full, legacyStage: 'victory' });
      legacyVictory.scene.continueGame();
      assert.deepEqual(legacyVictory.calls.started, [{ key: 'EndingScene', data: undefined }]);
      assertStorageUntouched(legacyVictory.storage, legacyVictory.before);

      const legacyRun = makeMenuHarness({ policy: full, legacyStage: 'hub_initial' });
      legacyRun.scene.continueGame();
      assert.equal(legacyRun.calls.started.length, 1);
      assert.equal(legacyRun.calls.started[0].key, 'WorldScene');
      assert.equal(legacyRun.calls.started[0].data.progress.stage, 'hub_initial');
      assertStorageUntouched(legacyRun.storage, legacyRun.before);
    },
  },
  {
    name: 'demo_new_game_without_a_save_stays_direct_to_the_prologue',
    run: () => {
      const harness = makeMenuHarness({ policy: policyFor('demo'), noSave: true });
      harness.scene.startNewGame();
      assert.deepEqual(harness.calls.started, [{ key: 'PrologueScene', data: undefined }],
        'a fresh demo still starts New Game directly');
      assert.equal(harness.scene.menuMode, 'menu', 'no confirmation is shown when nothing can be lost');
    },
  },
  {
    name: 'demo_new_game_with_a_save_warns_and_defaults_to_cancel',
    run: () => {
      const harness = makeMenuHarness({ policy: policyFor('demo'), campaignLevel: 3 });
      harness.scene.startNewGame();
      assert.equal(harness.scene.menuMode, 'confirm-new-game', 'a saved demo opens the confirmation');
      assert.equal(harness.scene.confirmSelectedIndex, 0, 'the confirmation defaults to Cancel');
      assert.equal(harness.scene.confirmText.text, CONFIRM_SENTENCE, 'the warning is the approved sentence');
      assert.equal(harness.calls.started.length, 0, 'opening the confirmation starts nothing');
      assert.equal(harness.calls.campaignCleared, 0, 'opening the confirmation clears nothing');
      assert.equal(harness.calls.legacyCleared, 0);
      assertStorageUntouched(harness.storage, harness.before);
    },
  },
  {
    name: 'demo_new_game_warning_covers_a_legacy_only_save_too',
    run: () => {
      const harness = makeMenuHarness({ policy: policyFor('demo'), legacyStage: 'hub_initial' });
      harness.scene.startNewGame();
      assert.equal(harness.scene.menuMode, 'confirm-new-game', 'any existing save opens the warning');
      assert.equal(harness.calls.legacyCleared, 0);
      assertStorageUntouched(harness.storage, harness.before);
    },
  },
  {
    name: 'demo_new_game_rechecks_a_campaign_save_added_after_menu_create',
    run: () => {
      const harness = makeMenuHarness({ policy: policyFor('demo'), noSave: true });
      assert.equal(harness.scene.hasSavedGame, false, 'the menu was created with no save');
      // Another tab (or the browser test) writes a valid index-5 save after
      // MenuScene.create() cached hasSavedGame = false.
      CampaignSaveSystem.save({ ...CampaignSaveSystem.createDefaultProgress(), level: 5 });
      const before = harness.storage.snapshot();
      harness.storage.ops.set = 0;
      harness.storage.ops.remove = 0;

      harness.scene.startNewGame();
      assert.equal(harness.scene.menuMode, 'confirm-new-game',
        'the destructive New Game re-checks storage and warns about the late save');
      assert.equal(harness.scene.confirmSelectedIndex, 0, 'the late-save warning defaults to Cancel');
      assert.equal(harness.calls.started.length, 0, 'the late save is not erased and the prologue does not start');
      assert.equal(harness.calls.campaignCleared, 0);
      assert.equal(harness.calls.legacyCleared, 0);
      assertStorageUntouched(harness.storage, before);
    },
  },
  {
    name: 'demo_new_game_rechecks_a_legacy_save_added_after_menu_create',
    run: () => {
      const harness = makeMenuHarness({ policy: policyFor('demo'), noSave: true });
      assert.equal(harness.scene.hasSavedGame, false, 'the menu was created with no save');
      SaveSystem.save({ ...SaveSystem.createDefaultProgress(), stage: 'hub_initial' });
      const before = harness.storage.snapshot();
      harness.storage.ops.set = 0;
      harness.storage.ops.remove = 0;

      harness.scene.startNewGame();
      assert.equal(harness.scene.menuMode, 'confirm-new-game',
        'a legacy save that appeared after create also opens the warning');
      assert.equal(harness.scene.confirmSelectedIndex, 0, 'the late legacy-save warning defaults to Cancel');
      assert.equal(harness.calls.started.length, 0, 'the legacy save is not erased and the prologue does not start');
      assert.equal(harness.calls.legacyCleared, 0);
      assert.equal(harness.calls.campaignCleared, 0);
      assertStorageUntouched(harness.storage, before);
    },
  },
  {
    name: 'demo_new_game_cancel_keeps_both_saves_and_the_menu',
    run: () => {
      const harness = makeMenuHarness({
        policy: policyFor('demo'),
        campaignLevel: 3,
        legacyStage: 'hub_initial',
      });
      harness.scene.startNewGame();
      harness.scene.onConfirmPointer(0)();
      assert.equal(harness.scene.menuMode, 'menu', 'Cancel returns to the menu');
      assert.equal(harness.scene.selectedIndex, 1, 'Cancel restores the New Game row');
      assert.equal(harness.calls.started.length, 0, 'Cancel starts nothing');
      assert.equal(harness.calls.campaignCleared, 0);
      assert.equal(harness.calls.legacyCleared, 0);
      assertStorageUntouched(harness.storage, harness.before);
    },
  },
  {
    name: 'demo_confirmation_needs_a_new_key_press_and_ignores_auto_repeat',
    run: () => {
      const harness = makeMenuHarness({ policy: policyFor('demo'), campaignLevel: 3 });
      const { scene, keyboard, calls } = harness;
      scene.wireInput();
      scene.selectedIndex = 1;

      keyboard.domKeydown('ENTER');
      assert.equal(scene.menuMode, 'confirm-new-game', 'the menu activation opens the warning');
      assert.equal(scene.confirmArmed, false, 'the activating key must be released first');
      assert.equal(calls.campaignCleared, 0);

      keyboard.domKeydown('DOWN');
      assert.equal(scene.confirmSelectedIndex, 1, 'DOWN moves to the confirm row');

      keyboard.emit('keydown-ENTER', { repeat: false });
      assert.equal(calls.campaignCleared, 0, 'a fresh-looking keydown while the key is still down cannot confirm');

      keyboard.emit('keydown-ENTER', { repeat: true });
      assert.equal(calls.campaignCleared, 0, 'an auto-repeat cannot confirm');

      keyboard.domKeyup('ENTER');
      keyboard.emit('keydown-ENTER', { repeat: true });
      assert.equal(calls.campaignCleared, 0, 'the auto-repeat after the release still cannot confirm');
      assert.equal(scene.menuMode, 'confirm-new-game');

      keyboard.emit('keydown-ENTER', { repeat: false });
      assert.equal(calls.campaignCleared, 1, 'a genuinely new press confirms exactly once');
      assert.equal(calls.legacyCleared, 1);
      assert.deepEqual(calls.started, [{ key: 'PrologueScene', data: undefined }]);

      keyboard.emit('keydown-ENTER', { repeat: false });
      assert.equal(calls.campaignCleared, 1, 'a repeated confirmation cannot clear twice');
      assert.equal(calls.started.length, 1, 'a repeated confirmation cannot start twice');
    },
  },
  {
    name: 'demo_confirmation_via_a_distinct_click_clears_both_saves_once',
    run: () => {
      const harness = makeMenuHarness({ policy: policyFor('demo'), campaignLevel: 3 });
      harness.scene.startNewGame();
      harness.scene.onConfirmPointer(1)();
      assert.equal(harness.calls.campaignCleared, 1, 'the confirm click clears the campaign save once');
      assert.equal(harness.calls.legacyCleared, 1, 'the confirm click clears the legacy save once');
      assert.deepEqual(harness.calls.started, [{ key: 'PrologueScene', data: undefined }]);
      harness.scene.onConfirmPointer(1)();
      assert.equal(harness.calls.campaignCleared, 1, 'a repeated confirm click cannot clear a second time');
      assert.equal(harness.calls.started.length, 1);
    },
  },
  {
    name: 'full_new_game_confirms_existing_saves_then_starts_once',
    run: () => {
      const harness = makeMenuHarness({ policy: policyFor('full'), campaignLevel: 4, legacyStage: 'hub_initial' });
      harness.scene.startNewGame();
      assert.equal(harness.scene.menuMode, 'confirm-new-game', 'redesigned full menu also protects existing saves');
      assertStorageUntouched(harness.storage, harness.before);
      harness.scene.onConfirmPointer(1)();
      assert.equal(harness.calls.campaignCleared, 1);
      assert.equal(harness.calls.legacyCleared, 1);
      assert.deepEqual(harness.calls.started, [{ key: 'PrologueScene', data: undefined }]);
      harness.scene.startNewGame();
      assert.equal(harness.calls.campaignCleared, 1, 'full mode keeps the one-shot New Game guard');
    },
  },
  {
    name: 'menu_revisit_does_not_accumulate_listeners_and_shutdown_is_scoped',
    run: () => {
      const harness = makeMenuHarness({ policy: policyFor('demo') });
      const { scene, keyboard, events } = harness;
      const foreignKey = () => undefined;
      const foreignShutdown = () => undefined;
      keyboard.on('keydown-X', foreignKey);
      events.on('shutdown', foreignShutdown);

      scene.wireInput();
      const ownListeners = keyboard.total() - 1;
      assert.ok(ownListeners >= 10, 'the menu wires its selection and confirmation keys');
      for (const event of keyboard.events()) {
        if (event === 'keydown-X') continue;
        assert.equal(keyboard.count(event), 1, `${event} has exactly one listener after the first visit`);
      }
      assert.equal(events.count('shutdown'), 2, 'the menu owns one shutdown hook');

      scene.wireInput();
      assert.equal(keyboard.total() - 1, ownListeners, 'a revisit does not stack a second set of key listeners');
      assert.equal(events.count('shutdown'), 2, 'a revisit does not stack a second shutdown hook');

      events.emit('shutdown');
      assert.equal(keyboard.count('keydown-X'), 1, 'shutdown leaves the foreign listener alone');
      assert.equal(keyboard.total(), 1, 'shutdown removes every listener the menu registered');
      assert.equal(events.count('shutdown'), 1, 'shutdown leaves the foreign shutdown hook alone');

      scene.wireInput();
      assert.equal(keyboard.total() - 1, ownListeners, 'a new visit wires one set again');
      events.emit('shutdown');
      assert.equal(keyboard.total(), 1);
    },
  },
  {
    name: 'menu_create_uses_the_policy_labels_and_wires_input_once',
    run: () => {
      const menuSource = parse(MENU_FILE);
      const create = findNode(menuSource, (node) => ts.isMethodDeclaration(node) && nodeText(node.name) === 'create');
      assert.ok(create?.body, 'MenuScene still declares create()');
      const body = nodeText(create.body);
      assert.ok(body.includes('RELEASE_POLICY.buildTag'), 'the build tag comes from the release policy');
      assert.ok(body.includes('this.wireInput()'), 'create() wires input through the ledgered helper');
      assert.ok(body.includes('this.buildNewGameConfirmation()'), 'create() builds the local confirmation UI');

      const sourceText = readFileSync(MENU_FILE, 'utf8');
      assert.ok(sourceText.includes("'Quay lại', 'Bắt đầu lại'"), 'the confirmation rows are Cancel first, then confirm');
      assert.ok(sourceText.includes(CONFIRM_SENTENCE), 'the approved warning sentence is shipped verbatim');
      assert.equal(/location\.|document\.domain/.test(sourceText), false,
        'the flavor is never inferred from the URL');
    },
  },
  {
    name: 'demo_complete_screen_shows_the_approved_copy_and_single_menu_exit',
    run: () => {
      const harness = openComingSoon('demo-complete');
      const texts = harness.calls.texts.map((object) => object.text);
      assert.ok(texts.includes(DEMO_END_TITLE), 'the demo end title is exact');
      assert.ok(texts.includes(DEMO_END_BODY), 'the demo end thanks is exact');
      assert.equal(texts.some((text) => /ĐANG PHÁT TRIỂN|MÀN 05|đang được hoàn thiện/.test(text)), false,
        'the demo end does not falsely claim later implemented levels are undeveloped');
      assert.ok(texts.includes('▸ VỀ MÀN HÌNH CHÍNH'), 'the only action is back to Main Menu');

      const button = harness.calls.texts.find((object) => object.text === '▸ VỀ MÀN HÌNH CHÍNH');
      button.emit('pointerdown');
      assert.deepEqual(harness.calls.started, [{ key: 'MenuScene', data: undefined }]);
      button.emit('pointerdown');
      assert.equal(harness.calls.started.length, 1, 'a repeated click cannot start the menu twice');
    },
  },
  {
    name: 'blocked_save_screen_explains_the_range_and_preserves_the_save',
    run: () => {
      const harness = openComingSoon('demo-save-blocked');
      const texts = harness.calls.texts.map((object) => object.text);
      assert.ok(texts.some((text, params) => (params ? text.replace(/\{(\w+)\}/g, (match, key) => (key in params ? String(params[key]) : match)) : text).includes('BẢN LƯU')), 'the blocked screen names the save');
      assert.ok(texts.some((text) => /ngoài phạm vi.*bản chơi thử|thuộc phiên bản cũ/.test(text)),
        'the blocked screen says the save is outside the demo or legacy');
      assert.ok(texts.some((text) => /giữ nguyên|chưa có thao tác nào xóa/.test(text)),
        'the blocked screen says the save has not been erased');
      assert.equal(texts.some((text) => /ĐANG PHÁT TRIỂN|đang được hoàn thiện/.test(text)), false,
        'the blocked screen makes no development claim');
      assert.deepEqual(loadedComingSoon.required.filter((id) => /SaveSystem/.test(id)), [],
        'the blocked screen never imports a save system, so it cannot mutate one');
    },
  },
  {
    name: 'coming_soon_revisit_does_not_accumulate_listeners',
    run: () => {
      const harness = openComingSoon('demo-complete');
      const { scene, keyboard, events } = harness;
      const foreignKey = () => undefined;
      const foreignShutdown = () => undefined;
      keyboard.on('keydown-X', foreignKey);
      events.on('shutdown', foreignShutdown);
      scene.create({ mode: 'demo-complete' });
      const own = keyboard.total() - 1;
      assert.ok(own > 0, 'the demo end screen wires its keyboard exit');
      for (const event of keyboard.events()) {
        if (event === 'keydown-X') continue;
        assert.equal(keyboard.count(event), 1, `${event} has exactly one listener after a revisit`);
      }
      assert.equal(events.count('shutdown'), 2);
      events.emit('shutdown');
      assert.equal(keyboard.count('keydown-X'), 1, 'shutdown leaves the foreign listener alone');
      assert.equal(keyboard.total(), 1, 'shutdown removes every listener the screen registered');
      assert.equal(events.count('shutdown'), 1);
    },
  },
];

/* ------------------------------------------------------------------ *
 * 7. Runner
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
console.log(`\ndemo release: ${CASES.length - failures.length}/${CASES.length} cases passed`);
if (failures.length) {
  console.log(`failed: ${failures.join(', ')}`);
  process.exit(1);
}
