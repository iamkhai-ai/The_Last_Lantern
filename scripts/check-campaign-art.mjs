// Art facts for the campaign, measured from the real PNG files (IHDR size and decoded alpha), not from the
// dimensions a layout or the manifest declares. A declared size is only evidence once a file agrees with it.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  HEART_CELLS, HEART_ELEMENTS, HEART_PROPS, HEART_REUSED_ART, HEART_TEXTURE_NATIVE, HEART_MOON_SHADOW,
} from '../src/data/heartOfElariaLayout.ts';
import { OBSERVATORY_ELEMENTS } from '../src/data/observatoryLayout.ts';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const LEVELS = [
  '01-forgotten-forest-edge', '02-whispering-woods', '03-library-beneath-the-roots', '04-shattered-moonlit-creek',
  '05-a-path-for-two', '06-the-sleepless-tower', '07-the-sleeping-garden', '08-ruins-of-two-halves',
  '09-dark-moon-observatory', '10-the-heart-of-elaria',
];

import { readPng } from './lib/readPng.mjs';

const spriteOf = (level, file) => join(rootDir, 'assets/levels', LEVELS[level], 'sprites', `${file}.png`);
const textureOf = (key) => join(rootDir, 'src/assets', `${key}.png`);
/** The file a Level 10 control really draws, in the order the level resolves it: reuse, package art, runtime texture. */
function heartArtFile(name) {
  const reused = HEART_REUSED_ART[name];
  if (reused) return spriteOf(reused.level, reused.file);
  if (existsSync(spriteOf(9, name))) return spriteOf(9, name);
  assert.ok(HEART_TEXTURE_NATIVE[name], `${name} resolves to a package sprite or a documented runtime texture`);
  return textureOf(name);
}

/* ------------------------------------------------------------------ *
 * 1. Runtime textures: file == manifest == the size the layout declares
 * ------------------------------------------------------------------ */
const manifest = JSON.parse(readFileSync(join(rootDir, 'src/art/assetManifest.json'), 'utf8'));
const manifestSize = new Map(manifest.map((entry) => [entry.key, { width: entry.w, height: entry.h }]));
let measured = 0;
for (const [key, declared] of Object.entries(HEART_TEXTURE_NATIVE)) {
  const file = textureOf(key);
  assert.ok(existsSync(file), `${key}: the runtime texture exists on disk`);
  const png = readPng(file);
  assert.deepEqual({ width: png.width, height: png.height }, declared, `${key}: the PNG is ${png.width}x${png.height}, the Level 10 layout declares ${declared.width}x${declared.height}`);
  if (manifestSize.has(key)) assert.deepEqual(manifestSize.get(key), declared, `${key}: the manifest agrees with the file`);
  measured += 1;
}
// every rotated mirror variant keeps one size, so swapping a state never changes the footprint or the aspect ratio
const mirrorSizes = new Set([0, 1, 2, 3].map((index) => { const png = readPng(textureOf(`mirror_${index}`)); return `${png.width}x${png.height}`; }));
assert.equal(mirrorSizes.size, 1, `all four mirror variants share one size (${[...mirrorSizes].join(', ')})`);
// the pedestal swaps between two sizes on purpose; both are anchored on their bottom edge by the level (applyNativePlacement)
assert.notDeepEqual(HEART_TEXTURE_NATIVE.pedestal_lit, HEART_TEXTURE_NATIVE.pedestal_empty, 'the pedestal states really are different sizes, so the base-line anchor matters');

/* ------------------------------------------------------------------ *
 * 2. Level 10 package art and documented reuse: file size == declared size
 * ------------------------------------------------------------------ */
for (const element of HEART_ELEMENTS) {
  if (element.artSource !== 'level10') continue;
  const reused = HEART_REUSED_ART[element.art];
  const file = heartArtFile(element.art);
  assert.ok(existsSync(file), `${element.id}: ${element.art} exists`);
  const png = readPng(file);
  const declared = reused ? reused.native : { width: element.width, height: element.height };
  assert.deepEqual({ width: png.width, height: png.height }, declared, `${element.id}: ${element.art} is ${png.width}x${png.height} on disk, declared ${declared.width}x${declared.height}`);
  measured += 1;
}
for (const element of HEART_PROPS) {
  const reused = HEART_REUSED_ART[element.art];
  if (!reused) continue;
  const png = readPng(spriteOf(reused.level, reused.file));
  assert.deepEqual({ width: png.width, height: png.height }, reused.native, `${element.id}: reused ${element.art} keeps its native size`);
}

/* ------------------------------------------------------------------ *
 * 3. Floor-cell gates cover the useful art (Rule 2), with a stated tolerance
 * ------------------------------------------------------------------ */
const GATE_TOLERANCE = 2; // px: a gate may be at most this far outside, or inside, the visible art box on each side
for (const element of HEART_CELLS) {
  const png = readPng(heartArtFile(element.art));
  assert.ok(png.bbox, `${element.id}: art has visible pixels`);
  const origin = { x: element.x - png.width / 2, y: element.y - png.height / 2 };
  const art = { x: origin.x + png.bbox.x, y: origin.y + png.bbox.y, width: png.bbox.width, height: png.bbox.height };
  const gate = element.gate;
  // the gate must not reach further than the visible art plus tolerance, or the prompt appears off the object
  assert.ok(gate.x >= art.x - GATE_TOLERANCE && gate.x + gate.width <= art.x + art.width + GATE_TOLERANCE,
    `${element.id}: gate x ${gate.x}..${gate.x + gate.width} stays inside the visible art ${art.x}..${art.x + art.width} (±${GATE_TOLERANCE})`);
  assert.ok(gate.y >= art.y - GATE_TOLERANCE && gate.y + gate.height <= art.y + art.height + GATE_TOLERANCE,
    `${element.id}: gate y ${gate.y}..${gate.y + gate.height} stays inside the visible art ${art.y}..${art.y + art.height} (±${GATE_TOLERANCE})`);
}

/* ------------------------------------------------------------------ *
 * 4. Level 09 art the observatory declares: native size on disk
 * ------------------------------------------------------------------ */
const SHARED = join(rootDir, 'assets/levels/shared');
for (const element of OBSERVATORY_ELEMENTS) {
  const art = element.art;
  if (art.kind === 'texture') {
    const file = textureOf(art.key);
    if (!existsSync(file)) continue; // procedural textures have no file; the observatory check covers the registry
    const png = readPng(file);
    assert.deepEqual({ width: png.width, height: png.height }, { width: element.nativeWidth, height: element.nativeHeight },
      `${element.id}: texture ${art.key} is ${png.width}x${png.height} but the layout scales from ${element.nativeWidth}x${element.nativeHeight}`);
    measured += 1;
    continue;
  }
  const files = art.kind === 'level' ? [art.file] : art.files;
  for (const name of files) {
    const direct = spriteOf(art.level, name);
    if (!existsSync(direct)) continue;
    const png = readPng(direct);
    assert.deepEqual({ width: png.width, height: png.height }, { width: element.nativeWidth, height: element.nativeHeight },
      `${element.id}: ${name} is ${png.width}x${png.height} on disk but the layout scales from ${element.nativeWidth}x${element.nativeHeight}`);
    measured += 1;
  }
}
// the splitter and the shared prism states keep one size each, so the light/dark swap never shifts the art
for (const group of [['fixed-three-route-splitter-off', 'fixed-three-route-splitter-on']]) {
  const sizes = new Set(group.map((name) => { const png = readPng(spriteOf(7, name)); return `${png.width}x${png.height}`; }));
  assert.equal(sizes.size, 1, `${group.join(' / ')} share one size`);
}
const prismSizes = new Set(['prism-dark', 'prism-receiving'].map((name) => { const png = readPng(join(SHARED, 'beam-splitter', `${name}.png`)); return `${png.width}x${png.height}`; }));
assert.equal(prismSizes.size, 1, 'prism-dark and prism-receiving share one size');

/* ------------------------------------------------------------------ *
 * 5. Full-canvas border/line art is not used for a localized effect
 * ------------------------------------------------------------------ */
const heartSource = readFileSync(join(rootDir, 'src/levels/HeartOfElariaLevel.ts'), 'utf8');
assert.equal(heartSource.includes('redundant-carried-lantern-line'), false, 'the fixed carried-lamp line (a straight 320,115 -> 366,272 stroke) is not used: the beam follows the live carried lamp');
assert.equal(heartSource.includes('fixed-dark-pocket-purple-border'), false, 'the full-canvas pocket border (its visible box sits right of the Moon cell) is not used: the border is drawn on the Moon cell geometry');
const pocket = readPng(spriteOf(9, 'fixed-dark-pocket-purple-border'));
const moonCell = HEART_CELLS.find((cell) => cell.id === 'heart-moon');
assert.ok(pocket.bbox && pocket.bbox.x > moonCell.x + moonCell.width / 2, `the unused pocket border art really is off-cell (visible box starts at x ${pocket.bbox?.x}, the Moon cell ends at ${moonCell.x + moonCell.width / 2})`);
assert.ok(HEART_MOON_SHADOW.x === moonCell.x, 'the Moon shadow is centred on the Moon cell');

console.log(`Campaign art checks passed (${measured} PNG files measured: sizes, alpha boxes, gates, variants)`);
