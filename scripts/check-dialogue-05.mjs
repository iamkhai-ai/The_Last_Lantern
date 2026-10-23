import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { PATH_CHALK_VIEW, PATH_DOOR_FACES, PATH_ROOMS, hasDoorPower, isPathCallSpent, isPathInteractHeld, pathActorBody, rectsOverlap } from '../src/data/pathForTwoLayout.ts';
import { CAMPAIGN_LEVELS } from '../src/data/campaignLevels.ts';

/**
 * Level 05 dialogue regression, bound to the scenario v2 document.
 *
 * Source of truth: docs/scenario-v2/05-a-path-for-two.md (§2–§8). The v1 approved copy in docs/scenario/ stays in the
 * repository for diffing and is no longer the reference. This check:
 *   1. finds every line of speech the v2 document writes (`**Speaker:** “…”`), every quoted H, HUD and journal line
 *      of its §6 tables, and asserts each one is shipped verbatim in PathForTwoLevel.ts;
 *   2. asserts the v1 lines that v2 removes are gone;
 *   3. binds the shipped methods that decide when a line may speak (send, the first leave from an unlatched seal, the
 *      pipe echo, the observations, the chalk, the exit latch, the H stage) and checks each against its condition.
 */
const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTROLLER_FILE = join(rootDir, 'src/levels/PathForTwoLevel.ts');
const CONTROLLER_SOURCE = readFileSync(CONTROLLER_FILE, 'utf8');
const V2_DOC = readFileSync(join(rootDir, 'docs/scenario-v2/05-a-path-for-two.md'), 'utf8');
const controllerAst = ts.createSourceFile(CONTROLLER_FILE, CONTROLLER_SOURCE, ts.ScriptTarget.Latest, true);

const nodeText = (node) => node.getText(node.getSourceFile());
function walkNode(node, visit) { visit(node); node.forEachChild((child) => walkNode(child, visit)); }
function findNode(root, predicate) {
  let found = null;
  walkNode(root, (node) => { if (!found && predicate(node)) found = node; });
  return found;
}
function methodBody(name) {
  const method = findNode(controllerAst, (node) => ts.isMethodDeclaration(node) && nodeText(node.name) === name);
  assert.ok(method?.body, `PathForTwoLevel still declares ${name}() with a body`);
  return nodeText(method.body);
}
/** A module-level constant of the controller, evaluated from its own source. */
function constant(name) {
  const declaration = findNode(controllerAst, (node) => ts.isVariableDeclaration(node) && nodeText(node.name) === name);
  assert.ok(declaration?.initializer, `PathForTwoLevel still authors ${name}`);
  const js = ts.transpileModule(`const __value = (${nodeText(declaration.initializer)});`,
    { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
  return new Function(`"use strict";\n${js}\nreturn __value;`)();
}
const IDENTITY_TR = (text, params) => (params ? text.replace(/\{(\w+)\}/g, (match, key) => (key in params ? String(params[key]) : match)) : text);
/** A module-level function of the controller, evaluated from its own source (its `tr` is the identity table). */
function functionDecl(name) {
  const declaration = findNode(controllerAst, (node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(declaration, `PathForTwoLevel still declares ${name}()`);
  const js = ts.transpileModule(`const __fn = (${nodeText(declaration).replace(/^function\s+\w+/, 'function')});`,
    { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
  return new Function('tr', `"use strict";\n${js}\nreturn __fn;`)(IDENTITY_TR);
}
function compile(name, parameters, symbols) {
  symbols = { tr: IDENTITY_TR, ...symbols };
  const names = Object.keys(symbols);
  const js = ts.transpileModule(`const __unit = function (${parameters.join(', ')}) {\n${methodBody(name)}\n};`,
    { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
  try {
    return new Function(...names, `"use strict";\n${js}\nreturn __unit;`)(...names.map((key) => symbols[key]));
  } catch (error) {
    throw new Error(`could not bind the shipped PathForTwoLevel.${name}(): ${error.message}`);
  }
}
const show = (lines) => lines.map((line) => `${line.speaker}: ${line.text}`).join(' | ');

/* ------------------------------------------------------------------ *
 * 1. The v2 document's copy, verbatim in the shipped controller
 * ------------------------------------------------------------------ */

/** Speech in the document: `**Speaker:** “text”`. The H ladder labels (`**Mức N …:**`) are not speech and are skipped. */
const speech = [...V2_DOC.matchAll(/\*\*([^*\n]+?):\*\*\s*“([^”\n]+)”/g)]
  .map(([, speaker, text]) => ({ speaker, text }))
  .filter(({ speaker }) => !speaker.startsWith('Mức'));
/**
 * The §6 tables and journal bullets: each quoted line of the step ladder, the HUD and the J notes. Excluded: the
 * general ladder ("Thang gợi ý chính", the step table replaces it) and the two lines the document marks as removed (**bỏ**).
 */
const section6Lines = [];
let inGeneralLadder = false;
for (const line of V2_DOC.slice(V2_DOC.indexOf('## 6. '), V2_DOC.indexOf('## 7. ')).split('\n')) {
  if (line.startsWith('### ')) inGeneralLadder = line.startsWith('### Thang gợi ý chính');
  if (!inGeneralLadder && !line.includes('**bỏ**')) section6Lines.push(line);
}
const quotedInSection6 = section6Lines.flatMap((line) => [...line.matchAll(/“([^”\n]+)”/g)].map(([, text]) => text));
const missingVerbatim = [...new Set([...speech.map((line) => line.text), ...quotedInSection6])]
  .filter((text) => !CONTROLLER_SOURCE.includes(text));

const failures = [];
let count = 0;
function dialogueCase(name, run) {
  count += 1;
  try {
    run();
    console.log(`PASS  ${name}`);
  } catch (error) {
    failures.push(name);
    console.log(`FAIL  ${name}`);
    for (const line of String(error.message).split('\n')) console.log(`        ${line}`);
  }
}

dialogueCase('every_line_of_speech_in_the_v2_document_is_shipped_verbatim', () => {
  assert.ok(speech.length >= 40, `the document has its speech (${speech.length} lines found)`);
  assert.ok(quotedInSection6.length >= 20, `the §6 tables are read (${quotedInSection6.length} quoted lines)`);
  assert.deepEqual(missingVerbatim, [], 'no line of the v2 speech or §6 tables is missing from PathForTwoLevel.ts');
});

dialogueCase('the_main_h_ladder_is_the_v2_thang_goi_y_chinh_and_the_fallback_for_no_step_row', () => {
  // §6 "Thang gợi ý chính": the three generic levels are the campaign ladder (CAMPAIGN_LEVELS[4].hint) verbatim, and the
  // controller answers from that ladder whenever no per-step row applies.
  const start = V2_DOC.indexOf('### Thang gợi ý chính');
  const main = [...V2_DOC.slice(start, V2_DOC.indexOf('### Thang theo bước')).matchAll(/^- \*\*Mức (\d)[^\n]*?\*\*:?\s*“([^”\n]+)”/gmu)]
    .map(([, level, text]) => ({ level: Number(level), text }));
  assert.deepEqual(main.map((line) => line.level), [1, 2, 3], 'the main ladder lists Mức 1, 2, 3');
  const campaign = readFileSync(join(rootDir, 'src/data/campaignLevels.ts'), 'utf8');
  for (const { text } of main) assert.equal(campaign.includes(text), true, `the campaign ladder ships "${text.slice(0, 40)}…" verbatim`);
  assert.equal(CONTROLLER_SOURCE.includes('CAMPAIGN_LEVELS[4].hint'), true, 'the controller falls back to the campaign ladder');
  // Behaviour: during the practice lesson no step row applies, so H answers from the main ladder, one level per press.
  const showHint = compile('showHint', [], { CAMPAIGN_LEVELS, hintText: functionDecl('hintText') });
  const scene = makeScene('entry', {}, { assignment: 'practice', hintStage: '', hintIndex: 0 });
  scene.hintStageKey = compile('hintStageKey', [], {});
  scene.showHint = showHint;
  for (const expected of main.map((line) => line.text)) {
    scene.showHint();
    assert.equal(scene.said.at(-1)[0].text, expected, 'H answers from the main ladder while no step row applies');
  }
  // Once the lesson is over, the hall's step row answers instead, starting again at level 1.
  scene.assignment = 'follow';
  scene.showHint();
  assert.equal(scene.said.at(-1)[0].text, 'Hai mốc gọi đều nối vào ống trên cửa.', 'the hall row applies after the lesson');
});

dialogueCase('the_v1_lines_that_v2_removes_are_gone', () => {
  for (const text of [
    'Khoan đã. Tôi chưa gài chốt cửa này.',
    'Những vệt trên nền còn mờ quá.',
    'Thử tắt đèn xem.',
    'Bên này còn một dấu nữa.',
    'Ừ. Có lẽ chúng chỉ đường qua hành lang.',
    'Từ chỗ tôi đứng, tôi thấy vết mực kể thứ tự',
    'NEXT_MARK_UNLATCHED',
    'INK_NOT_SEEN',
    'l4-ink-seals',
    'PATH_INK_ORDER',
  ]) assert.equal(CONTROLLER_SOURCE.includes(text), false, `"${text}" is not in the controller`);
});

dialogueCase('every_speaker_is_nhinh_lumo_or_the_system_hint', () => {
  const speakers = new Set([...CONTROLLER_SOURCE.matchAll(/speaker:\s*'([^']+)'/g)].map(([, speaker]) => speaker));
  assert.deepEqual([...speakers].sort(), ['Hệ thống', 'Lumo', 'Nhinh'], 'only the two characters and the system hint speak');
});

/* ------------------------------------------------------------------ *
 * 2. The shipped rules that decide when a line may speak
 * ------------------------------------------------------------------ */

function makeScene(room, flags, extra = {}) {
  const scene = {
    room,
    progress: { flags: { ...flags }, counters: {} },
    player: { x: PATH_ROOMS[room].spawn.x, y: PATH_ROOMS[room].spawn.y },
    assignment: 'follow',
    lumoRoom: room,
    lantern: { lanternOn: false },
    said: [], saved: 0, sent: [], recalled: 0,
    pendingStoryBeats: [], queuedFlags: new Set(), route: [], routeIndex: 0,
    canStartStory: () => true,
    travelling: false,
    power: {},
    ...extra,
  };
  Object.defineProperty(scene, 'lanternOn', { get() { return this.lantern.lanternOn; } });
  scene.say = (lines, onComplete) => { scene.said.push(lines); onComplete?.(); };
  scene.save = () => { scene.saved += 1; };
  scene.isTravelling = () => scene.travelling;
  // Lumo holds a seal only while he is the assignment and the scene says he is on it (a departure changes the assignment).
  scene.hasPower = (mark) => scene.assignment === mark && scene.power[mark] === true;
  scene.lumo = { sprite: { x: 0, y: 0, setPosition(x, y) { this.x = x; this.y = y; } }, update() {}, setVisible() {} };
  scene.persistRoute = () => {};
  scene.buildAssignmentRoute = () => [];
  scene.isDoorOpen = compile('isDoorOpen', ['mark'], {});
  scene.queueStoryBeat = compile('queueStoryBeat', ['lines', 'onComplete', 'guard', 'onStale'], {});
  scene.flushPendingStoryBeat = compile('flushPendingStoryBeat', [], {});
  scene.queueFlagBeat = compile('queueFlagBeat', ['flag', 'lines', 'guard'], {});
  scene.leavesUnlatchedSeal = compile('leavesUnlatchedSeal', [], {});
  scene.replyToRequest = compile('replyToRequest', ['leaving', 'lines'], {
    LEAVE_UNLATCHED_WARNING: constant('LEAVE_UNLATCHED_WARNING'), DOOR_SHUT_LINE: constant('DOOR_SHUT_LINE'), PATH_DOOR_FACES,
  });
  scene.send = compile('send', ['mark'], {
    SEND_LINES: constant('SEND_LINES'), SEND_UNSEEN_C: constant('SEND_UNSEEN_C'), LATCHED_CALL_LINES: constant('LATCHED_CALL_LINES'),
  });
  return scene;
}
const saidText = (scene) => scene.said.flat().map((line) => line.text).join(' | ');

dialogueCase('a_request_speaks_the_request_and_is_not_an_arrival', () => {
  const scene = makeScene('entry', {});
  scene.send('b');
  assert.equal(show(scene.said[0]), show(constant('SEND_LINES').b), 'the hall request for `··` is the v2 line');
  assert.notEqual(scene.progress.flags['l4-at-b'], true, 'a request never writes an arrival');
  assert.equal(scene.progress.flags['l4-called-b'], true, 'it records that B was called');
});

dialogueCase('the_c_request_before_the_trail_is_seen_promises_nothing_about_the_trail', () => {
  const unseen = makeScene('relay', {});
  unseen.send('c');
  assert.equal(show(unseen.said[0]), show(constant('SEND_UNSEEN_C')), 'an unseen trail gets the neutral request');
  assert.equal(CONTROLLER_SOURCE.includes('Tôi sẽ theo những vạch trên nền.'), true, 'the trail promise is still shipped for the seen case');
  const seen = makeScene('relay', { 'l4-ink-revealed': true });
  seen.send('c');
  assert.equal(show(seen.said[0]), show(constant('SEND_LINES').c), 'a seen trail gets the v2 request that follows it');
});

dialogueCase('the_first_leave_from_an_unlatched_seal_warns_then_the_door_shuts_behind_nhinh', () => {
  // Scenario v2 Bẫy 1: Lumo on plate A (unlatched) while Nhinh asks for `··` from the hall.
  const scene = makeScene('entry', { 'l4-called-a': true }, { assignment: 'a', power: { a: true }, lumoRoom: 'entry' });
  scene.send('b');
  assert.equal(show(scene.said[0]), show(constant('LEAVE_UNLATCHED_WARNING')), 'the first leave is warned, in place of the request line');
  assert.equal(scene.progress.flags['l4-leave-warned'], true, 'and the warning is recorded once spoken');
  assert.equal(scene.said.length, 2, 'the door-shut line is queued behind it');
  assert.equal(show(scene.said[1]), show(constant('DOOR_SHUT_LINE')), 'and it waits for the door to shut');
  // Second departure: the normal request, no second warning.
  const again = makeScene('entry', { 'l4-called-a': true, 'l4-leave-warned': true }, { assignment: 'a', power: { a: true }, lumoRoom: 'entry' });
  again.send('b');
  assert.equal(show(again.said[0]), show(constant('SEND_LINES').b), 'later departures use the ordinary request');
});

dialogueCase('a_latched_door_never_triggers_the_leave_warning', () => {
  const scene = makeScene('entry', { 'l4-latch-a': true }, { assignment: 'a', power: { a: true }, lumoRoom: 'entry' });
  assert.equal(scene.leavesUnlatchedSeal(), undefined, 'a latched seal is not an unlatched departure');
  scene.send('b');
  assert.equal(scene.progress.flags['l4-leave-warned'], undefined, 'and no warning is recorded');
});

dialogueCase('the_pipe_echo_speaks_only_when_lumo_reaches_a_seal_in_another_room', () => {
  const echo = compile('completeRoute', ['room'], { PRACTICE_ARRIVAL: constant('PRACTICE_ARRIVAL'), ECHO_LINES: constant('ECHO_LINES') });
  // Nhinh in the hall, Lumo reaches `··` in the relay: the echo plays with the seal still held.
  const away = makeScene('entry', {}, { assignment: 'b', power: { b: true }, lumoRoom: 'relay' });
  away.completeRoute = echo;
  away.completeRoute('relay');
  assert.equal(show(away.said[0]), show(constant('ECHO_LINES').b), 'the `··` echo is the v2 detour line');
  // Nhinh in the same room: Lumo arrives without a line.
  const here = makeScene('relay', {}, { assignment: 'b', power: { b: true }, lumoRoom: 'relay' });
  here.completeRoute = echo;
  here.completeRoute('relay');
  assert.equal(here.said.length, 0, 'the same room needs no echo');
  // The `···` echo is the far-trail line, and it waits if Nhinh walks into the room meanwhile.
  const late = makeScene('entry', {}, { assignment: 'c', power: { c: true }, lumoRoom: 'ink' });
  late.completeRoute = echo;
  late.completeRoute('ink');
  assert.equal(show(late.said[0]), show(constant('ECHO_LINES').c), 'the `···` echo is the far-away line');
  const stale = makeScene('ink', {}, { assignment: 'c', power: { c: true }, lumoRoom: 'ink' });
  stale.completeRoute = echo;
  stale.completeRoute('ink');
  assert.equal(stale.said.length, 0, 'an echo is never spoken from the room the seal is in');
});

dialogueCase('the_relay_seal_is_read_lit_first_then_dark_and_the_book_comparison_needs_both_layers', () => {
  const observe = compile('updateObservations', [], {
    RELAY_LIT_LINES: constant('RELAY_LIT_LINES'), RELAY_LIT_BOOK_LINE: constant('RELAY_LIT_BOOK_LINE'),
    RELAY_DARK_LINES: constant('RELAY_DARK_LINES'), INK_LIT_LINES: constant('INK_LIT_LINES'),
    DARK_LINES: constant('DARK_LINES'), RELIT_LINES: constant('RELIT_LINES'), BECKON_LINES: constant('BECKON_LINES'),
  });
  const lit = makeScene('relay', {});
  lit.lantern.lanternOn = true;
  lit.updateObservations = observe;
  lit.updateObservations();
  assert.equal(show(lit.said[0]), 'Nhinh: Trên ấn kia có vệt gì đó, nhưng mờ quá.', 'the first lit look names the faint seal');
  assert.equal(lit.said.length, 1, 'without both book layers only the first line plays');
  const bothBooks = makeScene('relay', { 'l2-book-lit': true, 'l2-book-dark': true });
  bothBooks.lantern.lanternOn = true;
  bothBooks.updateObservations = observe;
  bothBooks.updateObservations();
  assert.equal(bothBooks.said[0].length, 2, 'with both book layers the comparison line follows');
  assert.equal(show(bothBooks.said[0]).includes('trang sách trong thư viện'), true, 'and it is the library comparison');
  const dark = makeScene('relay', { 'l4-relay-lit-said': true });
  dark.updateObservations = observe;
  dark.updateObservations();
  assert.equal(show(dark.said[0]), show(constant('RELAY_DARK_LINES')), 'in the dark the seal reads as two dots');
  dark.updateObservations();
  assert.equal(dark.said.length, 1, 'and the line is said once');
});

dialogueCase('the_corridor_trail_is_seen_in_the_dark_and_relit_only_after_that', () => {
  const observe = compile('updateObservations', [], {
    RELAY_LIT_LINES: constant('RELAY_LIT_LINES'), RELAY_LIT_BOOK_LINE: constant('RELAY_LIT_BOOK_LINE'),
    RELAY_DARK_LINES: constant('RELAY_DARK_LINES'), INK_LIT_LINES: constant('INK_LIT_LINES'),
    DARK_LINES: constant('DARK_LINES'), RELIT_LINES: constant('RELIT_LINES'), BECKON_LINES: constant('BECKON_LINES'),
  });
  const scene = makeScene('ink', {});
  scene.updateObservations = observe;
  scene.lantern.lanternOn = true;
  scene.updateObservations();
  assert.equal(show(scene.said[0]), show(constant('INK_LIT_LINES')), 'the first corridor look, lamp on, is the faint trail');
  assert.equal(scene.progress.flags['l4-ink-revealed'], undefined, 'and the trail is not revealed by a lit look');
  scene.lantern.lanternOn = false;
  scene.updateObservations();
  assert.equal(scene.progress.flags['l4-ink-revealed'], true, 'the lamp-off look reveals the trail');
  assert.equal(show(scene.said[1]), show(constant('DARK_LINES')), 'and names the three dots and the stroke toward the pipe');
  scene.lantern.lanternOn = true;
  scene.updateObservations();
  assert.equal(show(scene.said[2]), show(constant('RELIT_LINES')), 'relighting after the trail was seen gets the relit line');
});

dialogueCase('the_chalk_firefly_is_read_once_in_the_dark_in_view_of_the_wall', () => {
  const chalk = compile('updateChalk', [], { PATH_CHALK_VIEW, rectsOverlap, pathActorBody, CHALK_LINES: constant('CHALK_LINES') });
  const inView = makeScene('relay', {}, { player: { x: 400, y: 226 } });
  inView.updateChalk = chalk;
  inView.lantern.lanternOn = false;
  inView.updateChalk();
  assert.equal(inView.progress.flags['l4-chalk-seen'], true, 'standing in view in the dark sets the v2 flag');
  assert.equal(show(inView.said[0]), show(constant('CHALK_LINES')), 'and speaks the two lines');
  inView.updateChalk();
  assert.equal(inView.said.length, 1, 'once only');
  const lit = makeScene('relay', {}, { player: { x: 400, y: 226 } });
  lit.updateChalk = chalk;
  lit.lantern.lanternOn = true;
  lit.updateChalk();
  assert.equal(lit.progress.flags['l4-chalk-seen'], undefined, 'with the lamp on the chalk is not there to see');
  const away = makeScene('relay', {}, { player: { x: 200, y: 226 } });
  away.updateChalk = chalk;
  away.updateChalk();
  assert.equal(away.progress.flags['l4-chalk-seen'], undefined, 'and it is not seen from the far end of the hall');
});

dialogueCase('the_exit_latch_says_only_whether_lumo_is_on_its_seal', () => {
  const block = compile('latchCBlockReason', [], { STILL_TRAVELLING: constant('STILL_TRAVELLING'), LATCH_SHUT_LINE: constant('LATCH_SHUT_LINE') });
  const shut = makeScene('ink', { 'l4-latch-b': true }, { assignment: 'c', lumoRoom: 'relay' });
  shut.latchCBlockReason = block;
  assert.deepEqual(shut.latchCBlockReason(), constant('LATCH_SHUT_LINE'), 'with Lumo away the exit names only the shut door');
  const travelling = makeScene('ink', { 'l4-latch-b': true }, { assignment: 'c', travelling: true, lumoRoom: 'relay' });
  travelling.latchCBlockReason = block;
  assert.deepEqual(travelling.latchCBlockReason(), constant('STILL_TRAVELLING'), 'on the way it says he is still travelling');
  const ready = makeScene('ink', { 'l4-latch-b': true }, { assignment: 'c', power: { c: true }, lumoRoom: 'ink' });
  ready.latchCBlockReason = block;
  assert.equal(ready.latchCBlockReason(), undefined, 'with Lumo on the seal the handle may latch');
});

dialogueCase('the_h_ladder_is_one_stage_per_row_of_the_v2_table', () => {
  const stage = compile('hintStageKey', [], {});
  const at = (room, flags) => stage.call(makeScene(room, flags));
  assert.equal(at('entry', {}), 'hall', 'the hall row');
  assert.equal(at('relay', {}), 'relay-open', 'the relay row before A is latched');
  assert.equal(at('relay', { 'l4-latch-a': true }), 'relay-latched', 'the relay row after A is latched');
  assert.equal(at('ink', { 'l4-latch-b': true }), 'ink-latched', 'the ink row after B is latched');
  assert.equal(at('ink', {}), 'ink-open', 'the ink row before B is latched');
  assert.equal(at('ink', { 'l4-latch-b': true, 'l4-latch-c': true }), 'exit', 'the exit row once C is latched');
});

dialogueCase('the_status_line_states_lumo_and_the_latches_and_nothing_else', () => {
  // The v2 status line (§6): `Lumo: giữ ấn ·· · Chốt: · ✓  ·· —  ··· —`, composed from the shipped method.
  const status = compile('getStatusText', [], { tr: IDENTITY_TR, sealGlyph: functionDecl('sealGlyph') });
  const holding = makeScene('relay', { 'l4-latch-a': true }, { assignment: 'b', power: { b: true }, lumoRoom: 'relay' });
  holding.getStatusText = status;
  assert.equal(holding.getStatusText(), 'Lumo: giữ ấn ·· · Chốt: · ✓  ·· —  ··· —', 'Lumo on plate B, A latched, B and C not');
  const flying = makeScene('ink', {}, { assignment: 'c', travelling: true, lumoRoom: 'relay' });
  flying.getStatusText = status;
  assert.equal(flying.getStatusText(), 'Lumo: đang bay · Chốt: · —  ·· —  ··· —', 'Lumo in flight, nothing latched');
  const withNhinh = makeScene('entry', {});
  withNhinh.getStatusText = status;
  assert.equal(withNhinh.getStatusText(), 'Lumo: đi cùng Nhinh · Chốt: · —  ·· —  ··· —', 'Lumo with Nhinh');
});

console.log(`\nlevel 05 dialogue cases: ${count - failures.length}/${count} passed`);
if (failures.length) {
  console.log(`failed: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('Level 05 approved-dialogue checks passed.');
