import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import {
  buildWoodsDecor, chaikinClosed, FOREST_DECOR_TEXTURES, pointInPolygon, WOODS_BUSH_TEXTURE_HEIGHT, WOODS_DECOR_SEED, woodsDecorSite,
} from '../src/data/whisperingWoodsDecor.ts';
import { FOREST_ART_ORIGIN } from '../src/data/forestDecor.ts';
import { WHISPERING_WOODS } from '../src/data/whisperingWoodsLayout.ts';

const decor = buildWoodsDecor();
assert.deepEqual(buildWoodsDecor(), decor, 'decor generator is deterministic for a fixed seed');
assert.equal(typeof WOODS_DECOR_SEED, 'number', 'seed is a fixed numeric constant');

// Hard guard: the approved Level 02 output is pinned byte-for-byte. A changed seed, draw order, constant or
// texture choice in forestDecor.ts changes this hash, so the shared generator cannot silently restyle Level 02.
// repinned for forest-expansion art integration (mushrooms at half scale)
const APPROVED_WOODS_DECOR_SHA256 = 'e9185b9816c4c85148d2015483812a8aa138c2df03beea9a16f1382e13b0061b';
assert.equal(
  createHash('sha256').update(JSON.stringify(buildWoodsDecor())).digest('hex'),
  APPROVED_WOODS_DECOR_SHA256,
  'Level 02 decor output matches the approved pass (sha256 guard)',
);

const anchorsAndStands = [...Object.values(WHISPERING_WOODS.stands), ...Object.values(WHISPERING_WOODS.anchors)];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Counts
const ANCIENT = new Set(FOREST_DECOR_TEXTURES.ancientTrees);
const GRASS = new Set(FOREST_DECOR_TEXTURES.roadsideGrass);
const { gateSpan } = woodsDecorSite();
const farTrees = decor.backTrees.filter((t) => t.baseY < 70);
const nearTrees = decor.backTrees.filter((t) => t.baseY >= 70);
const nearAncient = nearTrees.filter((t) => ANCIENT.has(t.texture));
const nearSmall = nearTrees.filter((t) => !ANCIENT.has(t.texture));
assert.ok(decor.backTrees.length >= 30 && decor.backTrees.length <= 50, `back canopy count ${decor.backTrees.length}`);
assert.ok(nearAncient.length >= 4 && nearAncient.length <= 7, `near-row ancient tree count ${nearAncient.length}`);
assert.equal(decor.sideTrees.length, 6, 'side bands hold 3 ancient trees per edge');
assert.equal(decor.sideTrees.filter((t) => t.x < 0).length, 3, 'left band ancient tree count');
assert.equal(decor.sideTrees.filter((t) => t.x > 640).length, 3, 'right band ancient tree count');
assert.ok(decor.frontBushes.length >= 24 && decor.frontBushes.length <= 34, `front bush count ${decor.frontBushes.length}`);
assert.equal(decor.groundCover.tufts.length, 32, 'ground grass count is exactly 32');
assert.ok(decor.groundCover.mushrooms.length >= 8 && decor.groundCover.mushrooms.length <= 12, `mushroom count ${decor.groundCover.mushrooms.length}`);
const cyan = decor.groundCover.mushrooms.filter((m) => m.texture === 'mushroom_cyan').length;
assert.ok(cyan >= 2 && cyan <= 6, `about 40% of mushrooms are cyan (${cyan})`);
assert.equal(decor.mottling.shadows.length, 28, 'soft dark mottling count');
assert.equal(decor.mottling.moss.length, 10, 'moss patch count');
assert.ok(decor.pathEdge.tufts.length >= 75 && decor.pathEdge.tufts.length <= 90, `path edge grass count ${decor.pathEdge.tufts.length} (about double the old 42)`);
assert.ok(decor.pathEdge.shadows.length > 0, 'path edge has shadow blobs');
assert.ok(Math.abs(decor.pathEdge.tufts.length - decor.pathEdge.shadows.length) <= 5, 'every second edge slot is grass, so grass and shadows stay in step');

// Back canopy: far row of small trees (y 40-56), near row led by ancient trees (y 70-92), never below y 92.
for (const tree of decor.backTrees) {
  assert.ok(tree.baseY <= 92, `back tree base ${tree.baseY} stays in the top band`);
  assert.ok(tree.x >= -16 - 6 && tree.x <= 656 + 6, `back tree x ${tree.x} spans the screen width`);
  assert.ok(['tree_woods', 'tree_alt', ...FOREST_DECOR_TEXTURES.ancientTrees].includes(tree.texture), `back tree texture ${tree.texture}`);
}
for (const tree of farTrees) {
  assert.ok(['tree_woods', 'tree_alt'].includes(tree.texture), 'far canopy stays small trees');
  assert.equal(tree.tint, 0x7f948a, 'far canopy tint');
}
for (const tree of nearAncient) {
  assert.ok(tree.baseY >= 70 && tree.baseY <= 92, `near ancient base ${tree.baseY} stays in the near row`);
  assert.ok(tree.x <= gateSpan.min - 40 || tree.x >= gateSpan.max + 40, `near ancient trunk x ${tree.x} keeps 40 px clear of the gate span`);
  assert.ok(tree.scale >= 0.72 && tree.scale <= 0.86, `near ancient scale ${tree.scale}`);
  assert.equal(tree.tint, 0xb3c0b5, 'near ancient tint');
}
const nearXs = nearAncient.map((t) => t.x).sort((a, b) => a - b);
for (let i = 1; i < nearXs.length; i += 1) {
  const gap = nearXs[i] - nearXs[i - 1];
  const crossesGate = nearXs[i - 1] <= gateSpan.min - 40 && nearXs[i] >= gateSpan.max + 40;
  assert.ok(crossesGate || (gap >= 85 && gap <= 135), `near ancient spacing ${gap} at x ${nearXs[i - 1]}..${nearXs[i]} is about 100-120 px`);
}
for (const tree of nearSmall) {
  assert.ok(tree.x < gateSpan.min || tree.x > gateSpan.max, `near small tree leaves the gate span clear (x ${tree.x})`);
  assert.equal(tree.tint, 0xa9b8ad, 'near small tree tint');
  for (const ancient of nearAncient) assert.ok(Math.abs(tree.x - ancient.x) >= 40, `near small tree ${tree.x} is not within 40 px of ancient ${ancient.x}`);
}

// Side bands: ancient trees just off the edges, stacked from y 150 down to 292, never inside the bottom band.
for (const tree of decor.sideTrees) {
  assert.ok(ANCIENT.has(tree.texture), `side tree ${tree.texture} is an ancient tree`);
  assert.ok(tree.x <= -28 || tree.x >= 668, `side ancient x ${tree.x} is outside the play field`);
  assert.ok(tree.baseY >= 140 && tree.baseY <= 292, `side ancient base ${tree.baseY} stays above y 292`);
  assert.ok(tree.scale >= 0.78 && tree.scale <= 0.9, `side ancient scale ${tree.scale}`);
  assert.equal(tree.tint, 0x9faea2, 'side ancient tint');
}

// Bottom bushes: low, in the bottom band, clear of the southern entry path.
for (const bush of decor.frontBushes) {
  assert.ok(bush.baseY >= 330, `front bush base ${bush.baseY} is in the bottom band`);
  assert.ok(!(bush.x >= 92 && bush.x <= 180), `no bush over the southern entry path (x ${bush.x})`);
  assert.equal(bush.scale, 0.45, 'front bush scale');
  assert.equal(bush.tint, 0x8fa79a, 'front bush tint');
  // The rendered top of the bush must stay above the walkable band (player feet reach y 310).
  assert.ok(bush.baseY - WOODS_BUSH_TEXTURE_HEIGHT * bush.scale >= 310, `front bush ${bush.x},${bush.baseY} top clears the walkable band`);
}
// Bushes stay evenly spaced so the bottom band reads as continuous (no gap wider than 2 steps).
const bushXs = decor.frontBushes.map((b) => b.x).sort((a, b) => a - b);
for (let i = 1; i < bushXs.length; i += 1) {
  const gap = bushXs[i] - bushXs[i - 1];
  if (bushXs[i - 1] < 92 && bushXs[i] > 180) continue; // the skipped entry path
  assert.ok(gap <= 28, `bottom bush gap ${gap} at x ${bushXs[i - 1]}..${bushXs[i]} reads continuous`);
}

// Ground cover: on open grass, below actors, clear of stands and anchors.
const footprints = [...WHISPERING_WOODS.trees.map((t) => t.footprint), ...WHISPERING_WOODS.rocks.map((r) => r.footprint)];
const distToRect = (p, r) => Math.hypot(Math.max(r.x - p.x, 0, p.x - (r.x + r.width)), Math.max(r.y - p.y, 0, p.y - (r.y + r.height)));
for (const item of [...decor.groundCover.tufts, ...decor.groundCover.mushrooms]) {
  const p = { x: item.x, y: item.y };
  assert.ok(item.depth >= 1.2 && item.depth <= 1.6, `ground cover depth ${item.depth} stays below actors`);
  assert.ok(p.x >= 8 && p.x <= 632 && p.y >= 100 && p.y <= 336, `ground cover ${p.x},${p.y} inside the play area`);
  for (const polygon of WHISPERING_WOODS.groundPaths) {
    assert.equal(pointInPolygon(p, polygon), false, `ground cover ${p.x},${p.y} is not on a groundPaths polygon`);
  }
  for (const spot of anchorsAndStands) assert.ok(dist(p, spot) > 26, `ground cover ${p.x},${p.y} is clear of stand/anchor ${spot.x},${spot.y}`);
  for (const r of footprints) assert.ok(distToRect(p, r) >= 20, `ground cover ${p.x},${p.y} is clear of a tree/rock footprint`);
  const g = WHISPERING_WOODS.gate.backing;
  const inGateZone = p.x >= g.x - 12 && p.x <= g.x + g.width + 12 && p.y >= g.y - 12 && p.y <= g.y + g.height + 12;
  assert.equal(inGateZone, false, `ground cover ${p.x},${p.y} stays out of the gate backing`);
}

// Path edge stamps keep the interaction spots clean and sit at the intended depths.
for (const stamp of [...decor.pathEdge.tufts, ...decor.pathEdge.shadows]) {
  for (const spot of anchorsAndStands) assert.ok(dist(stamp, spot) >= 22, `path edge stamp ${stamp.x},${stamp.y} clears interaction spot`);
}
for (const stamp of decor.pathEdge.tufts) assert.equal(stamp.depth, 0.62, 'path edge tuft depth');
for (const stamp of decor.pathEdge.shadows) assert.equal(stamp.depth, 0.58, 'path edge shadow depth');
for (const stamp of decor.pathEdge.tufts) {
  assert.equal(stamp.tint, 0xc9d3c1, 'path edge grass tint');
  assert.equal(stamp.alpha, 1, 'path edge grass alpha');
  assert.equal(stamp.scale, 1, 'path edge grass scale');
}

// Ground cover grass: roadside-grass art at full alpha; props without a tint default to white.
for (const tuft of decor.groundCover.tufts) {
  assert.equal(tuft.tint, 0xaab6a4, 'ground grass tint');
  assert.equal(tuft.alpha, 1, 'ground grass alpha');
  assert.equal(tuft.scale, 1, 'ground grass scale');
}

// Art: every decor texture comes from the shared table, no decor item uses the old tuft_grass, and every grass and
// ancient-tree key has a matching sprites-v2 file of the expected canvas size (the README sizes).
const allTextures = new Set(Object.values(FOREST_DECOR_TEXTURES).flat());
assert.ok(!allTextures.has('tuft_grass'), 'the decor table no longer names tuft_grass');
for (const item of [...decor.backTrees, ...decor.sideTrees, ...decor.groundCover.tufts, ...decor.groundCover.mushrooms, ...decor.pathEdge.tufts, ...decor.pathEdge.shadows]) {
  assert.notEqual(item.texture, 'tuft_grass', 'no decor item uses tuft_grass');
  assert.ok(allTextures.has(item.texture), `decor texture ${item.texture} comes from FOREST_DECOR_TEXTURES`);
}
for (const item of [...decor.groundCover.tufts, ...decor.pathEdge.tufts]) assert.ok(GRASS.has(item.texture), `grass texture ${item.texture} is a roadside-grass variant`);
assert.equal(FOREST_ART_ORIGIN.ancientTreeY, 188 / 192, 'ancient tree origin sits on the root line (content bottom y 187 of 192)');
assert.equal(FOREST_ART_ORIGIN.roadsideGrassY, 28 / 32, 'roadside grass origin sits on the blade base (content bottom y 27 of 32)');

const artDir = new URL('../assets/environment/forest-expansion/sprites-v2/', import.meta.url);
const campaignArt = readFileSync(new URL('../src/art/CampaignArt.ts', import.meta.url), 'utf8');
assert.ok(campaignArt.includes("'../../assets/environment/forest-expansion/sprites-v2/*.png'"), 'CampaignArt globs the sprites-v2 folder');
const pngSize = (file) => {
  const bytes = readFileSync(file);
  assert.equal(bytes.toString('ascii', 1, 4), 'PNG', `${file} is a PNG`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
};
for (const key of FOREST_DECOR_TEXTURES.ancientTrees) {
  const file = new URL(`${key.replace(/^forest_/, '').replace(/_/g, '-')}.png`, artDir);
  assert.ok(existsSync(file), `${key} has a sprites-v2 file`);
  assert.deepEqual(pngSize(file), { width: 160, height: 192 }, `${key} is a 160x192 canvas`);
}
for (const key of FOREST_DECOR_TEXTURES.roadsideGrass) {
  const file = new URL(`${key.replace(/^forest_/, '').replace(/_/g, '-')}.png`, artDir);
  assert.ok(existsSync(file), `${key} has a sprites-v2 file`);
  assert.deepEqual(pngSize(file), { width: 48, height: 32 }, `${key} is a 48x32 canvas`);
}
for (const mushroom of decor.groundCover.mushrooms) {
  assert.equal(mushroom.tint, 0xffffff, 'mushroom default tint is white');
  assert.ok(mushroom.depth < 2, `mushroom depth ${mushroom.depth} stays below actors`);
}

// Smoothing: Chaikin doubles the vertex count per pass, and the data stays unchanged.
const sample = WHISPERING_WOODS.groundPaths[0];
assert.equal(chaikinClosed(sample, 3).length, sample.length * 8, 'three closed Chaikin passes');
assert.equal(decor.paths.length, WHISPERING_WOODS.groundPaths.length, 'every path polygon is smoothed');
assert.equal(WHISPERING_WOODS.groundPaths[0][0].x, 100, 'source path data is not mutated by smoothing');

console.log('Whispering Woods decor checks PASS');
