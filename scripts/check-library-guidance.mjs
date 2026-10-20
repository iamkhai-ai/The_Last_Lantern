import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as libraryLayout from '../src/data/libraryLayout.ts';
import * as forestDecor from '../src/data/forestDecor.ts';
import * as libraryInkFade from '../src/levels/libraryInkFade.ts';
import * as soundSystem from '../src/systems/SoundSystem.ts';

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
  // Only the classes that updateVisualState tests with instanceof; no scene objects are created here.
  if (specifier === 'phaser') return { GameObjects: { Image: class Image {}, Text: class Text {} }, BlendModes: { ADD: 'ADD' } };
  if (specifier === '../art/CampaignArt') return { getLevelArtKey: (_level, filename) => filename };
  if (specifier === '../data/libraryLayout') return libraryLayout;
  // Pure seeded PRNG helper (no imports of its own) used for the floor mottling.
  if (specifier === '../data/forestDecor') return forestDecor;
  // Pure distance-fade helper for the dark-ink overlays (no imports of its own).
  if (specifier === './libraryInkFade') return libraryInkFade;
  // Static WebAudio helpers; without a window they resolve to no-ops.
  if (specifier === '../systems/SoundSystem') return soundSystem;
  throw new Error(`unexpected runtime import in LibraryLevel.ts: ${specifier}`);
};
new Function('exports', 'require', 'module', output.outputText)(moduleRecord.exports, requireStub, moduleRecord);
const { LibraryLevel } = moduleRecord.exports;

function createLevel(initialFlags = {}, lanternOn = true) {
  const registered = [];
  const dialogue = [];
  const toasts = [];
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
  level.flashGlow = () => {};
  level.showToast = (message) => toasts.push(message);
  level.registerInteractions();
  return { level, progress, registered, dialogue, toasts };
}

/** Records only the properties the visual-state tests read; setters return the object for chaining. */
function fakeVisual() {
  const visual = {
    visible: false,
    alpha: 1,
    tint: 0xffffff,
    setVisible(value) { this.visible = value; return this; },
    setAlpha(value) { this.alpha = value; return this; },
    setTint(value) { this.tint = value; return this; },
  };
  return visual;
}

/** Runs the real updateVisualState (createLevel stubs the instance copy) without the texture-driven exit art. */
function refreshVisuals(level) {
  level.updateExitTextures = () => {};
  Object.getPrototypeOf(level).updateVisualState.call(level, true);
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
  for (const phrase of ['Đèn bật', 'đèn tắt', 'E ở giá đá', 'đổi chỗ', 'dấu mặt trời phía Bắc', 'chiều kim đồng hồ', 'bệ giữa', 'chủ động kiểm tra', 'Bốn phiến là bốn thời khắc']) {
    assert.ok(guidance.includes(phrase), `book guidance explains ${phrase}`);
  }
  assert.equal(progress.flags['l2-book-practice'], true, 'safe-practice exchange triggers after both book layers');
  assert.equal(progress.flags['l2-bird-lit'], undefined, 'book demonstration does not consume a main puzzle tablet');
  // Re-reading the book after practice repeats only the observation, never the full guidance.
  level.readBook();
  assert.equal(dialogue.at(-1).length, 1, 'a re-read of the book speaks one observation line');
  assert.doesNotMatch(textOf(dialogue.at(-1)), /E ở giá đá/, 'a re-read does not repeat the guidance');
}

// H remains state-aware: stale readiness flags do not skip observations; only H tier 3 gives the map.
{
  const { level, progress, dialogue } = createLevel({ 'l2-book-practice': true, 'l2-clues-ready': true });
  level.showHint();
  assert.match(textOf(dialogue.at(-1)), /từng giá đá/,
    'stale l2-clues-ready does not skip the observation stage');
  level.showHint();
  assert.doesNotMatch(textOf(dialogue.at(-1)), /Bắc.*Chim.*Đông.*Lá.*Nam.*Thuyền.*Tây.*Hạt/);
  // Before every layer is read or a check fails, the third tier states the rule without naming tablets.
  level.showHint();
  assert.match(textOf(dialogue.at(-1)), /bình minh.*ban ngày.*hoàng hôn.*ban đêm/, 'third tier states the time order');
  assert.doesNotMatch(textOf(dialogue.at(-1)), /Chim|Lá|Thuyền|Hạt/, 'the rule tier names no tablet');

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
  assert.match(textOf(dialogue.at(-1)), /Bắc: Chim \(bình minh, mũi tên lên\) · Đông: Lá \(ban ngày\) · Nam: Thuyền \(hoàng hôn, mũi tên xuống\) · Tây: Hạt \(ban đêm\)/,
    'all layers read: the final tier explains each seat');

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

// Dark-ink distance fade: hidden within 50px of the player, fully shown from 80px, smooth between.
{
  const { inkOverlayFade, INK_FADE_NEAR, INK_FADE_FAR } = libraryInkFade;
  assert.equal(INK_FADE_NEAR, 50);
  assert.equal(INK_FADE_FAR, 80);
  assert.equal(inkOverlayFade(0), 0, 'fade(0) = 0');
  assert.equal(inkOverlayFade(50), 0, 'fade(50) = 0');
  assert.equal(inkOverlayFade(65), 0.5, 'fade(65) = 0.5');
  assert.equal(inkOverlayFade(80), 1, 'fade(80) = 1');
  assert.equal(inkOverlayFade(200), 1, 'fade(200) = 1');
  let previous = -Infinity;
  for (let d = 0; d <= 120; d += 0.5) {
    const value = inkOverlayFade(d);
    assert.ok(value >= previous, `fade is monotonic non-decreasing at d=${d}`);
    assert.ok(value >= 0 && value <= 1, `fade stays within 0..1 at d=${d}`);
    previous = value;
  }
}

// Per-frame wiring: visible ink overlays take INK_OVERLAY_ALPHA (0.92) * fade of their distance to the player.
{
  const { level } = createLevel({}, false);
  const makeInk = (x, y, visible) => ({ x, y, visible, alpha: -1, setAlpha(value) { this.alpha = value; } });
  const near = makeInk(244, 188, true);   // 22px from player: fully hidden
  const far = makeInk(400, 188, true);    // 178px from player: full alpha
  const hidden = makeInk(400, 188, false); // lantern on: untouched
  const stack = (ink) => ({ getData: (key) => (key === 'library-ink' ? ink : undefined) });
  level.player = { x: 222, y: 185 };
  level.tabletStacks = new Map([['a', stack(near)], ['b', stack(far)], ['c', stack(hidden)]]);
  level.bookInkOverlay = makeInk(222, 185, false);
  level.update();
  assert.equal(near.alpha, 0, 'tablet ink is hidden beside the player');
  assert.equal(far.alpha, 0.92, 'distant tablet ink uses the full 0.92 alpha');
  assert.equal(hidden.alpha, -1, 'ink overlays are left alone while the lantern is on');
  assert.equal(level.bookInkOverlay.alpha, -1, 'book ink is left alone while the lantern is on');
  level.bookInkOverlay.visible = true;
  level.update();
  assert.equal(level.bookInkOverlay.alpha, 0, 'book ink fades to 0 beside the player');
}

// Sound cues are recorded through the real SoundSystem statics, replaced here so no audio runs.
const sounds = [];
for (const name of ['playRuneActivate', 'playPuzzleError', 'playPuzzleSolved', 'playCrystalPickup']) {
  soundSystem.SoundSystem[name] = (...args) => sounds.push([name, ...args]);
}
const pickRack = (registered, label) => registered.find((item) => item.id.startsWith('library-rack-') && item.getPrompt().includes(label));

// The third hint tier states the time order until a check fails; only then does it name the answer.
{
  const { level, progress, registered, dialogue } = createLevel({ 'memory-slots-json': '[1,0,2,3]' });
  sounds.length = 0;
  level.showHint();
  level.showHint();
  level.showHint();
  assert.doesNotMatch(textOf(dialogue.at(-1)), /Bắc: Chim/, 'the rule tier does not name the answer before a failed check');
  findControl(registered, 'library-confirm').onInteract();
  assert.equal(progress.flags['l2-check-failed'], true, 'a wrong arrangement records a failed check');
  assert.deepEqual(sounds, [['playPuzzleError']], 'a failed check plays the error tone');
  level.showHint();
  assert.match(textOf(dialogue.at(-1)), /Bắc: Chim \(bình minh, mũi tên lên\)/, 'after a failed check the final tier gives the answer');
}

// Placing tablets, the correct check, and the crystal pickup each trigger their sound and glow.
{
  const { level, progress, registered, toasts } = createLevel({ 'memory-slots-json': '[-1,-1,-1,-1]' });
  const flashes = [];
  level.flashGlow = (x, y, delay, scale, peakAlpha) => flashes.push({ x, y, delay, scale, peakAlpha });
  sounds.length = 0;
  for (const [seat, label] of ['Chim', 'Lá', 'Thuyền', 'Hạt'].entries()) {
    pickRack(registered, label).onInteract();
    findControl(registered, `library-seat-${seat}`).onInteract();
    assert.deepEqual(sounds.at(-1), ['playRuneActivate', seat + 1], `placing ${label} plays the seat tone`);
  }
  sounds.length = 0;
  findControl(registered, 'library-confirm').onInteract();
  assert.equal(progress.flags['l2-memory'], true, 'correct arrangement solves');
  assert.deepEqual(sounds, [['playPuzzleSolved']], 'a correct check plays the solved chime');
  assert.deepEqual(flashes.map((flash) => [flash.x, flash.y]), [[320, 112], [396, 188], [320, 264], [244, 188]],
    'seat glows run clockwise from the North seat');
  assert.deepEqual(flashes.map((flash) => flash.delay), [0, 120, 240, 360], 'seat glows are 120ms apart');

  sounds.length = 0;
  flashes.length = 0;
  findControl(registered, 'library-crystal').onInteract();
  assert.equal(progress.flags['l2-crystal'], true, 'the crystal is collected');
  assert.deepEqual(sounds, [['playCrystalPickup']], 'collecting the crystal plays the pickup chime');
  assert.deepEqual(flashes.map((flash) => [flash.x, flash.y]), [[475, 118], [580, 140]],
    'taking the crystal pulses the mural sun and the north-wall gate together');
  assert.equal(toasts.at(-1), 'Lối ra đã mở', 'taking the crystal announces the open exit');
}

// Bird and boat dark layers state the arrow direction; the rotation message points at the sun marker.
{
  const { registered, dialogue } = createLevel({}, false);
  pickRack(registered, 'Chim').onInteract();
  assert.match(textOf(dialogue.at(-1)), /Mũi tên chỉ lên: mặt trời đang nhô khỏi chân trời\./);
  pickRack(registered, 'Thuyền').onInteract();
  assert.match(textOf(dialogue.at(-1)), /Mũi tên chỉ xuống: mặt trời đang lặn\./);
}

// The inscription is the same wording on the plaque, in the journal and in the opening dialogue.
{
  const inscription = '“Một ngày khởi đầu khi mặt trời nhô khỏi chân trời và khép lại khi trăng lên cao. Hãy đặt nó trở lại vòng của mình.”';
  const { level, progress, registered, dialogue } = createLevel();
  level.startOpeningDialogue();
  const introReading = dialogue.at(-1).find((line) => line.text.startsWith('Dòng khắc trên bệ đá: '));
  assert.ok(introReading, 'the opening dialogue includes the inscription reading');
  assert.equal(introReading.speaker, 'Nhinh', 'Nhinh reads the inscription aloud');
  const introPointer = dialogue.at(-1).at(-1);
  assert.equal(introPointer.speaker, 'Lumo', 'the intro ends with Lumo pointing at the book desk');
  assert.match(introPointer.text, /Cuốn sách trên bàn bên trái.*nhấn F đổi đèn/, 'the closing intro line names the book and the F key');
  assert.ok(introReading.text.startsWith('Dòng khắc trên bệ đá: '), 'the opening line introduces the reading');
  assert.ok(introReading.text.endsWith(inscription), 'opening dialogue quotes the inscription');
  findControl(registered, 'library-inscription').onInteract();
  assert.equal(textOf(dialogue.at(-1)), inscription, 'plaque reads the new inscription');
  level.showJournal();
  assert.ok(textOf(dialogue.at(-1)).includes(`Dòng khắc: ${inscription}`), 'journal records the new inscription');
  assert.equal(progress.flags['l2-inscription-read'], true);
  assert.doesNotMatch(readFileSync(new URL('src/levels/LibraryLevel.ts', root), 'utf8'), /Đừng bỏ quên/, 'old inscription wording is gone');
}

// Racks name the tablet they offer; an empty rack (its tablet already seated) offers no prompt at all.
{
  // Slot values index STONES: bird = 0 sits in the North seat, so the bird rack (index 1) is empty.
  const { registered } = createLevel({ 'memory-slots-json': '[0,-1,-1,-1]' });
  assert.equal(registered.find((item) => item.id === 'library-rack-0').getPrompt(), 'E · Xem và chọn phiến Thuyền',
    'a rack prompt reads "Xem và chọn phiến"');
  const emptyRack = registered.find((item) => item.id === 'library-rack-1');
  assert.equal(emptyRack.isEnabled(), false, 'the rack of a seated tablet is disabled');
  assert.equal(emptyRack.getPrompt(), '', 'the rack of a seated tablet shows no prompt');
}

// Spawn: no rack prompt is in reach at the entry point; the stand of each rack stays usable.
{
  const { registered } = createLevel({}, true);
  const spawn = libraryLayout.LIBRARY_LAYOUT.entry;
  const INTERACTION_PADDING = 8; // mirrors src/systems/InteractionSystem.ts
  for (const item of registered.filter((entry) => entry.id.startsWith('library-rack-'))) {
    const reach = item.radius + INTERACTION_PADDING;
    assert.ok(Math.hypot(spawn.x - item.x, spawn.y - item.y) > reach, `${item.id} is out of reach at the spawn point`);
  }
}

// Short confirmations are toasts; story lines stay in dialogue. Seats name their direction.
{
  const { level, progress, registered, dialogue, toasts } = createLevel({ 'memory-slots-json': '[-1,-1,-1,-1]' });
  findControl(registered, 'library-seat-1').onInteract();
  assert.equal(toasts.at(-1), 'Hãy chọn một phiến ở giá đá trước.', 'an empty seat with nothing selected gives a toast');
  findControl(registered, 'library-confirm').onInteract();
  assert.equal(toasts.at(-1), 'Còn 4 hốc trống. Đặt đủ bốn phiến rồi hãy kiểm tra.', 'the check reports the missing seats as a toast');
  assert.equal(progress.flags['l2-check-failed'], undefined, 'a check with missing seats is not a failed arrangement');
  pickRack(registered, 'Lá').onInteract();
  findControl(registered, 'library-seat-1').onInteract();
  assert.equal(toasts.at(-1), 'Đã đặt phiến vào hốc Đông', 'placing a tablet names the seat by its direction');
  assert.equal(dialogue.some((lines) => textOf(lines).includes('Đã đặt')), false, 'placement is not shown as dialogue');
  findControl(registered, 'library-confirm').onInteract();
  assert.equal(toasts.at(-1), 'Còn 3 hốc trống. Đặt đủ bốn phiến rồi hãy kiểm tra.', 'the missing count follows the seats');
}
{
  const { level, registered, toasts } = createLevel({ 'l2-memory': true, 'memory-slots-json': '[0,1,2,-1]' });
  findControl(registered, 'library-seat-3').onInteract();
  assert.equal(toasts.at(-1), 'Hốc này đang trống.', 'an empty seat after the solve gives a toast');
  findControl(registered, 'library-seat-1').onInteract();
  assert.equal(level.selectedStone, null, 'reading a seat after the solve never selects its tablet');
}
{
  const { level, progress, registered, toasts } = createLevel({ 'memory-slots-json': '[0,1,2,3]' });
  findControl(registered, 'library-seat-0').onInteract();
  assert.equal(level.selectedStone, 0, 'a seated tablet is selected by E when nothing is selected');
  findControl(registered, 'library-confirm').onInteract();
  assert.equal(progress.flags['l2-memory'], true, 'the arrangement solves');
  assert.equal(level.selectedStone, null, 'a solved check clears the selected tablet');
  assert.equal(toasts.length, 0, 'a correct check shows no toast');
}
// The fifth painting is optional story: reading it records the flag and the short re-read line, but
// the gate already opened with the crystal, so the mural never announces the exit.
{
  const { level, progress, dialogue, toasts } = createLevel({ 'l2-crystal': true });
  level.say = (lines, done) => { dialogue.push(lines); done?.(); };
  level.readMural();
  assert.equal(progress.flags['l2-fifth-viewed'], true, 'the mural is read');
  assert.equal(toasts.length, 0, 'reading the optional mural does not announce the exit');
  level.readMural();
  assert.equal(textOf(dialogue.at(-1)), 'Vết nứt bắt đầu từ lúc vòng ngày đêm dừng lại.',
    'a re-read of the mural gives the short line');
  level.showJournal();
  assert.match(textOf(dialogue.at(-1)), /Vết nứt bắt đầu từ lúc vòng ngày đêm dừng lại/,
    'the journal keeps the fifth painting entry');
}

// C1 hints: once the crystal is taken the exit hint comes first and calls the painting optional. The
// old 'mural' stage (walk to the wall painting before the gate opens) is gone.
{
  const { level, dialogue } = createLevel({ 'l2-memory': true, 'l2-crystal': true, 'memory-slots-json': '[0,1,2,3]' });
  level.showHint();
  assert.match(textOf(dialogue.at(-1)), /vòm cổng đá trên vách bắc/,
    'the first exit hint points at the north-wall arch');
  assert.doesNotMatch(textOf(dialogue.at(-1)), /vách rễ/,
    'the first exit hint does not send the player to the painting');
  level.showHint();
  assert.match(textOf(dialogue.at(-1)), /Tới cổng đá phía Đông Bắc/,
    'the second exit hint names the north-east gate');
  level.showHint();
  assert.match(textOf(dialogue.at(-1)), /tùy chọn/,
    'the third exit hint marks the fifth painting optional');
  for (const lines of dialogue) {
    for (const line of lines) {
      assert.equal(line.speaker, 'Hệ thống', 'exit hints speak as the system');
      assert.doesNotMatch(line.text, /phải đọc bức tranh|Đọc bức tranh sau vách/,
        `exit hint "${line.text}" never makes the painting a required step`);
    }
  }
}

// C1: the gate opens the moment the crystal is taken — the optional painting is never a key, and a
// legacy save with the crystal but no painting counts as open (E at the gate advances the campaign).
{
  const { level, progress, registered, dialogue, toasts } = createLevel({ 'l2-memory': true, 'memory-slots-json': '[0,1,2,3]' });
  let advanced = 0;
  level.nextLevel = (lines) => { advanced += 1; dialogue.push(lines); };
  assert.equal(findControl(registered, 'library-exit').getPrompt(), 'E · Kiểm tra cổng đá phía Đông Bắc',
    'the shut gate names its north-east wall');
  assert.equal(level.isExitOpen(), false, 'the gate starts shut');
  findControl(registered, 'library-crystal').onInteract();
  assert.equal(progress.flags['l2-crystal'], true, 'the crystal is collected');
  assert.equal(progress.flags['l2-fifth-viewed'], undefined, 'the optional painting is still unread');
  assert.equal(level.isExitOpen(), true, 'the crystal alone opens the gate');
  assert.equal(toasts.at(-1), 'Lối ra đã mở', 'the opening is announced when the crystal is taken');
  assert.equal(findControl(registered, 'library-exit').getPrompt(), 'E · Qua cổng đá', 'the open gate offers the passage');
  findControl(registered, 'library-exit').onInteract();
  assert.equal(advanced, 1, 'E at the open gate advances to the next level');
  assert.match(textOf(dialogue.at(-1)), /Đường nước tới Cây Mẹ/, 'the passage line leads to the next level');
}

// Seat E while the selected tablet already sits there only reads it: no re-placing, no false message.
{
  const { level, progress, registered, toasts } = createLevel({ 'memory-slots-json': '[0,-1,-1,-1]' }, true);
  sounds.length = 0;
  const seat0 = findControl(registered, 'library-seat-0');
  seat0.onInteract();
  assert.equal(level.selectedStone, 0, 'E on a seated tablet selects it while nothing is selected');
  assert.equal(level.seatPrompt(0), 'E · Đọc phiến Chim', 'the selected tablet\'s seat offers a read');
  seat0.onInteract();
  assert.deepEqual(JSON.parse(progress.flags['memory-slots-json']), [0, -1, -1, -1], 'reading the selected tablet does not re-place it');
  assert.equal(toasts.some((message) => message.includes('Đã đặt')), false, 'no false placement message');
  assert.equal(level.selectedStone, 0, 'the selection is kept after a read');
  assert.deepEqual(sounds, [], 'a read plays no rune sound');
}

// E on a rack: a second press on the same tablet in the same light deselects it.
{
  const { level, registered, toasts } = createLevel({}, true);
  const rack = (id) => registered.find((item) => item.id === id);
  rack('library-rack-3').onInteract();
  assert.equal(level.selectedStone, 1, 'the first E on the leaf rack selects the leaf tablet');
  rack('library-rack-3').onInteract();
  assert.equal(level.selectedStone, null, 'the second E on the same tablet in the same light deselects it');
  assert.equal(toasts.at(-1), 'Bỏ chọn phiến Lá', 'deselecting confirms with a toast');
}

// Lumo's two-layer tip plays once; a re-read of a seen layer gives one short line.
{
  const { level, progress, registered, dialogue, toasts } = createLevel({}, true);
  const rack = (id) => registered.find((item) => item.id === id);
  rack('library-rack-1').onInteract();
  level.lantern.lanternOn = false;
  rack('library-rack-1').onInteract();
  assert.match(textOf(dialogue.at(-1)), /Hai lớp ghép lại/, 'the first two-layer comparison speaks the tip');
  assert.equal(progress.flags['l2-two-layer-tip'], true, 'the tip is recorded');
  level.lantern.lanternOn = true;
  rack('library-rack-3').onInteract();
  level.lantern.lanternOn = false;
  rack('library-rack-3').onInteract();
  assert.doesNotMatch(textOf(dialogue.at(-1)), /Hai lớp ghép lại/, 'the tip does not repeat');
  rack('library-rack-3').onInteract();
  assert.equal(toasts.at(-1), 'Bỏ chọn phiến Lá');
  rack('library-rack-1').onInteract();
  assert.equal(dialogue.at(-1).length, 1, 're-reading a seen layer gives a single line');
  assert.match(textOf(dialogue.at(-1)), /^Chim: Mũi tên chỉ lên/, 'the single line is the clue itself');
}

// The Hạt lit reading is the same in the observation and the journal.
{
  const { level, registered, dialogue } = createLevel({}, true);
  registered.find((item) => item.id === 'library-rack-2').onInteract();
  const described = 'Mặt trăng ở cao. Đường cung quanh nó bị khuyết.';
  assert.equal(textOf(dialogue.at(-1)), `Hạt: ${described}`, 'the observed Hạt lit layer uses the shared description');
  level.showJournal();
  assert.ok(textOf(dialogue.at(-1)).includes(`Hạt · Đèn bật: ${described}`), 'the journal repeats the same Hạt description');
}

// Objectives: one action per stage, plain words, under 70 characters.
{
  const solvedFlags = { 'memory-slots-json': '[0,1,2,3]' };
  const gateObjective = 'Tới cổng đá phía Đông Bắc và nhấn E. (Tranh thứ năm: tùy chọn)';
  const stages = [
    [{}, 'Đọc cuốn sách trên bàn, nhấn F đổi đèn rồi đọc lại.'],
    [{ 'l2-book-practice': true }, 'Đọc cả hai lớp (đèn bật/tắt) của bốn phiến trên giá.'],
    [{ 'l2-book-practice': true, 'memory-slots-json': '[0,-1,-1,-1]' }, 'Đặt bốn phiến vào bốn hốc theo vòng một ngày.'],
    [{ 'l2-book-practice': true, ...solvedFlags }, 'Đủ bốn phiến. Nhấn E ở bệ giữa để kiểm tra.'],
    [{ 'l2-memory': true, ...solvedFlags }, 'Nhấn E ở mép nam bệ giữa để nhận Tinh thể Ký Ức.'],
    // The crystal alone opens the gate; the optional painting never blocks the objective.
    [{ 'l2-memory': true, 'l2-crystal': true, ...solvedFlags }, gateObjective],
    [{ 'l2-memory': true, 'l2-crystal': true, 'l2-fifth-viewed': true, ...solvedFlags }, gateObjective],
  ];
  for (const [flags, text] of stages) {
    const { level } = createLevel(flags);
    assert.equal(level.getObjectiveText(), text, `objective for ${JSON.stringify(flags)}`);
    assert.ok(text.length < 70, `objective "${text}" stays under 70 characters`);
  }
}

// Hints are imperative and speak to the player without calling her Cậu; the source keeps the new vocabulary.
{
  const stateSets = [
    {},
    { 'l2-book-practice': true },
    { 'l2-book-practice': true, 'l2-bird-lit': true, 'l2-boat-lit': true, 'l2-leaf-dark': true, 'l2-seed-dark': true },
    { 'l2-book-practice': true, 'memory-slots-json': '[0,1,2,3]' },
  ];
  for (const flags of stateSets) {
    const { level, dialogue } = createLevel(flags);
    for (let press = 0; press < 4; press += 1) level.showHint();
    for (const lines of dialogue) {
      for (const line of lines) {
        assert.equal(line.speaker, 'Hệ thống', 'hints speak as the system');
        assert.doesNotMatch(line.text, /Cậu/, `hint "${line.text}" does not address the player as Cậu`);
      }
    }
  }
  const source = readFileSync(new URL('src/levels/LibraryLevel.ts', root), 'utf8');
  for (const banned of ['vạch', 'chân trời sáng', 'hốc đích', 'lối rễ', 'Qua lối', 'Giá đá trống', 'ngày, chiều', 'Cậu đã', 'Đọc bức tranh sau vách', 'Giếng đã mở', 'LIBRARY_PLAQUE', 'Đông Nam']) {
    assert.equal(source.includes(banned), false, `LibraryLevel.ts no longer says "${banned}"`);
  }
}

// Exit feedback: the locked-exit line names the stage that is still missing, and the crystal alone
// is enough to walk through (a legacy save with no fifth painting must not be trapped).
{
  const { level, progress, dialogue } = createLevel();
  let advanced = 0;
  level.nextLevel = (lines) => { advanced += 1; dialogue.push(lines); };
  level.useExit();
  assert.equal(textOf(dialogue.at(-1)), 'Cổng đá vẫn đóng. Có lẽ phải khôi phục vòng ngày đêm ở giữa phòng trước.');
  assert.equal(advanced, 0, 'the shut gate does not advance');
  progress.flags['l2-memory'] = true;
  level.useExit();
  assert.equal(textOf(dialogue.at(-1)), 'Cổng vẫn đóng. Tinh thể trong giếng đang chờ.');
  assert.equal(advanced, 0, 'the gate stays shut until the crystal is taken');
  progress.flags['l2-crystal'] = true;
  level.useExit();
  assert.equal(advanced, 1, 'a save with the crystal but no fifth painting walks straight through');
  assert.match(textOf(dialogue.at(-1)), /Đường nước tới Cây Mẹ/);
}

// Visual cues: the exit glow is dim and cool while shut, the book glow pulses until practice,
// and the core pulses only while all four seats are filled and unchecked.
{
  const { level, progress } = createLevel({}, true);
  level.exitGlow = fakeVisual();
  level.bookGlow = fakeVisual();
  level.exitThresholdBody = { enable: true };
  const archTextures = [];
  level.updateExitTextures = (open) => archTextures.push(open);
  const refresh = () => Object.getPrototypeOf(level).updateVisualState.call(level, true);
  refresh();
  assert.equal(level.exitGlow.alpha, 0.15, 'the exit glow is dim while the gate is shut');
  assert.equal(level.exitGlow.tint, 0x7df2d4, 'the shut exit glow is cool cyan');
  assert.equal(level.exitThresholdBody.enable, true, 'the shut gate keeps its threshold body');
  assert.deepEqual(archTextures, [false], 'the arch art stays locked while the gate is shut');
  assert.equal(level.bookGlow.visible, true, 'the book glow shows until the book is practised');
  // The crystal alone opens the gate; the optional fifth painting is not set here.
  progress.flags['l2-crystal'] = true;
  refresh();
  assert.equal(level.exitThresholdBody.enable, false, 'the crystal disables the threshold body on its own');
  assert.equal(archTextures.at(-1), true, 'the arch art swaps to the open one with the crystal');
  assert.equal(level.exitGlow.alpha, 0.4, 'the open exit glows bright');
  assert.equal(level.exitGlow.tint, 0xffffff, 'the open exit has no cyan tint');
  progress.flags['l2-book-practice'] = true;
  refresh();
  assert.equal(level.bookGlow.visible, false, 'the book glow ends once the book is practised');
}
{
  const { level, progress } = createLevel({ 'memory-slots-json': '[0,1,2,-1]' }, true);
  const tweens = [];
  let stops = 0;
  level.scene = { tweens: { add: (config) => { tweens.push(config); return { stop() { stops += 1; } }; } } };
  level.coreGlow = fakeVisual();
  refreshVisuals(level);
  assert.equal(tweens.length, 0, 'the core stays steady while a seat is empty');
  progress.flags['memory-slots-json'] = '[0,1,2,3]';
  refreshVisuals(level);
  assert.equal(tweens.length, 1, 'filling all four seats starts the core pulse');
  assert.equal(tweens[0].targets, level.coreGlow, 'the pulse targets the core glow');
  refreshVisuals(level);
  assert.equal(tweens.length, 1, 'refreshing does not start a second pulse');
  progress.flags['l2-memory'] = true;
  progress.flags['l2-crystal'] = true;
  refreshVisuals(level);
  assert.equal(stops, 1, 'the solved check stops the core pulse');
  assert.equal(level.coreGlow.alpha, 0.3, 'the core returns to its steady glow');
}

// Toasts are non-blocking: centred near the top, depth 88, hidden after 1800ms, replaced by the next one.
{
  const texts = [];
  const timers = [];
  const scene = {
    add: {
      text: (x, y, text) => {
        const object = {
          x, y, text, active: true, depth: 0,
          setOrigin() { return this; },
          setDepth(depth) { this.depth = depth; return this; },
          destroy() { this.active = false; },
        };
        texts.push(object);
        return object;
      },
    },
    time: {
      delayedCall: (delay, callback) => {
        const timer = { delay, callback, removed: false, remove() { this.removed = true; } };
        timers.push(timer);
        return timer;
      },
    },
  };
  const level = new LibraryLevel({
    scene,
    progress: { flags: {}, counters: {} },
    player: { x: 0, y: 0 },
    interactions: { register() {}, clear() {} },
    lantern: { lanternOn: true },
    save() {},
    say() {},
    nextLevel() {},
  });
  level.showToast('Đã đặt phiến vào hốc Bắc');
  assert.equal(texts[0].text, 'Đã đặt phiến vào hốc Bắc');
  assert.deepEqual([texts[0].x, texts[0].y, texts[0].depth], [320, 80, 88], 'the toast sits top-centre at depth 88');
  assert.equal(timers[0].delay, 1800, 'the toast hides after 1800ms');
  level.showToast('Hốc này đang trống.');
  assert.equal(texts[0].active, false, 'a new toast replaces the old one');
  assert.equal(timers[0].removed, true, 'replacing a toast cancels its hide timer');
  assert.equal(texts[1].text, 'Hốc này đang trống.');
  level.destroy();
  assert.equal(texts[1].active, false, 'destroying the level removes the toast');
  assert.equal(timers[1].removed, true, 'destroying the level cancels the hide timer');
}

// A collected crystal leaves no trace in the level's object list or its protected prompt bounds.
{
  const { level, progress, registered } = createLevel({ 'l2-memory': true, 'memory-slots-json': '[0,1,2,3]' });
  const crystal = { active: true, getData: (key) => key === 'library-crystal', destroy() { this.active = false; } };
  level.objects = [crystal];
  level.protectedImages.add(crystal);
  findControl(registered, 'library-crystal').onInteract();
  assert.equal(progress.flags['l2-crystal'], true, 'the crystal is collected');
  assert.equal(crystal.active, false, 'the crystal image is destroyed');
  assert.equal(level.objects.includes(crystal), false, 'the crystal leaves the object list');
  assert.equal(level.protectedImages.has(crystal), false, 'the crystal leaves the protected prompt bounds');
}

// Per-frame prompts and HUD text reuse the parsed slots: no JSON.parse while the saved string is unchanged.
{
  const { level, registered } = createLevel({ 'memory-slots-json': '[0,1,-1,-1]' });
  const rack = registered.find((item) => item.id === 'library-rack-0');
  level.getStatusText();
  const originalParse = JSON.parse;
  let parses = 0;
  JSON.parse = (...args) => { parses += 1; return originalParse(...args); };
  try {
    for (let frame = 0; frame < 100; frame += 1) {
      level.getStatusText();
      level.getObjectiveText();
      level.seatPrompt(0);
      rack.getPrompt();
    }
  } finally {
    JSON.parse = originalParse;
  }
  assert.equal(parses, 0, 'per-frame reads of the memory slots do not parse JSON');
}

console.log('Level 03 guidance/state checks passed.');
