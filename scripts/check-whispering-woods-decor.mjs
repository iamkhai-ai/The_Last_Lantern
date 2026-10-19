import assert from 'node:assert/strict';
import {
  buildWoodsDecor, chaikinClosed, pointInPolygon, WOODS_BUSH_TEXTURE_HEIGHT, WOODS_DECOR_SEED,
} from '../src/data/whisperingWoodsDecor.ts';
import { WHISPERING_WOODS } from '../src/data/whisperingWoodsLayout.ts';

const decor = buildWoodsDecor();
assert.deepEqual(buildWoodsDecor(), decor, 'decor generator is deterministic for a fixed seed');
assert.equal(typeof WOODS_DECOR_SEED, 'number', 'seed is a fixed numeric constant');

const anchorsAndStands = [...Object.values(WHISPERING_WOODS.stands), ...Object.values(WHISPERING_WOODS.anchors)];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Counts
assert.ok(decor.backTrees.length >= 30 && decor.backTrees.length <= 50, `back canopy count ${decor.backTrees.length}`);
assert.ok(decor.sideTrees.length >= 8 && decor.sideTrees.length <= 14, `side tree count ${decor.sideTrees.length}`);
assert.ok(decor.frontBushes.length >= 24 && decor.frontBushes.length <= 34, `front bush count ${decor.frontBushes.length}`);
assert.equal(decor.groundCover.tufts.length, 24, 'ground tuft count is exactly 24');
assert.ok(decor.groundCover.mushrooms.length >= 8 && decor.groundCover.mushrooms.length <= 12, `mushroom count ${decor.groundCover.mushrooms.length}`);
const cyan = decor.groundCover.mushrooms.filter((m) => m.texture === 'mushroom_cyan').length;
assert.ok(cyan >= 2 && cyan <= 6, `about 40% of mushrooms are cyan (${cyan})`);
assert.equal(decor.mottling.shadows.length, 28, 'soft dark mottling count');
assert.equal(decor.mottling.moss.length, 10, 'moss patch count');
assert.ok(decor.pathEdge.tufts.length > 0 && decor.pathEdge.shadows.length > 0, 'path edge has both tufts and shadow blobs');

// Back canopy: two rows in the top band, never below y 92.
for (const tree of decor.backTrees) {
  assert.ok(tree.baseY <= 92, `back tree base ${tree.baseY} stays in the top band`);
  assert.ok(tree.x >= -16 - 3 && tree.x <= 656 + 3, `back tree x ${tree.x} spans the screen width`);
  assert.ok(['tree_woods', 'tree_alt'].includes(tree.texture), 'back tree texture');
}
for (const tree of decor.backTrees.filter((t) => t.tint === 0xa9b8ad)) {
  assert.ok(tree.x < 448 || tree.x > 572, `second canopy row leaves the gate span clear (x ${tree.x})`);
}

// Side trees sit off-screen; the bottom band (y >= 330) stays bush-only.
for (const tree of decor.sideTrees) {
  assert.ok(tree.x <= -8 || tree.x >= 648, `side tree x ${tree.x} is horizontally off-screen`);
  assert.ok(tree.baseY < 330, `side tree base ${tree.baseY} stays out of the bottom band`);
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
// Path-edge tufts are halved (every second tuft slot), so shadow blobs outnumber them.
assert.ok(decor.pathEdge.shadows.length > decor.pathEdge.tufts.length, 'path edge shadows outnumber halved tufts');
for (const stamp of decor.pathEdge.tufts) {
  assert.equal(stamp.tint, 0x56724f, 'path edge tuft tint');
  assert.equal(stamp.alpha, 0.6, 'path edge tuft alpha');
}

// Ground cover tufts: darker tint and softer alpha; props without a tint default to white.
for (const tuft of decor.groundCover.tufts) {
  assert.equal(tuft.tint, 0x5f7d58, 'ground tuft tint');
  assert.equal(tuft.alpha, 0.55, 'ground tuft alpha');
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
