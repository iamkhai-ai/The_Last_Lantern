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
 *    state, the key-repeat filter and the shutdown teardown are the shipped logic;
 *  - the two emitters are modelled on the ones Phaser ships, not on assumptions:
 *    `input.keyboard` replays the events KeyboardPlugin actually delivers (the
 *    browser's auto-repeats included, carrying the DOM `repeat` flag), and the
 *    scene's `events` has eventemitter3's removal semantics — `off(event)` with
 *    no handler clears *every* listener for that event, which is what the core
 *    scene plugins' own shutdown hooks would be caught by, since they register at
 *    scene START, before create() runs;
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
import { existsSync } from 'node:fs';
import {
  CAMPAIGN_ENDING_BEATS, ENDING_ART_REQUIREMENTS, ENDING_PROMPT_CONTINUE, ENDING_PROMPT_CREDITS, EndingMachine, MONTAGE_SHOTS,
  MONTAGE_SHOT_MIN_MS, MONTAGE_SHOT_MS, NIGHT_CALL_LINES, NIGHT_WAIT_MS, REASSURE_LINES, SEATED_LINES, SHADOW_DAWN_LINES,
  SHADOW_DAWN_POSES, SHADOW_DAWN_POSE_MS, TRAIL_TITLE_MS, TREE_RETURN_LINES, endingBeatLines, endingResumeBeat, nextEndingBeat,
} from '../src/data/campaignEnding.ts';
import { CampaignSaveSystem, readEndingBeat } from '../src/systems/CampaignSaveSystem.ts';
import { readPng } from './lib/readPng.mjs';

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
  'wireInput', 'wireCreditsInput', 'wireSequenceInput', 'handleSequencePress', 'advanceSequence', 'togglePause', 'handleAdvance',
  'onKey', 'clearKeyListeners', 'registerShutdownGuard', 'clearShutdownGuard', 'teardownInput',
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

/**
 * A recording stand-in for `input.keyboard`, plus the DOM side of it. The scene
 * only subscribes to events — it never creates a `Key` — so what reaches a
 * handler is the browser's KeyboardEvent itself, `repeat` and all:
 * KeyboardManager queues every DOM keydown unfiltered (KeyboardManager.js:186)
 * and KeyboardPlugin forwards it unless a `Key` for the code exists and was
 * already down, whose repeats are dropped because `emitOnRepeat` is false by
 * default (KeyboardPlugin.js:787-808, addKey:494). `domKeydown`/`domKeyup`
 * deliver exactly those events, so a case can hold a key down for as long as the
 * runtime would.
 */
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
    count(event) { return (registry.get(event) ?? []).length; },
    total() { let n = 0; for (const list of registry.values()) n += list.length; return n; },
    events() { return [...registry.keys()]; },
    /** The key coming down. A key that is already down produces the browser's auto-repeat. */
    domKeydown(name) {
      const repeat = physicallyDown.has(name);
      physicallyDown.add(name);
      emit(`keydown-${name}`, { repeat });
    },
    /**
     * A key that was already down before this scene wired its handlers — the
     * closing-text E — so no keydown is delivered here: the DOM state survives
     * the restart, the scene's listeners do not.
     */
    domHoldDown(name) { physicallyDown.add(name); },
    /** The key going back up: the only thing that re-arms it. */
    domKeyup(name) {
      physicallyDown.delete(name);
      emit(`keyup-${name}`, { repeat: false });
    },
    /** Every event delivered so far, with the repeat flag the handler saw. */
    delivered() { return delivered.map((entry) => ({ ...entry })); },
  };
}

/**
 * `scene.sys.events`, with eventemitter3's removal semantics: `off(event)` with
 * no handler clears *every* listener for the event (eventemitter3 index.js:254),
 * while `off(event, handler, context)` removes only the matching listener.
 * Phaser's scene plugins register their shutdown on this emitter, so the two are
 * not interchangeable.
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
  };
  return api;
}

function makeScene({ campaign = true } = {}) {
  const calls = {
    started: [], restarted: [], campaignCleared: 0, legacyCleared: 0, legacySaved: [],
    soundMirror: 0, soundLantern: 0, confirmTexts: [], buttonTexts: [],
  };
  const keyboard = makeKeyboard();
  const events = makeEvents();
  const confirmText = makeText(calls.confirmTexts);
  const scene = {
    campaignEnding: campaign,
    selectedIndex: 0,
    menuMode: 'credits',
    restartConfirmed: false,
    paused: false,
    pressReady: true,
    sequence: undefined,
    dialogue: undefined,
    pauseText: makeText([]),
    shutdownHandler: undefined,
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
    name: 'a_key_held_across_the_credits_restart_cannot_act_without_a_release',
    run: () => {
      const scene = makeScene({ campaign: true });
      scene.selectedIndex = selectedIndexFor(true);
      scene.wireInput(true);
      // E paged the closing text, the scene restarted, and E is still physically
      // down: the restarted scene has no Key for it (this scene never calls
      // addKey), so the browser's auto-repeats are delivered, each one carrying
      // the DOM repeat flag.
      scene.input.keyboard.domHoldDown('E');
      scene.input.keyboard.domKeydown('E');
      scene.input.keyboard.domKeydown('E');
      assert.deepEqual(scene.input.keyboard.delivered(), [
        { event: 'keydown-E', repeat: true },
        { event: 'keydown-E', repeat: true },
      ], 'while the key stays down the delivered keydowns are auto-repeats');
      assert.equal(scene.calls.campaignCleared, 0, 'a held key never clears the save');
      assert.equal(scene.calls.started.length, 0, 'a held key never leaves the menu');
      assert.equal(scene.menuMode, 'credits', 'a held key never opens the confirmation');

      // The physical release, then a genuine press: the first event with repeat === false.
      scene.input.keyboard.domKeyup('E');
      scene.input.keyboard.domKeydown('E');
      const delivered = scene.input.keyboard.delivered();
      assert.equal(delivered[delivered.length - 1].repeat, false, 'the press after the release is a fresh keydown');
      assert.equal(scene.calls.campaignCleared, 0, 'the released press still keeps the save');
      assert.equal(scene.calls.started.length, 1, 'the released press acts exactly once');
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
      assert.equal(scene.menuMode, 'credits', 'an auto-repeated key never opens the confirmation');
      invokeHandler(scene, 'keydown-DOWN', { repeat: true });
      assert.equal(scene.selectedIndex, 0, 'an auto-repeated arrow never moves the selection');
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
      assert.equal(scene.events.count('shutdown'), 1, 'a re-entry leaves exactly one shutdown hook');
      // The real restart shuts the scene down first; the teardown must leave nothing behind either.
      scene.events.emit('shutdown');
      scene.wireInput(true);
      assert.equal(scene.input.keyboard.total(), before, 'a shutdown followed by re-entry leaves one set of listeners');
    },
  },
  {
    name: 'the_shutdown_hook_leaves_phasers_own_shutdown_listeners_alone',
    run: () => {
      const scene = makeScene({ campaign: true });
      // Every core scene plugin registers its teardown on scene.sys.events at
      // scene START, i.e. before create() runs (InputPlugin, CameraManager,
      // DisplayList, UpdateList, TweenManager, Clock, ...). wireInput() runs the
      // guard on every create(), so it must remove its own hook by identity only.
      let corePluginTearDowns = 0;
      scene.events.on('shutdown', () => { corePluginTearDowns += 1; });
      scene.registerShutdownGuard();
      scene.registerShutdownGuard();
      assert.equal(scene.events.count('shutdown'), 2,
        'the credits wiring must not remove the shutdown listeners Phaser registered');
      scene.events.emit('shutdown');
      assert.equal(corePluginTearDowns, 1, 'the core plugin teardown still runs when the scene shuts down');
      assert.equal(scene.events.count('shutdown'), 1, 'and only that hook is left on the emitter');
      assert.equal(scene.shutdownHandler, undefined, 'the scene removed its own hook by identity');
    },
  },
  {
    name: 'shutdown_removes_what_the_scene_registered',
    run: () => {
      const scene = makeScene({ campaign: true });
      scene.wireInput(true);
      assert.equal(scene.events.count('shutdown'), 1, 'the scene registers exactly one shutdown teardown');
      scene.events.emit('shutdown');
      assert.equal(scene.input.keyboard.total(), 0, 'shutdown removes every key listener the scene registered');
      assert.equal(scene.keyListeners.length, 0, 'shutdown drops the listener ledger');
      assert.equal(scene.events.count('shutdown'), 0, 'shutdown removes its own teardown hook');
      assert.equal(scene.shutdownHandler, undefined, 'the scene forgets the hook it removed');
    },
  },
  {
    name: 'sequence_input_acts_once_per_fresh_press_and_needs_a_release',
    run: () => {
      const scene = makeScene({ campaign: true });
      const advances = [];
      scene.sequence = { advance: () => advances.push('advance'), canAdvance: () => true, destroy() {} };
      scene.wireInput(false);
      assert.equal(scene.input.keyboard.count('keydown-E'), 1, 'one keydown-E handler');
      for (const key of ['keydown-E', 'keydown-SPACE', 'keydown-ENTER', 'keyup-E', 'keyup-SPACE', 'keyup-ENTER']) {
        assert.equal(scene.input.keyboard.count(key), 1, `${key} is wired exactly once`);
      }
      scene.input.keyboard.domKeydown('E');
      assert.equal(advances.length, 1, 'a fresh press advances once');
      // a second keydown that reaches the handler without a release in between (a stuck or replayed key) is refused
      const handler = scene.keyListeners.find((entry) => entry.event === 'keydown-E').handler;
      handler({ repeat: false });
      handler({ repeat: false });
      assert.equal(advances.length, 1, 'no second action until the key has been released');
      scene.input.keyboard.domKeyup('E');
      scene.input.keyboard.domKeydown('SPACE');
      assert.equal(advances.length, 2, 'after the release the next press acts');
      scene.input.keyboard.domKeydown('SPACE');
      scene.input.keyboard.domKeydown('SPACE');
      assert.equal(advances.length, 2, 'auto-repeat never acts');
    },
  },
  {
    name: 'sequence_press_goes_to_the_dialogue_box_first',
    run: () => {
      const scene = makeScene({ campaign: true });
      const log = [];
      scene.dialogue = { isActive: () => true, handleAdvanceInput: () => { log.push('dialogue'); return true; } };
      scene.sequence = { advance: () => log.push('sequence') };
      scene.advanceSequence();
      assert.deepEqual(log, ['dialogue'], 'while a line is on screen the press belongs to the dialogue box, not to the beat');
      scene.dialogue.isActive = () => false;
      scene.advanceSequence();
      assert.deepEqual(log, ['dialogue', 'sequence'], 'with no dialogue the press advances the beat');
      scene.paused = true;
      scene.advanceSequence();
      assert.deepEqual(log, ['dialogue', 'sequence'], 'while paused nothing advances');
    },
  },
  {
    name: 'escape_pauses_and_resumes_the_cinematic',
    run: () => {
      const scene = makeScene({ campaign: true });
      scene.sequence = { advance() {}, destroy() {} };
      scene.wireInput(false);
      invokeHandler(scene, 'keydown-ESC', { repeat: false });
      assert.equal(scene.paused, true, 'ESC pauses');
      invokeHandler(scene, 'keydown-ESC', { repeat: true });
      assert.equal(scene.paused, true, 'a held ESC does not flip it back');
      invokeHandler(scene, 'keydown-ESC', { repeat: false });
      assert.equal(scene.paused, false, 'ESC resumes');
    },
  },
  {
    name: 'the_silence_is_real_time_and_cannot_be_skipped',
    run: () => {
      const machine = new EndingMachine();
      machine.begin('night-call');
      assert.deepEqual(NIGHT_CALL_LINES.map((line) => `${line.speaker}: ${line.text}`), ['Nhinh: Lumo?'], 'the call is only Nhinh asking for Lumo');
      assert.equal(machine.canAdvance(), false, 'the line is still being spoken');
      assert.deepEqual(machine.press(), [], 'no skipping the call before it is spoken');
      machine.dialogueFinished();
      assert.equal(machine.prompt(), ENDING_PROMPT_CONTINUE, 'once the line is spoken the continue control appears');
      assert.equal(machine.press()[0].beat, 'night-wait', 'the press after the call opens the silence');
      for (let index = 0; index < 60; index += 1) machine.press();
      assert.equal(machine.beat, 'night-wait', 'pressing E or Space never skips the silence');
      assert.equal(machine.prompt(), null, 'no continue control is offered during the silence');
      assert.deepEqual(machine.tick(NIGHT_WAIT_MS * 3, true), [], 'a paused scene does not run the silence');
      assert.equal(machine.beat, 'night-wait');
      machine.tick(NIGHT_WAIT_MS - 1, false);
      assert.equal(machine.beat, 'night-wait', 'one millisecond short of the silence the beat is still waiting');
      const effects = machine.tick(1, false);
      assert.equal(effects.at(-1).beat, 'reassure', 'the full silence, unpaused, moves on by itself');
      assert.ok(NIGHT_WAIT_MS >= 1400, 'the silence is at least 1.4 seconds');
    },
  },
  {
    name: 'the_ending_runs_its_beats_in_order_with_the_authored_lines',
    run: () => {
      const machine = new EndingMachine();
      const entered = [];
      const lineSets = [];
      const record = (effects) => { for (const effect of effects) if (effect.type === 'enter') { entered.push(effect.beat); lineSets.push(effect.lines); } };
      record(machine.begin('night-call'));
      machine.dialogueFinished(); record(machine.press());
      record(machine.tick(NIGHT_WAIT_MS, false));
      assert.deepEqual(lineSets.at(-1).map((line) => line.text), ['Tôi đây.', 'Tôi vẫn thấy cậu.'], 'the reassurance is the two authored lines');
      machine.dialogueFinished(); record(machine.press());
      assert.equal(machine.beat, 'montage');
      // montage: four shots, each with an observation beat before it can be skipped
      for (let shot = 0; shot < MONTAGE_SHOTS.length; shot += 1) {
        assert.equal(machine.shot, shot, `shot ${shot + 1} is on screen`);
        assert.deepEqual(machine.press(), [], 'a shot cannot be skipped before it has been looked at');
        machine.tick(MONTAGE_SHOT_MIN_MS, false);
        assert.equal(machine.canAdvance(), true, 'after the observation beat it can be skipped');
        if (shot < MONTAGE_SHOTS.length - 1) assert.equal(machine.press()[0].type, 'shot', 'E shows the next shot');
        else record(machine.press());
      }
      assert.equal(machine.beat, 'shadow-dawn', 'after the last shot the observatory scene follows');
      assert.deepEqual(machine.press(), [], 'the Shadow\'s line comes first');
      machine.dialogueFinished();
      const poses = [];
      for (let step = 0; step < SHADOW_DAWN_POSES.length; step += 1) {
        for (const effect of machine.tick(SHADOW_DAWN_POSE_MS, false)) if (effect.type === 'pose') poses.push(effect.index);
      }
      assert.deepEqual(poses, [0, 1, 2, 3], 'the Shadow fades through the four registered dawn poses in order');
      assert.equal(machine.canAdvance(), true);
      record(machine.press());
      machine.dialogueFinished(); record(machine.press());   // tree-return -> seated
      machine.dialogueFinished(); record(machine.press());   // seated -> trail-title
      assert.equal(machine.beat, 'trail-title');
      assert.equal(machine.canAdvance(), false, 'the credits are not offered before the title');
      assert.deepEqual(machine.press(), [], 'E cannot jump to the credits before the title appears');
      assert.equal(machine.tick(TRAIL_TITLE_MS, false).some((effect) => effect.type === 'title'), true, 'the title appears once the two figures have left');
      assert.equal(machine.prompt(), ENDING_PROMPT_CREDITS, 'only then is the credits control offered');
      record(machine.press());
      assert.deepEqual(entered, [...CAMPAIGN_ENDING_BEATS.slice(0, 1), ...CAMPAIGN_ENDING_BEATS.slice(1)], 'every beat is entered, once, in the saved order');
      assert.equal(nextEndingBeat('credits'), null);
      assert.deepEqual(TREE_RETURN_LINES.map((line) => line.text), ['Lần này… chúng ta đã để đêm đi hết con đường của nó.', 'Và bình minh tự tìm được đường về.']);
      assert.deepEqual(SHADOW_DAWN_LINES.map((line) => line.text), ['Trời sáng rồi.']);
      assert.deepEqual(SEATED_LINES.map((line) => line.text), [
        'Cậu vẫn mang nó theo chứ?', 'Có. Trên đường chắc sẽ còn lúc cần một ngọn đèn.', 'Còn khi không cần nữa?', 'Mình sẽ tắt đi.',
        'Cậu định đi đâu?', 'Trước hết, đi xem khu rừng vào ban ngày.', 'Tôi đi cùng được không?', 'Đó là lối đi cho hai người mà.',
      ], 'the seated scene is the eight authored lines in order');
      for (const set of [NIGHT_CALL_LINES, REASSURE_LINES, SHADOW_DAWN_LINES, TREE_RETURN_LINES, SEATED_LINES]) {
        for (const line of set) assert.equal(/cô bé|con gái|đã mất|còn sống/.test(line.text), false, 'the ending says nothing about the girl');
      }
    },
  },
  {
    name: 'every_beat_resumes_from_its_own_checkpoint',
    run: () => {
      for (const beat of CAMPAIGN_ENDING_BEATS) {
        assert.equal(endingResumeBeat(beat), beat, `${beat} resumes at ${beat}`);
        const machine = new EndingMachine();
        const effects = machine.begin(beat);
        assert.equal(effects[0].type, 'enter'); assert.equal(machine.beat, beat);
      }
      // a resumed silence starts again from zero, and a resumed montage from its first shot
      const wait = new EndingMachine(); wait.begin('night-wait');
      assert.equal(wait.elapsed, 0); wait.tick(NIGHT_WAIT_MS - 100, false); wait.begin('night-wait'); assert.equal(wait.elapsed, 0);
      const montage = new EndingMachine(); montage.begin('montage'); montage.tick(MONTAGE_SHOT_MS, false); assert.equal(montage.shot, 1);
      montage.begin('montage'); assert.equal(montage.shot, 0, 'a resumed montage restarts at the garden');
      assert.equal(new EndingMachine().begin('credits')[0].beat, 'credits');
    },
  },
  {
    name: 'ending_checkpoint_in_the_save_defaults_and_normalises',
    run: () => {
      assert.equal(readEndingBeat({}), 'night-call', 'a completed v1 save without a checkpoint starts the ending');
      assert.equal(readEndingBeat({ 'l9-ending-beat': 'bogus' }), 'night-call', 'an unknown value never invents a chapter');
      assert.equal(readEndingBeat({ 'l9-ending-beat': 'seated' }), 'seated');
      const store = new Map();
      globalThis.window = { localStorage: { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value), removeItem: (key) => store.delete(key) } };
      const KEY = 'last-lantern-campaign-save-v1';
      const put = (flags) => store.set(KEY, JSON.stringify({ version: 1, level: 9, flags, counters: {}, lanternOn: false, lanternPickedUp: true }));
      put({ 'l9-complete': true, 'l9-ending-beat': 'bogus' });
      assert.equal(CampaignSaveSystem.load().flags['l9-ending-beat'], 'night-call', 'an invalid beat on a completed save restarts the ending');
      put({ 'l9-ending-beat': 'bogus' });
      assert.equal('l9-ending-beat' in CampaignSaveSystem.load().flags, false, 'an invalid beat on an unfinished save is dropped');
      put({ 'l9-complete': true, 'l9-ending-beat': 'montage' });
      assert.equal(CampaignSaveSystem.load().flags['l9-ending-beat'], 'montage', 'a valid beat is kept as written');
      delete globalThis.window;
    },
  },
  {
    name: 'ending_art_exists_at_native_size_and_the_cinematic_never_builds_the_credits_card',
    run: () => {
      const LEVEL_DIRS = ['01-forgotten-forest-edge', '02-whispering-woods', '03-library-beneath-the-roots', '04-shattered-moonlit-creek', '05-a-path-for-two', '06-the-sleepless-tower', '07-the-sleeping-garden', '08-ruins-of-two-halves', '09-dark-moon-observatory', '10-the-heart-of-elaria'];
      for (const art of ENDING_ART_REQUIREMENTS) {
        const file = join(rootDir, 'assets/levels', LEVEL_DIRS[art.level], 'sprites', `${art.file}.png`);
        assert.ok(existsSync(file), `${art.file} exists`);
        const png = readPng(file);
        assert.deepEqual({ width: png.width, height: png.height }, { width: art.width, height: art.height }, `${art.file} keeps its native size`);
      }
      const seated = readPng(join(rootDir, 'assets/levels/10-the-heart-of-elaria/sprites/ending-nhinh-seated-unlit-leaf.png'));
      assert.deepEqual({ width: seated.width, height: seated.height }, { width: 36, height: 42 }, 'the seated pose is the 36x42 gameplay pose, not the 144x168 insert');
      for (const frame of [0, 1, 2]) assert.ok(existsSync(join(rootDir, `assets/character/nhinh_right_walk_nolamp_${frame}.png`)), `the off-lamp walk frame ${frame} exists`);
      for (const pose of ['stillness', ...SHADOW_DAWN_POSES]) {
        const png = readPng(join(rootDir, `assets/levels/shared/characters/the-shadow/sprites/${pose}.png`));
        assert.deepEqual({ width: png.width, height: png.height }, { width: 48, height: 64 }, `Shadow pose ${pose} is 48x64`);
      }
      const registry = readFileSync(join(rootDir, 'src/art/CampaignArt.ts'), 'utf8');
      for (const pose of ['stillness', ...SHADOW_DAWN_POSES]) assert.ok(registry.includes(`'${pose}.png'`), `the registry loads the ${pose} pose`);
      const sequenceSource = readFileSync(join(rootDir, 'src/systems/CampaignEndingSequence.ts'), 'utf8');
      for (const match of sequenceSource.matchAll(/getLevelArtKey\((\d), '([^']+)'\)/g)) {
        const file = join(rootDir, 'assets/levels', LEVEL_DIRS[Number(match[1])], 'sprites', `${match[2]}.png`);
        assert.ok(existsSync(file), `the sequence asks only for art that exists (${match[2]})`);
      }
      const sceneSource = readFileSync(SCENE_FILE, 'utf8');
      assert.ok(sceneSource.indexOf('this.createCinematic(progress, resumeBeat)') < sceneSource.indexOf('card.setDepth(85)'),
        'the cinematic starts before the credits card is built, so no opaque card covers the world during the ending');
      assert.equal(sceneSource.includes('wireDialogueInput'), false, 'the three text pages are gone');
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
