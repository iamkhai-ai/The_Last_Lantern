import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as libraryLayout from '../src/data/libraryLayout.ts';
import * as forestDecor from '../src/data/forestDecor.ts';
import * as libraryInkFade from '../src/levels/libraryInkFade.ts';
import * as soundSystem from '../src/systems/SoundSystem.ts';

/**
 * Level 03 approved-dialogue regression: every string below is copied from
 * docs/scenario/03-library-beneath-the-roots-dialogue-approved.md. The test drives the shipped
 * methods so it fails if production copy, ordering or observation gates drift from the approved text.
 */
const root = new URL('../', import.meta.url);
const source = readFileSync(new URL('src/levels/LibraryLevel.ts', root), 'utf8');
const output = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  reportDiagnostics: true,
});
const errors = (output.diagnostics ?? []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
assert.equal(errors.length, 0, 'LibraryLevel.ts transpiles without syntax errors');
const moduleRecord = { exports: {} };
const requireStub = (specifier) => {
  if (specifier === 'phaser') return { GameObjects: { Image: class Image {}, Text: class Text {} }, BlendModes: { ADD: 'ADD' } };
  if (specifier === '../art/CampaignArt') return { getLevelArtKey: (_level, filename) => filename };
  if (specifier === '../data/libraryLayout') return libraryLayout;
  if (specifier === '../data/forestDecor') return forestDecor;
  if (specifier === './libraryInkFade') return libraryInkFade;
  if (specifier === '../systems/SoundSystem') return soundSystem;
  throw new Error(`unexpected runtime import in LibraryLevel.ts: ${specifier}`);
};
new Function('exports', 'require', 'module', output.outputText)(moduleRecord.exports, requireStub, moduleRecord);
const { LibraryLevel } = moduleRecord.exports;

const INSCRIPTION = '“Mặt trời lên, ngày bắt đầu. Mặt trời lặn, đêm nối tiếp. Hãy đưa bốn thời khắc trở lại vòng ngày đêm.”';
const BOOK_LIT = 'Một bông hoa màu vàng. Những cánh hoa đều khép lại.';
const BOOK_DARK = 'Có hình trăng lưỡi liềm bằng mực xanh trên trang giấy.';
const CLUES = {
  bird: { lit: 'Mặt trời ở sát đường chân trời, ngay trên mặt nước.', dark: 'Một mũi tên hướng lên, vượt qua đường chân trời.' },
  leaf: { lit: 'Mặt trời ở trên cao. Đường cung quanh nó còn thiếu một đoạn.', dark: 'Đường cung vươn tới đỉnh. Nhưng không thấy mặt trời hay mặt trăng.' },
  boat: { lit: 'Mặt trời ở sát đường chân trời, ngay trên mặt nước.', dark: 'Một mũi tên hướng xuống, qua đường chân trời.' },
  seed: { lit: 'Mặt trăng ở trên cao. Đường cung quanh nó còn thiếu một đoạn.', dark: 'Đường cung vươn tới đỉnh. Nhưng không thấy mặt trời hay mặt trăng.' },
};
const RACKS = { boat: 0, bird: 1, seed: 2, leaf: 3 };

function createLevel(initialFlags = {}, lanternOn = true) {
  const registered = [];
  const calls = [];
  const toasts = [];
  const progress = { flags: { ...initialFlags }, counters: {} };
  const level = new LibraryLevel({
    scene: {}, progress, player: { x: 0, y: 0 },
    interactions: { register: (config) => registered.push(config), clear() {} },
    lantern: { lanternOn },
    save() {},
    say: (lines, done) => calls.push({ lines, done }),
    nextLevel: (lines) => calls.push({ next: lines }),
  });
  level.redrawTabletStacks = () => {};
  level.updateVisualState = () => {};
  level.flashGlow = () => {};
  level.showToast = (message) => toasts.push(message);
  level.registerInteractions();
  return { level, progress, registered, calls, toasts };
}

const control = (registered, id) => {
  const found = registered.find((item) => item.id === id);
  assert.ok(found, `LibraryLevel registers ${id}`);
  return found;
};
const rack = (registered, stone) => registered.find((item) => item.id === `library-rack-${RACKS[stone]}`);
const said = (call) => call.lines.map((line) => [line.speaker, line.text]);
const lastSaid = (calls) => said(calls.at(-1));
const lastText = (calls) => calls.at(-1).lines.map((line) => line.text).join('\n');

// 1. Entry: exact approved lines, approved inscription in the presentation channel, no removed event.
{
  const { level, calls, progress } = createLevel();
  level.startOpeningDialogue();
  assert.deepEqual(lastSaid(calls), [
    ['Nhinh', 'Rễ cây ôm cả những giá sách…'],
    ['Lumo', 'Mùi giấy này… Tôi vẫn còn nhớ.'],
    ['Nhinh', 'Còn bốn phiến đá kia? Trông chúng vừa với những hốc quanh giếng.'],
    ['Lumo', 'Trên bệ có chữ. Cậu đọc thử xem.'],
    ['Hệ thống', INSCRIPTION],
    ['Nhinh', 'Bốn phiến đá, bốn thời khắc… Có lẽ mình phải xếp chúng lại.'],
    ['Lumo', 'Có cuốn sách đang mở trên bàn kia. Biết đâu nó chỉ cách đọc những hình này.'],
  ]);
  assert.equal(progress.flags['l2-inscription-read'], true, 'the entrance reading records the inscription');
  assert.equal(source.includes('cơn chấn động'), false, 'the removed opening event is gone');
}

// 2. The plaque reads the same approved inscription.
{
  const { registered, calls } = createLevel();
  control(registered, 'library-inscription').onInteract();
  assert.deepEqual(lastSaid(calls), [['Hệ thống', INSCRIPTION]]);
}

// 3. Book: current-light observation, then the one-time both-layers exchange, lit first.
{
  const { level, calls, progress } = createLevel();
  level.readBook();
  assert.deepEqual(lastSaid(calls), [['Nhinh', BOOK_LIT]]);
  level.lantern.lanternOn = false;
  level.readBook();
  assert.deepEqual(lastSaid(calls), [
    ['Nhinh', BOOK_DARK],
    ['Nhinh', 'Vẫn trang giấy ấy, mà bật đèn với tắt đèn lại thấy hai hình khác nhau.'],
    ['Lumo', 'Có những nét chỉ hiện ra trong bóng tối.'],
    ['Nhinh', 'Mình thử xem những phiến đá kia có giống vậy không.'],
  ]);
  assert.equal(progress.flags['l2-book-practice'], true);
  level.readBook();
  assert.deepEqual(lastSaid(calls), [['Nhinh', BOOK_DARK]], 'a re-read repeats only the observation');
}

// 4. Book: dark first must reach the same exchange exactly once.
{
  const { level, calls, progress } = createLevel({}, false);
  level.readBook();
  assert.deepEqual(lastSaid(calls), [['Nhinh', BOOK_DARK]]);
  level.lantern.lanternOn = true;
  level.readBook();
  assert.deepEqual(lastSaid(calls), [
    ['Nhinh', BOOK_LIT],
    ['Nhinh', 'Vẫn trang giấy ấy, mà bật đèn với tắt đèn lại thấy hai hình khác nhau.'],
    ['Lumo', 'Có những nét chỉ hiện ra trong bóng tối.'],
    ['Nhinh', 'Mình thử xem những phiến đá kia có giống vậy không.'],
  ]);
  assert.equal(progress.flags['l2-book-practice'], true);
  level.readBook();
  assert.equal(calls.at(-1).lines.length, 1, 'the exchange never replays');
}

// 5. All eight tablet observations, exact approved copy; pair remarks wait for both layers of both tablets.
{
  const { level, registered, calls, toasts } = createLevel();
  const read = (stone, lanternOn) => {
    level.lantern.lanternOn = lanternOn;
    rack(registered, stone).onInteract();
    return calls.at(-1).lines;
  };
  for (const stone of ['bird', 'leaf', 'boat', 'seed']) {
    const lines = read(stone, true);
    assert.equal(lines[0].text, CLUES[stone].lit, `lit ${stone} uses the approved description verbatim`);
    assert.equal(lines.length, 1, `lit ${stone} alone adds no pair remark`);
  }
  const birdDark = read('bird', false);
  assert.deepEqual(birdDark.map((line) => line.text), [CLUES.bird.dark], 'one dark layer is not a pair');
  assert.deepEqual(read('leaf', false).map((line) => line.text), [CLUES.leaf.dark]);
  const boatDark = read('boat', false);
  assert.deepEqual(boatDark.map((line) => line.text), [
    CLUES.boat.dark,
    'Thảo nào hai hình trông giống nhau. Một bên mặt trời đang lên, một bên lại đang lặn.',
    'Nếu cứ để đèn sáng thì mình đã bỏ sót những mũi tên rồi.',
  ], 'the horizon pair speaks only after both layers of both tablets');
  const seedDark = read('seed', false);
  assert.deepEqual(seedDark.map((line) => line.text), [
    CLUES.seed.dark,
    'Khi tắt đèn, hai đường cung này giống hệt nhau.',
    'Nhưng dưới ánh đèn, một phiến là mặt trời, một phiến là mặt trăng.',
    'Mình đã xem đủ cả hai lớp rồi. Giờ thử xếp chúng lại xem.',
  ], 'the arc pair and all-layers remark follow the final observations');
  assert.equal(progressFlagsPair(level), true);

  // Character speech never carries key instructions.
  for (const call of calls) {
    for (const line of call.lines) {
      assert.doesNotMatch(line.text, /Nhấn [FE]|E ở/, `"${line.text}" keeps key steps out of character speech`);
    }
  }
  // A re-read repeats only the clue and never the pair remark.
  level.lantern.lanternOn = false;
  rack(registered, 'bird').onInteract();
  assert.doesNotMatch(lastText(calls), /Thảo nào|Khi tắt đèn|Mình đã xem đủ/);
  assert.equal(toasts.length, 0, 'reading tablets shows no toast');
}

function progressFlagsPair(level) {
  return level.progress.flags['l2-horizon-pair-read'] === true
    && level.progress.flags['l2-arc-pair-read'] === true
    && level.progress.flags['l2-clues-ready'] === true;
}

// 6. The other observation order for both pairs.
{
  const { level, registered, calls } = createLevel();
  level.lantern.lanternOn = false;
  for (const stone of ['boat', 'bird']) rack(registered, stone).onInteract();
  level.lantern.lanternOn = true;
  rack(registered, 'boat').onInteract();
  assert.doesNotMatch(lastText(calls), /Thảo nào/, 'one lit horizon tablet alone is not enough');
  rack(registered, 'bird').onInteract();
  assert.equal(calls.at(-1).lines.at(-1).text, 'Nếu cứ để đèn sáng thì mình đã bỏ sót những mũi tên rồi.');

  level.lantern.lanternOn = false;
  for (const stone of ['seed', 'leaf']) rack(registered, stone).onInteract();
  level.lantern.lanternOn = true;
  rack(registered, 'seed').onInteract();
  assert.doesNotMatch(lastText(calls), /Khi tắt đèn/, 'one lit arc tablet alone is not enough');
  rack(registered, 'leaf').onInteract();
  const arcTail = calls.at(-1).lines.map((line) => line.text);
  assert.deepEqual(arcTail.slice(-3, -1), [
    'Khi tắt đèn, hai đường cung này giống hệt nhau.',
    'Nhưng dưới ánh đèn, một phiến là mặt trời, một phiến là mặt trăng.',
  ], 'the arc pair also speaks when the dark layers are observed first');
  assert.equal(arcTail.at(-1), 'Mình đã xem đủ cả hai lớp rồi. Giờ thử xếp chúng lại xem.');
}

// 7. Check feedback: approved short notice, three wrong-arrangement variants, approved solve.
{
  const { registered, calls, toasts } = createLevel({ 'memory-slots-json': '[-1,-1,-1,-1]' });
  control(registered, 'library-confirm').onInteract();
  assert.deepEqual(toasts, ['Vẫn còn hốc trống. Hãy đặt đủ bốn phiến trước khi kiểm tra.']);
  assert.equal(calls.length, 0, 'missing seats are a toast, not a dialogue');
}
{
  const { registered, calls } = createLevel({ 'memory-slots-json': '[0,1,3,2]' });
  control(registered, 'library-confirm').onInteract();
  assert.deepEqual(lastSaid(calls), [
    ['Nhinh', 'Chưa được rồi. Có chỗ nào đó không khớp.'],
    ['Lumo', 'Mình xem lại từng phiến nhé. Nhớ cả hình dưới ánh đèn lẫn những nét hiện trong bóng tối.'],
  ]);
}
{
  const { registered, calls } = createLevel({ 'memory-slots-json': '[1,2,3,0]' });
  control(registered, 'library-confirm').onInteract();
  assert.deepEqual(lastSaid(calls), [
    ['Nhinh', 'Các thời khắc đã nối đúng nhau, nhưng mình bắt đầu nhầm chỗ rồi.'],
    ['Lumo', 'Hốc có dấu mặt trời phải là lúc một ngày vừa bắt đầu.'],
  ]);
}
{
  const { registered, calls } = createLevel({ 'memory-slots-json': '[0,3,2,1]' });
  control(registered, 'library-confirm').onInteract();
  assert.deepEqual(lastSaid(calls), [
    ['Nhinh', 'Mình đang đi ngược những mũi tên quanh giếng. Thử đổi chiều xem.'],
  ]);
}
{
  const { registered, calls, progress } = createLevel({ 'memory-slots-json': '[0,1,2,3]' });
  control(registered, 'library-confirm').onInteract();
  assert.deepEqual(lastSaid(calls), [
    ['Nhinh', 'Bình minh, ban ngày, hoàng hôn… rồi đêm.'],
    ['Lumo', 'Tôi đã quên khu rừng từng đổi màu đẹp thế nào.'],
  ]);
  assert.equal(progress.flags['l2-memory'], true);
}

// 8. Crystal: exact approved conversation; the plan state is recorded.
{
  const { registered, calls, progress } = createLevel({ 'l2-memory': true, 'memory-slots-json': '[0,1,2,3]' });
  control(registered, 'library-crystal').onInteract();
  assert.deepEqual(lastSaid(calls), [
    ['Nhinh', 'Viên tinh thể này vẫn còn sáng.'],
    ['Lumo', 'Ký Ức… Tôi nhớ ra rồi! Đây là một mảnh trái tim Cây Mẹ.'],
    ['Nhinh', 'Trái tim của cây đã vỡ sao?'],
    ['Lumo', 'Ừ. Có ba mảnh: Ký Ức, Hy Vọng và Cân Bằng. Những cái tên ấy được khắc trên rễ cây.'],
    ['Nhinh', 'Nếu mang đủ ba mảnh về, Cây Mẹ có hồi phục được không?'],
    ['Lumo', 'Tôi tin là được. Chúng ta sẽ thắp sáng lại trái tim nó. Khu rừng sẽ hồi sinh.'],
    ['Nhinh', 'Vậy mình thử nhé. Tôi cũng muốn thấy nơi này lúc trời sáng.'],
    ['Nhinh', 'Mảnh này để tôi giữ. Mình cùng tìm hai mảnh còn lại.'],
  ]);
  assert.equal(progress.flags['l2-crystal'], true);
  assert.equal(progress.flags['l2-plan-recorded'], true);
}

// 9. Mural: exact first reading, completion gate, approved re-read line.
{
  const { level, registered, calls, progress } = createLevel({ 'l2-crystal': true });
  control(registered, 'library-mural').onInteract();
  assert.deepEqual(lastSaid(calls), [
    ['Nhinh', 'Người này đang giữ một bánh xe có hình mặt trời.'],
    ['Nhinh', 'Trời đã đầy sao mà mặt trời vẫn chưa lặn…'],
    ['Lumo', '…'],
    ['Nhinh', 'Cậu sao thế, Lumo?'],
    ['Lumo', 'Tôi chợt nhớ tiếng mưa. Và có ai đó nói… đừng để đèn tắt.'],
    ['Nhinh', 'Chiếc đèn này cũng có lời nhắn phải giữ ánh sáng.'],
    ['Lumo', 'Có thể có liên quan. Nhưng tôi không nhớ người nói là ai.'],
    ['Nhinh', 'Mình ghi lại đã. Cậu không cần cố nhớ ngay đâu.'],
  ]);
  assert.equal(progress.flags['l2-fifth-viewed'], undefined, 'the mural is not marked read before its lines finish');
  calls.at(-1).done();
  assert.equal(progress.flags['l2-fifth-viewed'], true);
  control(registered, 'library-mural').onInteract();
  assert.deepEqual(lastSaid(calls), [['Nhinh', 'Những đường nứt chạy từ bánh xe về phía Cây Mẹ.']]);
  assert.equal(source.includes('Vết nứt bắt đầu từ lúc vòng ngày đêm dừng lại.'), false,
    'the old mural conclusion is gone');
}

// 10. Exit: exact approved departure conversation, plus the approved side lines at the closed gate.
{
  const { level, progress, calls } = createLevel();
  level.useExit();
  assert.deepEqual(lastSaid(calls), [['Nhinh', 'Cổng đá vẫn đóng. Có lẽ phải khôi phục vòng ngày đêm ở giữa phòng trước.']]);
  progress.flags['l2-memory'] = true;
  level.useExit();
  assert.deepEqual(lastSaid(calls), [['Nhinh', 'Viên tinh thể vẫn còn trên bệ. Mình mang theo đã.']],
    'the gate points back to the crystal before it is taken');
  progress.flags['l2-crystal'] = true;
  level.useExit();
  // Playtest decision 2026-10-20: the gate opens the moment the crystal is taken. The fifth painting is
  // optional story, so the old "mural unread" closed-gate line ('Vách rễ vừa mở ra một bức tranh nữa. Mình
  // chưa xem nó.') is no longer reachable at the gate; the departure conversation plays instead.
  assert.ok(Array.isArray(calls.at(-1).next) && calls.at(-1).next.length > 0,
    'with the crystal taken the gate opens straight away, even before the mural is read');
}
{
  const { level, calls } = createLevel({ 'l2-crystal': true, 'l2-fifth-viewed': true });
  level.useExit();
  assert.deepEqual(calls.at(-1).next.map((line) => [line.speaker, line.text]), [
    ['Lumo', 'Lối này dẫn ra suối. Dòng nước từng chảy tới tận rễ Cây Mẹ.'],
    ['Nhinh', 'Còn hai mảnh tinh thể thì sao?'],
    ['Lumo', 'Tôi nhớ có một ngọn tháp ở cuối dòng. Có lẽ mình nên tới đó tìm.'],
    ['Nhinh', 'Vậy trước hết mình phải tìm đường qua suối.'],
  ]);
}

// 11. Journal copies stay in sync with the approved inscription and observations.
{
  const { level, calls } = createLevel({
    'l2-inscription-read': true, 'l2-book-lit': true, 'l2-book-dark': true,
    'l2-bird-lit': true, 'l2-bird-dark': true, 'l2-seed-dark': true, 'l2-fifth-viewed': true,
  });
  level.showJournal();
  const recorded = lastText(calls);
  assert.ok(recorded.includes(`Dòng khắc: ${INSCRIPTION}`), 'journal keeps the approved inscription');
  assert.ok(recorded.includes(`Trang sách · Đèn bật: ${BOOK_LIT}`));
  assert.ok(recorded.includes(`Trang sách · Đèn tắt: ${BOOK_DARK}`));
  assert.ok(recorded.includes(`Chim · Đèn bật: ${CLUES.bird.lit}`));
  assert.ok(recorded.includes(`Hạt · Đèn tắt: ${CLUES.seed.dark}`), 'the journal also keeps the seed dark clue');
  assert.ok(recorded.includes('Những đường nứt chạy từ bánh xe về phía Cây Mẹ.'));
  assert.doesNotMatch(recorded, /Vết nứt bắt đầu|Bình minh|Ban ngày|Hoàng hôn|Ban đêm/,
    'the journal states no inferred time label before the solve');
}

console.log('Level 03 approved-dialogue checks passed.');
