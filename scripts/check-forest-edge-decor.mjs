import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildForestEdgeDecor, FOREST_EDGE_DECOR_SEED } from '../src/data/forestEdgeDecor.ts';
import { chaikinClosed, FOREST_DECOR_TEXTURES, pointInPolygon } from '../src/data/forestDecor.ts';
import { FOREST_EDGE, FOREST_EDGE_GROUND_PATH, FOREST_EDGE_SOLIDS } from '../src/data/forestEdgeLayout.ts';

const decor = buildForestEdgeDecor();
assert.deepEqual(buildForestEdgeDecor(), decor, 'Level 01 decor generator is deterministic for a fixed seed');
assert.equal(typeof FOREST_EDGE_DECOR_SEED, 'number', 'Level 01 seed is a fixed numeric constant');

// The ground path moved out of CampaignScene unchanged: 27 points, same order, same values as the old inline polygon.
const OLD_INLINE_GROUND_PATH = [
  [248, 304], [221, 282], [195, 265], [192, 252], [198, 243], [238, 234], [280, 235], [319, 230], [341, 221],
  [365, 207], [389, 197], [405, 191], [431, 171], [468, 151], [504, 151], [511, 160], [494, 178], [454, 197],
  [420, 220], [399, 226], [379, 234], [357, 248], [333, 258], [288, 263], [255, 262], [252, 272], [282, 293],
];
assert.equal(FOREST_EDGE_GROUND_PATH.length, 27, 'ground path has 27 points');
assert.deepEqual(FOREST_EDGE_GROUND_PATH.map(({ x, y }) => [x, y]), OLD_INLINE_GROUND_PATH, 'ground path equals the old inline polygon');
assert.equal(decor.paths.length, 1, 'one smoothed ground path');
assert.equal(decor.paths[0].length, 27 * 8, 'three closed Chaikin passes on the 27-point path');
assert.deepEqual(decor.paths[0], chaikinClosed(FOREST_EDGE_GROUND_PATH, 3), 'decor path is the Chaikin-smoothed layout path');

// Counts match the Level 02 density.
assert.ok(decor.backTrees.length >= 30 && decor.backTrees.length <= 50, `back canopy count ${decor.backTrees.length}`);
assert.ok(decor.sideTrees.length >= 8 && decor.sideTrees.length <= 14, `side tree count ${decor.sideTrees.length}`);
assert.ok(decor.frontBushes.length >= 24 && decor.frontBushes.length <= 34, `front bush count ${decor.frontBushes.length}`);
assert.equal(decor.groundCover.tufts.length, 24, 'ground tuft count is exactly 24');
assert.ok(decor.groundCover.mushrooms.length >= 8 && decor.groundCover.mushrooms.length <= 12, `mushroom count ${decor.groundCover.mushrooms.length}`);
assert.equal(decor.mottling.shadows.length, 28, 'soft dark mottling count');
assert.equal(decor.mottling.moss.length, 10, 'moss patch count');
assert.ok(decor.pathEdge.tufts.length > 0 && decor.pathEdge.shadows.length > 0, 'path edge has both tufts and shadow blobs');
assert.ok(decor.pathEdge.shadows.length > decor.pathEdge.tufts.length, 'path edge shadows outnumber halved tufts');

// Textures come only from the shared table.
const allowedTextures = new Set(Object.values(FOREST_DECOR_TEXTURES));
for (const item of [...decor.backTrees, ...decor.sideTrees, ...decor.frontBushes, ...decor.groundCover.tufts, ...decor.groundCover.mushrooms, ...decor.pathEdge.tufts, ...decor.pathEdge.shadows]) {
  assert.ok(allowedTextures.has(item.texture ?? FOREST_DECOR_TEXTURES.bush), `texture ${item.texture} comes from FOREST_DECOR_TEXTURES`);
}

// Back canopy: two rows in the top band, never below y 92, and the near row leaves the gate span open.
for (const tree of decor.backTrees) {
  assert.ok(tree.baseY <= 92, `back tree base ${tree.baseY} stays in the top band`);
  assert.ok(tree.x >= -16 - 3 && tree.x <= 656 + 3, `back tree x ${tree.x} spans the screen width`);
  assert.ok([FOREST_DECOR_TEXTURES.treeA, FOREST_DECOR_TEXTURES.treeB].includes(tree.texture), 'back tree texture');
}
for (const tree of decor.backTrees.filter((t) => t.tint === 0xa9b8ad)) {
  assert.ok(tree.x < 400 || tree.x > 572, `near canopy row leaves the gate span clear (x ${tree.x})`);
}

// Side trees sit off-screen; the bottom band (y >= 330) stays bush-only.
for (const tree of decor.sideTrees) {
  assert.ok(tree.x <= -8 || tree.x >= 648, `side tree x ${tree.x} is horizontally off-screen`);
  assert.ok(tree.baseY <= 292, `side tree base ${tree.baseY} stays above y 292`);
}

// Front bushes: low, in the bottom band, with a rendered top clear of the walkable band.
const BUSH_TEXTURE_HEIGHT = 77;
for (const bush of decor.frontBushes) {
  assert.ok(bush.baseY >= 330, `front bush base ${bush.baseY} is in the bottom band`);
  assert.equal(bush.scale, 0.45, 'front bush scale');
  assert.equal(bush.tint, 0x8fa79a, 'front bush tint');
  assert.ok(bush.baseY - BUSH_TEXTURE_HEIGHT * bush.scale >= 310, `front bush ${bush.x},${bush.baseY} top clears the walkable band`);
}

// Ground cover and path-edge stamps: on open grass, clear of the interaction marks and of solids.
const marks = [
  FOREST_EDGE.objects.lantern.anchor, FOREST_EDGE.objects.lantern.stand,
  FOREST_EDGE.objects.tablet.anchor, FOREST_EDGE.objects.tablet.stand,
  FOREST_EDGE.objects.ring.anchor, FOREST_EDGE.objects.ring.ground, FOREST_EDGE.objects.ring.stand,
  FOREST_EDGE.objects.gate.anchor, FOREST_EDGE.objects.gate.stand, FOREST_EDGE.objects.eye.anchor,
  ...Object.values(FOREST_EDGE.checkpoints), ...FOREST_EDGE.objects.trail,
];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const distToRect = (p, r) => Math.hypot(Math.max(r.x - p.x, 0, p.x - (r.x + r.width)), Math.max(r.y - p.y, 0, p.y - (r.y + r.height)));
const gate = FOREST_EDGE.objects.gate.backing;
for (const item of [...decor.groundCover.tufts, ...decor.groundCover.mushrooms]) {
  const p = { x: item.x, y: item.y };
  assert.ok(item.depth >= 1.2 && item.depth <= 1.6, `ground cover depth ${item.depth} stays below actors`);
  assert.ok(p.x >= 8 && p.x <= 632 && p.y >= 100 && p.y <= 336, `ground cover ${p.x},${p.y} inside the play area`);
  assert.equal(pointInPolygon(p, FOREST_EDGE_GROUND_PATH), false, `ground cover ${p.x},${p.y} is not on the ground path`);
  for (const mark of marks) assert.ok(dist(p, mark) > 26, `ground cover ${p.x},${p.y} is clear of mark ${mark.x},${mark.y}`);
  for (const solid of FOREST_EDGE_SOLIDS) assert.ok(distToRect(p, solid) >= 20, `ground cover ${p.x},${p.y} is clear of solid footprint`);
  const inGateZone = p.x >= gate.x - 12 && p.x <= gate.x + gate.width + 12 && p.y >= gate.y - 12 && p.y <= gate.y + gate.height + 12;
  assert.equal(inGateZone, false, `ground cover ${p.x},${p.y} stays out of the gate backing`);
}
for (const stamp of [...decor.pathEdge.tufts, ...decor.pathEdge.shadows]) {
  for (const mark of marks) assert.ok(dist(stamp, mark) >= 22, `path edge stamp ${stamp.x},${stamp.y} clears mark ${mark.x},${mark.y}`);
}
for (const stamp of decor.pathEdge.tufts) assert.equal(stamp.depth, 0.62, 'path edge tuft depth');
for (const stamp of decor.pathEdge.shadows) assert.equal(stamp.depth, 0.58, 'path edge shadow depth');

// Decor is drawn by CampaignScene with no interaction or walkable meaning: no forestEdgeId / woodsId on decor,
// the legacy 12-tuft scatter is gone, and the path polygon is no longer inline in drawRoom.
const scene = readFileSync(new URL('../src/scenes/CampaignScene.ts', import.meta.url), 'utf8');
const drawRoomStart = scene.indexOf('private drawRoom(');
const drawRoomEnd = scene.indexOf('\n  private addNarrativeProps(', drawRoomStart);
const drawRoomBody = scene.slice(drawRoomStart, drawRoomEnd);
assert.ok(drawRoomStart >= 0 && drawRoomEnd > drawRoomStart, 'drawRoom is present in CampaignScene.ts');
assert.doesNotMatch(drawRoomBody, /\[\[90, 180\], \[160, 260\]/, 'the legacy level-0 tuft scatter is removed');
assert.doesNotMatch(drawRoomBody, /new Phaser\.Geom\.Point\(248, 304\)/, 'the ground path is no longer an inline polygon');
assert.match(drawRoomBody, /drawForestFloor\(/, 'drawRoom draws the forest floor through the shared method');
const forestDecorStart = scene.indexOf('private drawForestDecor(');
const forestDecorEnd = scene.indexOf('\n  private normalizedWoodsRuneTexture(', forestDecorStart);
const forestDecorBody = scene.slice(forestDecorStart, forestDecorEnd);
assert.ok(forestDecorStart >= 0 && forestDecorEnd > forestDecorStart, 'drawForestDecor is present in CampaignScene.ts');
assert.doesNotMatch(forestDecorBody, /setData\(/, 'shared decor sets no forestEdgeId or woodsId');

console.log('Level 01 forest decor checks PASS');
