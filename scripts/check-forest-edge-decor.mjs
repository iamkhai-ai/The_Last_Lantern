import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { buildForestEdgeDecor, FOREST_EDGE_DECOR_SEED, forestEdgeDecorSite } from '../src/data/forestEdgeDecor.ts';
import { chaikinClosed, FOREST_DECOR_TEXTURES, pointInPolygon } from '../src/data/forestDecor.ts';
import { FOREST_EDGE, FOREST_EDGE_GROUND_PATH, FOREST_EDGE_SOLIDS } from '../src/data/forestEdgeLayout.ts';

const decor = buildForestEdgeDecor();
assert.deepEqual(buildForestEdgeDecor(), decor, 'Level 01 decor generator is deterministic for a fixed seed');
assert.equal(typeof FOREST_EDGE_DECOR_SEED, 'number', 'Level 01 seed is a fixed numeric constant');

// Opening path shifts west and tapers into the unchanged ring/gate approach.
const WIDER_OPENING_GROUND_PATH = [
  [176, 304], [149, 282], [123, 265], [120, 252], [126, 243], [166, 234], [208, 235], [247, 230], [287, 221],
  [329, 207], [371, 197], [405, 191], [431, 171], [468, 151], [504, 151], [511, 160], [494, 178], [454, 197],
  [420, 220], [399, 226], [361, 234], [321, 248], [279, 258], [216, 263], [183, 262], [180, 272], [210, 293],
];
assert.equal(FOREST_EDGE_GROUND_PATH.length, 27, 'ground path has 27 points');
assert.deepEqual(FOREST_EDGE_GROUND_PATH.map(({ x, y }) => [x, y]), WIDER_OPENING_GROUND_PATH,
  'ground path joins the relocated opening cluster to the fixed destination');
for (const point of FOREST_EDGE.objects.trail) {
  assert.ok(pointInPolygon(point, decor.paths[0]), `footprint ${point.x},${point.y} stays on the smoothed dirt path`);
}
assert.ok(pointInPolygon(FOREST_EDGE.objects.lantern.stand, decor.paths[0]), 'relocated lantern approach stays on the path');
assert.ok(pointInPolygon(FOREST_EDGE.checkpoints.tablet, decor.paths[0]), 'relocated tablet approach stays on the path');
assert.equal(decor.paths.length, 1, 'one smoothed ground path');
assert.equal(decor.paths[0].length, 27 * 8, 'three closed Chaikin passes on the 27-point path');
assert.deepEqual(decor.paths[0], chaikinClosed(FOREST_EDGE_GROUND_PATH, 3), 'decor path is the Chaikin-smoothed layout path');

// Counts: ancient trees lead the near row and the side bands, grass is 32 on the ground and doubled on the path edge.
const ANCIENT = new Set(FOREST_DECOR_TEXTURES.ancientTrees);
const GRASS = new Set(FOREST_DECOR_TEXTURES.roadsideGrass);
const { gateSpan } = forestEdgeDecorSite();
const farTrees = decor.backTrees.filter((t) => t.baseY < 70);
const nearTrees = decor.backTrees.filter((t) => t.baseY >= 70);
const nearAncient = nearTrees.filter((t) => ANCIENT.has(t.texture));
const nearSmall = nearTrees.filter((t) => !ANCIENT.has(t.texture));
assert.ok(decor.backTrees.length >= 30 && decor.backTrees.length <= 50, `back canopy count ${decor.backTrees.length}`);
assert.ok(nearAncient.length >= 3 && nearAncient.length <= 6, `near-row ancient tree count ${nearAncient.length}`);
assert.equal(decor.sideTrees.length, 6, 'side bands hold 3 ancient trees per edge');
assert.equal(decor.sideTrees.filter((t) => t.x < 0).length, 3, 'left band ancient tree count');
assert.equal(decor.sideTrees.filter((t) => t.x > 640).length, 3, 'right band ancient tree count');
assert.ok(decor.frontBushes.length >= 24 && decor.frontBushes.length <= 34, `front bush count ${decor.frontBushes.length}`);
assert.equal(decor.groundCover.tufts.length, 32, 'ground grass count is exactly 32');
assert.ok(decor.groundCover.mushrooms.length >= 8 && decor.groundCover.mushrooms.length <= 12, `mushroom count ${decor.groundCover.mushrooms.length}`);
assert.equal(decor.mottling.shadows.length, 28, 'soft dark mottling count');
assert.equal(decor.mottling.moss.length, 10, 'moss patch count');
assert.equal(decor.pathEdge.tufts.length, 19, 'longer western path keeps the same grass spacing (19 clear edge slots)');
assert.ok(decor.pathEdge.shadows.length > 0, 'path edge has shadow blobs');
assert.ok(Math.abs(decor.pathEdge.tufts.length - decor.pathEdge.shadows.length) <= 5, 'every second edge slot is grass, so grass and shadows stay in step');

// Textures come only from the shared table (the art keys are arrays, so flatten the table).
const allowedTextures = new Set(Object.values(FOREST_DECOR_TEXTURES).flat());
assert.ok(!allowedTextures.has('tuft_grass'), 'the decor table no longer names tuft_grass');
for (const item of [...decor.backTrees, ...decor.sideTrees, ...decor.frontBushes, ...decor.groundCover.tufts, ...decor.groundCover.mushrooms, ...decor.pathEdge.tufts, ...decor.pathEdge.shadows]) {
  assert.ok(allowedTextures.has(item.texture ?? FOREST_DECOR_TEXTURES.bush), `texture ${item.texture} comes from FOREST_DECOR_TEXTURES`);
  assert.notEqual(item.texture, 'tuft_grass', 'no decor item uses tuft_grass');
}
for (const item of [...decor.groundCover.tufts, ...decor.pathEdge.tufts]) assert.ok(GRASS.has(item.texture), `grass texture ${item.texture} is a roadside-grass variant`);

// Back canopy: far row of small trees (y 40-56), near row led by ancient trees (y 70-92), never below y 92.
for (const tree of decor.backTrees) {
  assert.ok(tree.baseY <= 92, `back tree base ${tree.baseY} stays in the top band`);
  assert.ok(tree.x >= -16 - 6 && tree.x <= 656 + 6, `back tree x ${tree.x} spans the screen width`);
  assert.ok([...FOREST_DECOR_TEXTURES.ancientTrees, FOREST_DECOR_TEXTURES.treeA, FOREST_DECOR_TEXTURES.treeB].includes(tree.texture), `back tree texture ${tree.texture}`);
}
for (const tree of farTrees) {
  assert.ok([FOREST_DECOR_TEXTURES.treeA, FOREST_DECOR_TEXTURES.treeB].includes(tree.texture), 'far canopy stays small trees');
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
  assert.ok(tree.x < gateSpan.min || tree.x > gateSpan.max, `near canopy small tree leaves the gate span clear (x ${tree.x})`);
  assert.equal(tree.tint, 0xa9b8ad, 'near small tree tint');
  for (const ancient of nearAncient) assert.ok(Math.abs(tree.x - ancient.x) >= 40, `near small tree ${tree.x} is not within 40 px of ancient ${ancient.x}`);
}

// Side bands: ancient trees just off the edges, stacked from y 150 down to 292.
for (const tree of decor.sideTrees) {
  assert.ok(ANCIENT.has(tree.texture), `side tree ${tree.texture} is an ancient tree`);
  assert.ok(tree.x <= -28 || tree.x >= 668, `side ancient x ${tree.x} is outside the play field`);
  assert.ok(tree.baseY >= 140 && tree.baseY <= 292, `side ancient base ${tree.baseY} stays above y 292`);
  assert.ok(tree.scale >= 0.78 && tree.scale <= 0.9, `side ancient scale ${tree.scale}`);
  assert.equal(tree.tint, 0x9faea2, 'side ancient tint');
}

// Art: ground and path-edge grass use the roadside-grass tints; every ancient and grass key maps to a sprites-v2 file
// of the README canvas size (ancient 160x192, roadside grass 48x32).
for (const tuft of decor.groundCover.tufts) {
  assert.equal(tuft.tint, 0xaab6a4, 'ground grass tint');
  assert.equal(tuft.alpha, 1, 'ground grass alpha');
  assert.equal(tuft.scale, 1, 'ground grass scale');
}
for (const stamp of decor.pathEdge.tufts) {
  assert.equal(stamp.tint, 0xc9d3c1, 'path edge grass tint');
  assert.equal(stamp.alpha, 1, 'path edge grass alpha');
  assert.equal(stamp.scale, 1, 'path edge grass scale');
}
const artDir = new URL('../assets/environment/forest-expansion/sprites-v2/', import.meta.url);
const campaignArt = readFileSync(new URL('../src/art/CampaignArt.ts', import.meta.url), 'utf8');
assert.ok(campaignArt.includes("'../../assets/environment/forest-expansion/sprites-v2/*.png'"), 'CampaignArt globs the sprites-v2 folder');
const pngSize = (file) => {
  const bytes = readFileSync(file);
  assert.equal(bytes.toString('ascii', 1, 4), 'PNG', `${file} is a PNG`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
};
for (const [keys, size] of [[FOREST_DECOR_TEXTURES.ancientTrees, { width: 160, height: 192 }], [FOREST_DECOR_TEXTURES.roadsideGrass, { width: 48, height: 32 }]]) {
  for (const key of keys) {
    const file = new URL(`${key.replace(/^forest_/, '').replace(/_/g, '-')}.png`, artDir);
    assert.ok(existsSync(file), `${key} has a sprites-v2 file`);
    assert.deepEqual(pngSize(file), size, `${key} canvas size`);
  }
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
