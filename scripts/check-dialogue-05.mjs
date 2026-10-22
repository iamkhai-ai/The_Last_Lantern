import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { choosePathCallAction, getPathExitBlock, hasDoorPower, isActuallyReunited, pathActorBody, PATH_INK_CORRIDOR, PATH_ROOMS, rectsOverlap } from '../src/data/pathForTwoLayout.ts';

/**
 * Level 05 approved-dialogue regression.
 *
 * Source of truth: docs/scenario/05-a-path-for-two-dialogue-approved.md. This check binds the
 * *shipped* PathForTwoLevel method bodies (the same TypeScript-API extraction used by
 * check-path-for-two.mjs) and asserts two things separately:
 *   1. the copy is verbatim, and
 *   2. a line is only spoken when its local truth condition holds at playback time.
 *
 * It is deliberately narrower than check-path-for-two.mjs: geometry, interaction faces and save
 * restoration stay covered there.
 */
const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTROLLER_FILE = join(rootDir, 'src/levels/PathForTwoLevel.ts');
const CONTROLLER_SOURCE = readFileSync(CONTROLLER_FILE, 'utf8');
const APPROVED_DOC = readFileSync(join(rootDir, 'docs/scenario/05-a-path-for-two-dialogue-approved.md'), 'utf8');
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
  assert.ok(method, `PathForTwoLevel still declares ${name}()`);
  assert.ok(method.body, `${name}() still has a body`);
  return nodeText(method.body);
}
function constant(name) {
  const declaration = findNode(controllerAst, (node) => ts.isVariableDeclaration(node) && nodeText(node.name) === name);
  assert.ok(declaration?.initializer, `PathForTwoLevel still authors ${name}`);
  const js = ts.transpileModule(`const __value = (${nodeText(declaration.initializer)});`,
    { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
  return new Function(`"use strict";\n${js}\nreturn __value;`)();
}
const IDENTITY_TR = (text, params) => (params ? text.replace(/\{(\w+)\}/g, (match, key) => (key in params ? String(params[key]) : match)) : text);

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
 * Approved copy — one literal list per approved beat
 * ------------------------------------------------------------------ */
const INTRO = [
  { speaker: 'Nhinh', text: 'Cửa đóng rồi. Phía này không có tay mở.' },
  { speaker: 'Lumo', text: 'Có một đường ống nhỏ bên cạnh. Tôi chui qua được.' },
  { speaker: 'Nhinh', text: 'Dấu cạnh đường ống trông giống cánh của cậu.' },
  { speaker: 'Lumo', text: 'Để tôi đi theo đường này xem bên kia có gì nhé?' },
  { speaker: 'Nhinh', text: 'Ừ. Tôi chờ ở đây.' },
];
const ENDING = [
  { speaker: 'Nhinh', text: 'Nước đang bị hút lên tháp.' },
  { speaker: 'Lumo', text: 'Ngọn đèn trên đó vẫn sáng…' },
  { speaker: 'Nhinh', text: 'Mình lên xem có cách trả nước về suối không.' },
];
const MEMORY = [
  { speaker: 'Lumo', text: 'Vết xoắn kia… Tôi đã thấy nó rồi.' },
  { speaker: 'Nhinh', text: 'Trong đêm bão à?' },
  { speaker: 'Lumo', text: 'Ừ. Tôi đã bay qua đường ống này. Có người gọi bên ngoài, nhưng tôi không nhớ họ gọi tên ai.' },
  { speaker: 'Nhinh', text: 'Cậu có muốn nghỉ một lát không?' },
  { speaker: 'Lumo', text: 'Tôi sợ lát nữa lại quên mất.' },
  { speaker: 'Nhinh', text: 'Vậy tôi ghi lại ngay. Cậu nhớ thêm gì thì cứ nói, tôi sẽ chép.' },
  { speaker: 'Lumo', text: 'Ghi cả vết xoắn này nhé.' },
];
const SEND = {
  practice: [
    { speaker: 'Nhinh', text: 'Lumo, cậu tới dấu kia rồi chờ tôi một chút được không?' },
    { speaker: 'Lumo', text: 'Được. Tôi đi đây!' },
  ],
  a: [
    { speaker: 'Nhinh', text: 'Cậu tới dấu bên kia giúp tôi nhé. Tôi sẽ tìm cách giữ cửa mở.' },
    { speaker: 'Lumo', text: 'Được. Cậu cứ từ từ.' },
  ],
  b: [
    { speaker: 'Nhinh', text: 'Bên này còn một dấu nữa. Cậu tới đó giúp tôi nhé?' },
    { speaker: 'Lumo', text: 'Được. Tôi đi đây.' },
  ],
  c: [
    { speaker: 'Nhinh', text: 'Cậu tới đầu bên kia nhé. Tôi sẽ theo những vạch trên nền.' },
    { speaker: 'Lumo', text: 'Được. Tôi sẽ chờ cậu ở đó.' },
  ],
};
const PRACTICE_ARRIVAL = [
  { speaker: 'Lumo', text: 'Tôi tới rồi. Cửa có mở không?' },
  { speaker: 'Nhinh', text: 'Mở rồi! May mà cậu lọt qua được khe đó.' },
  { speaker: 'Lumo', text: 'Nhỏ cũng có ích chứ. Tôi chờ ở đây, cậu cứ đi đi.' },
];
const RECALL = [
  { speaker: 'Nhinh', text: 'Xong rồi, Lumo. Cậu trở lại đây nhé.' },
  { speaker: 'Lumo', text: 'Tôi về ngay.' },
];
const FINAL_RECALL = [
  { speaker: 'Nhinh', text: 'Cửa đã có chốt giữ rồi. Lumo, cậu về đây nhé.' },
  { speaker: 'Lumo', text: 'Tôi về ngay.' },
];
const RETURN = [
  { speaker: 'Lumo', text: 'Tôi về rồi.' },
  { speaker: 'Nhinh', text: 'Được rồi. Mình cùng lên nhé.' },
];
const LATCH_A = [
  { speaker: 'Nhinh', text: 'Chốt đã giữ cửa rồi. Cậu có thể rời dấu đó.' },
  { speaker: 'Lumo', text: 'Vậy tôi không phải đứng đây mãi nữa!' },
];
const LATCHED_CALL = [{ speaker: 'Lumo', text: 'Cửa này đã có chốt giữ rồi. Tôi không cần đứng ở dấu nữa.' }];
const FIRST_LIT = [
  { speaker: 'Nhinh', text: 'Trên nền có những vệt mực, nhưng mờ quá.' },
  { speaker: 'Lumo', text: 'Thử tắt đèn xem. Giống trang sách trong thư viện ấy.' },
  { speaker: 'Nhinh', text: 'Ừ. Có lẽ chúng chỉ đường qua hành lang.' },
];
const DARK = [{ speaker: 'Nhinh', text: 'Hiện rõ rồi! Những vạch này dẫn tới cuối hành lang.' }];
const RELIT = [{ speaker: 'Nhinh', text: 'Ánh đèn lại làm những vạch trên nền mờ đi rồi.' }];
const BECKON = [
  { speaker: 'Lumo', text: 'Ở đây, Nhinh! Cậu sắp tới rồi.' },
  { speaker: 'Nhinh', text: 'Thấy cậu rồi!' },
];
const NEXT_MARK_UNLATCHED = [{ speaker: 'Nhinh', text: 'Khoan đã. Tôi chưa gài chốt cửa này. Cậu chờ thêm một chút nhé.' }];
const STILL_TRAVELLING = [{ speaker: 'Nhinh', text: 'Lumo vẫn đang trên đường tới. Mình đợi cậu ấy một chút.' }];
const MARK_NOT_CALLED = [{ speaker: 'Nhinh', text: 'Có một dấu ở bên kia cửa. Mình thử nhờ Lumo tới đó xem.' }];
const INK_NOT_SEEN = [{ speaker: 'Nhinh', text: 'Những vệt trên nền còn mờ quá. Mình thử tắt đèn để xem chúng dẫn tới đâu.' }];
const TOWER_NEEDS_LUMO = [{ speaker: 'Nhinh', text: 'Mình chưa thể đi mà bỏ Lumo ở lại. Phải gọi cậu ấy về đã.' }];

/* ------------------------------------------------------------------ *
 * Scene stand-in
 * ------------------------------------------------------------------ */
function makeScene(room, flags, extra = {}) {
  const scene = {
    room,
    progress: { flags: { ...flags }, counters: {} },
    player: { x: PATH_ROOMS[room].spawn.x, y: PATH_ROOMS[room].spawn.y },
    assignment: 'follow',
    lumoRoom: room,
    lantern: { lanternOn: false },
    said: [],
    saved: 0,
    nextLevels: [],
    sent: [],
    recalled: 0,
    pendingStoryBeats: [],
    canStartStory: () => true,
    lastLantern: false,
    beckoningQueued: false,
    litObservationQueued: false,
    darkObservationQueued: false,
    relitQueued: false,
    reunionQueued: false,
    ...extra,
  };
  Object.defineProperty(scene, 'lanternOn', { get() { return this.lantern.lanternOn; } });
  scene.say = (lines, onComplete) => { scene.said.push(lines); onComplete?.(); };
  scene.save = () => { scene.saved += 1; };
  scene.nextLevel = (lines) => scene.nextLevels.push(lines);
  scene.isTravelling = () => false;
  scene.hasPower = (mark) => hasDoorPower(mark, {
    assignment: scene.assignment, lumoRoom: scene.lumoRoom, lumoX: scene.lumo.sprite.x, lumoY: scene.lumo.sprite.y,
  });
  scene.lumo = {
    sprite: {
      x: PATH_ROOMS[room].spawn.x - 22,
      y: PATH_ROOMS[room].spawn.y - 18,
      setPosition(x, y) { this.x = x; this.y = y; },
    },
    update() {},
    setVisible() {},
  };
  scene.persistRoute = () => {};
  scene.pipeRoute = () => [];
  scene.buildAssignmentRoute = () => [{ room, x: scene.player.x + 1, y: scene.player.y + 1 }];
  scene.isAtInkCorridor = compile('isAtInkCorridor', [], { PATH_INK_CORRIDOR, pathActorBody, rectsOverlap });
  scene.queueStoryBeat = compile('queueStoryBeat', ['lines', 'onComplete', 'guard', 'onStale'], {});
  scene.flushPendingStoryBeat = compile('flushPendingStoryBeat', [], {});
  scene.isActuallyReunited = compile('isActuallyReunited', [], { isActuallyReunited });
  return scene;
}
const saidText = (scene) => scene.said.flat().map((line) => line.text).join(' | ');

/* ------------------------------------------------------------------ *
 * Bindings used by the cases
 * ------------------------------------------------------------------ */
const CONSTANTS = () => ({
  INTRO: constant('INTRO'), ENDING: constant('ENDING'), MEMORY: constant('MEMORY'), SEND_LINES: constant('SEND_LINES'),
  PRACTICE_ARRIVAL: constant('PRACTICE_ARRIVAL'), RECALL_LINES: constant('RECALL_LINES'),
  FINAL_RECALL_LINES: constant('FINAL_RECALL_LINES'), RETURN_LINES: constant('RETURN_LINES'),
  LATCH_A_LINES: constant('LATCH_A_LINES'), LATCHED_CALL_LINES: constant('LATCHED_CALL_LINES'),
  FIRST_LIT_LINES: constant('FIRST_LIT_LINES'), DARK_LINES: constant('DARK_LINES'), RELIT_LINES: constant('RELIT_LINES'),
  BECKON_LINES: constant('BECKON_LINES'), NEXT_MARK_UNLATCHED: constant('NEXT_MARK_UNLATCHED'),
  STILL_TRAVELLING: constant('STILL_TRAVELLING'), MARK_NOT_CALLED: constant('MARK_NOT_CALLED'),
  INK_NOT_SEEN: constant('INK_NOT_SEEN'), TOWER_NEEDS_LUMO: constant('TOWER_NEEDS_LUMO'),
});
function bindSend(scene) {
  scene.send = compile('send', ['mark'], { SEND_LINES: constant('SEND_LINES'), LATCHED_CALL_LINES: constant('LATCHED_CALL_LINES') });
}
function bindRecall(scene) {
  scene.recallToCall = compile('recallToCall', ['id'], {
    RECALL_LINES: constant('RECALL_LINES'), FINAL_RECALL_LINES: constant('FINAL_RECALL_LINES'),
  });
}
function bindInk(scene) {
  scene.updateInkProgress = compile('updateInkProgress', [], {
    PATH_INK_CORRIDOR, pathActorBody, rectsOverlap, getLevelArtKey: () => null,
    FIRST_LIT_LINES: constant('FIRST_LIT_LINES'), DARK_LINES: constant('DARK_LINES'),
    RELIT_LINES: constant('RELIT_LINES'), BECKON_LINES: constant('BECKON_LINES'),
  });
}
function bindReunion(scene) {
  scene.updateReunion = compile('updateReunion', [], { RETURN_LINES: constant('RETURN_LINES') });
}
function bindInteract(scene) {
  scene.callMark = compile('callMark', ['id'], {});
  scene.callEligible = compile('callEligible', ['mark'], {});
  scene.latchCBlockReason = compile('latchCBlockReason', [], {
    INK_NOT_SEEN: constant('INK_NOT_SEEN'), MARK_NOT_CALLED: constant('MARK_NOT_CALLED'),
  });
  scene.interact = compile('interact', ['id'], {
    MEMORY: constant('MEMORY'), choosePathCallAction,
    LATCH_A_LINES: constant('LATCH_A_LINES'), NEXT_MARK_UNLATCHED: constant('NEXT_MARK_UNLATCHED'),
  });
  scene.send = (mark) => scene.sent.push(mark);
  scene.recallToCall = () => { scene.recalled += 1; };
}
function bindDoor(scene) {
  scene.useDoor = compile('useDoor', ['id'], {
    getPathExitBlock, getPathBackArrival: () => ({ x: 0, y: 0 }),
    STILL_TRAVELLING: constant('STILL_TRAVELLING'), MARK_NOT_CALLED: constant('MARK_NOT_CALLED'),
    TOWER_NEEDS_LUMO: constant('TOWER_NEEDS_LUMO'),
  });
}

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

/* ------------------------------------------------------------------ *
 * 1. Verbatim approved copy
 * ------------------------------------------------------------------ */
dialogueCase('approved_copy_is_verbatim', () => {
  assert.deepEqual(constant('INTRO'), INTRO, 'intro is the approved §1 copy');
  assert.deepEqual(constant('ENDING'), ENDING, 'tower-base copy is the approved §8 copy');
  assert.deepEqual(constant('MEMORY'), MEMORY, 'memory is the approved §5 copy');
  assert.deepEqual(constant('SEND_LINES'), SEND, 'every call request is the approved §2/§3/§4 copy');
  assert.deepEqual(constant('PRACTICE_ARRIVAL'), PRACTICE_ARRIVAL, 'practice arrival is the approved §2 copy');
  assert.deepEqual(constant('RECALL_LINES'), RECALL, 'recall is the approved §2 copy');
  assert.deepEqual(constant('FINAL_RECALL_LINES'), FINAL_RECALL, 'final recall is the approved §6 copy');
  assert.deepEqual(constant('RETURN_LINES'), RETURN, 'actual return is the approved §6 copy');
  assert.deepEqual(constant('LATCH_A_LINES'), LATCH_A, 'latch A uses the approved §3 copy');
  assert.deepEqual(constant('LATCHED_CALL_LINES'), LATCHED_CALL, 'a held mark uses the approved §7 copy');
  assert.deepEqual(constant('FIRST_LIT_LINES'), FIRST_LIT, 'first lit look uses the approved §4 copy');
  assert.deepEqual(constant('DARK_LINES'), DARK, 'dark observation uses the approved §4 copy');
  assert.deepEqual(constant('RELIT_LINES'), RELIT, 'relit look uses the approved §4 copy');
  assert.deepEqual(constant('BECKON_LINES'), BECKON, 'near-end beckon uses the approved §4 copy');
  assert.deepEqual(constant('NEXT_MARK_UNLATCHED'), NEXT_MARK_UNLATCHED, 'next-mark refusal uses the approved §7 copy');
  assert.deepEqual(constant('STILL_TRAVELLING'), STILL_TRAVELLING, 'not-yet-arrived feedback uses the approved §7 copy');
  assert.deepEqual(constant('MARK_NOT_CALLED'), MARK_NOT_CALLED, 'uncalled mark feedback uses the approved §7 copy');
  assert.deepEqual(constant('INK_NOT_SEEN'), INK_NOT_SEEN, 'unobserved ink feedback uses the approved §7 copy');
  assert.deepEqual(constant('TOWER_NEEDS_LUMO'), TOWER_NEEDS_LUMO, 'tower refusal uses the approved §7 copy');
  for (const retired of [
    'Đường vạch lại biến mất', 'Cửa không có tay mở', 'Cậu vừa chui qua đó thật à', 'Tháp vẫn đang lấy nước',
    'Tôi đã đi qua đây.', 'Mình nên giữ cửa A trước khi Lumo rời ấn.', 'Lần này cậu giữ đường cho tôi.',
    'Đường này đã giữ rồi.', 'Cửa thử chỉ mở khi Lumo đã tới ấn bên kia.', 'Cần Lumo ở ấn',
  ]) {
    assert.equal(CONTROLLER_SOURCE.includes(retired), false, `retired unapproved line is gone: ${retired}`);
  }
  // Independent of the lists above: every production line must occur verbatim inside the approved
  // document's curly quotes, so a paraphrased or invented line cannot pass by mirroring the test.
  const productionLines = [INTRO, ENDING, MEMORY, ...Object.values(SEND), PRACTICE_ARRIVAL, RECALL, FINAL_RECALL,
    RETURN, LATCH_A, LATCHED_CALL, FIRST_LIT, DARK, RELIT, BECKON, NEXT_MARK_UNLATCHED, STILL_TRAVELLING,
    MARK_NOT_CALLED, INK_NOT_SEEN, TOWER_NEEDS_LUMO].flat();
  for (const line of productionLines) {
    assert.ok(APPROVED_DOC.includes(`“${line.text}”`), `production line is verbatim in the approved doc: ${line.text}`);
  }
});

/* ------------------------------------------------------------------ *
 * 2. Request vs arrival vs reunion
 * ------------------------------------------------------------------ */
dialogueCase('a_call_is_a_request_not_an_arrival', () => {
  const scene = makeScene('entry', {});
  bindSend(scene);
  scene.send('a');
  assert.deepEqual(scene.said.at(-1), SEND.a, `the A call speaks the approved request (${saidText(scene)})`);
  assert.equal(scene.progress.flags['l4-at-a'], false, 'sending has not recorded an arrival');
  assert.equal(scene.progress.flags['l4-called-a'], true, 'the request is recorded');
  assert.equal(scene.progress.flags['l4-assignment'], 'a', 'Lumo is assigned to travel');
  assert.equal(/tới rồi|cửa có mở không/i.test(saidText(scene)), false, `the request never claims arrival (${saidText(scene)})`);
});

dialogueCase('practice_arrival_speech_waits_for_the_real_route_and_revalidates', () => {
  const scene = makeScene('entry', {});
  scene.assignment = 'practice';
  scene.lumoRoom = 'entry';
  scene.lumo.sprite.setPosition(212, 114); // the authored practice plate
  scene.completeRoute = compile('completeRoute', ['room'], { PRACTICE_ARRIVAL: constant('PRACTICE_ARRIVAL') });
  scene.completeRoute('entry');
  assert.equal(scene.progress.flags['l4-at-practice'], true, 'the shipped route completion records the real arrival');
  assert.deepEqual(scene.said.at(-1), PRACTICE_ARRIVAL, `the approved arrival beat follows the real arrival (${saidText(scene)})`);

  const stale = makeScene('entry', {});
  stale.canStartStory = () => false;
  stale.assignment = 'practice';
  stale.lumo.sprite.setPosition(212, 114);
  stale.completeRoute = compile('completeRoute', ['room'], { PRACTICE_ARRIVAL: constant('PRACTICE_ARRIVAL') });
  stale.completeRoute('entry');
  assert.equal(stale.pendingStoryBeats.length, 1, 'the arrival beat queues while the dialogue channel is busy');
  stale.assignment = 'follow'; // a recall before playback: the plate is no longer held
  stale.canStartStory = () => true;
  stale.flushPendingStoryBeat();
  assert.equal(stale.said.length, 0, `a stale arrival beat is dropped, not spoken (${saidText(stale)})`);
  assert.equal(stale.pendingStoryBeats.length, 0, 'the stale beat is removed');
});

dialogueCase('recall_is_not_the_reunion_and_reunion_needs_a_real_return', () => {
  const scene = makeScene('ink', { 'l4-latch-c': true }, { assignment: 'c' });
  scene.player.x = 500; scene.player.y = 250;
  scene.lumoRoom = 'ink';
  scene.lumo.sprite.setPosition(558, 244); // the C plate
  bindRecall(scene);
  const before = scene.said.length;
  scene.recallToCall('latch-c');
  assert.deepEqual(scene.said.at(-1), FINAL_RECALL, `the final recall speaks the approved request (${saidText(scene)})`);
  assert.equal(scene.progress.flags['l4-return-called'], true, 'the final recall is recorded');
  assert.equal(scene.progress.flags['l4-reunited'], false, 'initiating a recall is not yet a reunion');
  assert.equal(scene.said.slice(before).some((lines) => JSON.stringify(lines) === JSON.stringify(RETURN)), false,
    'the reunion beat is not played at recall initiation');

  // The shipped reunion predicate now reports a real same-room return; only then may §6 speak.
  scene.assignment = 'follow';
  scene.route = [];
  scene.routeIndex = 0;
  scene.lumo.sprite.setPosition(scene.player.x - 12, scene.player.y);
  bindReunion(scene);
  scene.updateReunion();
  assert.deepEqual(scene.said.at(-1), RETURN, `the real return speaks the approved reunion (${saidText(scene)})`);
  assert.equal(scene.progress.flags['l4-reunion-said'], true, 'the reunion speech is recorded once');

  const stale = makeScene('ink', { 'l4-return-called': true });
  stale.canStartStory = () => false;
  bindReunion(stale);
  stale.assignment = 'follow';
  stale.lumo.sprite.setPosition(stale.player.x - 12, stale.player.y);
  stale.updateReunion();
  assert.equal(stale.pendingStoryBeats.length, 1, 'the reunion beat queues while dialogue is busy');
  stale.lumo.sprite.setPosition(stale.player.x + 500, stale.player.y); // player walked away / recall state changed
  stale.canStartStory = () => true;
  stale.flushPendingStoryBeat();
  assert.equal(stale.said.length, 0, `a stale reunion beat is dropped (${saidText(stale)})`);
});

/* ------------------------------------------------------------------ *
 * 3. Ink observations: lit, dark, relit are distinct states
 * ------------------------------------------------------------------ */
const inkScene = (lampOn, flags = {}) => {
  const scene = makeScene('ink', flags);
  scene.lantern.lanternOn = lampOn;
  scene.player.x = 300; scene.player.y = 240; // standing on the authored corridor band
  bindInk(scene);
  return scene;
};

const BOOK_BOTH = { 'l2-book-lit': true, 'l2-book-dark': true };

dialogueCase('first_lit_observation_does_not_claim_a_previous_trail', () => {
  const scene = inkScene(true, BOOK_BOTH);
  scene.updateInkProgress();
  assert.deepEqual(scene.said.at(-1), FIRST_LIT, `the first lit look is the approved faint-marks line (${saidText(scene)})`);
  assert.equal(scene.progress.flags['l4-ink-revealed'], undefined, 'the dark trail is not recorded by the lit look');
  assert.equal(scene.progress.flags['l4-ink-observed-lit'], true, 'the lit observation is recorded only after playback');
  assert.equal(/biến mất|Ánh đèn lại/.test(saidText(scene)), false, `it never claims a vanished/relit trail (${saidText(scene)})`);
});

dialogueCase('first_lit_without_both_library_book_layers_speaks_only_the_factual_first_line', () => {
  // The Library exit only needs l2-crystal + l2-fifth-viewed, so a legal save can enter Level 05
  // without ever reading both book layers. The §4 Lumo analogy and Nhinh's "Ừ" reply would then
  // cite a library experience that never happened.
  for (const [name, flags] of [
    ['no book layers', {}],
    ['only the lit layer', { 'l2-book-lit': true }],
    ['only the dark layer', { 'l2-book-dark': true }],
  ]) {
    const scene = inkScene(true, flags);
    scene.updateInkProgress();
    assert.deepEqual(scene.said.at(-1), [FIRST_LIT[0]],
      `${name}: only the approved factual first Nhinh line is spoken (${saidText(scene)})`);
    assert.equal(scene.said.at(-1).length, 1, `${name}: no dangling "Ừ" reply is left behind`);
    assert.equal(saidText(scene).includes('Giống trang sách'), false,
      `${name}: the unsupported library analogy is not spoken`);
  }

  const both = inkScene(true, BOOK_BOTH);
  both.updateInkProgress();
  assert.deepEqual(both.said.at(-1), FIRST_LIT,
    `both real book layers still allow the full approved exchange (${saidText(both)})`);
});

dialogueCase('ink_observations_require_the_corridor_and_the_right_light', () => {
  const litOutside = makeScene('ink', {});
  litOutside.lantern.lanternOn = true;
  litOutside.player.x = 82; litOutside.player.y = 251; // outside the authored corridor
  bindInk(litOutside);
  litOutside.updateInkProgress();
  assert.equal(litOutside.said.length, 0, 'a lit look off the corridor is not an observation');

  const darkOutside = makeScene('ink', {});
  darkOutside.player.x = 82; darkOutside.player.y = 251;
  bindInk(darkOutside);
  darkOutside.updateInkProgress();
  assert.equal(darkOutside.progress.flags['l4-ink-revealed'], undefined, 'a dark look off the corridor does not reveal the trail');

  const litAtCorridor = inkScene(true);
  litAtCorridor.updateInkProgress();
  assert.equal(litAtCorridor.progress.flags['l4-ink-revealed'], undefined, 'lamp-on in the corridor still does not reveal the trail');

  const darkAtCorridor = inkScene(false);
  darkAtCorridor.updateInkProgress();
  assert.equal(darkAtCorridor.progress.flags['l4-ink-revealed'], true, 'the real dark corridor look records the trail');
  assert.deepEqual(darkAtCorridor.said.at(-1), DARK, `and speaks only the approved dark line (${saidText(darkAtCorridor)})`);
});

dialogueCase('relit_line_requires_an_actually_observed_dark_trail', () => {
  const neverDark = inkScene(true, { 'l4-ink-observed-lit': true });
  neverDark.updateInkProgress();
  assert.equal(neverDark.said.length, 0, 'lamps on before any dark observation never speak the relit line');

  const observed = inkScene(false);
  observed.updateInkProgress();
  observed.lantern.lanternOn = true;
  observed.updateInkProgress();
  assert.deepEqual(observed.said.at(-1), RELIT, `relighting after the dark observation speaks the approved line (${saidText(observed)})`);
  observed.updateInkProgress();
  assert.equal(observed.said.filter((lines) => JSON.stringify(lines) === JSON.stringify(RELIT)).length, 1,
    'the relit observation is spoken once');
});

dialogueCase('queued_lit_and_dark_beats_are_revalidated_at_playback', () => {
  const litThenDark = inkScene(true, BOOK_BOTH);
  litThenDark.canStartStory = () => false;
  litThenDark.updateInkProgress(); // first lit queues
  assert.equal(litThenDark.pendingStoryBeats.length, 1, 'the first lit beat is queued');
  litThenDark.lantern.lanternOn = false;
  litThenDark.updateInkProgress(); // real dark observation queues behind it
  assert.equal(litThenDark.progress.flags['l4-ink-revealed'], true, 'the dark observation is still recorded');
  litThenDark.canStartStory = () => true;
  litThenDark.flushPendingStoryBeat();
  assert.equal(litThenDark.said.some((lines) => JSON.stringify(lines) === JSON.stringify(FIRST_LIT)), false,
    `the stale lit beat is dropped rather than spoken after darkness (${saidText(litThenDark)})`);
  assert.equal(litThenDark.litObservationQueued, false, 'the dropped beat can be reconsidered later');
  litThenDark.flushPendingStoryBeat();
  assert.deepEqual(litThenDark.said.at(-1), DARK, `the still-true dark beat then speaks (${saidText(litThenDark)})`);

  const darkThenLit = inkScene(false);
  darkThenLit.canStartStory = () => false;
  darkThenLit.updateInkProgress();
  assert.equal(darkThenLit.pendingStoryBeats.length, 1, 'the dark beat is queued');
  darkThenLit.lantern.lanternOn = true;
  darkThenLit.canStartStory = () => true;
  darkThenLit.flushPendingStoryBeat();
  assert.equal(darkThenLit.said.some((lines) => JSON.stringify(lines) === JSON.stringify(DARK)), false,
    'a dark line is not spoken once the lamp is back on');
  darkThenLit.darkObservationQueued = false;
  darkThenLit.lantern.lanternOn = false;
  darkThenLit.updateInkProgress();
  assert.deepEqual(darkThenLit.said.at(-1), DARK, 'returning to darkness lets the still-true line speak');
});

dialogueCase('near_end_beckon_needs_lumo_actually_holding_C', () => {
  const scene = makeScene('ink', { 'l4-ink-revealed': true, 'l4-ink-dark-said': true }, { assignment: 'c' });
  scene.lantern.lanternOn = false;
  scene.player.x = 520; scene.player.y = 250;
  scene.lumoRoom = 'ink';
  scene.lumo.sprite.setPosition(558, 244);
  bindInk(scene);
  scene.updateInkProgress();
  assert.deepEqual(scene.said.at(-1), BECKON, `the near-end beckon follows the actual C arrival (${saidText(scene)})`);

  const stale = makeScene('ink', { 'l4-ink-revealed': true, 'l4-ink-dark-said': true }, { assignment: 'c' });
  stale.lantern.lanternOn = false;
  stale.player.x = 520; stale.player.y = 250;
  stale.lumoRoom = 'ink';
  stale.lumo.sprite.setPosition(558, 244);
  stale.canStartStory = () => false;
  bindInk(stale);
  stale.updateInkProgress();
  assert.equal(stale.pendingStoryBeats.length, 1, 'the beckon queues');
  stale.assignment = 'follow'; // recalled before playback
  stale.canStartStory = () => true;
  stale.flushPendingStoryBeat();
  assert.equal(stale.said.length, 0, `a beckon after a recall is dropped (${saidText(stale)})`);
  assert.equal(stale.beckoningQueued, false, 'the stale beckon does not block a later true one');
});

/* ------------------------------------------------------------------ *
 * 4. C-before-ink is legal; the unsupported premise is suppressed
 * ------------------------------------------------------------------ */
dialogueCase('c_before_ink_sends_without_the_unsupported_follow_the_lines_premise', () => {
  const scene = makeScene('ink', { 'l4-latch-b': true });
  bindSend(scene);
  scene.send('c');
  assert.equal(scene.progress.flags['l4-called-c'], true, 'calling C before the ink still records the legal request');
  assert.equal(scene.progress.flags['l4-assignment'], 'c', 'Lumo is still sent; no gameplay gate was added');
  assert.equal(scene.said.length, 0,
    'the approved §4 request is suppressed because its "theo những vạch" premise has not happened; the gap is reported');

  const seen = makeScene('ink', { 'l4-latch-b': true, 'l4-ink-revealed': true });
  bindSend(seen);
  seen.send('c');
  assert.deepEqual(seen.said.at(-1), SEND.c, `after the real observation the approved request is spoken (${saidText(seen)})`);
});

dialogueCase('ink_observation_is_not_a_requirement_for_C_or_the_exit_flow', () => {
  const scene = makeScene('ink', { 'l4-latch-b': true });
  const eligible = compile('callEligible', ['mark'], {});
  assert.equal(eligible.call(scene, 'c'), true, 'C is eligible after B without any ink flag');
  const blocked = getPathExitBlock({ latchC: false, memoRead: false, reunited: false });
  assert.equal(blocked, 'latch', 'the exit block order remains the shipped one');
});

/* ------------------------------------------------------------------ *
 * 5. Latch C memory, latch A copy, held-mark and door feedback
 * ------------------------------------------------------------------ */
dialogueCase('memory_is_spoken_at_the_latch_C_hold_not_at_reunion', () => {
  const scene = makeScene('ink', { 'l4-latch-b': true, 'l4-ink-revealed': true }, { assignment: 'c' });
  scene.lumoRoom = 'ink';
  scene.lumo.sprite.setPosition(558, 244);
  scene.interactionEnabled = () => true;
  bindInteract(scene);
  scene.interact('latch-c');
  assert.equal(scene.progress.flags['l4-latch-c'], true, 'the exit latch is still held by E at the latch');
  assert.deepEqual(scene.said.at(-1), MEMORY, `the approved memory plays at latch C (${saidText(scene)})`);
  assert.equal(scene.progress.flags['l4-memo'], true, 'the notebook clue is still written by the memory');
  assert.equal(scene.recalled, 0, 'the memory did not move to a recall beat');

  const reunion = makeScene('ink', { 'l4-return-called': true });
  reunion.assignment = 'follow';
  reunion.lumo.sprite.setPosition(reunion.player.x - 12, reunion.player.y);
  bindReunion(reunion);
  reunion.updateReunion();
  assert.deepEqual(reunion.said.at(-1), RETURN, 'reunion uses its own approved two-line beat');
  assert.equal(reunion.progress.flags['l4-memo'], undefined, 'reunion does not write or replay the latch-C memory');
});

dialogueCase('latch_C_missing_step_feedback_uses_approved_copy_where_it_exists', () => {
  const reason = compile('latchCBlockReason', [], {
    INK_NOT_SEEN: constant('INK_NOT_SEEN'), MARK_NOT_CALLED: constant('MARK_NOT_CALLED'),
  });
  const scene = makeScene('ink', { 'l4-latch-b': true });
  assert.equal(reason.call(scene), INK_NOT_SEEN[0].text,
    'a latch-C press before the dark observation uses the approved §7 line');
  scene.progress.flags['l4-ink-revealed'] = true;
  assert.equal(reason.call(scene), MARK_NOT_CALLED[0].text,
    'a latch-C press before C is called uses the approved §7 line');
  // No approved variant covers a totally absent B latch at this handle; the existing truthful
  // helper is retained and reported rather than replaced with invented copy.
  scene.progress.flags['l4-latch-b'] = false;
  assert.equal(reason.call(scene), 'Cửa B cần được gài trước.', 'the uncovered B-latch helper is retained');
});

dialogueCase('latch_and_mark_feedback_use_the_approved_lines', () => {
  const latchA = makeScene('relay', { 'l4-visited-relay': true }, { assignment: 'a' });
  latchA.lumoRoom = 'entry';
  latchA.lumo.sprite.setPosition(546, 114);
  latchA.interactionEnabled = () => true;
  bindInteract(latchA);
  latchA.interact('latch-a');
  assert.deepEqual(latchA.said.at(-1), LATCH_A, `latch A uses the approved first-door copy (${saidText(latchA)})`);
  assert.equal(latchA.progress.flags['l4-latch-a'], true, 'latch A is still recorded');

  const held = makeScene('entry', { 'l4-latch-a': true }, { player: { x: 384, y: 256 } });
  bindSend(held);
  held.send('a');
  assert.deepEqual(held.said.at(-1), LATCHED_CALL, `a held mark uses the approved §7 copy (${saidText(held)})`);

  const unlatched = makeScene('entry', {}, { player: { x: 384, y: 256 } });
  unlatched.interactionEnabled = () => true;
  bindInteract(unlatched);
  unlatched.interact('call-b');
  assert.deepEqual(unlatched.said.at(-1), NEXT_MARK_UNLATCHED, `next mark before A's latch uses the approved §7 copy (${saidText(unlatched)})`);
});

dialogueCase('door_feedback_is_truthful_about_travel_and_reunion_state', () => {
  const travelling = makeScene('entry', {}, { assignment: 'a' });
  travelling.isTravelling = () => true;
  travelling.doorEnabled = () => true;
  travelling.isDoorOpen = () => false;
  bindDoor(travelling);
  travelling.useDoor('a');
  assert.deepEqual(travelling.said.at(-1), STILL_TRAVELLING, `a door used while Lumo travels reports travel (${saidText(travelling)})`);

  const idle = makeScene('entry', {});
  idle.doorEnabled = () => true;
  idle.isDoorOpen = () => false;
  bindDoor(idle);
  idle.useDoor('a');
  assert.deepEqual(idle.said.at(-1), MARK_NOT_CALLED, `a door used before any call points at the mark (${saidText(idle)})`);

  const tower = makeScene('ink', { 'l4-latch-c': true, 'l4-memo': true });
  tower.doorEnabled = () => true;
  tower.isActuallyReunited = () => false;
  bindDoor(tower);
  tower.useDoor('c');
  assert.deepEqual(tower.said.at(-1), TOWER_NEEDS_LUMO, `the tower refuses while Lumo is away with the approved line (${saidText(tower)})`);
});

dialogueCase('ending_copy_is_the_shipped_exit_argument', () => {
  const scene = makeScene('ink', {});
  scene.getLumoPosition = () => ({ x: 320, y: 240 });
  scene.prepareLevelExit = compile('prepareLevelExit', [], { ENDING: constant('ENDING') });
  scene.prepareLevelExit();
  assert.deepEqual(scene.nextLevels, [ENDING], 'the level hands the approved §8 copy to the next level');
});

console.log(`\nlevel 05 dialogue cases: ${count - failures.length}/${count} passed`);
if (failures.length) {
  console.log(`failed: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('Level 05 approved-dialogue checks passed.');
