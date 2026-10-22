const IDENTITY_TR = (text, params) => (params ? text.replace(/\{(\w+)\}/g, (match, key) => (key in params ? String(params[key]) : match)) : text);
/**
 * Approved dialogue for campaign levels 01–02 (docs/scenario/01…, 02…).
 *
 * The scene imports Phaser, so this check pulls the authored literals and the two shipped
 * dialogue methods out of `CampaignScene.ts` with the TypeScript compiler API, exactly like
 * `check-path-for-two.mjs` does. It asserts the approved text verbatim, the one-time/re-read
 * conditions around it, and the two-card pagination of the four-line poem.
 *
 * Red/green evidence: set DIALOGUE_SCENE_FILE to an older revision of the scene and the same
 * assertions fail on the old copy.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { activateWoodsRune } from '../src/data/whisperingWoodsLayout.ts';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const sceneFile = process.env.DIALOGUE_SCENE_FILE || join(rootDir, 'src/scenes/CampaignScene.ts');
const source = readFileSync(sceneFile, 'utf8');
const ast = ts.createSourceFile(sceneFile, source, ts.ScriptTarget.Latest, true);

const nodeText = (node) => node.getText(node.getSourceFile());
function walk(node, visit) { visit(node); node.forEachChild((child) => walk(child, visit)); }
function findNode(predicate) {
  let found = null;
  walk(ast, (node) => { if (!found && predicate(node)) found = node; });
  return found;
}
function variableInitializer(name) {
  const declaration = findNode((node) => ts.isVariableDeclaration(node) && nodeText(node.name) === name);
  assert.ok(declaration?.initializer, `CampaignScene still authors ${name}`);
  return declaration.initializer;
}
/** The observatory story constants CampaignScene spreads into its authored arrays (src/data/observatoryStory.ts). */
const STORY = (() => {
  const js = ts.transpileModule(readFileSync(join(rootDir, 'src/data/observatoryStory.ts'), 'utf8'),
    { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  new Function('module', 'exports', js)(module, module.exports);
  return module.exports;
})();
/** Evaluate a literal initializer whose only dependencies are the observatory story constants. */
function evaluate(node) {
  const js = ts.transpileModule(`const __value = (${nodeText(node)});`,
    { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
  const scope = { ...STORY, tr: IDENTITY_TR };
  return new Function(...Object.keys(scope), `"use strict";\n${js}\nreturn __value;`)(...Object.values(scope));
}
function methodBody(name) {
  const method = findNode((node) => ts.isMethodDeclaration(node) && nodeText(node.name) === name);
  assert.ok(method?.body, `CampaignScene still declares ${name}()`);
  return nodeText(method.body);
}
function compileMethod(name, parameters = [], symbols = {}) {
  symbols = { tr: IDENTITY_TR, ...symbols };
  const names = Object.keys(symbols);
  const js = ts.transpileModule(`const __unit = function (${parameters.join(', ')}) {\n${methodBody(name)}\n};`,
    { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
  return new Function(...names, `"use strict";\n${js}\nreturn __unit;`)(...names.map((key) => symbols[key]));
}
/** The first authored dialogue array whose text contains `marker` (say or nextLevel). */
function saidLines(marker) {
  let found = null;
  walk(ast, (node) => {
    if (found || !ts.isArrayLiteralExpression(node)) return;
    let value;
    try { value = evaluate(node); } catch { return; }
    if (!Array.isArray(value) || !value.every((line) => line && typeof line.speaker === 'string' && typeof line.text === 'string')) return;
    if (value.some((line) => line.text.includes(marker))) found = value;
  });
  assert.ok(found, `CampaignScene still authors the dialogue containing "${marker}"`);
  return found;
}
const texts = (lines) => lines.map((line) => line.text);
const speakers = (lines) => lines.map((line) => line.speaker);
function assertLines(marker, expected) {
  const lines = saidLines(marker);
  assert.deepEqual(lines.map((line) => ({ speaker: line.speaker, text: line.text })), expected);
  return lines;
}

const failures = [];
let count = 0;
function check(name, run) {
  count += 1;
  try { run(); console.log(`PASS  ${name}`); }
  catch (error) { failures.push(name); console.log(`FAIL  ${name}`); for (const line of String(error.message).split('\n')) console.log(`        ${line}`); }
}

/* -------------------------------------------------------------- *
 * Level 01 — Rìa Rừng Quên Lãng
 * -------------------------------------------------------------- */

const OPENING = evaluate(variableInitializer('OPENING'));

check('level 01 wake-up has no amnesia line', () => {
  assert.deepEqual(OPENING[0], [
    { speaker: 'Nhinh', text: 'Trời vẫn chưa sáng sao?' },
    { speaker: 'Nhinh', text: 'Sương vẫn dày quá… Không biết con đường về làng nằm ở phía nào.' },
  ]);
  for (const banned of ['Mình nhớ con đường vào rừng', 'mất trí nhớ', 'Còn đoạn sau thì mờ quá']) {
    assert.equal(source.includes(banned), false, `CampaignScene no longer says "${banned}"`);
  }
});

check('level 01 first meeting is the approved thirteen-line scene, played once', () => {
  const meeting = saidLines('Này! Ở đây!');
  assert.deepEqual(meeting, [
    { speaker: 'Lumo', text: 'Này! Ở đây!' },
    { speaker: 'Nhinh', text: 'Ai vừa nói đấy?' },
    { speaker: 'Lumo', text: 'Cạnh chiếc đèn này! Tôi là Lumo.' },
    { speaker: 'Nhinh', text: 'Một con đom đóm… biết nói?' },
    { speaker: 'Lumo', text: 'Còn cậu? Sao lại ngủ ở đây?' },
    { speaker: 'Nhinh', text: 'Tôi là Nhinh. Tôi bị lạc. Cậu có biết đường ra khỏi rừng không?' },
    { speaker: 'Lumo', text: 'Đây là Elaria. Tôi từng biết các lối ở đây, nhưng giờ chẳng nhớ rõ nữa.' },
    { speaker: 'Nhinh', text: 'Tôi định chờ trời sáng rồi tìm đường. Mà chờ mãi…' },
    { speaker: 'Lumo', text: 'Ở đây đã lâu không có bình minh rồi.' },
    { speaker: 'Nhinh', text: 'Không có bình minh? Vậy cứ ngồi đợi cũng chẳng ích gì.' },
    { speaker: 'Lumo', text: 'Tôi còn nhớ Cây Mẹ, ở sâu trong rừng. Có lẽ tới đó, tôi sẽ nhớ thêm được điều gì.' },
    { speaker: 'Nhinh', text: 'Vậy mình tới đó thử xem. Cậu đi cùng tôi nhé?' },
    { speaker: 'Lumo', text: 'Tất nhiên rồi! Nhưng mang chiếc đèn này theo nhé. Trong rừng tối lắm.' },
  ]);
  assert.equal(source.split('Này! Ở đây!').length - 1, 1, 'the first meeting is authored once, never replayed from an object read');
  assert.equal(source.includes('l0-lumo-met') && source.includes('!this.progress.flags[\'l0-lumo-met\']'), true,
    'the meeting still fires only while l0-lumo-met is unset');
});

check('level 01 lantern pickup keeps the approved inscription', () => {
  assertLines('Trên quai có khắc một dòng chữ…', [
    { speaker: 'Nhinh', text: 'Trên quai có khắc một dòng chữ…' },
    { speaker: 'Nhinh', text: 'Hãy giữ ánh sáng cho đến khi mọi người trở về.' },
    { speaker: 'Nhinh', text: 'Không biết ai đã để nó lại đây.' },
    { speaker: 'Lumo', text: 'Tôi cũng không nhớ… Cậu thử thắp lên xem. Có khi nó vẫn còn dùng được.' },
  ]);
});

check('level 01 re-reading the lantern gives only the approved spare line', () => {
  assertLines('Quai đèn đã mòn nhẵn', [
    { speaker: 'Nhinh', text: 'Quai đèn đã mòn nhẵn. Chắc trước đây có người mang nó bên mình suốt.' },
  ]);
});

check('level 01 tablet is unreadable unlit and teaches Pulse on the first lit read', () => {
  assertLines('Có chữ trên bia, nhưng tối quá', [
    { speaker: 'Nhinh', text: 'Có chữ trên bia, nhưng tối quá. Mình không đọc được.' },
    { speaker: 'Lumo', text: 'Thử soi đèn vào xem.' },
  ]);
  const body = methodBody('registerLevel');
  const firstRead = body.slice(body.indexOf('this.say(firstRead'));
  assert.ok(firstRead.length > 0, 'the tablet still branches on the first read');
  assert.match(firstRead, /Nhìn kìa\. Những nét khắc đang sáng lên![\s\S]*text: inscription[\s\S]*Dấu chân dưới lớp sương… Nhưng quanh đây có thấy gì đâu\.[\s\S]*Ánh đèn chưa tới được đó\. Cậu thử phát một xung sáng xem\./,
    'the first lit read plays the four approved lines in order');
  assert.match(firstRead, /: \[\{ speaker: 'Nhinh', text: inscription \}\]/,
    'a re-read still gives only the inscription, not the first-read exchange');
});

check('level 01 footprints use the approved discovery lines', () => {
  assertLines('Có dấu chân thật!', [
    { speaker: 'Nhinh', text: 'Có dấu chân thật! Chúng dẫn về phía cổng.' },
    { speaker: 'Lumo', text: 'Có lẽ trước đây người ta cũng đi lối này.' },
    { speaker: 'Nhinh', text: 'Mình theo thử xem.' },
  ]);
  assert.equal(source.includes('Và họ để lại đường cho chúng ta'), false, 'the old “they left us a path” claim is gone');
});

check('level 01 gate keeps the approved closed/ring/open/exit states', () => {
  assertLines('Cổng đóng rồi. Không thấy ổ khóa đâu cả.', [
    { speaker: 'Nhinh', text: 'Cổng đóng rồi. Không thấy ổ khóa đâu cả.' },
    { speaker: 'Lumo', text: 'Cậu nhìn con mắt đá trên kia xem. Nó hướng về vòng đá dưới đất.' },
    { speaker: 'Nhinh', text: 'Có lẽ mình phải đứng ở đó?' },
  ]);
  assertLines('Cậu thử thắp đèn lên nhé.', [
    { speaker: 'Lumo', text: 'Cậu thử thắp đèn lên nhé. Từ chỗ đó, ánh sáng có thể chiếu tới mắt đá.' },
  ]);
  assertLines('Mắt đá sáng lên… Cổng mở rồi!', [
    { speaker: 'Nhinh', text: 'Mắt đá sáng lên… Cổng mở rồi!' },
    { speaker: 'Lumo', text: 'Tôi biết mà! Ánh sáng vẫn đánh thức được những thứ trong khu rừng này.' },
  ]);
  assertLines('Đàn đom đóm đang bay sâu vào rừng.', [
    { speaker: 'Nhinh', text: 'Đàn đom đóm đang bay sâu vào rừng.' },
    { speaker: 'Lumo', text: 'Tôi nhớ chúng vẫn thường đi lối này.' },
    { speaker: 'Nhinh', text: 'Vậy mình theo chúng nhé. Cậu đi cạnh tôi được không?' },
    { speaker: 'Lumo', text: 'Được chứ. Tôi ở ngay đây.' },
  ]);
});

/* -------------------------------------------------------------- *
 * Level 02 — Rừng Đom Đóm
 * -------------------------------------------------------------- */

check('level 02 opening is the approved six-line arrival', () => {
  assert.deepEqual(OPENING[1], [
    { speaker: 'Nhinh', text: 'Chúng cứ bay quanh những tấm bia kia.' },
    { speaker: 'Lumo', text: 'Tôi nhớ đã từng thấy chúng bay như thế…' },
    { speaker: 'Nhinh', text: 'Ở chỗ này sao?' },
    { speaker: 'Lumo', text: 'Ừ. Hình như hồi đó còn có tiếng trẻ con cười.' },
    { speaker: 'Nhinh', text: 'Bây giờ yên ắng quá.' },
    { speaker: 'Lumo', text: 'Ừ… Kia có một mẩu bia bên lối vào. Mình tới xem nhé?' },
  ]);
  assert.match(methodBody('buildLevel'), /this\.dialogue\.startDialogue\(OPENING\[level\]\)/,
    'level 02 plays the approved opening without appending an instruction line');
  assert.equal(source.includes('Mẩu thơ ngay trước mặt. Đọc bằng E nhé.'), false, 'the old appended instruction line is gone');
  assert.equal(source.includes('Đom đóm vẫn đi đúng đường cũ.'), false, 'the old opening is gone');
});

check('level 02 poem is the approved four five-word lines, two per card', () => {
  const poem = evaluate(variableInitializer('poemLines'));
  assert.equal(poem.length, 2, 'the poem is paginated across two dialogue cards');
  assert.deepEqual(speakers(poem), ['Hệ thống', 'Hệ thống']);
  const lines = poem.flatMap((card) => card.text.split('\n'));
  assert.deepEqual(lines, [
    'Trăng soi qua kẽ lá,',
    'Lá gọi sao về đây.',
    'Sao canh rừng yên giấc,',
    'Chờ nắng mai vén mây.',
  ]);
  for (const line of lines) assert.equal(line.trim().split(/\s+/).length, 5, `“${line}” is a five-word line`);
  for (const card of poem) assert.equal(card.text.split('\n').length, 2, 'each card holds exactly two lines');
  assert.equal(source.includes('Trăng đặt giọt bạc lên lá.'), false, 'the old poem is gone');
});

check('level 02 poem re-read and journal keep both two-line cards', () => {
  const journal = {
    progress: { level: 1, flags: { 'l1-poem-read': true } },
    said: [],
    say(lines) { this.said = lines; },
  };
  journal.showRuneJournal = compileMethod('showRuneJournal');
  journal.showRuneJournal();
  const poemCards = journal.said.filter((line) => line.speaker === 'Hệ thống');
  assert.deepEqual(texts(poemCards), ['Trăng soi qua kẽ lá,\nLá gọi sao về đây.', 'Sao canh rừng yên giấc,\nChờ nắng mai vén mây.']);
  assert.ok(journal.said.every((line) => !line.text.includes('Trăng soi qua kẽ lá,\nLá gọi sao về đây.\nSao canh'), 'the journal never puts all four lines in one card'));
  assert.match(methodBody('registerLevel'), /first \? \[\.\.\.poemLines,/, 'a re-read plays only the two poem cards');
});

check('level 02 poem read adds the approved hypothesis, not key instructions', () => {
  const body = methodBody('registerLevel');
  assert.match(body, /first \? \[\.\.\.poemLines,[\s\S]*Trăng, lá, sao… Không biết có liên quan đến những tấm bia kia không\.[\s\S]*Mình thử soi chúng xem\. Chiếc đèn đã giúp cậu tìm thấy dấu chân mà\./,
    'the first read adds the approved two-line hypothesis after the poem cards');
  assert.equal(body.includes('Dùng SPACE gần bia'), false, 'the key instructions stay out of character dialogue');
  assert.equal(body.includes('chạm bia sáng bằng E'), false, 'the key instructions stay out of character dialogue');
});

check('level 02 approved key instruction lives in the existing Hệ thống hint channel', () => {
  const instruction = 'Đứng gần bia và nhấn SPACE để soi ký hiệu. Khi ký hiệu còn sáng, nhấn E để kích hoạt.';
  assert.ok(source.includes(instruction), 'the approved instruction is present verbatim');
  const hintBody = methodBody('showHint');
  assert.ok(hintBody.includes(instruction), 'the instruction is spoken by showHint (H), not by a character');
  assert.match(hintBody, /this\.say\(\[\{speaker:'Hệ thống',text:message\}\]\)/,
    'the named H channel still speaks as Hệ thống');
});

check('level 02 gate, rune and wrong-order copy is the approved copy', () => {
  assertLines('Rễ cây quấn kín cả lối xuống rồi.', [
    { speaker: 'Nhinh', text: 'Rễ cây quấn kín cả lối xuống rồi.' },
    { speaker: 'Lumo', text: 'Ở cổng ngoài, chiếc đèn đã mở được đường. Có lẽ những tấm bia ở đây cũng cần ánh sáng.' },
  ]);
  assertLines('Nét khắc mờ quá.', [
    { speaker: 'Nhinh', text: 'Nét khắc mờ quá. Mình thử soi lại bằng xung sáng xem.' },
  ]);
  assertLines('Bia không sáng lên…', [
    { speaker: 'Nhinh', text: 'Bia không sáng lên…' },
    { speaker: 'Lumo', text: 'Mình thử nhìn xem đàn đom đóm bắt đầu từ đâu nhé.' },
  ]);
  assertLines('Những bia vừa sáng đều tắt rồi.', [
    { speaker: 'Nhinh', text: 'Những bia vừa sáng đều tắt rồi.' },
    { speaker: 'Lumo', text: 'Không sao. Mình thử lại từ đầu. Đàn đom đóm vẫn đang chỉ đường.' },
  ]);
  const runeBody = methodBody('activateRune');
  assert.match(runeBody, /result\.kind==='wrong'[\s\S]*Bia không sáng lên/, 'a wrong first pick has its own response');
  assert.match(runeBody, /result\.kind==='reset'[\s\S]*Những bia vừa sáng đều tắt rồi/, 'a wrong pick after progress has a different response');
  assert.equal(source.includes('Mình đã làm đứt chuỗi.'), false, 'the old premature “broke the chain” line is gone');
});

check('level 02 correct-rune steps and re-read/re-open states are approved', () => {
  assertLines('Bia vẫn sáng, dù xung sáng đã tan rồi!', [
    { speaker: 'Nhinh', text: 'Bia vẫn sáng, dù xung sáng đã tan rồi!' },
    { speaker: 'Lumo', text: 'Nhìn đàn đom đóm kìa. Chúng đang bay sang tấm tiếp theo.' },
  ]);
  assertLines('Nhìn kìa! Rễ cây trên cổng đang nới ra!', [
    { speaker: 'Lumo', text: 'Nhìn kìa! Rễ cây trên cổng đang nới ra!' },
  ]);
  assertLines('Bia này vẫn sáng. Mình xem tấm tiếp theo thôi.', [
    { speaker: 'Nhinh', text: 'Bia này vẫn sáng. Mình xem tấm tiếp theo thôi.' },
  ]);
  assertLines('Chúng vẫn sáng. Cổng cũng không đóng lại nữa.', [
    { speaker: 'Nhinh', text: 'Chúng vẫn sáng. Cổng cũng không đóng lại nữa.' },
  ]);
});

check('level 02 gate exit hands over with the approved five lines', () => {
  assertLines('Có bậc thang dưới những rễ cây này.', [
    { speaker: 'Nhinh', text: 'Có bậc thang dưới những rễ cây này.' },
    { speaker: 'Lumo', text: 'Thư viện… Đúng rồi, dưới này có một thư viện!' },
    { speaker: 'Nhinh', text: 'Cậu nhớ ra rồi à?' },
    { speaker: 'Lumo', text: 'Một chút. Người Elaria từng lưu lại chuyện của khu rừng ở đó.' },
    { speaker: 'Nhinh', text: 'Biết đâu có gì giúp mình tìm đường. Mình xuống xem nhé?' },
  ]);
});

check('level 02 memory is the approved one-time eight-line scene', () => {
  const memory = saidLines('Mai mình lại ra đây chơi nhé?');
  assert.deepEqual(memory, [
    { speaker: 'Đứa trẻ trong ký ức', text: 'Mai mình lại ra đây chơi nhé?' },
    { speaker: 'Người lớn trong ký ức', text: 'Ừ. Đợi mặt trời lên nhé. Giờ về thôi, để rừng ngủ.' },
    { speaker: 'Nhinh', text: 'Lumo… Cậu cũng nhìn thấy chứ?' },
    { speaker: 'Lumo', text: 'Ừ. Đã lâu rồi tôi không nghe tiếng cười ở đây.' },
    { speaker: 'Nhinh', text: 'Cậu biết những người đó à?' },
    { speaker: 'Lumo', text: 'Tôi không nhớ. Nhưng giọng nói ấy… quen lắm.' },
    { speaker: 'Nhinh', text: 'Không sao. Nếu nhớ thêm điều gì, cậu cứ kể tôi nghe nhé.' },
    { speaker: 'Lumo', text: 'Ừ. Tôi sẽ kể.' },
  ]);
  assert.match(methodBody('activateRune'), /l1-memory-seen'\] !== true[\s\S]*l1-memory-seen'\]=true; this\.save\(\); this\.showWoodsMemory\(\)/,
    'the memory is marked seen before it plays, so the third rune cannot replay it');
});

check('level 02 wrong-first and wrong-after-progress are different runtime branches', () => {
  const empty = { sequence: 0, activated: { moon: false, leaf: false, star: false }, open: false };
  assert.equal(activateWoodsRune(empty, 'star').kind, 'wrong', 'choosing Star with no progress is the wrong-first branch');
  const partial = { sequence: 1, activated: { moon: true, leaf: false, star: false }, open: false };
  assert.equal(activateWoodsRune(partial, 'star').kind, 'reset', 'choosing Star after Moon is the reset branch');
  const browser = readFileSync(join(rootDir, 'scripts/level02-browser.cjs'), 'utf8');
  assert.match(browser, /Những bia vừa sáng đều tắt rồi\.[^\n]*wrong pick after progress/,
    'the browser step after Moon is correct asserts the approved reset variant');
  assert.match(browser, /Bia không sáng lên…[^\n]*wrong-first pick uses its own response/,
    'a separate seq0 Star interaction asserts the approved wrong-first variant');
});

check('level 02 keeps the Moon → Leaf → Star order and grants no crystal here', () => {
  assert.equal(source.includes("canActivateWoodsRune"), true, 'rune activation still uses the shipped reveal/gate helper');
  assert.equal(source.includes('RUNE_ORDER'), true, 'the three-rune order still comes from RUNE_ORDER');
  assert.equal(texts(saidLines('Nhìn kìa! Rễ cây trên cổng đang nới ra!')).some((text) => /tinh thể/i.test(text)), false,
    'no crystal reward is spoken when the woods gate opens');
});

console.log(`\n${count - failures.length}/${count} dialogue checks passed`);
if (failures.length) {
  console.log(`FAILED: ${failures.join(', ')}`);
  process.exitCode = 1;
}
