import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as libraryLayout from '../src/data/libraryLayout.ts';

const root = new URL('../', import.meta.url);
const source = readFileSync(new URL('src/levels/LibraryLevel.ts', root), 'utf8');
const output = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    esModuleInterop: true,
  },
  reportDiagnostics: true,
});
const errors = (output.diagnostics ?? []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
assert.equal(errors.length, 0, 'LibraryLevel.ts transpiles without syntax errors');

const moduleRecord = { exports: {} };
const requireStub = (specifier) => {
  if (specifier === 'phaser') return {};
  if (specifier === '../art/CampaignArt') return { getLevelArtKey: (_level, filename) => filename };
  if (specifier === '../data/libraryLayout') return libraryLayout;
  throw new Error(`unexpected runtime import in LibraryLevel.ts: ${specifier}`);
};
new Function('exports', 'require', 'module', output.outputText)(moduleRecord.exports, requireStub, moduleRecord);
const { LibraryLevel } = moduleRecord.exports;

function createLevel(initialFlags = {}, lanternOn = true) {
  const registered = [];
  const dialogue = [];
  const progress = { flags: { ...initialFlags }, counters: {} };
  const interactions = { register: (config) => registered.push(config), clear() {} };
  const level = new LibraryLevel({
    scene: {},
    progress,
    player: { x: 0, y: 0 },
    interactions,
    lantern: { lanternOn },
    save() {},
    say: (lines) => dialogue.push(lines),
    nextLevel() {},
  });
  // These visual effects are outside this guidance/state regression's scope.
  level.redrawTabletStacks = () => {};
  level.updateVisualState = () => {};
  level.registerInteractions();
  return { level, progress, registered, dialogue };
}

const textOf = (dialogueLines) => dialogueLines.map((line) => line.text).join('\n');
const findControl = (registered, id) => {
  const control = registered.find((item) => item.id === id);
  assert.ok(control, `LibraryLevel registers ${id}`);
  return control;
};

// The book teaches both ink layers and the complete rack / socket / confirmation path.
{
  const { level, progress, registered, dialogue } = createLevel();
  assert.match(findControl(registered, 'library-book').getPrompt(), /E.*lớp mực.*F đổi đèn/);
  level.readBook();
  assert.match(textOf(dialogue.at(-1)), /F đổi đèn.*E đọc lại trang/);
  level.lantern.lanternOn = false;
  level.readBook();
  const guidance = textOf(dialogue.at(-1));
  for (const phrase of ['Đèn bật', 'đèn tắt', 'E ở giá đá', 'đổi chỗ', 'chân trời sáng phía Bắc', 'chiều kim đồng hồ', 'bệ giữa', 'chủ động kiểm tra']) {
    assert.ok(guidance.includes(phrase), `book guidance explains ${phrase}`);
  }
  assert.equal(progress.flags['l2-book-practice'], true, 'safe-practice exchange triggers after both book layers');
  assert.equal(progress.flags['l2-bird-lit'], undefined, 'book demonstration does not consume a main puzzle tablet');
}

// H remains state-aware: stale readiness flags do not skip observations; only H tier 3 gives the map.
{
  const { level, progress, dialogue } = createLevel({ 'l2-book-practice': true, 'l2-clues-ready': true });
  level.showHint();
  assert.match(textOf(dialogue.at(-1)), /từng giá đá/,
    'stale l2-clues-ready does not skip the observation stage');
  level.showHint();
  assert.doesNotMatch(textOf(dialogue.at(-1)), /Bắc.*Chim.*Đông.*Lá.*Nam.*Thuyền.*Tây.*Hạt/);
  level.showHint();
  assert.match(textOf(dialogue.at(-1)), /Bắc \(trên\): Chim; Đông \(phải\): Lá; Nam \(dưới\): Thuyền; Tây \(trái\): Hạt/);

  for (const stone of ['bird', 'leaf', 'boat', 'seed']) {
    progress.flags[`l2-${stone}-lit`] = true;
    progress.flags[`l2-${stone}-dark`] = true;
  }
  assert.doesNotMatch(level.getObjectiveText(), /Bắc.*Chim.*Đông.*Lá.*Nam.*Thuyền.*Tây.*Hạt/,
    'objective does not auto-reveal the answer before solving');
  level.showHint();
  assert.doesNotMatch(textOf(dialogue.at(-1)), /Bắc.*Chim.*Đông.*Lá.*Nam.*Thuyền.*Tây.*Hạt/,
    'the arranged-stage answer remains behind its third hint');
  level.showHint();
  assert.doesNotMatch(textOf(dialogue.at(-1)), /Bắc.*Chim.*Đông.*Lá.*Nam.*Thuyền.*Tây.*Hạt/);
  level.showHint();
  assert.match(textOf(dialogue.at(-1)), /Bắc \(trên\): Chim; Đông \(phải\): Lá; Nam \(dưới\): Thuyền; Tây \(trái\): Hạt/);

  level.showJournal();
  assert.doesNotMatch(textOf(dialogue.at(-1)), /Bình minh|Ban ngày|Hoàng hôn|Ban đêm/,
    'journal keeps observed clues unlabeled until solve');
  progress.flags['l2-memory'] = true;
  level.showJournal();
  assert.match(textOf(dialogue.at(-1)), /Bình minh[\s\S]*Ban ngày[\s\S]*Hoàng hôn[\s\S]*Ban đêm/,
    'journal can associate time labels after solve');
}

// Shipped rack/seat callbacks allow a solve with only the layer read during selection, and E at
// the central control—not a correct arrangement alone—commits it.
{
  const { level, progress, registered } = createLevel();
  const labels = ['Chim', 'Lá', 'Thuyền', 'Hạt'];
  progress.flags['memory-slots-json'] = '[-1,-1,-1,-1]';
  for (let seat = 0; seat < labels.length; seat += 1) {
    const rack = registered.find((item) => item.id.startsWith('library-rack-') && item.getPrompt().includes(labels[seat]));
    assert.ok(rack, `rack offers ${labels[seat]} for selection`);
    rack.onInteract();
    findControl(registered, `library-seat-${seat}`).onInteract();
  }
  assert.equal(progress.flags['l2-book-practice'], undefined, 'book practice is not a solve prerequisite');
  assert.equal(level.tabletLayerCount(), 4, 'selection records one observed layer per tablet, not both');
  assert.equal(progress.flags['l2-clues-ready'], undefined, 'all-layer readiness is not a solve gate');
  assert.equal(progress.flags['l2-memory'], undefined, 'a correct arrangement does not auto-confirm');

  // Selecting a seated piece and targeting an occupied socket swaps them back without losing one.
  findControl(registered, 'library-seat-0').onInteract();
  findControl(registered, 'library-seat-1').onInteract();
  assert.deepEqual(JSON.parse(progress.flags['memory-slots-json']), [1, 0, 2, 3]);
  findControl(registered, 'library-seat-1').onInteract();
  findControl(registered, 'library-seat-0').onInteract();
  assert.deepEqual(JSON.parse(progress.flags['memory-slots-json']), [0, 1, 2, 3]);
  findControl(registered, 'library-confirm').onInteract();
  assert.equal(progress.flags['l2-memory'], true, 'explicit E confirmation solves with only one observed layer per tile');
}

console.log('Level 03 guidance/state checks passed.');
