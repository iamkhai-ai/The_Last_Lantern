/**
 * Levels 05-10 — campaign credits safety checks.
 *
 * Run with:  node scripts/check-campaign-ending.mjs
 *
 * The defect: the credits menu opened with PLAY AGAIN highlighted, and the same
 * E that paged through the closing text could fire it a frame later, clearing a
 * completed campaign save. These cases run the shipped code, not a copy of it:
 *
 *  - every credits/dialogue keyboard handler is the exact arrow EndingScene
 *    registers, pulled out of src/scenes/EndingScene.ts with the TypeScript
 *    compiler API and bound to a recording stand-in for the scene's Phaser ports
 *    (input.keyboard, scene.start/restart, the two save systems, the text rows);
 *  - the menu methods (triggerSelected, requestPlayAgain, confirmPlayAgain,
 *    cancelPlayAgain, refreshHighlight, handleAdvance, wireCreditsInput ...) are
 *    the scene's own method bodies, extracted the same way, so the confirmation
 *    state, the release guard and the teardown are the shipped logic;
 *  - the initial selection is the expression create() assigns to selectedIndex,
 *    read out of the source, so the case proves the shipped default instead of a
 *    hand-copied one.
 *
 * The extraction approach mirrors scripts/check-campaign-runtime.mjs (compiler
 * API + a fake `this`); a re-implementation of the menu logic could not fail the
 * baseline case below, and this check is built so it does.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCENE_FILE = join(rootDir, 'src/scenes/EndingScene.ts');
const sourceFile = ts.createSourceFile(SCENE_FILE, readFileSync(SCENE_FILE, 'utf8'), ts.ScriptTarget.Latest, true);

const CONFIRM_SENTENCE = 'Chơi lại từ đầu sẽ xóa tiến trình hiện tại.';

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

/* ------------------------------------------------------------------ *
 * 1. Extraction: shipped handlers and shipped method bodies
 * ------------------------------------------------------------------ */

/**
 * Every arrow the scene hands to a key/pointer registrar, keyed by the event
 * name literal it registers against. The dialogue advance is registered by
 * identifier (`onKey('keydown-E', advance)`), so it is deliberately not an
 * arrow here — the only keydown-E arrow is the credits handler, which is why a
 * duplicate would be an error rather than a silent mis-selection.
 */
function registeredArrows() {
  const map = new Map();
  walk(sourceFile, (node) => {
    if (!ts.isCallExpression(node)) return;
    const [first, second] = node.arguments;
    if (!first || !ts.isStringLiteral(first) || !second || !ts.isArrowFunction(second)) return;
    if (!/^(keydown-|keyup-|pointer)/.test(first.text)) return;
    assert.ok(!map.has(first.text),
      `EndingScene registers more than one ${first.text} handler; the check cannot tell which shipped handler runs`);
    map.set(first.text, nodeText(second));
  });
  return map;
}

/** One method as `{ params, body }`, so the cases run the shipped menu/input logic. */
function methodUnit(methodName) {
  const method = findNode(sourceFile, (node) => ts.isMethodDeclaration(node) && nodeText(node.name) === methodName);
  assert.ok(method, `EndingScene still declares ${methodName}()`);
  assert.ok(method.body, `${methodName}() still has a body`);
  return { params: method.parameters.map((parameter) => nodeText(parameter)), body: nodeText(method.body) };
}

function methodUnitOrNull(methodName) {
  try {
    return methodUnit(methodName);
  } catch {
    return null;
  }
}

/** The expression create() assigns to selectedIndex — the shipped default. */
function defaultSelectionSource() {
  const create = findNode(sourceFile, (node) => ts.isMethodDeclaration(node) && nodeText(node.name) === 'create');
  assert.ok(create?.body, 'EndingScene still declares create()');
  let expression = null;
  walk(create.body, (node) => {
    if (expression) return;
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken
      && nodeText(node.left) === 'this.selectedIndex') expression = nodeText(node.right);
  });
  assert.ok(expression, 'create() still sets the initial selectedIndex');
  return expression;
}

/** Compiles a method unit into a function whose `this` is the receiver. */
function bindMethod({ params, body }, symbols, label) {
  const names = Object.keys(symbols);
  const values = names.map((name) => symbols[name]);
  let unit;
  try {
    const js = ts.transpileModule(`const __unit = function (${params.join(', ')}) ${body};`, {
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
    }).outputText;
    unit = new Function(...names, `"use strict";\n${js}\nreturn __unit;`)(...values);
  } catch (error) {
    throw new Error(`could not compile ${label} from EndingScene.ts: ${error.message}`);
  }
  // Attached to the fake scene, so it behaves like a method: `this` is the receiver.
  return function (...args) { return unit.call(this, ...args); };
}

/** Compiles an arrow expression into `(self, ...args) => arrow.call(self)(...args)`. */
function bindArrow(source, symbols, label) {
  const names = Object.keys(symbols);
  const values = names.map((name) => symbols[name]);
  let unit;
  try {
    const js = ts.transpileModule(`const __unit = function () { return (${source}); };`, {
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
    }).outputText;
    unit = new Function(...names, `"use strict";\n${js}\nreturn __unit;`)(...values);
  } catch (error) {
    throw new Error(`could not compile ${label} from EndingScene.ts: ${error.message}`);
  }
  return (self, ...args) => unit.call(self)(...args);
}

/** Compiles a bare expression and evaluates it against a fake `this`. */
function bindExpression(source, symbols = {}) {
  const names = Object.keys(symbols);
  const values = names.map((name) => symbols[name]);
  const js = ts.transpileModule(`const __unit = function () { return (${source}); };`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
  }).outputText;
  const unit = new Function(...names, `"use strict";\n${js}\nreturn __unit;`)(...values);
  return (self) => unit.call(self);
}

const ARROWS = registeredArrows();

/* ------------------------------------------------------------------ *
 * 2. The fake scene: recording ports around the real scene logic
 * ------------------------------------------------------------------ */

const METHOD_NAMES = [
  'playAgain', 'goToMainMenu', 'inputOptions', 'activateIndex', 'triggerSelected',
  'requestPlayAgain', 'cancelPlayAgain', 'confirmPlayAgain', 'moveSelection', 'refreshHighlight',
  'wireInput', 'wireCreditsInput', 'wireDialogueInput', 'handleAdvance', 'syncHeldKeys',
  'releaseHeldKey', 'onKey', 'clearKeyListeners', 'registerShutdownGuard', 'teardownInput',
];

function makeText(record) {
  return {
    text: '',
    setText(value) { this.text = value; record.push(value); return this; },
    setColor() { return this; },
    setVisible() { return this; },
    setOrigin() { return this; },
    setDepth() { return this; },
    setInteractive() { return this; },
  };
}

function makeKeyboard(downKeys) {
  const registry = new Map();
  return {
    on(event, handler) {
      const list = registry.get(event) ?? [];
      list.push(handler);
      registry.set(event, list);
    },
    off(event, handler) {
      const list = registry.get(event);
      if (!list) return;
      const index = list.indexOf(handler);
      if (index >= 0) list.splice(index, 1);
    },
    addKey(name) { return { isDown: downKeys.includes(name) }; },
    count(event) { return (registry.get(event) ?? []).length; },
    total() { let n = 0; for (const list of registry.values()) n += list.length; return n; },
    events() { return [...registry.keys()]; },
  };
}

function makeScene({ campaign = true, downKeys = [] } = {}) {
  const calls = {
    started: [], restarted: [], campaignCleared: 0, legacyCleared: 0, legacySaved: [],
    soundMirror: 0, soundLantern: 0, confirmTexts: [], buttonTexts: [],
  };
  const keyboard = makeKeyboard(downKeys);
  const events = {
    handlers: new Map(),
    on() {},
    once(event, handler) { this.handlers.set(event, handler); },
    off(event, handler) {
      if (handler === undefined) { this.handlers.delete(event); return; }
      if (this.handlers.get(event) === handler) this.handlers.delete(event);
    },
  };
  const confirmText = makeText(calls.confirmTexts);
  const scene = {
    campaignEnding: campaign,
    selectedIndex: 0,
    menuMode: 'credits',
    restartConfirmed: false,
    heldKeys: new Set(),
    keyListeners: [],
    buttons: [makeText(calls.buttonTexts), makeText(calls.buttonTexts)],
    bodyText: makeText([]),
    quoteText: makeText([]),
    confirmText,
    input: { keyboard },
    events,
    scene: {
      start(key, data) { calls.started.push({ key, data }); },
      restart(data) { calls.restarted.push(data); },
    },
    calls,
  };
  const symbols = {
    CampaignSaveSystem: { clear() { calls.campaignCleared += 1; } },
    SaveSystem: {
      clear() { calls.legacyCleared += 1; },
      createDefaultProgress() { return { stage: 'intro', fresh: true }; },
      save(progress) { calls.legacySaved.push(progress); },
    },
    SoundSystem: {
      playMirrorRotate() { calls.soundMirror += 1; },
      playLanternToggle() { calls.soundLantern += 1; },
    },
  };
  for (const name of METHOD_NAMES) {
    const unit = methodUnitOrNull(name);
    if (unit) scene[name] = bindMethod(unit, symbols, `${name}()`);
  }
  return scene;
}

function selectedIndexFor(campaign) {
  return bindExpression(defaultSelectionSource())({ campaignEnding: campaign });
}

function invokeHandler(scene, event, keyEvent) {
  const source = ARROWS.get(event);
  assert.ok(source, `EndingScene still registers a ${event} handler`);
  bindArrow(source, {}, `${event} handler`)(scene, keyEvent);
}

function invokePointer(scene, event, idx) {
  const source = ARROWS.get(event);
  assert.ok(source, `EndingScene still registers a ${event} handler`);
  bindArrow(source, { idx }, `${event} handler`)(scene);
}

/* ------------------------------------------------------------------ *
 * 3. Cases
 * ------------------------------------------------------------------ */

const CASES = [
  {
    name: 'campaign_default_advance_reaches_main_menu_and_keeps_the_save',
    run: () => {
      const scene = makeScene({ campaign: true });
      scene.selectedIndex = selectedIndexFor(true);
      invokeHandler(scene, 'keydown-E');
      assert.equal(scene.calls.campaignCleared, 0,
        'pressing the advance key on the default selection must not clear a completed campaign save');
      assert.equal(scene.calls.started.length, 1, 'the default selection hands over to exactly one scene');
      assert.equal(scene.calls.started[0].key, 'MenuScene', 'the campaign credits default to Main Menu');
    },
  },
  {
    name: 'held_advance_key_from_the_closing_text_cannot_act_on_the_credits',
    run: () => {
      const scene = makeScene({ campaign: true, downKeys: ['E'] });
      scene.selectedIndex = selectedIndexFor(true);
      scene.wireInput(true);
      invokeHandler(scene, 'keydown-E');
      assert.equal(scene.calls.campaignCleared, 0, 'a held advance key never clears the save');
      assert.equal(scene.calls.started.length, 0, 'a held advance key never leaves the menu');
    },
  },
  {
    name: 'after_release_the_advance_key_reaches_main_menu',
    run: () => {
      const scene = makeScene({ campaign: true, downKeys: ['E'] });
      scene.selectedIndex = selectedIndexFor(true);
      scene.wireInput(true);
      invokeHandler(scene, 'keydown-E');
      assert.equal(scene.calls.started.length, 0, 'the held press is ignored');
      invokeHandler(scene, 'keyup-E');
      invokeHandler(scene, 'keydown-E');
      assert.equal(scene.calls.campaignCleared, 0, 'the released press still keeps the save');
      assert.equal(scene.calls.started.length, 1, 'the released press acts once');
      assert.equal(scene.calls.started[0].key, 'MenuScene', 'the released press reaches Main Menu');
    },
  },
  {
    name: 'auto_repeat_cannot_fire_an_action',
    run: () => {
      const scene = makeScene({ campaign: true });
      scene.wireInput(true);
      scene.selectedIndex = 0;
      invokeHandler(scene, 'keydown-E', { repeat: true });
      assert.equal(scene.calls.campaignCleared, 0, 'an auto-repeated key never acts');
      assert.equal(scene.calls.started.length, 0, 'an auto-repeated key never leaves the menu');
    },
  },
  {
    name: 'choosing_play_again_opens_a_confirmation_defaulting_to_cancel',
    run: () => {
      const scene = makeScene({ campaign: true });
      scene.wireInput(true);
      scene.selectedIndex = 0;
      scene.triggerSelected();
      assert.equal(scene.calls.campaignCleared, 0, 'selecting Play Again must not clear on its own');
      assert.equal(scene.calls.started.length, 0, 'selecting Play Again must not start a scene on its own');
      assert.equal(scene.menuMode, 'confirm', 'the credits menu moves into a confirmation state');
      assert.equal(scene.selectedIndex, 0, 'the confirmation defaults to the cancel answer');
      assert.ok(scene.buttons.some((button) => button.text.includes('Hủy')), 'the confirmation offers Cancel');
      assert.ok(scene.buttons.some((button) => button.text.includes('Chơi lại')), 'the confirmation offers Play Again');
      assert.ok(scene.calls.confirmTexts.includes(CONFIRM_SENTENCE),
        `the confirmation sentence is shown verbatim ("${CONFIRM_SENTENCE}")`);
    },
  },
  {
    name: 'cancel_keeps_the_save_and_returns_to_the_credits_menu',
    run: () => {
      const scene = makeScene({ campaign: true });
      scene.wireInput(true);
      scene.selectedIndex = 0;
      scene.triggerSelected();
      scene.triggerSelected();
      assert.equal(scene.menuMode, 'credits', 'cancel returns to the credits menu');
      assert.equal(scene.selectedIndex, selectedIndexFor(true), 'cancel restores the safe default selection');
      assert.equal(scene.calls.campaignCleared, 0, 'cancel never clears the save');
      assert.equal(scene.calls.started.length, 0, 'cancel never starts a scene');
    },
  },
  {
    name: 'confirm_clears_the_campaign_save_exactly_once_and_starts_a_new_campaign',
    run: () => {
      const scene = makeScene({ campaign: true });
      scene.wireInput(true);
      scene.selectedIndex = 0;
      scene.triggerSelected();
      scene.selectedIndex = 1;
      scene.triggerSelected();
      assert.equal(scene.calls.campaignCleared, 1, 'the confirmed choice clears the campaign save once');
      assert.equal(scene.calls.started.length, 1, 'the confirmed choice starts exactly one scene');
      assert.equal(scene.calls.started[0].key, 'CampaignScene', 'the confirmed choice starts the campaign anew');
      assert.equal(scene.calls.started[0].data?.newGame, true, 'the new campaign is an explicit New Game');
      scene.triggerSelected();
      assert.equal(scene.calls.campaignCleared, 1, 'a repeat of the confirmation does not clear a second time');
    },
  },
  {
    name: 'pointer_selection_of_play_again_goes_through_the_confirmation',
    run: () => {
      const scene = makeScene({ campaign: true });
      scene.wireInput(true);
      invokePointer(scene, 'pointerdown', 0);
      assert.equal(scene.calls.campaignCleared, 0, 'a click on Play Again must not clear on its own');
      assert.equal(scene.calls.started.length, 0, 'a click on Play Again must not start a scene on its own');
      assert.equal(scene.menuMode, 'confirm', 'a click on Play Again opens the confirmation');
      invokePointer(scene, 'pointerdown', 1);
      assert.equal(scene.calls.campaignCleared, 1, 'confirming the click clears the save once');
      assert.equal(scene.calls.started[0].key, 'CampaignScene', 'confirming the click starts a new campaign');
    },
  },
  {
    name: 'legacy_ending_confirms_and_touches_only_the_legacy_save',
    run: () => {
      const scene = makeScene({ campaign: false });
      scene.wireInput(true);
      scene.selectedIndex = selectedIndexFor(false);
      scene.triggerSelected();
      assert.equal(scene.calls.started.length, 0, 'selecting Play Again opens the confirmation instead of acting');
      assert.equal(scene.menuMode, 'confirm', 'the legacy ending also confirms before clearing');
      scene.selectedIndex = 1;
      scene.triggerSelected();
      assert.equal(scene.calls.legacyCleared, 1, 'the legacy ending clears the legacy SaveSystem once');
      assert.equal(scene.calls.campaignCleared, 0, 'the legacy ending never touches the campaign save');
      assert.equal(scene.calls.started[0].key, 'WorldScene', 'the legacy ending restarts the legacy world');
    },
  },
  {
    name: 'restart_does_not_leave_a_second_set_of_listeners',
    run: () => {
      const scene = makeScene({ campaign: true });
      scene.wireInput(true);
      const before = scene.input.keyboard.total();
      scene.wireInput(true);
      assert.equal(scene.input.keyboard.total(), before, 'a re-entry must not stack a second set of key listeners');
      for (const event of scene.input.keyboard.events()) {
        assert.equal(scene.input.keyboard.count(event), 1, `${event} must have exactly one live listener`);
      }
      // The real restart shuts the scene down first; the teardown must leave nothing behind either.
      scene.events.handlers.get('shutdown')?.();
      scene.wireInput(true);
      assert.equal(scene.input.keyboard.total(), before, 'a shutdown followed by re-entry leaves one set of listeners');
    },
  },
  {
    name: 'shutdown_removes_what_the_scene_registered',
    run: () => {
      const scene = makeScene({ campaign: true });
      scene.wireInput(true);
      const shutdown = scene.events.handlers.get('shutdown');
      assert.ok(shutdown, 'the scene registers a shutdown teardown');
      shutdown();
      assert.equal(scene.input.keyboard.total(), 0, 'shutdown removes every key listener the scene registered');
      assert.equal(scene.keyListeners.length, 0, 'shutdown drops the listener ledger');
      assert.equal(scene.events.handlers.has('shutdown'), false, 'shutdown removes its own teardown hook');
    },
  },
  {
    name: 'closing_text_advance_restarts_into_the_campaign_credits',
    run: () => {
      const scene = makeScene({ campaign: true });
      scene.wireInput(false);
      assert.equal(scene.input.keyboard.count('keydown-E'), 1, 'the closing text registers exactly one advance handler');
      // The dialogue handler is registered by identifier, so it is reached through the scene's ledger.
      const handler = scene.keyListeners.find((listener) => listener.event === 'keydown-E')?.handler;
      assert.ok(handler, 'the closing text advance handler is tracked');
      handler();
      handler();
      assert.equal(scene.calls.restarted.length, 0, 'the first two presses only page the text');
      handler();
      assert.equal(scene.calls.restarted.length, 1, 'the third press hands over to the credits');
      assert.equal(scene.calls.restarted[0]?.showCredits, true, 'the credits are shown on the restart');
      assert.equal(scene.calls.restarted[0]?.campaign, true, 'the campaign flag survives the restart');
    },
  },
];

/* ------------------------------------------------------------------ *
 * 4. Runner
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
console.log(`\ncampaign ending: ${CASES.length - failures.length}/${CASES.length} cases passed`);
if (failures.length) {
  console.log(`failed: ${failures.join(', ')}`);
  process.exit(1);
}
