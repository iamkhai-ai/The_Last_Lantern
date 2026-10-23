/**
 * Shared campaign HUD check.
 *
 * Proves the campaign has one campaign HUD and that it cannot drift back into
 * per-level flat-background legends:
 *   - SPACE pulses only on the authored pulse levels;
 *   - CampaignScene, the creek/tower controllers and the path rooms no longer
 *     build their own backgroundColor HUD text;
 *   - CampaignScene drives the shared HUD through its setters;
 *   - CampaignHud.ts keeps every literal coordinate inside the 640x360 canvas,
 *     and the computed pulse-chip/ready-ring extents and clamped key row too.
 *
 * Pure source/logic: no browser and no Phaser runtime is loaded.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HUD_LAYOUT, PULSE_LEVELS, centerKeyRow } from '../src/ui/CampaignHud.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFileSync(path.join(ROOT, relative), 'utf8');

const FILES = {
  scene: 'src/scenes/CampaignScene.ts',
  creek: 'src/scenes/ShatteredCreekController.ts',
  tower: 'src/levels/SleeplessTowerLevel.ts',
  path: 'src/levels/PathForTwoLevel.ts',
  hud: 'src/ui/CampaignHud.ts',
};
const sources = Object.fromEntries(Object.entries(FILES).map(([key, file]) => [key, read(file)]));

/* --------------------------------------------------- one authored pulse-level set */

assert.deepEqual([...PULSE_LEVELS], [0, 1, 5, 7, 8, 9],
  'SPACE pulses only on campaign indices 0, 1, 5 (Level 06 tally reveal), 7 (Level 08 name reveal), 8 and 9');
assert.match(sources.scene, /PULSE_LEVELS\.includes\(this\.progress\.level\)/,
  'the Space handler gates on the shared pulse-level set');
assert.match(sources.scene, /PULSE_LEVELS\.includes\(index\)/,
  'the Pulse key chip gates on the same shared pulse-level set');

/* ------------------------------------- no level or controller draws its own HUD chrome */

const rawLegendColor = /backgroundColor\s*:\s*['"]#07151c(?:bb|cc)['"]/;
for (const key of ['scene', 'creek', 'tower', 'path']) {
  assert.equal(rawLegendColor.test(sources[key]), false,
    `${FILES[key]} no longer creates a flat backgroundColor HUD legend`);
  assert.equal(/\.hud\.push\(/.test(sources[key]), false,
    `${FILES[key]} no longer keeps a private HUD text list`);
}
for (const field of ['titleText', 'objectiveText', 'controlsText', 'statusText', 'hintText', 'lumoStatusText']) {
  assert.equal(new RegExp(`private\\s+${field}\\s*!`).test(sources.scene), false,
    `CampaignScene no longer owns the old ${field} object`);
}
assert.equal(/WASD/.test(sources.scene), false,
  'the old controls legend is gone from CampaignScene');

/* ------------------------------------------------- CampaignScene drives one shared HUD */

assert.match(sources.scene, /import \{ CampaignHud, HUD_LAYOUT, PULSE_LEVELS \} from '\.\.\/ui\/CampaignHud'/,
  'CampaignScene imports the shared HUD');
assert.match(sources.scene, /this\.hud = new CampaignHud\(this\)/,
  'CampaignScene creates exactly one shared HUD');
for (const setter of ['setTitle', 'setObjective', 'setStatus', 'setLumo', 'setKeys']) {
  assert.match(sources.scene, new RegExp(`this\\.hud\\.${setter}\\(`), `refreshHud() drives hud.${setter}()`);
}
assert.match(sources.scene, /this\.hud\.update\(dt, this\.lantern\.getCooldownRatio\(\)\)/,
  'the scene feeds the live pulse cooldown into the HUD');
assert.match(sources.scene, /this\.hud\.setHidden\(this\.dialogue\.isActive\(\) \|\| this\.pauseMenu\.isOpen\(\)\)/,
  'dialogue and the pause menu hide the shared HUD');
assert.match(sources.scene, /this\.hud\.notePulseBlocked\(remaining\)/,
  'Space reports a blocked pulse to the HUD');
assert.match(sources.hud, /export class CampaignHud/, 'CampaignHud.ts exports the shared HUD class');
for (const token of ['0x0c1d24', '0x3b5c63', '#f7dfaa', '#e5eee8', '#d3e5dc', '#b8f5d4', '#ffe680', '#d8e3da', '0x122b33', '0x7df2d4', '0xd8b869']) {
  assert.ok(sources.hud.includes(token), `CampaignHud.ts keeps the shared palette token ${token}`);
}
assert.match(sources.hud, /setDepth\(86\)[\s\S]*setDepth\(87\)[\s\S]*setDepth\(88\)/,
  'CampaignHud.ts keeps panels/chips/toast on depths 86/87/88');

/* ------------------------------------------ no HUD literal can sit off the 640x360 canvas */

const NUMBER_PAIR = /(?<![\w.])(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)(?![\w.])/g;
for (const match of sources.hud.matchAll(NUMBER_PAIR)) {
  const x = Number(match[1]);
  const y = Number(match[2]);
  assert.ok(x >= 0 && x <= 640 && y >= 0 && y <= 360,
    `CampaignHud.ts hard-coded pair (${match[1]}, ${match[2]}) sits outside the 640x360 canvas`);
}
const COORDINATE_CONSTANT = /const\s+([A-Z][A-Z0-9]*(?:_X|_Y))\s*=\s*(-?\d+(?:\.\d+)?)/g;
for (const match of sources.hud.matchAll(COORDINATE_CONSTANT)) {
  const name = match[1];
  const value = Number(match[2]);
  const limit = name.endsWith('_X') ? 640 : 360;
  assert.ok(value >= 0 && value <= limit,
    `CampaignHud.ts ${name} = ${value} sits outside the ${limit}px canvas axis`);
}

/* ------------------- computed pulse-chip extents: arc + ready ring stay in the row */

const pulseArcTop = HUD_LAYOUT.keysY - HUD_LAYOUT.arcRadius - HUD_LAYOUT.arcStroke / 2;
const pulseArcBottom = HUD_LAYOUT.keysY + HUD_LAYOUT.arcRadius + HUD_LAYOUT.arcStroke / 2;
const pulseFlashTop = HUD_LAYOUT.keysY - HUD_LAYOUT.flashRadius - HUD_LAYOUT.flashStroke / 2;
const pulseFlashBottom = HUD_LAYOUT.keysY + HUD_LAYOUT.flashRadius + HUD_LAYOUT.flashStroke / 2;
assert.ok(Math.max(pulseArcBottom, pulseFlashBottom) <= 360,
  `the pulse arc/ready ring bottom (${Math.max(pulseArcBottom, pulseFlashBottom)}) must stay inside the 360px canvas`);
assert.ok(Math.min(pulseArcTop, pulseFlashTop) >= HUD_LAYOUT.topBottom + 200,
  `the pulse arc/ready ring top (${Math.min(pulseArcTop, pulseFlashTop)}) must stay in the bottom HUD band`);
assert.ok(HUD_LAYOUT.badgeRadius <= HUD_LAYOUT.arcRadius && HUD_LAYOUT.arcRadius < HUD_LAYOUT.flashRadius,
  'the arc sits outside the badge and the ready ring sits outside the arc');

/* ------------------------------------------- the mission plate stays a compact corner card */

assert.ok(HUD_LAYOUT.topBottom <= 90,
  `the mission plate never grows past y=${HUD_LAYOUT.topBottom}; a taller card would eat the playfield`);
assert.equal(HUD_LAYOUT.topBottom, 86, 'chapter + objective + progress leave the plate 78px tall at most');
assert.deepEqual([...HUD_LAYOUT.chipOrder], ['move', 'run', 'interact', 'lantern', 'pulse'],
  'the HUD only chips the three movement/interaction keys plus the lantern action');
assert.equal(/drawStatusPanel|drawLumoChip/.test(sources.hud), false,
  'progress is drawn inside the mission plate and Lumo has no card of its own');
assert.match(sources.hud, /this\.escText\.setVisible\(this\.keyVisibility\.pause\)/,
  'pause stays discoverable through the quiet ESC label instead of a keycap');
assert.match(sources.hud, /const CHIP_ORDER: readonly HudKeyId\[\] = \[/,
  'CampaignHud.ts owns one authored chip order');

/* ---------------------------------------------- the key row is clamped to 12..628 */

assert.equal(HUD_LAYOUT.rowLeft, 12, 'the key row starts at x=12');
assert.equal(HUD_LAYOUT.rowRight, 628, 'the key row ends at x=628');
assert.equal(HUD_LAYOUT.rowCenter, 320, 'the key row is centred on x=320');
for (const total of [0, 100, 300, 450, 616]) {
  const left = centerKeyRow(total);
  assert.ok(left >= HUD_LAYOUT.rowLeft && left + total <= HUD_LAYOUT.rowRight,
    `a ${total}px key row must stay within ${HUD_LAYOUT.rowLeft}..${HUD_LAYOUT.rowRight}, got ${left}..${left + total}`);
}
assert.equal(centerKeyRow(616), 12, 'a full key row is clamped to the left bound');
assert.equal(centerKeyRow(0), 320, 'a lone chip stays centred');
assert.ok(HUD_LAYOUT.keysY - HUD_LAYOUT.chipHeight / 2 - 3 >= HUD_LAYOUT.topBottom,
  'the keycap band clears the mission plate');
assert.ok(HUD_LAYOUT.keysY + HUD_LAYOUT.chipHeight / 2 <= 360,
  'the keycap band stays inside the canvas');

/* ----------------------------------- the full key map lives in the pause menu, not the HUD */

const pauseMenu = read('src/ui/PauseMenu.ts');
for (const token of ['WASD', 'Chạy', 'Tương tác', 'Đèn', 'Xung sáng', 'Sổ tay', 'Gợi ý', 'Tạm dừng']) {
  assert.ok(pauseMenu.includes(token), `PauseMenu.ts documents the ${token} control the HUD no longer chips`);
}

/* ------------------------------------------- the toast clears the measured top panel */

assert.match(sources.hud, /this\.topPanelBottom = TOP_Y \+ height/,
  'CampaignHud.ts records how tall the top panel really is');
assert.match(sources.hud, /const centerY = Math\.max\(TOAST_Y, this\.topPanelBottom \+ TOAST_GAP \+ height \/ 2\)/,
  'the toast moves below the measured top panel instead of overlapping a two-line objective');

console.log('Campaign HUD checks passed:');
console.log(`  pulse levels : ${PULSE_LEVELS.join(', ')} share one authored set`);
console.log('  ownership    : CampaignScene, creek, tower and path rooms draw no flat-background HUD legend');
console.log('  wiring       : title/objective/status/lumo/keys, cooldown, hiding and blocked-pulse feedback');
console.log('  layout       : every literal coordinate in CampaignHud.ts stays inside 640x360');
console.log(`  pulse chip   : arc ${pulseArcTop}..${pulseArcBottom}, ready ring ${pulseFlashTop}..${pulseFlashBottom} clears the status row and canvas edge`);
console.log(`  key row      : ${HUD_LAYOUT.rowLeft}..${HUD_LAYOUT.rowRight}, clamped after every key change`);
console.log('  toast        : below the measured top panel, so wide two-line objectives never overlap it');
