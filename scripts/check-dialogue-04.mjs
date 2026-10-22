import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { canCompleteCreek, deriveCreekState, unsafePowerChange } from '../src/data/shatteredCreekLayout.ts';

/*
 * Level 04 approved dialogue regression.
 *
 * The controller imports Phaser, so a plain Node import cannot load it. As in
 * `scripts/check-path-for-two.mjs` and `scripts/check-campaign-runtime.mjs`, the
 * shipped method bodies and module constants are read out of the source with the
 * TypeScript compiler API and bound to a recording stand-in for the scene ports.
 * The expected dialogue is parsed from the approved document itself, not retyped
 * here, so a copy drift in either direction fails the check.
 */

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTROLLER_FILE = join(rootDir, 'src/scenes/ShatteredCreekController.ts');
const APPROVED_FILE = join(rootDir, 'docs/scenario/04-shattered-moonlit-creek-dialogue-approved.md');
const CONTROLLER_SOURCE = readFileSync(CONTROLLER_FILE, 'utf8');
const controllerAst = ts.createSourceFile(CONTROLLER_FILE, CONTROLLER_SOURCE, ts.ScriptTarget.Latest, true);

const nodeText = (node) => node.getText(node.getSourceFile());
function walkNode(node, visit) { visit(node); node.forEachChild((child) => walkNode(child, visit)); }
function findNode(root, predicate) {
  let found = null;
  walkNode(root, (node) => { if (!found && predicate(node)) found = node; });
  return found;
}
/** The shipped body of one method, so a rename or a moved gate fails here instead of passing. */
function methodBody(name) {
  const method = findNode(controllerAst, (node) => ts.isMethodDeclaration(node) && nodeText(node.name) === name);
  assert.ok(method, `ShatteredCreekController still declares ${name}()`);
  assert.ok(method.body, `${name}() still has a body`);
  return nodeText(method.body);
}
/** A module-local constant of the controller, read from its source, never hand-copied. */
function controllerConstant(name) {
  const declaration = findNode(controllerAst, (node) => ts.isVariableDeclaration(node) && nodeText(node.name) === name);
  assert.ok(declaration?.initializer, `ShatteredCreekController still authors ${name}`);
  const js = ts.transpileModule(`const __value = (${nodeText(declaration.initializer)});`,
    { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
  return new Function(`"use strict";\n${js}\nreturn __value;`)();
}
/** Compile one extracted body into a method, closing over the symbols it uses. */
function compile(name, parameters, symbols) {
  // Identity i18n: this check asserts the authored Vietnamese copy, which is the catalogue key.
  const bound = { tr: (text, params) => (params ? text.replace(/\{(\w+)\}/g, (match, key) => (key in params ? String(params[key]) : match)) : text), ...symbols };
  const names = Object.keys(bound);
  const js = ts.transpileModule(`const __unit = function (${parameters.join(', ')}) {\n${methodBody(name)}\n};`,
    { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
  try {
    return new Function(...names, `"use strict";\n${js}\nreturn __unit;`)(...names.map((key) => bound[key]));
  } catch (error) {
    throw new Error(`could not bind the shipped ShatteredCreekController.${name}(): ${error.message}`);
  }
}

const COPY = {
  opening: controllerConstant('OPENING'),
  practice: controllerConstant('OPEN_PRACTICE'),
  firstBridge: controllerConstant('FIRST_BRIDGE'),
  latchA: controllerConstant('LATCH_A_DONE'),
  reroute: controllerConstant('REROUTE_TO_ISLAND'),
  latchB: controllerConstant('LATCH_B_DONE'),
  latchUnpowered: controllerConstant('LATCH_UNPOWERED'),
  latchRepeat: controllerConstant('LATCH_REPEAT'),
  unsafeBridge: controllerConstant('UNSAFE_ON_BRIDGE'),
  unsafeReturn: controllerConstant('UNSAFE_RETURN_PATH'),
  reliefLamp: controllerConstant('RELIEF_LAMP_REMINDER'),
  reliefFirst: controllerConstant('RELIEF_FIRST'),
  reliefRepeat: controllerConstant('RELIEF_REPEAT'),
  exitLamp: controllerConstant('EXIT_LEAVE_LAMP'),
  exitUnread: controllerConstant('EXIT_UNREAD_RELIEF'),
  exitNext: controllerConstant('EXIT_NEXT'),
};

/* ------------------------------------------------------------------ *
 * Exact approved copy, parsed from the approved document
 * ------------------------------------------------------------------ */

const approved = readFileSync(APPROVED_FILE, 'utf8')
  .split(/\r?\n/)
  .map((line) => line.trim().match(/^\*\*(Nhinh|Lumo):\*\* “(.*)”\\?$/))
  .filter(Boolean)
  .map((match) => ({ speaker: match[1], text: match[2] }));

assert.equal(approved.length, 33, 'the approved document still contains the 33 reviewed speaker lines');

const groups = [
  ['opening', 7], ['practice', 3], ['firstBridge', 2], ['latchA', 1], ['reroute', 2], ['latchB', 1],
  ['latchUnpowered', 1], ['latchRepeat', 1], ['unsafeBridge', 1], ['unsafeReturn', 1], ['reliefLamp', 1],
  ['reliefFirst', 7], ['reliefRepeat', 1], ['exitLamp', 1], ['exitUnread', 1], ['exitNext', 2],
];
let cursor = 0;
for (const [name, count] of groups) {
  assert.deepEqual(COPY[name], approved.slice(cursor, cursor + count), `${name} matches the approved document verbatim`);
  cursor += count;
}
assert.equal(cursor, approved.length, 'every approved speaker line is shipped exactly once');

const obsolete = [
  'Mặt suối không chuyển động.', 'Đặt đèn xuống thì tia giữ yên.', 'Bệ nhỏ cạnh lối vào là nơi an toàn',
  'Có đường rồi!', 'Tay chốt này có thể giữ các phiến đá.', 'Cầu vẫn còn. Giờ chiếc gương cuối cùng',
  'Mình đã mở đường cho chính mình.', 'Đã giữ chắc. Đổi ánh sáng', 'Mắt nhận vẫn tối.',
  'Mình cần giữ cầu đầu bằng chốt trước', 'Mình nên thu hồi đèn trước khi đọc tiếp.',
  'Tất cả tia sáng đều hướng về Cây Mẹ.', 'Đêm ấy có một cơn bão rất lớn.', 'Người này gom ánh sáng',
  'Có lẽ lần này họ đang đợi cậu.', 'Đi tới bờ an toàn trước khi tắt đèn', 'Cấu hình này sẽ cắt đường quay về.',
];
for (const text of obsolete) assert.equal(CONTROLLER_SOURCE.includes(text), false, `obsolete copy is gone: ${text}`);

/* ------------------------------------------------------------------ *
 * The shipped controller, bound to a recording scene stand-in
 * ------------------------------------------------------------------ */

const freshState = (over = {}) => ({
  source: 'main', lanternOn: true, g1: 2, g2: 1, g3: 2, practice: 2, practiceComplete: true,
  latchA: false, latchB: false, memo: false, lanternRetrieved: false, ...over,
});

function makeCreek({ state = freshState(), flags = {}, x = 68, y = 286 } = {}) {
  const said = [];
  const saved = [];
  const next = [];
  const lantern = {
    lanternOn: state.lanternOn,
    lanternPlaced: state.source !== null,
    lanternInHand: state.source === null,
    placeLanternAt() { this.lanternPlaced = true; this.lanternInHand = false; },
    retrieveLantern() { this.lanternInHand = true; this.lanternPlaced = false; },
    toggleLantern() { this.lanternOn = !this.lanternOn; return true; },
  };
  const creek = {
    state,
    said,
    saved,
    next,
    ctx: {
      progress: { flags, counters: {}, lanternOn: state.lanternOn, lanternPickedUp: state.lanternRetrieved },
      player: { x, y },
      lantern,
      save: () => saved.push(1),
      say: (lines, done) => { said.push(lines); done?.(); },
      nextLevel: (lines) => next.push(lines),
      isDialogueActive: () => false,
    },
    saveState() { saved.push(1); },
    colliderBodies: new Map(),
    updateVisuals() {},
    animateWater() {},
    updateHud() {},
    point() { return { x: this.ctx.player.x, y: this.ctx.player.y }; },
  };
  creek.refuseUnsafe = compile('refuseUnsafe', ['reason'], {
    UNSAFE_ON_BRIDGE: COPY.unsafeBridge, UNSAFE_RETURN_PATH: COPY.unsafeReturn,
  });
  creek.startOpening = compile('startOpening', [], { OPENING: COPY.opening });
  creek.update = compile('update', [], {
    deriveCreekState, OPEN_PRACTICE: COPY.practice, FIRST_BRIDGE: COPY.firstBridge, REROUTE_TO_ISLAND: COPY.reroute,
  });
  creek.latch = compile('latch', ['which'], {
    deriveCreekState, LATCH_REPEAT: COPY.latchRepeat, LATCH_UNPOWERED: COPY.latchUnpowered,
    LATCH_A_DONE: COPY.latchA, LATCH_B_DONE: COPY.latchB,
  });
  creek.readRelief = compile('readRelief', [], {
    RELIEF_LAMP_REMINDER: COPY.reliefLamp, RELIEF_FIRST: COPY.reliefFirst, RELIEF_REPEAT: COPY.reliefRepeat,
  });
  creek.exit = compile('exit', [], {
    canCompleteCreek, EXIT_LEAVE_LAMP: COPY.exitLamp, EXIT_UNREAD_RELIEF: COPY.exitUnread, EXIT_NEXT: COPY.exitNext,
  });
  creek.toggleLantern = compile('toggleLantern', [], { deriveCreekState, unsafePowerChange });
  creek.rotate = compile('rotate', ['id'], { deriveCreekState, unsafePowerChange });
  creek.useSource = compile('useSource', ['which'], { deriveCreekState, unsafePowerChange });
  return creek;
}

const saidText = (creek) => creek.said.flat().map((line) => `${line.speaker}: ${line.text}`).join(' | ');

/* ------------------------------------------------------------------ *
 * Cases
 * ------------------------------------------------------------------ */

let failuresCount = 0;
function test(name, run) {
  try { run(); console.log(`PASS  ${name}`); }
  catch (error) { failuresCount += 1; console.log(`FAIL  ${name}`); for (const line of String(error.message).split('\n')) console.log(`        ${line}`); }
}

test('opening_plays_once_and_matches_the_approved_scene_entry', () => {
  const creek = makeCreek({ state: freshState({ source: null, lanternRetrieved: true }) });
  creek.startOpening();
  assert.deepEqual(creek.said, [COPY.opening], saidText(creek));
  assert.equal(creek.ctx.progress.flags['intro-3'], true);
  creek.startOpening();
  assert.equal(creek.said.length, 1, `the opening is not replayed on a later build (${saidText(creek)})`);

  const resumed = makeCreek({ flags: { 'intro-3': true }, state: freshState({ source: null, lanternRetrieved: true }) });
  resumed.startOpening();
  assert.equal(resumed.said.length, 0, 'a resumed save does not replay the opening conversation');
  assert.match(methodBody('build'), /this\.startOpening\(\)/, 'build still starts the approved opening on a fresh creek');
});

test('practice_flower_reaction_is_approved_and_one_time', () => {
  const creek = makeCreek({ state: freshState({ source: 'practice', practiceComplete: false, practice: 2 }) });
  creek.update();
  assert.deepEqual(creek.said, [COPY.practice], saidText(creek));
  assert.equal(creek.state.practiceComplete, true);
  assert.equal(creek.ctx.progress.flags['l3-practice-complete'], true);
  creek.update();
  assert.equal(creek.said.length, 1, 'the discovery line is not replayed after the discovery is recorded');
});

test('first_bridge_reaction_is_approved_one_time_and_truthful', () => {
  const creek = makeCreek({ state: freshState() });
  assert.equal(deriveCreekState(creek.state).eyeA, true, 'the fixture really powers receiver A');
  creek.update();
  assert.deepEqual(creek.said, [COPY.firstBridge], saidText(creek));
  assert.equal(creek.ctx.progress.flags['l3-eye-a-dialogue'], true);
  creek.update();
  assert.equal(creek.said.length, 1, 'the first-bridge beat does not replay every frame');

  const noBridge = makeCreek({ state: freshState({ g2: 0 }) });
  assert.equal(deriveCreekState(noBridge.state).eyeA, false);
  noBridge.update();
  assert.equal(noBridge.said.length, 0, 'no first-bridge line without a first bridge');
});

test('changed_beam_after_latch_one_is_approved_one_time_and_requires_latch_A', () => {
  const creek = makeCreek({ state: freshState({ latchA: true, g1: 2, g2: 2 }), flags: { 'l3-eye-a-dialogue': true } });
  const live = deriveCreekState(creek.state);
  assert.equal(live.eyeB, true, 'the changed beam reaches the island mirror');
  assert.ok(live.mainSegments.some((segment) => segment.hit === 'g3'), 'the changed beam really hits G3');
  creek.update();
  assert.deepEqual(creek.said, [COPY.reroute], saidText(creek));
  assert.equal(creek.ctx.progress.flags['l3-reroute-dialogue'], true);
  creek.update();
  assert.equal(creek.said.length, 1, 'the reroute beat is one-time');

  const unlatched = makeCreek({ state: freshState({ latchA: false, g1: 2, g2: 2 }) });
  assert.ok(deriveCreekState(unlatched.state).mainSegments.some((segment) => segment.hit === 'g3'));
  unlatched.update();
  assert.equal(unlatched.said.length, 0, 'the changed-beam line cannot claim the bridge held before latch A exists');
});

test('both_latches_keep_the_approved_lines_and_the_second_is_one_time', () => {
  const a = makeCreek({ state: freshState() });
  a.latch('A');
  assert.deepEqual(a.said, [COPY.latchA], saidText(a));
  assert.equal(a.state.latchA, true);
  assert.equal(a.ctx.progress.flags['l3-latch-a'], true);
  a.latch('A');
  assert.deepEqual(a.said.at(-1), COPY.latchRepeat, 're-interacting with a latched handle is truthful and quiet');

  const unpowered = makeCreek({ state: freshState({ g2: 0 }) });
  unpowered.latch('A');
  assert.deepEqual(unpowered.said, [COPY.latchUnpowered], saidText(unpowered));
  assert.equal(unpowered.state.latchA, false, 'an unpowered hand latch still refuses');

  const second = makeCreek({ state: freshState({ latchA: true, g1: 2, g2: 2 }) });
  assert.equal(deriveCreekState(second.state).eyeB, true);
  second.latch('B');
  assert.deepEqual(second.said, [COPY.latchB], saidText(second));
  assert.equal(second.state.latchB, true);
  assert.equal(second.ctx.progress.flags['l3-latch-b'], true);
  second.latch('B');
  assert.equal(second.said.length, 2, 'the second latch announces completion only once');
  assert.deepEqual(second.said.at(-1), COPY.latchRepeat);
});

test('the_second_latch_still_cannot_skip_the_first', () => {
  // Unreachable through the shipped banks, but the progression guard is kept, not deleted.
  const creek = makeCreek({ state: freshState({ latchA: false, g1: 2, g2: 2, latchB: false }) });
  assert.equal(deriveCreekState(creek.state).eyeB, true);
  creek.latch('B');
  assert.equal(creek.state.latchB, false, 'latch B still refuses while latch A is missing');
  assert.equal(creek.said.length, 1, 'the refusal stays explained');
  assert.deepEqual(creek.said[0], COPY.latchUnpowered);
});

test('safe_bank_lamp_off_and_take_before_a_latch_stay_legal', () => {
  const creek = makeCreek({ state: freshState(), x: 100, y: 150 });
  assert.equal(unsafePowerChange({ x: 100, y: 150 }, deriveCreekState(creek.state), deriveCreekState({ ...creek.state, lanternOn: false })), null);
  assert.equal(creek.toggleLantern(), true, 'turning the placed lamp off on the west bank is allowed before any latch');
  assert.equal(creek.state.lanternOn, false);
  assert.equal(creek.said.length, 0, 'a legal safe-bank power change is not refused');

  const take = makeCreek({ state: freshState({ lanternOn: false }), x: 100, y: 150 });
  take.useSource('main');
  assert.equal(take.state.source, null, 'taking the lamp from the main pedestal on the safe west bank is allowed');
  assert.equal(take.state.lanternRetrieved, true);
  assert.equal(take.ctx.progress.flags['l3-lantern-retrieved'], true);
  assert.equal(take.said.length, 0, 'the legal take is not blocked by a new restriction');
});

test('unsafe_power_changes_keep_their_approved_safety_wording', () => {
  const bridge = makeCreek({ state: freshState(), x: 274, y: 229 });
  assert.equal(deriveCreekState(bridge.state).bridgeA, true);
  assert.equal(bridge.toggleLantern(), false, 'the lamp cannot be switched off while standing on bridge A');
  assert.deepEqual(bridge.said, [COPY.unsafeBridge], saidText(bridge));
  assert.equal(bridge.state.lanternOn, true, 'the refused change does not mutate state');

  const island = makeCreek({ state: freshState({ g2: 1 }), x: 350, y: 150 });
  assert.equal(deriveCreekState(island.state).bridgeA, true);
  island.rotate('g2');
  assert.equal(island.state.g2, 1, 'the stranded island rotation is refused');
  assert.deepEqual(island.said, [COPY.unsafeReturn], saidText(island));

  const east = makeCreek({ state: freshState({ latchA: true, g1: 2, g2: 2 }), x: 500, y: 150 });
  assert.equal(deriveCreekState(east.state).bridgeB, true);
  east.toggleLantern();
  assert.deepEqual(east.said, [COPY.unsafeReturn], 'losing the only way back from the east bank uses the same honest reminder');
});

test('lamp_recovery_reminders_are_exact_at_the_relief_and_the_exit', () => {
  const relief = makeCreek({ state: freshState({ source: 'main', lanternRetrieved: false }) });
  relief.readRelief();
  assert.deepEqual(relief.said, [COPY.reliefLamp], saidText(relief));
  assert.equal(relief.state.memo, false, 'the relief cannot be read before the lamp is in hand');

  const exitLamp = makeCreek({ state: freshState({ source: 'main', lanternRetrieved: false }) });
  exitLamp.exit();
  assert.deepEqual(exitLamp.said, [COPY.exitLamp], saidText(exitLamp));
  assert.equal(exitLamp.next.length, 0, 'the locked exit does not advance');

  const unread = makeCreek({ state: freshState({ source: null, lanternRetrieved: true, memo: false, latchA: true, latchB: true }) });
  unread.exit();
  assert.deepEqual(unread.said, [COPY.exitUnread], saidText(unread));
  assert.equal(unread.next.length, 0, 'the unread relief still blocks the exit');
});

test('relief_first_reading_and_reread_match_the_approved_copy', () => {
  const creek = makeCreek({ state: freshState({ source: null, lanternRetrieved: true, memo: false }) });
  creek.readRelief();
  assert.deepEqual(creek.said, [COPY.reliefFirst], saidText(creek));
  assert.equal(creek.state.memo, true);
  assert.equal(creek.ctx.progress.flags['l3-memo'], true);
  creek.readRelief();
  assert.deepEqual(creek.said.at(-1), COPY.reliefRepeat, 'the reread is the approved short line');

  const single = makeCreek({ state: freshState({ source: null, lanternRetrieved: true, memo: true }) });
  single.readRelief();
  assert.deepEqual(single.said, [COPY.reliefRepeat], 'a saved memo loaded later shows the reread line only');
});

test('exit_dialogue_is_approved_and_the_original_completion_gate_is_intact', () => {
  const complete = makeCreek({ state: freshState({ source: null, lanternRetrieved: true, memo: true, latchA: true, latchB: true }) });
  assert.equal(canCompleteCreek(complete.state), true);
  complete.exit();
  assert.deepEqual(complete.next, [COPY.exitNext], 'the exit advances with the approved hand-over lines');
  assert.equal(complete.said.length, 0);

  const missingLatch = makeCreek({ state: freshState({ source: null, lanternRetrieved: true, memo: true, latchA: true, latchB: false }) });
  assert.equal(canCompleteCreek(missingLatch.state), false);
  missingLatch.exit();
  assert.equal(missingLatch.next.length, 0, 'the exit still requires both latches');
  assert.match(saidText(missingLatch), /Trạm chưa mở/, 'missing bridge latches still name the remaining requirement');

  for (const change of [{ source: 'main' }, { source: 'practice' }, { latchA: false }, { latchB: false }, { lanternRetrieved: false }, { memo: false }]) {
    assert.equal(canCompleteCreek({ ...complete.state, ...change }), false, `completion still rejects ${JSON.stringify(change)}`);
  }
});

test('mirror_rotations_do_not_add_chatter', () => {
  const creek = makeCreek({ state: freshState({ source: 'practice' }), x: 100, y: 150 });
  creek.rotate('g1');
  creek.rotate('g2');
  creek.rotate('g3');
  assert.equal(creek.said.length, 0, 'ordinary mirror rotations play no story dialogue');
  assert.equal(creek.saved.length, 3, 'each accepted rotation is still bookkept');
});

test('keyboard_instructions_stay_out_of_character_speech', () => {
  const spoken = Object.values(COPY).flat();
  for (const line of spoken) {
    assert.doesNotMatch(line.text, /\bE\b|\bF\b|Nhấn phím|Nhấn F/, `instruction text leaked into character speech: ${line.text}`);
  }
  assert.match(CONTROLLER_SOURCE, /E đặt đèn lên bệ nhỏ; E ở gương xoay qua các hướng\./, 'the existing H-key instruction channel still carries the controls');
  assert.match(CONTROLLER_SOURCE, /Nhấn F để bật tia sáng\./, 'the existing hint channel still names the lantern key');
});

test('no_hope_crystal_or_catastrophe_conclusion_is_awarded_here', () => {
  const complete = makeCreek({ state: freshState({ source: null, lanternRetrieved: true, memo: true, latchA: true, latchB: true }) });
  complete.exit();
  const spoken = saidText(complete) + complete.next.flat().map((line) => line.text).join(' ');
  assert.equal(/Tinh thể Hy Vọng|tinh thể hy vọng/i.test(spoken), false, 'level 04 awards no Hope crystal');
  assert.equal(/nguyên nhân|tai họa|vai trò/i.test(spoken), false, 'the approved lines draw no catastrophe conclusion');
});

if (failuresCount > 0) {
  console.log(`\n${failuresCount} dialogue regression case(s) failed`);
  process.exitCode = 1;
} else {
  console.log('\nLevel 04 approved dialogue, guards and safety checks passed');
}
